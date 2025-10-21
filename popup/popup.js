// popup.js
document.addEventListener('DOMContentLoaded', async function() {
  // Initialize i18n
  await initI18n();
  updatePopupTexts();
  
  const tokenList = document.getElementById('tokenList');
  const refreshBtn = document.getElementById('refreshBtn');
  const settingsBtn = document.getElementById('settingsBtn');
  const addTokenBtn = document.getElementById('addTokenBtn');
  
  // Load tokens from storage
  async function loadTokens() {
    const result = await chrome.storage.local.get(['otpTokens']);
    const tokens = result.otpTokens || [];
    
    if (tokens.length === 0) {
      tokenList.innerHTML = `
        <div class="popup-empty-state">
          <p id="noTokensFound">${t('noTokensFound')}</p>
          <button id="addTokenBtn">${t('addToken')}</button>
        </div>
      `;
      document.getElementById('addTokenBtn')?.addEventListener('click', () => {
        chrome.runtime.openOptionsPage();
      });
      return;
    }
    
    // Clear the list
    tokenList.innerHTML = '';
    
    // Generate OTP cards
    for (const token of tokens) {
      const otp = await generateOTP(token.secret);
      const card = createTokenCard(token, otp);
      tokenList.appendChild(card);
    }
    
    // Update progress bars
    updateProgressBars();
    
    // Add event listener to new add token button if it exists
    const newAddTokenBtn = document.getElementById('addTokenBtn');
    if (newAddTokenBtn) {
      newAddTokenBtn.addEventListener('click', () => {
        chrome.runtime.openOptionsPage();
      });
    }
  }
  
  // Create a token card element
  function createTokenCard(token, otp) {
    const card = document.createElement('div');
    card.className = 'token-card';
    card.innerHTML = `
      <div class="token-header">
        <h3 class="token-label">${token.label}</h3>
        <span class="token-issuer">${token.issuer}</span>
      </div>
      <div class="token-content">
        <div class="progress-container" title="${t('tokenExpiresIn')} ${30 - (new Date().getSeconds() % 30)} ${t('seconds')}">
          <svg class="progress-ring" width="30" height="30">
            <circle class="progress-ring-circle"
                    stroke="#e9ecef"
                    stroke-width="3"
                    fill="transparent"
                    r="12"
                    cx="15"
                    cy="15"/>
            <circle class="progress-ring-circle progress"
                    stroke="#4361ee"
                    stroke-width="3"
                    fill="transparent"
                    r="12"
                    cx="15"
                    cy="15"
                    stroke-dasharray="75.4 75.4"
                    stroke-dashoffset="0"/>
          </svg>
        </div>
        <span class="otp-value">${otp}</span>
        <div class="token-actions">
          <button class="copy-btn icon-btn" data-otp="${otp}" title="${t('copyToClipboard')}">📋</button>
          <button class="autofill-btn icon-btn" data-otp="${otp}" data-url="${token.url || ''}" data-selector="${token.selector || ''}" title="Auto-fill OTP">📥</button>
        </div>
      </div>
    `;
    
    // Add copy functionality
    const copyBtn = card.querySelector('.copy-btn');
    copyBtn.addEventListener('click', () => {
      navigator.clipboard.writeText(otp).then(() => {
        const originalText = copyBtn.textContent;
        copyBtn.textContent = '✓';
        copyBtn.title = t('copied');
        setTimeout(() => {
          copyBtn.textContent = originalText;
          copyBtn.title = t('copyToClipboard');
        }, 2000);
      });
    });
    
    // Add auto-fill functionality
    const autofillBtn = card.querySelector('.autofill-btn');
    autofillBtn.addEventListener('click', async () => {
      const url = autofillBtn.dataset.url;
      const selector = autofillBtn.dataset.selector;
      
      // Check if URL and selector are provided
      if (!url || !selector) {
        alert('URL and selector are not configured for this token.');
        return;
      }
      
      // Get current active tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      // Check if we have a valid tab with URL
      if (!tab || !tab.url) {
        alert('Unable to get current page URL. Please make sure you are on a web page or proper permission configured in manifest.json.');
        return;
      }
      
      // Check if current tab URL matches the token URL
      if (!tab.url.includes(url)) {
        alert(`Current page does not match the configured URL. Expected: ${url}`);
        return;
      }
      
      // Execute script to fill the OTP
      try {
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: (selector, otp) => {
            console.info(`auto fill otp for ${otp} using ${selector}`);
            const element = document.querySelector(selector);
            if (element) {
              element.value = otp;
              element.dispatchEvent(new Event('input', { bubbles: true }));
              element.dispatchEvent(new Event('change', { bubbles: true }));
              return true;
            }
            return false;
          },
          args: [selector, otp]
        });
        
        // Show success feedback
        const originalText = autofillBtn.textContent;
        autofillBtn.textContent = '✓';
        setTimeout(() => {
          autofillBtn.textContent = originalText;
        }, 2000);
      } catch (error) {
        console.error('Auto-fill error:', error);
        alert('Failed to auto-fill OTP. Check console for details.');
      }
    });
    
    return card;
  }
  
  // Update all progress bars
  function updateProgressBars() {
    const progressCircles = document.querySelectorAll('.progress-ring-circle.progress');
    const now = new Date();
    const seconds = now.getSeconds();
    const progress = 30 - (seconds % 30); // 30-second intervals
    
    progressCircles.forEach(circle => {
      const offset = 75.4 * (progress / 30);
      circle.style.strokeDashoffset = 75.4 - offset;
      
      // Make it red if less than 10 seconds remaining
      if (progress <= 10) {
        circle.style.stroke = '#f72585';
        circle.classList.add('warning');
      } else {
        circle.style.stroke = '#4361ee';
        circle.classList.remove('warning');
      }
      
      // Update title with remaining time
      const parentContainer = circle.closest('.progress-container');
      if (parentContainer) {
        parentContainer.title = `${t('tokenExpiresIn')} ${progress} ${t('seconds')}`;
      }
    });
  }
  
  // Update popup UI texts
  function updatePopupTexts() {
    document.getElementById('popupTitle').textContent = t('popupTitle');
    const noTokensFoundElement = document.getElementById('noTokensFound');
    if (noTokensFoundElement) {
      noTokensFoundElement.textContent = t('noTokensFound');
    }
    const addTokenBtnElement = document.getElementById('addTokenBtn');
    if (addTokenBtnElement) {
      addTokenBtnElement.textContent = t('addToken');
    }
    // Update button titles
    document.getElementById('refreshBtn').title = t('refresh');
    document.getElementById('settingsBtn').title = t('settings');
  }
  
  // Refresh tokens
  refreshBtn.addEventListener('click', loadTokens);
  
  // Open settings page
  settingsBtn.addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });
  
  // Add token button
  if (addTokenBtn) {
    addTokenBtn.addEventListener('click', () => {
      chrome.runtime.openOptionsPage();
    });
  }
  
  // Initial load
  await loadTokens();
  
  // Update every second
  setInterval(() => {
    updateProgressBars();
  }, 1000);
  
  // Refresh tokens every 30 seconds
  setInterval(async () => {
    await loadTokens();
  }, 30000);
});