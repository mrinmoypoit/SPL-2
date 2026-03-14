require('dotenv').config();
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcryptjs = require('bcryptjs');
const { pool } = require('./config/database');
const { sendOTPEmail, sendWelcomeEmail, sendPasswordResetConfirmation } = require('./services/emailService');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

pool.query('SELECT NOW()')
    .then(() => {
        console.log('Database connected successfully');
    })
    .catch(err => {
        console.error('Database connection failed:', err.message);
    });

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

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

// Admin authentication middleware
const authenticateAdmin = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Access token required' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Invalid or expired token' });
        }
        
        if (user.role !== 'admin') {
            return res.status(403).json({ error: 'Admin access required' });
        }
        
        req.user = user;
        next();
    });
};

app.get('/', (req, res) => {
    res.json({
        message: 'Welcome to TULONA API',
        version: '1.0.0',
        description: 'Banking Product Comparison Platform',
        endpoints: {
            auth: {
                register: 'POST /api/auth/register',
                login: 'POST /api/auth/login'
            }
        },
        status: 'OK'
    });
});

app.get('/api/health', async (req, res) => {
    try {
        await pool.query('SELECT 1');
        res.json({ 
            status: 'healthy', 
            database: 'connected',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({ 
            status: 'unhealthy', 
            database: 'disconnected',
            error: error.message 
        });
    }
});

// ============ USER AUTH ROUTES ============

// User Sign Up
app.post('/api/auth/register', async (req, res) => {
    try {
        const { name, email, phone, password, profession, monthlyIncome } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({ error: 'Name, email, and password are required' });
        }

        // Check if email already exists
        const existingUser = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        if (existingUser.rows.length > 0) {
            return res.status(400).json({ error: 'Email already registered' });
        }

        // Hash password
        const salt = await bcryptjs.genSalt(10);
        const passwordHash = await bcryptjs.hash(password, salt);

        // Insert user into database
        const result = await pool.query(
            'INSERT INTO users (name, email, phone_number, password_hash, profession, monthly_income, is_verified) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING user_id, name, email, phone_number, profession, monthly_income, is_verified',
            [name, email, phone || null, passwordHash, profession || null, monthlyIncome || 0, false]
        );

        const newUser = result.rows[0];
        const token = jwt.sign(
            { userId: newUser.user_id, email: newUser.email, name: newUser.name, role: 'user' },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        console.log('✅ User registered successfully:', email);

        res.status(201).json({
            message: 'User registered successfully',
            token,
            user: {
                userId: newUser.user_id,
                name: newUser.name,
                email: newUser.email,
                phone: newUser.phone_number || '',
                profession: newUser.profession || '',
                monthlyIncome: newUser.monthly_income || 0,
                isVerified: newUser.is_verified,
                role: 'user'
            }
        });
    } catch (error) {
        console.error('Register error:', error);
        res.status(500).json({ error: 'Registration failed', details: error.message });
    }
});

// User Login
app.post('/api/auth/login', async (req, res) => {
    try {
        const { identifier, password } = req.body;

        if (!identifier || !password) {
            return res.status(400).json({ error: 'Email/phone and password are required' });
        }

        // Admin credentials for testing
        if ((identifier === 'admin@tulona.com' || identifier === 'operator@tulona.com') && password === 'admin123') {
            const user = {
                userId: 999,
                name: 'Admin User',
                email: identifier,
                phone: '9876543210',
                profession: 'admin',
                monthlyIncome: 0,
                isVerified: true,
                role: 'admin'  // Admin role
            };

            const token = jwt.sign(
                { userId: user.userId, email: user.email, name: user.name, role: user.role },
                JWT_SECRET,
                { expiresIn: '7d' }
            );

            console.log('✅ Admin user logged in:', identifier);

            return res.json({
                message: 'Admin login successful',
                token,
                user
            });
        }

        // Check if user exists in database (by email or phone)
        const userResult = await pool.query(
            'SELECT * FROM users WHERE email = $1 OR phone_number = $1',
            [identifier]
        );

        if (userResult.rows.length === 0) {
            return res.status(401).json({ error: 'Invalid email/phone or password' });
        }

        const user = userResult.rows[0];

        // Compare password with hash
        const isPasswordValid = await bcryptjs.compare(password, user.password_hash);
        if (!isPasswordValid) {
            return res.status(401).json({ error: 'Invalid email/phone or password' });
        }

        const token = jwt.sign(
            { userId: user.user_id, email: user.email, name: user.name, role: 'user' },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        console.log('✅ User logged in:', identifier);

        res.json({
            message: 'Login successful',
            token,
            user: {
                userId: user.user_id,
                name: user.name,
                email: user.email,
                phone: user.phone_number || '',
                profession: user.profession || '',
                monthlyIncome: user.monthly_income || 0,
                isVerified: user.is_verified,
                role: 'user'
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Login failed', details: error.message });
    }
});

// Google OAuth Handler
app.post('/api/auth/google', async (req, res) => {
    try {
        const { token } = req.body;

        if (!token) {
            return res.status(400).json({ error: 'Google token is required' });
        }

        // Decode Google JWT token (without verification for dev mode)
        // In production, you should verify the token signature
        const parts = token.split('.');
        if (parts.length !== 3) {
            return res.status(400).json({ error: 'Invalid Google token format' });
        }

        try {
            // Decode the payload (second part)
            const payloadDecoded = Buffer.from(parts[1], 'base64').toString('utf-8');
            const googlePayload = JSON.parse(payloadDecoded);

            // Extract user information from Google token
            const user = {
                userId: Math.floor(Math.random() * 1000000),
                name: googlePayload.name || 'Google User',
                email: googlePayload.email,
                phone: '',
                profession: 'professional',
                monthlyIncome: 0,
                isVerified: true,
                picture: googlePayload.picture, // Google profile picture
                role: 'user'  // Default role is user
            };

            // Create JWT token for our system
            const jwtToken = jwt.sign(
                { userId: user.userId, email: user.email, name: user.name, role: user.role },
                JWT_SECRET,
                { expiresIn: '7d' }
            );

            console.log('✅ User authenticated with Google:', user.email);

            res.json({
                message: 'Google authentication successful',
                token: jwtToken,
                user
            });
        } catch (parseError) {
            console.error('Token decode error:', parseError);
            res.status(400).json({ error: 'Invalid Google token' });
        }
    } catch (error) {
        console.error('Google auth error:', error);
        res.status(500).json({ error: 'Google authentication failed' });
    }
});

// OTP Generate (for development)
app.post('/api/otp/generate', async (req, res) => {
    try {
        const { email, otpType = 'email_verification' } = req.body;

        if (!email) {
            return res.status(400).json({ error: 'Email is required' });
        }

        // Generate OTP
        const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
        
        // Send OTP email
        const emailResult = await sendOTPEmail(email, otpCode, otpType);
        
        if (emailResult.error) {
            console.warn('❌ OTP email failed:', emailResult.error);
            return res.status(500).json({ 
                error: 'Failed to send OTP email',
                details: emailResult.error 
            });
        }

        console.log(`✅ OTP sent to ${email}: ${otpCode}`);
        
        res.json({
            message: 'OTP sent successfully',
            expiresIn: 600,
            otpCode: otpCode  // For development purpose
        });
    } catch (error) {
        console.error('OTP generate error:', error);
        res.status(500).json({ error: 'Failed to generate OTP', details: error.message });
    }
});

// OTP Verify (for development)
app.post('/api/otp/verify', async (req, res) => {
    try {
        res.json({ message: 'OTP verified successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to verify OTP' });
    }
});

// Get User Profile
app.get('/api/users/profile', authenticateToken, async (req, res) => {
    try {
        const userResult = await pool.query('SELECT * FROM users WHERE user_id = $1', [req.user.userId]);
        
        if (userResult.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const user = userResult.rows[0];
        res.json({ 
            user: {
                userId: user.user_id,
                name: user.name,
                email: user.email,
                phone: user.phone_number || '',
                profession: user.profession || '',
                monthlyIncome: user.monthly_income || 0,
                isVerified: user.is_verified,
                createdAt: user.created_at
            }
        });
    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({ error: 'Failed to get profile', details: error.message });
    }
});

// Update User Profile
app.put('/api/users/profile', authenticateToken, async (req, res) => {
    try {
        const { name, phone, profession, monthlyIncome } = req.body;
        
        const result = await pool.query(
            'UPDATE users SET name = COALESCE($1, name), phone_number = COALESCE($2, phone_number), profession = COALESCE($3, profession), monthly_income = COALESCE($4, monthly_income), updated_at = CURRENT_TIMESTAMP WHERE user_id = $5 RETURNING user_id, name, email, phone_number, profession, monthly_income, is_verified',
            [name, phone, profession, monthlyIncome, req.user.userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const user = result.rows[0];
        console.log('✅ Profile updated:', req.user.email);

        res.json({ 
            message: 'Profile updated successfully',
            user: {
                userId: user.user_id,
                name: user.name,
                email: user.email,
                phone: user.phone_number || '',
                profession: user.profession || '',
                monthlyIncome: user.monthly_income || 0,
                isVerified: user.is_verified
            }
        });
    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({ error: 'Failed to update profile', details: error.message });
    }
});

// Change Password
app.put('/api/users/change-password', authenticateToken, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ error: 'Current password and new password are required' });
        }

        // Get user from database
        const userResult = await pool.query('SELECT * FROM users WHERE user_id = $1', [req.user.userId]);
        
        if (userResult.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const user = userResult.rows[0];

        // Verify current password
        const isPasswordValid = await bcryptjs.compare(currentPassword, user.password_hash);
        if (!isPasswordValid) {
            return res.status(401).json({ error: 'Current password is incorrect' });
        }

        // Hash new password
        const salt = await bcryptjs.genSalt(10);
        const newPasswordHash = await bcryptjs.hash(newPassword, salt);

        // Update password
        await pool.query(
            'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE user_id = $2',
            [newPasswordHash, req.user.userId]
        );

        console.log('✅ Password changed:', req.user.email);

        res.json({ message: 'Password changed successfully' });
    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({ error: 'Failed to change password', details: error.message });
    }
});

// Check Admin Role
app.get('/api/auth/check-admin', authenticateToken, async (req, res) => {
    try {
        const isAdmin = req.user.role === 'admin';
        res.json({ 
            isAdmin,
            role: req.user.role,
            message: isAdmin ? 'Admin access granted' : 'Admin access denied'
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to check admin role' });
    }
});

// Get All Products (for user frontend)
app.get('/api/products', async (req, res) => {
    try {
        const { category = 'all', search = '', limit = 20, offset = 0 } = req.query;

        // Mock products data
        const products = [
            {
                id: 1,
                name: 'Premium Credit Card',
                description: 'High-reward credit card with exclusive benefits',
                company: 'Bank A',
                category: 'Credit Cards',
                rating: 4.5,
                features: ['5% Cashback', 'Zero Annual Fee', 'Priority Support']
            },
            {
                id: 2,
                name: 'Personal Loan',
                description: 'Flexible personal loan with competitive rates',
                company: 'Bank B',
                category: 'Loans',
                rating: 4.3,
                features: ['Low Interest', 'Fast Approval', 'No Hidden Charges']
            },
            {
                id: 3,
                name: 'Savings Account',
                description: 'High-yield savings account for maximum returns',
                company: 'Bank C',
                category: 'Savings',
                rating: 4.7,
                features: ['4.5% Interest', 'No Minimum Balance', 'Free Debit Card']
            },
            {
                id: 4,
                name: 'Fixed Deposit',
                description: 'Secure investment with guaranteed returns',
                company: 'Bank A',
                category: 'Deposits',
                rating: 4.6,
                features: ['6% Interest', 'Insured Up to 5 Lakh', 'Flexible Tenure']
            }
        ];

        const filtered = products.filter(p => {
            if (category !== 'all' && p.category !== category) return false;
            if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
            return true;
        });

        res.json({
            products: filtered.slice(offset, offset + parseInt(limit)),
            count: filtered.length,
            total: products.length
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch products' });
    }
});

// Get Single Product
app.get('/api/products/:id', async (req, res) => {
    try {
        const product = {
            id: parseInt(req.params.id),
            name: 'Premium Credit Card',
            description: 'Premium credit card with exclusive benefits',
            company: 'Bank A',
            category: 'Credit Cards',
            rating: 4.5,
            features: ['5% Cashback', 'Zero Annual Fee', 'Priority Support'],
            details: {
                annualFee: 'Rs. 0',
                joiningBonus: 'Rs. 1000',
                rewardPoints: '1 point per rupee',
                eligibility: 'Minimum 2 lakh annual income'
            }
        };

        res.json({ product });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch product' });
    }
});

// Get Categories
app.get('/api/categories', async (req, res) => {
    try {
        const categories = [
            { id: 1, name: 'Credit Cards', count: 12 },
            { id: 2, name: 'Loans', count: 8 },
            { id: 3, name: 'Savings', count: 6 },
            { id: 4, name: 'Deposits', count: 10 }
        ];

        res.json({ categories });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch categories' });
    }
});

// ============ ADMIN OPERATORS ROUTES ============

// Admin Login
app.post('/api/admin/operators/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password required' });
        }

        // Mock admin user for testing
        if (email === 'admin@tulona.com' && password === 'admin123') {
            const token = jwt.sign(
                { operatorId: 1, email: 'admin@tulona.com', role: 'admin' },
                JWT_SECRET,
                { expiresIn: '24h' }
            );

            return res.json({
                message: 'Login successful',
                token,
                operator: {
                    operatorId: 1,
                    name: 'Admin User',
                    email: 'admin@tulona.com',
                    role: 'admin'
                }
            });
        }

        res.status(401).json({ error: 'Invalid credentials' });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
});

// Get Admin Profile
app.get('/api/admin/operators/profile', authenticateToken, async (req, res) => {
    try {
        res.json({
            operator: {
                operatorId: req.user.operatorId,
                name: 'Admin User',
                email: req.user.email,
                role: 'admin'
            }
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to get profile' });
    }
});

// Dashboard Stats
app.get('/api/admin/operators/dashboard/stats', authenticateToken, async (req, res) => {
    try {
        // Get total products count
        const totalProductsResult = await pool.query('SELECT COUNT(*) as count FROM products');
        const totalProducts = parseInt(totalProductsResult.rows[0].count);

        // Get products created today
        const productsCheckResult = await pool.query(
            `SELECT COUNT(*) as count FROM products WHERE DATE(created_at) = CURRENT_DATE`
        );
        const productsToday = parseInt(productsCheckResult.rows[0].count);

        // Get total data change logs
        const changesResult = await pool.query('SELECT COUNT(*) as count FROM data_change_logs');
        const totalChanges = parseInt(changesResult.rows[0].count);

        // Get changes made today
        const changesTodayResult = await pool.query(
            `SELECT COUNT(*) as count FROM data_change_logs WHERE DATE(created_at) = CURRENT_DATE`
        );
        const changestoday = parseInt(changesTodayResult.rows[0].count);

        // Get active drafts count
        const activeDraftsResult = await pool.query(
            `SELECT COUNT(*) as count FROM product_drafts WHERE is_active = TRUE`
        );
        const activeDrafts = parseInt(activeDraftsResult.rows[0].count);

        res.json({
            data: {
                total_products: totalProducts,
                products_today: productsToday,
                operator_changes: totalChanges,
                changes_today: changestoday,
                active_drafts: activeDrafts
            }
        });
    } catch (error) {
        console.error('Dashboard stats error:', error);
        res.status(500).json({ error: 'Failed to get stats', details: error.message });
    }
});

// ============ ADMIN PRODUCTS ROUTES ============

// Get All Products
app.get('/api/admin/products', authenticateToken, async (req, res) => {
    try {
        const { status = 'all', searchTerm = '', limit = 20, offset = 0 } = req.query;

        // Mock products data
        const products = [
            {
                productId: 1,
                name: 'Premium Credit Card',
                description: 'High-reward credit card',
                companyId: 1,
                companyName: 'Bank A',
                subcategoryId: 1,
                subcategoryName: 'Credit Cards',
                status: 'published',
                createdAt: new Date(),
                updatedAt: new Date()
            },
            {
                productId: 2,
                name: 'Personal Loan',
                description: 'Flexible personal loan',
                companyId: 2,
                companyName: 'Bank B',
                subcategoryId: 2,
                subcategoryName: 'Loans',
                status: 'draft',
                createdAt: new Date(),
                updatedAt: new Date()
            }
        ];

        const filtered = products.filter(p => {
            if (status !== 'all' && p.status !== status) return false;
            if (searchTerm && !p.name.toLowerCase().includes(searchTerm.toLowerCase())) return false;
            return true;
        });

        res.json({
            products: filtered.slice(offset, offset + parseInt(limit)),
            count: filtered.length,
            total: products.length
        });
    } catch (error) {
        console.error('Error fetching products:', error);
        res.status(500).json({ error: 'Failed to fetch products' });
    }
});

// Get Single Product
app.get('/api/admin/products/:productId', authenticateToken, async (req, res) => {
    try {
        const product = {
            productId: parseInt(req.params.productId),
            name: 'Sample Product',
            description: 'Product description',
            companyId: 1,
            subcategoryId: 1,
            status: 'published',
            attributes: [
                { attributeId: 1, name: 'interest_rate', value: '5.5', type: 'number' },
                { attributeId: 2, name: 'minimum_balance', value: '1000', type: 'number' }
            ]
        };

        res.json({ product });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch product' });
    }
});

// Create Product
app.post('/api/admin/products', authenticateToken, async (req, res) => {
    try {
        const { name, description, companyId, subcategoryId, attributes, saveAsDraft } = req.body;

        if (!name || !companyId) {
            return res.status(400).json({ error: 'Name and company are required' });
        }

        const newProduct = {
            productId: Math.floor(Math.random() * 10000),
            name,
            description,
            companyId,
            subcategoryId,
            status: saveAsDraft ? 'draft' : 'published',
            attributes: attributes || [],
            createdAt: new Date(),
            updatedAt: new Date()
        };

        res.status(201).json({
            message: 'Product created successfully',
            product: newProduct
        });
    } catch (error) {
        console.error('Create product error:', error);
        res.status(500).json({ error: 'Failed to create product' });
    }
});

// Update Product
app.put('/api/admin/products/:productId', authenticateToken, async (req, res) => {
    try {
        const { name, description, companyId, subcategoryId, attributes } = req.body;

        const updated = {
            productId: parseInt(req.params.productId),
            name,
            description,
            companyId,
            subcategoryId,
            attributes,
            updatedAt: new Date()
        };

        res.json({
            message: 'Product updated successfully',
            product: updated
        });
    } catch (error) {
        console.error('Update product error:', error);
        res.status(500).json({ error: 'Failed to update product' });
    }
});

// Delete Product
app.delete('/api/admin/products/:productId', authenticateToken, async (req, res) => {
    try {
        res.json({
            message: 'Product deleted successfully',
            productId: parseInt(req.params.productId)
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete product' });
    }
});

// Get Change Logs
app.get('/api/admin/products/:productId/logs', authenticateToken, async (req, res) => {
    try {
        res.json({
            logs: [
                {
                    logId: 1,
                    productId: req.params.productId,
                    action: 'CREATE',
                    operatorName: 'Admin User',
                    timestamp: new Date(),
                    oldData: null,
                    newData: { name: 'Product Name' }
                }
            ]
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch logs' });
    }
});

// ============ NOTIFICATIONS ROUTES ============

// Get Notifications
app.get('/api/notifications', authenticateToken, async (req, res) => {
    try {
        const notifications = [
            {
                id: 1,
                title: '🏦 New Credit Card Offer',
                message: 'Bank A has a new premium credit card with 5% cashback',
                type: 'offer',
                isRead: false,
                createdAt: new Date(Date.now() - 3600000)
            },
            {
                id: 2,
                title: '💰 Loan Interest Dropped',
                message: 'Personal loan rates have decreased at Bank B',
                type: 'alert',
                isRead: false,
                createdAt: new Date(Date.now() - 7200000)
            },
            {
                id: 3,
                title: '✅ Profile Verified',
                message: 'Your email has been successfully verified',
                type: 'success',
                isRead: true,
                createdAt: new Date(Date.now() - 86400000)
            },
            {
                id: 4,
                title: '⏰ App Maintenance',
                message: 'Scheduled maintenance on Sunday 2AM-4AM',
                type: 'info',
                isRead: true,
                createdAt: new Date(Date.now() - 172800000)
            }
        ];

        res.json({ notifications });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch notifications' });
    }
});

// Mark Notification as Read
app.put('/api/notifications/:id/read', authenticateToken, async (req, res) => {
    try {
        res.json({ message: 'Notification marked as read' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to mark notification' });
    }
});

app.listen(PORT, () => {
    console.log(`✅ TULONA API Server running on http://localhost:${PORT}`);
    console.log(`📚 Database: PostgreSQL`);
    console.log(`🔐 JWT Secret: ${JWT_SECRET.substring(0, 10)}...`);
});
