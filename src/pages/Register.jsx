import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuthStore } from "../stores/authStore";
import { useGoogleOneTap } from "../hooks/useGoogleOneTap";
import toast from "react-hot-toast";
import { MessageSquare, Info, Check, X, Eye, EyeOff } from "lucide-react";

export default function Register() {
  // Enable Google One Tap auto-popup for registration
  useGoogleOneTap({ disabled: false, context: "signup" });
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    password_confirm: "",
    first_name: "",
    last_name: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [passwordValidation, setPasswordValidation] = useState({
    length: false,
    capital: false,
    number: false,
    noSpaces: true,
  });
  const [passwordStrength, setPasswordStrength] = useState("");
  const { register } = useAuthStore();
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });

    // Validate password in real-time
    if (name === "password") {
      validatePassword(value);
    }
  };

  const validatePassword = (password) => {
    const validation = {
      length: password.length >= 8 && password.length <= 20,
      capital: /[A-Z]/.test(password),
      number: /[0-9]/.test(password),
      noSpaces: !/\s/.test(password),
    };

    setPasswordValidation(validation);

    // Calculate password strength
    const validCount = Object.values(validation).filter(Boolean).length;
    if (validCount === 4) {
      setPasswordStrength("strong");
    } else if (validCount >= 2) {
      setPasswordStrength("medium");
    } else {
      setPasswordStrength("weak");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (formData.password !== formData.password_confirm) {
      const errorMsg =
        "Passwords do not match. Please make sure both passwords are identical.";
      setError(errorMsg);
      toast.error(errorMsg);
      return;
    }

    setIsLoading(true);
    const result = await register(formData);
    setIsLoading(false);

    if (result.success) {
      const message =
        result.data?.message ||
        "Registration successful! Check your email for verification.";
      toast.success(message);
      navigate("/verify-email", {
        state: { email: formData.email },
        replace: true,
      });
      return;
    }

    // Handle registration errors
    const errors = result.error;
    let errorMsg = "Registration failed. Please try again.";

    if (typeof errors === "object") {
      errorMsg = Object.values(errors)
        .map((err) => (Array.isArray(err) ? err[0] : err))
        .join(", ");
      Object.values(errors).forEach((err) => {
        toast.error(Array.isArray(err) ? err[0] : err);
      });
    } else {
      errorMsg = errors;
      toast.error(errors);

      // Redirect to verify page if account already exists
      if (
        errorMsg.toLowerCase().includes("already exists") ||
        errorMsg.toLowerCase().includes("account exists")
      ) {
        setTimeout(() => {
          navigate("/verify-email", {
            state: { email: formData.email },
            replace: true,
          });
        }, 2000);
      }
    }
    setError(errorMsg);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-dark-bg via-dark-surface to-dark-bg px-4 py-8 relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 right-20 w-80 h-80 bg-brand-secondary opacity-10 rounded-full blur-3xl animate-pulse-slow"></div>
        <div
          className="absolute bottom-20 left-20 w-80 h-80 bg-brand-primary opacity-10 rounded-full blur-3xl animate-pulse-slow"
          style={{ animationDelay: "1.5s" }}
        ></div>
      </div>

      <div className="max-w-md w-full relative z-10">
        <div className="bg-dark-card rounded-2xl shadow-dark-xl p-6 border border-dark-border backdrop-blur-sm">
          <div className="text-center mb-6">
            <div className="flex justify-center mb-3">
              <div className="relative">
                <MessageSquare className="w-14 h-14 text-brand-secondary animate-pulse" />
                <div className="absolute inset-0 bg-brand-secondary opacity-20 blur-xl rounded-full"></div>
              </div>
            </div>
            <h1 className="text-3xl font-bold gradient-text mb-1">
              SecureAuth
            </h1>
            <p className="text-dark-text-secondary text-sm">
              Create your account
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            {/* Error Message */}
            {error && (
              <div className="bg-brand-error/10 border border-brand-error/30 text-brand-error px-3 py-2 rounded-lg text-xs backdrop-blur-sm animate-slide-down">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-dark-text mb-2">
                Username
              </label>
              <input
                type="text"
                name="username"
                value={formData.username}
                onChange={handleChange}
                className="input"
                placeholder="Choose a username"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-dark-text mb-2">
                Email
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="input"
                placeholder="your@email.com"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-dark-text mb-2">
                  First Name
                </label>
                <input
                  type="text"
                  name="first_name"
                  value={formData.first_name}
                  onChange={handleChange}
                  className="input"
                  placeholder="First name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-text mb-2">
                  Last Name
                </label>
                <input
                  type="text"
                  name="last_name"
                  value={formData.last_name}
                  onChange={handleChange}
                  className="input"
                  placeholder="Last name"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-dark-text mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  onFocus={() => setPasswordFocused(true)}
                  onBlur={() =>
                    setTimeout(() => setPasswordFocused(false), 200)
                  }
                  className="input pr-10"
                  placeholder="Create a strong password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-text-secondary hover:text-dark-text"
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>

              {/* Password Strength Indicator */}
              {formData.password && (
                <div className="mt-2">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="flex-1 h-2 bg-dark-bg rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${
                          passwordStrength === "strong"
                            ? "w-full bg-green-500"
                            : passwordStrength === "medium"
                              ? "w-2/3 bg-yellow-500"
                              : "w-1/3 bg-red-500"
                        }`}
                      />
                    </div>
                    <span
                      className={`text-xs font-medium ${
                        passwordStrength === "strong"
                          ? "text-green-500"
                          : passwordStrength === "medium"
                            ? "text-yellow-500"
                            : "text-red-500"
                      }`}
                    >
                      {passwordStrength}
                    </span>
                  </div>
                </div>
              )}

              {/* Password Requirements Tooltip */}
              {passwordFocused && formData.password && (
                <div className="mt-2 p-3 bg-dark-surface border border-dark-border rounded-lg text-sm animate-slide-down">
                  <p className="text-dark-text font-medium mb-2">
                    Password must include:
                  </p>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      {passwordValidation.length ? (
                        <Check className="w-4 h-4 text-green-500" />
                      ) : (
                        <X className="w-4 h-4 text-red-500" />
                      )}
                      <span
                        className={
                          passwordValidation.length
                            ? "text-green-500"
                            : "text-red-500"
                        }
                      >
                        8-20 Characters
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {passwordValidation.capital ? (
                        <Check className="w-4 h-4 text-green-500" />
                      ) : (
                        <X className="w-4 h-4 text-red-500" />
                      )}
                      <span
                        className={
                          passwordValidation.capital
                            ? "text-green-500"
                            : "text-red-500"
                        }
                      >
                        At least one capital letter
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {passwordValidation.number ? (
                        <Check className="w-4 h-4 text-green-500" />
                      ) : (
                        <X className="w-4 h-4 text-red-500" />
                      )}
                      <span
                        className={
                          passwordValidation.number
                            ? "text-green-500"
                            : "text-red-500"
                        }
                      >
                        At least one number
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {passwordValidation.noSpaces ? (
                        <Check className="w-4 h-4 text-green-500" />
                      ) : (
                        <X className="w-4 h-4 text-red-500" />
                      )}
                      <span
                        className={
                          passwordValidation.noSpaces
                            ? "text-green-500"
                            : "text-red-500"
                        }
                      >
                        No spaces
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-dark-text mb-2">
                Confirm Password
              </label>
              <div className="relative">
                <input
                  type={showPasswordConfirm ? "text" : "password"}
                  name="password_confirm"
                  value={formData.password_confirm}
                  onChange={handleChange}
                  className="input pr-10"
                  placeholder="Confirm your password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPasswordConfirm(!showPasswordConfirm)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-text-secondary hover:text-dark-text"
                >
                  {showPasswordConfirm ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
              {formData.password_confirm &&
                formData.password !== formData.password_confirm && (
                  <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                    <X className="w-3 h-3" />
                    Passwords do not match
                  </p>
                )}
              {formData.password_confirm &&
                formData.password === formData.password_confirm && (
                  <p className="text-green-500 text-xs mt-1 flex items-center gap-1">
                    <Check className="w-3 h-3" />
                    Passwords match
                  </p>
                )}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="btn btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <span className="flex items-center justify-center">
                  <svg
                    className="animate-spin h-5 w-5 mr-2"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Creating account...
                </span>
              ) : (
                "Create Account"
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-dark-text-secondary text-sm">
              Already have an account?{" "}
              <Link
                to="/login"
                className="text-brand-primary hover:text-brand-primary-hover font-medium transition-colors"
              >
                Sign In
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
