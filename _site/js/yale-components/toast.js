/**
 * Yale Component Library - Toast
 * JavaScript implementation for toast notifications
 */

function initYaleToast() {
  // Create the toast container if it doesn't exist
  let toastContainer = document.querySelector('.yale-toast-container');
  
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.className = 'yale-toast-container';
    document.body.appendChild(toastContainer);
  }
  
  // Function to create and show a toast notification
  function showToast(options) {
    // Default options
    const defaults = {
      type: 'info',          // info, success, error, warning
      title: '',             // Optional toast title
      message: '',           // Toast message
      duration: 5000,        // Time in ms before auto-dismiss (0 for no auto-dismiss)
      position: 'bottom-right', // Position options: top-right, top-left, bottom-right, bottom-left
      closable: true,        // Whether the toast can be manually closed
      icon: null,            // Custom icon class (null for default based on type)
      onClose: null,         // Callback function when toast is closed
      className: '',         // Additional custom classes
    };
    
    // Merge options with defaults
    const settings = {...defaults, ...options};
    
    // Create toast element
    const toast = document.createElement('div');
    toast.className = `yale-toast yale-toast--${settings.type} ${settings.className}`;
    
    // Set position container if different from default
    if (settings.position !== 'bottom-right') {
      toastContainer.style.top = settings.position.includes('top') ? '1rem' : 'auto';
      toastContainer.style.bottom = settings.position.includes('bottom') ? '1rem' : 'auto';
      toastContainer.style.right = settings.position.includes('right') ? '1rem' : 'auto';
      toastContainer.style.left = settings.position.includes('left') ? '1rem' : 'auto';
    }
    
    // Get default icon based on type
    const getDefaultIcon = (type) => {
      switch (type) {
        case 'success': return 'fas fa-check-circle';
        case 'error': return 'fas fa-exclamation-circle';
        case 'warning': return 'fas fa-exclamation-triangle';
        case 'info':
        default: return 'fas fa-info-circle';
      }
    };
    
    // Set icon
    const iconClass = settings.icon || getDefaultIcon(settings.type);
    
    // Build toast content
    let toastContent = `
      <div class="yale-toast__content">
        <div class="yale-toast__icon">
          <i class="${iconClass}"></i>
        </div>
        <div class="yale-toast__body">
    `;
    
    // Add title if provided
    if (settings.title) {
      toastContent += `<h4 class="yale-toast__title">${settings.title}</h4>`;
    }
    
    // Add message
    toastContent += `<p class="yale-toast__message">${settings.message}</p>`;
    toastContent += `</div>`;
    
    // Add close button if closable
    if (settings.closable) {
      toastContent += `
        <button type="button" class="yale-toast__close" aria-label="Close notification">
          <i class="fas fa-times"></i>
        </button>
      `;
    }
    
    toastContent += `</div>`;
    
    // Set toast content
    toast.innerHTML = toastContent;
    
    // Add to container
    toastContainer.appendChild(toast);
    
    // Add an identifier for tracking
    const toastId = `toast-${Date.now()}`;
    toast.dataset.id = toastId;
    
    // Announce to screen readers
    announceToScreenReader(`${settings.type} notification: ${settings.title ? settings.title + ': ' : ''}${settings.message}`);
    
    // Add close event listener
    const closeButton = toast.querySelector('.yale-toast__close');
    if (closeButton) {
      closeButton.addEventListener('click', () => {
        closeToast(toast);
      });
    }
    
    // Auto-dismiss timer
    let dismissTimer;
    if (settings.duration > 0) {
      dismissTimer = setTimeout(() => {
        closeToast(toast);
      }, settings.duration);
    }
    
    // Update dismissal timer when user hovers over toast
    toast.addEventListener('mouseenter', () => {
      if (dismissTimer) {
        clearTimeout(dismissTimer);
      }
    });
    
    toast.addEventListener('mouseleave', () => {
      if (settings.duration > 0) {
        dismissTimer = setTimeout(() => {
          closeToast(toast);
        }, settings.duration);
      }
    });
    
    // Function to close the toast
    function closeToast(toastElement) {
      toastElement.classList.add('yale-toast--exiting');
      
      toastElement.addEventListener('animationend', function() {
        toastElement.remove();
        
        // Call onClose callback if provided
        if (typeof settings.onClose === 'function') {
          settings.onClose(toastId);
        }
      });
    }
    
    // Return the toast ID for later reference
    return toastId;
  }
  
  // Convenience methods for different toast types
  function showSuccessToast(message, options = {}) {
    return showToast({...options, message, type: 'success'});
  }
  
  function showErrorToast(message, options = {}) {
    return showToast({...options, message, type: 'error'});
  }
  
  function showInfoToast(message, options = {}) {
    return showToast({...options, message, type: 'info'});
  }
  
  function showWarningToast(message, options = {}) {
    return showToast({...options, message, type: 'warning'});
  }
  
  // Function to close a toast by ID
  function closeToast(toastId) {
    const toast = document.querySelector(`.yale-toast[data-id="${toastId}"]`);
    if (toast) {
      toast.classList.add('yale-toast--exiting');
      
      toast.addEventListener('animationend', function() {
        toast.remove();
      });
    }
  }
  
  // Function to clear all toasts
  function clearAllToasts() {
    const toasts = document.querySelectorAll('.yale-toast');
    toasts.forEach(toast => {
      toast.classList.add('yale-toast--exiting');
      
      toast.addEventListener('animationend', function() {
        toast.remove();
      });
    });
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
    show: showToast,
    success: showSuccessToast,
    error: showErrorToast,
    info: showInfoToast,
    warning: showWarningToast,
    close: closeToast,
    clearAll: clearAllToasts
  };
}

// Initialize if not using as a module
if (typeof window !== 'undefined') {
  let yaleToast;
  
  // Run when DOM is fully loaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      yaleToast = initYaleToast();
    });
  } else {
    yaleToast = initYaleToast();
  }
  
  // Add to window for external access
  window.YaleToast = yaleToast;
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { initYaleToast };
}