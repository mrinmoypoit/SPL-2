// Product Categories and their specific form fields
const PRODUCT_CATEGORIES = {
    savings_accounts: {
        name: 'Savings Accounts',
        fields: [
            { name: 'interest_rate', label: 'Interest Rate (%)', type: 'number', placeholder: '2.5' },
            { name: 'minimum_balance', label: 'Minimum Balance', type: 'number', placeholder: '1000' },
            { name: 'monthly_fee', label: 'Monthly Fee', type: 'number', placeholder: '0' },
            { name: 'withdrawal_limit', label: 'Withdrawal Limit', type: 'text', placeholder: 'Unlimited' },
            { name: 'features', label: 'Key Features', type: 'textarea', placeholder: 'Online banking, Mobile app, etc.' }
        ]
    },
    checking_accounts: {
        name: 'Checking Accounts',
        fields: [
            { name: 'monthly_fee', label: 'Monthly Fee', type: 'number', placeholder: '0' },
            { name: 'minimum_balance', label: 'Minimum Balance', type: 'number', placeholder: '0' },
            { name: 'overdraft_protection', label: 'Overdraft Protection', type: 'boolean' },
            { name: 'atm_access', label: 'ATM Network', type: 'text', placeholder: 'National network' },
            { name: 'features', label: 'Key Features', type: 'textarea', placeholder: 'Debit card, Check writing, etc.' }
        ]
    },
    credit_cards: {
        name: 'Credit Cards',
        fields: [
            { name: 'annual_percentage_rate', label: 'APR (%)', type: 'number', placeholder: '18.5' },
            { name: 'annual_fee', label: 'Annual Fee', type: 'number', placeholder: '0' },
            { name: 'credit_limit', label: 'Credit Limit', type: 'text', placeholder: 'Up to $50,000' },
            { name: 'rewards_rate', label: 'Cash Back / Rewards', type: 'text', placeholder: '1-5%' },
            { name: 'benefits', label: 'Benefits', type: 'textarea', placeholder: 'Travel rewards, Purchase protection, etc.' }
        ]
    },
    loans: {
        name: 'Loans',
        fields: [
            { name: 'loan_amount', label: 'Loan Amount Range', type: 'text', placeholder: '$5,000 - $50,000' },
            { name: 'interest_rate', label: 'Interest Rate (%)', type: 'number', placeholder: '5.5' },
            { name: 'loan_term', label: 'Loan Term (months)', type: 'number', placeholder: '60' },
            { name: 'processing_fee', label: 'Processing Fee', type: 'number', placeholder: '0' },
            { name: 'eligibility', label: 'Eligibility Requirements', type: 'textarea', placeholder: 'Age, Credit score, etc.' }
        ]
    },
    investment_products: {
        name: 'Investment Products',
        fields: [
            { name: 'product_type', label: 'Product Type', type: 'text', placeholder: 'Stocks, Bonds, Mutual Funds' },
            { name: 'minimum_investment', label: 'Minimum Investment', type: 'number', placeholder: '1000' },
            { name: 'management_fee', label: 'Management Fee (%)', type: 'number', placeholder: '0.5' },
            { name: 'risk_level', label: 'Risk Level', type: 'select', options: ['Low', 'Medium', 'High'] },
            { name: 'description', label: 'Product Description', type: 'textarea', placeholder: 'Detailed description' }
        ]
    },
    mortgages: {
        name: 'Mortgages',
        fields: [
            { name: 'loan_amount_range', label: 'Loan Amount Range', type: 'text', placeholder: '$50,000 - $1,000,000' },
            { name: 'interest_rate', label: 'Interest Rate (%)', type: 'number', placeholder: '4.5' },
            { name: 'loan_term', label: 'Loan Term (years)', type: 'number', placeholder: '30' },
            { name: 'down_payment', label: 'Down Payment Required (%)', type: 'number', placeholder: '20' },
            { name: 'property_types', label: 'Property Types', type: 'textarea', placeholder: 'Primary residence, Investment property, etc.' }
        ]
    }
};

module.exports = {
    PRODUCT_CATEGORIES
};
