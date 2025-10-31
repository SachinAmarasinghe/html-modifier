/**
 * HTML Email Modifier Application
 * Refactored for better maintainability, error handling, and code organization
 */

// ============================================================================
// CONSTANTS
// ============================================================================

const CONSTANTS = {
  TABLE_WIDTH: '650',
  MAX_WIDTH: '650px',
  BASE_TD_STYLE: 'font-size: 0px; color: #fff; padding: 0px;',
  IMG_BASE_STYLE: 'display:block;line-height:0;font-size:0;height:auto; width: 100%;',
  TAB_ACTIVE_CLASSES: ['text-accent', 'border-accent', 'border-b-2'],
  TAB_INACTIVE_CLASS: 'text-graymail',
};

// ============================================================================
// DOM ELEMENT REFERENCES (cached for performance)
// ============================================================================

const DOM = {
  modifyBtn: null,
  copyBtn: null,
  tabCode: null,
  tabPreview: null,
  inputHtml: null,
  imageUrl: null,
  description: null,
  campaignMedium: null,
  campaignName: null,
  responsiveToggle: null,
  outputHtml: null,
  outputHtmlDisplay: null,
  previewFrame: null,
  codeView: null,
  previewView: null,
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Safely get DOM element by ID
 * @param {string} id - Element ID
 * @returns {HTMLElement|null} - Element or null if not found
 */
function getElement(id) {
  const element = document.getElementById(id);
  if (!element) {
    console.error(`Element with ID "${id}" not found`);
  }
  return element;
}

/**
 * Initialize DOM element cache
 * @returns {boolean} - True if all required elements found
 */
function initializeDOMElements() {
  DOM.modifyBtn = getElement('modifyBtn');
  DOM.copyBtn = getElement('copyBtn');
  DOM.tabCode = getElement('tabCode');
  DOM.tabPreview = getElement('tabPreview');
  DOM.inputHtml = getElement('inputHtml');
  DOM.imageUrl = getElement('imageUrl');
  DOM.description = getElement('description');
  DOM.campaignMedium = getElement('campaignMedium');
  DOM.campaignName = getElement('campaignName');
  DOM.responsiveToggle = getElement('responsiveToggle');
  DOM.outputHtml = getElement('outputHtml');
  DOM.outputHtmlDisplay = getElement('outputHtmlDisplay');
  DOM.previewFrame = getElement('previewFrame');
  DOM.codeView = getElement('codeView');
  DOM.previewView = getElement('previewView');

  // Check critical elements
  return !!(
    DOM.modifyBtn &&
    DOM.inputHtml &&
    DOM.imageUrl &&
    DOM.outputHtml &&
    DOM.outputHtmlDisplay &&
    DOM.previewFrame
  );
}

/**
 * Show user notification (better UX than alert)
 * @param {string} message - Message to display
 * @param {string} type - 'success' or 'error'
 */
function showNotification(message, type = 'success') {
  // Try to use a toast library if available, otherwise fall back to alert
  if (typeof window.toastr !== 'undefined') {
    window.toastr[type === 'success' ? 'success' : 'error'](message);
  } else {
    // Fallback to alert but with better message
    alert(message);
  }
}

/**
 * Normalize image URL to handle trailing slashes
 * @param {string} baseUrl - Base image URL
 * @param {string} src - Source path from image
 * @returns {string} - Normalized URL
 */
function normalizeImageUrl(baseUrl, src) {
  if (!baseUrl) return src;
  
  // Remove trailing slashes from baseUrl
  const normalizedBase = baseUrl.replace(/\/+$/, '');
  
  // Ensure src starts with exactly one slash (add if missing)
  let normalizedSrc = src;
  if (!normalizedSrc.startsWith('/')) {
    normalizedSrc = '/' + normalizedSrc;
  } else {
    normalizedSrc = normalizedSrc.replace(/^\/+/, '/'); // Normalize multiple slashes
  }
  
  // Combine with exactly one slash between
  return `${normalizedBase}${normalizedSrc}`;
}

/**
 * Safely parse and update URL with UTM parameters
 * @param {string} href - Original href value
 * @param {string} medium - UTM medium
 * @param {string} campaign - UTM campaign name
 * @returns {string} - Updated href or original if parsing fails
 */
function addUTMParameters(href, medium, campaign) {
  try {
    const url = new URL(href, window.location.href);
    url.searchParams.set('utm_medium', medium);
    url.searchParams.set('utm_campaign', campaign);
    return url.toString();
  } catch (error) {
    console.warn('Failed to parse URL:', href, error);
    return href; // Return original if parsing fails
  }
}

// ============================================================================
// HTML TRANSFORMATION FUNCTIONS
// ============================================================================

/**
 * Remove height attribute from table elements
 * @param {string} html - HTML string
 * @returns {string} - Modified HTML
 */
function removeTableHeight(html) {
  return html.replace(/(<table[^>]*) height="[^"]*"/g, '$1');
}

/**
 * Update table elements with responsive or fixed width
 * @param {string} html - HTML string
 * @param {boolean} isResponsive - Whether to make responsive
 * @returns {string} - Modified HTML
 */
function updateTableAttributes(html, isResponsive) {
  const tablePattern = /<table(.*?)>/g;

  if (isResponsive) {
    return html.replace(
      tablePattern,
      `<table role="presentation" align="center" width="100%" border="0" cellpadding="0" cellspacing="0"$1 style="max-width: ${CONSTANTS.MAX_WIDTH};">`
    );
  } else {
    return html.replace(
      tablePattern,
      `<table role="presentation" align="center" width="${CONSTANTS.TABLE_WIDTH}" border="0" cellpadding="0" cellspacing="0"$1>`
    );
  }
}

/**
 * Remove colspan attributes from td elements
 * @param {string} html - HTML string
 * @returns {string} - Modified HTML
 */
function removeColspan(html) {
  // Remove only the colspan attribute, preserving other attributes
  return html.replace(/<td([^>]*?)\s*colspan\s*=\s*"[^"]*"([^>]*?)>/g, '<td$1$2>');
}

/**
 * Apply base styles to all td elements (reusable function)
 * @param {string} html - HTML string
 * @returns {string} - Modified HTML
 */
function applyTDStyles(html) {
  // First pass: Handle all td with empty style attribute (style="" or style='')
  // Use a simpler, more direct approach - find and replace style="" with our base style
  html = html.replace(
    /<td([^>]*?)\s+style\s*=\s*["']\s*["']([^>]*?)>/gi,
    (match, before, after) => {
      const beforeAttrs = (before || '').trim();
      const afterAttrs = (after || '').trim();
      const combinedAttrs = (beforeAttrs + ' ' + afterAttrs).trim();
      
      if (combinedAttrs) {
        return `<td ${combinedAttrs} style="${CONSTANTS.BASE_TD_STYLE}">`;
      }
      return `<td style="${CONSTANTS.BASE_TD_STYLE}">`;
    }
  );
  
  // Also catch style="" when it appears as the only or first attribute (no space before style)
  html = html.replace(
    /<td\s+style\s*=\s*["']\s*["']([^>]*?)>/gi,
    (match, after) => {
      const afterAttrs = (after || '').trim();
      if (afterAttrs) {
        return `<td ${afterAttrs} style="${CONSTANTS.BASE_TD_STYLE}">`;
      }
      return `<td style="${CONSTANTS.BASE_TD_STYLE}">`;
    }
  );
  
  // Catch any remaining empty style attributes with a very simple pattern
  // This catches: <td style="">, <td style=''>, <td  style="" >, etc.
  html = html.replace(
    /(<td[^>]*?)\s+style\s*=\s*["']\s*["']\s*([^>]*?)(>)/gi,
    (match, before, after, closing) => {
      const beforeAttrs = (before || '').trim();
      const afterAttrs = (after || '').trim();
      const combined = (beforeAttrs + ' ' + afterAttrs).trim();
      
      if (combined) {
        return `<td ${combined} style="${CONSTANTS.BASE_TD_STYLE}">`;
      }
      return `<td style="${CONSTANTS.BASE_TD_STYLE}">`;
    }
  );
  
  // Handle td with existing non-empty style attribute
  html = html.replace(
    /<td([^>]*?)style\s*=\s*["']([^"']+)["']([^>]*?)>/gi,
    (match, p1, styleValue, p3) => {
      // Skip if already processed (contains our base style)
      if (styleValue && styleValue.includes('font-size: 0px')) {
        return match;
      }
      const attrs = ((p1 || '') + (p3 || '')).trim();
      const trimmedStyle = styleValue.trim();
      if (!trimmedStyle) {
        // Empty after trim, treat as empty style
        if (attrs) {
          return `<td ${attrs} style="${CONSTANTS.BASE_TD_STYLE}">`;
        }
        return `<td style="${CONSTANTS.BASE_TD_STYLE}">`;
      }
      const newStyle = `${CONSTANTS.BASE_TD_STYLE} ${trimmedStyle}`;
      if (attrs) {
        return `<td ${attrs} style="${newStyle}">`;
      }
      return `<td style="${newStyle}">`;
    }
  );
  
  // Handle td without style attribute (must be last to catch all remaining td elements)
  html = html.replace(
    /<td([^>]*?)>/g,
    (match, attrs) => {
      // Skip if already has style attribute (processed by earlier patterns)
      if (attrs && /style\s*=\s*["']/.test(attrs)) {
        return match;
      }
      // Add style attribute
      const trimmedAttrs = (attrs || '').trim();
      if (trimmedAttrs) {
        return `<td ${trimmedAttrs} style="${CONSTANTS.BASE_TD_STYLE}">`;
      } else {
        return `<td style="${CONSTANTS.BASE_TD_STYLE}">`;
      }
    }
  );
  
  return html;
}

/**
 * Update image sources and styles
 * @param {string} html - HTML string
 * @param {string} imageUrl - Base image URL
 * @param {boolean} isResponsive - Whether responsive mode is enabled
 * @returns {string} - Modified HTML
 */
function updateImages(html, imageUrl, isResponsive) {
  // Update image src and style
  html = html.replace(/<img([^>]*)src="([^"]*)"/g, (match, p1, src) => {
    const newSrc = normalizeImageUrl(imageUrl, src);
    const styleMatch = /style="([^"]*)"/.exec(p1);
    let newStyle = CONSTANTS.IMG_BASE_STYLE;
    
    if (styleMatch) {
      newStyle += ' ' + styleMatch[1];
      return `<img${p1.replace(styleMatch[0], '')} style="${newStyle}" src="${newSrc}"`;
    } else {
      return `<img${p1} style="${newStyle}" src="${newSrc}"`;
    }
  });

  // Update image dimensions for responsive mode
  if (isResponsive) {
    html = html.replace(/<img([^>]*)width="[^"]*"/g, '<img$1 width="100%"');
    html = html.replace(/<img([^>]*)height="[^"]*"/g, '<img$1 height="auto"');
  }

  return html;
}

/**
 * Add preview text description row
 * @param {string} html - HTML string
 * @param {string} description - Preview text
 * @returns {string} - Modified HTML
 */
function addDescriptionRow(html, description) {
  if (!description) return html;
  
  // Description row only needs color: #fff; without other base styles
  const descRow = `<tr><td style="color: #fff;">${description}</td></tr>`;
  return html.replace(/(<table[^>]*>)/, `$1${descRow}`);
}

/**
 * Wrap multi-column rows in nested tables
 * @param {string} html - HTML string
 * @param {boolean} isResponsive - Whether responsive mode is enabled
 * @returns {string} - Modified HTML
 */
function wrapMultiColumnRows(html, isResponsive) {
  const parser = document.createElement('div');
  parser.innerHTML = html;
  
  parser.querySelectorAll('table').forEach((table) => {
    const rows = table.querySelectorAll('tr');
    
    rows.forEach((row) => {
      const columns = row.querySelectorAll('td');
      
      // Wrap if multiple columns and no colspan
      if (
        columns.length > 1 &&
        !Array.from(columns).some((td) => td.hasAttribute('colspan'))
      ) {
        const newTable = document.createElement('table');
        newTable.setAttribute('role', 'presentation');
        newTable.setAttribute('align', 'center');
        
        if (isResponsive) {
          newTable.setAttribute('width', '100%');
          newTable.setAttribute('style', `max-width: ${CONSTANTS.MAX_WIDTH};`);
        } else {
          newTable.setAttribute('width', CONSTANTS.TABLE_WIDTH);
        }
        
        newTable.setAttribute('border', '0');
        newTable.setAttribute('cellpadding', '0');
        newTable.setAttribute('cellspacing', '0');
        newTable.appendChild(row.cloneNode(true));
        
        row.innerHTML = `<td style="${CONSTANTS.BASE_TD_STYLE}"></td>`;
        row.querySelector('td').appendChild(newTable);
      }
    });
  });

  return parser.innerHTML;
}

/**
 * Remove duplicate style declarations
 * @param {string} html - HTML string
 * @returns {string} - Modified HTML
 */
function removeDuplicateStyles(html) {
  // Remove duplicate base styles
  // Pattern matches: font-size: 0px; color: #fff; padding: 0px;
  const baseStylePattern = 'font-size:\\s*0px;\\s*color:\\s*#fff;\\s*padding:\\s*0px;\\s*';
  
  html = html.replace(
    new RegExp(`style="([^"]*?)(${baseStylePattern})(.*?)(${baseStylePattern})([^"]*?)"`, 'g'),
    'style="$1$3$5"'
  );
  
  // Remove single duplicate
  html = html.replace(
    new RegExp(`style="([^"]*?)(${baseStylePattern})([^"]*)"`, 'g'),
    'style="$1$3"'
  );

  return html;
}

/**
 * Add UTM parameters to all anchor tags
 * @param {string} html - HTML string
 * @param {string} medium - UTM medium
 * @param {string} campaign - UTM campaign name
 * @returns {string} - Modified HTML
 */
function addUTMToLinks(html, medium, campaign) {
  if (!medium || !campaign) return html;
  
  return html.replace(/<a([^>]*)href="([^"]*)"/g, (match, p1, href) => {
    const updatedHref = addUTMParameters(href, medium, campaign);
    return `<a${p1}href="${updatedHref}"`;
  });
}

/**
 * Main HTML transformation pipeline
 * @param {string} html - Original HTML
 * @param {Object} options - Transformation options
 * @returns {string} - Modified HTML
 */
function transformHTML(html, options) {
  const {
    imageUrl,
    description,
    campaignMedium,
    campaignName,
    isResponsive,
  } = options;
  
  // Apply transformations in order
  html = removeTableHeight(html);
  html = updateTableAttributes(html, isResponsive);
  html = removeColspan(html);
  html = applyTDStyles(html);
  html = updateImages(html, imageUrl, isResponsive);
  html = addDescriptionRow(html, description);
  html = wrapMultiColumnRows(html, isResponsive);
  html = applyTDStyles(html); // Re-apply after DOM manipulation
  html = removeDuplicateStyles(html);
  html = addUTMToLinks(html, campaignMedium, campaignName);
  
  return html;
}

// ============================================================================
// UI FUNCTIONS
// ============================================================================

/**
 * Update output areas with modified HTML
 * @param {string} html - Modified HTML string
 */
function updateOutput(html) {
  if (!html) {
    showNotification('No HTML to display', 'error');
    return;
  }
  
  // Update textarea (hidden)
  if (DOM.outputHtml) {
    DOM.outputHtml.value = html;
  }
  
  // Update code display
  if (DOM.outputHtmlDisplay) {
    DOM.outputHtmlDisplay.textContent = html;
    
    // Highlight syntax if Prism is available
    if (typeof Prism !== 'undefined') {
      try {
        Prism.highlightElement(DOM.outputHtmlDisplay);
      } catch (error) {
        console.warn('Prism highlighting failed:', error);
      }
    }
  }
  
  // Update preview iframe
  if (DOM.previewFrame) {
    try {
      DOM.previewFrame.srcdoc = html;
    } catch (error) {
      console.warn('Failed to update preview frame:', error);
    }
  }
}

/**
 * Switch between code and preview tabs
 * @param {string} activeTab - 'code' or 'preview'
 */
function switchTab(activeTab) {
  if (!DOM.codeView || !DOM.previewView || !DOM.tabCode || !DOM.tabPreview) {
    return;
  }
  
  const isCodeView = activeTab === 'code';
  
  // Toggle views
  if (isCodeView) {
    DOM.codeView.classList.remove('hidden');
    DOM.previewView.classList.add('hidden');
  } else {
    DOM.codeView.classList.add('hidden');
    DOM.previewView.classList.remove('hidden');
  }
  
  // Update tab styles
  if (isCodeView) {
    DOM.tabCode.classList.add(...CONSTANTS.TAB_ACTIVE_CLASSES);
    DOM.tabCode.classList.remove(CONSTANTS.TAB_INACTIVE_CLASS);
    DOM.tabPreview.classList.remove(...CONSTANTS.TAB_ACTIVE_CLASSES);
    DOM.tabPreview.classList.add(CONSTANTS.TAB_INACTIVE_CLASS);
  } else {
    DOM.tabPreview.classList.add(...CONSTANTS.TAB_ACTIVE_CLASSES);
    DOM.tabPreview.classList.remove(CONSTANTS.TAB_INACTIVE_CLASS);
    DOM.tabCode.classList.remove(...CONSTANTS.TAB_ACTIVE_CLASSES);
    DOM.tabCode.classList.add(CONSTANTS.TAB_INACTIVE_CLASS);
  }
}

/**
 * Copy HTML to clipboard
 */
async function copyToClipboard() {
  if (!DOM.outputHtml) {
    showNotification('Output area not found', 'error');
    return;
  }
  
  const htmlContent = DOM.outputHtml.value;
  
  if (!htmlContent.trim()) {
    showNotification('No HTML to copy', 'error');
    return;
  }
  
  try {
    await navigator.clipboard.writeText(htmlContent);
    showNotification('HTML copied to clipboard!', 'success');
  } catch (error) {
    console.error('Copy failed:', error);
    showNotification('Failed to copy to clipboard', 'error');
  }
}

// ============================================================================
// EVENT HANDLERS
// ============================================================================

/**
 * Handle modify button click
 */
function handleModifyClick() {
  // Validate inputs
  if (!DOM.inputHtml || !DOM.inputHtml.value.trim()) {
    showNotification('Please enter HTML code', 'error');
    return;
  }
  
  if (!DOM.imageUrl || !DOM.imageUrl.value.trim()) {
    showNotification('Base Image URL is required', 'error');
    DOM.imageUrl?.focus();
    return;
  }
  
  try {
    // Gather input values
    const html = DOM.inputHtml.value;
    const imageUrl = DOM.imageUrl.value.trim();
    const description = DOM.description?.value.trim() || '';
    const campaignMedium = DOM.campaignMedium?.value.trim() || '';
    const campaignName = DOM.campaignName?.value.trim() || '';
    const isResponsive = DOM.responsiveToggle?.checked || false;
    
    // Transform HTML
    const modifiedHTML = transformHTML(html, {
      imageUrl,
      description,
      campaignMedium,
      campaignName,
      isResponsive,
    });
    
    // Update output
    updateOutput(modifiedHTML);
    
    // Show success notification
    showNotification('HTML modified successfully!', 'success');
  } catch (error) {
    console.error('Error modifying HTML:', error);
    showNotification('An error occurred while modifying HTML', 'error');
  }
}

/**
 * Initialize event listeners
 */
function initializeEventListeners() {
  // Modify button
  if (DOM.modifyBtn) {
    DOM.modifyBtn.addEventListener('click', handleModifyClick);
  }
  
  // Copy button
  if (DOM.copyBtn) {
    DOM.copyBtn.addEventListener('click', copyToClipboard);
  }
  
  // Tab toggles
  if (DOM.tabCode) {
    DOM.tabCode.addEventListener('click', () => switchTab('code'));
  }
  
  if (DOM.tabPreview) {
    DOM.tabPreview.addEventListener('click', () => switchTab('preview'));
  }
}

// ============================================================================
// INITIALIZATION
// ============================================================================

/**
 * Initialize application when DOM is ready
 */
function initialize() {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
    return;
  }
  
  // Initialize DOM elements
  if (!initializeDOMElements()) {
    console.error('Failed to initialize: Required DOM elements not found');
    return;
  }
  
  // Initialize event listeners
  initializeEventListeners();
  
  console.log('HTML Email Modifier initialized successfully');
}

// Start initialization
initialize();
