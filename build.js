// build.js
const fs = require('fs-extra');
const path = require('path');

const sourceDir = __dirname;
const buildDir = path.join(__dirname, 'dist');

// Files and directories to exclude from build
const exclude = [
  'node_modules',
  'dist',
  'build.js',
  'package.json',
  'package-lock.json'
];

// Copy files to dist directory
async function build() {
  console.log('Building extension...');
  
  // Clean dist directory
  await fs.remove(buildDir);
  await fs.ensureDir(buildDir);
  
  // Copy all files except excluded ones
  for (const item of await fs.readdir(sourceDir)) {
    if (!exclude.includes(item)) {
      const srcPath = path.join(sourceDir, item);
      const destPath = path.join(buildDir, item);
      await fs.copy(srcPath, destPath);
    }
  }
  
  console.log('Build complete!');
}

// Run build
build().catch(console.error);