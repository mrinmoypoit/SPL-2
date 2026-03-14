// Product Categories with Field Templates

export const productCategories = {
    // Savings Accounts
    savings_accounts: {
        name: 'Savings Accounts',
        icon: '🏦',
        description: 'Savings account products',
        fields: {
            account_type: { label: 'Account Type', type: 'text', required: true, placeholder: 'e.g., Regular Savings' },
            minimum_balance: { label: 'Minimum Balance (৳)', type: 'number', required: true, placeholder: '0' },
            interest_rate: { label: 'Interest Rate (%)', type: 'number', required: true, placeholder: '2.5' },
            withdrawal_limit: { label: 'Monthly Withdrawal Limit', type: 'text', required: false },
            features: { label: 'Features', type: 'textarea', required: false, placeholder: 'List account features...' },
            eligibility: { label: 'Eligibility', type: 'textarea', required: false, placeholder: 'Age, income requirements...' },
        }
    },

    // Checking Accounts
    checking_accounts: {
        name: 'Checking Accounts',
        icon: '💳',
        description: 'Checking/Current account products',
        fields: {
            account_type: { label: 'Account Type', type: 'text', required: true, placeholder: 'e.g., Business Checking' },
            monthly_fee: { label: 'Monthly Fee (৳)', type: 'number', required: false, placeholder: '0' },
            check_book_limit: { label: 'Check Book Limit (Monthly)', type: 'number', required: false },
            overdraft_facility: { label: 'Overdraft Facility Available', type: 'checkbox', required: false },
            features: { label: 'Features', type: 'textarea', required: false, placeholder: 'List account features...' },
            documentation: { label: 'Required Documentation', type: 'textarea', required: false },
        }
    },

    // Credit Cards
    credit_cards: {
        name: 'Credit Cards',
        icon: '💳',
        description: 'Credit card products',
        fields: {
            card_name: { label: 'Card Name', type: 'text', required: true, placeholder: 'e.g., Premium Rewards Card' },
            credit_limit_min: { label: 'Minimum Credit Limit (৳)', type: 'number', required: true },
            interest_rate: { label: 'Interest Rate (%) APR', type: 'number', required: true, placeholder: '18.5' },
            annual_fee: { label: 'Annual Fee (৳)', type: 'number', required: false, placeholder: '0' },
            cash_back_rate: { label: 'Cash Back Rate (%)', type: 'number', required: false },
            rewards: { label: 'Rewards Program', type: 'textarea', required: false, placeholder: 'Describe rewards...' },
            eligibility_age: { label: 'Minimum Age', type: 'number', required: true, placeholder: '18' },
        }
    },

    // Loans
    loans: {
        name: 'Loans',
        icon: '💰',
        description: 'Loan products',
        fields: {
            loan_type: { label: 'Loan Type', type: 'text', required: true, placeholder: 'e.g., Personal Loan' },
            min_amount: { label: 'Minimum Loan Amount (৳)', type: 'number', required: true },
            max_amount: { label: 'Maximum Loan Amount (৳)', type: 'number', required: true },
            interest_rate: { label: 'Interest Rate (%) APR', type: 'number', required: true },
            min_tenure: { label: 'Minimum Tenure (Months)', type: 'number', required: true },
            max_tenure: { label: 'Maximum Tenure (Months)', type: 'number', required: true },
            eligibility: { label: 'Eligibility Criteria', type: 'textarea', required: false },
            processing_fee: { label: 'Processing Fee ($ or %)', type: 'text', required: false },
        }
    },

    // Investment Products
    investment_products: {
        name: 'Investment Products',
        icon: '📈',
        description: 'Investment and mutual fund products',
        fields: {
            product_name: { label: 'Product Name', type: 'text', required: true },
            product_type: { label: 'Product Type', type: 'text', required: true, placeholder: 'e.g., Mutual Fund, Stock' },
            min_investment: { label: 'Minimum Investment (৳)', type: 'number', required: true },
            expected_return: { label: 'Expected Annual Return (%)', type: 'number', required: false },
            risk_level: { label: 'Risk Level', type: 'text', required: true, placeholder: 'Low/Medium/High' },
            investment_horizon: { label: 'Recommended Investment Horizon', type: 'text', required: false, placeholder: 'e.g., 5-10 years' },
            description: { label: 'Product Description', type: 'textarea', required: false },
            prospectus: { label: 'Prospectus Link', type: 'text', required: false },
        }
    },

    // Mortgages
    mortgages: {
        name: 'Mortgages',
        icon: '🏠',
        description: 'Mortgage/Home loan products',
        fields: {
            mortgage_type: { label: 'Mortgage Type', type: 'text', required: true, placeholder: 'e.g., Fixed-Rate Mortgage' },
            min_amount: { label: 'Minimum Loan Amount (৳)', type: 'number', required: true },
            max_amount: { label: 'Maximum Loan Amount (৳)', type: 'number', required: true },
            interest_rate: { label: 'Interest Rate (%) APR', type: 'number', required: true },
            loan_term_min: { label: 'Minimum Loan Term (Years)', type: 'number', required: true },
            loan_term_max: { label: 'Maximum Loan Term (Years)', type: 'number', required: true },
            down_payment_percent: { label: 'Minimum Down Payment (%)', type: 'number', required: true },
            processing_fee: { label: 'Processing Fee ($ or %)', type: 'text', required: false },
            requirements: { label: 'Special Requirements', type: 'textarea', required: false },
        }
    },
};

// Get category by key
export const getCategoryByKey = (key) => {
    return productCategories[key];
};

// Get all category names
export const getAllCategoryNames = () => {
    return Object.values(productCategories).map(cat => cat.name);
};

// Get all category keys
export const getAllCategoryKeys = () => {
    return Object.keys(productCategories);
};

// Get category fields
export const getCategoryFields = (categoryKey) => {
    const category = productCategories[categoryKey];
    return category ? category.fields : {};
};

// Validate product data against category
export const validateProductData = (categoryKey, data) => {
    const fields = getCategoryFields(categoryKey);
    const errors = [];

    Object.entries(fields).forEach(([fieldKey, fieldConfig]) => {
        if (fieldConfig.required && (!data[fieldKey] || data[fieldKey].toString().trim() === '')) {
            errors.push(`${fieldConfig.label} is required`);
        }
    });

    return {
        isValid: errors.length === 0,
        errors,
    };
};

export default {
    productCategories,
    getCategoryByKey,
    getAllCategoryNames,
    getAllCategoryKeys,
    getCategoryFields,
    validateProductData,
};
