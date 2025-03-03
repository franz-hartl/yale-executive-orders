/**
 * Yale Executive Orders Tracker - Integrated View JavaScript
 * 
 * This file contains the functionality for the Integrated View components,
 * including unified source view and Yale-specific impact dashboard.
 */

// Module for Integrated View functionality
const IntegratedView = (function() {
    // Private variables
    let currentOrder = null;
    
    // Source icon mapping
    const sourceIcons = {
        'COGR': 'fa-users',
        'NIH': 'fa-medkit',
        'NSF': 'fa-microscope',
        'ACE': 'fa-graduation-cap',
        'White House': 'fa-landmark',
        'Federal Register': 'fa-scroll',
        'Yale': 'fa-university'
    };
    
    // Yale impact area icon mapping
    const impactAreaIcons = {
        'Research & Innovation': 'fa-flask',
        'Research Security & Export Control': 'fa-shield-alt',
        'International & Immigration': 'fa-globe',
        'Community & Belonging': 'fa-users',
        'Campus Safety & Student Affairs': 'fa-user-graduate',
        'Faculty & Workforce': 'fa-chalkboard-teacher',
        'Healthcare & Public Health': 'fa-heartbeat',
        'Financial & Operations': 'fa-chart-line',
        'Governance & Legal': 'fa-gavel',
        'Academic Programs': 'fa-book'
    };

    // =====================================================================
    // INITIALIZATION
    // =====================================================================
    
    // Initialize the Integrated View
    function init() {
        console.log('Integrated View initialized');
        
        // Set up expand/collapse functionality for analysis sections
        setupExpandCollapse();
    }
    
    // Set up expand/collapse functionality
    function setupExpandCollapse() {
        const expandButton = document.getElementById('expand-analysis-btn');
        const analysisContainer = document.getElementById('analysis-container');
        
        if (expandButton && analysisContainer) {
            // Remove any existing event listeners by cloning and replacing
            const newExpandBtn = expandButton.cloneNode(true);
            expandButton.parentNode.replaceChild(newExpandBtn, expandButton);
            
            newExpandBtn.addEventListener('click', function() {
                // Check if the container is currently collapsed
                const isCollapsed = analysisContainer.style.maxHeight === '500px';
                
                if (isCollapsed) {
                    // Expand the container
                    analysisContainer.style.maxHeight = 'none';
                    analysisContainer.classList.remove('section-fade');
                    newExpandBtn.innerHTML = 'Show less <i class="fas fa-chevron-up"></i>';
                } else {
                    // Collapse the container
                    analysisContainer.style.maxHeight = '500px';
                    analysisContainer.classList.add('section-fade');
                    newExpandBtn.innerHTML = 'Show more <i class="fas fa-chevron-down"></i>';
                }
            });
        }
    }

    // =====================================================================
    // PUBLIC METHODS
    // =====================================================================
    
    // Load and display the unified source view for an order
    function loadOrderData(orderId, orderData) {
        // Update current order
        currentOrder = orderData;
        
        // Show loading states
        document.getElementById('unified-source-container').innerHTML = `
            <div class="yale-loading">
                <p class="yale-loading__text">Loading source information for ${orderData.order_number}...</p>
            </div>
        `;
        
        document.getElementById('yale-impact-dashboard').innerHTML = `
            <div class="yale-loading">
                <p class="yale-loading__text">Loading Yale impact information for ${orderData.order_number}...</p>
            </div>
        `;
        
        console.log("Loading integrated view for order:", orderId);
        
        // Check if order has sources or Yale-specific data
        const hasSources = orderData.sources && orderData.sources.length > 0;
        const hasYaleData = orderData.yale_impact_areas && orderData.yale_impact_areas.length > 0;
        
        // If the order has intelligence hub data, use that for enhanced information
        if (orderData.intelligence_hub) {
            renderSourceView(orderData);
            renderYaleImpactDashboard(orderData);
            return;
        }
        
        // If no sources available, show appropriate message
        if (!hasSources) {
            document.getElementById('unified-source-container').innerHTML = `
                <div class="yale-alert yale-alert--info">
                    <div class="yale-alert__icon">
                        <i class="fas fa-info-circle"></i>
                    </div>
                    <div class="yale-alert__content">
                        <h3 class="yale-alert__title">No Source Data Available</h3>
                        <p class="yale-alert__message">
                            Additional source information is not available for this executive order yet.
                        </p>
                    </div>
                </div>
            `;
        } else {
            renderSourceView(orderData);
        }
        
        // If no Yale-specific data available, show appropriate message
        if (!hasYaleData) {
            document.getElementById('yale-impact-dashboard').innerHTML = `
                <div class="yale-alert yale-alert--info">
                    <div class="yale-alert__icon">
                        <i class="fas fa-info-circle"></i>
                    </div>
                    <div class="yale-alert__content">
                        <h3 class="yale-alert__title">No Yale-Specific Impact Data Available</h3>
                        <p class="yale-alert__message">
                            Yale-specific impact analysis is not available for this executive order yet.
                        </p>
                    </div>
                </div>
            `;
        } else {
            renderYaleImpactDashboard(orderData);
        }
    }
    
    // =====================================================================
    // COMPONENT RENDERING
    // =====================================================================
    
    // Render the unified source view
    function renderSourceView(orderData) {
        // Get sources
        const sources = orderData.sources || [];
        
        // Additional sources from intelligence hub if available
        let hubSources = [];
        if (orderData.intelligence_hub && orderData.intelligence_hub.source_intelligence) {
            const si = orderData.intelligence_hub.source_intelligence;
            
            // Extract federal sources
            if (si.federal_sources) {
                // Federal Register sources
                if (si.federal_sources.federal_register) {
                    hubSources = hubSources.concat(si.federal_sources.federal_register.map(src => ({
                        name: 'Federal Register',
                        abbreviation: 'FR',
                        title: src.title || 'Federal Register Publication',
                        date: src.publication_date,
                        content: src.content,
                        key_provisions: src.key_provisions,
                        specific_requirements: src.specific_requirements,
                        url: src.url
                    })));
                }
                
                // Agency guidance sources
                if (si.federal_sources.agency_guidance) {
                    hubSources = hubSources.concat(si.federal_sources.agency_guidance.map(src => {
                        // Create a cohesive narrative summary combining all key elements
                        const narrativeSummary = `
                            <p class="narrative-summary">
                              ${src.summary || 'No summary available'} 
                              ${src.grant_impact ? `${src.grant_impact} ` : ''}
                              ${src.compliance_guidance ? `${src.compliance_guidance} ` : ''}
                              ${src.research_implications ? `${src.research_implications} ` : ''}
                              ${src.key_deadlines ? `Most urgently, ${src.key_deadlines.toLowerCase()} ` : ''}
                              ${src.changed_procedures ? `This introduces ${src.changed_procedures.toLowerCase()}` : ''}
                            </p>
                        `;
                        
                        // Create a structured details section 
                        const detailItems = [];
                        if (src.grant_impact) detailItems.push(`<li><strong>Grant Impact:</strong> ${src.grant_impact}</li>`);
                        if (src.compliance_guidance) detailItems.push(`<li><strong>Compliance Requirements:</strong> ${src.compliance_guidance}</li>`);
                        if (src.research_implications) detailItems.push(`<li><strong>Research Implications:</strong> ${src.research_implications}</li>`);
                        if (src.key_deadlines) detailItems.push(`<li><strong>Key Deadlines:</strong> ${src.key_deadlines}</li>`);
                        if (src.changed_procedures) detailItems.push(`<li><strong>Process Changes:</strong> ${src.changed_procedures}</li>`);
                        
                        const structuredDetails = detailItems.length > 0 ? 
                            `<div class="source-details-section">
                                <h4 class="source-details-title">Implementation Details</h4>
                                <ul class="source-details-list">
                                    ${detailItems.join('')}
                                </ul>
                             </div>` : '';
                        
                        return {
                            name: src.agency_name,
                            abbreviation: src.agency_name.split(' ').map(word => word[0]).join(''),
                            title: src.title || `${src.agency_name} Guidance`,
                            date: src.publication_date,
                            content: narrativeSummary,
                            structuredDetails: structuredDetails,
                            url: src.url
                        };
                    }));
                }
            }
            
            // Extract analysis sources
            if (si.analysis_interpretation) {
                // University associations
                if (si.analysis_interpretation.university_associations) {
                    hubSources = hubSources.concat(si.analysis_interpretation.university_associations.map(src => {
                        // Create a cohesive narrative summary 
                        const narrativeSummary = `
                            <p class="narrative-summary">
                              ${src.summary || 'No summary available'} 
                              ${src.institution_perspective ? `${src.institution_perspective} ` : ''}
                              ${src.sector_guidance ? `${src.association_name} recommends that ${src.sector_guidance.toLowerCase()} ` : ''}
                            </p>
                        `;
                        
                        // Format recommended actions as a structured list
                        let actionsList = '';
                        if (src.recommended_actions) {
                            // Extract bullet points or create them from newlines
                            let actionItems = [];
                            if (src.recommended_actions.includes('•')) {
                                actionItems = src.recommended_actions.split('•').filter(item => item.trim());
                            } else if (src.recommended_actions.includes('\n')) {
                                actionItems = src.recommended_actions.split('\n').filter(item => item.trim());
                            } else {
                                actionItems = [src.recommended_actions];
                            }
                            
                            // Create the HTML list
                            actionsList = `
                                <div class="source-details-section">
                                    <h4 class="source-details-title">Recommended Actions</h4>
                                    <ul class="source-details-list">
                                        ${actionItems.map(item => `<li>${item.trim()}</li>`).join('')}
                                    </ul>
                                </div>
                            `;
                        }
                        
                        return {
                            name: src.association_name,
                            abbreviation: src.association_name.split(' ').map(word => word[0]).join(''),
                            title: src.title || `${src.association_name} Analysis`,
                            date: src.publication_date,
                            content: narrativeSummary,
                            structuredDetails: actionsList,
                            url: src.url
                        };
                    }));
                }
                
                // Legal analysis
                if (si.analysis_interpretation.legal_analysis) {
                    hubSources = hubSources.concat(si.analysis_interpretation.legal_analysis.map(src => {
                        // Create narrative legal analysis content
                        const narrativeSummary = `
                            <p class="narrative-summary">
                              Current status: ${src.challenge_status || 'No legal challenges identified'}. 
                              ${src.legal_implications ? `${src.legal_implications} ` : ''}
                              ${src.enforcement_prediction ? `Regarding enforcement, ${src.enforcement_prediction.toLowerCase()} ` : ''}
                              ${src.precedent_references ? `This order's design is ${src.precedent_references.toLowerCase()}` : ''}
                            </p>
                        `;
                        
                        // Create Yale-specific guidance section
                        const yaleSpecificGuidance = src.yale_specific_notes ? `
                            <div class="source-details-section yale-specific-guidance">
                                <h4 class="source-details-title">Yale-Specific Guidance</h4>
                                <div class="yale-guidance-content">
                                    ${src.yale_specific_notes}
                                </div>
                            </div>
                        ` : '';
                        
                        return {
                            name: src.source || 'Yale Legal Analysis',
                            abbreviation: 'YLA',
                            title: 'Legal Analysis and Compliance Assessment',
                            date: src.analysis_date,
                            content: narrativeSummary,
                            structuredDetails: yaleSpecificGuidance,
                            url: null
                        };
                    }));
                }
            }
        }
        
        // Combine regular sources and hub sources, removing duplicates
        const allSources = [...sources];
        hubSources.forEach(hubSource => {
            // Check if this source already exists in the regular sources
            const exists = sources.some(s => 
                s.name === hubSource.name && 
                s.title === hubSource.title &&
                s.date === hubSource.date
            );
            
            if (!exists) {
                allSources.push(hubSource);
            }
        });
        
        // Generate HTML for each source
        const sourcesHTML = allSources.map(source => {
            // Determine source icon
            const iconClass = sourceIcons[source.name] || sourceIcons[source.abbreviation] || 'fa-file-alt';
            
            // Determine source badge class
            const sourceBadgeClass = `source-badge--${(source.abbreviation || source.name).toLowerCase()}`;
            
            // Format date
            let dateDisplay = 'Unknown date';
            if (source.date || source.fetch_date) {
                const date = new Date(source.date || source.fetch_date);
                dateDisplay = date.toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                });
            }
            
            // Generate source card
            return `
                <div class="unified-source-card">
                    <div class="unified-source-card__header">
                        <div class="unified-source-card__source">
                            <div class="unified-source-card__icon">
                                <i class="fas ${iconClass}"></i>
                            </div>
                            <div class="unified-source-card__title">
                                ${source.name || 'Unknown Source'}
                                <span class="source-badge ${sourceBadgeClass}">
                                    ${source.abbreviation || source.name}
                                </span>
                            </div>
                        </div>
                        <div class="unified-source-card__date">
                            ${dateDisplay}
                        </div>
                    </div>
                    <div class="unified-source-card__body">
                        <div class="unified-source-card__content">
                            <strong>${source.title || ''}</strong>
                            <p>${source.content || source.summary || 'No content available'}</p>
                        </div>
                        
                        ${source.structuredDetails ? source.structuredDetails : ''}
                        
                        ${source.reference_id ? `
                            <div class="source-attribution">
                                <div class="source-attribution__item">
                                    <i class="fas fa-tag source-attribution__icon"></i>
                                    Reference: ${source.reference_id}
                                </div>
                            </div>
                        ` : ''}
                    </div>
                    ${source.url ? `
                        <div class="unified-source-card__footer">
                            <a href="${source.url.startsWith('http') ? source.url : 'https://' + source.url}" 
                               target="_blank" 
                               class="yale-btn yale-btn--sm yale-btn--outline"
                               rel="noopener noreferrer">
                                View Source <i class="fas fa-external-link-alt yale-ml-xs"></i>
                            </a>
                        </div>
                    ` : ''}
                </div>
            `;
        }).join('');
        
        // If no sources, show message
        if (allSources.length === 0) {
            document.getElementById('unified-source-container').innerHTML = `
                <div class="yale-alert yale-alert--info">
                    <div class="yale-alert__icon">
                        <i class="fas fa-info-circle"></i>
                    </div>
                    <div class="yale-alert__content">
                        <h3 class="yale-alert__title">No Source Data Available</h3>
                        <p class="yale-alert__message">
                            Additional source information is not available for this executive order yet.
                        </p>
                    </div>
                </div>
            `;
            return;
        }
        
        // Generate the complete source view HTML
        const sourceViewHTML = `
            <div class="unified-source-view">
                ${sourcesHTML}
            </div>
        `;
        
        // Update the container
        document.getElementById('unified-source-container').innerHTML = sourceViewHTML;
    }
    
    // Render the Yale Impact Dashboard
    function renderYaleImpactDashboard(orderData) {
        // Get Yale impact areas and stakeholders
        const yaleImpactAreas = orderData.yale_impact_areas || [];
        const yaleStakeholders = orderData.yale_stakeholders || [];
        
        // If we have intelligence hub data, enhance with that
        let yaleActionRequirements = [];
        let yaleDepartmentImpact = [];
        
        if (orderData.intelligence_hub && orderData.intelligence_hub.yale_response) {
            const yr = orderData.intelligence_hub.yale_response;
            
            // Get action requirements
            if (yr.action_requirements) {
                yaleActionRequirements = yr.action_requirements;
            }
            
            // Get department impact framework
            if (yr.framework) {
                yaleDepartmentImpact = yr.framework;
            }
        }
        
        // Generate HTML for each impact area
        const impactAreasHTML = yaleImpactAreas.map(area => {
            // Find matching department impact if available
            const departmentImpact = yaleDepartmentImpact.find(d => 
                d.department_name === area.name ||
                area.name.includes(d.department_name) ||
                d.department_name.includes(area.name)
            );
            
            // Find related stakeholders
            const relatedStakeholders = yaleStakeholders.filter(s => 
                s.impact_areas && s.impact_areas.includes(area.name)
            );
            
            // Determine impact area icon
            const iconClass = impactAreaIcons[area.name] || 'fa-university';
            
            // Generate impact area card
            return `
                <div class="yale-impact-area">
                    <div class="yale-impact-area__header">
                        <div class="yale-impact-area__icon">
                            <i class="fas ${iconClass}"></i>
                        </div>
                        <div class="yale-impact-area__title">
                            ${area.name}
                        </div>
                    </div>
                    
                    ${area.relevance ? `
                        <div class="yale-impact-area__impact">
                            <strong>Impact:</strong> ${area.relevance}
                        </div>
                    ` : ''}
                    
                    <div class="yale-impact-area__content">
                        ${area.description || 'No description available'}
                    </div>
                    
                    ${relatedStakeholders.length > 0 ? `
                        <div class="yale-impact-area__stakeholders">
                            ${relatedStakeholders.map(s => {
                                const priorityClass = s.priority === 'High' ? 'yale-stakeholder-badge--primary' :
                                                     s.priority === 'Medium' ? 'yale-stakeholder-badge--secondary' : '';
                                return `
                                    <span class="yale-stakeholder-badge ${priorityClass}" title="${s.description || ''}">
                                        ${s.name}
                                    </span>
                                `;
                            }).join('')}
                        </div>
                    ` : ''}
                    
                    ${departmentImpact ? `
                        <div class="source-attribution">
                            <div class="source-attribution__item">
                                <i class="fas fa-chart-line source-attribution__icon"></i>
                                Impact Intensity: ${departmentImpact.impact_intensity}/10
                            </div>
                        </div>
                    ` : ''}
                </div>
            `;
        }).join('');
        
        // Generate HTML for action requirements
        let actionRequirementsHTML = '';
        if (yaleActionRequirements.length > 0) {
            actionRequirementsHTML = `
                <div class="required-actions">
                    <div class="required-actions__header">
                        <i class="fas fa-clipboard-check"></i>
                        <h4 class="required-actions__title">Required Actions</h4>
                    </div>
                    
                    ${yaleActionRequirements.map(action => {
                        // Determine priority class
                        let priorityClass = '';
                        if (action.priority_level === 'Critical') {
                            priorityClass = 'action-item--critical';
                        } else if (action.priority_level === 'High') {
                            priorityClass = 'action-item--high';
                        } else if (action.priority_level === 'Medium') {
                            priorityClass = 'action-item--medium';
                        } else if (action.priority_level === 'Low') {
                            priorityClass = 'action-item--low';
                        }
                        
                        // Format deadline
                        let deadlineDisplay = 'No deadline specified';
                        if (action.deadline) {
                            const deadline = new Date(action.deadline);
                            deadlineDisplay = deadline.toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric'
                            });
                        }
                        
                        return `
                            <div class="action-item ${priorityClass}">
                                <div class="action-item__header">
                                    <div class="action-item__title">
                                        ${action.title}
                                    </div>
                                    <div class="action-item__deadline">
                                        Deadline: ${deadlineDisplay}
                                    </div>
                                </div>
                                <div class="action-item__description">
                                    ${action.description || 'No description available'}
                                </div>
                                <div class="action-item__owner">
                                    <i class="fas fa-user-circle"></i>
                                    <span>Owner: ${action.department_name || 'Yale University'}</span>
                                    <span class="priority-badge priority-badge--${action.priority_level ? action.priority_level.toLowerCase() : 'medium'}">
                                        ${action.priority_level || 'Medium'} Priority
                                    </span>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            `;
        }
        
        // If no Yale data, show message
        if (yaleImpactAreas.length === 0 && yaleActionRequirements.length === 0) {
            document.getElementById('yale-impact-dashboard').innerHTML = `
                <div class="yale-alert yale-alert--info">
                    <div class="yale-alert__icon">
                        <i class="fas fa-info-circle"></i>
                    </div>
                    <div class="yale-alert__content">
                        <h3 class="yale-alert__title">No Yale-Specific Impact Data Available</h3>
                        <p class="yale-alert__message">
                            Yale-specific impact analysis is not available for this executive order yet.
                        </p>
                    </div>
                </div>
            `;
            return;
        }
        
        // Generate the complete Yale impact dashboard HTML
        let dashboardHTML = `
            <div class="yale-impact-dashboard">
                <div class="yale-impact-dashboard__header">
                    <i class="fas fa-university" style="margin-right: 0.5rem;"></i>
                    <h3 class="yale-impact-dashboard__title">Yale Impact Analysis</h3>
                </div>
                
                ${yaleImpactAreas.length > 0 ? `
                    <div class="yale-impact-dashboard__grid">
                        ${impactAreasHTML}
                    </div>
                ` : ''}
                
                ${actionRequirementsHTML}
            </div>
        `;
        
        // Add Yale imperative if available
        if (orderData.intelligence_hub && orderData.intelligence_hub.yale_imperative) {
            dashboardHTML = `
                <div class="yale-imperative" style="margin-bottom: 1.5rem;">
                    <div class="yale-imperative__label">Yale Imperative</div>
                    <div class="yale-imperative__content">${orderData.intelligence_hub.yale_imperative}</div>
                </div>
                ${dashboardHTML}
            `;
        }
        
        // Update the container
        document.getElementById('yale-impact-dashboard').innerHTML = dashboardHTML;
    }
    
    // =====================================================================
    // UTILITY FUNCTIONS
    // =====================================================================
    
    // Format bullet points from text
    function formatBulletPoints(text) {
        if (!text) return '';
        
        // If text is already HTML formatted, return as is
        if (text.includes('<p>') || text.includes('<br>') || text.includes('<li>')) {
            return text;
        }
        
        // Check if the text already contains bullet points
        if (text.includes('•')) {
            // Split by bullet points
            const bulletItems = text.split('•').filter(item => item.trim());
            
            // If we have multiple items, format as a proper list
            if (bulletItems.length > 1) {
                return '<ul style="list-style-type: disc; padding-left: 20px;">' + 
                       bulletItems.map(item => `<li>${item.trim()}</li>`).join('') + 
                       '</ul>';
            } else {
                // Just add line breaks if only one bullet
                return text.replace(/•/g, '<br>•');
            }
        }
        
        // Check if the text is split by newlines
        if (text.includes('\n')) {
            const lines = text.split('\n').filter(line => line.trim());
            
            // If we have multiple lines, format as a list
            if (lines.length > 1) {
                return '<ul style="list-style-type: disc; padding-left: 20px;">' + 
                       lines.map(line => `<li>${line.trim()}</li>`).join('') + 
                       '</ul>';
            } else {
                // Single line, return with a bullet
                return lines.map(line => `• ${line.trim()}`).join('');
            }
        }
        
        // Return as is
        return text;
    }
    
    // Public API
    return {
        init: init,
        loadOrderData: loadOrderData
    };
})();

// Initialize the Integrated View when the document is ready
document.addEventListener('DOMContentLoaded', function() {
    IntegratedView.init();
    
    // Add hook to the existing openDetailView function
    // This is done by creating a wrapper around the function
    if (typeof window.openDetailView === 'function') {
        const originalOpenDetailView = window.openDetailView;
        
        window.openDetailView = async function(orderId) {
            // Call the original function first
            await originalOpenDetailView(orderId);
            
            try {
                // Find the order data in the global variable if available
                let orderData = null;
                if (window.allExecutiveOrders) {
                    orderData = window.allExecutiveOrders.find(order => order.id == orderId);
                }
                
                // If not found in global variable, try to fetch it
                if (!orderData) {
                    const response = await fetch(`data/orders/${orderId}.json`);
                    if (response.ok) {
                        orderData = await response.json();
                    }
                }
                
                // If we have order data, initialize the integrated view with it
                if (orderData) {
                    IntegratedView.loadOrderData(orderId, orderData);
                }
            } catch (error) {
                console.error('Error loading order data for integrated view:', error);
            }
        };
    }
    
    // Re-initialize expand/collapse when a detail view is shown
    document.addEventListener('click', function(event) {
        // Check if this click is on a table row
        if (event.target.closest('tr[data-order-id]')) {
            // Wait for modal to fully render
            setTimeout(function() {
                IntegratedView.init();
            }, 800);
        }
    });
});

// Explicitly set IntegratedView as a global to ensure it's accessible
window.IntegratedView = IntegratedView;