const { pool } = require('../../../../backend/config/database');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

/**
 * Operator login with email and password
 */
exports.operatorLogin = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        // Check if operator exists
        const result = await pool.query(
            `SELECT * FROM data_operators WHERE email = $1`,
            [email.toLowerCase()]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const operator = result.rows[0];

        // Verify password
        const isPasswordValid = await bcrypt.compare(password, operator.password_hash);

        if (!isPasswordValid) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Generate token
        const token = jwt.sign(
            {
                operator_id: operator.operator_id,
                email: operator.email,
                role: operator.role
            },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            success: true,
            message: 'Login successful',
            token,
            operator: {
                operator_id: operator.operator_id,
                name: operator.name,
                email: operator.email,
                role: operator.role
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
};

/**
 * Get current operator profile
 */
exports.getOperatorProfile = async (req, res) => {
    try {
        const operator = req.operator;

        res.json({
            success: true,
            data: {
                operator_id: operator.operator_id,
                name: operator.name,
                email: operator.email,
                role: operator.role,
                created_at: operator.created_at
            }
        });
    } catch (error) {
        console.error('Error fetching profile:', error);
        res.status(500).json({ error: 'Failed to fetch profile' });
    }
};

/**
 * Get operator dashboard statistics
 */
exports.getDashboardStats = async (req, res) => {
    try {
        const operatorId = req.operator.operator_id;

        const statsQuery = `
            SELECT 
                (SELECT COUNT(*) FROM products) as total_products,
                (SELECT COUNT(*) FROM products WHERE created_at::date = CURRENT_DATE) as products_today,
                (SELECT COUNT(*) FROM data_change_logs WHERE operator_id = $1) as operator_changes,
                (SELECT COUNT(*) FROM data_change_logs WHERE operator_id = $1 AND timestamp::date = CURRENT_DATE) as changes_today,
                (SELECT COUNT(*) FROM product_drafts WHERE operator_id = $1 AND is_active = true) as active_drafts
        `;

        const result = await pool.query(statsQuery, [operatorId]);

        res.json({
            success: true,
            data: result.rows[0]
        });
    } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        res.status(500).json({ error: 'Failed to fetch statistics' });
    }
};

/**
 * Get list of all operators (admin only)
 */
exports.getAllOperators = async (req, res) => {
    try {
        if (req.operator.role !== 'admin') {
            return res.status(403).json({ error: 'Admin access required' });
        }

        const result = await pool.query(
            `SELECT operator_id, name, email, role, created_at FROM data_operators ORDER BY created_at DESC`
        );

        res.json({
            success: true,
            data: result.rows
        });
    } catch (error) {
        console.error('Error fetching operators:', error);
        res.status(500).json({ error: 'Failed to fetch operators' });
    }
};

/**
 * Create new operator (admin only)
 */
exports.createOperator = async (req, res) => {
    try {
        if (req.operator.role !== 'admin') {
            return res.status(403).json({ error: 'Admin access required' });
        }

        const { name, email, password, role } = req.body;

        if (!name || !email || !password || !role) {
            return res.status(400).json({ error: 'All fields are required' });
        }

        if (!['admin', 'data_entry_operator'].includes(role)) {
            return res.status(400).json({ error: 'Invalid role' });
        }

        // Check if email already exists
        const existingOperator = await pool.query(
            `SELECT * FROM data_operators WHERE email = $1`,
            [email.toLowerCase()]
        );

        if (existingOperator.rows.length > 0) {
            return res.status(400).json({ error: 'Email already registered' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        const result = await pool.query(
            `INSERT INTO data_operators (name, email, password_hash, role)
             VALUES ($1, $2, $3, $4)
             RETURNING operator_id, name, email, role, created_at`,
            [name, email.toLowerCase(), hashedPassword, role]
        );

        res.status(201).json({
            success: true,
            message: 'Operator created successfully',
            data: result.rows[0]
        });
    } catch (error) {
        console.error('Error creating operator:', error);
        res.status(500).json({ error: 'Failed to create operator' });
    }
};
