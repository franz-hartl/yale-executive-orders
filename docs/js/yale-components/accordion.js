/**
 * Yale Component Library - Accordion
 * JavaScript implementation for accordion functionality
 */

function initYaleAccordion() {
  const accordions = document.querySelectorAll('.yale-accordion');
  
  accordions.forEach(accordion => {
    const buttons = accordion.querySelectorAll('.yale-accordion__button');
    const allowMultiple = accordion.dataset.accordionMultiple === 'true';
    
    // Initialize each accordion item
    buttons.forEach((button, index) => {
      // Ensure button has an ID for accessibility
      if (!button.id) {
        button.id = `accordion-button-${index}-${Math.floor(Math.random() * 10000)}`;
      }
      
      // Set ARIA attributes
      button.setAttribute('aria-expanded', 'false');
      
      // Find the content panel for this button
      const content = button.nextElementSibling;
      if (content && content.classList.contains('yale-accordion__content')) {
        // Ensure content has an ID for accessibility
        if (!content.id) {
          content.id = `accordion-content-${index}-${Math.floor(Math.random() * 10000)}`;
        }
        
        // Set ARIA attributes for accessibility
        button.setAttribute('aria-controls', content.id);
        content.setAttribute('aria-labelledby', button.id);
        content.setAttribute('role', 'region');
        content.setAttribute('hidden', '');
        
        // Default open state if data-accordion-open is set
        if (button.dataset.accordionOpen === 'true') {
          button.setAttribute('aria-expanded', 'true');
          content.removeAttribute('hidden');
          expandAccordionItem(content);
        }
      }
      
      // Add click event listener
      button.addEventListener('click', () => {
        const isExpanded = button.getAttribute('aria-expanded') === 'true';
        
        // If not allowing multiple open items, close all others
        if (!allowMultiple && !isExpanded) {
          buttons.forEach(otherButton => {
            if (otherButton !== button && otherButton.getAttribute('aria-expanded') === 'true') {
              otherButton.setAttribute('aria-expanded', 'false');
              
              const otherContent = document.getElementById(otherButton.getAttribute('aria-controls'));
              if (otherContent) {
                collapseAccordionItem(otherContent);
              }
            }
          });
        }
        
        // Toggle this item
        button.setAttribute('aria-expanded', !isExpanded);
        
        // Get the content panel
        const content = document.getElementById(button.getAttribute('aria-controls'));
        if (content) {
          if (isExpanded) {
            collapseAccordionItem(content);
          } else {
            expandAccordionItem(content);
          }
        }
      });
      
      // Add keyboard support
      button.addEventListener('keydown', (event) => {
        switch (event.key) {
          case 'ArrowDown':
            event.preventDefault();
            const nextButton = getNextAccordionButton(buttons, index);
            if (nextButton) nextButton.focus();
            break;
            
          case 'ArrowUp':
            event.preventDefault();
            const prevButton = getPrevAccordionButton(buttons, index);
            if (prevButton) prevButton.focus();
            break;
            
          case 'Home':
            event.preventDefault();
            buttons[0].focus();
            break;
            
          case 'End':
            event.preventDefault();
            buttons[buttons.length - 1].focus();
            break;
        }
      });
    });
  });
  
  // Helper function to expand accordion item
  function expandAccordionItem(content) {
    content.removeAttribute('hidden');
    
    // Calculate the height for smooth animation
    content.style.maxHeight = content.scrollHeight + 'px';
    
    // Start with zero opacity and animate to 1
    if (content.style.transition === '') {
      content.style.opacity = '0';
      setTimeout(() => {
        content.style.transition = 'max-height 0.3s ease-out, opacity 0.2s ease-in';
        content.style.opacity = '1';
      }, 10);
    }
  }
  
  // Helper function to collapse accordion item
  function collapseAccordionItem(content) {
    // Begin the collapse animation
    content.style.maxHeight = '0px';
    content.style.opacity = '0';
    
    // Set hidden once animation completes
    content.addEventListener('transitionend', function handler(e) {
      if (e.propertyName === 'max-height') {
        content.setAttribute('hidden', '');
        content.removeEventListener('transitionend', handler);
      }
    });
  }
  
  // Helper function to get next button for keyboard navigation
  function getNextAccordionButton(buttons, currentIndex) {
    return buttons[currentIndex + 1] || null;
  }
  
  // Helper function to get previous button for keyboard navigation
  function getPrevAccordionButton(buttons, currentIndex) {
    return buttons[currentIndex - 1] || null;
  }
}

// Initialize if not using as a module
if (typeof window !== 'undefined') {
  // Run when DOM is fully loaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initYaleAccordion);
  } else {
    initYaleAccordion();
  }
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { initYaleAccordion };
}