import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { authAPI } from "../../services/api/auth.api";
import "./login.css";

const Login = () => {
  const navigate = useNavigate();
  const { login: authLogin, isAuthenticated } = useAuth();

  const [email, setEmail] = useState(() => localStorage.getItem("rememberedEmail") || "");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [rememberMe, setRememberMe] = useState(() => !!localStorage.getItem("rememberedEmail"));

  const demoEmail = "admin@example.com";
  const demoPassword = "admin123";

  const handleDemoFill = () => {
    setEmail(demoEmail);
    setPassword(demoPassword);
    setError("");
    setSuccess("");
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!email || !password) {
      setError("Email and password are required");
      return;
    }

    try {
      setLoading(true);
      const response = await authAPI.login({
        email: email.trim(),
        password
      });

      if (response.data.success) {
        setSuccess("Login successful! Redirecting...");

        if (rememberMe) {
          localStorage.setItem("rememberedEmail", email.trim());
        } else {
          localStorage.removeItem("rememberedEmail");
        }

        // ✅ FIX: Use AuthContext login — saves token, adminEmail, isAuthenticated, sets user, navigates
        setTimeout(() => {
          authLogin(response.data.token, response.data.admin?.email || email.trim(), rememberMe);
        }, 500);
      } else {
        setError("Login failed");
        setLoading(false);
      }
    } catch (error) {
      setError(error.response?.data?.message || "Login failed");
      setLoading(false);
    }
  };

  // ✅ FIX: Use AuthContext's isAuthenticated instead of raw localStorage
  useEffect(() => {
    if (isAuthenticated) {
      navigate("/", { replace: true });
    }
  }, [isAuthenticated, navigate]);

  return (
    <div className="login-container">
      {/* Decorative Background Shapes */}
      <div className="shape shape-1"></div>
      <div className="shape shape-2"></div>
      <div className="shape shape-3"></div>

      <div className="login-wrapper">
        <form className="login-card glass-effect" onSubmit={handleLogin}>
          
          {/* Header */}
          <div className="login-header">
            <div className="login-icon-wrapper">
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              >
                <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                <polyline points="10 17 15 12 10 7" />
                <line x1="15" y1="12" x2="3" y2="12" />
              </svg>
            </div>
            <h2 className="login-title">Welcome Back</h2>
            <p className="login-subtitle">Hostel Management Admin</p>
          </div>

          {/* Message Banners */}
          <div className={`message-banner-container ${error ? 'visible' : ''}`}>
            {error && (
              <div className="message-banner error glass-inner">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                <span>{error}</span>
              </div>
            )}
          </div>

          <div className={`message-banner-container ${success ? 'visible' : ''}`}>
             {success && (
              <div className="message-banner success glass-inner">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                <span>{success}</span>
              </div>
            )}
          </div>

          {/* Form Fields */}
          <div className="input-group">
            <label className="input-label">Email Address</label>
            <div className="input-wrapper glass-input">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="input-icon">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                <polyline points="22,6 12,13 2,6"></polyline>
              </svg>
              <input
                type="email"
                placeholder="admin@example.com"
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div className="input-group">
            <label className="input-label">Password</label>
            <div className="input-wrapper glass-input">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="input-icon">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
              </svg>
              <input
                type="password"
                placeholder="••••••••"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          {/* Remember Me */}
          <label className="remember-me">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
            />
            <span>Remember me</span>
          </label>

          {/* Action Button */}
          <button
            type="submit"
            className={`login-button ${loading ? 'loading' : ''}`}
            disabled={loading || success}
          >
            {loading || success ? (
              <div className="spinner-wrapper">
                <div className="spinner"></div>
                <span>{success ? "Success" : "Processing..."}</span>
              </div>
            ) : (
              <>
                <span>Sign In</span>
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
              </>
            )}
          </button>

          {/* Demo Credentials Section */}
          <div className="demo-section glass-inner" onClick={handleDemoFill}>
            <div className="demo-header">
              <span className="demo-badge">Demo Access</span>
              <span className="demo-hint">Tap to autofill</span>
            </div>
            <div className="demo-details">
              <div className="demo-row">
                <span className="label">User:</span>
                <span className="value">{demoEmail}</span>
              </div>
              <div className="demo-row">
                <span className="label">Pass:</span>
                <span className="value">admin123</span>
              </div>
            </div>
          </div>

        </form>
        
        <p className="footer-text">© 2025 Hostel Management System</p>
      </div>
    </div>
  );
};

export default Login;