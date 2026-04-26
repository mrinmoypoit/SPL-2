
DROP TABLE IF EXISTS data_change_logs;
DROP TABLE IF EXISTS feedback;
DROP TABLE IF EXISTS notifications;
DROP TABLE IF EXISTS chatbot_conversations;
DROP TABLE IF EXISTS product_attributes;
DROP TABLE IF EXISTS product_drafts;
DROP TABLE IF EXISTS products;
DROP TABLE IF EXISTS product_subcategories;
DROP TABLE IF EXISTS category;
DROP TABLE IF EXISTS companies;
DROP TABLE IF EXISTS otp_verifications;
DROP TABLE IF EXISTS data_operators;
DROP TABLE IF EXISTS users;


CREATE TABLE users (
    user_id INT IDENTITY(1,1) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone_number VARCHAR(20),
    password_hash VARCHAR(255) NOT NULL,
    profession VARCHAR(100),
    monthly_income DECIMAL(12, 2),
    is_verified BIT DEFAULT 0,
    created_at DATETIME2 DEFAULT SYSDATETIME(),
    updated_at DATETIME2 DEFAULT SYSDATETIME()
);


CREATE TABLE otp_verifications (
    otp_id INT IDENTITY(1,1) PRIMARY KEY,
    user_id INT REFERENCES users(user_id) ON DELETE CASCADE,
    otp_code VARCHAR(6) NOT NULL,
    otp_type VARCHAR(50) NOT NULL, -- 'email_verification', 'password_reset', 'login'
    delivery_method VARCHAR(20) NOT NULL, -- 'email', 'sms'
    created_at DATETIME2 DEFAULT SYSDATETIME(),
    expires_at DATETIME2 DEFAULT DATEADD(MINUTE, 10, SYSDATETIME()),
    is_used BIT DEFAULT 0
);


CREATE TABLE companies (
    company_id INT IDENTITY(1,1) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    website_url VARCHAR(500),
    metrics NVARCHAR(MAX),
    created_at DATETIME2 DEFAULT SYSDATETIME(),
    updated_at DATETIME2 DEFAULT SYSDATETIME()
);


CREATE TABLE category (
    category_id INT IDENTITY(1,1) PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    created_at DATETIME2 DEFAULT SYSDATETIME()
);


CREATE TABLE product_subcategories (
    subcategory_id INT IDENTITY(1,1) PRIMARY KEY,
    category_id INT REFERENCES category(category_id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    created_at DATETIME2 DEFAULT SYSDATETIME()
);


CREATE TABLE products (
    product_id INT IDENTITY(1,1) PRIMARY KEY,
    company_id INT REFERENCES companies(company_id) ON DELETE CASCADE,
    subcategory_id INT REFERENCES product_subcategories(subcategory_id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at DATETIME2 DEFAULT SYSDATETIME(),
    updated_at DATETIME2 DEFAULT SYSDATETIME()
);


CREATE TABLE product_attributes (
    attribute_id INT IDENTITY(1,1) PRIMARY KEY,
    product_id INT REFERENCES products(product_id) ON DELETE CASCADE,
    attribute_name VARCHAR(100) NOT NULL,
    attribute_value TEXT NOT NULL,
    attribute_type VARCHAR(50),
    created_at DATETIME2 DEFAULT SYSDATETIME()
);


CREATE TABLE notifications (
    notification_id INT IDENTITY(1,1) PRIMARY KEY,
    user_id INT REFERENCES users(user_id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    notification_type VARCHAR(50) NOT NULL,
    product_id INT REFERENCES products(product_id) ON DELETE SET NULL,
    is_read BIT DEFAULT 0,
    created_at DATETIME2 DEFAULT SYSDATETIME()
);


CREATE TABLE feedback (
    feedback_id INT IDENTITY(1,1) PRIMARY KEY,
    user_id INT REFERENCES users(user_id) ON DELETE CASCADE,
    product_id INT REFERENCES products(product_id) ON DELETE CASCADE,
    rating INT CHECK (rating >= 1 AND rating <= 5),
    review_text TEXT,
    created_at DATETIME2 DEFAULT SYSDATETIME()
);


CREATE TABLE chatbot_conversations (
    conversation_id INT IDENTITY(1,1) PRIMARY KEY,
    user_id INT REFERENCES users(user_id) ON DELETE CASCADE,
    started_at DATETIME2 DEFAULT SYSDATETIME(),
    ended_at DATETIME2,
    status VARCHAR(20) DEFAULT 'active',
    message NVARCHAR(MAX)
);


CREATE TABLE data_operators (
    operator_id INT IDENTITY(1,1) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL,
    created_at DATETIME2 DEFAULT SYSDATETIME()
);


CREATE TABLE product_drafts (
    draft_id INT IDENTITY(1,1) PRIMARY KEY,
    product_id INT REFERENCES products(product_id) ON DELETE CASCADE,
    operator_id INT REFERENCES data_operators(operator_id) ON DELETE SET NULL,
    draft_data NVARCHAR(MAX) NOT NULL,
    is_active BIT DEFAULT 1,
    created_at DATETIME2 DEFAULT SYSDATETIME(),
    updated_at DATETIME2 DEFAULT SYSDATETIME()
);


CREATE TABLE data_change_logs (
    log_id INT IDENTITY(1,1) PRIMARY KEY,
    operator_id INT REFERENCES data_operators(operator_id) ON DELETE SET NULL,
    product_id INT REFERENCES products(product_id) ON DELETE SET NULL,
    action VARCHAR(50) NOT NULL,
    old_data NVARCHAR(MAX),
    new_data NVARCHAR(MAX),
    [timestamp] DATETIME2 DEFAULT SYSDATETIME()
);


CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_phone ON users(phone_number);
CREATE INDEX idx_otp_user_id ON otp_verifications(user_id);
CREATE INDEX idx_otp_code ON otp_verifications(otp_code);
CREATE INDEX idx_products_company ON products(company_id);
CREATE INDEX idx_products_subcategory ON products(subcategory_id);
CREATE INDEX idx_product_attributes_product ON product_attributes(product_id);
CREATE INDEX idx_product_drafts_product ON product_drafts(product_id);
CREATE INDEX idx_product_drafts_operator ON product_drafts(operator_id);
CREATE INDEX idx_product_drafts_active ON product_drafts(product_id, is_active);
CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_unread ON notifications(user_id, is_read);
CREATE INDEX idx_feedback_product ON feedback(product_id);
CREATE INDEX idx_feedback_user ON feedback(user_id);
CREATE INDEX idx_chatbot_user ON chatbot_conversations(user_id);
CREATE INDEX idx_logs_operator ON data_change_logs(operator_id);
CREATE INDEX idx_logs_product ON data_change_logs(product_id);
CREATE INDEX idx_logs_timestamp ON data_change_logs([timestamp]);

IF OBJECT_ID('update_users_updated_at', 'TR') IS NOT NULL
    DROP TRIGGER update_users_updated_at;
EXEC('
CREATE TRIGGER update_users_updated_at
ON users
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    IF TRIGGER_NESTLEVEL() > 1 RETURN;
    UPDATE u
    SET updated_at = SYSDATETIME()
    FROM users u
    INNER JOIN inserted i ON u.user_id = i.user_id;
END;
');

IF OBJECT_ID('update_companies_updated_at', 'TR') IS NOT NULL
    DROP TRIGGER update_companies_updated_at;
EXEC('
CREATE TRIGGER update_companies_updated_at
ON companies
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    IF TRIGGER_NESTLEVEL() > 1 RETURN;
    UPDATE c
    SET updated_at = SYSDATETIME()
    FROM companies c
    INNER JOIN inserted i ON c.company_id = i.company_id;
END;
');

IF OBJECT_ID('update_products_updated_at', 'TR') IS NOT NULL
    DROP TRIGGER update_products_updated_at;
EXEC('
CREATE TRIGGER update_products_updated_at
ON products
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    IF TRIGGER_NESTLEVEL() > 1 RETURN;
    UPDATE p
    SET updated_at = SYSDATETIME()
    FROM products p
    INNER JOIN inserted i ON p.product_id = i.product_id;
END;
');

IF OBJECT_ID('update_product_drafts_updated_at', 'TR') IS NOT NULL
    DROP TRIGGER update_product_drafts_updated_at;
EXEC('
CREATE TRIGGER update_product_drafts_updated_at
ON product_drafts
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    IF TRIGGER_NESTLEVEL() > 1 RETURN;
    UPDATE pd
    SET updated_at = SYSDATETIME()
    FROM product_drafts pd
    INNER JOIN inserted i ON pd.draft_id = i.draft_id;
END;
');
