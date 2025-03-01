/**
 * Yale Executive Orders Tracker - Main Application JavaScript
 * 
 * This file contains the core functionality for the Executive Order Tracker application,
 * including data loading, table rendering, filtering, and UI management.
 */

// Yale Component Library references
let yaleModal;
let yaleToast;

// Wait for DOM to be fully loaded before running code
document.addEventListener('DOMContentLoaded', () => {
    // Reference Yale component instances or create them if needed
    if (window.YaleModal) {
        yaleModal = window.YaleModal;
    } else if (typeof initYaleModal === 'function') {
        yaleModal = initYaleModal();
    }
    
    if (window.YaleToast) {
        yaleToast = window.YaleToast;
    } else if (typeof initYaleToast === 'function') {
        yaleToast = initYaleToast();
    }
    
    // =====================================================================
    // DOM ELEMENT REFERENCES
    // =====================================================================
    
    // Filter elements
    const searchInput = document.getElementById('search-input');
    const filterCategory = document.getElementById('filter-category');
    const filterImpactLevel = document.getElementById('filter-impact-level');
    const filterUniversityArea = document.getElementById('filter-university-area');
    const clearFiltersBtn = document.getElementById('clear-filters-btn');
    
    // Table elements
    const eoTableBody = document.getElementById('eo-table-body');
    
    // Info elements
    const systemInfo = document.getElementById('system-info');
    const updateDate = document.getElementById('update-date');
    
    // Detail view elements
    const detailView = document.getElementById('detail-view');
    const closeDetailBtn = document.getElementById('close-detail-btn');
    const closeDetailBtnBottom = document.getElementById('close-detail-btn-bottom');
    const detailTitle = document.getElementById('detail-title');
    const detailOrderNumber = document.getElementById('detail-order-number');
    const detailPresident = document.getElementById('detail-president');
    const detailDate = document.getElementById('detail-date');
    const detailSummary = document.getElementById('detail-summary');
    const detailImpactLevel = document.getElementById('detail-impact-level');
    const detailCategories = document.getElementById('detail-categories');
    const detailImpactAreas = document.getElementById('detail-impact-areas');
    const detailUniversityImpactAreas = document.getElementById('detail-university-impact-areas');
    const detailUrl = document.getElementById('detail-url');
    
    // Tab elements
    const tabs = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');
    
    // Toast container
    const toastContainer = document.getElementById('toast-container');
    
    // =====================================================================
    // DATA STORAGE
    // =====================================================================
    
    let allExecutiveOrders = [];
    let filteredOrders = [];
    let metadata = {
        categories: [],
        impactAreas: [],
        universityImpactAreas: []
    };
    let statistics = {};
    let systemInfoData = {};
    let sortField = 'signing_date';
    let sortDirection = 'desc';
    
    // =====================================================================
    // INITIALIZATION
    // =====================================================================
    
    // Initialize the application
    function init() {
        // Set up tab handling
        setupTabs();
        
        // Load data
        loadData();
        
        // Set up event listeners
        setupEventListeners();
        
        // Add keyboard navigation for table
        if (eoTableBody) {
            eoTableBody.addEventListener('keydown', handleTableKeyboardNavigation);
        }
    }
    
    // Set up tab functionality
    function setupTabs() {
        // Let the Yale component library handle tab functionality if available
        if (typeof window.Yale !== 'undefined' && window.Yale.refresh) {
            // Refresh Yale components to ensure tabs are initialized
            window.Yale.refresh();
            return;
        }
        
        // Fallback implementation if Yale component library isn't available
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                // Remove active class from all tabs
                tabs.forEach(t => {
                    t.classList.remove('active');
                    t.classList.remove('yale-tab-button--active');
                });
                
                // Add active class to clicked tab
                tab.classList.add('active');
                tab.classList.add('yale-tab-button--active');
                
                // Hide all tab contents
                tabContents.forEach(content => {
                    content.classList.add('hidden');
                    content.classList.add('yale-tab-content--hidden');
                });
                
                // Show selected tab content
                const tabTarget = tab.getAttribute('data-tab-target') || tab.getAttribute('data-tab');
                if (tabTarget) {
                    const tabContent = document.getElementById(tabTarget);
                    if (tabContent) {
                        tabContent.classList.remove('hidden');
                        tabContent.classList.remove('yale-tab-content--hidden');
                    }
                }
            });
        });
    }
    
    // Set up all event listeners
    function setupEventListeners() {
        // Filter event listeners
        searchInput.addEventListener('input', applyFilters);
        filterCategory.addEventListener('change', applyFilters);
        filterImpactLevel.addEventListener('change', applyFilters);
        filterUniversityArea.addEventListener('change', applyFilters);
        clearFiltersBtn.addEventListener('click', clearFilters);
        
        // Mobile filter toggle
        const mobileFiltersToggle = document.getElementById('mobile-filters-toggle');
        const filtersRow = document.getElementById('filters-row');
        
        if (mobileFiltersToggle && filtersRow) {
            mobileFiltersToggle.addEventListener('click', () => {
                // Toggle filters visibility
                filtersRow.classList.toggle('yale-hidden');
                
                // Toggle button icon and text
                const icon = mobileFiltersToggle.querySelector('i');
                if (icon) {
                    if (filtersRow.classList.contains('yale-hidden')) {
                        icon.className = 'fas fa-filter yale-btn__icon--right';
                        mobileFiltersToggle.querySelector('span').textContent = 'Show Filters';
                    } else {
                        icon.className = 'fas fa-times yale-btn__icon--right';
                        mobileFiltersToggle.querySelector('span').textContent = 'Hide Filters';
                    }
                }
            });
            
            // Initially hide filters on mobile screens
            const handleMobileLayout = () => {
                if (window.innerWidth < 768) {
                    filtersRow.classList.add('yale-hidden');
                } else {
                    filtersRow.classList.remove('yale-hidden');
                }
            };
            
            // Call initially and set up a debounced resize handler
            handleMobileLayout();
            
            // Debounced resize handler to prevent excessive calls
            let resizeTimeout;
            window.addEventListener('resize', () => {
                // Clear previous timeout
                if (resizeTimeout) {
                    clearTimeout(resizeTimeout);
                }
                
                // Set new timeout to run after resize completes
                resizeTimeout = setTimeout(handleMobileLayout, 250);
            });
        }
        
        // Close detail view (top button)
        closeDetailBtn.addEventListener('click', () => {
            if (yaleModal) {
                yaleModal.closeModal(detailView);
            } else {
                detailView.classList.add('hidden');
                detailView.classList.add('yale-modal__backdrop--hidden');
            }
        });
        
        // Close detail view (bottom button)
        closeDetailBtnBottom.addEventListener('click', () => {
            if (yaleModal) {
                yaleModal.closeModal(detailView);
            } else {
                detailView.classList.add('hidden');
                detailView.classList.add('yale-modal__backdrop--hidden');
            }
        });
        
        // Sort headers
        document.querySelectorAll('.yale-table__sort-header, .sort-header').forEach(header => {
            header.addEventListener('click', () => {
                const field = header.getAttribute('data-sort');
                if (field === sortField) {
                    sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
                } else {
                    sortField = field;
                    sortDirection = 'desc';
                }
                
                // Update sort icons - only update them if needed
                document.querySelectorAll('.yale-table__sort-header, .sort-header').forEach(h => {
                    const currentField = h.getAttribute('data-sort');
                    const icon = h.querySelector('.yale-table__sort-icon i, .sort-icon i');
                    
                    if (icon) {
                        // Only change class if needed to avoid unnecessary DOM updates
                        const isActiveSort = currentField === sortField;
                        const newClass = isActiveSort 
                            ? (sortDirection === 'asc' ? 'fas fa-sort-up' : 'fas fa-sort-down')
                            : 'fas fa-sort';
                            
                        if (icon.className !== newClass) {
                            icon.className = newClass;
                        }
                    }
                });
                
                renderTable();
            });
        });
        
        // Only add these event listeners if Yale Modal is not available
        // This prevents duplicate event handling as the Yale Component Library 
        // already handles these cases
        if (!window.YaleModal && !yaleModal) {
            // Close when clicking outside
            window.addEventListener('click', (e) => {
                if (e.target === detailView) {
                    detailView.classList.add('hidden');
                    detailView.classList.add('yale-modal__backdrop--hidden');
                }
            });
            
            // Escape key closes modal
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && !detailView.classList.contains('yale-modal__backdrop--hidden')) {
                    detailView.classList.add('hidden');
                    detailView.classList.add('yale-modal__backdrop--hidden');
                }
            });
        }
    }
    
    // =====================================================================
    // DATA LOADING
    // =====================================================================
    
    // Load all required data
    async function loadData() {
        try {
            showLoading('Loading data...');
            
            // Load all data in parallel for better performance
            await Promise.all([
                getMetadata(),
                getExecutiveOrders(),
                getSystemInfo(),
                getStatistics()
            ]);
            
            hideLoading();
            
            // Setup and render
            populateFilterOptions();
            renderTable();
            
        } catch (error) {
            console.error('Error loading data:', error);
            showError('Failed to load data. Please try again later.');
            hideLoading();
        }
    }
    
    // Fetch system information
    async function getSystemInfo() {
        try {
            const response = await fetch('data/system_info.json');
            if (!response.ok) {
                throw new Error(`Status: ${response.status}`);
            }
            
            systemInfoData = await response.json();
            
            // Update system info elements
            systemInfo.textContent = `${systemInfoData.topicName} | Static Version`;
            
            // Format and display the last updated date
            const lastUpdated = new Date(systemInfoData.lastUpdated);
            updateDate.textContent = lastUpdated.toLocaleDateString();
            
        } catch (error) {
            console.error('Error getting system info:', error);
            systemInfo.textContent = 'Yale Executive Order Tracker | Static Version';
            updateDate.textContent = 'Unknown';
            throw error;
        }
    }
    
    // Fetch executive orders data
    async function getExecutiveOrders() {
        try {
            const response = await fetch('data/processed_executive_orders.json');
            if (!response.ok) {
                throw new Error(`Status: ${response.status}`);
            }
            
            allExecutiveOrders = await response.json();
            filteredOrders = [...allExecutiveOrders];
            
        } catch (error) {
            console.error('Error getting executive orders:', error);
            showError('Failed to load executive orders.');
            throw error;
        }
    }
    
    // Fetch metadata (categories, impact areas)
    async function getMetadata() {
        try {
            const response = await fetch('data/metadata.json');
            if (!response.ok) {
                throw new Error(`Status: ${response.status}`);
            }
            
            metadata = await response.json();
            
        } catch (error) {
            console.error('Error getting metadata:', error);
            showError('Failed to load categories and impact areas.');
            throw error;
        }
    }
    
    // Fetch statistics data
    async function getStatistics() {
        try {
            const response = await fetch('data/statistics.json');
            if (!response.ok) {
                throw new Error(`Status: ${response.status}`);
            }
            
            statistics = await response.json();
            
        } catch (error) {
            console.error('Error getting statistics:', error);
            // Non-critical, don't throw
        }
    }
    
    // =====================================================================
    // DETAIL VIEW FUNCTIONALITY
    // =====================================================================
    
    // Open detail view for a specific order
    async function openDetailView(orderId) {
        try {
            // Show loading state
            showLoading('Loading order details...');
            
            // Fetch the order details
            const response = await fetch(`data/orders/${orderId}.json`);
            if (!response.ok) {
                throw new Error(`Status: ${response.status}`);
            }
            
            const order = await response.json();
            
            // Update detail view with order information
            populateDetailView(order);
            
            // Load the summaries
            fetchPlainLanguageSummary(orderId);
            fetchExecutiveBrief(orderId);
            fetchComprehensiveAnalysis(orderId);
            
            // Show the detail view using Yale Modal if available
            if (yaleModal) {
                // Use the existing modal structure directly
                yaleModal.openModal(detailView);
            } else {
                // Fallback to original implementation
                detailView.classList.remove('hidden');
                detailView.classList.remove('yale-modal__backdrop--hidden');
            }
            
            // Hide loading
            hideLoading();
            
        } catch (error) {
            console.error('Error opening detail view:', error);
            showError('Failed to load order details.');
            hideLoading();
        }
    }
    
    // Populate the detail view with order information
    function populateDetailView(order) {
        // Update basic details
        detailTitle.textContent = order.title;
        detailOrderNumber.textContent = order.order_number;
        detailPresident.textContent = order.president;
        
        // Format and set date
        const signingDate = new Date(order.signing_date);
        detailDate.textContent = signingDate.toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        });
        
        // Set summary (if available)
        detailSummary.textContent = order.summary || 'No summary available';
        
        // Set impact level with appropriate class
        detailImpactLevel.textContent = order.impact_level;
        detailImpactLevel.className = ''; // Clear existing classes
        detailImpactLevel.classList.add('yale-badge', `yale-badge--${order.impact_level.toLowerCase()}`);
        
        // Set URL with appropriate text
        detailUrl.href = order.url;
        detailUrl.textContent = 'View Official Document';
        
        // Clear existing categories, impact areas, and university impact areas
        detailCategories.innerHTML = '';
        detailImpactAreas.innerHTML = '';
        detailUniversityImpactAreas.innerHTML = '';
        
        // Add categories
        if (order.categories && order.categories.length > 0) {
            order.categories.forEach(category => {
                const tag = document.createElement('span');
                tag.classList.add('yale-tag');
                tag.textContent = category;
                detailCategories.appendChild(tag);
            });
        } else {
            detailCategories.innerHTML = '<em>No categories available</em>';
        }
        
        // Add impact areas
        if (order.impact_areas && order.impact_areas.length > 0) {
            order.impact_areas.forEach(area => {
                const tag = document.createElement('span');
                tag.classList.add('yale-tag');
                tag.textContent = area;
                detailImpactAreas.appendChild(tag);
            });
        } else {
            detailImpactAreas.innerHTML = '<em>No impact areas available</em>';
        }
        
        // Add university impact areas
        if (order.university_impact_areas && order.university_impact_areas.length > 0) {
            order.university_impact_areas.forEach(area => {
                const tag = document.createElement('span');
                tag.classList.add('yale-tag');
                tag.textContent = area.name;
                detailUniversityImpactAreas.appendChild(tag);
            });
        } else {
            detailUniversityImpactAreas.innerHTML = '<em>No university impact areas available</em>';
        }
    }
    
    // Fetch and display the executive brief
    async function fetchExecutiveBrief(orderId) {
        try {
            const executiveBriefContent = document.getElementById('executive-brief-content');
            
            // Show loading state
            executiveBriefContent.innerHTML = `
                <div class="yale-loading">
                    <div class="yale-loading__spinner"></div>
                    <p class="yale-loading__text">Loading executive brief...</p>
                </div>
            `;
            
            // Fetch the executive brief HTML file
            const response = await fetch(`data/executive_briefs/${orderId}.html`);
            
            if (!response.ok) {
                if (response.status === 404) {
                    // No brief available - show appropriate message
                    executiveBriefContent.innerHTML = `
                        <div class="yale-alert yale-alert--info">
                            <div class="yale-alert__icon">
                                <i class="fas fa-file-alt"></i>
                            </div>
                            <div class="yale-alert__content">
                                <h3 class="yale-alert__title">No Executive Brief Available</h3>
                                <p class="yale-alert__message">An executive brief has not been generated for this executive order yet.</p>
                            </div>
                        </div>
                    `;
                    return;
                }
                throw new Error(`Status: ${response.status}`);
            }
            
            const htmlContent = await response.text();
            
            // Display the executive brief
            executiveBriefContent.innerHTML = htmlContent;
            
        } catch (error) {
            console.error('Error fetching executive brief:', error);
            document.getElementById('executive-brief-content').innerHTML = `
                <div class="yale-alert yale-alert--error">
                    <div class="yale-alert__icon">
                        <i class="fas fa-exclamation-circle"></i>
                    </div>
                    <div class="yale-alert__content">
                        <h3 class="yale-alert__title">Error Loading Brief</h3>
                        <p class="yale-alert__message">There was an error loading the executive brief. Please try again later.</p>
                    </div>
                </div>
            `;
        }
    }
    
    // Fetch and display the plain language summary
    async function fetchPlainLanguageSummary(orderId) {
        try {
            const plainSummaryContent = document.getElementById('plain-summary-content');
            
            // Show loading state
            plainSummaryContent.innerHTML = `
                <div class="yale-loading">
                    <div class="yale-loading__spinner"></div>
                    <p class="yale-loading__text">Loading plain language summary...</p>
                </div>
            `;
            
            // Fetch the summary HTML file
            const response = await fetch(`data/summaries/${orderId}.html`);
            
            if (!response.ok) {
                if (response.status === 404) {
                    // No summary available - show appropriate message
                    plainSummaryContent.innerHTML = `
                        <div class="yale-alert yale-alert--info">
                            <div class="yale-alert__icon">
                                <i class="fas fa-file-alt"></i>
                            </div>
                            <div class="yale-alert__content">
                                <h3 class="yale-alert__title">No Plain Language Summary Available</h3>
                                <p class="yale-alert__message">A plain language summary has not been generated for this executive order yet.</p>
                            </div>
                        </div>
                    `;
                    return;
                }
                throw new Error(`Status: ${response.status}`);
            }
            
            const htmlContent = await response.text();
            
            // Display the summary
            plainSummaryContent.innerHTML = htmlContent;
            
        } catch (error) {
            console.error('Error fetching plain language summary:', error);
            document.getElementById('plain-summary-content').innerHTML = `
                <div class="yale-alert yale-alert--error">
                    <div class="yale-alert__icon">
                        <i class="fas fa-exclamation-circle"></i>
                    </div>
                    <div class="yale-alert__content">
                        <h3 class="yale-alert__title">Error Loading Summary</h3>
                        <p class="yale-alert__message">There was an error loading the plain language summary. Please try again later.</p>
                    </div>
                </div>
            `;
        }
    }
    
    // Fetch and display the comprehensive analysis
    async function fetchComprehensiveAnalysis(orderId) {
        try {
            const comprehensiveAnalysisContent = document.getElementById('comprehensive-analysis-content');
            
            // Show loading state
            comprehensiveAnalysisContent.innerHTML = `
                <div class="yale-loading">
                    <div class="yale-loading__spinner"></div>
                    <p class="yale-loading__text">Loading comprehensive analysis...</p>
                </div>
            `;
            
            // Fetch the analysis HTML file
            const response = await fetch(`data/comprehensive_analyses/${orderId}.html`);
            
            if (!response.ok) {
                if (response.status === 404) {
                    // No analysis available - show appropriate message
                    comprehensiveAnalysisContent.innerHTML = `
                        <div class="yale-alert yale-alert--info">
                            <div class="yale-alert__icon">
                                <i class="fas fa-file-alt"></i>
                            </div>
                            <div class="yale-alert__content">
                                <h3 class="yale-alert__title">No Comprehensive Analysis Available</h3>
                                <p class="yale-alert__message">A comprehensive analysis has not been generated for this executive order yet.</p>
                            </div>
                        </div>
                    `;
                    return;
                }
                throw new Error(`Status: ${response.status}`);
            }
            
            const htmlContent = await response.text();
            
            // Display the analysis
            comprehensiveAnalysisContent.innerHTML = htmlContent;
            
        } catch (error) {
            console.error('Error fetching comprehensive analysis:', error);
            document.getElementById('comprehensive-analysis-content').innerHTML = `
                <div class="yale-alert yale-alert--error">
                    <div class="yale-alert__icon">
                        <i class="fas fa-exclamation-circle"></i>
                    </div>
                    <div class="yale-alert__content">
                        <h3 class="yale-alert__title">Error Loading Analysis</h3>
                        <p class="yale-alert__message">There was an error loading the comprehensive analysis. Please try again later.</p>
                    </div>
                </div>
            `;
        }
    }
    
    // =====================================================================
    // TABLE RENDERING AND FILTERING
    // =====================================================================
    
    // Fill filter dropdowns with available options
    function populateFilterOptions() {
        // Clear existing options (keep the default option)
        filterCategory.innerHTML = '<option value="">All Categories</option>';
        filterImpactLevel.innerHTML = '<option value="">All Impact Levels</option>';
        filterUniversityArea.innerHTML = '<option value="">All University Impact Areas</option>';
        
        // Add category options
        if (metadata.categories && metadata.categories.length > 0) {
            metadata.categories.forEach(category => {
                const option = document.createElement('option');
                option.value = category.name;
                option.textContent = category.name;
                filterCategory.appendChild(option);
            });
        }
        
        // Add impact level options
        const impactLevels = ['Critical', 'High', 'Medium', 'Low'];
        impactLevels.forEach(level => {
            const option = document.createElement('option');
            option.value = level;
            option.textContent = level;
            filterImpactLevel.appendChild(option);
        });
        
        // Add university impact area options
        if (metadata.universityImpactAreas && metadata.universityImpactAreas.length > 0) {
            metadata.universityImpactAreas.forEach(area => {
                const option = document.createElement('option');
                option.value = area.name;
                option.textContent = area.name;
                filterUniversityArea.appendChild(option);
            });
        }
    }
    
    // Apply all filters and re-render the table
    function applyFilters() {
        const searchText = searchInput.value.toLowerCase();
        const categoryFilter = filterCategory.value;
        const impactLevelFilter = filterImpactLevel.value;
        const universityAreaFilter = filterUniversityArea.value;
        
        // Start with all orders and apply each filter
        filteredOrders = allExecutiveOrders.filter(order => {
            // Search text filter (search in title, order number, and summary)
            // Using improved search that handles multiple words and partial matches
            let searchMatch = true;
            if (searchText !== '') {
                // Split search into words to allow partial word matching
                // Only include words with minimum length of 2 for better performance
                const searchWords = searchText.toLowerCase().split(/\s+/).filter(word => word.length > 1);
                
                if (searchWords.length > 0) {
                    // Prepare searchable text once for better performance
                    const orderText = [
                        order.title || '',
                        order.order_number || '',
                        order.summary || '',
                        order.president || ''
                    ].join(' ').toLowerCase();
                    
                    // Check if each word appears in the combined text
                    searchMatch = searchWords.every(word => orderText.includes(word));
                    
                    // Only check categories if still no match (categories are an array - more expensive to search)
                    if (!searchMatch && order.categories && order.categories.length) {
                        const categoriesText = order.categories.join(' ').toLowerCase();
                        searchMatch = searchWords.every(word => categoriesText.includes(word));
                    }
                }
            }
            
            // Category filter
            const categoryMatch = categoryFilter === '' || 
                (order.categories && order.categories.includes(categoryFilter));
            
            // Impact level filter
            const impactLevelMatch = impactLevelFilter === '' || 
                (order.impact_level && order.impact_level === impactLevelFilter);
            
            // University impact area filter - handles both string and object formats
            const universityAreaMatch = universityAreaFilter === '' || 
                (order.university_impact_areas && 
                 order.university_impact_areas.some(area => {
                    if (typeof area === 'string') {
                        return area === universityAreaFilter;
                    } else if (area && area.name) {
                        return area.name === universityAreaFilter;
                    }
                    return false;
                 }));
            
            return searchMatch && categoryMatch && impactLevelMatch && universityAreaMatch;
        });
        
        // Re-render the table with the filtered orders
        renderTable();
    }
    
    // Clear all filters
    function clearFilters() {
        searchInput.value = '';
        filterCategory.value = '';
        filterImpactLevel.value = '';
        filterUniversityArea.value = '';
        
        // Reset filteredOrders to all orders
        filteredOrders = [...allExecutiveOrders];
        
        // Re-render the table
        renderTable();
    }
    
    // Render the table with the current filtered orders
    function renderTable() {
        // Sort the filtered orders
        sortOrders();
        
        // Clear the table body
        eoTableBody.innerHTML = '';
        
        // Check if there are any filtered orders
        if (filteredOrders.length === 0) {
            // No results - show a message
            const row = document.createElement('tr');
            row.innerHTML = `
                <td colspan="5" class="yale-py-xl yale-text-center yale-text-secondary">
                    <div class="yale-flex yale-flex-col yale-items-center">
                        <i class="fas fa-search yale-text-muted yale-text-2xl yale-mb-sm"></i>
                        <p class="yale-text-lg yale-text-semibold">No executive orders found</p>
                        <p class="yale-mt-xs">Try adjusting your search criteria or clearing filters</p>
                    </div>
                </td>
            `;
            eoTableBody.appendChild(row);
            return;
        }
        
        // We don't need to add the keyboard navigation event listener here
        // It should be added only once during initialization
        
        // Create a row for each filtered order
        filteredOrders.forEach((order, index) => {
            const row = document.createElement('tr');
            row.classList.add('hover:bg-gray-50', 'cursor-pointer');
            row.setAttribute('data-order-id', order.id);
            
            // Format date for display
            let displayDate = 'Unknown';
            if (order.signing_date) {
                const date = new Date(order.signing_date);
                displayDate = date.toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'short', 
                    day: 'numeric' 
                });
            }
            
            // Create impact level badge class
            const impactLevelClass = `yale-badge--${(order.impact_level || 'medium').toLowerCase()}`;
            
            // Add cells to the row
            row.innerHTML = `
                <td class="yale-py-md yale-px-md">
                    <div class="yale-flex yale-items-start">
                        <span class="yale-badge ${impactLevelClass}">
                            ${order.impact_level || 'Medium'}
                        </span>
                    </div>
                </td>
                <td class="yale-py-md yale-px-md">
                    <div class="yale-flex yale-flex-col">
                        <span class="yale-text-semibold yale-text-yale-blue">${order.order_number || 'Unknown'}</span>
                        <span class="yale-text-sm yale-text-muted">${displayDate}</span>
                    </div>
                </td>
                <td class="yale-py-md yale-px-md">
                    <span class="yale-text-medium">${order.title || 'Untitled Order'}</span>
                </td>
                <td class="yale-py-md yale-px-md">
                    <div class="yale-tag-group">
                        ${createTagsHTML(order.categories)}
                    </div>
                </td>
                <td class="yale-py-md yale-px-md">
                    <div class="yale-tag-group">
                        ${createUniversityImpactAreasHTML(order.university_impact_areas)}
                    </div>
                </td>
            `;
            
            // Add click event to open detail view
            row.addEventListener('click', () => {
                openDetailView(order.id);
            });
            
            // Add keyboard accessibility for table rows
            row.setAttribute('tabindex', '0');
            row.setAttribute('data-row-index', index);
            row.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    openDetailView(order.id);
                }
            });
            
            // Add the row to the table
            eoTableBody.appendChild(row);
        });
    }
    
    // Sort the filtered orders
    function sortOrders() {
        filteredOrders.sort((a, b) => {
            // Get values to compare
            let valueA = a[sortField] !== undefined ? a[sortField] : '';
            let valueB = b[sortField] !== undefined ? b[sortField] : '';
            
            // Handle dates
            if (sortField === 'signing_date') {
                valueA = valueA ? new Date(valueA).getTime() : 0;
                valueB = valueB ? new Date(valueB).getTime() : 0;
            }
            
            // Perform the comparison
            if (valueA < valueB) {
                return sortDirection === 'asc' ? -1 : 1;
            }
            if (valueA > valueB) {
                return sortDirection === 'asc' ? 1 : -1;
            }
            return 0;
        });
    }
    
    // =====================================================================
    // UTILITY FUNCTIONS
    // =====================================================================
    
    // Handle keyboard navigation within the table
    function handleTableKeyboardNavigation(event) {
        if (!['ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) {
            return;
        }
        
        const rows = Array.from(eoTableBody.querySelectorAll('tr[data-row-index]'));
        if (rows.length === 0) return;
        
        // Find the currently focused row
        const currentRow = document.activeElement;
        let currentIndex = -1;
        
        if (currentRow && currentRow.tagName === 'TR' && currentRow.hasAttribute('data-row-index')) {
            currentIndex = parseInt(currentRow.getAttribute('data-row-index'), 10);
        }
        
        // Calculate new focus index based on key
        let newIndex;
        switch (event.key) {
            case 'ArrowUp':
                newIndex = currentIndex > 0 ? currentIndex - 1 : 0;
                break;
            case 'ArrowDown':
                newIndex = currentIndex < rows.length - 1 ? currentIndex + 1 : rows.length - 1;
                break;
            case 'Home':
                newIndex = 0;
                break;
            case 'End':
                newIndex = rows.length - 1;
                break;
            default:
                return;
        }
        
        // Find row with matching index and focus it
        const targetRow = rows.find(row => parseInt(row.getAttribute('data-row-index'), 10) === newIndex);
        if (targetRow) {
            event.preventDefault(); // Prevent default scrolling
            targetRow.focus();
        }
    }
    
    // Create HTML for tags (categories)
    function createTagsHTML(tags) {
        if (!tags || tags.length === 0) {
            return '<span class="yale-text-muted yale-text-sm">None</span>';
        }
        
        // Limit to 3 tags for display
        const visibleTags = tags.slice(0, 3);
        const remainingCount = tags.length - visibleTags.length;
        
        let html = visibleTags.map(tag => `
            <span class="yale-tag">
                ${tag}
            </span>
        `).join('');
        
        if (remainingCount > 0) {
            html += `<span class="yale-tag">+${remainingCount} more</span>`;
        }
        
        return html;
    }
    
    // Create HTML for university impact areas
    function createUniversityImpactAreasHTML(areas) {
        if (!areas || areas.length === 0) {
            return '<span class="yale-text-muted yale-text-sm">None</span>';
        }
        
        // Process areas (handle both string and object formats)
        const areaNames = areas.map(area => typeof area === 'string' ? area : area.name);
        
        // Limit to 3 areas for display
        const visibleAreas = areaNames.slice(0, 3);
        const remainingCount = areaNames.length - visibleAreas.length;
        
        let html = visibleAreas.map(area => `
            <span class="yale-tag">
                ${area}
            </span>
        `).join('');
        
        if (remainingCount > 0) {
            html += `<span class="yale-tag">+${remainingCount} more</span>`;
        }
        
        return html;
    }
    
    // Show a loading message
    function showLoading(message = 'Loading...') {
        // Create loading element if it doesn't exist
        let loadingElement = document.getElementById('loading-indicator');
        
        if (!loadingElement) {
            loadingElement = document.createElement('div');
            loadingElement.id = 'loading-indicator';
            loadingElement.className = 'yale-loading--overlay';
            loadingElement.innerHTML = `
                <div class="yale-loading">
                    <div class="yale-loading__spinner yale-loading__spinner--lg"></div>
                    <p id="loading-message" class="yale-loading__text">${message}</p>
                </div>
            `;
            document.body.appendChild(loadingElement);
        } else {
            // Update existing message
            document.getElementById('loading-message').textContent = message;
            loadingElement.classList.remove('hidden');
        }
    }
    
    // Hide the loading message
    function hideLoading() {
        const loadingElement = document.getElementById('loading-indicator');
        if (loadingElement) {
            loadingElement.classList.add('hidden');
        }
    }
    
    // Show an error message as a toast notification
    function showError(message) {
        if (yaleToast) {
            // Use Yale Toast component if available
            yaleToast.error(message, {
                title: 'Error',
                duration: 5000
            });
        } else {
            // Fallback to original implementation
            // Create toast element
            const toast = document.createElement('div');
            toast.className = 'yale-toast yale-toast--error';
            toast.setAttribute('role', 'alert');
            toast.innerHTML = `
                <div class="yale-toast__content">
                    <div class="yale-toast__icon">
                        <i class="fas fa-exclamation-circle"></i>
                    </div>
                    <div class="yale-toast__body">
                        <p class="yale-toast__message">${message}</p>
                    </div>
                    <button class="yale-toast__close" aria-label="Close">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            `;
            
            // Add close functionality
            const closeButton = toast.querySelector('.yale-toast__close');
            closeButton.addEventListener('click', () => {
                toast.classList.add('yale-toast--exiting');
                setTimeout(() => {
                    toast.remove();
                }, 300);
            });
            
            // Auto-remove after 5 seconds
            setTimeout(() => {
                toast.classList.add('yale-toast--exiting');
                setTimeout(() => {
                    toast.remove();
                }, 300);
            }, 5000);
            
            // Add to toast container
            toastContainer.appendChild(toast);
        }
    }
    
    // Show a success message as a toast notification
    function showSuccess(message) {
        if (yaleToast) {
            // Use Yale Toast component if available
            yaleToast.success(message, {
                title: 'Success',
                duration: 5000
            });
        } else {
            // Fallback to original implementation
            // Create toast element
            const toast = document.createElement('div');
            toast.className = 'yale-toast yale-toast--success';
            toast.setAttribute('role', 'alert');
            toast.innerHTML = `
                <div class="yale-toast__content">
                    <div class="yale-toast__icon">
                        <i class="fas fa-check-circle"></i>
                    </div>
                    <div class="yale-toast__body">
                        <p class="yale-toast__message">${message}</p>
                    </div>
                    <button class="yale-toast__close" aria-label="Close">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            `;
            
            // Add close functionality
            const closeButton = toast.querySelector('.yale-toast__close');
            closeButton.addEventListener('click', () => {
                toast.classList.add('yale-toast--exiting');
                setTimeout(() => {
                    toast.remove();
                }, 300);
            });
            
            // Auto-remove after 5 seconds
            setTimeout(() => {
                toast.classList.add('yale-toast--exiting');
                setTimeout(() => {
                    toast.remove();
                }, 300);
            }, 5000);
            
            // Add to toast container
            toastContainer.appendChild(toast);
        }
    }
    
    // =====================================================================
    // START THE APPLICATION
    // =====================================================================
    
    // Initialize the application
    init();
});