const path = require('path');
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');

require('dotenv').config({ path: path.resolve(__dirname, '../../backend/.env') });

const { pool } = require('../../backend/config/database');
const adminRoutes = require('./admin/routes/adminRoutes');
const operatorRoutes = require('./admin/routes/operatorRoutes');

const app = express();
const PORT = Number(process.env.ADMIN_BACKEND_PORT || 3001);

app.use(cors());
app.use(express.json());

const ensureDefaultOperatorPasswords = async () => {
  try {
    const placeholderHash = '$2a$10$YourHashedPasswordHere';
    const result = await pool.query(
      `SELECT operator_id FROM data_operators WHERE password_hash = $1`,
      [placeholderHash]
    );

    if (result.rows.length === 0) {
      return;
    }

    const defaultPassword = process.env.ADMIN_DEFAULT_PASSWORD || 'admin123';
    const hashedPassword = await bcrypt.hash(defaultPassword, 10);

    await pool.query(
      `UPDATE data_operators SET password_hash = $1 WHERE password_hash = $2`,
      [hashedPassword, placeholderHash]
    );

    console.log(`Updated ${result.rows.length} operator password hash(es) from placeholder value`);
  } catch (error) {
    console.error('Failed to ensure operator default passwords:', error.message);
  }
};

app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'healthy', service: 'admin-backend', database: 'connected' });
  } catch (error) {
    res.status(500).json({ status: 'unhealthy', service: 'admin-backend', error: error.message });
  }
});

app.get('/api/companies', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT company_id, name, description, website_url FROM companies ORDER BY name ASC'
    );
    res.json({ success: true, companies: result.rows });
  } catch (error) {
    console.error('Error fetching companies:', error);
    res.status(500).json({ error: 'Failed to fetch companies' });
  }
});

app.get('/api/categories', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT c.category_id as id, c.name, COUNT(sc.subcategory_id)::int as subcategories_count
       FROM category c
       LEFT JOIN product_subcategories sc ON c.category_id = sc.category_id
       GROUP BY c.category_id, c.name
       ORDER BY c.name ASC`
    );

    res.json({
      success: true,
      categories: result.rows
    });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

app.get('/api/subcategories', async (req, res) => {
  try {
    const { categoryId } = req.query;
    const params = [];

    let query = `
      SELECT
        sc.subcategory_id as id,
        sc.category_id,
        sc.name,
        sc.description,
        c.name as category_name
      FROM product_subcategories sc
      LEFT JOIN category c ON c.category_id = sc.category_id
    `;

    if (categoryId) {
      params.push(Number.parseInt(categoryId, 10));
      query += ` WHERE sc.category_id = $1`;
    }

    query += ` ORDER BY c.name ASC, sc.name ASC`;

    const result = await pool.query(query, params);

    res.json({
      success: true,
      subcategories: result.rows
    });
  } catch (error) {
    console.error('Error fetching subcategories:', error);
    res.status(500).json({ error: 'Failed to fetch subcategories' });
  }
});

app.use('/api/admin/operators', operatorRoutes);
app.use('/api/admin', adminRoutes);

app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

const startServer = async () => {
  await ensureDefaultOperatorPasswords();

  app.listen(PORT, () => {
    console.log(`Admin backend server running on port ${PORT}`);
  });
};

startServer();
