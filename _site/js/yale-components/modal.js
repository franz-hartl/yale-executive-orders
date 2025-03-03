/**
 * Yale Component Library - Modal
 * JavaScript implementation for modal dialog functionality
 */

function initYaleModal() {
  // Track the element that opened the modal to return focus to it
  let lastFocusedElement = null;
  
  // Track active modal
  let activeModal = null;
  
  // Get all modal open triggers
  const modalTriggers = document.querySelectorAll('[data-modal-open]');
  
  // Add click event listener to each trigger
  modalTriggers.forEach(trigger => {
    trigger.addEventListener('click', (event) => {
      event.preventDefault();
      
      // Get the modal ID from the trigger
      const modalId = trigger.getAttribute('data-modal-open');
      const modal = document.getElementById(modalId);
      
      if (modal && modal.classList.contains('yale-modal__backdrop')) {
        openModal(modal, trigger);
      }
    });
  });
  
  // Get all modal close buttons
  const closeButtons = document.querySelectorAll('[data-modal-close]');
  
  // Add click event listener to each close button
  closeButtons.forEach(button => {
    button.addEventListener('click', (event) => {
      event.preventDefault();
      
      // Get the modal from the button
      const modal = button.closest('.yale-modal__backdrop');
      if (modal) {
        closeModal(modal);
      }
    });
  });
  
  // Close modal when clicking on backdrop
  document.addEventListener('click', (event) => {
    if (event.target.classList.contains('yale-modal__backdrop')) {
      closeModal(event.target);
    }
  });
  
  // Close modal when pressing Escape key
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && activeModal) {
      closeModal(activeModal);
    }
  });
  
  // Public function to open a modal
  function openModal(modal, trigger) {
    // Save the last focused element to return focus to later
    lastFocusedElement = trigger || document.activeElement;
    
    // Show the modal
    modal.classList.remove('yale-modal__backdrop--hidden');
    
    // Set active modal
    activeModal = modal;
    
    // Prevent body scrolling
    document.body.style.overflow = 'hidden';
    
    // Get all focusable elements in the modal
    const focusableElements = getFocusableElements(modal);
    
    // Focus the first focusable element
    if (focusableElements.length > 0) {
      setTimeout(() => {
        focusableElements[0].focus();
      }, 100);
    }
    
    // Add event listener for trapping focus in the modal
    modal.addEventListener('keydown', trapFocus);
    
    // Announce modal to screen readers
    announceToScreenReader(`Dialog opened: ${modal.querySelector('.yale-modal__title')?.textContent || 'Dialog'}`);
    
    // Trigger open event
    const openEvent = new CustomEvent('yale:modal:open', {
      bubbles: true,
      detail: { modal }
    });
    modal.dispatchEvent(openEvent);
  }
  
  // Public function to close a modal
  function closeModal(modal) {
    // Hide the modal
    modal.classList.add('yale-modal__backdrop--hidden');
    
    // Reset active modal
    activeModal = null;
    
    // Allow body scrolling again
    document.body.style.overflow = '';
    
    // Remove the focus trap
    modal.removeEventListener('keydown', trapFocus);
    
    // Return focus to the element that opened the modal
    if (lastFocusedElement) {
      lastFocusedElement.focus();
    }
    
    // Announce modal close to screen readers
    announceToScreenReader(`Dialog closed: ${modal.querySelector('.yale-modal__title')?.textContent || 'Dialog'}`);
    
    // Trigger close event
    const closeEvent = new CustomEvent('yale:modal:close', {
      bubbles: true,
      detail: { modal }
    });
    modal.dispatchEvent(closeEvent);
  }
  
  // Helper function to trap focus inside the modal
  function trapFocus(event) {
    // Skip if it's not Tab key
    if (event.key !== 'Tab') return;
    
    const focusableElements = getFocusableElements(event.currentTarget);
    if (focusableElements.length === 0) return;
    
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];
    
    // If Shift + Tab and on first element, wrap to last element
    if (event.shiftKey && document.activeElement === firstElement) {
      event.preventDefault();
      lastElement.focus();
    } 
    // If Tab and on last element, wrap to first element
    else if (!event.shiftKey && document.activeElement === lastElement) {
      event.preventDefault();
      firstElement.focus();
    }
  }
  
  // Helper function to get all focusable elements within a container
  function getFocusableElements(container) {
    return Array.from(container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )).filter(el => !el.hasAttribute('disabled') && el.getAttribute('tabindex') !== '-1');
  }
  
  // Helper function to announce messages to screen readers
  function announceToScreenReader(message) {
    let announcer = document.getElementById('yale-sr-announcer');
    
    if (!announcer) {
      announcer = document.createElement('div');
      announcer.id = 'yale-sr-announcer';
      announcer.setAttribute('aria-live', 'polite');
      announcer.setAttribute('aria-atomic', 'true');
      announcer.classList.add('sr-only');
      document.body.appendChild(announcer);
    }
    
    announcer.textContent = message;
  }
  
  // Return public methods
  return {
    openModal,
    closeModal
  };
}

// Initialize if not using as a module
if (typeof window !== 'undefined') {
  let yaleModal;
  
  // Run when DOM is fully loaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      yaleModal = initYaleModal();
    });
  } else {
    yaleModal = initYaleModal();
  }
  
  // Add to window for external access
  window.YaleModal = yaleModal;
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { initYaleModal };
}