const { pool } = require('../../../../backend/config/database');
const { logDataChange } = require('../services/loggingService');

// Get all products with optional filtering
exports.getAllProducts = async (req, res) => {
    try {
        const { status, category, searchTerm, limit = 20, offset = 0 } = req.query;

        let query = `
            SELECT 
                p.product_id,
                p.name,
                p.description,
                p.created_at,
                p.updated_at,
                c.company_id,
                c.name as company_name,
                sc.subcategory_id,
                sc.name as subcategory_name,
                COALESCE(
                    json_agg(
                        json_build_object(
                            'attribute_id', pa.attribute_id,
                            'attribute_name', pa.attribute_name,
                            'attribute_value', pa.attribute_value,
                            'attribute_type', pa.attribute_type
                        )
                    ) FILTER (WHERE pa.attribute_id IS NOT NULL), 
                    '[]'::json
                ) as attributes,
                CASE WHEN pd.draft_id IS NOT NULL THEN 'draft' ELSE 'published' END as status
            FROM products p
            LEFT JOIN companies c ON p.company_id = c.company_id
            LEFT JOIN product_subcategories sc ON p.subcategory_id = sc.subcategory_id
            LEFT JOIN product_attributes pa ON p.product_id = pa.product_id
            LEFT JOIN product_drafts pd ON p.product_id = pd.product_id AND pd.is_active = true
            WHERE 1=1
        `;

        const params = [];

        if (status) {
            if (status === 'draft') {
                query += ` AND pd.draft_id IS NOT NULL`;
            } else if (status === 'published') {
                query += ` AND pd.draft_id IS NULL`;
            }
        }

        if (category) {
            params.push(parseInt(category));
            query += ` AND sc.subcategory_id = $${params.length}`;
        }

        if (searchTerm) {
            params.push(`%${searchTerm}%`);
            query += ` AND (p.name ILIKE $${params.length} OR c.name ILIKE $${params.length})`;
        }

        query += ` GROUP BY p.product_id, c.company_id, c.name, sc.subcategory_id, sc.name, pd.draft_id`;
        query += ` ORDER BY p.updated_at DESC`;
        
        params.push(parseInt(limit));
        query += ` LIMIT $${params.length}`;
        
        params.push(parseInt(offset));
        query += ` OFFSET $${params.length}`;

        const result = await pool.query(query, params);
        res.json({
            success: true,
            data: result.rows,
            total: result.rowCount
        });
    } catch (error) {
        console.error('Error fetching products:', error);
        res.status(500).json({ error: 'Failed to fetch products' });
    }
};

// Get single product
exports.getProduct = async (req, res) => {
    try {
        const { productId } = req.params;

        const query = `
            SELECT 
                p.product_id,
                p.name,
                p.description,
                p.created_at,
                p.updated_at,
                c.company_id,
                c.name as company_name,
                sc.subcategory_id,
                sc.name as subcategory_name,
                json_agg(
                    json_build_object(
                        'attribute_id', pa.attribute_id,
                        'attribute_name', pa.attribute_name,
                        'attribute_value', pa.attribute_value,
                        'attribute_type', pa.attribute_type
                    )
                ) FILTER (WHERE pa.attribute_id IS NOT NULL) as attributes,
                CASE WHEN pd.draft_id IS NOT NULL THEN 'draft' ELSE 'published' END as status
            FROM products p
            LEFT JOIN companies c ON p.company_id = c.company_id
            LEFT JOIN product_subcategories sc ON p.subcategory_id = sc.subcategory_id
            LEFT JOIN product_attributes pa ON p.product_id = pa.product_id
            LEFT JOIN product_drafts pd ON p.product_id = pd.product_id AND pd.is_active = true
            WHERE p.product_id = $1
            GROUP BY p.product_id, c.company_id, c.name, sc.subcategory_id, sc.name, pd.draft_id
        `;

        const result = await pool.query(query, [productId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Product not found' });
        }

        res.json({
            success: true,
            data: result.rows[0]
        });
    } catch (error) {
        console.error('Error fetching product:', error);
        res.status(500).json({ error: 'Failed to fetch product' });
    }
};

// Create new product
exports.createProduct = async (req, res) => {
    try {
        const { name, description, companyId, subcategoryId, attributes, saveAsDraft } = req.body;
        const operatorId = req.operator.operator_id;

        if (!name || !companyId) {
            return res.status(400).json({ error: 'Name and company ID are required' });
        }

        const client = await pool.connect();

        try {
            await client.query('BEGIN');

            // Create product
            const productQuery = `
                INSERT INTO products (name, description, company_id, subcategory_id)
                VALUES ($1, $2, $3, $4)
                RETURNING *
            `;

            const productResult = await client.query(productQuery, [
                name,
                description || null,
                companyId,
                subcategoryId || null
            ]);

            const productId = productResult.rows[0].product_id;
            const newData = {
                name,
                description,
                companyId,
                subcategoryId,
                attributes
            };

            // Insert attributes if provided
            if (attributes && Array.isArray(attributes)) {
                for (const attr of attributes) {
                    await client.query(
                        `INSERT INTO product_attributes (product_id, attribute_name, attribute_value, attribute_type)
                         VALUES ($1, $2, $3, $4)`,
                        [productId, attr.name, attr.value, attr.type || 'text']
                    );
                }
            }

            // Create draft if requested
            if (saveAsDraft) {
                await client.query(
                    `INSERT INTO product_drafts (product_id, operator_id, draft_data, is_active)
                     VALUES ($1, $2, $3, true)`,
                    [productId, operatorId, JSON.stringify(newData)]
                );
            }

            // Log the change
            await logDataChange(
                operatorId,
                productId,
                'CREATE',
                null,
                newData,
                client
            );

            await client.query('COMMIT');

            res.status(201).json({
                success: true,
                message: saveAsDraft ? 'Product saved as draft' : 'Product created and published',
                data: productResult.rows[0]
            });
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('Error creating product:', error);
        res.status(500).json({ error: 'Failed to create product' });
    }
};

// Update product
exports.updateProduct = async (req, res) => {
    try {
        const { productId } = req.params;
        const { name, description, companyId, subcategoryId, attributes, saveAsDraft } = req.body;
        const operatorId = req.operator.operator_id;

        const client = await pool.connect();

        try {
            await client.query('BEGIN');

            // Get old data for logging
            const oldDataResult = await client.query(
                `SELECT * FROM products WHERE product_id = $1`,
                [productId]
            );

            if (oldDataResult.rows.length === 0) {
                await client.query('ROLLBACK');
                return res.status(404).json({ error: 'Product not found' });
            }

            const oldData = oldDataResult.rows[0];

            // Update product
            const updateQuery = `
                UPDATE products
                SET name = $1, description = $2, company_id = $3, subcategory_id = $4
                WHERE product_id = $5
                RETURNING *
            `;

            const updateResult = await client.query(updateQuery, [
                name || oldData.name,
                description !== undefined ? description : oldData.description,
                companyId || oldData.company_id,
                subcategoryId !== undefined ? subcategoryId : oldData.subcategory_id,
                productId
            ]);

            const newData = {
                name: name || oldData.name,
                description: description !== undefined ? description : oldData.description,
                companyId: companyId || oldData.company_id,
                subcategoryId: subcategoryId !== undefined ? subcategoryId : oldData.subcategory_id,
                attributes
            };

            // Delete and recreate attributes if provided
            if (attributes && Array.isArray(attributes)) {
                await client.query('DELETE FROM product_attributes WHERE product_id = $1', [productId]);
                for (const attr of attributes) {
                    await client.query(
                        `INSERT INTO product_attributes (product_id, attribute_name, attribute_value, attribute_type)
                         VALUES ($1, $2, $3, $4)`,
                        [productId, attr.name, attr.value, attr.type || 'text']
                    );
                }
            }

            // Create draft if requested
            if (saveAsDraft) {
                await client.query(
                    `UPDATE product_drafts SET is_active = false WHERE product_id = $1`,
                    [productId]
                );
                await client.query(
                    `INSERT INTO product_drafts (product_id, operator_id, draft_data, is_active)
                     VALUES ($1, $2, $3, true)`,
                    [productId, operatorId, JSON.stringify(newData)]
                );
            }

            // Log the change
            await logDataChange(
                operatorId,
                productId,
                'UPDATE',
                oldData,
                newData,
                client
            );

            await client.query('COMMIT');

            res.json({
                success: true,
                message: saveAsDraft ? 'Changes saved as draft' : 'Product updated',
                data: updateResult.rows[0]
            });
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('Error updating product:', error);
        res.status(500).json({ error: 'Failed to update product' });
    }
};

// Delete product
exports.deleteProduct = async (req, res) => {
    try {
        const { productId } = req.params;
        const operatorId = req.operator.operator_id;

        const client = await pool.connect();

        try {
            await client.query('BEGIN');

            // Get product data for logging
            const productResult = await client.query(
                `SELECT * FROM products WHERE product_id = $1`,
                [productId]
            );

            if (productResult.rows.length === 0) {
                await client.query('ROLLBACK');
                return res.status(404).json({ error: 'Product not found' });
            }

            const oldData = productResult.rows[0];

            // Log the change before deletion
            await logDataChange(
                operatorId,
                productId,
                'DELETE',
                oldData,
                null,
                client
            );

            // Delete product (cascades to attributes and drafts)
            await client.query('DELETE FROM products WHERE product_id = $1', [productId]);

            await client.query('COMMIT');

            res.json({
                success: true,
                message: 'Product deleted successfully'
            });
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('Error deleting product:', error);
        res.status(500).json({ error: 'Failed to delete product' });
    }
};

// Publish draft
exports.publishDraft = async (req, res) => {
    try {
        const { draftId } = req.params;
        const operatorId = req.operator.operator_id;

        const draftResult = await pool.query(
            `SELECT * FROM product_drafts WHERE draft_id = $1`,
            [draftId]
        );

        if (draftResult.rows.length === 0) {
            return res.status(404).json({ error: 'Draft not found' });
        }

        const draft = draftResult.rows[0];

        // Mark as inactive
        await pool.query(
            `UPDATE product_drafts SET is_active = false WHERE draft_id = $1`,
            [draftId]
        );

        res.json({
            success: true,
            message: 'Draft published successfully',
            productId: draft.product_id
        });
    } catch (error) {
        console.error('Error publishing draft:', error);
        res.status(500).json({ error: 'Failed to publish draft' });
    }
};

// Get change logs for a product
exports.getChangeLogs = async (req, res) => {
    try {
        const { productId } = req.params;
        const { limit = 50, offset = 0 } = req.query;

        const query = `
            SELECT 
                dcl.log_id,
                dcl.operator_id,
                do.name as operator_name,
                dcl.action,
                dcl.old_data,
                dcl.new_data,
                dcl.timestamp
            FROM data_change_logs dcl
            LEFT JOIN data_operators do ON dcl.operator_id = do.operator_id
            WHERE dcl.product_id = $1
            ORDER BY dcl.timestamp DESC
            LIMIT $2 OFFSET $3
        `;

        const result = await pool.query(query, [productId, limit, offset]);

        res.json({
            success: true,
            data: result.rows
        });
    } catch (error) {
        console.error('Error fetching change logs:', error);
        res.status(500).json({ error: 'Failed to fetch change logs' });
    }
};
