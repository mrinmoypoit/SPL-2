import { get, post, setAuthToken, removeAuthToken } from './api';

// Operator/Auth API Endpoints
export const operatorService = {
    // Login operator
    login: async (email, password) => {
        const result = await post('/admin/operators/login', { email, password });
        
        if (result.success && result.data.token) {
            setAuthToken(result.data.token);
        }
        
        return result;
    },

    // Logout operator
    logout: () => {
        removeAuthToken();
        return { success: true };
    },

    // Get current operator profile
    getProfile: async () => {
        return get('/admin/operators/profile');
    },

    // Get dashboard statistics
    getDashboardStats: async () => {
        return get('/admin/operators/dashboard/stats');
    },

    // Get all operators (admin only)
    getAllOperators: async () => {
        return get('/admin/operators');
    },

    // Create new operator (admin only)
    createOperator: async (operatorData) => {
        return post('/admin/operators', operatorData);
    },

    // Get operator activity logs
    getActivityLogs: async (operatorId = null) => {
        const endpoint = operatorId 
            ? `/admin/operators/${operatorId}/logs`
            : '/admin/operators/logs';
        return get(endpoint);
    },
};

export default operatorService;
