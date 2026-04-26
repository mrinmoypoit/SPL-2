require('dotenv').config();
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcryptjs = require('bcryptjs');
const { pool } = require('./config/database');
const { sendOTPEmail, sendWelcomeEmail, sendPasswordResetConfirmation } = require('./services/emailService');
const { generateGroundedAiAnswer } = require('./services/aiAnswerService');

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

            console.log('Admin user logged in:', identifier);

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

        console.log('User logged in:', identifier);

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

            console.log('User authenticated with Google:', user.email);

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
            console.warn('OTP email failed:', emailResult.error);
            return res.status(500).json({ 
                error: 'Failed to send OTP email',
                details: emailResult.error 
            });
        }

        console.log(`OTP sent to ${email}: ${otpCode}`);
        
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
        console.log('Profile updated:', req.user.email);

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

        console.log('Password changed:', req.user.email);

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
const normalizeAttributeKey = (value = '') =>
    String(value)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '');

const extractProductFeatures = (attributes = []) => {
    if (!Array.isArray(attributes)) {
        return [];
    }

    const explicitFeatureMap = new Map();
    const fallbackFeatures = [];

    for (const attribute of attributes) {
        const name = attribute?.attribute_name || attribute?.name;
        const value = attribute?.attribute_value ?? attribute?.value;

        if (!name || value === null || value === undefined || value === '') {
            continue;
        }

        const normalizedName = normalizeAttributeKey(name);
        const stringValue = String(value).trim();

        if (!stringValue) {
            continue;
        }

        const explicitMatch = normalizedName.match(/^feature_?(\d+)$/);
        if (explicitMatch) {
            explicitFeatureMap.set(Number.parseInt(explicitMatch[1], 10), stringValue);
            continue;
        }

        if (normalizedName === 'features') {
            stringValue
                .split(/[,;\n]+/)
                .map((item) => item.trim())
                .filter(Boolean)
                .forEach((item) => fallbackFeatures.push(item));
            continue;
        }

        fallbackFeatures.push(`${name}: ${stringValue}`);
    }

    const orderedExplicit = [...explicitFeatureMap.entries()]
        .sort((first, second) => first[0] - second[0])
        .map((entry) => entry[1]);

    const uniqueFallback = [...new Set(fallbackFeatures)];

    return [...orderedExplicit, ...uniqueFallback].slice(0, 3);
};

const queryProducts = async ({ category = 'all', search = '', limit = 20, offset = 0 }) => {
    let queryStr = `
        SELECT 
            p.product_id as id, 
            p.name, 
            p.description,
            c.name as company, 
            sc.name as category,
            cat.name as parent_category,
            c.metrics,
            COALESCE(
                json_agg(
                    json_build_object(
                        'attribute_name', pa.attribute_name,
                        'attribute_value', pa.attribute_value,
                        'attribute_type', pa.attribute_type
                    )
                ) FILTER (WHERE pa.attribute_id IS NOT NULL),
                '[]'::json
            ) as attributes
        FROM products p
        LEFT JOIN companies c ON p.company_id = c.company_id
        LEFT JOIN product_subcategories sc ON p.subcategory_id = sc.subcategory_id
        LEFT JOIN category cat ON sc.category_id = cat.category_id
        LEFT JOIN product_attributes pa ON p.product_id = pa.product_id
        WHERE 1=1
    `;
    let countQueryStr = `
        SELECT COUNT(*) 
        FROM products p
        LEFT JOIN companies c ON p.company_id = c.company_id
        LEFT JOIN product_subcategories sc ON p.subcategory_id = sc.subcategory_id
        LEFT JOIN category cat ON sc.category_id = cat.category_id
        WHERE 1=1
    `;
    const queryParams = [];

    if (category !== 'all') {
        queryParams.push(category);
        queryStr += ` AND (sc.name ILIKE $${queryParams.length} OR cat.name ILIKE $${queryParams.length})`;
        countQueryStr += ` AND (sc.name ILIKE $${queryParams.length} OR cat.name ILIKE $${queryParams.length})`;
    }

    if (search) {
        queryParams.push(`%${search}%`);
        queryStr += ` AND p.name ILIKE $${queryParams.length}`;
        countQueryStr += ` AND p.name ILIKE $${queryParams.length}`;
    }

    queryStr += ` GROUP BY p.product_id, c.name, c.metrics, sc.name, cat.name`;
    queryStr += ` ORDER BY p.product_id DESC LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}`;

    const parsedLimit = Number.parseInt(limit, 10);
    const parsedOffset = Number.parseInt(offset, 10);
    const limitParams = [...queryParams, Number.isFinite(parsedLimit) ? parsedLimit : 20, Number.isFinite(parsedOffset) ? parsedOffset : 0];

    const countResult = await pool.query(countQueryStr, queryParams);
    const total = parseInt(countResult.rows[0].count);

    const result = await pool.query(queryStr, limitParams);

    const products = result.rows.map((row) => {
        const features = extractProductFeatures(row.attributes);
        let rating;

        try {
            const metricsObject = typeof row.metrics === 'string' ? JSON.parse(row.metrics) : row.metrics;
            if (metricsObject && metricsObject.rating !== undefined && metricsObject.rating !== null) {
                rating = metricsObject.rating;
            }
        } catch {
            rating = undefined;
        }

        return {
            ...row,
            rating,
            features,
            attributes: row.attributes || []
        };
    });

    return {
        products,
        count: products.length,
        total
    };
};

const getProductsHandler = async (req, res) => {
    try {
        const { category = 'all', search = '', limit = 20, offset = 0 } = req.query;
        const payload = await queryProducts({ category, search, limit, offset });
        res.json(payload);
    } catch (error) {
        console.error('Error fetching products:', error);
        res.status(500).json({ error: 'Failed to fetch products' });
    }
};

// Canonical API path
app.get('/api/products', getProductsHandler);

// Compatibility alias (so `fetch('http://host:PORT/products')` can work)
app.get('/products', getProductsHandler);

const recommendationsHandler = async (req, res) => {
    try {
        const source = req.method === 'GET' ? (req.query || {}) : (req.body || {});
        const { preferences = {}, category, search, limit = 10, offset = 0 } = source;

        const resolvedCategory = category || preferences.category || 'all';
        const resolvedSearch = search || preferences.search || '';

        const payload = await queryProducts({
            category: resolvedCategory,
            search: resolvedSearch,
            limit,
            offset
        });

        return res.json({
            recommendations: payload.products,
            count: payload.count,
            total: payload.total,
            used: {
                category: resolvedCategory,
                search: resolvedSearch,
                limit,
                offset
            }
        });
    } catch (error) {
        console.error('Error generating recommendations:', error);
        res.status(500).json({ error: 'Failed to generate recommendations' });
    }
};

app.post('/api/recommendations', recommendationsHandler);
app.get('/api/recommendations', recommendationsHandler);
app.post('/recommendations', recommendationsHandler);
app.get('/recommendations', recommendationsHandler);

const AI_STOP_WORDS = new Set([
    'a', 'an', 'and', 'are', 'as', 'at', 'be', 'best', 'by', 'can', 'for', 'from', 'get', 'give', 'help', 'i', 'in',
    'is', 'it', 'me', 'my', 'of', 'on', 'or', 'please', 'recommend', 'show', 'suggest', 'that', 'the', 'to', 'want', 'with'
]);

const CATEGORY_KEYWORDS = {
    loans: ['loan', 'loans', 'emi', 'home loan', 'personal loan', 'car loan'],
    'credit cards': ['credit card', 'credit cards', 'card', 'visa', 'mastercard'],
    deposits: ['deposit', 'fd', 'fdr', 'fixed deposit', 'savings', 'dps'],
    'bank accounts': ['account', 'bank account', 'current account', 'student account'],
    telecom: ['mobile', 'sim', 'internet', 'telecom', 'data plan']
};

const CATEGORY_DB_FILTER_KEYWORDS = {
    loans: ['loan', 'loans'],
    'credit cards': ['credit card', 'credit cards', 'card'],
    deposits: ['deposit', 'deposits', 'fixed deposit', 'savings', 'dps', 'fd', 'fdr'],
    'bank accounts': ['account', 'accounts', 'current account', 'savings account'],
    telecom: ['telecom', 'mobile', 'internet', 'data', 'sim']
};

const normalizeQuestion = (value = '') => String(value).trim().toLowerCase();

const tokenizeQuestion = (question = '') => {
    return normalizeQuestion(question)
        .replace(/[^a-z0-9\s]/g, ' ')
        .split(/\s+/)
        .filter((token) => token.length >= 2 && !AI_STOP_WORDS.has(token));
};

const detectCategoryFromQuestion = (question = '') => {
    const normalized = normalizeQuestion(question);

    for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
        if (keywords.some((keyword) => normalized.includes(keyword))) {
            return category;
        }
    }

    return null;
};

const extractBudgetConstraint = (question = '') => {
    const normalized = normalizeQuestion(question).replace(/,/g, '');
    const underMatch = normalized.match(/(?:under|below|less than|max|maximum|within)\s*(?:tk|bdt|৳|\$)?\s*(\d+(?:\.\d+)?)/i);
    if (underMatch) {
        return { max: Number.parseFloat(underMatch[1]), type: 'max' };
    }

    const overMatch = normalized.match(/(?:above|over|more than|min|minimum)\s*(?:tk|bdt|৳|\$)?\s*(\d+(?:\.\d+)?)/i);
    if (overMatch) {
        return { min: Number.parseFloat(overMatch[1]), type: 'min' };
    }

    const rangeMatch = normalized.match(/(?:between)\s*(\d+(?:\.\d+)?)\s*(?:and|-)\s*(\d+(?:\.\d+)?)/i);
    if (rangeMatch) {
        const firstValue = Number.parseFloat(rangeMatch[1]);
        const secondValue = Number.parseFloat(rangeMatch[2]);
        return {
            min: Math.min(firstValue, secondValue),
            max: Math.max(firstValue, secondValue),
            type: 'range'
        };
    }

    return null;
};

const getNumericValueFromText = (value = '') => {
    if (typeof value === 'number' && Number.isFinite(value)) {
        return value;
    }

    const match = String(value).replace(/,/g, '').match(/-?\d+(?:\.\d+)?/);
    if (!match) {
        return null;
    }

    const parsed = Number.parseFloat(match[0]);
    return Number.isFinite(parsed) ? parsed : null;
};

const parseCompanyMetrics = (value = null) => {
    if (!value) {
        return {};
    }

    if (typeof value === 'object' && !Array.isArray(value)) {
        return value;
    }

    try {
        const parsed = JSON.parse(String(value));
        return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
    } catch {
        return {};
    }
};

const PRICE_LIKE_ATTRIBUTE_NAMES = [
    'price', 'fee', 'cost', 'charge', 'monthly', 'annual', 'interest', 'installment', 'emi', 'minimum_balance'
];

const extractBudgetRelevantValues = (attributes = []) => {
    if (!Array.isArray(attributes)) {
        return [];
    }

    const values = [];

    for (const attribute of attributes) {
        const name = normalizeAttributeKey(attribute?.attribute_name || '');
        const value = attribute?.attribute_value;

        if (!name || value === null || value === undefined || value === '') {
            continue;
        }

        const isBudgetLike = PRICE_LIKE_ATTRIBUTE_NAMES.some((keyword) => name.includes(keyword));
        if (!isBudgetLike) {
            continue;
        }

        const numericValue = getNumericValueFromText(value);
        if (numericValue !== null) {
            values.push(numericValue);
        }
    }

    return values;
};

const buildProductSearchText = (product = {}) => {
    const attributeText = (product.attributes || [])
        .map((attribute) => `${attribute?.attribute_name || ''} ${attribute?.attribute_value || ''}`)
        .join(' ');

    return [
        product.name,
        product.description,
        product.company,
        product.category,
        product.parent_category,
        attributeText
    ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
};

const scoreProductForQuestion = ({ product, questionTokens, preferredCategory, budgetConstraint }) => {
    let score = 0;
    const reasons = [];
    let categoryMatched = false;
    let budgetMatched = false;
    let matchedTokenCount = 0;

    const searchableText = buildProductSearchText(product);

    if (preferredCategory) {
        const categoryText = `${product.category || ''} ${product.parent_category || ''}`.toLowerCase();
        if (categoryText.includes(preferredCategory.toLowerCase())) {
            score += 5;
            categoryMatched = true;
            reasons.push(`matches ${preferredCategory} category`);
        } else {
            score -= 4;
        }
    }

    for (const token of questionTokens) {
        if (searchableText.includes(token)) {
            score += token.length >= 5 ? 2 : 1;
            matchedTokenCount += 1;
        }
    }

    const budgetValues = extractBudgetRelevantValues(product.attributes || []);
    if (budgetConstraint && budgetValues.length > 0) {
        const minValue = Math.min(...budgetValues);

        if (budgetConstraint.type === 'max' && minValue <= budgetConstraint.max) {
            score += 4;
            budgetMatched = true;
            reasons.push(`fits budget (≈ ${minValue})`);
        } else if (budgetConstraint.type === 'min' && minValue >= budgetConstraint.min) {
            score += 4;
            budgetMatched = true;
            reasons.push(`meets minimum budget level (≈ ${minValue})`);
        } else if (
            budgetConstraint.type === 'range' &&
            minValue >= budgetConstraint.min &&
            minValue <= budgetConstraint.max
        ) {
            score += 4;
            budgetMatched = true;
            reasons.push(`in your budget range (≈ ${minValue})`);
        } else {
            score -= 1;
        }
    }

    const featureBonus = (product.features || []).length;
    const hasQuestionIntent = Boolean(preferredCategory) || Boolean(budgetConstraint) || questionTokens.length > 0;
    const hasRelevanceSignal = categoryMatched || budgetMatched || matchedTokenCount > 0;
    if (featureBonus > 0 && (!hasQuestionIntent || hasRelevanceSignal)) {
        score += Math.min(featureBonus, 2);
    }

    if (questionTokens.length > 0 && matchedTokenCount === 0) {
        score -= 1;
    }

    const ratingValue = getNumericValueFromText(product.rating);
    if (ratingValue !== null) {
        score += Math.max(0, Math.min(ratingValue, 5) - 3) * 0.8;
        if (ratingValue >= 4.2) {
            reasons.push(`strong rating (${ratingValue})`);
        }
    }

    return {
        ...product,
        score,
        reasons,
        relevanceSignals: {
            categoryMatched,
            budgetMatched,
            matchedTokenCount
        }
    };
};

const formatProductLine = (product = {}, index = 0) => {
    const featureText = (product.features || []).slice(0, 2).join(', ');
    const reasonText = (product.reasons || []).slice(0, 2).join('; ');
    const ratingValue = getNumericValueFromText(product.rating);
    const details = [
        product.company ? `Company: ${product.company}` : null,
        product.category ? `Category: ${product.category}` : null,
        ratingValue !== null ? `Rating: ${ratingValue}` : null,
        featureText ? `Key features: ${featureText}` : null,
        reasonText ? `Why: ${reasonText}` : null
    ].filter(Boolean);

    return `${index + 1}. ${product.name}\n   ${details.join(' | ')}`;
};

const buildAiRecommendationText = ({ question, rankedProducts, preferredCategory, budgetConstraint }) => {
    if (!rankedProducts.length) {
        return `I could not find a strong match for "${question}" from the current database. Try asking with a category (loan, credit card, deposit) and a budget (for example: "best credit card under 3000").`;
    }

    const introParts = ['I checked your question against the current product database'];
    if (preferredCategory) {
        introParts.push(`focused on ${preferredCategory}`);
    }
    if (budgetConstraint?.max) {
        introParts.push(`with budget up to ${budgetConstraint.max}`);
    }
    if (budgetConstraint?.min && !budgetConstraint?.max) {
        introParts.push(`with budget from ${budgetConstraint.min}`);
    }

    const lines = rankedProducts.slice(0, 3).map((product, index) => formatProductLine(product, index));

    return `${introParts.join(' ')}. Here are the top matches:\n\n${lines.join('\n\n')}\n\nIf you share your monthly income and exact needs, I can narrow this down further.`;
};

const getAiResponsePayload = async ({ question, limit = 60 }) => {
    if (!question || !String(question).trim()) {
        const validationError = new Error('Question is required');
        validationError.statusCode = 400;
        throw validationError;
    }

    const safeLimit = Math.max(10, Math.min(Number.parseInt(limit, 10) || 60, 200));
    const preferredCategory = detectCategoryFromQuestion(question);
    const budgetConstraint = extractBudgetConstraint(question);
    const questionTokens = tokenizeQuestion(question);

    let productQuery = `
        SELECT
            p.product_id as id,
            p.name,
            p.description,
            c.name as company,
            sc.name as category,
            cat.name as parent_category,
            c.metrics,
            COALESCE(
                json_agg(
                    json_build_object(
                        'attribute_name', pa.attribute_name,
                        'attribute_value', pa.attribute_value,
                        'attribute_type', pa.attribute_type
                    )
                ) FILTER (WHERE pa.attribute_id IS NOT NULL),
                '[]'::json
            ) as attributes
        FROM products p
        LEFT JOIN companies c ON p.company_id = c.company_id
        LEFT JOIN product_subcategories sc ON p.subcategory_id = sc.subcategory_id
        LEFT JOIN category cat ON sc.category_id = cat.category_id
        LEFT JOIN product_attributes pa ON p.product_id = pa.product_id
        WHERE 1=1
    `;
    const params = [];

    if (preferredCategory) {
        const dbKeywords = CATEGORY_DB_FILTER_KEYWORDS[preferredCategory] || [preferredCategory];
        const keywordConditions = [];

        for (const keyword of dbKeywords) {
            params.push(`%${keyword.toLowerCase()}%`);
            const placeholder = `$${params.length}`;
            keywordConditions.push(`LOWER(sc.name) LIKE ${placeholder}`);
            keywordConditions.push(`LOWER(cat.name) LIKE ${placeholder}`);
        }

        if (keywordConditions.length > 0) {
            productQuery += ` AND (${keywordConditions.join(' OR ')})`;
        }
    }

    productQuery += ` GROUP BY p.product_id, c.name, c.metrics, sc.name, cat.name ORDER BY p.product_id DESC LIMIT $${params.length + 1}`;
    params.push(safeLimit);

    const result = await pool.query(productQuery, params);

    const scored = result.rows
        .map((product) => {
            const features = extractProductFeatures(product.attributes || []);
            const metricsObject = parseCompanyMetrics(product.metrics);
            const rating = getNumericValueFromText(metricsObject?.rating);
            return scoreProductForQuestion({
                product: {
                    ...product,
                    rating,
                    features,
                    attributes: product.attributes || []
                },
                questionTokens,
                preferredCategory,
                budgetConstraint
            });
        })
        .sort((first, second) => second.score - first.score);

    const hasIntentSignals = Boolean(preferredCategory) || Boolean(budgetConstraint) || questionTokens.length > 0;
    const relevanceFirstProducts = hasIntentSignals
        ? scored.filter((product) => {
            const signals = product.relevanceSignals || {};
            return Boolean(signals.categoryMatched) || Boolean(signals.budgetMatched) || Number(signals.matchedTokenCount || 0) > 0;
        })
        : scored;

    const rankedProducts = (relevanceFirstProducts.length > 0 ? relevanceFirstProducts : scored)
        .filter((product) => product.score > 0)
        .slice(0, 5);
    const fallbackAnswer = buildAiRecommendationText({
        question,
        rankedProducts,
        preferredCategory,
        budgetConstraint
    });

    const aiResult = await generateGroundedAiAnswer({
        question,
        rankedProducts,
        metadata: {
            preferredCategory,
            budgetConstraint
        },
        fallbackAnswer
    });

    if (aiResult.source !== 'llm' && aiResult.error) {
        console.warn('AI response used heuristic fallback:', aiResult.error);
    }

    return {
        answer: aiResult.answer,
        recommendations: rankedProducts,
        metadata: {
            preferredCategory,
            budgetConstraint,
            evaluatedProducts: result.rows.length,
            source: aiResult.source,
            providerUsed: aiResult.providerUsed,
            modelUsed: aiResult.modelUsed,
            llmError: aiResult.error || null
        }
    };
};

const aiAskHandler = async (req, res) => {
    try {
        const { question, limit = 60 } = req.body || {};
        const payload = await getAiResponsePayload({ question, limit });
        return res.json(payload);
    } catch (error) {
        if (error.statusCode) {
            return res.status(error.statusCode).json({ error: error.message });
        }

        console.error('AI assistant error:', error);
        return res.status(500).json({ error: 'Failed to generate AI response' });
    }
};

const writeSseEvent = (res, eventName, payload) => {
    res.write(`event: ${eventName}\n`);
    res.write(`data: ${JSON.stringify(payload)}\n\n`);
};

const streamAnswerChunks = ({ res, text, onDone, onAbort }) => {
    const tokens = String(text || '').split(/(\s+)/).filter(Boolean);

    if (!tokens.length) {
        onDone();
        return { stop: () => {} };
    }

    let index = 0;
    let stopped = false;

    const intervalId = setInterval(() => {
        if (stopped) {
            return;
        }

        const token = tokens[index] || '';
        writeSseEvent(res, 'chunk', { text: token });
        index += 1;

        if (index >= tokens.length) {
            clearInterval(intervalId);
            onDone();
        }
    }, 22);

    const stop = () => {
        if (stopped) {
            return;
        }

        stopped = true;
        clearInterval(intervalId);
        if (typeof onAbort === 'function') {
            onAbort();
        }
    };

    return { stop };
};

const aiAskStreamHandler = async (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    try {
        const { question, limit = 60 } = req.body || {};
        const payload = await getAiResponsePayload({ question, limit });

        writeSseEvent(res, 'meta', {
            metadata: payload.metadata,
            recommendations: payload.recommendations
        });

        const streamController = streamAnswerChunks({
            res,
            text: payload.answer,
            onDone: () => {
                writeSseEvent(res, 'done', payload);
                res.end();
            }
        });

        req.on('close', () => {
            streamController.stop();
        });
    } catch (error) {
        const statusCode = error.statusCode || 500;

        writeSseEvent(res, 'error', {
            error: error.message || 'Failed to stream AI response',
            statusCode
        });

        res.end();
    }
};

app.post('/api/ai/ask', aiAskHandler);
app.post('/ai/ask', aiAskHandler);
app.post('/api/ai/ask/stream', aiAskStreamHandler);
app.post('/ai/ask/stream', aiAskStreamHandler);

// Get Single Product
app.get('/api/products/:id', async (req, res) => {
    try {
        const productId = Number.parseInt(req.params.id, 10);
        const query = `
            SELECT
                p.product_id as id,
                p.name,
                p.description,
                c.name as company,
                sc.name as category,
                cat.name as parent_category,
                c.metrics,
                COALESCE(
                    json_agg(
                        json_build_object(
                            'attribute_name', pa.attribute_name,
                            'attribute_value', pa.attribute_value,
                            'attribute_type', pa.attribute_type
                        )
                    ) FILTER (WHERE pa.attribute_id IS NOT NULL),
                    '[]'::json
                ) as attributes
            FROM products p
            LEFT JOIN companies c ON p.company_id = c.company_id
            LEFT JOIN product_subcategories sc ON p.subcategory_id = sc.subcategory_id
            LEFT JOIN category cat ON sc.category_id = cat.category_id
            LEFT JOIN product_attributes pa ON p.product_id = pa.product_id
            WHERE p.product_id = $1
            GROUP BY p.product_id, c.name, c.metrics, sc.name, cat.name
        `;

        const result = await pool.query(query, [productId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Product not found' });
        }

        const row = result.rows[0];
        const features = extractProductFeatures(row.attributes);
        let rating;

        try {
            const metricsObject = typeof row.metrics === 'string' ? JSON.parse(row.metrics) : row.metrics;
            if (metricsObject && metricsObject.rating !== undefined && metricsObject.rating !== null) {
                rating = metricsObject.rating;
            }
        } catch {
            rating = undefined;
        }

        const details = (row.attributes || []).reduce((accumulator, attr) => {
            const name = attr?.attribute_name;
            const value = attr?.attribute_value;

            if (!name || value === null || value === undefined || value === '') {
                return accumulator;
            }

            accumulator[name] = value;
            return accumulator;
        }, {});

        res.json({
            product: {
                ...row,
                rating,
                features,
                details,
                attributes: row.attributes || []
            }
        });
    } catch (error) {
        console.error('Error fetching product:', error);
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
            `SELECT COUNT(*) as count FROM data_change_logs WHERE DATE(timestamp) = CURRENT_DATE`
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

// 🔍 DATABASE VERIFICATION ENDPOINT - Check if data is stored
app.get('/api/verify-database', authenticateToken, async (req, res) => {
    try {
        console.log('\n📊 DATABASE VERIFICATION REQUEST...\n');

        const results = {
            timestamp: new Date().toISOString(),
            checks: {}
        };

        // 1. Check Products Table
        const productsResult = await pool.query(`
            SELECT 
                COUNT(*) as total,
                MAX(created_at) as latest_created,
                MAX(updated_at) as latest_updated
            FROM products
        `);
        results.checks.products_table = {
            total_count: parseInt(productsResult.rows[0].total),
            latest_created: productsResult.rows[0].latest_created,
            latest_updated: productsResult.rows[0].latest_updated,
            status: parseInt(productsResult.rows[0].total) > 0 ? '✅ Data Found' : '❌ Empty'
        };

        // 2. Get Sample Products
        const sampleProducts = await pool.query(`
            SELECT 
                p.product_id,
                p.name,
                p.description,
                c.name as company_name,
                sc.name as subcategory_name,
                p.created_at,
                p.updated_at
            FROM products p
            LEFT JOIN companies c ON p.company_id = c.company_id
            LEFT JOIN product_subcategories sc ON p.subcategory_id = sc.subcategory_id
            ORDER BY p.created_at DESC
            LIMIT 5
        `);
        results.checks.sample_products = sampleProducts.rows.map(row => ({
            productId: row.product_id,
            name: row.name,
            description: row.description,
            company: row.company_name,
            category: row.subcategory_name,
            createdAt: row.created_at,
            updatedAt: row.updated_at
        }));

        // 3. Check Product Attributes
        const attributesResult = await pool.query(`
            SELECT 
                COUNT(*) as total,
                COUNT(DISTINCT product_id) as products_with_attributes
            FROM product_attributes
        `);
        results.checks.attributes_table = {
            total_count: parseInt(attributesResult.rows[0].total),
            products_with_attributes: parseInt(attributesResult.rows[0].products_with_attributes),
            status: parseInt(attributesResult.rows[0].total) > 0 ? '✅ Data Found' : '⚠️ Empty'
        };

        // 4. Get Sample Attributes
        const sampleAttrs = await pool.query(`
            SELECT 
                pa.attribute_id,
                pa.product_id,
                p.name as product_name,
                pa.attribute_name,
                pa.attribute_value,
                pa.attribute_type
            FROM product_attributes pa
            LEFT JOIN products p ON pa.product_id = p.product_id
            LIMIT 10
        `);
        results.checks.sample_attributes = sampleAttrs.rows.map(row => ({
            attributeId: row.attribute_id,
            productId: row.product_id,
            productName: row.product_name,
            name: row.attribute_name,
            value: row.attribute_value,
            type: row.attribute_type
        }));

        // 5. Check Product Drafts
        const draftsResult = await pool.query(`
            SELECT 
                COUNT(*) as total,
                COUNT(CASE WHEN is_active = true THEN 1 END) as active_drafts
            FROM product_drafts
        `);
        results.checks.drafts_table = {
            total_count: parseInt(draftsResult.rows[0].total),
            active_count: parseInt(draftsResult.rows[0].active_drafts),
            status: parseInt(draftsResult.rows[0].total) > 0 ? '✅ Data Found' : '⚠️ Empty'
        };

        // 6. Get Sample Drafts
        const sampleDrafts = await pool.query(`
            SELECT 
                pd.draft_id,
                pd.product_id,
                p.name as product_name,
                pd.operator_id,
                pd.is_active,
                pd.created_at,
                pd.updated_at
            FROM product_drafts pd
            LEFT JOIN products p ON pd.product_id = p.product_id
            LIMIT 5
        `);
        results.checks.sample_drafts = sampleDrafts.rows.map(row => ({
            draftId: row.draft_id,
            productId: row.product_id,
            productName: row.product_name,
            operatorId: row.operator_id,
            isActive: row.is_active,
            createdAt: row.created_at,
            updatedAt: row.updated_at
        }));

        // 7. Check Data Change Logs
        const logsResult = await pool.query(`
            SELECT 
                COUNT(*) as total,
                COUNT(DISTINCT product_id) as products_changed,
                COUNT(DISTINCT operator_id) as operators
            FROM data_change_logs
        `);
        results.checks.logs_table = {
            total_count: parseInt(logsResult.rows[0].total),
            products_changed: parseInt(logsResult.rows[0].products_changed),
            operators: parseInt(logsResult.rows[0].operators),
            status: parseInt(logsResult.rows[0].total) > 0 ? '✅ Data Found' : '⚠️ Empty'
        };

        // 8. Get Sample Logs
        const sampleLogs = await pool.query(`
            SELECT 
                dcl.log_id,
                dcl.operator_id,
                dcl.product_id,
                dcl.action,
                dcl.timestamp
            FROM data_change_logs dcl
            ORDER BY dcl.timestamp DESC
            LIMIT 10
        `);
        results.checks.sample_logs = sampleLogs.rows.map(row => ({
            logId: row.log_id,
            operatorId: row.operator_id,
            productId: row.product_id,
            action: row.action,
            timestamp: row.timestamp
        }));

        // 9. Overall Summary
        results.summary = {
            total_products: parseInt(productsResult.rows[0].total),
            total_attributes: parseInt(attributesResult.rows[0].total),
            total_drafts: parseInt(draftsResult.rows[0].total),
            active_drafts: parseInt(draftsResult.rows[0].active_drafts),
            total_changes: parseInt(logsResult.rows[0].total),
            database_status: parseInt(productsResult.rows[0].total) > 0 ? '✅ Database is populated' : '⚠️ Database is empty'
        };

        console.log('✅ DATABASE VERIFICATION COMPLETE');
        console.log(JSON.stringify(results.summary, null, 2));

        res.json(results);
    } catch (error) {
        console.error('❌ Database verification error:', error);
        res.status(500).json({ 
            error: 'Failed to verify database',
            details: error.message 
        });
    }
});

// Get All Products
app.get('/api/admin/products', authenticateToken, async (req, res) => {
    try {
        const { status = 'all', searchTerm = '', limit = 20, offset = 0 } = req.query;

        // DB query for admin products
        let queryStr = `
            SELECT 
                p.product_id as "productId", 
                p.name, 
                p.description,
                c.company_id as "companyId", 
                c.name as "companyName",
                sc.subcategory_id as "subcategoryId", 
                sc.name as "subcategoryName",
                'published' as status,
                p.created_at as "createdAt", 
                p.updated_at as "updatedAt"
            FROM products p
            LEFT JOIN companies c ON p.company_id = c.company_id
            LEFT JOIN product_subcategories sc ON p.subcategory_id = sc.subcategory_id
            WHERE 1=1
        `;
        let countQueryStr = `
            SELECT COUNT(*) 
            FROM products p
            LEFT JOIN companies c ON p.company_id = c.company_id
            LEFT JOIN product_subcategories sc ON p.subcategory_id = sc.subcategory_id
            WHERE 1=1
        `;
        const queryParams = [];

        if (searchTerm) {
            queryParams.push(`%${searchTerm}%`);
            queryStr += ` AND p.name ILIKE $${queryParams.length}`;
            countQueryStr += ` AND p.name ILIKE $${queryParams.length}`;
        }
        
        queryStr += ` ORDER BY p.product_id DESC LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}`;

        const limitParams = [...queryParams, parseInt(limit), parseInt(offset)];
        const countResult = await pool.query(countQueryStr, queryParams);
        const total = parseInt(countResult.rows[0].count);

        const result = await pool.query(queryStr, limitParams);

        res.json({
            products: result.rows,
            count: result.rows.length,
            total: total
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
                title: 'New Credit Card Offer',
                message: 'Bank A has a new premium credit card with 5% cashback',
                type: 'offer',
                isRead: false,
                createdAt: new Date(Date.now() - 3600000)
            },
            {
                id: 2,
                title: 'Loan Interest Dropped',
                message: 'Personal loan rates have decreased at Bank B',
                type: 'alert',
                isRead: false,
                createdAt: new Date(Date.now() - 7200000)
            },
            {
                id: 3,
                title: 'Profile Verified',
                message: 'Your email has been successfully verified',
                type: 'success',
                isRead: true,
                createdAt: new Date(Date.now() - 86400000)
            },
            {
                id: 4,
                title: 'App Maintenance',
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
    console.log(`TULONA API Server running on http://localhost:${PORT}`);
    console.log(`Database: PostgreSQL`);
    console.log(`JWT Secret: ${JWT_SECRET.substring(0, 10)}...`);
});
