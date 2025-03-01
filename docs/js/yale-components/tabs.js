/**
 * Yale Component Library - Tabs
 * JavaScript implementation for tabs functionality
 */

function initYaleTabs() {
  const tabsContainers = document.querySelectorAll('.yale-tabs');
  
  tabsContainers.forEach(container => {
    const tabs = container.querySelectorAll('.yale-tab-button');
    const tabContentsSelector = container.dataset.tabsContent || '.yale-tab-content';
    let tabContents;
    
    // Check if tab contents are inside or outside container
    if (container.dataset.tabsExternal) {
      // Get external tab contents
      tabContents = document.querySelectorAll(tabContentsSelector);
    } else {
      // Get tab contents inside tab container parent
      const tabsParent = container.closest('.yale-tabs-wrapper') || container.parentNode;
      tabContents = tabsParent.querySelectorAll(tabContentsSelector);
    }
    
    // Set up initial state
    tabs.forEach((tab, index) => {
      // Set ARIA attributes
      tab.setAttribute('role', 'tab');
      tab.setAttribute('tabindex', index === 0 ? '0' : '-1');
      tab.setAttribute('aria-selected', index === 0 ? 'true' : 'false');
      
      // Get tab target ID
      const tabTargetId = tab.dataset.tabTarget;
      if (tabTargetId) {
        tab.setAttribute('aria-controls', tabTargetId);
        
        // Get the corresponding tab content
        const tabContent = document.getElementById(tabTargetId);
        if (tabContent) {
          tabContent.setAttribute('role', 'tabpanel');
          tabContent.setAttribute('aria-labelledby', tab.id || `tab-${index}`);
          
          // Ensure tab has an ID for accessibility
          if (!tab.id) {
            tab.id = `tab-${index}`;
          }
          
          // Hide all tabs except the first one
          if (index !== 0) {
            tabContent.classList.add('yale-tab-content--hidden');
          }
        }
      }
      
      // Add click event listener
      tab.addEventListener('click', (event) => {
        event.preventDefault();
        activateTab(tab);
      });
      
      // Add keyboard navigation
      tab.addEventListener('keydown', (event) => {
        handleTabKeyDown(event, tabs);
      });
    });
    
    // Function to activate a tab
    function activateTab(selectedTab) {
      // Deactivate all tabs
      tabs.forEach(tab => {
        tab.classList.remove('yale-tab-button--active');
        tab.setAttribute('aria-selected', 'false');
        tab.setAttribute('tabindex', '-1');
      });
      
      // Activate the selected tab
      selectedTab.classList.add('yale-tab-button--active');
      selectedTab.setAttribute('aria-selected', 'true');
      selectedTab.setAttribute('tabindex', '0');
      
      // Hide all tab contents
      tabContents.forEach(content => {
        content.classList.add('yale-tab-content--hidden');
      });
      
      // Show the selected tab content
      const tabTargetId = selectedTab.dataset.tabTarget;
      if (tabTargetId) {
        const selectedContent = document.getElementById(tabTargetId);
        if (selectedContent) {
          selectedContent.classList.remove('yale-tab-content--hidden');
          
          // Add animation if enabled
          if (container.dataset.tabsAnimate) {
            selectedContent.classList.add('yale-tab-content--animate');
            setTimeout(() => {
              selectedContent.classList.remove('yale-tab-content--animate');
            }, 300);
          }
        }
      }
    }
    
    // Keyboard navigation handler
    function handleTabKeyDown(event, tabs) {
      const currentIndex = Array.from(tabs).indexOf(event.target);
      let newIndex;
      
      switch (event.key) {
        case 'ArrowRight':
        case 'ArrowDown':
          newIndex = (currentIndex + 1) % tabs.length;
          event.preventDefault();
          tabs[newIndex].focus();
          activateTab(tabs[newIndex]);
          break;
          
        case 'ArrowLeft':
        case 'ArrowUp':
          newIndex = (currentIndex - 1 + tabs.length) % tabs.length;
          event.preventDefault();
          tabs[newIndex].focus();
          activateTab(tabs[newIndex]);
          break;
          
        case 'Home':
          event.preventDefault();
          tabs[0].focus();
          activateTab(tabs[0]);
          break;
          
        case 'End':
          event.preventDefault();
          tabs[tabs.length - 1].focus();
          activateTab(tabs[tabs.length - 1]);
          break;
      }
    }
  });
}

// Initialize if not using as a module
if (typeof window !== 'undefined') {
  // Run when DOM is fully loaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initYaleTabs);
  } else {
    initYaleTabs();
  }
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { initYaleTabs };
}