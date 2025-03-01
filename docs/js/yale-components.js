/**
 * Yale Component Library
 * Combined JavaScript implementation for all Yale UI components
 */

// Component scripts are loaded directly in the HTML

// Initialize all components when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
  // Initialize accessibility enhancements
  if (typeof initYaleAccessibility === 'function') {
    window.YaleAccessibility = initYaleAccessibility();
  }
  
  // Initialize tab components
  if (typeof initYaleTabs === 'function') {
    initYaleTabs();
  }
  
  // Initialize accordion components
  if (typeof initYaleAccordion === 'function') {
    initYaleAccordion();
  }
  
  // Initialize modal components
  if (typeof initYaleModal === 'function') {
    window.YaleModal = initYaleModal();
  }
  
  // Initialize toast notifications
  if (typeof initYaleToast === 'function') {
    window.YaleToast = initYaleToast();
  }
  
  // Trigger a library loaded event
  document.dispatchEvent(new CustomEvent('yale:components:loaded'));
});

// Create a global namespace for Yale components
window.Yale = {
  // Method to reinitialize components after dynamic content is added
  refresh: function() {
    if (typeof initYaleTabs === 'function') {
      initYaleTabs();
    }
    
    if (typeof initYaleAccordion === 'function') {
      initYaleAccordion();
    }
    
    document.dispatchEvent(new CustomEvent('yale:components:refreshed'));
  }
};