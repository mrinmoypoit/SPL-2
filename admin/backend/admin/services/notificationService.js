const { pool } = require('../../../../backend/config/database');

const PRODUCT_MATCH_NOTIFICATION_TYPE = 'product_match';

const EXPENSE_KEYWORDS = [
    'expense',
    'price',
    'fee',
    'cost',
    'charge',
    'emi',
    'installment',
    'payment',
    'monthly_fee',
    'annual_fee',
    'processing_fee',
    'minimum_balance'
];

const PROFESSION_KEYWORD_MAP = {
    student: ['student', 'campus', 'education', 'tuition', 'intern'],
    employee: ['employee', 'salaried', 'salary', 'job holder', 'professional'],
    business: ['business', 'entrepreneur', 'merchant', 'trade', 'startup'],
    freelancer: ['freelancer', 'self-employed', 'remote worker', 'independent contractor']
};

const normalizeText = (value = '') =>
    String(value)
        .toLowerCase()
        .replace(/[^a-z0-9\s]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

const normalizeKey = (value = '') =>
    String(value)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '');

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

const extractExpenseValue = (attributes = []) => {
    if (!Array.isArray(attributes)) {
        return null;
    }

    const values = [];

    for (const attribute of attributes) {
        const name = normalizeKey(attribute?.attribute_name || attribute?.name || '');
        const rawValue = attribute?.attribute_value ?? attribute?.value;

        if (!name || rawValue === null || rawValue === undefined || rawValue === '') {
            continue;
        }

        const isExpenseLike = EXPENSE_KEYWORDS.some((keyword) => name.includes(keyword));
        if (!isExpenseLike) {
            continue;
        }

        const numericValue = getNumericValueFromText(rawValue);
        if (numericValue !== null && numericValue >= 0) {
            values.push(numericValue);
        }
    }

    if (values.length === 0) {
        return null;
    }

    return Math.min(...values);
};

const getProfessionKeywords = (profession = '') => {
    const normalized = normalizeText(profession);
    if (!normalized) {
        return [];
    }

    const directTokens = normalized
        .split(' ')
        .map((token) => token.trim())
        .filter((token) => token.length >= 3);

    const mappedKeywords = PROFESSION_KEYWORD_MAP[normalized] || [];
    return [...new Set([...directTokens, ...mappedKeywords])];
};

const matchesProfession = ({ productText, profession }) => {
    const keywords = getProfessionKeywords(profession);
    if (keywords.length === 0) {
        return false;
    }

    return keywords.some((keyword) => productText.includes(keyword));
};

const fetchProductForMatching = async (productId) => {
    const result = await pool.query(
        `SELECT
            p.product_id,
            p.name,
            p.description,
            sc.name AS subcategory_name,
            cat.name AS category_name,
            COALESCE(
                json_agg(
                    json_build_object(
                        'attribute_name', pa.attribute_name,
                        'attribute_value', pa.attribute_value
                    )
                ) FILTER (WHERE pa.attribute_id IS NOT NULL),
                '[]'::json
            ) AS attributes
        FROM products p
        LEFT JOIN product_subcategories sc ON p.subcategory_id = sc.subcategory_id
        LEFT JOIN category cat ON sc.category_id = cat.category_id
        LEFT JOIN product_attributes pa ON p.product_id = pa.product_id
        WHERE p.product_id = $1
        GROUP BY p.product_id, sc.name, cat.name`,
        [productId]
    );

    return result.rows[0] || null;
};

const buildProductText = (product = {}) => {
    const attributeText = (product.attributes || [])
        .map((attribute) => `${attribute?.attribute_name || ''} ${attribute?.attribute_value || ''}`)
        .join(' ');

    return normalizeText(
        [
            product.name,
            product.description,
            product.subcategory_name,
            product.category_name,
            attributeText
        ]
            .filter(Boolean)
            .join(' ')
    );
};

const buildProductMatchMessage = ({ productName, expenseValue, monthlyIncome, professionMatched }) => {
    const reasons = [];

    if (expenseValue !== null && monthlyIncome !== null && monthlyIncome >= expenseValue) {
        reasons.push(`Estimated cost (${Math.round(expenseValue)}) fits your monthly income`);
    }

    if (professionMatched) {
        reasons.push('Product details align with your profession profile');
    }

    const reasonText = reasons.length > 0
        ? reasons.join(' and ')
        : 'This product matches your saved profile preferences';

    return `New product "${productName}" may be relevant for you. ${reasonText}.`;
};

const createProductMatchNotifications = async (productId) => {
    if (!productId) {
        return { createdCount: 0, checkedUsers: 0 };
    }

    const product = await fetchProductForMatching(productId);
    if (!product) {
        return { createdCount: 0, checkedUsers: 0 };
    }

    const productText = buildProductText(product);
    const expenseValue = extractExpenseValue(product.attributes || []);

    const [usersResult, existingResult] = await Promise.all([
        pool.query(
            `SELECT user_id, monthly_income, profession
             FROM users`
        ),
        pool.query(
            `SELECT user_id
             FROM notifications
             WHERE product_id = $1
               AND notification_type = $2`,
            [productId, PRODUCT_MATCH_NOTIFICATION_TYPE]
        )
    ]);

    const users = usersResult.rows;
    const alreadyNotifiedUserIds = new Set(existingResult.rows.map((row) => Number(row.user_id)));

    let createdCount = 0;

    for (const user of users) {
        const userId = Number(user.user_id);
        if (alreadyNotifiedUserIds.has(userId)) {
            continue;
        }

        const monthlyIncome = getNumericValueFromText(user.monthly_income);
        const incomeMatched = expenseValue !== null && monthlyIncome !== null && monthlyIncome >= expenseValue;
        const professionMatched = matchesProfession({
            productText,
            profession: user.profession || ''
        });

        if (!incomeMatched && !professionMatched) {
            continue;
        }

        const message = buildProductMatchMessage({
            productName: product.name,
            expenseValue,
            monthlyIncome,
            professionMatched
        });

        await pool.query(
            `INSERT INTO notifications (user_id, title, message, notification_type, product_id, is_read)
             VALUES ($1, $2, $3, $4, $5, false)`,
            [
                userId,
                `New matched product: ${product.name}`,
                message,
                PRODUCT_MATCH_NOTIFICATION_TYPE,
                productId
            ]
        );

        createdCount += 1;
    }

    return {
        createdCount,
        checkedUsers: users.length,
        productName: product.name
    };
};

module.exports = {
    createProductMatchNotifications
};
