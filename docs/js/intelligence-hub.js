/**
 * Yale Executive Orders Tracker - Intelligence Hub JavaScript
 * 
 * This file contains the functionality for the Executive Order Intelligence Hub,
 * including component rendering, data processing, and interaction handlers.
 */

// Module for Intelligence Hub functionality
const IntelligenceHub = (function() {
    // Private variables
    let currentOrder = null;
    let currentHub = null;
    
    // DOM element references
    let intelligenceHubTab = null;
    let intelligenceHubContent = null;
    
    // Debug flag
    const DEBUG = true;
    
    // =====================================================================
    // INITIALIZATION
    // =====================================================================
    
    // Initialize the Intelligence Hub
    function init() {
        // Create tab for Intelligence Hub if it doesn't exist
        createIntelligenceHubTab();
        
        // Create container for Intelligence Hub content
        createIntelligenceHubContainer();
        
        console.log('Intelligence Hub initialized');
    }
    
    // Create Intelligence Hub tab
    function createIntelligenceHubTab() {
        // Get the tabs navigation
        const tabsNav = document.querySelector('.yale-tabs__nav');
        if (!tabsNav) return;
        
        // Check if tab already exists
        const existingTab = document.querySelector('[data-tab-target="intelligence-hub-tab"]');
        if (existingTab) {
            intelligenceHubTab = existingTab;
            return;
        }
        
        // Create tab button
        intelligenceHubTab = document.createElement('button');
        intelligenceHubTab.id = 'tab-intelligence-hub';
        intelligenceHubTab.className = 'yale-tab-button yale-tab-button--intelligence-hub';
        intelligenceHubTab.setAttribute('data-tab-target', 'intelligence-hub-tab');
        intelligenceHubTab.setAttribute('role', 'tab');
        intelligenceHubTab.setAttribute('aria-selected', 'false');
        intelligenceHubTab.setAttribute('aria-controls', 'intelligence-hub-tab');
        intelligenceHubTab.textContent = 'Intelligence Hub';
        
        // Add tab to navigation
        tabsNav.appendChild(intelligenceHubTab);
    }
    
    // Create Intelligence Hub container
    function createIntelligenceHubContainer() {
        // Get the tab contents container
        const tabContents = document.querySelector('.yale-py-md');
        if (!tabContents) return;
        
        // Check if container already exists
        const existingContainer = document.getElementById('intelligence-hub-tab');
        if (existingContainer) {
            intelligenceHubContent = existingContainer;
            return;
        }
        
        // Create tab content container
        intelligenceHubContent = document.createElement('div');
        intelligenceHubContent.id = 'intelligence-hub-tab';
        intelligenceHubContent.className = 'yale-tab-content yale-tab-content--hidden';
        intelligenceHubContent.setAttribute('role', 'tabpanel');
        
        // Add loading state initially
        intelligenceHubContent.innerHTML = `
            <div class="yale-loading">
                <p class="yale-loading__text">Loading Intelligence Hub...</p>
            </div>
        `;
        
        // Add container to tab contents
        tabContents.appendChild(intelligenceHubContent);
    }
    
    // =====================================================================
    // PUBLIC METHODS
    // =====================================================================
    
    // Load and display Intelligence Hub for an order
    function loadOrderIntelligence(orderId, orderData) {
        // Update current order
        currentOrder = orderData;
        
        // Show loading state
        intelligenceHubContent.innerHTML = `
            <div class="yale-loading">
                <p class="yale-loading__text">Loading Intelligence Hub for ${orderData.order_number}...</p>
            </div>
        `;
        
        if (DEBUG) {
            console.log("Loading Intelligence Hub for order:", orderId);
            console.log("Order data:", orderData);
            console.log("Intelligence Hub data available:", orderData.intelligence_hub ? true : false);
        }
        
        // Check if Intelligence Hub data exists
        if (!orderData.intelligence_hub) {
            if (DEBUG) console.log("No Intelligence Hub data found in order data");
            showNoDataMessage();
            return;
        }
        
        // Store the Intelligence Hub data
        currentHub = orderData.intelligence_hub;
        if (DEBUG) console.log("Intelligence Hub data:", currentHub);
        
        // Render Intelligence Hub components
        renderIntelligenceHub();
    }
    
    // Show message when no Intelligence Hub data is available
    function showNoDataMessage() {
        intelligenceHubContent.innerHTML = `
            <div class="yale-alert yale-alert--info">
                <div class="yale-alert__icon">
                    <i class="fas fa-info-circle"></i>
                </div>
                <div class="yale-alert__content">
                    <h3 class="yale-alert__title">Intelligence Hub Not Available</h3>
                    <p class="yale-alert__message">
                        Enhanced Intelligence Hub data is not available for this executive order yet.
                    </p>
                </div>
            </div>
        `;
    }
    
    // Render the complete Intelligence Hub
    function renderIntelligenceHub() {
        // Create Intelligence Hub layout
        const hubHTML = `
            <div class="intelligence-hub">
                ${renderOrderSnapshot()}
                
                <div class="yale-grid yale-grid-cols-1 yale-md-grid-cols-2 yale-gap-md">
                    <div>
                        ${renderKeyIntelligence()}
                        ${renderTimelineNavigator()}
                    </div>
                    <div>
                        ${renderSourceIntelligence()}
                    </div>
                </div>
                
                ${renderYaleResponse()}
                ${renderIntelligenceNetwork()}
            </div>
        `;
        
        // Set the HTML content
        intelligenceHubContent.innerHTML = hubHTML;
        
        // Initialize interactive components
        initializeInteractiveComponents();
    }
    
    // Initialize interactive components after rendering
    function initializeInteractiveComponents() {
        // Initialize collapsible sections
        const collapsibleHeaders = intelligenceHubContent.querySelectorAll('.collapsible-section__header');
        collapsibleHeaders.forEach(header => {
            header.addEventListener('click', () => {
                const section = header.closest('.collapsible-section');
                const body = section.querySelector('.collapsible-section__body');
                const icon = header.querySelector('.collapsible-section__icon');
                
                // Toggle body visibility
                if (body.style.display === 'none') {
                    body.style.display = 'block';
                    icon.classList.add('collapsible-section__icon--expanded');
                } else {
                    body.style.display = 'none';
                    icon.classList.remove('collapsible-section__icon--expanded');
                }
            });
        });
        
        // Initialize related order links
        const relatedOrderCards = intelligenceHubContent.querySelectorAll('.related-order-card');
        relatedOrderCards.forEach(card => {
            const orderId = card.getAttribute('data-order-id');
            if (orderId) {
                card.addEventListener('click', () => {
                    // Call the global openDetailView function
                    if (typeof openDetailView === 'function') {
                        openDetailView(orderId);
                    }
                });
            }
        });
    }
    
    // =====================================================================
    // COMPONENT RENDERING
    // =====================================================================
    
    // Render Order Snapshot component
    function renderOrderSnapshot() {
        // Get order data and hub data
        const order = currentOrder;
        const hub = currentHub;
        
        // Determine Yale alert level class
        const alertLevel = hub.yale_alert_level || 'Moderate';
        const alertClass = `order-snapshot__alert--${alertLevel.toLowerCase()}`;
        
        // Format the date
        const signingDate = new Date(order.signing_date);
        const formattedDate = signingDate.toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        });
        
        // Generate HTML for category tags
        const tagsList = order.categories || [];
        const tagsHTML = tagsList.map(tag => `
            <span class="yale-tag">${tag}</span>
        `).join('');
        
        return `
            <div class="order-snapshot">
                <div class="order-snapshot__header">
                    <div>
                        <h3 class="order-snapshot__title">
                            EO-${order.order_number}: "${order.title}"
                        </h3>
                        <div class="order-snapshot__metadata">
                            <span class="order-snapshot__label">Issued:</span>
                            <span class="order-snapshot__value">${formattedDate}</span>
                            <span class="yale-text-muted">|</span>
                            <span class="order-snapshot__label">Status:</span>
                            <span class="order-snapshot__value">${order.status || 'Active'}</span>
                        </div>
                    </div>
                    
                    <div class="order-snapshot__alert ${alertClass}">
                        <i class="fas fa-exclamation-triangle"></i>
                        <span>Yale Alert Level: ${alertLevel}</span>
                    </div>
                </div>
                
                <div class="order-snapshot__tags">
                    ${tagsHTML}
                </div>
            </div>
        `;
    }
    
    // Render Key Intelligence component
    function renderKeyIntelligence() {
        // Get hub data
        const hub = currentHub;
        
        // Format confidence rating
        const confidenceRating = hub.confidence_rating || 0.85;
        const confidencePercent = Math.round(confidenceRating * 100);
        
        // Format what changed bullets
        let whatChangedHTML = '<p class="yale-text-muted">No changes identified</p>';
        if (hub.what_changed) {
            const bulletPoints = hub.what_changed.split('•').filter(item => item.trim());
            if (bulletPoints.length > 0) {
                whatChangedHTML = `
                    <ul class="key-intelligence__bullet-list">
                        ${bulletPoints.map(item => `<li>${item.trim()}</li>`).join('')}
                    </ul>
                `;
            }
        }
        
        return `
            <div class="key-intelligence">
                <div class="key-intelligence__header">
                    <h3 class="key-intelligence__title">Key Intelligence</h3>
                    
                    <div class="confidence-rating">
                        <span class="confidence-rating__label">AI Confidence:</span>
                        <div class="confidence-rating__bar">
                            <div class="confidence-rating__fill" style="width: ${confidencePercent}%"></div>
                        </div>
                        <span class="confidence-rating__value">${confidencePercent}%</span>
                    </div>
                </div>
                
                <div class="key-intelligence__summary">
                    ${currentOrder.summary || 'No summary available.'}
                </div>
                
                <div class="key-intelligence__section">
                    <h4 class="key-intelligence__section-title">Core Impact</h4>
                    <div class="key-intelligence__content">
                        ${hub.core_impact || 'No core impact information available.'}
                    </div>
                </div>
                
                <div class="key-intelligence__section">
                    <h4 class="key-intelligence__section-title">What Changed</h4>
                    <div class="key-intelligence__content">
                        ${whatChangedHTML}
                    </div>
                </div>
                
                ${hub.yale_imperative ? `
                    <div class="yale-imperative">
                        <div class="yale-imperative__label">Yale Imperative</div>
                        <div class="yale-imperative__content">${hub.yale_imperative}</div>
                    </div>
                ` : ''}
            </div>
        `;
    }
    
    // Render Timeline Navigator component
    function renderTimelineNavigator() {
        // Get hub data
        const hub = currentHub;
        const timeline = hub.timeline_navigator || {};
        
        // Combine all events and sort by date
        const allEvents = [];
        
        // Add signing date event
        if (timeline.signing_date) {
            allEvents.push({
                date: timeline.signing_date,
                type: 'Signing',
                description: 'Executive Order signed by the President',
                is_deadline: false,
                is_yale_decision_point: false,
                status: 'Completed'
            });
        }
        
        // Add effective date event
        if (timeline.effective_date) {
            allEvents.push({
                date: timeline.effective_date,
                type: 'Effective',
                description: 'Executive Order takes effect',
                is_deadline: false,
                is_yale_decision_point: false,
                status: timeline.effective_date <= new Date().toISOString().split('T')[0] ? 'Completed' : 'Pending'
            });
        }
        
        // Add implementation deadlines
        if (timeline.implementation_deadlines && timeline.implementation_deadlines.length > 0) {
            timeline.implementation_deadlines.forEach(deadline => {
                allEvents.push({
                    ...deadline,
                    is_deadline: true,
                    is_yale_decision_point: false
                });
            });
        }
        
        // Add Yale decision points
        if (timeline.yale_decision_points && timeline.yale_decision_points.length > 0) {
            timeline.yale_decision_points.forEach(decision => {
                allEvents.push({
                    ...decision,
                    is_deadline: false,
                    is_yale_decision_point: true
                });
            });
        }
        
        // Add other events
        if (timeline.events && timeline.events.length > 0) {
            timeline.events.forEach(event => {
                // Only add if not already included (to avoid duplicates)
                const isDuplicate = allEvents.some(e => 
                    e.date === event.event_date && 
                    e.type === event.event_type && 
                    e.description === event.event_description
                );
                
                if (!isDuplicate) {
                    allEvents.push({
                        date: event.event_date,
                        type: event.event_type,
                        description: event.event_description,
                        is_deadline: event.is_deadline,
                        is_yale_decision_point: event.is_yale_decision_point,
                        status: event.status,
                        importance_level: event.importance_level
                    });
                }
            });
        }
        
        // Sort events by date
        allEvents.sort((a, b) => {
            const dateA = new Date(a.date || a.event_date);
            const dateB = new Date(b.date || b.event_date);
            return dateA - dateB;
        });
        
        // Generate HTML for timeline events
        const eventsHTML = allEvents.map(event => {
            // Determine marker class
            let markerClass = '';
            if (event.status === 'Completed') {
                markerClass = 'timeline__event-marker--completed';
            } else if (event.is_deadline) {
                markerClass = 'timeline__event-marker--deadline';
            } else if (event.is_yale_decision_point) {
                markerClass = 'timeline__event-marker--decision';
            }
            
            // Format date
            const eventDate = new Date(event.date || event.event_date);
            const formattedDate = eventDate.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });
            
            // Create badge if needed
            let badge = '';
            if (event.is_deadline) {
                badge = '<span class="timeline__event-badge timeline__event-badge--deadline">Deadline</span>';
            } else if (event.is_yale_decision_point) {
                badge = '<span class="timeline__event-badge timeline__event-badge--decision">Yale Decision</span>';
            }
            
            return `
                <div class="timeline__event">
                    <div class="timeline__event-marker ${markerClass}"></div>
                    <div class="timeline__event-content">
                        <div class="timeline__event-date">${formattedDate}</div>
                        <div class="timeline__event-title">
                            ${event.type || event.event_type}${badge}
                        </div>
                        <div class="timeline__event-description">
                            ${event.description || event.event_description || ''}
                        </div>
                    </div>
                </div>
            `;
        }).join('');
        
        return `
            <div class="timeline-navigator">
                <div class="timeline-navigator__header">
                    <h3 class="timeline-navigator__title">Timeline Navigator</h3>
                    <div class="timeline-navigator__subtitle">Implementation milestones and decision points</div>
                </div>
                
                <div class="timeline">
                    <div class="timeline__line"></div>
                    ${eventsHTML}
                </div>
            </div>
        `;
    }
    
    // Render Source Intelligence Matrix component
    function renderSourceIntelligence() {
        // Get hub data
        const hub = currentHub;
        const sources = hub.source_intelligence || {};
        
        // Generate HTML for federal sources
        let federalSourcesHTML = '';
        if (sources.federal_sources) {
            // Federal Register sources
            if (sources.federal_sources.federal_register && sources.federal_sources.federal_register.length > 0) {
                const register = sources.federal_sources.federal_register[0]; // Take the first one for now
                
                federalSourcesHTML += `
                    <div class="source-card">
                        <div class="source-card__header">
                            <div class="source-card__title">
                                <i class="fas fa-landmark source-card__icon"></i>
                                Federal Register
                            </div>
                            <div class="source-card__date">
                                ${formatDate(register.publication_date)}
                            </div>
                        </div>
                        <div class="source-card__body">
                            <div class="source-card__content">
                                ${register.content || 'No content available'}
                            </div>
                            
                            ${register.key_provisions ? `
                                <div class="source-card__section">
                                    <h4 class="source-card__section-title">Key Provisions</h4>
                                    <div class="source-card__section-content">
                                        ${register.key_provisions.replace(/•/g, '<br>•')}
                                    </div>
                                </div>
                            ` : ''}
                            
                            ${register.specific_requirements ? `
                                <div class="source-card__section">
                                    <h4 class="source-card__section-title">Specific Requirements</h4>
                                    <div class="source-card__section-content">
                                        ${register.specific_requirements.replace(/•/g, '<br>•')}
                                    </div>
                                </div>
                            ` : ''}
                        </div>
                        ${register.url ? `
                            <div class="source-card__footer">
                                <a href="${register.url}" target="_blank" class="yale-btn yale-btn--sm yale-btn--outline">
                                    View Source <i class="fas fa-external-link-alt yale-ml-xs"></i>
                                </a>
                            </div>
                        ` : ''}
                    </div>
                `;
            }
            
            // Agency guidance
            if (sources.federal_sources.agency_guidance && sources.federal_sources.agency_guidance.length > 0) {
                federalSourcesHTML += '<h4 class="yale-text-md yale-text-semibold yale-mb-sm">Agency Guidance</h4>';
                
                sources.federal_sources.agency_guidance.forEach(agency => {
                    federalSourcesHTML += `
                        <div class="source-card">
                            <div class="source-card__header">
                                <div class="source-card__title">
                                    <i class="fas fa-university source-card__icon"></i>
                                    ${agency.agency_name}
                                </div>
                                <div class="source-card__date">
                                    ${formatDate(agency.publication_date)}
                                </div>
                            </div>
                            <div class="source-card__body">
                                <div class="source-card__content">
                                    <strong>${agency.title || ''}</strong>
                                    <p>${agency.summary || 'No summary available'}</p>
                                </div>
                                
                                ${agency.grant_impact ? `
                                    <div class="source-card__section">
                                        <h4 class="source-card__section-title">Grant Impact</h4>
                                        <div class="source-card__section-content">
                                            ${agency.grant_impact}
                                        </div>
                                    </div>
                                ` : ''}
                                
                                ${agency.research_implications ? `
                                    <div class="source-card__section">
                                        <h4 class="source-card__section-title">Research Implications</h4>
                                        <div class="source-card__section-content">
                                            ${agency.research_implications}
                                        </div>
                                    </div>
                                ` : ''}
                                
                                ${agency.key_deadlines ? `
                                    <div class="source-card__section">
                                        <h4 class="source-card__section-title">Key Deadlines</h4>
                                        <div class="source-card__section-content">
                                            ${agency.key_deadlines}
                                        </div>
                                    </div>
                                ` : ''}
                            </div>
                            ${agency.url ? `
                                <div class="source-card__footer">
                                    <a href="${agency.url}" target="_blank" class="yale-btn yale-btn--sm yale-btn--outline">
                                        View Source <i class="fas fa-external-link-alt yale-ml-xs"></i>
                                    </a>
                                </div>
                            ` : ''}
                        </div>
                    `;
                });
            }
        }
        
        // Generate HTML for analysis & interpretation
        let analysisHTML = '';
        if (sources.analysis_interpretation) {
            // University associations
            if (sources.analysis_interpretation.university_associations && sources.analysis_interpretation.university_associations.length > 0) {
                analysisHTML += '<h4 class="yale-text-md yale-text-semibold yale-mb-sm">University Associations</h4>';
                
                sources.analysis_interpretation.university_associations.forEach(association => {
                    analysisHTML += `
                        <div class="source-card">
                            <div class="source-card__header">
                                <div class="source-card__title">
                                    <i class="fas fa-users source-card__icon"></i>
                                    ${association.association_name}
                                </div>
                                <div class="source-card__date">
                                    ${formatDate(association.publication_date)}
                                </div>
                            </div>
                            <div class="source-card__body">
                                <div class="source-card__content">
                                    <strong>${association.title || ''}</strong>
                                    <p>${association.summary || 'No summary available'}</p>
                                </div>
                                
                                ${association.institution_perspective ? `
                                    <div class="source-card__section">
                                        <h4 class="source-card__section-title">Institution Perspective</h4>
                                        <div class="source-card__section-content">
                                            ${association.institution_perspective}
                                        </div>
                                    </div>
                                ` : ''}
                                
                                ${association.recommended_actions ? `
                                    <div class="source-card__section">
                                        <h4 class="source-card__section-title">Recommended Actions</h4>
                                        <div class="source-card__section-content">
                                            ${association.recommended_actions.replace(/•/g, '<br>•')}
                                        </div>
                                    </div>
                                ` : ''}
                            </div>
                            ${association.url ? `
                                <div class="source-card__footer">
                                    <a href="${association.url}" target="_blank" class="yale-btn yale-btn--sm yale-btn--outline">
                                        View Source <i class="fas fa-external-link-alt yale-ml-xs"></i>
                                    </a>
                                </div>
                            ` : ''}
                        </div>
                    `;
                });
            }
            
            // Legal analysis
            if (sources.analysis_interpretation.legal_analysis && sources.analysis_interpretation.legal_analysis.length > 0) {
                analysisHTML += '<h4 class="yale-text-md yale-text-semibold yale-mb-sm">Legal Analysis</h4>';
                
                sources.analysis_interpretation.legal_analysis.forEach(analysis => {
                    analysisHTML += `
                        <div class="source-card">
                            <div class="source-card__header">
                                <div class="source-card__title">
                                    <i class="fas fa-balance-scale source-card__icon"></i>
                                    ${analysis.source || 'Legal Analysis'}
                                </div>
                                <div class="source-card__date">
                                    ${formatDate(analysis.analysis_date)}
                                </div>
                            </div>
                            <div class="source-card__body">
                                ${analysis.challenge_status ? `
                                    <div class="source-card__section">
                                        <h4 class="source-card__section-title">Challenge Status</h4>
                                        <div class="source-card__section-content">
                                            ${analysis.challenge_status}
                                        </div>
                                    </div>
                                ` : ''}
                                
                                ${analysis.enforcement_prediction ? `
                                    <div class="source-card__section">
                                        <h4 class="source-card__section-title">Enforcement Prediction</h4>
                                        <div class="source-card__section-content">
                                            ${analysis.enforcement_prediction}
                                        </div>
                                    </div>
                                ` : ''}
                                
                                ${analysis.yale_specific_notes ? `
                                    <div class="source-card__section">
                                        <h4 class="source-card__section-title">Yale-Specific Notes</h4>
                                        <div class="source-card__section-content">
                                            ${analysis.yale_specific_notes}
                                        </div>
                                    </div>
                                ` : ''}
                            </div>
                        </div>
                    `;
                });
            }
        }
        
        return `
            <div class="source-intelligence">
                <div class="source-intelligence__header">
                    <h3 class="source-intelligence__title">Source Intelligence Matrix</h3>
                    <div class="source-intelligence__subtitle">Dynamically populated from multiple sources</div>
                </div>
                
                <div class="collapsible-section">
                    <div class="collapsible-section__header">
                        <h4 class="collapsible-section__title">
                            <i class="fas fa-landmark"></i>
                            Federal Sources
                        </h4>
                        <i class="fas fa-chevron-down collapsible-section__icon"></i>
                    </div>
                    <div class="collapsible-section__body">
                        ${federalSourcesHTML || '<p class="yale-text-muted">No federal sources available</p>'}
                    </div>
                </div>
                
                <div class="collapsible-section">
                    <div class="collapsible-section__header">
                        <h4 class="collapsible-section__title">
                            <i class="fas fa-search"></i>
                            Analysis & Interpretation
                        </h4>
                        <i class="fas fa-chevron-down collapsible-section__icon"></i>
                    </div>
                    <div class="collapsible-section__body">
                        ${analysisHTML || '<p class="yale-text-muted">No analysis sources available</p>'}
                    </div>
                </div>
            </div>
        `;
    }
    
    // Render Yale Response Framework component
    function renderYaleResponse() {
        // Get hub data
        const hub = currentHub;
        const yaleResponse = hub.yale_response || {};
        
        // Generate HTML for department impact
        let departmentImpactHTML = '';
        if (yaleResponse.framework && yaleResponse.framework.length > 0) {
            yaleResponse.framework.forEach(department => {
                // Determine impact level class
                let impactLevelClass = 'department-impact__fill--medium';
                let impactPercent = 50;
                
                if (department.impact_intensity) {
                    impactPercent = Math.min(100, Math.round((department.impact_intensity / 10) * 100));
                    
                    if (department.impact_intensity >= 7) {
                        impactLevelClass = 'department-impact__fill--high';
                    } else if (department.impact_intensity <= 3) {
                        impactLevelClass = 'department-impact__fill--low';
                    }
                }
                
                departmentImpactHTML += `
                    <div class="department-impact__item">
                        <div class="department-impact__name">${department.department_name}</div>
                        <div class="department-impact__rating">
                            <span class="department-impact__label">Impact:</span>
                            <div class="department-impact__bar">
                                <div class="department-impact__fill ${impactLevelClass}" style="width: ${impactPercent}%"></div>
                            </div>
                            <span class="department-impact__value">${department.impact_intensity || '-'}/10</span>
                        </div>
                        <div class="department-impact__description">
                            ${department.resource_requirements || 'No resource requirements specified'}
                        </div>
                    </div>
                `;
            });
        }
        
        // Generate HTML for action requirements
        let actionRequirementsHTML = '';
        if (yaleResponse.action_requirements && yaleResponse.action_requirements.length > 0) {
            actionRequirementsHTML = `
                <table class="action-table">
                    <thead>
                        <tr>
                            <th>Priority</th>
                            <th>Action</th>
                            <th>Department</th>
                            <th>Deadline</th>
                        </tr>
                    </thead>
                    <tbody>
            `;
            
            yaleResponse.action_requirements.forEach(action => {
                // Determine priority class
                let priorityClass = 'action-table__priority--recommended';
                if (action.priority_level === 'Critical') {
                    priorityClass = 'action-table__priority--critical';
                } else if (action.priority_level === 'Required') {
                    priorityClass = 'action-table__priority--required';
                }
                
                // Format deadline
                let deadline = 'Not specified';
                if (action.deadline) {
                    const deadlineDate = new Date(action.deadline);
                    deadline = deadlineDate.toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                    });
                }
                
                actionRequirementsHTML += `
                    <tr>
                        <td>
                            <span class="action-table__priority ${priorityClass}">
                                ${action.priority_level}
                            </span>
                        </td>
                        <td>
                            <strong>${action.title}</strong>
                            <p class="yale-text-sm yale-text-muted">${action.description || ''}</p>
                        </td>
                        <td>${action.department_name || 'Yale University'}</td>
                        <td>${deadline}</td>
                    </tr>
                `;
            });
            
            actionRequirementsHTML += `
                    </tbody>
                </table>
            `;
        } else {
            actionRequirementsHTML = '<p class="yale-text-muted">No action requirements defined</p>';
        }
        
        // Generate HTML for decision support
        let decisionSupportHTML = '';
        if (yaleResponse.decision_support && yaleResponse.decision_support.options && yaleResponse.decision_support.options.length > 0) {
            const options = yaleResponse.decision_support.options[0]; // Take the first for now
            
            if (options.options) {
                const optionsList = options.options.split('\n').map(option => `
                    <li class="decision-options__item">${option.trim()}</li>
                `).join('');
                
                decisionSupportHTML = `
                    <div class="decision-support">
                        <h4 class="decision-support__title">Decision Support</h4>
                        <div class="decision-options">
                            <h5 class="decision-options__subtitle">Implementation Options</h5>
                            <ul class="decision-options__list">
                                ${optionsList}
                            </ul>
                            ${options.strategy ? `
                                <div class="yale-mt-md yale-p-sm yale-bg-white">
                                    <span class="yale-text-sm yale-text-semibold">Recommended Strategy:</span>
                                    <p class="yale-text-sm">${options.strategy}</p>
                                </div>
                            ` : ''}
                        </div>
                    </div>
                `;
            }
        }
        
        return `
            <div class="yale-response">
                <div class="yale-response__header">
                    <h3 class="yale-response__title">Yale Response Framework</h3>
                    <div class="yale-response__subtitle">Impact analysis and required actions for Yale University</div>
                </div>
                
                <h4 class="yale-text-md yale-text-semibold yale-mb-sm">Impact by Department</h4>
                <div class="department-impact">
                    ${departmentImpactHTML || '<p class="yale-text-muted">No department impact data available</p>'}
                </div>
                
                <h4 class="yale-text-md yale-text-semibold yale-mb-sm">Action Requirements</h4>
                <div class="action-requirements">
                    ${actionRequirementsHTML}
                </div>
                
                ${decisionSupportHTML}
            </div>
        `;
    }
    
    // Render Intelligence Network component
    function renderIntelligenceNetwork() {
        // Get hub data
        const hub = currentHub;
        const network = hub.intelligence_network || {};
        
        // Generate HTML for predecessor policies
        let predecessorHTML = '';
        if (network.predecessor_policies && network.predecessor_policies.length > 0) {
            network.predecessor_policies.forEach(order => {
                predecessorHTML += `
                    <div class="related-order-card" data-order-id="${order.related_order_id}">
                        <div class="related-order-card__details">
                            <div class="related-order-card__number">${order.order_number}</div>
                            <div class="related-order-card__title">${order.title}</div>
                            <div class="related-order-card__relationship">
                                ${order.description || 'Predecessor policy'}
                            </div>
                        </div>
                        <div class="related-order-card__arrow">
                            <i class="fas fa-chevron-right"></i>
                        </div>
                    </div>
                `;
            });
        } else {
            predecessorHTML = '<p class="yale-text-muted">No predecessor policies identified</p>';
        }
        
        // Generate HTML for related orders
        let relatedHTML = '';
        if (network.related_orders && network.related_orders.length > 0) {
            network.related_orders.forEach(order => {
                relatedHTML += `
                    <div class="related-order-card" data-order-id="${order.related_order_id}">
                        <div class="related-order-card__details">
                            <div class="related-order-card__number">${order.order_number}</div>
                            <div class="related-order-card__title">${order.title}</div>
                            <div class="related-order-card__relationship">
                                ${order.description || 'Related order'}
                            </div>
                        </div>
                        <div class="related-order-card__arrow">
                            <i class="fas fa-chevron-right"></i>
                        </div>
                    </div>
                `;
            });
        } else {
            relatedHTML = '<p class="yale-text-muted">No related orders identified</p>';
        }
        
        // Generate HTML for external impact
        let externalHTML = '';
        if (network.external_impact && network.external_impact.length > 0) {
            network.external_impact.forEach(order => {
                externalHTML += `
                    <div class="related-order-card" data-order-id="${order.related_order_id}">
                        <div class="related-order-card__details">
                            <div class="related-order-card__number">${order.order_number}</div>
                            <div class="related-order-card__title">${order.title}</div>
                            <div class="related-order-card__relationship">
                                ${order.yale_implications || order.description || 'External impact'}
                            </div>
                        </div>
                        <div class="related-order-card__arrow">
                            <i class="fas fa-chevron-right"></i>
                        </div>
                    </div>
                `;
            });
        } else {
            externalHTML = '<p class="yale-text-muted">No external impacts identified</p>';
        }
        
        return `
            <div class="intelligence-network">
                <div class="intelligence-network__header">
                    <h3 class="intelligence-network__title">Intelligence Network</h3>
                    <div class="intelligence-network__subtitle">Connections to related policies and impacts</div>
                </div>
                
                <div class="related-orders">
                    <h4 class="related-orders__title">Predecessor Policies</h4>
                    ${predecessorHTML}
                </div>
                
                <div class="related-orders">
                    <h4 class="related-orders__title">Related Orders</h4>
                    ${relatedHTML}
                </div>
                
                <div class="related-orders">
                    <h4 class="related-orders__title">External Impact</h4>
                    ${externalHTML}
                </div>
            </div>
        `;
    }
    
    // =====================================================================
    // UTILITY FUNCTIONS
    // =====================================================================
    
    // Format a date string
    function formatDate(dateString) {
        if (!dateString) return 'No date';
        
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });
        } catch (error) {
            console.error('Error formatting date:', error);
            return dateString;
        }
    }
    
    // Public API
    return {
        init: init,
        loadOrderIntelligence: loadOrderIntelligence
    };
})();

// Initialize the Intelligence Hub when the document is ready
document.addEventListener('DOMContentLoaded', function() {
    IntelligenceHub.init();
});

// Explicitly set IntelligenceHub as a global to ensure it's accessible
window.IntelligenceHub = IntelligenceHub;