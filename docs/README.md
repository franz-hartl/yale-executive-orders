# Higher Education Executive Orders Analysis

This is a static version of the Higher Education Executive Orders Analysis application, hosted on GitHub Pages.

Visit the live application at: https://franz-hartl.github.io/yale-executive-orders/

## Features

- Browse and search executive orders affecting higher education institutions
- View detailed analysis of each order
- Filter by category, impact level, and university area
- Access plain language summaries
- Quickly identify the most critical orders

## Static Implementation

This version has been converted from a dynamic Node.js application to a static GitHub Pages site. It provides a comprehensive tool for higher education administrators to understand the impact of executive orders on their institutions.

## Code Organization

The frontend code is organized as follows:

```
docs/
├── css/               # CSS stylesheets
│   └── styles.css     # Main application styles
├── js/                # JavaScript files
│   ├── accessibility.js  # Accessibility enhancements
│   └── app.js         # Main application logic
├── data/              # Static JSON data files
│   ├── executive_orders.json
│   ├── metadata.json
│   ├── orders/        # Individual order JSON files
│   ├── statistics.json
│   ├── summaries/     # HTML summary files
│   ├── executive_briefs/ # HTML executive brief files
│   └── comprehensive_analyses/ # HTML comprehensive analysis files
├── index.html         # Main application HTML
└── README.md          # This file
```

### Design Principles

The frontend follows these design principles:

1. **Separation of Concerns**: CSS, JavaScript, and HTML are separated
2. **Progressive Enhancement**: Core functionality works without JavaScript
3. **Accessibility**: WCAG 2.1 AA compliant with keyboard navigation
4. **Yale Design Language**: Uses Yale's official colors and typography
5. **Responsive Design**: Works on all device sizes

### CSS Organization

The CSS is organized into logical sections:

1. **Color Variables and Theming**: CSS variables for colors and theming
2. **Base Elements**: Styling for basic HTML elements
3. **Layout Elements**: Containers, cards, and structural components
4. **Components**: Buttons, forms, tables, badges, modals, etc.
5. **Utilities**: Helper classes and animations
6. **Accessibility Enhancements**: Focus styles and screen reader support
7. **Responsive Adjustments**: Media queries for different screen sizes

### JavaScript Organization

The JavaScript is organized into logical sections:

1. **DOM Element References**: References to DOM elements for manipulation
2. **Data Storage**: Variables for storing application data
3. **Initialization**: Setup and initial data loading
4. **Data Loading**: Functions for fetching data from API
5. **Detail View Functionality**: Handling the detailed view of orders
6. **Table Rendering and Filtering**: Functions for rendering and filtering the table
7. **Utility Functions**: Helper functions for common tasks

Last updated: Mon Mar 3 14:30:00 EDT 2025
