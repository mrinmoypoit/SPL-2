const API_BASE_URL = '/api';

const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` })
  };
};

const handleResponse = async (response) => {
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.error || 'Something went wrong');
  }
  
  return data;
};

export const authAPI = {
  register: async (userData) => {
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData)
    });
    return handleResponse(response);
  },

  login: async (credentials) => {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials)
    });
    return handleResponse(response);
  },

  googleAuth: async (googleToken) => {
    const response = await fetch(`${API_BASE_URL}/auth/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: googleToken })
    });
    return handleResponse(response);
  }
};

export const userAPI = {
  getProfile: async () => {
    const response = await fetch(`${API_BASE_URL}/users/profile`, {
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  updateProfile: async (userData) => {
    const response = await fetch(`${API_BASE_URL}/users/profile`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(userData)
    });
    return handleResponse(response);
  },

  changePassword: async (passwords) => {
    const response = await fetch(`${API_BASE_URL}/users/change-password`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(passwords)
    });
    return handleResponse(response);
  }
};

export const otpAPI = {
  generate: async (otpData) => {
    const response = await fetch(`${API_BASE_URL}/otp/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(otpData)
    });
    return handleResponse(response);
  },

  verify: async (otpData) => {
    const response = await fetch(`${API_BASE_URL}/otp/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(otpData)
    });
    return handleResponse(response);
  }
};

export const productsAPI = {
  getAll: async (filters = {}) => {
    const queryParams = new URLSearchParams(filters).toString();
    const response = await fetch(`${API_BASE_URL}/products?${queryParams}`);
    return handleResponse(response);
  },

  getById: async (id) => {
    const response = await fetch(`${API_BASE_URL}/products/${id}`);
    return handleResponse(response);
  }
};

export const recommendationsAPI = {
  get: async (payload = {}) => {
    const response = await fetch(`${API_BASE_URL}/recommendations`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload)
    });
    return handleResponse(response);
  }
};

export const categoriesAPI = {
  getAll: async () => {
    const response = await fetch(`${API_BASE_URL}/categories`);
    return handleResponse(response);
  }
};

export const notificationsAPI = {
  getAll: async () => {
    const response = await fetch(`${API_BASE_URL}/notifications`, {
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  markAsRead: async (notificationId) => {
    const response = await fetch(`${API_BASE_URL}/notifications/${notificationId}/read`, {
      method: 'PUT',
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  }
};

export const aiAPI = {
  ask: async (question, context = {}) => {
    const response = await fetch(`${API_BASE_URL}/ai/ask`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ question, ...context })
    });
    return handleResponse(response);
  },

  askStream: async (
    question,
    {
      context = {},
      onMeta,
      onChunk,
      onDone,
      onError
    } = {}
  ) => {
    const response = await fetch(`${API_BASE_URL}/ai/ask/stream`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ question, ...context })
    });

    if (!response.ok || !response.body) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error || 'Failed to open AI stream');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');

    let buffer = '';
    let donePayload = null;

    const processEventBlock = (eventBlock) => {
      if (!eventBlock || !eventBlock.trim()) {
        return;
      }

      const lines = eventBlock.split('\n');
      let eventName = 'message';
      const dataLines = [];

      for (const line of lines) {
        if (line.startsWith('event:')) {
          eventName = line.slice(6).trim();
        } else if (line.startsWith('data:')) {
          dataLines.push(line.slice(5).trim());
        }
      }

      const rawData = dataLines.join('\n');
      const payload = rawData ? JSON.parse(rawData) : {};

      if (eventName === 'meta') {
        onMeta?.(payload);
        return;
      }

      if (eventName === 'chunk') {
        onChunk?.(payload);
        return;
      }

      if (eventName === 'done') {
        donePayload = payload;
        onDone?.(payload);
        return;
      }

      if (eventName === 'error') {
        const streamError = new Error(payload.error || 'AI stream failed');
        onError?.(streamError, payload);
        throw streamError;
      }
    };

    while (true) {
      const { value, done } = await reader.read();
      if (done) {
        break;
      }

      buffer += decoder.decode(value, { stream: true });

      let separatorIndex = buffer.indexOf('\n\n');
      while (separatorIndex !== -1) {
        const eventBlock = buffer.slice(0, separatorIndex);
        buffer = buffer.slice(separatorIndex + 2);
        processEventBlock(eventBlock);
        separatorIndex = buffer.indexOf('\n\n');
      }
    }

    return donePayload;
  }
};
