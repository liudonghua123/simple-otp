// otp-utils.js - Complete OTP implementation

// Base32 decoding function
function base32toHex(s) {
  const base32Chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = "";
  let hex = "";
  
  // Convert base32 to binary
  for (let i = 0; i < s.length; i++) {
    const val = base32Chars.indexOf(s.charAt(i).toUpperCase());
    if (val === -1) continue; // Skip invalid characters
    
    bits += val.toString(2).padStart(5, '0');
  }
  
  // Pad bits to make length multiple of 4
  while (bits.length % 4 !== 0) {
    bits += '0';
  }
  
  // Convert binary to hex
  for (let i = 0; i < bits.length; i += 4) {
    const chunk = bits.substr(i, 4);
    hex += parseInt(chunk, 2).toString(16);
  }
  
  return hex;
}

// Left pad with zeros
function leftpad(str, len, pad) {
  if (str.length >= len) return str;
  return (new Array(len).join(pad || '0') + str).slice(-len);
}

// Hex to bytes
function hexToBytes(hex) {
  const bytes = [];
  for (let i = 0; i < hex.length; i += 2) {
    bytes.push(parseInt(hex.substr(i, 2), 16));
  }
  return new Uint8Array(bytes);
}

// String to bytes
function stringToBytes(str) {
  const encoder = new TextEncoder();
  return encoder.encode(str);
}

// Bytes to hex
function bytesToHex(bytes) {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

// Generate HMAC-SHA1
async function hmacSha1(key, data) {
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    key,
    { name: 'HMAC', hash: { name: 'SHA-1' } },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, data);
  return new Uint8Array(signature);
}

// Generate OTP
async function generateOTP(secret) {
  try {
    // Decode secret from base32
    const hexSecret = base32toHex(secret);
    const key = hexToBytes(hexSecret);
    
    // Get counter value (time-based)
    const epoch = Math.round(Date.now() / 1000.0);
    const counter = Math.floor(epoch / 30);
    
    // Convert counter to bytes (8 bytes, big endian)
    const counterBuffer = new ArrayBuffer(8);
    const counterView = new DataView(counterBuffer);
    counterView.setUint32(0, 0); // High 32 bits (0 for current use cases)
    counterView.setUint32(4, counter); // Low 32 bits
    const counterBytes = new Uint8Array(counterBuffer);
    
    // Generate HMAC-SHA1
    const hmac = await hmacSha1(key, counterBytes);
    
    // Dynamic truncation
    const offset = hmac[hmac.length - 1] & 0xf;
    const binary = 
      ((hmac[offset] & 0x7f) << 24) |
      ((hmac[offset + 1] & 0xff) << 16) |
      ((hmac[offset + 2] & 0xff) << 8) |
      (hmac[offset + 3] & 0xff);
    
    // Generate 6-digit OTP
    const otp = binary % 1000000;
    return leftpad(otp.toString(), 6, '0');
  } catch (e) {
    console.error("Error generating OTP:", e);
    return "ERROR";
  }
}

// Export functions for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { generateOTP };
}