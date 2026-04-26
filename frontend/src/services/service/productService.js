import { get, post, put, deleteRequest } from './api';

// Product API Endpoints
export const productService = {
    // Get all products with optional filtering
    getAllProducts: async (filters = {}) => {
        const queryParams = new URLSearchParams();
        if (filters.searchTerm) queryParams.append('search', filters.searchTerm);
        if (filters.status && filters.status !== 'all') queryParams.append('status', filters.status);
        if (filters.category) queryParams.append('category', filters.category);

        const queryString = queryParams.toString();
        const endpoint = `/admin/products${queryString ? `?${queryString}` : ''}`;
        return get(endpoint);
    },

    // Get single product by ID
    getProduct: async (productId) => {
        return get(`/admin/products/${productId}`);
    },

    // Create new product
    createProduct: async (productData) => {
        return post('/admin/products', productData);
    },

    // Update existing product
    updateProduct: async (productId, productData) => {
        return put(`/admin/products/${productId}`, productData);
    },

    // Delete product
    deleteProduct: async (productId) => {
        return deleteRequest(`/admin/products/${productId}`);
    },

    // Publish draft product
    publishDraft: async (draftId) => {
        return post(`/admin/drafts/${draftId}/publish`);
    },

    // Get product change logs
    getChangeLogs: async (productId) => {
        return get(`/admin/products/${productId}/logs`);
    },

    // Get all drafts
    getDrafts: async () => {
        return get('/admin/drafts');
    },

    // Delete draft
    deleteDraft: async (draftId) => {
        return deleteRequest(`/admin/drafts/${draftId}`);
    },

    // Get audit logs
    getAuditLogs: async (filters = {}) => {
        const queryParams = new URLSearchParams();
        if (filters.action) queryParams.append('action', filters.action);
        if (filters.startDate) queryParams.append('startDate', filters.startDate);
        if (filters.endDate) queryParams.append('endDate', filters.endDate);

        const queryString = queryParams.toString();
        const endpoint = `/admin/audit-logs${queryString ? `?${queryString}` : ''}`;
        return get(endpoint);
    },
};

export default productService;
