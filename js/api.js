// js/api.js - Central API Client with JWT Auth, Error Handling & Session Storage

const TOKEN_KEY = 'ai_bi_auth_token';
const USER_KEY = 'ai_bi_auth_user';

let memoryToken = null;
let memoryUser = null;

// Initialize token from sessionStorage safely
try {
  memoryToken = sessionStorage.getItem(TOKEN_KEY);
  const rawUser = sessionStorage.getItem(USER_KEY);
  if (rawUser) memoryUser = JSON.parse(rawUser);
} catch (e) {
  console.warn('SessionStorage unavailable, relying on in-memory storage');
}

export const api = {
  getToken() {
    return memoryToken;
  },

  getUser() {
    return memoryUser;
  },

  isAuthenticated() {
    return Boolean(memoryToken);
  },

  setSession(token, user) {
    memoryToken = token;
    memoryUser = user;
    try {
      if (token) {
        sessionStorage.setItem(TOKEN_KEY, token);
        if (user) sessionStorage.setItem(USER_KEY, JSON.stringify(user));
      } else {
        sessionStorage.removeItem(TOKEN_KEY);
        sessionStorage.removeItem(USER_KEY);
      }
    } catch (e) {}
  },

  logout() {
    this.setSession(null, null);
    window.location.hash = '#/login';
  },

  async request(endpoint, options = {}) {
    const url = endpoint.startsWith('/') ? endpoint : `/api/${endpoint}`;
    const headers = {
      'Accept': 'application/json',
      ...(options.headers || {})
    };

    if (memoryToken) {
      headers['Authorization'] = `Bearer ${memoryToken}`;
    }

    if (options.body && !(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
      if (typeof options.body === 'object') {
        options.body = JSON.stringify(options.body);
      }
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers
      });

      // Handle 401 Unauthorized centrally
      if (response.status === 401) {
        if (!url.includes('/api/auth') && window.location.hash !== '#/login') {
          this.setSession(null, null);
          window.location.hash = '#/login';
          throw new Error('Your session has expired. Please sign in again.');
        }
      }

      let result;
      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        result = await response.json();
      } else {
        const text = await response.text();
        result = { ok: response.ok, data: text };
      }

      if (!response.ok || result.ok === false) {
        const message = result.error || result.message || `Request failed with status ${response.status}`;
        throw new Error(message);
      }

      return result.data !== undefined ? result.data : result;
    } catch (err) {
      console.error(`[API Error] ${options.method || 'GET'} ${url}:`, err);
      throw err;
    }
  },

  get(endpoint, queryParams = {}) {
    const qs = new URLSearchParams(queryParams).toString();
    const url = qs ? `${endpoint}?${qs}` : endpoint;
    return this.request(url, { method: 'GET' });
  },

  post(endpoint, data) {
    return this.request(endpoint, {
      method: 'POST',
      body: data
    });
  },

  put(endpoint, data) {
    return this.request(endpoint, {
      method: 'PUT',
      body: data
    });
  },

  delete(endpoint, queryParams = {}) {
    const qs = new URLSearchParams(queryParams).toString();
    const url = qs ? `${endpoint}?${qs}` : endpoint;
    return this.request(url, { method: 'DELETE' });
  },

  async login(password) {
    const data = await this.post('/api/auth', { password });
    if (data?.token) {
      this.setSession(data.token, data.user);
    }
    return data;
  }
};

export default api;
