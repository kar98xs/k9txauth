import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api";

const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true, // Send cookies with every request
  xsrfCookieName: "csrftoken", // Django's default CSRF cookie name
  xsrfHeaderName: "X-CSRFToken", // Django's expected CSRF header name
});

// Simple CSRF initialization - just make one GET request
export const initializeCSRF = async () => {
  try {
    await api.get("/auth/csrf/");
  } catch (error) {
    // Silently handle - CSRF will be initialized on first authenticated request
  }
};

/**
 * Map error responses to user-friendly messages
 */
export function getErrorMessage(error) {
  // Authentication error (401)
  if (error.response?.status === 401) {
    return error.response?.data?.error || "Invalid credentials";
  }

  // Server error (500)
  if (error.response?.status === 500) {
    return "Unable to connect to server. Please try again or use Google Sign-In.";
  }

  // Network error (timeout or no response)
  if (!error.response || error.code === "ECONNABORTED") {
    return "Connection timeout. Please check your internet connection.";
  }

  // Generic error
  return (
    error.response?.data?.error ||
    "An unexpected error occurred. Please try again."
  );
}

// Token refresh is now handled by response interceptor (on 401 errors)
// No need for proactive refresh scheduling - cookies are managed by backend

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Don't try to refresh token for login/register/public endpoints
    const publicEndpoints = [
      "/auth/login/",
      "/auth/register/",
      "/auth/google/login/",
      "/auth/password/reset/request/",
      "/auth/password/reset/verify/",
      "/auth/verify-email-otp/",
      "/auth/resend-verification/",
      "/auth/csrf/",
    ];

    const isPublicEndpoint = publicEndpoints.some((endpoint) =>
      originalRequest.url?.includes(endpoint)
    );

    // If 401 error and not already retried and NOT a public endpoint, try to refresh token
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !isPublicEndpoint
    ) {
      originalRequest._retry = true;

      try {
        // Call refresh endpoint - cookies are sent automatically
        await axios.post(
          `${API_URL}/auth/token/refresh/`,
          {},
          { withCredentials: true }
        );

        // Retry original request - new access token cookie is now set
        return api(originalRequest);
      } catch (refreshError) {
        // Refresh failed - silently handle (user not logged in)
        // Only redirect if not already on public pages
        if (
          !window.location.pathname.match(/\/(login|register|forgot-password)/)
        ) {
          window.location.href = "/login";
        }
        // Suppress error in console for expected 401s
        return Promise.reject({ ...refreshError, silent: true });
      }
    }

    return Promise.reject(error);
  }
);

export const authAPI = {
  getCsrfToken: () => api.get("/auth/csrf/"),
  register: (data) => api.post("/auth/register/", data),
  login: (data) => api.post("/auth/login/", data),
  googleLogin: (token) => api.post("/auth/google/login/", { token }),
  logout: () => api.post("/auth/logout/", {}),
  getCurrentUser: () => api.get("/auth/me/"),
  verifyEmailOTP: (data) => api.post("/auth/verify-email-otp/", data),
  resendVerification: (data) => api.post("/auth/resend-verification/", data),
  changePassword: (data) => api.post("/auth/password/change/", data),
  requestPasswordReset: (data) =>
    api.post("/auth/password/reset/request/", data),
  verifyPasswordReset: (data) => api.post("/auth/password/reset/verify/", data),
};

export default api;
