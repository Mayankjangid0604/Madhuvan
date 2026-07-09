/**
 * Image/File URL utility
 * Handles Electron, browser, and various path formats
 */

const isElectron =
  typeof window !== "undefined" &&
  window.navigator.userAgent.toLowerCase().includes("electron");

// ✅ FIX: Use environment variable with proper fallback
const getBaseUrl = () => {
  // For Electron, always use localhost
  if (isElectron) {
    return "http://localhost:5001";
  }
  
  // For browser, check environment variable
  const envBase = import.meta.env.VITE_API_BASE_URL;
  if (envBase) {
    // Remove /api suffix if present (we need base URL for static files)
    return envBase.replace(/\/api\/?$/, '');
  }
  
  return "http://localhost:5001";
};

function normalizePath(p) {
  if (!p) return "";
  
  // Ensure path starts with /
  let path = p.startsWith("/") ? p : `/${p}`;
  
  // Ensure uploads path is correct
  if (!path.startsWith("/uploads/") && !path.startsWith("/api/")) {
    // If path doesn't start with uploads, check if it's a relative upload path
    if (path.includes("uploads/")) {
      path = "/" + path.substring(path.indexOf("uploads/"));
    }
  }
  
  return path;
}

/**
 * Get full image source URL
 * @param {string} path - Image path (can be relative, absolute, base64, or full URL)
 * @returns {string} Full image URL
 */
export function getImageSrc(path) {
  if (!path) return "";

  // Already base64 or absolute URL
  if (
    path.startsWith("data:image") ||
    path.startsWith("http://") ||
    path.startsWith("https://")
  ) {
    return path;
  }

  const cleanPath = normalizePath(path);
  const baseUrl = getBaseUrl();

  return `${baseUrl}${cleanPath}`;
}

/**
 * Alias for getImageSrc (for backwards compatibility)
 */
export function getFileUrl(path) {
  return getImageSrc(path);
}

/**
 * Get upload directory URL
 * @param {string} type - Type of upload (students, logos, members)
 * @returns {string} Upload directory URL
 */
export function getUploadUrl(type = "") {
  const baseUrl = getBaseUrl();
  const subPath = type ? `/${type}` : "";
  return `${baseUrl}/uploads${subPath}`;
}

export default getImageSrc;