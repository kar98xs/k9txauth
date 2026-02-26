import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api";

// Security: Prevent token refresh race conditions
let isRefreshing = false;
let refreshSubscribers = [];

// Security: Request cancellation tokens for cleanup
const cancelTokens = new Map();

const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
  xsrfCookieName: "csrftoken",
  xsrfHeaderName: "X-CSRFToken",
  timeout: 30000,
});

// Security: Subscribe to token refresh completion
const subscribeTokenRefresh = (callback) => {
  refreshSubscribers.push(callback);
};

// Security: Notify all subscribers when token is refreshed
const onTokenRefreshed = () => {
  refreshSubscribers.forEach((callback) => callback());
  refreshSubscribers = [];
};

// Security: Sanitize error messages to prevent information leakage
const sanitizeErrorMessage = (message) => {
  // Remove sensitive patterns from error messages
  const sensitivePatterns = [
    /password/gi,
    /token/gi,
    /secret/gi,
    /key/gi,
    /database/gi,
    /sql/gi,
  ];

  let sanitized = message;
  sensitivePatterns.forEach((pattern) => {
    sanitized = sanitized.replace(pattern, "***");
  });

  return sanitized;
};

/**
 * Security: Map error responses to safe user-friendly messages
 * Prevents information leakage through error messages
 */
export function getErrorMessage(error) {
  // Network error (timeout or no response)
  if (!error.response || error.code === "ECONNABORTED") {
    return "Connection timeout. Please check your internet connection.";
  }

  const status = error.response.status;
  const errorData = error.response.data?.error;

  // Security: Sanitize error messages
  const safeErrorData = errorData
    ? sanitizeErrorMessage(String(errorData))
    : null;

  // Status-specific messages with safe fallbacks
  if (status === 401) return safeErrorData || "Authentication failed";
  if (status === 403) return "Access denied";
  if (status === 404) return "Resource not found";
  if (status === 429) return "Too many requests. Please try again later";
  if (status >= 500) return "Server error. Please try again later";

  // Generic safe error with fallback
  return safeErrorData || "An error occurred. Please try again";
}

// Security: Optimized response interceptor with race condition prevention
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Public endpoints that don't require token refresh
    const publicEndpoints = [
      "/auth/login/",
      "/auth/register/",
      "/auth/google/login/",
      "/auth/password/reset/request/",
      "/auth/password/reset/verify/",
      "/auth/verify-email-otp/",
      "/auth/resend-verification/",
      "/auth/csrf/",
      "/auth/mfa/verify/",
      "/auth/me/",
      "/auth/token/refresh/",
    ];

    const isPublicEndpoint = publicEndpoints.some((endpoint) =>
      originalRequest.url?.includes(endpoint),
    );

    // Security: Attempt token refresh on 401 for protected endpoints only
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !isPublicEndpoint
    ) {
      originalRequest._retry = true;

      // Security: Handle concurrent refresh requests
      if (isRefreshing) {
        // Wait for the ongoing refresh to complete
        return new Promise((resolve) => {
          subscribeTokenRefresh(() => {
            resolve(api(originalRequest));
          });
        });
      }

      isRefreshing = true;

      try {
        await axios.post(
          `${API_URL}/auth/token/refresh/`,
          {},
          { withCredentials: true },
        );

        isRefreshing = false;
        onTokenRefreshed();

        return api(originalRequest);
      } catch (refreshError) {
        isRefreshing = false;
        refreshSubscribers = [];

        // Security: Safe redirect without XSS vulnerability
        if (
          !window.location.pathname.match(
            /\/(login|register|forgot-password|verify-email)/,
          )
        ) {
          // Use router navigation instead of direct window.location
          window.dispatchEvent(new CustomEvent("auth:logout"));
        }

        return Promise.reject({ ...refreshError, silent: true });
      }
    }

    return Promise.reject(error);
  },
);

// Security: Request interceptor for request deduplication
api.interceptors.request.use(
  (config) => {
    // Security: Cancel previous identical requests (deduplication)
    const requestKey = `${config.method}-${config.url}`;
    if (cancelTokens.has(requestKey)) {
      cancelTokens.get(requestKey).cancel("Request superseded");
    }

    const source = axios.CancelToken.source();
    config.cancelToken = source.token;
    cancelTokens.set(requestKey, source);

    return config;
  },
  (error) => Promise.reject(error),
);

// Security: Input validation helper
const validateInput = (data, rules) => {
  const errors = {};

  Object.keys(rules).forEach((field) => {
    const value = data[field];
    const rule = rules[field];

    if (rule.required && !value) {
      errors[field] = `${field} is required`;
    }

    if (rule.minLength && value && value.length < rule.minLength) {
      errors[field] = `${field} must be at least ${rule.minLength} characters`;
    }

    if (rule.maxLength && value && value.length > rule.maxLength) {
      errors[field] = `${field} must be less than ${rule.maxLength} characters`;
    }

    if (rule.pattern && value && !rule.pattern.test(value)) {
      errors[field] = `${field} format is invalid`;
    }
  });

  return Object.keys(errors).length > 0 ? errors : null;
};

// Security: Validated API methods with input sanitization
export const authAPI = {
  getCsrfToken: () => api.get("/auth/csrf/"),

  register: (data) => {
    // Security: Validate input before sending
    const errors = validateInput(data, {
      username: { required: true, minLength: 3, maxLength: 150 },
      email: { required: true, pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
      password: { required: true, minLength: 8, maxLength: 128 },
    });

    if (errors) {
      return Promise.reject({ response: { data: errors } });
    }

    return api.post("/auth/register/", data);
  },

  login: (data) => {
    // Security: Validate input
    const errors = validateInput(data, {
      email: { required: true },
      password: { required: true },
    });

    if (errors) {
      return Promise.reject({ response: { data: errors } });
    }

    return api.post("/auth/login/", data);
  },

  googleLogin: (token) => {
    if (!token || typeof token !== "string") {
      return Promise.reject({ response: { data: { error: "Invalid token" } } });
    }
    return api.post("/auth/google/login/", { token });
  },

  logout: () => api.post("/auth/logout/", {}),
  getCurrentUser: () => api.get("/auth/me/"),

  verifyEmailOTP: (data) => {
    const errors = validateInput(data, {
      email: { required: true },
      code: { required: true, minLength: 6, maxLength: 6 },
    });

    if (errors) {
      return Promise.reject({ response: { data: errors } });
    }

    return api.post("/auth/verify-email-otp/", data);
  },

  resendVerification: (data) => api.post("/auth/resend-verification/", data),
  changePassword: (data) => api.post("/auth/password/change/", data),
  requestPasswordReset: (data) =>
    api.post("/auth/password/reset/request/", data),
  verifyPasswordReset: (data) => api.post("/auth/password/reset/verify/", data),

  // MFA endpoints
  mfaSetup: () => api.post("/auth/mfa/setup/", {}),
  mfaEnable: (data) => api.post("/auth/mfa/enable/", data),
  mfaDisable: (data) => api.post("/auth/mfa/disable/", data),
  mfaVerifyLogin: (data) => api.post("/auth/mfa/verify/", data),
};

// Security: Cleanup function for request cancellation
export const cancelPendingRequests = () => {
  cancelTokens.forEach((source) => {
    source.cancel("Component unmounted");
  });
  cancelTokens.clear();
};

export default api;
