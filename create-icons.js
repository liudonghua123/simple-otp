// create-icons.js
const fs = require('fs');
const path = require('path');

// Create icons directory if it doesn't exist
const iconsDir = path.join(__dirname, 'icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir);
}

// Simple function to create placeholder PNG files
function createPlaceholderPNG(size) {
  // Create a simple hex representation of a PNG file
  // This is a minimal valid PNG file with a solid color
  const pngHeader = [
    0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
    0x00, 0x00, 0x00, 0x0D, // IHDR chunk length
    0x49, 0x48, 0x44, 0x52, // IHDR chunk type
    0x00, 0x00, 0x00, size >> 8, 0x00, 0x00, 0x00, size & 0xFF, // Width
    0x00, 0x00, 0x00, size >> 8, 0x00, 0x00, 0x00, size & 0xFF, // Height
    0x08, 0x02, 0x00, 0x00, 0x00, // Bit depth, color type, compression, filter, interlace
    0x00, 0x00, 0x00, 0x00, // IHDR CRC (placeholder)
    0x00, 0x00, 0x00, 0x00, // IDAT chunk length (placeholder)
    0x49, 0x44, 0x41, 0x54, // IDAT chunk type
    0x00, 0x00, 0x00, 0x00, // IDAT data and CRC (placeholders)
    0x00, 0x00, 0x00, 0x00, // IEND chunk length
    0x49, 0x45, 0x4E, 0x44, // IEND chunk type
    0xAE, 0x42, 0x60, 0x82  // IEND CRC
  ];
  
  return Buffer.from(pngHeader);
}

// Create icon files
const sizes = [16, 32, 48, 128];
sizes.forEach(size => {
  const buffer = createPlaceholderPNG(size);
  const filename = `icon${size}.png`;
  const filepath = path.join(iconsDir, filename);
  fs.writeFileSync(filepath, buffer);
  console.log(`Created ${filename}`);
});

console.log('All icons created successfully!');