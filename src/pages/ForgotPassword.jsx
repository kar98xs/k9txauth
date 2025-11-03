import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { authAPI } from "../services/api";
import toast from "react-hot-toast";
import { MessageSquare, Check, X, Eye, EyeOff } from "lucide-react";

export default function ForgotPassword() {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [passwordValidation, setPasswordValidation] = useState({
    length: false,
    capital: false,
    number: false,
    noSpaces: true,
  });
  const [passwordStrength, setPasswordStrength] = useState("");
  const navigate = useNavigate();

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

  const handlePasswordChange = (e) => {
    const password = e.target.value;
    setNewPassword(password);
    validatePassword(password);
  };

  const handleRequestOTP = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await authAPI.requestPasswordReset({ email });
      toast.success(response.data.message || "OTP sent to your email");
      setStep(2);
    } catch (error) {
      // Show specific error message from backend
      const errorMessage =
        error.response?.data?.error || "Failed to send OTP. Please try again.";
      toast.error(errorMessage);
      // Don't navigate to step 2 if there's an error
    }

    setIsLoading(false);
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await authAPI.verifyPasswordReset({
        email,
        otp,
        new_password: newPassword,
      });
      toast.success("Password reset successful!");
      setStep(3);

      // Auto redirect to login after 2 seconds
      setTimeout(() => {
        navigate("/login");
      }, 2000);
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to reset password");
    }

    setIsLoading(false);
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
              Reset Password
            </h1>
            <p className="text-dark-text-secondary text-sm">
              {step === 1
                ? "Enter your registered email address"
                : step === 2
                ? "Check your email for the OTP code"
                : "Password reset complete"}
            </p>
          </div>

          {step === 1 && (
            <form onSubmit={handleRequestOTP} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-dark-text mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input"
                  placeholder="Enter your email address"
                  required
                />
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
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Sending OTP...
                  </span>
                ) : (
                  "Send OTP"
                )}
              </button>
            </form>
          )}

          {step === 2 && (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-dark-text mb-2">
                  OTP Code
                </label>
                <input
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  className="input"
                  placeholder="Enter 6-digit OTP"
                  required
                  maxLength="6"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-dark-text mb-2">
                  New Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={handlePasswordChange}
                    onFocus={() => setPasswordFocused(true)}
                    onBlur={() =>
                      setTimeout(() => setPasswordFocused(false), 200)
                    }
                    className="w-full px-4 py-2 pr-10 bg-dark-bg text-dark-text border border-dark-border rounded-lg focus:outline-none focus:border-brand-primary"
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
                {newPassword && (
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
                {passwordFocused && newPassword && (
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
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Resetting Password...
                  </span>
                ) : (
                  "Reset Password"
                )}
              </button>
            </form>
          )}

          {step === 3 && (
            <div className="text-center">
              <div className="flex justify-center mb-4">
                <div className="relative">
                  <MessageSquare className="w-16 h-16 text-green-500 animate-pulse" />
                  <div className="absolute inset-0 bg-green-500 opacity-20 blur-xl rounded-full"></div>
                </div>
              </div>
              <h3 className="text-xl font-bold text-dark-text mb-2">
                Password Reset Successful!
              </h3>
              <p className="text-dark-text-secondary mb-4">
                Your password has been updated successfully.
              </p>
              <p className="text-sm text-dark-text-secondary mb-6">
                Redirecting to login page in 2 seconds...
              </p>
              <p className="text-sm text-dark-text-secondary mb-6"></p>
            </div>
          )}

          <div className="mt-6 text-center">
            <p className="text-dark-text-secondary text-sm">
              Remember your password?{" "}
              <Link
                to="/login"
                className="text-brand-primary hover:text-brand-primary-hover font-medium transition-colors"
              >
                Back to Login
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
