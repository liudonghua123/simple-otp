// popup.js
document.addEventListener('DOMContentLoaded', async function() {
  const tokenList = document.getElementById('tokenList');
  const refreshBtn = document.getElementById('refreshBtn');
  const addTokenBtn = document.getElementById('addTokenBtn');
  
  // Load tokens from storage
  async function loadTokens() {
    const result = await chrome.storage.local.get(['otpTokens']);
    const tokens = result.otpTokens || [];
    
    if (tokens.length === 0) {
      tokenList.innerHTML = `
        <div class="empty-state">
          <p>No OTP tokens found</p>
          <button id="addTokenBtn">Add Token</button>
        </div>
      `;
      document.getElementById('addTokenBtn').addEventListener('click', () => {
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
        <span class="otp-value">${otp}</span>
        <button class="copy-btn" data-otp="${otp}">Copy</button>
      </div>
      <div class="token-footer">
        <span class="issuer">${token.issuer}</span>
        <div class="progress-container">
          <svg class="progress-ring" width="30" height="30">
            <circle class="progress-ring-circle" 
                    stroke="#e0e0e0" 
                    stroke-width="3" 
                    fill="transparent" 
                    r="12" 
                    cx="15" 
                    cy="15"/>
            <circle class="progress-ring-circle progress" 
                    stroke="#4f46e5" 
                    stroke-width="3" 
                    fill="transparent" 
                    r="12" 
                    cx="15" 
                    cy="15"
                    stroke-dasharray="75.4 75.4"
                    stroke-dashoffset="0"/>
          </svg>
        </div>
      </div>
    `;
    
    // Add copy functionality
    const copyBtn = card.querySelector('.copy-btn');
    copyBtn.addEventListener('click', () => {
      navigator.clipboard.writeText(otp).then(() => {
        const originalText = copyBtn.textContent;
        copyBtn.textContent = 'Copied!';
        setTimeout(() => {
          copyBtn.textContent = originalText;
        }, 2000);
      });
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
        circle.style.stroke = '#ef4444';
        circle.classList.add('warning');
      } else {
        circle.style.stroke = '#4f46e5';
        circle.classList.remove('warning');
      }
    });
  }
  
  // Refresh tokens
  refreshBtn.addEventListener('click', loadTokens);
  
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