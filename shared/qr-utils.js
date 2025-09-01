// qr-utils.js - QR code parsing utilities
// Using jsQR library for QR code decoding

// Parse QR code from image data
async function parseQRCodeFromImage(imageData) {
  try {
    // Create canvas to process image
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    // Set canvas dimensions
    canvas.width = imageData.width;
    canvas.height = imageData.height;
    
    // Draw image on canvas
    ctx.drawImage(imageData, 0, 0);
    
    // Get image data from canvas
    const imageDataObj = ctx.getImageData(0, 0, canvas.width, canvas.height);
    
    // Use jsQR to decode (this would require including the jsQR library)
    // For now, we'll simulate the parsing
    const code = jsQR(imageDataObj.data, imageDataObj.width, imageDataObj.height);
    
    if (code) {
      return code.data;
    }
    return null;
  } catch (error) {
    console.error('Error parsing QR code:', error);
    return null;
  }
}

// Parse OTP information from QR code content
function parseOTPFromQRContent(content) {
  try {
    // Example OTP QR code format: 
    // otpauth://totp/Issuer:Label?secret=SECRET&issuer=Issuer
    
    if (!content || !content.startsWith('otpauth://')) {
      return null;
    }
    
    const url = new URL(content);
    const path = url.pathname; // /Issuer:Label or /Label
    
    // Extract issuer and label
    let issuer = '';
    let label = '';
    
    // Parse issuer from query params first
    if (url.searchParams.has('issuer')) {
      issuer = url.searchParams.get('issuer');
    }
    
    // Parse label and issuer from path
    if (path.startsWith('/')) {
      const pathContent = path.substring(1); // Remove leading slash
      if (pathContent.includes(':')) {
        const parts = pathContent.split(':');
        if (!issuer) {
          issuer = parts[0]; // Use issuer from path if not in query params
        }
        label = parts.slice(1).join(':'); // Join remaining parts as label
      } else {
        label = pathContent;
      }
    }
    
    // Extract secret
    const secret = url.searchParams.get('secret');
    
    if (secret) {
      return {
        issuer: issuer || 'Unknown',
        label: label || 'Unknown',
        secret: secret
      };
    }
    
    return null;
  } catch (error) {
    console.error('Error parsing OTP from QR content:', error);
    return null;
  }
}

// Export functions
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { parseQRCodeFromImage, parseOTPFromQRContent };
}