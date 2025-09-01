// i18n.js - Internationalization support
let currentLanguage = 'en-US';
let translations = {};

// Detect browser language
function detectLanguage() {
  const storedLang = localStorage.getItem('otp-language');
  if (storedLang) {
    return storedLang;
  }
  
  // Auto-detect based on browser language
  const browserLang = navigator.language || navigator.userLanguage;
  if (browserLang.startsWith('zh')) {
    return 'zh-CN';
  }
  return 'en-US';
}

// Load translations for a specific language
async function loadTranslations(lang) {
  try {
    const response = await fetch(`../locales/${lang}.json`);
    if (response.ok) {
      translations = await response.json();
      currentLanguage = lang;
      return true;
    }
  } catch (error) {
    console.error(`Failed to load translations for ${lang}:`, error);
  }
  return false;
}

// Initialize i18n
async function initI18n() {
  const lang = detectLanguage();
  if (!(await loadTranslations(lang))) {
    // Fallback to English
    await loadTranslations('en-US');
  }
  return currentLanguage;
}

// Get translated string
function t(key) {
  return translations[key] || key;
}

// Set language
async function setLanguage(lang) {
  if (await loadTranslations(lang)) {
    localStorage.setItem('otp-language', lang);
    return true;
  }
  return false;
}

// Get current language
function getCurrentLanguage() {
  return currentLanguage;
}

// Export functions
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { initI18n, t, setLanguage, getCurrentLanguage, detectLanguage };
}