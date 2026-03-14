-- Sample Data for Tulona Database

-- Insert Sample Categories
INSERT INTO category (name, description) VALUES
    ('Banking', 'Banking and financial services products'),
    ('Insurance', 'Insurance products and services'),
    ('Credit Cards', 'Credit card offerings'),
    ('Loans', 'Various loan products'),
    ('Investments', 'Investment and savings products');

-- Insert Sample Subcategories
INSERT INTO product_subcategories (category_id, name, description) VALUES
    (1, 'Savings Account', 'Personal savings account products'),
    (1, 'Current Account', 'Business and personal current accounts'),
    (1, 'Fixed Deposit', 'Fixed deposit schemes'),
    (2, 'Life Insurance', 'Life insurance policies'),
    (2, 'Health Insurance', 'Health and medical insurance'),
    (3, 'Reward Cards', 'Credit cards with reward programs'),
    (3, 'Travel Cards', 'Travel-focused credit cards'),
    (4, 'Personal Loan', 'Unsecured personal loans'),
    (4, 'Home Loan', 'Home mortgage loans'),
    (5, 'Mutual Funds', 'Mutual fund investment options');

-- Insert Sample Companies
INSERT INTO companies (name, description, website_url, metrics) VALUES
    ('Dutch Bangla Bank', 'Leading private bank in Bangladesh', 'https://www.dutchbanglabank.com', '{"rating": 4.5, "customers": 50000}'),
    ('BRAC Bank', 'Premier SME focused bank', 'https://www.bracbank.com', '{"rating": 4.3, "customers": 45000}'),
    ('City Bank', 'International standard banking', 'https://www.thecitybank.com', '{"rating": 4.2, "customers": 40000}'),
    ('Eastern Bank', 'Trusted banking partner', 'https://www.ebl.com.bd', '{"rating": 4.4, "customers": 35000}'),
    ('IFIC Bank', 'Islamic banking solutions', 'https://www.ificbank.com.bd', '{"rating": 4.1, "customers": 30000}');

-- Insert Sample Products
INSERT INTO products (company_id, subcategory_id, name, description) VALUES
    (1, 1, 'DBBL Savings Account', 'High interest savings account with free ATM access'),
    (1, 3, 'DBBL Fixed Deposit', 'Competitive interest rates on fixed deposits'),
    (2, 1, 'BRAC Savings Plus', 'Premium savings account with extra benefits'),
    (2, 8, 'BRAC Personal Loan', 'Quick personal loan with low interest rates'),
    (3, 6, 'City Rewards Card', 'Credit card with cashback rewards'),
    (3, 1, 'City Premium Savings', 'High-yield savings account'),
    (4, 9, 'EBL Home Loan', 'Affordable home loan with flexible terms'),
    (4, 5, 'EBL Health Insurance', 'Comprehensive health insurance coverage'),
    (5, 1, 'IFIC Savings Account', 'Shariah-compliant savings account'),
    (5, 10, 'IFIC Investment Plan', 'Long-term investment solutions');

-- Insert Sample Product Attributes
INSERT INTO product_attributes (product_id, attribute_name, attribute_value, attribute_type) VALUES
    (1, 'Interest Rate', '5.5', 'number'),
    (1, 'Minimum Balance', '1000', 'number'),
    (1, 'Monthly Fee', '0', 'number'),
    (1, 'ATM Withdrawals', 'Unlimited', 'string'),
    (2, 'Interest Rate', '7.5', 'number'),
    (2, 'Minimum Deposit', '50000', 'number'),
    (2, 'Lock Period', '1 year', 'string'),
    (3, 'Interest Rate', '6.0', 'number'),
    (3, 'Cashback', '2%', 'string'),
    (4, 'Interest Rate', '9.5', 'number'),
    (4, 'Maximum Amount', '500000', 'number'),
    (4, 'Processing Time', '3 days', 'string'),
    (5, 'Annual Fee', '2000', 'number'),
    (5, 'Cashback Rate', '5%', 'string'),
    (5, 'Credit Limit', '100000', 'number'),
    (7, 'Interest Rate', '8.5', 'number'),
    (7, 'Loan Term', '20 years', 'string'),
    (7, 'Maximum Loan', '5000000', 'number');

-- Insert Sample Data Operator (Admin user)
INSERT INTO data_operators (name, email, password_hash, role) VALUES
    ('Admin User', 'admin@tulona.com', '$2a$10$YourHashedPasswordHere', 'admin'),
    ('Data Entry User', 'dataentry@tulona.com', '$2a$10$YourHashedPasswordHere', 'data_entry');

-- Note: Users, OTP, Notifications, Feedback, and Chatbot data will be created through application usage
