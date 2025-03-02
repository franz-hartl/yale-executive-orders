/**
 * Integrated view functionality for the Executive Order Tracker
 * This script adds interactions for the integrated content view
 */

// Add event handler for the expand/collapse button
function initExpandButton() {
    // Handle expand/collapse for the comprehensive analysis section
    const expandBtn = document.getElementById('expand-analysis-btn');
    const analysisContainer = document.getElementById('analysis-container');
    
    if (expandBtn && analysisContainer) {
        console.log("Setting up expand button handler");
        
        // Remove any existing event listeners by cloning and replacing
        const newExpandBtn = expandBtn.cloneNode(true);
        expandBtn.parentNode.replaceChild(newExpandBtn, expandBtn);
        
        newExpandBtn.addEventListener('click', function() {
            console.log("Expand button clicked");
            const isExpanded = analysisContainer.style.maxHeight === 'none';
            
            if (isExpanded) {
                // Collapse
                analysisContainer.style.maxHeight = '500px';
                analysisContainer.classList.add('section-fade');
                newExpandBtn.innerHTML = 'Show more <i class="fas fa-chevron-down"></i>';
                console.log("Collapsed analysis section");
            } else {
                // Expand
                analysisContainer.style.maxHeight = 'none';
                analysisContainer.classList.remove('section-fade');
                newExpandBtn.innerHTML = 'Show less <i class="fas fa-chevron-up"></i>';
                console.log("Expanded analysis section");
            }
        });
    } else {
        console.error("Expand button or analysis container not found:", {
            expandBtn: expandBtn ? "Found" : "Not found",
            analysisContainer: analysisContainer ? "Found" : "Not found"
        });
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    console.log("Document loaded, initializing expand button");
    setTimeout(initExpandButton, 1000);
});

// Re-initialize when a detail view is shown
document.addEventListener('click', function(event) {
    // Check if this click is on a table row
    if (event.target.closest('tr[data-order-id]')) {
        console.log("Order row clicked, will initialize expand button");
        // Wait for modal to fully render
        setTimeout(initExpandButton, 800);
    }
});

// Also initialize when modal is shown (Yale components specific)
if (typeof yaleModal !== 'undefined') {
    console.log("Yale modal detected, adding event listener");
    yaleModal.on('modal:after-open', function() {
        console.log("Modal opened event from Yale components");
        setTimeout(initExpandButton, 500);
    });
}
