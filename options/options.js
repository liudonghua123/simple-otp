// options.js
document.addEventListener('DOMContentLoaded', async function() {
  const tokenForm = document.getElementById('tokenForm');
  const tokenList = document.getElementById('tokenList');
  const exportBtn = document.getElementById('exportBtn');
  const importBtn = document.getElementById('importBtn');
  const importFile = document.getElementById('importFile');
  const addTokenBtn = document.getElementById('addTokenBtn');
  const addTokenModal = document.getElementById('addTokenModal');
  const modalClose = document.querySelector('.modal-close');
  const modalCancel = document.querySelector('.modal-cancel');
  
  // Load and display tokens
  async function loadTokens() {
    const result = await chrome.storage.local.get(['otpTokens']);
    const tokens = result.otpTokens || [];
    
    if (tokens.length === 0) {
      tokenList.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">🔒</div>
          <h3>No Tokens Found</h3>
          <p>Add your first token using the "Add New Token" button above</p>
        </div>
      `;
      return;
    }
    
    tokenList.innerHTML = '';
    
    tokens.forEach((token, index) => {
      const tokenElement = document.createElement('div');
      tokenElement.className = 'token-item';
      tokenElement.innerHTML = `
        <div class="token-info">
          <strong>${token.issuer}</strong>
          <span>${token.label}</span>
        </div>
        <div class="token-actions">
          <button class="btn-secondary edit-btn" data-index="${index}">Edit</button>
          <button class="btn-danger delete-btn" data-index="${index}">Delete</button>
        </div>
      `;
      tokenList.appendChild(tokenElement);
    });
    
    // Add event listeners for delete buttons
    document.querySelectorAll('.delete-btn').forEach(button => {
      button.addEventListener('click', async (e) => {
        const index = parseInt(e.target.dataset.index);
        await deleteToken(index);
      });
    });
    
    // Add event listeners for edit buttons
    document.querySelectorAll('.edit-btn').forEach(button => {
      button.addEventListener('click', (e) => {
        const index = parseInt(e.target.dataset.index);
        editToken(index);
      });
    });
  }
  
  // Add or update a token
  async function saveToken(issuer, label, secret, index = -1) {
    const result = await chrome.storage.local.get(['otpTokens']);
    let tokens = result.otpTokens || [];
    
    const newToken = { issuer, label, secret };
    
    if (index >= 0 && index < tokens.length) {
      // Update existing token
      tokens[index] = newToken;
    } else {
      // Add new token
      tokens.push(newToken);
    }
    
    await chrome.storage.local.set({ otpTokens: tokens });
  }
  
  // Delete a token
  async function deleteToken(index) {
    const result = await chrome.storage.local.get(['otpTokens']);
    const tokens = result.otpTokens || [];
    
    if (index >= 0 && index < tokens.length) {
      tokens.splice(index, 1);
      await chrome.storage.local.set({ otpTokens: tokens });
      await loadTokens(); // Refresh the list
    }
  }
  
  // Edit a token
  function editToken(index) {
    chrome.storage.local.get(['otpTokens'], function(result) {
      const tokens = result.otpTokens || [];
      if (index >= 0 && index < tokens.length) {
        const token = tokens[index];
        document.getElementById('issuer').value = token.issuer;
        document.getElementById('label').value = token.label;
        document.getElementById('secret').value = token.secret;
        
        // Show modal
        addTokenModal.style.display = 'block';
        
        // Change form to update mode
        tokenForm.dataset.editIndex = index;
        tokenForm.querySelector('button[type="submit"]').textContent = 'Update Token';
      }
    });
  }
  
  // Export tokens to JSON file
  async function exportTokens() {
    const result = await chrome.storage.local.get(['otpTokens']);
    const tokens = result.otpTokens || [];
    
    const dataStr = JSON.stringify(tokens, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = 'otp-tokens.json';
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  }
  
  // Import tokens from JSON file
  async function importTokens(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = async function(e) {
      try {
        const tokens = JSON.parse(e.target.result);
        
        // Validate tokens structure
        if (!Array.isArray(tokens)) {
          throw new Error('Invalid file format: expected an array of tokens');
        }
        
        // Get existing tokens
        const result = await chrome.storage.local.get(['otpTokens']);
        let existingTokens = result.otpTokens || [];
        
        // Count new and updated tokens
        let newCount = 0;
        let updatedCount = 0;
        
        // Merge tokens: replace existing ones with same issuer/label, add new ones
        tokens.forEach(newToken => {
          // Validate token structure
          if (!newToken.issuer || !newToken.label || !newToken.secret) {
            console.warn('Skipping invalid token:', newToken);
            return;
          }
          
          // Check if token with same issuer and label already exists
          const existingIndex = existingTokens.findIndex(
            t => t.issuer === newToken.issuer && t.label === newToken.label
          );
          
          if (existingIndex >= 0) {
            // Replace existing token
            existingTokens[existingIndex] = newToken;
            updatedCount++;
          } else {
            // Add new token
            existingTokens.push(newToken);
            newCount++;
          }
        });
        
        // Save merged tokens
        await chrome.storage.local.set({ otpTokens: existingTokens });
        
        // Refresh the list
        await loadTokens();
        
        // Show success message
        alert(`Successfully imported tokens!
${newCount} new tokens added
${updatedCount} tokens updated`);
      } catch (error) {
        console.error('Error importing tokens:', error);
        alert('Error importing tokens: ' + error.message);
      }
    };
    
    reader.readAsText(file);
  }
  
  // Show modal
  function showModal() {
    addTokenModal.style.display = 'block';
    tokenForm.reset();
    delete tokenForm.dataset.editIndex;
    tokenForm.querySelector('button[type="submit"]').textContent = 'Add Token';
  }
  
  // Hide modal
  function hideModal() {
    addTokenModal.style.display = 'none';
  }
  
  // Handle form submission
  tokenForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const issuer = document.getElementById('issuer').value;
    const label = document.getElementById('label').value;
    const secret = document.getElementById('secret').value;
    
    const editIndex = tokenForm.dataset.editIndex;
    
    if (editIndex !== undefined) {
      // Update existing token
      await saveToken(issuer, label, secret, parseInt(editIndex));
    } else {
      // Add new token
      await saveToken(issuer, label, secret);
    }
    
    // Hide modal
    hideModal();
    
    // Refresh token list
    await loadTokens();
  });
  
  // Export button event listener
  exportBtn.addEventListener('click', exportTokens);
  
  // Import button event listener
  importBtn.addEventListener('click', () => {
    importFile.click();
  });
  
  // Add token button event listener
  addTokenBtn.addEventListener('click', showModal);
  
  // Modal close event listeners
  modalClose.addEventListener('click', hideModal);
  modalCancel.addEventListener('click', hideModal);
  
  // Close modal when clicking outside of it
  window.addEventListener('click', (e) => {
    if (e.target === addTokenModal) {
      hideModal();
    }
  });
  
  // Import file event listener
  importFile.addEventListener('change', importTokens);
  
  // Initial load
  await loadTokens();
});