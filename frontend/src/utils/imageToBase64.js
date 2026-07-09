/**
 * Convert image URL to base64 string
 * Useful for PDF generation and offline storage
 * 
 * @param {string} url - Image URL to convert
 * @returns {Promise<string|null>} Base64 string or null on error
 */
export const imageUrlToBase64 = async (url) => {
  if (!url) return null;

  // Already base64
  if (url.startsWith("data:image")) {
    return url;
  }

  try {
    const response = await fetch(url, {
      // ✅ FIX: Add credentials for authenticated requests
      credentials: 'include',
      mode: 'cors'
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const blob = await response.blob();

    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = () => reject(new Error('Failed to read blob'));
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error("Failed to convert image to base64:", error);
    return null;
  }
};

/**
 * Convert File object to base64 string
 * @param {File} file - File object from input
 * @returns {Promise<string|null>} Base64 string or null on error
 */
export const fileToBase64 = (file) => {
  return new Promise((resolve, reject) => {
    if (!file) {
      resolve(null);
      return;
    }
    
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
};

export default imageUrlToBase64;