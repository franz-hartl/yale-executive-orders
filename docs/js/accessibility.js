/**
 * Yale Executive Orders Tracker - Accessibility Enhancements
 * 
 * This file contains scripts that enhance keyboard accessibility and focus management.
 */

// Add focus outline script - ensures focus visibility for keyboard navigation
document.addEventListener('keydown', function(e) {
    if (e.key === 'Tab') {
        document.body.classList.add('user-is-tabbing');
    }
});

document.addEventListener('mousedown', function() {
    document.body.classList.remove('user-is-tabbing');
});