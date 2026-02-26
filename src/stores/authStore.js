import { create } from "zustand";
import { authAPI, getErrorMessage } from "../services/api";

// Security: Validate user data structure
const validateUserData = (user) => {
  if (!user || typeof user !== "object") return null;

  // Security: Only allow expected fields to prevent prototype pollution
  const allowedFields = [
    "id",
    "username",
    "email",
    "first_name",
    "last_name",
    "is_verified",
    "mfa_enabled",
    "created_at",
    "updated_at",
  ];

  const sanitizedUser = {};
  allowedFields.forEach((field) => {
    if (user.hasOwnProperty(field)) {
      sanitizedUser[field] = user[field];
    }
  });

  return sanitizedUser;
};

// Security: Rate limiting for auth operations
const rateLimiter = {
  attempts: new Map(),
  maxAttempts: 5,
  windowMs: 60000, // 1 minute

  check(key) {
    const now = Date.now();
    const attempts = this.attempts.get(key) || [];

    // Clean old attempts
    const recentAttempts = attempts.filter(
      (time) => now - time < this.windowMs,
    );

    if (recentAttempts.length >= this.maxAttempts) {
      return false; // Rate limit exceeded
    }

    recentAttempts.push(now);
    this.attempts.set(key, recentAttempts);
    return true;
  },

  reset(key) {
    this.attempts.delete(key);
  },
};

export const useAuthStore = create((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  lastActivity: Date.now(),

  // Security: Initialize with validation
  initialize: async () => {
    try {
      const response = await authAPI.getCurrentUser();
      const sanitizedUser = validateUserData(response.data);

      if (!sanitizedUser) {
        throw new Error("Invalid user data");
      }

      set({
        user: sanitizedUser,
        isAuthenticated: true,
        isLoading: false,
        lastActivity: Date.now(),
      });

      return { success: true, data: sanitizedUser };
    } catch (error) {
      set({ user: null, isAuthenticated: false, isLoading: false });
      return { success: false, error };
    }
  },

  // Security: Login with rate limiting and validation
  login: async (credentials) => {
    // Security: Rate limiting
    if (!rateLimiter.check("login")) {
      return {
        success: false,
        error: "Too many login attempts. Please try again later.",
      };
    }

    // Security: Input validation
    if (!credentials?.email || !credentials?.password) {
      return { success: false, error: "Email and password are required" };
    }

    try {
      const response = await authAPI.login(credentials);

      if (!response?.data) {
        return { success: false, error: "Invalid response from server" };
      }

      const { user, mfa_required, email, message } = response.data;

      // MFA required - return early
      if (mfa_required) {
        return { success: false, mfa_required: true, email, message };
      }

      // Security: Validate and sanitize user data
      const sanitizedUser = validateUserData(user);
      if (!sanitizedUser) {
        return { success: false, error: "Invalid user data received" };
      }

      // Success - reset rate limiter
      rateLimiter.reset("login");

      set({
        user: sanitizedUser,
        isAuthenticated: true,
        lastActivity: Date.now(),
      });

      return { success: true };
    } catch (error) {
      return { success: false, error: getErrorMessage(error) };
    }
  },

  // Security: Register with validation
  register: async (userData) => {
    // Security: Rate limiting
    if (!rateLimiter.check("register")) {
      return {
        success: false,
        error: "Too many registration attempts. Please try again later.",
      };
    }

    try {
      const response = await authAPI.register(userData);
      const { user, message } = response.data;

      // Security: Validate and sanitize user data
      const sanitizedUser = validateUserData(user);
      if (!sanitizedUser) {
        return { success: false, error: "Invalid user data received" };
      }

      set({
        user: sanitizedUser,
        isAuthenticated: true,
        lastActivity: Date.now(),
      });

      return { success: true, data: { message } };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data || "Registration failed",
      };
    }
  },

  // Security: Secure logout with cleanup
  logout: async () => {
    try {
      await authAPI.logout();
    } catch (error) {
      // Silently handle logout errors but still clear state
      console.error("Logout error:", error);
    } finally {
      // Security: Clear all sensitive data
      set({
        user: null,
        isAuthenticated: false,
        lastActivity: Date.now(),
      });

      // Security: Clear rate limiters
      rateLimiter.attempts.clear();
    }
  },

  // Security: Update user with validation
  updateUser: (userData) => {
    const currentUser = get().user;
    if (!currentUser) return;

    // Security: Validate and sanitize incoming data
    const sanitizedUpdate = validateUserData(userData);
    if (!sanitizedUpdate) return;

    set((state) => ({
      user: { ...state.user, ...sanitizedUpdate },
      lastActivity: Date.now(),
    }));
  },

  // Security: Set user with validation
  setUser: (user) => {
    const sanitizedUser = validateUserData(user);
    if (!sanitizedUser) return;

    set({
      user: sanitizedUser,
      lastActivity: Date.now(),
    });
  },

  // Security: Controlled authentication state setter
  setIsAuthenticated: (isAuthenticated) => {
    // Security: Only allow setting to false if no user, or true if user exists
    const currentUser = get().user;

    if (isAuthenticated && !currentUser) {
      console.warn("Cannot set authenticated without user data");
      return;
    }

    set({
      isAuthenticated,
      lastActivity: Date.now(),
    });
  },

  // Security: Activity tracking for session timeout
  updateActivity: () => {
    set({ lastActivity: Date.now() });
  },

  // Security: Check if session is stale (optional feature)
  isSessionStale: (maxInactiveMs = 30 * 60 * 1000) => {
    // 30 minutes default
    const { lastActivity } = get();
    return Date.now() - lastActivity > maxInactiveMs;
  },
}));
