// options.js
document.addEventListener('DOMContentLoaded', async function() {
  // Initialize i18n
  await initI18n();
  
  // Get DOM elements
  const tokenForm = document.getElementById('tokenForm');
  const tokenList = document.getElementById('tokenList');
  const exportBtn = document.getElementById('exportBtn');
  const importBtn = document.getElementById('importBtn');
  const importFile = document.getElementById('importFile');
  const addTokenBtn = document.getElementById('addTokenBtn');
  const addTokenModal = document.getElementById('addTokenModal');
  const modalClose = document.querySelector('.modal-close');
  const modalCancel = document.querySelector('.modal-cancel');
  const languageSelector = document.getElementById('languageSelector');
  const chooseImageButton = document.getElementById('chooseImageButton');
  const qrImageInput = document.getElementById('qrImageInput');
  const qrResultMessage = document.getElementById('qrResultMessage');
  
  // Set initial language selection
  const currentLang = getCurrentLanguage();
  languageSelector.value = currentLang === 'en-US' || currentLang === 'zh-CN' ? currentLang : 'auto';
  
  // Update UI texts after elements are defined
  updateUITexts();
  
  // Load and display tokens
  async function loadTokens() {
    const result = await chrome.storage.local.get(['otpTokens']);
    const tokens = result.otpTokens || [];
    
    if (tokens.length === 0) {
      tokenList.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">🔒</div>
          <h3 id="noTokensFoundOptions">${t('noTokensFoundOptions')}</h3>
          <p id="noTokensFoundMessage">${t('noTokensFoundMessage')}</p>
        </div>
      `;
      return;
    }
    
    tokenList.innerHTML = '';
    
    tokens.forEach((token, index) => {
      const tokenElement = document.createElement('div');
      tokenElement.className = 'token-item';
      tokenElement.draggable = true;
      tokenElement.dataset.index = index;
      const urlDisplay = token.url ? `<span class="token-url">${token.url}</span>` : '';
      tokenElement.innerHTML = `
        <div class="token-info">
          <div class="drag-handle">☰</div>
          <div class="token-text">
            <strong>${token.issuer}</strong>
            <span>${token.label}</span>
            ${urlDisplay}
          </div>
        </div>
        <div class="token-actions">
          <button class="btn-secondary edit-btn" data-index="${index}">${t('edit')}</button>
          <button class="btn-danger delete-btn" data-index="${index}">${t('delete')}</button>
        </div>
      `;
      tokenList.appendChild(tokenElement);
    });
    
    // Add event listeners for delete buttons
    document.querySelectorAll('.delete-btn').forEach(button => {
      button.addEventListener('click', async (e) => {
        e.stopPropagation(); // Prevent drag events from firing
        const index = parseInt(e.target.dataset.index);
        await deleteToken(index);
      });
    });

    // Add event listeners for edit buttons
    document.querySelectorAll('.edit-btn').forEach(button => {
      button.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent drag events from firing
        const index = parseInt(e.target.dataset.index);
        editToken(index);
      });
    });

    // Add drag and drop event listeners for token reordering
    document.querySelectorAll('.token-item').forEach((item, index) => {
      item.addEventListener('dragstart', handleDragStart);
      item.addEventListener('dragover', handleDragOver);
      item.addEventListener('dragenter', handleDragEnter);
      item.addEventListener('dragleave', handleDragLeave);
      item.addEventListener('drop', handleDrop);
      item.addEventListener('dragend', handleDragEnd);
    });
  }
  
  // Drag and drop handlers
  let draggedItem = null;

  function handleDragStart(e) {
    draggedItem = this;
    this.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', this.innerHTML);
  }

  function handleDragOver(e) {
    e.preventDefault(); // Necessary to allow drop
    e.dataTransfer.dropEffect = 'move';
    return false;
  }

  function handleDragEnter(e) {
    this.classList.add('drag-over');
  }

  function handleDragLeave(e) {
    this.classList.remove('drag-over');
  }

  function handleDrop(e) {
    e.stopPropagation(); // Prevent events from firing on parent elements

    if (draggedItem !== this) {
      // Get all token items
      const tokenItems = Array.from(document.querySelectorAll('.token-item'));
      const fromIndex = tokenItems.indexOf(draggedItem);
      const toIndex = tokenItems.indexOf(this);

      // Reorder tokens in storage
      reorderTokens(fromIndex, toIndex);
    }

    this.classList.remove('drag-over');
    return false;
  }

  function handleDragEnd(e) {
    document.querySelectorAll('.token-item').forEach(item => {
      item.classList.remove('drag-over');
      item.classList.remove('dragging');
    });
    draggedItem = null;
  }

  // Reorder tokens in storage
  async function reorderTokens(fromIndex, toIndex) {
    const result = await chrome.storage.local.get(['otpTokens']);
    const tokens = result.otpTokens || [];

    if (fromIndex >= 0 && fromIndex < tokens.length && toIndex >= 0 && toIndex < tokens.length) {
      // Remove the token from its current position and insert it at the new position
      const [movedToken] = tokens.splice(fromIndex, 1);
      tokens.splice(toIndex, 0, movedToken);

      // Save the reordered tokens
      await chrome.storage.local.set({ otpTokens: tokens });

      // Refresh the token list to reflect the new order
      await loadTokens();
    }
  }

  // Add or update a token
  async function saveToken(issuer, label, secret, url = '', selector = '', index = -1) {
    const result = await chrome.storage.local.get(['otpTokens']);
    let tokens = result.otpTokens || [];

    const newToken = { issuer, label, secret, url, selector };

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
        document.getElementById('url').value = token.url || '';
        document.getElementById('selector').value = token.selector || '';
        
        // Show modal
        addTokenModal.style.display = 'flex';
        
        // Change form to update mode
        tokenForm.dataset.editIndex = index;
        document.getElementById('addTokenButton').textContent = t('updateTokenButton');
        document.getElementById('addTokenModalTitle').textContent = t('updateTokenButton');
        updateUITexts(); // Update texts to reflect edit mode
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
          throw new Error(t('invalidFileFormat'));
        }
        
        // Validate each token
        for (const token of tokens) {
          if (!token.issuer || !token.label || !token.secret) {
            throw new Error(t('invalidTokenFormat'));
          }
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

          // Add default values for new fields if not present
          newToken.url = newToken.url || '';
          newToken.selector = newToken.selector || '';

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
    addTokenModal.style.display = 'flex';
    tokenForm.reset();
    delete tokenForm.dataset.editIndex;
    document.getElementById('addTokenButton').textContent = t('addTokenButton');
    document.getElementById('addTokenModalTitle').textContent = t('addNewToken');
    // Clear QR result message
    qrResultMessage.textContent = '';
    qrResultMessage.className = 'helper-text';
    updateUITexts(); // Update texts to reflect add mode
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
    const url = document.getElementById('url').value;
    const selector = document.getElementById('selector').value;
    
    const editIndex = tokenForm.dataset.editIndex;
    
    if (editIndex !== undefined) {
      // Update existing token
      await saveToken(issuer, label, secret, url, selector, parseInt(editIndex));
    } else {
      // Add new token
      await saveToken(issuer, label, secret, url, selector);
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
  
  // Language selector event listener
  languageSelector.addEventListener('change', async function() {
    const selectedLang = this.value;
    if (selectedLang === 'auto') {
      // Reset to auto-detection
      localStorage.removeItem('otp-language');
      await initI18n();
    } else {
      await setLanguage(selectedLang);
    }
    updateUITexts();
    await loadTokens();
  });
  
  // Function to process QR code image
  async function processQRImage(file) {
    try {
      // Create image element from file
      const img = new Image();
      const objectUrl = URL.createObjectURL(file);

      img.onload = async function() {
        try {
          // Create canvas to process image
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');

          // Set canvas dimensions
          canvas.width = img.width;
          canvas.height = img.height;

          // Draw image on canvas
          ctx.drawImage(img, 0, 0);

          // Get image data from canvas
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

          // Use jsQR to decode
          const code = jsQR(imageData.data, imageData.width, imageData.height);

          if (code) {
            // Parse OTP information from QR content
            const otpInfo = parseOTPFromQRContent(code.data);

            if (otpInfo) {
              // Fill form fields with parsed data
              document.getElementById('issuer').value = otpInfo.issuer;
              document.getElementById('label').value = otpInfo.label;
              document.getElementById('secret').value = otpInfo.secret;

              // Show success message
              qrResultMessage.textContent = t('imageParsingSuccess');
              qrResultMessage.className = 'helper-text';
              qrResultMessage.style.color = 'green';
            } else {
              // Show error message
              qrResultMessage.textContent = t('imageParsingError') + ': Invalid OTP format';
              qrResultMessage.className = 'helper-text';
              qrResultMessage.style.color = 'red';
            }
          } else {
            // Show error message
            qrResultMessage.textContent = t('imageParsingError') + ': No QR code found';
            qrResultMessage.className = 'helper-text';
            qrResultMessage.style.color = 'red';
          }

          // Clean up object URL
          URL.revokeObjectURL(objectUrl);
        } catch (error) {
          console.error('Error processing QR code:', error);
          qrResultMessage.textContent = t('imageParsingError') + ': ' + error.message;
          qrResultMessage.className = 'helper-text';
          qrResultMessage.style.color = 'red';
          URL.revokeObjectURL(objectUrl);
        }
      };

      img.onerror = function() {
        qrResultMessage.textContent = t('imageParsingError') + ': Failed to load image';
        qrResultMessage.className = 'helper-text';
        qrResultMessage.style.color = 'red';
        URL.revokeObjectURL(objectUrl);
      };

      img.src = objectUrl;
    } catch (error) {
      console.error('Error reading QR code image:', error);
      qrResultMessage.textContent = t('imageParsingError') + ': ' + error.message;
      qrResultMessage.className = 'helper-text';
      qrResultMessage.style.color = 'red';
    }
  }

  // QR Code image upload event listener
  chooseImageButton.addEventListener('click', () => {
    qrImageInput.click();
  });

  // Drag and drop functionality
  const dragDropArea = document.getElementById('dragDropArea');

  dragDropArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    dragDropArea.classList.add('dragover');
  });

  dragDropArea.addEventListener('dragleave', () => {
    dragDropArea.classList.remove('dragover');
  });

  dragDropArea.addEventListener('drop', (e) => {
    e.preventDefault();
    dragDropArea.classList.remove('dragover');

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      // Check if the file is an image
      if (file.type.startsWith('image/')) {
        processQRImage(file);
      } else {
        qrResultMessage.textContent = t('imageParsingError') + ': Please drop an image file';
        qrResultMessage.className = 'helper-text';
        qrResultMessage.style.color = 'red';
      }
    }
  });

  // Click on drag area to select file
  dragDropArea.addEventListener('click', () => {
    qrImageInput.click();
  });

  // Handle QR image input change
  qrImageInput.addEventListener('change', async function(event) {
    const file = event.target.files[0];
    if (!file) return;
    processQRImage(file);
  });

  // Paste functionality
  document.addEventListener('paste', async (e) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        e.preventDefault();
        const file = items[i].getAsFile();
        if (file) {
          processQRImage(file);
          break;
        }
      }
    }
  });

  // Update UI texts based on current language
  function updateUITexts() {
    // Update page titles and texts
    document.getElementById('optionsTitle').textContent = t('optionsTitle');
    document.getElementById('optionsSubtitle').textContent = t('optionsSubtitle');
    document.getElementById('addNewToken').textContent = t('addNewToken');
    document.getElementById('importExport').textContent = t('importExport');
    document.getElementById('importExportSubtitle').textContent = t('importExportSubtitle');
    document.getElementById('exportTokens').textContent = t('exportTokens');
    document.getElementById('importTokens').textContent = t('importTokens');
    document.getElementById('importHelperText').textContent = t('importHelperText');
    document.getElementById('savedTokens').textContent = t('savedTokens');
    document.getElementById('savedTokensSubtitle').textContent = t('savedTokensSubtitle');
    document.getElementById('noTokensFoundOptions').textContent = t('noTokensFoundOptions');
    document.getElementById('noTokensFoundMessage').textContent = t('noTokensFoundMessage');
    document.getElementById('languageLabel').textContent = t('language') + ':';

    // Update form labels and helpers
    document.getElementById('issuerLabel').textContent = t('issuer');
    document.getElementById('issuer').placeholder = t('issuerPlaceholder');
    document.getElementById('issuerHelperText').textContent = t('issuerHelperText');
    document.getElementById('labelLabel').textContent = t('label');
    document.getElementById('label').placeholder = t('labelPlaceholder');
    document.getElementById('labelHelperText').textContent = t('labelHelperText');
    document.getElementById('secretLabel').textContent = t('secretKey');
    document.getElementById('secret').placeholder = t('secretKeyPlaceholder');
    document.getElementById('secretHelperText').textContent = t('secretKeyHelperText');
    document.getElementById('urlLabel').textContent = t('urlLabel') || 'Applicable URL (Optional)';
    document.getElementById('url').placeholder = t('urlPlaceholder') || 'e.g., https://example.com';
    document.getElementById('urlHelperText').textContent = t('urlHelperText') || 'The URL where this token is applicable (e.g., https://example.com)';
    document.getElementById('selectorLabel').textContent = t('selectorLabel') || 'OTP Input Selector (Optional)';
    document.getElementById('selector').placeholder = t('selectorPlaceholder') || 'e.g., input#otp-code';
    document.getElementById('selectorHelperText').textContent = t('selectorHelperText') || 'CSS selector for the OTP input field (e.g., input#otp-code, #otp-input)';

    // Update QR code section
    document.getElementById('scanQRCodeLabel').textContent = t('scanQRCode');
    document.getElementById('chooseImageText').textContent = t('chooseImage');
    document.getElementById('dragDropText').textContent = t('dragDropText');
    document.getElementById('pasteInstruction').textContent = t('pasteInstruction');
    document.getElementById('scanQRCodeHelper').textContent = t('scanQRCodeHelper');

    // Update button texts based on mode
    const addTokenButton = document.getElementById('addTokenButton');
    const cancelButton = document.getElementById('cancelButton');
    if (tokenForm && tokenForm.dataset.editIndex !== undefined) {
      addTokenButton.textContent = t('updateTokenButton');
    } else {
      addTokenButton.textContent = t('addTokenButton');
    }
    cancelButton.textContent = t('cancel');
    
    // Update language selector options
    document.getElementById('autoOption').textContent = t('auto');
    document.getElementById('englishOption').textContent = t('english');
    document.getElementById('chineseOption').textContent = t('chinese');
    
    // Update modal title based on mode
    const modalTitle = document.getElementById('addTokenModalTitle');
    if (tokenForm && tokenForm.dataset.editIndex !== undefined) {
      modalTitle.textContent = t('updateTokenButton');
    } else {
      modalTitle.textContent = t('addNewToken');
    }
  }
  
  // Initial load
  await loadTokens();
});