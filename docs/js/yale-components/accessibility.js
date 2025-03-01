/**
 * Yale Component Library - Accessibility
 * JavaScript implementation for accessibility enhancements
 */

function initYaleAccessibility() {
  // Detect keyboard navigation to show focus indicators
  let isUsingKeyboard = false;
  
  document.addEventListener('keydown', function(e) {
    // Only add class once when Tab is pressed
    if (e.key === 'Tab' && !isUsingKeyboard) {
      document.body.classList.add('user-is-tabbing');
      isUsingKeyboard = true;
    }

    // Also track Enter and Space keys for interactive elements
    if ((e.key === 'Enter' || e.key === ' ') && !isUsingKeyboard) {
      document.body.classList.add('user-is-tabbing');
      isUsingKeyboard = true;
    }
  });

  // Remove class when mouse is used
  document.addEventListener('mousedown', function() {
    document.body.classList.remove('user-is-tabbing');
    isUsingKeyboard = false;
  });
  
  // Add skip links functionality
  const skipLinks = document.querySelectorAll('.yale-skip-link');
  
  skipLinks.forEach(link => {
    link.addEventListener('click', function(e) {
      e.preventDefault();
      
      const targetId = this.getAttribute('href');
      const targetElement = document.querySelector(targetId);
      
      if (targetElement) {
        // Focus on the target
        targetElement.setAttribute('tabindex', '-1');
        targetElement.focus();
        
        // Remove tabindex after focus (so normal tab order works)
        targetElement.addEventListener('blur', function onBlur() {
          targetElement.removeAttribute('tabindex');
          targetElement.removeEventListener('blur', onBlur);
        });
      }
    });
  });
  
  // Enhanced focus management for modals and other components
  const getFocusableElements = (container) => {
    return Array.from(container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )).filter(el => !el.hasAttribute('disabled') && el.getAttribute('tabindex') !== '-1');
  };
  
  // Create a screen reader announcer if it doesn't exist
  let srAnnouncer = document.getElementById('yale-sr-announcer');
  
  if (!srAnnouncer) {
    srAnnouncer = document.createElement('div');
    srAnnouncer.id = 'yale-sr-announcer';
    srAnnouncer.setAttribute('aria-live', 'polite');
    srAnnouncer.setAttribute('aria-atomic', 'true');
    srAnnouncer.className = 'sr-only';
    document.body.appendChild(srAnnouncer);
  }
  
  // Function to announce messages to screen readers
  function announceToScreenReader(message, ariaLive = 'polite') {
    // Update aria-live attribute if different from default
    srAnnouncer.setAttribute('aria-live', ariaLive);
    
    // Set the message text
    srAnnouncer.textContent = message;
    
    // Reset after a short delay for repeated announcements
    setTimeout(() => {
      srAnnouncer.textContent = '';
    }, 3000);
  }
  
  // Check for reduced motion preference
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  
  if (prefersReducedMotion) {
    document.documentElement.classList.add('reduced-motion');
  }
  
  // Listen for changes to reduced motion preference
  window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', (e) => {
    if (e.matches) {
      document.documentElement.classList.add('reduced-motion');
    } else {
      document.documentElement.classList.remove('reduced-motion');
    }
  });
  
  // Check for high contrast preference
  const prefersHighContrast = window.matchMedia('(forced-colors: active)').matches;
  
  if (prefersHighContrast) {
    document.documentElement.classList.add('high-contrast-mode');
  }
  
  // Listen for changes to high contrast preference
  if (window.matchMedia('(forced-colors: active)').addEventListener) {
    window.matchMedia('(forced-colors: active)').addEventListener('change', (e) => {
      if (e.matches) {
        document.documentElement.classList.add('high-contrast-mode');
      } else {
        document.documentElement.classList.remove('high-contrast-mode');
      }
    });
  }
  
  // Provide keyboard-accessible tooltips
  const tooltips = document.querySelectorAll('[data-yale-tooltip]');
  
  tooltips.forEach(tooltip => {
    // Create tooltip element if not already present
    if (!tooltip.querySelector('.yale-tooltip__content')) {
      const tooltipContent = document.createElement('span');
      tooltipContent.className = 'yale-tooltip__content sr-only';
      tooltipContent.textContent = tooltip.getAttribute('data-yale-tooltip');
      tooltip.appendChild(tooltipContent);
      
      // Add appropriate ARIA attributes
      tooltip.setAttribute('tabindex', '0');
      tooltip.setAttribute('role', 'button');
      tooltip.setAttribute('aria-describedby', `tooltip-${Math.random().toString(36).substr(2, 9)}`);
      tooltipContent.id = tooltip.getAttribute('aria-describedby');
    }
  });
  
  // Return public methods
  return {
    announceToScreenReader,
    getFocusableElements,
    prefersReducedMotion,
    prefersHighContrast,
  };
}

// Initialize if not using as a module
if (typeof window !== 'undefined') {
  let yaleAccessibility;
  
  // Run when DOM is fully loaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      yaleAccessibility = initYaleAccessibility();
    });
  } else {
    yaleAccessibility = initYaleAccessibility();
  }
  
  // Add to window for external access
  window.YaleAccessibility = yaleAccessibility;
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { initYaleAccessibility };
}