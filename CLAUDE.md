# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a browser extension for generating and managing OTP (One-Time Password) tokens. It works with Chrome, Firefox, and other Chromium-based browsers. The extension implements TOTP (Time-based One-Time Password) generation according to RFC 6238.

## Architecture

The extension follows a standard browser extension structure:

- `manifest.json` - Extension manifest (MV3)
- `background/` - Background service worker for storage initialization
- `popup/` - Main UI shown when clicking the extension icon
- `options/` - Settings page for managing tokens
- `shared/` - Common utilities and styles
- `icons/` - Extension icons
- `dist/` - Built extension files (generated)

## Key Components

1. **OTP Generation** (`shared/otp-utils.js`):
   - Implements TOTP algorithm with HMAC-SHA1
   - Base32 decoding for secret keys
   - Time-based counter calculation
   - Dynamic truncation for 6-digit codes

2. **Storage**:
   - Uses `chrome.storage.local` for token persistence
   - Tokens stored as array of {issuer, label, secret} objects

3. **UI Components**:
   - Popup: Shows active OTP tokens with countdown timers
   - Options: Add/edit/delete tokens, import/export functionality

## Development Commands

- `npm install` - Install dependencies
- `npm run build` - Build extension to `dist/` folder
- `npm run dev` - Watch for changes and automatically rebuild
- `npm run serve` - Serve built extension locally for testing

## Build Process

The build process (`build.js`) copies all files except `node_modules`, `dist`, `build.js`, `package.json`, and `package-lock.json` to the `dist/` directory. The `dist/` folder is the one that gets loaded into browsers.

## Important Notes

- All data is stored locally in the browser
- Secrets are never transmitted over the network
- The extension has no external dependencies in the built version
- Modify files in the root directory, not in `dist/`
- The `dist/` folder is automatically generated and should not be modified directly