const { pool } = require('../../../../backend/config/database');
const { logDataChange } = require('../services/loggingService');
const { createProductMatchNotifications } = require('../services/notificationService');

const normalizeAttributes = (attributes = []) => {
    if (!Array.isArray(attributes)) {
        return [];
    }

    return attributes
        .map((attr) => ({
            name: String(attr?.name || attr?.attribute_name || '').trim() || null,
            value: attr?.value ?? attr?.attribute_value ?? null,
            type: attr?.type || attr?.attribute_type || 'text'
        }))
        .map((attr) => ({
            ...attr,
            value: typeof attr.value === 'string' ? attr.value.trim() : attr.value
        }))
        .filter((attr) => attr.name && attr.value !== null && attr.value !== undefined && attr.value !== '');
};

const triggerProductMatchNotifications = async (productId) => {
    try {
        const result = await createProductMatchNotifications(productId);

        if (result.createdCount > 0) {
            console.log(
                `Created ${result.createdCount} user notification(s) for product ${productId} (${result.productName || 'unknown'})`
            );
        }
    } catch (error) {
        console.error(`Failed to generate product-match notifications for product ${productId}:`, error.message);
    }
};

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

// Create new product - Direct database insertion
exports.createProduct = async (req, res) => {
    try {
        const { name, description, companyId, subcategoryId, attributes, saveAsDraft } = req.body;
        const operatorId = req.operator.operator_id;
        const normalizedAttributes = normalizeAttributes(attributes);

        if (!name || !companyId) {
            return res.status(400).json({ error: 'Name and company ID are required' });
        }

        const client = await pool.connect();

        try {
            await client.query('BEGIN');

            // Step 1: Verify company exists
            const companyCheck = await client.query(
                `SELECT company_id FROM companies WHERE company_id = $1`,
                [companyId]
            );

            if (companyCheck.rows.length === 0) {
                await client.query('ROLLBACK');
                return res.status(400).json({ error: 'Company not found' });
            }

            // Step 2: Create product in database
            const productQuery = `
                INSERT INTO products (name, description, company_id, subcategory_id, created_at, updated_at)
                VALUES ($1, $2, $3, $4, NOW(), NOW())
                RETURNING product_id, name, description, company_id, subcategory_id, created_at, updated_at
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
                attributes: normalizedAttributes
            };

            // Step 3: Insert attributes into database
            if (normalizedAttributes.length > 0) {
                for (const attr of normalizedAttributes) {
                    await client.query(
                        `INSERT INTO product_attributes 
                         (product_id, attribute_name, attribute_value, attribute_type, created_at)
                         VALUES ($1, $2, $3, $4, NOW())`,
                        [productId, attr.name, attr.value, attr.type || 'text']
                    );
                }
            }

            // Step 4: Create draft if requested
            if (saveAsDraft) {
                await client.query(
                    `INSERT INTO product_drafts 
                     (product_id, operator_id, draft_data, is_active, created_at, updated_at)
                     VALUES ($1, $2, $3, true, NOW(), NOW())`,
                    [productId, operatorId, JSON.stringify(newData)]
                );
            }

            // Step 5: Log the change
            await logDataChange(
                operatorId,
                productId,
                'CREATE',
                null,
                newData,
                client
            );

            // Step 6: Commit transaction - ensures all data is saved to database
            await client.query('COMMIT');

            res.status(201).json({
                success: true,
                message: saveAsDraft ? 'Product saved as draft in database' : 'Product created and published to database',
                data: {
                    productId: productResult.rows[0].product_id,
                    name: productResult.rows[0].name,
                    description: productResult.rows[0].description,
                    companyId: productResult.rows[0].company_id,
                    subcategoryId: productResult.rows[0].subcategory_id,
                    status: saveAsDraft ? 'draft' : 'published',
                    createdAt: productResult.rows[0].created_at,
                    updatedAt: productResult.rows[0].updated_at,
                    attributesCount: normalizedAttributes.length
                }
            });
        } catch (error) {
            await client.query('ROLLBACK');
            console.error('Error in transaction:', error);
            throw error;
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('Error creating product:', error);
        res.status(500).json({ 
            error: 'Failed to create product',
            details: error.message 
        });
    }
};

// Update product - Save to database
exports.updateProduct = async (req, res) => {
    try {
        const { productId } = req.params;
        const { name, description, companyId, subcategoryId, attributes, saveAsDraft } = req.body;
        const operatorId = req.operator.operator_id;
        const normalizedAttributes = normalizeAttributes(attributes);
        const hasAttributesPayload = Array.isArray(attributes);

        const client = await pool.connect();

        try {
            await client.query('BEGIN');

            // Step 1: Get old data for logging
            const oldDataResult = await client.query(
                `SELECT * FROM products WHERE product_id = $1`,
                [productId]
            );

            if (oldDataResult.rows.length === 0) {
                await client.query('ROLLBACK');
                return res.status(404).json({ error: 'Product not found' });
            }

            const oldData = oldDataResult.rows[0];

            // Step 2: Update product in database
            const updateQuery = `
                UPDATE products
                SET name = $1, description = $2, company_id = $3, subcategory_id = $4, updated_at = NOW()
                WHERE product_id = $5
                RETURNING product_id, name, description, company_id, subcategory_id, created_at, updated_at
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
                attributes: normalizedAttributes
            };

            // Step 3: Delete and recreate attributes when attributes payload is provided
            if (hasAttributesPayload) {
                await client.query('DELETE FROM product_attributes WHERE product_id = $1', [productId]);
                for (const attr of normalizedAttributes) {
                    await client.query(
                        `INSERT INTO product_attributes 
                         (product_id, attribute_name, attribute_value, attribute_type, created_at)
                         VALUES ($1, $2, $3, $4, NOW())`,
                        [productId, attr.name, attr.value, attr.type || 'text']
                    );
                }
            }

            // Step 4: Create draft if requested
            if (saveAsDraft) {
                await client.query(
                    `UPDATE product_drafts SET is_active = false WHERE product_id = $1`,
                    [productId]
                );
                await client.query(
                    `INSERT INTO product_drafts (product_id, operator_id, draft_data, is_active, created_at, updated_at)
                     VALUES ($1, $2, $3, true, NOW(), NOW())`,
                    [productId, operatorId, JSON.stringify(newData)]
                );
            } else {
                // Ensure product is published by clearing active drafts
                await client.query(
                    `UPDATE product_drafts SET is_active = false WHERE product_id = $1`,
                    [productId]
                );
            }

            // Step 5: Log the change
            await logDataChange(
                operatorId,
                productId,
                'UPDATE',
                oldData,
                newData,
                client
            );

            // Step 6: Commit transaction - ensures all updates are saved to database
            await client.query('COMMIT');

            res.json({
                success: true,
                message: saveAsDraft ? 'Changes saved as draft in database' : 'Product updated and saved to database',
                data: {
                    productId: updateResult.rows[0].product_id,
                    name: updateResult.rows[0].name,
                    description: updateResult.rows[0].description,
                    companyId: updateResult.rows[0].company_id,
                    subcategoryId: updateResult.rows[0].subcategory_id,
                    status: saveAsDraft ? 'draft' : 'published',
                    createdAt: updateResult.rows[0].created_at,
                    updatedAt: updateResult.rows[0].updated_at,
                    attributesUpdated: hasAttributesPayload ? normalizedAttributes.length : 0
                }
            });
        } catch (error) {
            await client.query('ROLLBACK');
            console.error('Error in transaction:', error);
            throw error;
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('Error updating product:', error);
        res.status(500).json({ 
            error: 'Failed to update product',
            details: error.message 
        });
    }
};

// Get active drafts for current operator
exports.getDrafts = async (req, res) => {
    try {
        const operatorId = req.operator.operator_id;

        const query = `
            SELECT
                pd.draft_id,
                pd.product_id,
                pd.operator_id,
                pd.draft_data,
                pd.is_active,
                pd.created_at,
                pd.updated_at,
                p.name,
                c.name AS company_name,
                sc.name AS category
            FROM product_drafts pd
            LEFT JOIN products p ON pd.product_id = p.product_id
            LEFT JOIN companies c ON p.company_id = c.company_id
            LEFT JOIN product_subcategories sc ON p.subcategory_id = sc.subcategory_id
            WHERE pd.operator_id = $1
              AND pd.is_active = true
            ORDER BY pd.updated_at DESC
        `;

        const result = await pool.query(query, [operatorId]);

        const drafts = result.rows.map((row) => {
            let data = {};
            try {
                data = row.draft_data ? JSON.parse(row.draft_data) : {};
            } catch {
                data = {};
            }

            return {
                ...row,
                data
            };
        });

        res.json({
            success: true,
            data: drafts
        });
    } catch (error) {
        console.error('Error fetching drafts:', error);
        res.status(500).json({ error: 'Failed to fetch drafts' });
    }
};

// Delete a draft
exports.deleteDraft = async (req, res) => {
    try {
        const { draftId } = req.params;
        const operatorId = req.operator.operator_id;
        const client = await pool.connect();

        try {
            await client.query('BEGIN');

            const draftResult = await client.query(
                `SELECT * FROM product_drafts
                 WHERE draft_id = $1 AND operator_id = $2`,
                [draftId, operatorId]
            );

            if (draftResult.rows.length === 0) {
                await client.query('ROLLBACK');
                return res.status(404).json({ error: 'Draft not found' });
            }

            const draft = draftResult.rows[0];
            let oldDraftData = {};
            try {
                oldDraftData = draft.draft_data ? JSON.parse(draft.draft_data) : {};
            } catch {
                oldDraftData = {};
            }

            await client.query(
                `DELETE FROM product_drafts
                 WHERE draft_id = $1 AND operator_id = $2`,
                [draftId, operatorId]
            );

            await logDataChange(
                operatorId,
                draft.product_id,
                'DELETE',
                oldDraftData,
                null,
                client
            );

            await client.query('COMMIT');

            res.json({
                success: true,
                message: 'Draft deleted successfully'
            });
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('Error deleting draft:', error);
        res.status(500).json({ error: 'Failed to delete draft' });
    }
};

// Get audit logs (global or filtered by product)
exports.getAuditLogs = async (req, res) => {
    try {
        const { action = 'all', productId, limit = 100, offset = 0 } = req.query;

        let query = `
            SELECT
                dcl.log_id,
                dcl.action,
                dcl.old_data,
                dcl.new_data,
                dcl.timestamp AS created_at,
                p.product_id,
                COALESCE(
                    p.name,
                    CASE WHEN dcl.old_data IS NOT NULL THEN (dcl.old_data::jsonb ->> 'name') END,
                    CASE WHEN dcl.new_data IS NOT NULL THEN (dcl.new_data::jsonb ->> 'name') END,
                    'N/A'
                ) AS product_name,
                o.name AS performed_by
            FROM data_change_logs dcl
            LEFT JOIN products p ON dcl.product_id = p.product_id
            LEFT JOIN data_operators o ON dcl.operator_id = o.operator_id
            WHERE 1=1
        `;

        const params = [];

        if (productId) {
            params.push(Number.parseInt(productId, 10));
            query += ` AND dcl.product_id = $${params.length}`;
        }

        if (action && action !== 'all') {
            params.push(action.toUpperCase());
            query += ` AND dcl.action = $${params.length}`;
        }

        params.push(Number.parseInt(limit, 10) || 100);
        params.push(Number.parseInt(offset, 10) || 0);
        query += ` ORDER BY dcl.timestamp DESC LIMIT $${params.length - 1} OFFSET $${params.length}`;

        const result = await pool.query(query, params);

        res.json({
            success: true,
            data: result.rows
        });
    } catch (error) {
        console.error('Error fetching audit logs:', error);
        res.status(500).json({ error: 'Failed to fetch audit logs' });
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

// Publish draft - Update products table with draft data
exports.publishDraft = async (req, res) => {
    try {
        const { draftId } = req.params;
        const operatorId = req.operator.operator_id;
        const client = await pool.connect();

        try {
            await client.query('BEGIN');

            // Step 1: Get draft data
            const draftResult = await client.query(
                `SELECT * FROM product_drafts WHERE draft_id = $1 AND is_active = true`,
                [draftId]
            );

            if (draftResult.rows.length === 0) {
                await client.query('ROLLBACK');
                return res.status(404).json({ error: 'Draft not found or already published' });
            }

            const draft = draftResult.rows[0];
            let draftData = {};
            try {
                draftData = draft.draft_data ? JSON.parse(draft.draft_data) : {};
            } catch {
                draftData = {};
            }

            // Step 2: Get old product data for logging
            const oldProductResult = await client.query(
                `SELECT * FROM products WHERE product_id = $1`,
                [draft.product_id]
            );
            const oldProductData = oldProductResult.rows.length > 0 ? oldProductResult.rows[0] : {};

            // Step 3: Update products table with draft data
            const updateQuery = `
                UPDATE products
                SET 
                    name = COALESCE($1, name),
                    description = COALESCE($2, description),
                    company_id = COALESCE($3, company_id),
                    subcategory_id = COALESCE($4, subcategory_id),
                    updated_at = NOW()
                WHERE product_id = $5
                RETURNING *
            `;

            const updateResult = await client.query(updateQuery, [
                draftData.name || null,
                draftData.description || null,
                draftData.companyId || draftData.company_id || null,
                draftData.subcategoryId || draftData.subcategory_id || null,
                draft.product_id
            ]);

            if (updateResult.rows.length === 0) {
                await client.query('ROLLBACK');
                return res.status(404).json({ error: 'Product not found' });
            }

            // Step 4: Update product attributes if provided
            if (draftData.attributes && Array.isArray(draftData.attributes) && draftData.attributes.length > 0) {
                // Delete old attributes
                await client.query(
                    `DELETE FROM product_attributes WHERE product_id = $1`,
                    [draft.product_id]
                );

                // Insert new attributes from draft
                for (const attr of draftData.attributes) {
                    await client.query(
                        `INSERT INTO product_attributes 
                         (product_id, attribute_name, attribute_value, attribute_type)
                         VALUES ($1, $2, $3, $4)`,
                        [
                            draft.product_id,
                            attr.name || attr.attribute_name,
                            attr.value || attr.attribute_value,
                            attr.type || attr.attribute_type || 'text'
                        ]
                    );
                }
            }

            // Step 5: Mark draft as inactive
            await client.query(
                `UPDATE product_drafts SET is_active = false WHERE draft_id = $1`,
                [draftId]
            );

            // Step 6: Log the publish action
            await logDataChange(
                operatorId,
                draft.product_id,
                'PUBLISH',
                oldProductData,
                updateResult.rows[0],
                client
            );

            await client.query('COMMIT');

            res.json({
                success: true,
                message: 'Draft published successfully to database',
                productId: draft.product_id,
                data: {
                    name: newProduct.name,
                    description: newProduct.description,
                    company_id: newProduct.company_id,
                    subcategory_id: newProduct.subcategory_id,
                    updated_at: newProduct.updated_at
                }
            });
        } catch (error) {
            await client.query('ROLLBACK');
            console.error('Error in transaction:', error);
            throw error;
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('Error publishing draft:', error);
        res.status(500).json({ 
            error: 'Failed to publish draft',
            details: error.message 
        });
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
