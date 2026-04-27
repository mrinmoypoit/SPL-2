const { Pool } = require('pg');
require('dotenv').config();

const resolveDbUser = () => {
    const configuredUser = process.env.DB_USER || process.env.PGUSER;
    if (configuredUser && String(configuredUser).trim()) {
        return configuredUser;
    }

    // On many local installs, PostgreSQL role matches the OS account name.
    return process.env.USER || process.env.LOGNAME || 'postgres';
};

const resolveDbPassword = () => {
    if (Object.prototype.hasOwnProperty.call(process.env, 'DB_PASSWORD')) {
        const password = String(process.env.DB_PASSWORD || '').trim();
        return password.length > 0 ? password : undefined;
    }

    if (Object.prototype.hasOwnProperty.call(process.env, 'PGPASSWORD')) {
        const password = String(process.env.PGPASSWORD || '').trim();
        return password.length > 0 ? password : undefined;
    }

    return undefined;
};

// PostgreSQL connection configuration
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    user: resolveDbUser(),
    password: resolveDbPassword(),
    database: process.env.DB_NAME || 'tulona_db',
    max: 20, // Maximum number of clients in the pool
    idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
    connectionTimeoutMillis: 2000, // Return an error after 2 seconds if connection could not be established
};

// Create PostgreSQL connection pool
const pool = new Pool(dbConfig);

// Test database connection
pool.on('connect', () => {
    console.log('✅ Connected to PostgreSQL database');
});

pool.on('error', (err) => {
    console.error('❌ Unexpected error on idle client', err);
    process.exit(-1);
});

// Query helper function
const query = async (text, params) => {
    const start = Date.now();
    try {
        const res = await pool.query(text, params);
        const duration = Date.now() - start;
        console.log('Executed query', { text, duration, rows: res.rowCount });
        return res;
    } catch (error) {
        console.error('Database query error:', error);
        throw error;
    }
};

// Transaction helper
const transaction = async (callback) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const result = await callback(client);
        await client.query('COMMIT');
        return result;
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
};

module.exports = {
    pool,
    query,
    transaction
};
