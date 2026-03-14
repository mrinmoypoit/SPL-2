const { pool } = require('../../../../backend/config/database');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

/**
 * Middleware to authenticate data operators
 */
exports.authenticateOperator = async (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];

        if (!token) {
            return res.status(401).json({ error: 'Access token required' });
        }

        jwt.verify(token, JWT_SECRET, async (err, decoded) => {
            if (err) {
                return res.status(403).json({ error: 'Invalid or expired token' });
            }

            // Check if operator exists and has proper role
            const result = await pool.query(
                `SELECT * FROM data_operators WHERE operator_id = $1`,
                [decoded.operator_id]
            );

            if (result.rows.length === 0) {
                return res.status(401).json({ error: 'Operator not found' });
            }

            const operator = result.rows[0];

            // Check if operator has required role
            if (!['admin', 'data_entry_operator'].includes(operator.role)) {
                return res.status(403).json({ error: 'Insufficient permissions' });
            }

            req.operator = operator;
            next();
        });
    } catch (error) {
        console.error('Authentication error:', error);
        res.status(500).json({ error: 'Authentication failed' });
    }
};

/**
 * Middleware to check admin role only
 */
exports.isAdmin = (req, res, next) => {
    if (req.operator && req.operator.role === 'admin') {
        next();
    } else {
        res.status(403).json({ error: 'Admin access required' });
    }
};
