const TOKEN_KEYS = ['adminToken', 'operatorToken', 'token'];

const decodePayload = (token) => {
    try {
        const payloadPart = token.split('.')[1];
        if (!payloadPart) return null;

        const normalized = payloadPart.replace(/-/g, '+').replace(/_/g, '/');
        const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
        const decoded = window.atob(padded);

        return JSON.parse(decoded);
    } catch {
        return null;
    }
};

const isTokenExpired = (token) => {
    const payload = decodePayload(token);

    if (!payload || !payload.exp) {
        return false;
    }

    return payload.exp * 1000 <= Date.now();
};

export const getValidAuthToken = () => {
    for (const key of TOKEN_KEYS) {
        const token = localStorage.getItem(key);

        if (!token) {
            continue;
        }

        if (isTokenExpired(token)) {
            localStorage.removeItem(key);
            continue;
        }

        return token;
    }

    return null;
};

export const clearAuthTokens = () => {
    TOKEN_KEYS.forEach((key) => localStorage.removeItem(key));
    localStorage.removeItem('user');
};

export const isUnauthorizedStatus = (statusCode) => {
    return statusCode === 401 || statusCode === 403;
};
