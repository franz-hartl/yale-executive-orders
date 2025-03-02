/**
 * template_example.js
 * 
 * Example script demonstrating how to use the template system.
 */

const TemplateManager = require('./templates/template_manager');
const fs = require('fs');
const path = require('path');

/**
 * Sample executive order data
 */
const sampleData = {
  order_number: "14110",
  title: "Addressing the Risks and Harnessing the Benefits of Artificial Intelligence",
  signing_date: "2025-01-30",
  publication_date: "2025-02-01",
  president: "Sanders",
  summary: "This executive order establishes a comprehensive framework for responsible artificial intelligence development and use across federal agencies, research institutions, and the private sector. It focuses on AI safety, security, and ethical considerations while promoting innovation and research collaboration.",
  full_text: "This would be the full text of the executive order...",
  url: "https://www.whitehouse.gov/briefing-room/presidential-actions/2025/01/30/executive-order-on-safe-secure-and-trustworthy-ai/",
  impact_level: "High",
  status: "Active",
  
  categories: [
    "Technology", 
    "Research & Science Policy", 
    "National Security"
  ],
  
  impact_areas: [
    {
      name: "Research Funding & Science Policy",
      description: "Major impact on AI research funding priorities and requirements"
    },
    {
      name: "Regulatory Compliance",
      description: "New compliance obligations for institutions using or developing AI"
    },
    {
      name: "Public-Private Partnerships",
      description: "Expanded frameworks for academic-industry AI collaboration"
    }
  ],
  
  requirements: [
    {
      title: "AI Safety Certification",
      description: "Institutions receiving federal funding for AI research must implement AI safety protocols and certification processes.",
      deadline: "2025-06-30",
      priority: "high"
    },
    {
      title: "Risk Assessment Reporting",
      description: "Formal risk assessments must be conducted and reported for AI systems with potential for significant impact.",
      deadline: "2025-07-15",
      priority: "high"
    },
    {
      title: "Ethical Guidelines Implementation",
      description: "Adopt and implement the National AI Ethics Framework in all federally funded AI research.",
      deadline: "2025-09-01",
      priority: "medium"
    }
  ],
  
  deadlines: [
    {
      date: "2025-03-01",
      description: "Executive Order takes effect",
      requirement: "General"
    },
    {
      date: "2025-04-15",
      description: "Federal agencies submit implementation plans",
      requirement: "Federal Agencies"
    },
    {
      date: "2025-06-30",
      description: "AI Safety Certification due",
      requirement: "Research Institutions"
    },
    {
      date: "2025-07-15",
      description: "First quarterly risk assessment reports due",
      requirement: "AI Developers"
    }
  ],
  
  key_points: [
    "Establishes a National AI Safety Board to oversee high-risk AI applications in critical sectors",
    "Requires certification of AI systems used in federal operations or funded by federal grants",
    "Creates new funding streams for AI safety research at universities and research institutions",
    "Mandates risk assessments for AI systems with potential societal impacts",
    "Provides guidance on international research collaboration while protecting sensitive technologies"
  ],
  
  impact_analysis: "This executive order represents a significant shift in federal AI policy, placing equal emphasis on innovation and responsible development. Universities and research institutions will face new compliance requirements but will also benefit from increased funding opportunities specific to AI safety research.\n\nThe order creates a structured framework for AI governance that will affect research priorities, compliance obligations, and partnerships across the R1 university landscape.",
  
  conflicts: [
    {
      type: "dates",
      description: "Conflict between Federal Register (March 1) and White House announcement (February 15) regarding effective date",
      status: "resolved_manual"
    },
    {
      type: "requirements",
      description: "Conflicting information on which institutions must complete certification (all research institutions vs. only those with federal AI funding)",
      status: "unresolved"
    }
  ],
  
  yale_impact_areas: [
    {
      name: "Yale School of Engineering & Applied Science",
      rating: "high",
      description: "Major impact on AI research activities and funding applications"
    },
    {
      name: "Data Science Institute",
      rating: "high",
      description: "Significant changes to research protocols and ethics review processes"
    },
    {
      name: "Office of Research Administration",
      rating: "medium",
      description: "New compliance monitoring and certification requirements"
    },
    {
      name: "Yale Law School",
      rating: "medium",
      description: "Implications for technology law and policy research"
    }
  ],
  
  yale_departments: [
    {
      name: "Computer Science Department",
      impact_level: "high",
      impact_description: "Significant impact on AI research projects and funding eligibility",
      actions: [
        {
          description: "Inventory all AI research projects against new safety standards",
          deadline: "2025-04-15"
        },
        {
          description: "Update IRB protocols for AI research",
          deadline: "2025-05-01"
        }
      ]
    },
    {
      name: "Office of Research Administration",
      impact_level: "medium",
      impact_description: "New compliance monitoring requirements for AI grants",
      actions: [
        {
          description: "Develop AI safety certification process for researchers",
          deadline: "2025-05-15"
        }
      ]
    },
    {
      name: "Information Technology Services",
      impact_level: "medium",
      impact_description: "Requirements for AI systems used in university operations",
      actions: [
        {
          description: "Audit existing AI applications in university systems",
          deadline: "2025-06-01"
        }
      ]
    }
  ],
  
  yale_compliance_actions: [
    {
      title: "AI Research Inventory",
      description: "Complete a comprehensive inventory of all AI research projects at Yale",
      deadline: "2025-04-30",
      department: "Office of Research Administration",
      required: true
    },
    {
      title: "Yale AI Safety Committee",
      description: "Establish a university-wide committee to oversee AI safety compliance",
      deadline: "2025-05-15",
      department: "Office of the Provost",
      required: true
    },
    {
      title: "Safety Certification Process",
      description: "Implement the certification process for AI research projects",
      deadline: "2025-06-15",
      department: "Office of Research Administration",
      required: true
    },
    {
      title: "AI Ethics Training",
      description: "Develop and roll out training for researchers on AI ethics",
      deadline: "2025-07-30",
      department: "Center for Teaching and Learning",
      required: false
    }
  ],
  
  resources: [
    {
      title: "National AI Safety Framework",
      url: "https://ai.gov/safety-framework",
      description: "Official government safety guidance for AI research"
    },
    {
      title: "Yale AI Policy Working Group",
      url: "https://ai.yale.edu/policy",
      description: "Internal working group developing Yale-specific guidance"
    }
  ],
  
  last_updated: "2025-02-15"
};

/**
 * Main example function
 */
async function runExample() {
  console.log('Template System Example');
  console.log('======================');
  
  try {
    // Create output directory if it doesn't exist
    const outputDir = path.join(__dirname, 'template_output');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir);
    }
    
    // Initialize template manager
    const templateManager = new TemplateManager();
    
    // 1. Get available templates
    console.log('\nAvailable Templates:');
    const templates = templateManager.getAvailableTemplates();
    templates.forEach(template => {
      console.log(`- ${template.id}: ${template.name}`);
    });
    
    // 2. Render standard summary template
    console.log('\nRendering Standard Summary...');
    const standardSummary = templateManager.renderTemplate(
      sampleData,
      templateSchema.types.STANDARD_SUMMARY
    );
    
    // Save to file
    fs.writeFileSync(
      path.join(outputDir, 'standard_summary.md'),
      standardSummary
    );
    console.log('Saved to template_output/standard_summary.md');
    
    // 3. Render Yale-specific template
    console.log('\nRendering Yale Executive Brief...');
    const yaleBrief = templateManager.renderTemplate(
      sampleData,
      'YALE_EXECUTIVE_BRIEF'
    );
    
    // Save to file
    fs.writeFileSync(
      path.join(outputDir, 'yale_executive_brief.md'),
      yaleBrief
    );
    console.log('Saved to template_output/yale_executive_brief.md');
    
    // 4. Render Yale comprehensive analysis
    console.log('\nRendering Yale Comprehensive Analysis...');
    const yaleAnalysis = templateManager.renderTemplate(
      sampleData,
      'YALE_COMPREHENSIVE'
    );
    
    // Save to file
    fs.writeFileSync(
      path.join(outputDir, 'yale_comprehensive.md'),
      yaleAnalysis
    );
    console.log('Saved to template_output/yale_comprehensive.md');
    
    // 5. Generate compliance checklist
    console.log('\nGenerating Yale Compliance Checklist...');
    const checklist = templateManager.generateComplianceChecklist(sampleData);
    
    // Save to file
    fs.writeFileSync(
      path.join(outputDir, 'compliance_checklist.md'),
      checklist
    );
    console.log('Saved to template_output/compliance_checklist.md');
    
    // 6. Create and render a department-specific template
    console.log('\nCreating and rendering department-specific template...');
    const deptTemplateId = templateManager.createDepartmentTemplate('Computer Science Department');
    
    // Create department-specific data
    const deptData = {
      ...sampleData,
      department_name: 'Computer Science Department',
      department_impact: 'This executive order significantly impacts AI research activities in the Computer Science Department, particularly those involving machine learning, neural networks, and autonomous systems.',
      department_actions: '1. Review all current AI research projects for compliance with new safety standards\n2. Update IRB protocols for AI research\n3. Prepare for AI safety certification process',
      department_timeline: '- **April 15, 2025**: Complete inventory of AI research projects\n- **May 1, 2025**: Update IRB protocols\n- **June 15, 2025**: Complete AI safety certification',
      primary_contact: 'Dr. Jane Smith, AI Research Coordinator',
      primary_email: 'jane.smith@yale.edu'
    };
    
    const deptGuidance = templateManager.renderTemplate(
      deptData,
      deptTemplateId
    );
    
    // Save to file
    fs.writeFileSync(
      path.join(outputDir, 'cs_department_guidance.md'),
      deptGuidance
    );
    console.log('Saved to template_output/cs_department_guidance.md');
    
    // 7. Demonstrate template validation
    console.log('\nValidating data for templates...');
    
    // Test with complete data
    const completeValidation = templateManager.validateData(
      sampleData,
      templateSchema.types.STANDARD_SUMMARY
    );
    console.log(`Complete data validation for Standard Summary: ${completeValidation.isValid ? 'Valid' : 'Invalid'}`);
    
    // Test with incomplete data
    const incompleteData = { ...sampleData };
    delete incompleteData.signing_date;
    delete incompleteData.summary;
    
    const incompleteValidation = templateManager.validateData(
      incompleteData,
      templateSchema.types.STANDARD_SUMMARY
    );
    console.log(`Incomplete data validation for Standard Summary: ${incompleteValidation.isValid ? 'Valid' : 'Invalid'}`);
    console.log(`Missing fields: ${incompleteValidation.missingFields.join(', ')}`);
    
    // 8. Render just one section of a template
    console.log('\nRendering just the Yale Impact section...');
    const impactSection = templateManager.renderSection(
      sampleData,
      'YALE_COMPREHENSIVE',
      templateSchema.sections.YALE_IMPACT
    );
    
    // Save to file
    fs.writeFileSync(
      path.join(outputDir, 'yale_impact_section.md'),
      impactSection
    );
    console.log('Saved to template_output/yale_impact_section.md');
    
    console.log('\nExample completed successfully!');
  } catch (error) {
    console.error('Error in example:', error);
  }
}

// Import templateSchema
const { templateSchema } = require('./models/template_schema');

// Run the example if this script is executed directly
if (require.main === module) {
  runExample();
}

module.exports = runExample;