import { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { useAuthStore } from "./stores/authStore";
import { initializeCSRF } from "./services/api";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import VerifyEmail from "./pages/VerifyEmail.jsx";
import ForgotPassword from "./pages/ForgotPassword.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import "./index.css";

function ProtectedRoute({ children }) {
  const { isAuthenticated, isLoading, user } = useAuthStore();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // If not authenticated, go to login
  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  // If authenticated but not verified, go to verify email
  if (isAuthenticated && user && !user.is_verified) {
    return <Navigate to="/verify-email" state={{ email: user.email }} />;
  }

  return children;
}

function PublicRoute({ children }) {
  const { isAuthenticated, isLoading, user } = useAuthStore();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Only redirect to dashboard if authenticated AND verified
  const shouldRedirect = isAuthenticated && user?.is_verified;

  return !shouldRedirect ? children : <Navigate to="/dashboard" />;
}

function App() {
  const initializeAuth = useAuthStore((state) => state.initialize);

  // Initialize CSRF Token on App Load
  useEffect(() => {
    initializeCSRF().catch(() => {
      // Silently handle - CSRF will be initialized on first authenticated request
    });
  }, []);

  // Handle Auth Initialization
  useEffect(() => {
    // Always try to initialize auth to check if user has valid cookies
    initializeAuth();
  }, [initializeAuth]);

  return (
    <BrowserRouter
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      <Toaster position="top-right" />
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route
          path="/login"
          element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          }
        />
        <Route
          path="/register"
          element={
            <PublicRoute>
              <Register />
            </PublicRoute>
          }
        />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route
          path="/forgot-password"
          element={
            <PublicRoute>
              <ForgotPassword />
            </PublicRoute>
          }
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
