const fs = require('fs');
const path = require('path');
const { pool } = require('../config/database');

async function setupDatabase() {
    console.log('Starting database setup...\n');

    try {
        // Read schema file
        const schemaPath = path.join(__dirname, 'schema.sql');
        const schemaSQL = fs.readFileSync(schemaPath, 'utf8');

        console.log('Creating tables and indexes...');
        await pool.query(schemaSQL);
        console.log('Tables and indexes created successfully\n');

        // Read seed file
        const seedPath = path.join(__dirname, 'seed.sql');
        const seedSQL = fs.readFileSync(seedPath, 'utf8');

        console.log('Seeding database with sample data...');
        await pool.query(seedSQL);
        console.log('Sample data inserted successfully\n');

        console.log('Database setup completed successfully!');
        
        // Display table count
        const result = await pool.query(`
            SELECT COUNT(*) as table_count 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
        `);
        console.log(`Total tables created: ${result.rows[0].table_count}`);

    } catch (error) {
        console.error('Database setup failed:', error.message);
        throw error;
    } finally {
        await pool.end();
    }
}

// Run setup if this file is executed directly
if (require.main === module) {
    setupDatabase()
        .then(() => process.exit(0))
        .catch((err) => {
            console.error(err);
            process.exit(1);
        });
}

module.exports = { setupDatabase };
