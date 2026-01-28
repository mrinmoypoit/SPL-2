const express = require('express');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Database configuration
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'tulona_db',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
};

// Create connection pool
const pool = mysql.createPool(dbConfig);

// Test database connection
pool.getConnection()
    .then(connection => {
        console.log('✅ Database connected successfully');
        connection.release();
    })
    .catch(err => {
        console.error('❌ Database connection failed:', err.message);
    });

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Access token required' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Invalid or expired token' });
        }
        req.user = user;
        next();
    });
};

// ==================== AUTH ROUTES ====================

// Register new user
app.post('/api/auth/register', async (req, res) => {
    try {
        const { name, email, phone, profession, income, password } = req.body;

        // Validate required fields
        if (!name || !email || !password) {
            return res.status(400).json({ error: 'Name, email, and password are required' });
        }

        // Check if user already exists
        const [existingUsers] = await pool.query(
            'SELECT user_id FROM users WHERE email = ? OR phone_number = ?',
            [email, phone]
        );

        if (existingUsers.length > 0) {
            return res.status(409).json({ error: 'User already exists with this email or phone' });
        }

        // Hash password
        const passwordHash = await bcrypt.hash(password, 10);

        // Insert user
        const [result] = await pool.query(
            'INSERT INTO users (name, email, phone_number, password_hash, profession, monthly_income) VALUES (?, ?, ?, ?, ?, ?)',
            [name, email, phone, passwordHash, profession, income]
        );

        // Generate JWT token
        const token = jwt.sign(
            { userId: result.insertId, email, name },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.status(201).json({
            message: 'User registered successfully',
            token,
            user: {
                userId: result.insertId,
                name,
                email,
                phone,
                profession,
                income
            }
        });
    } catch (error) {
        console.error('Register error:', error);
        res.status(500).json({ error: 'Registration failed' });
    }
});

// Login user
app.post('/api/auth/login', async (req, res) => {
    try {
        const { identifier, password } = req.body;

        if (!identifier || !password) {
            return res.status(400).json({ error: 'Email/phone and password are required' });
        }

        // Find user by email or phone
        const [users] = await pool.query(
            'SELECT * FROM users WHERE email = ? OR phone_number = ?',
            [identifier, identifier]
        );

        if (users.length === 0) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const user = users[0];

        // Verify password
        const validPassword = await bcrypt.compare(password, user.password_hash);
        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Generate JWT token
        const token = jwt.sign(
            { userId: user.user_id, email: user.email, name: user.name },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.json({
            message: 'Login successful',
            token,
            user: {
                userId: user.user_id,
                name: user.name,
                email: user.email,
                phone: user.phone_number,
                profession: user.profession,
                income: user.monthly_income,
                isVerified: user.is_verified
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
});

// ==================== OTP ROUTES ====================

// Generate and send OTP
app.post('/api/otp/generate', async (req, res) => {
    try {
        const { email, phone, otpType, deliveryMethod } = req.body;

        // Generate 6-digit OTP
        const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

        // Find user
        let userId = null;
        if (email || phone) {
            const [users] = await pool.query(
                'SELECT user_id FROM users WHERE email = ? OR phone_number = ?',
                [email, phone]
            );
            if (users.length > 0) {
                userId = users[0].user_id;
            }
        }

        // Store OTP
        await pool.query(
            'INSERT INTO otp_verifications (user_id, otp_code, otp_type, delivery_method, expires_at) VALUES (?, ?, ?, ?, ?)',
            [userId, otpCode, otpType, deliveryMethod, expiresAt]
        );

        // In production, send actual email/SMS here
        console.log(`OTP for ${email || phone}: ${otpCode}`);

        res.json({
            message: 'OTP sent successfully',
            otpCode, // Remove this in production!
            expiresIn: 300 // seconds
        });
    } catch (error) {
        console.error('OTP generation error:', error);
        res.status(500).json({ error: 'Failed to generate OTP' });
    }
});

// Verify OTP
app.post('/api/otp/verify', async (req, res) => {
    try {
        const { email, phone, otpCode } = req.body;

        const [otps] = await pool.query(
            `SELECT o.*, u.email, u.phone_number 
             FROM otp_verifications o 
             LEFT JOIN users u ON o.user_id = u.user_id 
             WHERE o.otp_code = ? AND o.is_used = FALSE 
             AND (u.email = ? OR u.phone_number = ?)
             ORDER BY o.created_at DESC LIMIT 1`,
            [otpCode, email, phone]
        );

        if (otps.length === 0) {
            return res.status(400).json({ error: 'Invalid OTP' });
        }

        const otp = otps[0];

        // Check if expired
        if (new Date() > new Date(otp.expires_at)) {
            return res.status(400).json({ error: 'OTP has expired' });
        }

        // Mark OTP as used
        await pool.query(
            'UPDATE otp_verifications SET is_used = TRUE WHERE otp_id = ?',
            [otp.otp_id]
        );

        res.json({ message: 'OTP verified successfully' });
    } catch (error) {
        console.error('OTP verification error:', error);
        res.status(500).json({ error: 'Failed to verify OTP' });
    }
});

// ==================== USER ROUTES ====================

// Get user profile
app.get('/api/users/profile', authenticateToken, async (req, res) => {
    try {
        const [users] = await pool.query(
            'SELECT user_id, name, email, phone_number, profession, monthly_income, is_verified, created_at FROM users WHERE user_id = ?',
            [req.user.userId]
        );

        if (users.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({ user: users[0] });
    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({ error: 'Failed to get profile' });
    }
});

// Update user profile
app.put('/api/users/profile', authenticateToken, async (req, res) => {
    try {
        const { name, email, phone, profession, income } = req.body;

        await pool.query(
            'UPDATE users SET name = ?, email = ?, phone_number = ?, profession = ?, monthly_income = ? WHERE user_id = ?',
            [name, email, phone, profession, income, req.user.userId]
        );

        res.json({ message: 'Profile updated successfully' });
    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({ error: 'Failed to update profile' });
    }
});

// Change password
app.put('/api/users/change-password', authenticateToken, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        // Get current password hash
        const [users] = await pool.query(
            'SELECT password_hash FROM users WHERE user_id = ?',
            [req.user.userId]
        );

        if (users.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Verify current password
        const validPassword = await bcrypt.compare(currentPassword, users[0].password_hash);
        if (!validPassword) {
            return res.status(401).json({ error: 'Current password is incorrect' });
        }

        // Hash new password
        const newPasswordHash = await bcrypt.hash(newPassword, 10);

        // Update password
        await pool.query(
            'UPDATE users SET password_hash = ? WHERE user_id = ?',
            [newPasswordHash, req.user.userId]
        );

        res.json({ message: 'Password changed successfully' });
    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({ error: 'Failed to change password' });
    }
});

// ==================== PRODUCT ROUTES ====================

// Get all products with filters
app.get('/api/products', async (req, res) => {
    try {
        const { category, subcategory, company, search, limit = 50, offset = 0 } = req.query;

        let query = `
            SELECT p.*, c.name as company_name, s.name as subcategory_name, cat.name as category_name
            FROM products p
            JOIN companies c ON p.company_id = c.company_id
            JOIN product_subcategories s ON p.subcategory_id = s.subcategory_id
            JOIN categories cat ON s.category_id = cat.category_id
            WHERE p.is_active = TRUE
        `;
        const params = [];

        if (category) {
            query += ' AND cat.name = ?';
            params.push(category);
        }

        if (subcategory) {
            query += ' AND s.name = ?';
            params.push(subcategory);
        }

        if (company) {
            query += ' AND c.name = ?';
            params.push(company);
        }

        if (search) {
            query += ' AND (p.name LIKE ? OR p.description LIKE ?)';
            params.push(`%${search}%`, `%${search}%`);
        }

        query += ' ORDER BY p.created_at DESC LIMIT ? OFFSET ?';
        params.push(parseInt(limit), parseInt(offset));

        const [products] = await pool.query(query, params);

        res.json({ products, count: products.length });
    } catch (error) {
        console.error('Get products error:', error);
        res.status(500).json({ error: 'Failed to get products' });
    }
});

// Get product by ID with attributes
app.get('/api/products/:id', async (req, res) => {
    try {
        const [products] = await pool.query(
            `SELECT p.*, c.name as company_name, c.logo_url, s.name as subcategory_name, cat.name as category_name
             FROM products p
             JOIN companies c ON p.company_id = c.company_id
             JOIN product_subcategories s ON p.subcategory_id = s.subcategory_id
             JOIN categories cat ON s.category_id = cat.category_id
             WHERE p.product_id = ?`,
            [req.params.id]
        );

        if (products.length === 0) {
            return res.status(404).json({ error: 'Product not found' });
        }

        // Get product attributes
        const [attributes] = await pool.query(
            'SELECT * FROM product_attributes WHERE product_id = ? ORDER BY display_order',
            [req.params.id]
        );

        res.json({
            product: products[0],
            attributes
        });
    } catch (error) {
        console.error('Get product error:', error);
        res.status(500).json({ error: 'Failed to get product' });
    }
});

// Get categories
app.get('/api/categories', async (req, res) => {
    try {
        const [categories] = await pool.query('SELECT * FROM categories ORDER BY name');
        res.json({ categories });
    } catch (error) {
        console.error('Get categories error:', error);
        res.status(500).json({ error: 'Failed to get categories' });
    }
});

// ==================== NOTIFICATIONS ROUTES ====================

// Get user notifications
app.get('/api/notifications', authenticateToken, async (req, res) => {
    try {
        const [notifications] = await pool.query(
            'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50',
            [req.user.userId]
        );

        res.json({ notifications });
    } catch (error) {
        console.error('Get notifications error:', error);
        res.status(500).json({ error: 'Failed to get notifications' });
    }
});

// Mark notification as read
app.put('/api/notifications/:id/read', authenticateToken, async (req, res) => {
    try {
        await pool.query(
            'UPDATE notifications SET is_read = TRUE WHERE notification_id = ? AND user_id = ?',
            [req.params.id, req.user.userId]
        );

        res.json({ message: 'Notification marked as read' });
    } catch (error) {
        console.error('Mark notification error:', error);
        res.status(500).json({ error: 'Failed to mark notification' });
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 TULONA API Server running on http://localhost:${PORT}`);
    console.log(`📊 Database: ${dbConfig.database}`);
    console.log(`🔐 JWT Secret: ${JWT_SECRET.substring(0, 10)}...`);
});
