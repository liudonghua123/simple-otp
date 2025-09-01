// background.js
// Background script for the OTP extension

// Initialize storage if needed
chrome.runtime.onInstalled.addListener(async () => {
  const result = await chrome.storage.local.get(['otpTokens']);
  if (!result.otpTokens) {
    await chrome.storage.local.set({ otpTokens: [] });
  }
});

// Listen for messages from popup or options page
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "generateOTP") {
    // In a real implementation, we would generate the OTP here
    // For now, we'll just send a response
    sendResponse({ otp: "123456" });
  }
});