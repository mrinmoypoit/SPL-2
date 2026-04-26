// Admin System Constants
import { getApiBaseUrl } from '../../src/utils/apiBase';

// API Configuration
export const API_BASE_URL = getApiBaseUrl();
export const API_ENDPOINTS = {
    PRODUCTS: '/admin/products',
    DRAFTS: '/admin/drafts',
    OPERATORS: '/admin/operators',
    AUDIT_LOGS: '/admin/audit-logs',
};

// User Roles
export const USER_ROLES = {
    ADMIN: 'admin',
    DATA_ENTRY_OPERATOR: 'data_entry_operator',
};

// Product Status
export const PRODUCT_STATUS = {
    DRAFT: 'draft',
    PUBLISHED: 'published',
};

// Product Categories
export const PRODUCT_CATEGORIES = {
    SAVINGS_ACCOUNTS: 'savings_accounts',
    CHECKING_ACCOUNTS: 'checking_accounts',
    CREDIT_CARDS: 'credit_cards',
    LOANS: 'loans',
    INVESTMENT_PRODUCTS: 'investment_products',
    MORTGAGES: 'mortgages',
};

// Audit Action Types
export const AUDIT_ACTIONS = {
    CREATE: 'CREATE',
    UPDATE: 'UPDATE',
    DELETE: 'DELETE',
    PUBLISH: 'PUBLISH',
    DRAFT: 'DRAFT',
};

// Form Validation Rules
export const VALIDATION_RULES = {
    PRODUCT_NAME_MIN_LENGTH: 3,
    PRODUCT_NAME_MAX_LENGTH: 100,
    COMPANY_NAME_MIN_LENGTH: 2,
    COMPANY_NAME_MAX_LENGTH: 100,
    DESCRIPTION_MAX_LENGTH: 500,
    EMAIL_PATTERN: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    PHONE_PATTERN: /^\+?[\d\s\-()]+$/,
};

// Default Settings
export const DEFAULT_SETTINGS = {
    ITEMS_PER_PAGE: 10,
    TOKEN_EXPIRY_HOURS: 24,
    AUTO_SAVE_INTERVAL: 5000, // 5 seconds
};

// Toast/Notification Types
export const NOTIFICATION_TYPES = {
    SUCCESS: 'success',
    ERROR: 'error',
    WARNING: 'warning',
    INFO: 'info',
};

// HTTP Status Codes
export const HTTP_STATUS = {
    OK: 200,
    CREATED: 201,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    INTERNAL_SERVER_ERROR: 500,
};

// Local Storage Keys
export const LOCAL_STORAGE_KEYS = {
    OPERATOR_TOKEN: 'operatorToken',
    OPERATOR_ID: 'operatorId',
    OPERATOR_ROLE: 'operatorRole',
    OPERATOR_EMAIL: 'operatorEmail',
};

export default {
    API_BASE_URL,
    API_ENDPOINTS,
    USER_ROLES,
    PRODUCT_STATUS,
    PRODUCT_CATEGORIES,
    AUDIT_ACTIONS,
    VALIDATION_RULES,
    DEFAULT_SETTINGS,
    NOTIFICATION_TYPES,
    HTTP_STATUS,
    LOCAL_STORAGE_KEYS,
};
