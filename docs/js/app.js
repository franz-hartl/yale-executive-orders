/**
 * Yale Executive Orders Tracker - Main Application JavaScript
 * 
 * This file contains the core functionality for the Executive Order Tracker application,
 * including data loading, table rendering, filtering, and UI management.
 */

// Wait for DOM to be fully loaded before running code
document.addEventListener('DOMContentLoaded', () => {
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
    }
    
    // Set up tab functionality
    function setupTabs() {
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                // Remove active class from all tabs
                tabs.forEach(t => t.classList.remove('active'));
                
                // Add active class to clicked tab
                tab.classList.add('active');
                
                // Hide all tab contents
                tabContents.forEach(content => content.classList.add('hidden'));
                
                // Show selected tab content
                const tabName = tab.getAttribute('data-tab');
                document.getElementById(`${tabName}-tab`).classList.remove('hidden');
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
        
        // Close detail view
        closeDetailBtn.addEventListener('click', () => {
            detailView.classList.add('hidden');
        });
        
        // Sort headers
        document.querySelectorAll('.sort-header').forEach(header => {
            header.addEventListener('click', () => {
                const field = header.getAttribute('data-sort');
                if (field === sortField) {
                    sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
                } else {
                    sortField = field;
                    sortDirection = 'desc';
                }
                renderTable();
            });
        });
        
        // Close when clicking outside
        window.addEventListener('click', (e) => {
            if (e.target === detailView) {
                detailView.classList.add('hidden');
            }
        });
        
        // Escape key closes modal
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && !detailView.classList.contains('hidden')) {
                detailView.classList.add('hidden');
            }
        });
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
            
            // Show the detail view
            detailView.classList.remove('hidden');
            
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
        detailImpactLevel.classList.add('impact-badge', `impact-${order.impact_level.toLowerCase()}`);
        
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
                tag.classList.add('tag');
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
                tag.classList.add('tag');
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
                tag.classList.add('tag');
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
                <div class="flex justify-center items-center py-8">
                    <div class="flex flex-col items-center" aria-live="polite">
                        <i class="fas fa-spinner fa-spin text-blue-700 text-2xl mb-3" aria-hidden="true"></i>
                        <p class="text-gray-500">Loading executive brief...</p>
                    </div>
                </div>
            `;
            
            // Fetch the executive brief HTML file
            const response = await fetch(`data/executive_briefs/${orderId}.html`);
            
            if (!response.ok) {
                if (response.status === 404) {
                    // No brief available - show appropriate message
                    executiveBriefContent.innerHTML = `
                        <div class="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
                            <i class="fas fa-file-alt text-gray-400 text-4xl mb-4" aria-hidden="true"></i>
                            <h3 class="text-lg font-medium text-gray-800 mb-2">No Executive Brief Available</h3>
                            <p class="text-gray-500">An executive brief has not been generated for this executive order yet.</p>
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
                <div class="bg-red-50 border border-red-200 rounded-lg p-6 text-center" role="alert">
                    <i class="fas fa-exclamation-circle text-red-500 text-4xl mb-4" aria-hidden="true"></i>
                    <h3 class="text-lg font-medium text-red-800 mb-2">Error Loading Brief</h3>
                    <p class="text-red-500">There was an error loading the executive brief. Please try again later.</p>
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
                <div class="flex justify-center items-center py-8">
                    <div class="flex flex-col items-center" aria-live="polite">
                        <i class="fas fa-spinner fa-spin text-blue-700 text-2xl mb-3" aria-hidden="true"></i>
                        <p class="text-gray-500">Loading plain language summary...</p>
                    </div>
                </div>
            `;
            
            // Fetch the summary HTML file
            const response = await fetch(`data/summaries/${orderId}.html`);
            
            if (!response.ok) {
                if (response.status === 404) {
                    // No summary available - show appropriate message
                    plainSummaryContent.innerHTML = `
                        <div class="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
                            <i class="fas fa-file-alt text-gray-400 text-4xl mb-4" aria-hidden="true"></i>
                            <h3 class="text-lg font-medium text-gray-800 mb-2">No Plain Language Summary Available</h3>
                            <p class="text-gray-500">A plain language summary has not been generated for this executive order yet.</p>
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
                <div class="bg-red-50 border border-red-200 rounded-lg p-6 text-center" role="alert">
                    <i class="fas fa-exclamation-circle text-red-500 text-4xl mb-4" aria-hidden="true"></i>
                    <h3 class="text-lg font-medium text-red-800 mb-2">Error Loading Summary</h3>
                    <p class="text-red-500">There was an error loading the plain language summary. Please try again later.</p>
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
                <div class="flex justify-center items-center py-8">
                    <div class="flex flex-col items-center" aria-live="polite">
                        <i class="fas fa-spinner fa-spin text-blue-700 text-2xl mb-3" aria-hidden="true"></i>
                        <p class="text-gray-500">Loading comprehensive analysis...</p>
                    </div>
                </div>
            `;
            
            // Fetch the analysis HTML file
            const response = await fetch(`data/comprehensive_analyses/${orderId}.html`);
            
            if (!response.ok) {
                if (response.status === 404) {
                    // No analysis available - show appropriate message
                    comprehensiveAnalysisContent.innerHTML = `
                        <div class="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
                            <i class="fas fa-file-alt text-gray-400 text-4xl mb-4" aria-hidden="true"></i>
                            <h3 class="text-lg font-medium text-gray-800 mb-2">No Comprehensive Analysis Available</h3>
                            <p class="text-gray-500">A comprehensive analysis has not been generated for this executive order yet.</p>
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
                <div class="bg-red-50 border border-red-200 rounded-lg p-6 text-center" role="alert">
                    <i class="fas fa-exclamation-circle text-red-500 text-4xl mb-4" aria-hidden="true"></i>
                    <h3 class="text-lg font-medium text-red-800 mb-2">Error Loading Analysis</h3>
                    <p class="text-red-500">There was an error loading the comprehensive analysis. Please try again later.</p>
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
            const searchMatch = searchText === '' || 
                (order.title && order.title.toLowerCase().includes(searchText)) ||
                (order.order_number && order.order_number.toLowerCase().includes(searchText)) ||
                (order.summary && order.summary.toLowerCase().includes(searchText));
            
            // Category filter
            const categoryMatch = categoryFilter === '' || 
                (order.categories && order.categories.includes(categoryFilter));
            
            // Impact level filter
            const impactLevelMatch = impactLevelFilter === '' || 
                (order.impact_level && order.impact_level === impactLevelFilter);
            
            // University impact area filter
            const universityAreaMatch = universityAreaFilter === '' || 
                (order.university_impact_areas && 
                 order.university_impact_areas.some(area => 
                    typeof area === 'string' 
                        ? area === universityAreaFilter 
                        : area.name === universityAreaFilter
                 ));
            
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
                <td colspan="5" class="py-8 text-center text-gray-500">
                    <div class="flex flex-col items-center">
                        <i class="fas fa-search text-gray-400 text-2xl mb-3"></i>
                        <p class="text-lg font-medium">No executive orders found</p>
                        <p class="mt-1">Try adjusting your search criteria or clearing filters</p>
                    </div>
                </td>
            `;
            eoTableBody.appendChild(row);
            return;
        }
        
        // Create a row for each filtered order
        filteredOrders.forEach(order => {
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
            
            // Create impact level badge
            const impactLevelClass = `impact-${(order.impact_level || 'medium').toLowerCase()}`;
            
            // Add cells to the row
            row.innerHTML = `
                <td class="py-4 px-4 border-b">
                    <div class="flex items-start">
                        <span class="impact-badge ${impactLevelClass} mr-3">
                            ${order.impact_level || 'Medium'}
                        </span>
                    </div>
                </td>
                <td class="py-4 px-4 border-b">
                    <div class="flex flex-col">
                        <span class="font-semibold text-accent-blue-primary">${order.order_number || 'Unknown'}</span>
                        <span class="text-sm text-gray-500">${displayDate}</span>
                    </div>
                </td>
                <td class="py-4 px-4 border-b">
                    <span class="font-medium">${order.title || 'Untitled Order'}</span>
                </td>
                <td class="py-4 px-4 border-b">
                    <div class="flex flex-wrap gap-1">
                        ${createTagsHTML(order.categories)}
                    </div>
                </td>
                <td class="py-4 px-4 border-b">
                    <div class="flex flex-wrap gap-1">
                        ${createUniversityImpactAreasHTML(order.university_impact_areas)}
                    </div>
                </td>
            `;
            
            // Add click event to open detail view
            row.addEventListener('click', () => {
                openDetailView(order.id);
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
    
    // Create HTML for tags (categories)
    function createTagsHTML(tags) {
        if (!tags || tags.length === 0) {
            return '<span class="text-gray-400 text-sm">None</span>';
        }
        
        // Limit to 3 tags for display
        const visibleTags = tags.slice(0, 3);
        const remainingCount = tags.length - visibleTags.length;
        
        let html = visibleTags.map(tag => `
            <span class="tag">
                ${tag}
            </span>
        `).join('');
        
        if (remainingCount > 0) {
            html += `<span class="tag">+${remainingCount} more</span>`;
        }
        
        return html;
    }
    
    // Create HTML for university impact areas
    function createUniversityImpactAreasHTML(areas) {
        if (!areas || areas.length === 0) {
            return '<span class="text-gray-400 text-sm">None</span>';
        }
        
        // Process areas (handle both string and object formats)
        const areaNames = areas.map(area => typeof area === 'string' ? area : area.name);
        
        // Limit to 3 areas for display
        const visibleAreas = areaNames.slice(0, 3);
        const remainingCount = areaNames.length - visibleAreas.length;
        
        let html = visibleAreas.map(area => `
            <span class="tag">
                ${area}
            </span>
        `).join('');
        
        if (remainingCount > 0) {
            html += `<span class="tag">+${remainingCount} more</span>`;
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
            loadingElement.className = 'fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50';
            loadingElement.innerHTML = `
                <div class="bg-white p-6 rounded-lg shadow-xl max-w-md w-full text-center">
                    <div class="flex justify-center mb-4">
                        <i class="fas fa-spinner fa-spin text-accent-blue-primary text-3xl"></i>
                    </div>
                    <p id="loading-message" class="text-lg text-text-primary">${message}</p>
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
        // Create toast element
        const toast = document.createElement('div');
        toast.className = 'bg-red-50 border border-red-200 rounded-lg p-4 mb-3 shadow-lg animate-fade-in max-w-md';
        toast.setAttribute('role', 'alert');
        toast.innerHTML = `
            <div class="flex items-center">
                <i class="fas fa-exclamation-circle text-red-500 mr-3"></i>
                <div class="text-red-800">${message}</div>
            </div>
            <button class="absolute top-1 right-1 text-red-500 hover:text-red-700 p-1" aria-label="Close">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        // Add close functionality
        const closeButton = toast.querySelector('button');
        closeButton.addEventListener('click', () => {
            toast.classList.add('opacity-0');
            setTimeout(() => {
                toast.remove();
            }, 300);
        });
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            toast.classList.add('opacity-0');
            setTimeout(() => {
                toast.remove();
            }, 300);
        }, 5000);
        
        // Add to toast container
        toastContainer.appendChild(toast);
    }
    
    // Show a success message as a toast notification
    function showSuccess(message) {
        // Create toast element
        const toast = document.createElement('div');
        toast.className = 'bg-green-50 border border-green-200 rounded-lg p-4 mb-3 shadow-lg animate-fade-in max-w-md';
        toast.setAttribute('role', 'alert');
        toast.innerHTML = `
            <div class="flex items-center">
                <i class="fas fa-check-circle text-green-500 mr-3"></i>
                <div class="text-green-800">${message}</div>
            </div>
            <button class="absolute top-1 right-1 text-green-500 hover:text-green-700 p-1" aria-label="Close">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        // Add close functionality
        const closeButton = toast.querySelector('button');
        closeButton.addEventListener('click', () => {
            toast.classList.add('opacity-0');
            setTimeout(() => {
                toast.remove();
            }, 300);
        });
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            toast.classList.add('opacity-0');
            setTimeout(() => {
                toast.remove();
            }, 300);
        }, 5000);
        
        // Add to toast container
        toastContainer.appendChild(toast);
    }
    
    // =====================================================================
    // START THE APPLICATION
    // =====================================================================
    
    // Initialize the application
    init();
});