import axios from "axios";

// ✅ FIX: Use environment variable with fallback
const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:5001/api";

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    "Content-Type": "application/json",
    "Cache-Control": "no-cache",
    "Pragma": "no-cache",
  },
  timeout: 30000, // ✅ FIX: Add timeout
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Disable caching
    config.headers["Cache-Control"] = "no-cache";
    config.headers["Pragma"] = "no-cache";

    // ✅ FIX: Allow FormData uploads (photo upload)
    if (config.data instanceof FormData) {
      delete config.headers["Content-Type"];
    }

    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("isAuthenticated");
      console.warn("Unauthorized – token cleared");
      window.dispatchEvent(new Event('auth-token-cleared'));

      // ✅ FIX: Only redirect if not already on login page
      if (!window.location.hash.includes('/login')) {
        window.location.hash = '#/login';
      }
    }

    // ✅ FIX: Log network errors
    if (!error.response) {
      console.error("Network error:", error.message);
    }

    return Promise.reject(error);
  }
);

export default api;