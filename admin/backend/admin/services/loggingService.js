const { pool } = require('../../../../backend/config/database');

/**
 * Log data changes for audit trail
 * @param {number} operatorId - ID of the operator making the change
 * @param {number} productId - ID of the product being changed
 * @param {string} action - Action type: CREATE, UPDATE, DELETE
 * @param {object} oldData - Previous data (null for CREATE)
 * @param {object} newData - New data (null for DELETE)
 * @param {object} client - Database client for transaction
 */
exports.logDataChange = async (operatorId, productId, action, oldData, newData, client = null) => {
    try {
        const query = `
            INSERT INTO data_change_logs (operator_id, product_id, action, old_data, new_data)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
        `;

        const dbClient = client || pool;
        const result = await dbClient.query(query, [
            operatorId,
            productId,
            action,
            oldData ? JSON.stringify(oldData) : null,
            newData ? JSON.stringify(newData) : null
        ]);

        return result.rows[0];
    } catch (error) {
        console.error('Error logging data change:', error);
        throw error;
    }
};

/**
 * Get audit log for a specific product
 */
exports.getProductAuditLog = async (productId, limit = 100, offset = 0) => {
    try {
        const query = `
            SELECT 
                dcl.log_id,
                dcl.operator_id,
                do.name as operator_name,
                do.email as operator_email,
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
        return result.rows;
    } catch (error) {
        console.error('Error fetching audit log:', error);
        throw error;
    }
};

/**
 * Get all logs for an operator
 */
exports.getOperatorLogs = async (operatorId, limit = 100, offset = 0) => {
    try {
        const query = `
            SELECT 
                dcl.log_id,
                dcl.product_id,
                dcl.action,
                dcl.old_data,
                dcl.new_data,
                dcl.timestamp,
                p.name as product_name
            FROM data_change_logs dcl
            LEFT JOIN products p ON dcl.product_id = p.product_id
            WHERE dcl.operator_id = $1
            ORDER BY dcl.timestamp DESC
            LIMIT $2 OFFSET $3
        `;

        const result = await pool.query(query, [operatorId, limit, offset]);
        return result.rows;
    } catch (error) {
        console.error('Error fetching operator logs:', error);
        throw error;
    }
};

/**
 * Get statistics on data changes
 */
exports.getChangeStatistics = async (productId) => {
    try {
        const query = `
            SELECT 
                action,
                COUNT(*) as count,
                COUNT(DISTINCT operator_id) as operators_count,
                MAX(timestamp) as last_change
            FROM data_change_logs
            WHERE product_id = $1
            GROUP BY action
        `;

        const result = await pool.query(query, [productId]);
        return result.rows;
    } catch (error) {
        console.error('Error fetching change statistics:', error);
        throw error;
    }
};
