# Yale Component Library Implementation Guide

This document provides guidance for implementing and using the Yale Component Library in the Executive Orders project.

## Overview

The Yale Component Library is a comprehensive UI component system based on Yale design principles, adapted for the Executive Orders project. It includes a set of CSS and JavaScript components that can be used to build consistent and accessible user interfaces.

## Installation

The component library is located in the following directories:

- CSS: `/docs/css/yale-components.css` and `/docs/css/yale-components/*.css`
- JavaScript: `/docs/js/yale-components.js` and `/docs/js/yale-components/*.js`

## Integration

To integrate the component library into the project:

### CSS Integration

1. Add the following line to your HTML file to include the component library CSS:

```html
<link rel="stylesheet" href="css/yale-components.css">
```

2. For a smooth transition from the existing styles to the component library, you can create a compatibility layer that extends the component library classes to the existing classes, as shown in `styles.css.new`.

### JavaScript Integration

1. Add the following scripts to your HTML file to include the component library JavaScript:

```html
<script src="js/yale-components/accessibility.js"></script>
<script src="js/yale-components/tabs.js"></script>
<script src="js/yale-components/accordion.js"></script>
<script src="js/yale-components/modal.js"></script>
<script src="js/yale-components/toast.js"></script>
```

2. Initialize the components in your JavaScript:

```javascript
document.addEventListener('DOMContentLoaded', () => {
  // Initialize accessibility enhancements
  if (typeof initYaleAccessibility === 'function') {
    initYaleAccessibility();
  }
  
  // Initialize tabs
  if (typeof initYaleTabs === 'function') {
    initYaleTabs();
  }
  
  // Initialize accordions
  if (typeof initYaleAccordion === 'function') {
    initYaleAccordion();
  }
  
  // Initialize modals
  if (typeof initYaleModal === 'function') {
    window.YaleModal = initYaleModal();
  }
  
  // Initialize toasts
  if (typeof initYaleToast === 'function') {
    window.YaleToast = initYaleToast();
  }
});
```

## Component Usage

The component library includes the following components:

### Typography

```html
<h1 class="yale-h1">Heading 1</h1>
<h2 class="yale-h2">Heading 2</h2>
<h3 class="yale-h3">Heading 3</h3>
<h4 class="yale-h4">Heading 4</h4>
<h5 class="yale-h5">Heading 5</h5>
<h6 class="yale-h6">Heading 6</h6>
<p class="yale-text-sm">Small text</p>
<p class="yale-text-lg">Large text</p>
<a href="#" class="yale-link">Link</a>
```

### Buttons

```html
<button class="yale-btn yale-btn--primary">Primary Button</button>
<button class="yale-btn yale-btn--secondary">Secondary Button</button>
<button class="yale-btn yale-btn--outline">Outline Button</button>
<button class="yale-btn yale-btn--text">Text Button</button>
<button class="yale-btn yale-btn--primary yale-btn--sm">Small Button</button>
<button class="yale-btn yale-btn--primary yale-btn--lg">Large Button</button>
<button class="yale-btn yale-btn--primary">
  <i class="fas fa-save yale-btn__icon--left"></i>
  Save
</button>
```

### Cards

```html
<div class="yale-card">
  <div class="yale-card__header">
    <h3 class="yale-card__title">Card Title</h3>
    <p class="yale-card__subtitle">Card subtitle</p>
  </div>
  <div class="yale-card__body">
    <p>Card content</p>
  </div>
  <div class="yale-card__footer">
    <button class="yale-btn yale-btn--primary">Action</button>
  </div>
</div>

<div class="yale-filter-card">
  <div class="yale-filter-card__header">
    <h3 class="yale-filter-card__title">Filter Controls</h3>
  </div>
  <div class="yale-filter-card__body">
    <!-- Filter content -->
  </div>
  <div class="yale-filter-card__footer">
    <button class="yale-btn yale-btn--outline">Reset</button>
  </div>
</div>

<div class="yale-stat-card">
  <div class="yale-stat-card__title">Total Orders</div>
  <div class="yale-stat-card__value">1,024</div>
  <div class="yale-stat-card__subtitle">Up 12% from last month</div>
</div>
```

### Forms

```html
<div class="yale-form-group">
  <label for="text-input" class="yale-form-label">Text Input</label>
  <input id="text-input" type="text" class="yale-input" placeholder="Enter text...">
  <p class="yale-form-help-text">Helper text for the input field</p>
</div>

<div class="yale-form-group">
  <label for="select" class="yale-form-label">Select</label>
  <select id="select" class="yale-select">
    <option>Option 1</option>
    <option>Option 2</option>
  </select>
</div>

<div class="yale-checkbox-wrapper">
  <input type="checkbox" id="checkbox1" class="yale-checkbox">
  <span class="yale-checkbox-control"></span>
  <label for="checkbox1" class="yale-checkbox-label">Checkbox</label>
</div>

<div class="yale-radio-wrapper">
  <input type="radio" id="radio1" name="radio-group" class="yale-radio">
  <span class="yale-radio-control"></span>
  <label for="radio1" class="yale-radio-label">Radio Option</label>
</div>
```

### Tables

```html
<div class="yale-table-wrapper">
  <table class="yale-table">
    <thead>
      <tr>
        <th class="yale-table__sort-header">
          Column 1
          <span class="yale-table__sort-icon">
            <i class="fas fa-sort"></i>
          </span>
        </th>
        <th>Column 2</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>Data 1</td>
        <td>Data 2</td>
      </tr>
    </tbody>
  </table>
</div>
```

### Badges & Tags

```html
<span class="yale-badge yale-badge--critical">Critical</span>
<span class="yale-badge yale-badge--high">High</span>
<span class="yale-badge yale-badge--medium">Medium</span>
<span class="yale-badge yale-badge--low">Low</span>

<span class="yale-tag">Default Tag</span>
<span class="yale-tag yale-tag--primary">Primary</span>
<span class="yale-tag yale-tag--secondary">Secondary</span>
```

### Tabs

```html
<div class="yale-tabs-wrapper">
  <div class="yale-tabs" data-tabs-animate="true">
    <div class="yale-tabs__nav">
      <button id="tab-1" class="yale-tab-button yale-tab-button--active" data-tab-target="tab-content-1">
        First Tab
      </button>
      <button id="tab-2" class="yale-tab-button" data-tab-target="tab-content-2">
        Second Tab
      </button>
    </div>
    
    <div id="tab-content-1" class="yale-tab-content">
      <p>Content for tab 1</p>
    </div>
    
    <div id="tab-content-2" class="yale-tab-content yale-tab-content--hidden">
      <p>Content for tab 2</p>
    </div>
  </div>
</div>
```

### Accordion

```html
<div class="yale-accordion">
  <div class="yale-accordion__item">
    <button class="yale-accordion__button" aria-expanded="false">
      <span>Section 1</span>
      <span class="yale-accordion__icon"></span>
    </button>
    <div class="yale-accordion__content">
      <p>Content for section 1</p>
    </div>
  </div>
  
  <div class="yale-accordion__item">
    <button class="yale-accordion__button" aria-expanded="false">
      <span>Section 2</span>
      <span class="yale-accordion__icon"></span>
    </button>
    <div class="yale-accordion__content">
      <p>Content for section 2</p>
    </div>
  </div>
</div>
```

### Modal

```html
<button class="yale-btn yale-btn--primary" data-modal-open="demo-modal">Open Modal</button>

<div id="demo-modal" class="yale-modal__backdrop yale-modal__backdrop--hidden" role="dialog" aria-modal="true" aria-labelledby="modal-title">
  <div class="yale-modal__content">
    <div class="yale-modal__header">
      <h2 id="modal-title" class="yale-modal__title">Modal Title</h2>
      <button class="yale-modal__close" data-modal-close aria-label="Close modal">
        <i class="fas fa-times"></i>
      </button>
    </div>
    
    <div class="yale-modal__body">
      <p>Modal content</p>
    </div>
    
    <div class="yale-modal__footer">
      <div class="yale-modal__buttons yale-modal__buttons--end">
        <button class="yale-btn yale-btn--outline" data-modal-close>Cancel</button>
        <button class="yale-btn yale-btn--primary">Confirm</button>
      </div>
    </div>
  </div>
</div>
```

### Toasts

```javascript
// Show a success toast
YaleToast.success('Operation completed successfully', {
  title: 'Success',
  duration: 3000
});

// Show an error toast
YaleToast.error('An error occurred', {
  title: 'Error',
  duration: 3000
});

// Show an info toast
YaleToast.info('Here is some helpful information', {
  title: 'Information',
  duration: 3000
});

// Show a warning toast
YaleToast.warning('Please be aware of this warning', {
  title: 'Warning',
  duration: 3000
});
```

## Layout System

The component library includes a layout system with containers, flexbox utilities, and spacing utilities:

```html
<div class="yale-container">
  <div class="yale-grid yale-md-grid-cols-2 yale-gap-md">
    <div>Column 1</div>
    <div>Column 2</div>
  </div>
</div>

<div class="yale-flex yale-items-center yale-justify-between">
  <div>Flex item 1</div>
  <div>Flex item 2</div>
</div>

<div class="yale-mt-md yale-mb-lg yale-px-sm">
  <!-- Content with margin top, margin bottom, and padding x -->
</div>
```

## Accessibility Features

The component library includes accessibility features such as:

- Keyboard navigation support for interactive components
- Focus management for modals and other components
- ARIA attributes for improved screen reader support
- Skip links for keyboard users
- Reduced motion support
- High contrast mode support

## Demo

A demo page is available at `/docs/yale-components-demo.html` that showcases all components and their variants.

## Migration Guide

To migrate from the existing styles to the component library:

1. Start by updating the global styles and layout components
2. Replace buttons and form elements
3. Update cards and data display components
4. Replace modal and tab components
5. Update notification components

For backward compatibility, the `styles.css.new` file includes a compatibility layer that extends the component library classes to the existing classes.

## Best Practices

- Use semantic HTML elements
- Follow accessibility guidelines
- Use the component library's spacing and color system
- Use the component library's responsive utilities
- Use the component library's typography system
- Test changes across different screen sizes
- Test with keyboard navigation and screen readers

## Support

For support or questions about the component library, contact the development team.