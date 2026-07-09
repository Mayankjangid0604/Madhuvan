/**
 * Image URL Utility
 * 
 * Converts various photo URL formats to fully qualified URLs:
 * - Relative paths: /uploads/students/photo.jpg
 * - Absolute Windows paths: C:\path\to\photo.jpg
 * - Data URLs: data:image/jpeg;base64,...
 * - Full URLs: http://...
 * 
 * @param {string} photoUrl - The photo URL from the database
 * @returns {string|null} - Fully qualified URL or null
 */

const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001';
const BASE_URL = API_URL.replace('/api', '');

export const getImageUrl = (photoUrl) => {
  if (!photoUrl) return null;
  
  // Already a full URL
  if (photoUrl.startsWith('http://') || photoUrl.startsWith('https://')) {
    return photoUrl;
  }
  
  // Data URL (base64 encoded image)
  if (photoUrl.startsWith('data:')) {
    return photoUrl;
  }
  
  // Absolute Windows path - extract filename and construct proper URL
  if (photoUrl.includes(':\\') || photoUrl.startsWith('C:')) {
    const filename = photoUrl.split(/[\\\/]/).pop();
    
    // Determine folder based on filename prefix
    if (filename.startsWith('student-')) {
      return `${BASE_URL}/uploads/students/${filename}`;
    }
    if (filename.startsWith('member-')) {
      return `${BASE_URL}/uploads/members/${filename}`;
    }
    if (filename.startsWith('logo-')) {
      return `${BASE_URL}/uploads/logos/${filename}`;
    }
    
    // Fallback for unknown pattern
    return `${BASE_URL}/uploads/${filename}`;
  }
  
  // Relative path starting with /
  if (photoUrl.startsWith('/')) {
    return `${BASE_URL}${photoUrl}`;
  }
  
  // Relative path without leading /
  return `${BASE_URL}/${photoUrl}`;
};

/**
 * Get image URL with fallback to default avatar
 * 
 * @param {string} photoUrl - The photo URL from the database
 * @param {string} defaultAvatar - Default avatar path or URL
 * @returns {string} - Image URL with fallback
 */
export const getImageUrlWithFallback = (photoUrl, defaultAvatar = '/image/default-avatar.png') => {
  return getImageUrl(photoUrl) || defaultAvatar;
};

export default getImageUrl;
