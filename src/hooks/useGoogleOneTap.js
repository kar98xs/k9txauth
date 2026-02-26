import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../stores/authStore";
import { authAPI, getErrorMessage } from "../services/api";
import toast from "react-hot-toast";

/**
 * Google One Tap Hook
 * Automatically shows Google sign-in popup in top-right corner
 * @param {Object} options - Configuration options
 * @param {boolean} options.disabled - Disable One Tap
 * @param {string} options.context - Context for One Tap (signin, signup, use)
 */
export function useGoogleOneTap({ disabled = false, context = "signin" } = {}) {
  const navigate = useNavigate();
  const { setUser, setIsAuthenticated, isAuthenticated } = useAuthStore();
  const isInitialized = useRef(false);

  useEffect(() => {
    // Don't show if disabled or already authenticated
    if (disabled || isAuthenticated || isInitialized.current) {
      return;
    }

    const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

    if (!GOOGLE_CLIENT_ID || GOOGLE_CLIENT_ID === "your-google-client-id") {
      return;
    }

    // Check if user dismissed One Tap recently (within 2 hours)
    const dismissedTime = localStorage.getItem("google_onetap_dismissed");
    if (dismissedTime) {
      const twoHours = 2 * 60 * 60 * 1000;
      if (Date.now() - parseInt(dismissedTime) < twoHours) {
        return;
      }
    }

    // Initialize Google One Tap
    const initializeOneTap = () => {
      if (!window.google?.accounts?.id) {
        return;
      }

      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleCredentialResponse,
        auto_select: false,
        cancel_on_tap_outside: true,
        context: context,
      });

      // Prompt One Tap UI - suppress all console logs
      window.google.accounts.id.prompt((notification) => {
        if (notification.isDismissedMoment()) {
          localStorage.setItem(
            "google_onetap_dismissed",
            Date.now().toString(),
          );
        }
      });

      isInitialized.current = true;
    };

    // Handle Google credential response
    async function handleCredentialResponse(response) {
      try {
        const result = await authAPI.googleLogin(response.credential);
        setUser(result.data.user);
        setIsAuthenticated(true);
        toast.success("Welcome");
        navigate("/dashboard");
      } catch (error) {
        const errorMsg = getErrorMessage(error);
        toast.error(errorMsg);
      }
    }

    // Load Google Identity Services script if not already loaded
    if (!window.google?.accounts?.id) {
      const script = document.createElement("script");
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.defer = true;
      script.onload = initializeOneTap;
      document.head.appendChild(script);

      return () => {
        document.head.removeChild(script);
      };
    } else {
      initializeOneTap();
    }

    // Cleanup
    return () => {
      if (window.google?.accounts?.id) {
        window.google.accounts.id.cancel();
      }
    };
  }, [
    disabled,
    isAuthenticated,
    context,
    navigate,
    setUser,
    setIsAuthenticated,
  ]);
}
