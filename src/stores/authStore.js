import { create } from "zustand";
import { authAPI, getErrorMessage } from "../services/api";

export const useAuthStore = create((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,

  initialize: async () => {
    // Tokens are now in httpOnly cookies - just try to get current user
    try {
      const response = await authAPI.getCurrentUser();
      const userData = response.data;

      set({ user: userData, isAuthenticated: true, isLoading: false });
      return { success: true, data: userData };
    } catch (error) {
      // Silently handle - user not logged in (expected on login page)
      set({ user: null, isAuthenticated: false, isLoading: false });
      return { success: false, error };
    }
  },

  login: async (credentials) => {
    try {
      const response = await authAPI.login(credentials);
      const { user } = response.data;

      // Tokens are now stored as httpOnly cookies by backend

      set({ user, isAuthenticated: true });
      return { success: true };
    } catch (error) {
      // Use centralized error message handler
      const errorMessage = getErrorMessage(error);
      return { success: false, error: errorMessage };
    }
  },

  register: async (userData) => {
    try {
      const response = await authAPI.register(userData);
      const { user, message } = response.data;

      // Tokens are now stored as httpOnly cookies by backend
      // No need to manually save to localStorage

      set({ user, isAuthenticated: true });
      return { success: true, data: { message } };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data || "Registration failed",
      };
    }
  },

  logout: async () => {
    try {
      // Cookies are cleared by backend
      await authAPI.logout();
    } catch (error) {
      // Silently handle logout errors
    } finally {
      // No need to clear localStorage - tokens are in httpOnly cookies
      set({ user: null, isAuthenticated: false });
    }
  },

  updateUser: (userData) => {
    set((state) => ({
      user: { ...state.user, ...userData },
    }));
  },

  setUser: (user) => {
    set({ user });
  },

  setIsAuthenticated: (isAuthenticated) => {
    set({ isAuthenticated });
  },
}));
