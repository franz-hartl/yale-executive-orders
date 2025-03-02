/**
 * Integrated view functionality for the Executive Order Tracker
 * This script adds interactions for the integrated content view
 */

document.addEventListener('DOMContentLoaded', function() {
    // Handle expand/collapse for the comprehensive analysis section
    const expandBtn = document.getElementById('expand-analysis-btn');
    const analysisContainer = document.getElementById('analysis-container');
    
    if (expandBtn && analysisContainer) {
        expandBtn.addEventListener('click', function() {
            const isExpanded = analysisContainer.style.maxHeight \!== '500px';
            
            if (isExpanded) {
                // Collapse
                analysisContainer.style.maxHeight = '500px';
                analysisContainer.classList.add('section-fade');
                expandBtn.innerHTML = 'Show more <i class="fas fa-chevron-down"></i>';
            } else {
                // Expand
                analysisContainer.style.maxHeight = 'none';
                analysisContainer.classList.remove('section-fade');
                expandBtn.innerHTML = 'Show less <i class="fas fa-chevron-up"></i>';
            }
        });
    }
});
