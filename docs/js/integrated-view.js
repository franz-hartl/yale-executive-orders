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
                        // Create more comprehensive content by combining elements
                        const combinedContent = `
                            <strong>Summary:</strong> ${src.summary || 'No summary available'}
                            ${src.grant_impact ? `<p><strong>Grant Impact:</strong> ${src.grant_impact}</p>` : ''}
                            ${src.compliance_guidance ? `<p><strong>Compliance Guidance:</strong> ${src.compliance_guidance}</p>` : ''}
                        `;
                        
                        // Build a detailed requirements list
                        const requirements = [];
                        if (src.research_implications) requirements.push(src.research_implications);
                        if (src.key_deadlines) requirements.push(`<strong>Key Deadlines:</strong> ${src.key_deadlines}`);
                        if (src.changed_procedures) requirements.push(`<strong>Changed Procedures:</strong> ${src.changed_procedures}`);
                        
                        return {
                            name: src.agency_name,
                            abbreviation: src.agency_name.split(' ').map(word => word[0]).join(''),
                            title: src.title || `${src.agency_name} Guidance`,
                            date: src.publication_date,
                            content: combinedContent,
                            key_provisions: src.grant_impact,
                            specific_requirements: requirements.join('<br><br>'),
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
                        // Create more comprehensive content
                        const combinedContent = `
                            <strong>Summary:</strong> ${src.summary || 'No summary available'}
                            ${src.institution_perspective ? `<p><strong>Institutional Impact:</strong> ${src.institution_perspective}</p>` : ''}
                            ${src.sector_guidance ? `<p><strong>Sector Guidance:</strong> ${src.sector_guidance}</p>` : ''}
                        `;
                        
                        // Format recommended actions 
                        const formattedActions = src.recommended_actions ? 
                            src.recommended_actions.replace(/•/g, '<br>•').replace(/\n/g, '<br>') : 
                            'No specific recommended actions';
                            
                        return {
                            name: src.association_name,
                            abbreviation: src.association_name.split(' ').map(word => word[0]).join(''),
                            title: src.title || `${src.association_name} Analysis`,
                            date: src.publication_date,
                            content: combinedContent,
                            key_provisions: src.institution_perspective,
                            specific_requirements: `<strong>Recommended Actions:</strong><br>${formattedActions}`,
                            url: src.url
                        };
                    }));
                }
                
                // Legal analysis
                if (si.analysis_interpretation.legal_analysis) {
                    hubSources = hubSources.concat(si.analysis_interpretation.legal_analysis.map(src => {
                        // Create comprehensive legal analysis content
                        const combinedContent = `
                            <strong>Status:</strong> ${src.challenge_status || 'Status not specified'}
                            ${src.legal_implications ? `<p><strong>Legal Implications:</strong> ${src.legal_implications}</p>` : ''}
                            ${src.enforcement_prediction ? `<p><strong>Enforcement Prediction:</strong> ${src.enforcement_prediction}</p>` : ''}
                            ${src.precedent_references ? `<p><strong>Precedent References:</strong> ${src.precedent_references}</p>` : ''}
                        `;
                        
                        return {
                            name: src.source || 'Yale Legal Analysis',
                            abbreviation: 'YLA',
                            title: 'Legal Analysis and Compliance Assessment',
                            date: src.analysis_date,
                            content: combinedContent,
                            key_provisions: src.enforcement_prediction,
                            specific_requirements: src.yale_specific_notes ? 
                                `<strong>Yale-Specific Notes:</strong><br>${src.yale_specific_notes}` : 
                                'No Yale-specific notes available',
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
                        
                        ${source.key_provisions ? `
                            <div class="source-card__section">
                                <h4 class="source-card__section-title">Key Provisions</h4>
                                <div class="source-card__section-content">
                                    ${formatBulletPoints(source.key_provisions)}
                                </div>
                            </div>
                        ` : ''}
                        
                        ${source.specific_requirements ? `
                            <div class="source-card__section">
                                <h4 class="source-card__section-title">Specific Requirements</h4>
                                <div class="source-card__section-content">
                                    ${formatBulletPoints(source.specific_requirements)}
                                </div>
                            </div>
                        ` : ''}
                        
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