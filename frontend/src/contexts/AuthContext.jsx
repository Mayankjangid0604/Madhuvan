import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // ✅ Check auth function with 24h Remember-Me grace period
  const checkAuth = useCallback(() => {
    const token = localStorage.getItem('token');
    const email = localStorage.getItem('adminEmail');
    const isAuth = localStorage.getItem('isAuthenticated') === 'true';
    const rememberMe = localStorage.getItem('rememberMe') === 'true';
    const lastActiveAt = Number(localStorage.getItem('lastActiveAt') || 0);
    const now = Date.now();
    const idleMs = now - lastActiveAt;
    const IDLE_GRACE = 24 * 60 * 60 * 1000; // 24 hours

    if (token && isAuth && email) {
      if (rememberMe && idleMs > IDLE_GRACE) {
        localStorage.removeItem('token');
        localStorage.removeItem('isAuthenticated');
        setUser(null);
      } else {
        setUser({ email, token });
        localStorage.setItem('lastActiveAt', String(now));
      }
    } else {
      setUser(null);
    }
    setLoading(false);
  }, []);

  // Refresh lastActiveAt as the user interacts with the app.
  useEffect(() => {
    if (!user) return;
    const bump = () => localStorage.setItem('lastActiveAt', String(Date.now()));
    window.addEventListener('mousemove', bump, { passive: true });
    window.addEventListener('keydown', bump, { passive: true });
    window.addEventListener('click', bump, { passive: true });
    const interval = setInterval(bump, 60_000);
    return () => {
      window.removeEventListener('mousemove', bump);
      window.removeEventListener('keydown', bump);
      window.removeEventListener('click', bump);
      clearInterval(interval);
    };
  }, [user]);

  useEffect(() => {
    checkAuth();

    // Listen for storage changes (login/logout from another tab)
    const handleStorageChange = (e) => {
      if (e.key === 'token' || e.key === 'isAuthenticated') {
        checkAuth();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('auth-token-cleared', checkAuth);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('auth-token-cleared', checkAuth);
    };
  }, [checkAuth]);

  // ✅ Login function
  const login = useCallback((token, email, rememberMe = false) => {
    localStorage.setItem('token', token);
    localStorage.setItem('adminEmail', email);
    localStorage.setItem('isAuthenticated', 'true');
    localStorage.setItem('rememberMe', rememberMe ? 'true' : 'false');
    localStorage.setItem('lastActiveAt', String(Date.now()));
    setUser({ email, token });
    navigate('/');
  }, [navigate]);

  // ✅ Update stored credentials (used after username change)
  const updateAuth = useCallback((token, email) => {
    if (token) localStorage.setItem('token', token);
    if (email) localStorage.setItem('adminEmail', email);
    localStorage.setItem('isAuthenticated', 'true');
    setUser({ email: email || localStorage.getItem('adminEmail'), token: token || localStorage.getItem('token') });
  }, []);

  // ✅ Logout function
  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('adminEmail');
    localStorage.removeItem('isAuthenticated');
    setUser(null);
    navigate('/login');
  }, [navigate]);

  // ✅ Check if user is authenticated
  const isAuthenticated = !!user;

  return (
    <AuthContext.Provider value={{
      user,
      login,
      logout,
      loading,
      isAuthenticated,
      checkAuth,
      updateAuth
    }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export default AuthContext;