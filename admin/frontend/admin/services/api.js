// API Configuration and Base Functions
import { fetchWithApiFallback } from '../../src/utils/apiBase';

// Get stored auth token
export const getAuthToken = () => {
    return localStorage.getItem('adminToken');
};

// Set auth token
export const setAuthToken = (token) => {
    localStorage.setItem('adminToken', token);
};

// Remove auth token
export const removeAuthToken = () => {
    localStorage.removeItem('adminToken');
};

// Generic API request handler
export const apiRequest = async (endpoint, options = {}) => {
    const {
        method = 'GET',
        body = null,
        headers = {},
    } = options;

    const token = getAuthToken();
    const requestHeaders = {
        'Content-Type': 'application/json',
        ...headers,
    };

    if (token) {
        requestHeaders['Authorization'] = `Bearer ${token}`;
    }

    const config = {
        method,
        headers: requestHeaders,
    };

    if (body) {
        config.body = JSON.stringify(body);
    }

    try {
        const response = await fetchWithApiFallback(endpoint, config);

        if (!response.ok) {
            if (response.status === 401) {
                removeAuthToken();
                window.location.href = '/';
            }
            throw new Error(`HTTP Error: ${response.status}`);
        }

        const data = await response.json();
        return { success: true, data };
    } catch (error) {
        return { 
            success: false, 
            error: error.message || 'An error occurred',
            status: error.status
        };
    }
};

// GET request
export const get = (endpoint) => {
    return apiRequest(endpoint, { method: 'GET' });
};

// POST request
export const post = (endpoint, body) => {
    return apiRequest(endpoint, { method: 'POST', body });
};

// PUT request
export const put = (endpoint, body) => {
    return apiRequest(endpoint, { method: 'PUT', body });
};

// DELETE request
export const deleteRequest = (endpoint) => {
    return apiRequest(endpoint, { method: 'DELETE' });
};

export default {
    get,
    post,
    put,
    deleteRequest,
    getAuthToken,
    setAuthToken,
    removeAuthToken,
};
