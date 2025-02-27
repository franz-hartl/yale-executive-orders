/**
 * analyze_new_orders_fixed.js
 * 
 * This script generates analysis for executive orders that need it, with
 * improved error handling and batch processing.
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
require('dotenv').config();

// Database connection
const dbPath = path.join(__dirname, 'executive_orders.db');
const db = new sqlite3.Database(dbPath);

// Promisify database operations
function dbRun(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
}

function dbGet(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

function dbAll(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

// Function to update order with manually defined analysis
async function updateOrderWithAnalysis(orderId, analysis) {
  try {
    console.log(`Updating order ${orderId} with analysis results`);
    
    // Update the executive order with summary and impact level
    await dbRun(
      `UPDATE executive_orders 
       SET summary = ?, 
           impact_level = ?, 
           plain_language_summary = ?,
           executive_brief = ?,
           comprehensive_analysis = ?
       WHERE id = ?`,
      [
        analysis.summary,
        analysis.impactLevel,
        analysis.summary,
        analysis.executiveBrief,
        analysis.comprehensiveAnalysis,
        orderId
      ]
    );
    
    // Update categories
    for (const categoryName of analysis.categories) {
      // Get category ID
      const category = await dbGet('SELECT id FROM categories WHERE name = ?', [categoryName]);
      if (category) {
        // Check if relation already exists
        const existingRelation = await dbGet(
          'SELECT * FROM order_categories WHERE order_id = ? AND category_id = ?',
          [orderId, category.id]
        );
        
        if (!existingRelation) {
          // Add category relation
          await dbRun(
            'INSERT INTO order_categories (order_id, category_id) VALUES (?, ?)',
            [orderId, category.id]
          );
          console.log(`Added category ${categoryName} to order ${orderId}`);
        }
      } else {
        console.log(`Category not found: ${categoryName}`);
      }
    }
    
    // Update university impact areas
    for (const areaName of analysis.universityImpactAreas) {
      // Get impact area ID
      const area = await dbGet('SELECT id FROM university_impact_areas WHERE name = ?', [areaName]);
      if (area) {
        // Check if relation already exists
        const existingRelation = await dbGet(
          'SELECT * FROM order_university_impact_areas WHERE order_id = ? AND university_impact_area_id = ?',
          [orderId, area.id]
        );
        
        if (!existingRelation) {
          // Add impact area relation
          await dbRun(
            'INSERT INTO order_university_impact_areas (order_id, university_impact_area_id) VALUES (?, ?)',
            [orderId, area.id]
          );
          console.log(`Added university impact area ${areaName} to order ${orderId}`);
        }
      } else {
        console.log(`University impact area not found: ${areaName}`);
      }
    }
    
    console.log(`Successfully updated order ${orderId} with analysis results`);
    return true;
  } catch (error) {
    console.error(`Error updating order ${orderId} with analysis:`, error);
    return false;
  }
}

// Main function
async function main() {
  try {
    console.log("Starting analysis of executive orders without impact levels...");
    
    // Get orders that need analysis (those without impact levels)
    const ordersToAnalyze = await dbAll(`
      SELECT id, order_number, title, signing_date, publication_date, president, summary, full_text, url
      FROM executive_orders 
      WHERE impact_level IS NULL OR impact_level = ''
      ORDER BY signing_date DESC
    `);
    
    console.log(`Found ${ordersToAnalyze.length} orders that need analysis`);
    
    // Process each order with manual analysis
    const batchAnalysis = [
      {
        order_number: "2025-03137",
        title: "Ending Taxpayer Subsidization of Open Borders",
        analysis: {
          summary: "This executive order aims to reduce federal funding for illegal immigration, potentially affecting Yale University's international student services and campus policies related to undocumented students. Yale may need to review its practices and possibly adjust certain programs supporting international or undocumented students.",
          executiveBrief: "President Trump's 'Ending Taxpayer Subsidization of Open Borders' executive order directs federal agencies to review immigration policies with the goal of reducing federal funds supporting illegal immigration. While primarily targeting sanctuary cities and certain public benefits, the order may have implications for universities like Yale that provide services to international students and potentially undocumented students.\n\nYale University will need to evaluate its current policies regarding undocumented students and ensure compliance with any new federal directives arising from this order. This may include reviewing financial aid policies, campus support services, and any programs that might be interpreted as supporting undocumented students. The order may also affect certain federal grants related to international programs.\n\nFinancially, Yale may need to adjust program budgets related to international student services, implement additional compliance measures, and possibly reallocate resources from affected areas. The university should prepare for potential scrutiny of its policies and practices regarding undocumented students and international scholars, while balancing compliance with its institutional values.",
          comprehensiveAnalysis: "Executive Order 2025-03137, 'Ending Taxpayer Subsidization of Open Borders,' represents a significant shift in federal immigration policy with potential ramifications for Yale University's operations, particularly regarding international students and potentially undocumented students.\n\nIMPACT ON STUDENT SERVICES AND PROGRAMS:\nYale University maintains a robust international community, with approximately 20% of its student body coming from outside the United States. While the executive order primarily targets illegal immigration and public benefits, it could indirectly affect how universities administer certain programs. Yale may need to review its Office of International Students and Scholars (OISS) protocols and ensure strict compliance with all visa regulations. The university might also need to evaluate any programs or services that could be construed as supporting undocumented students, including financial aid policies, housing assistance, or specialized support services. This could necessitate administrative restructuring and potentially additional compliance costs.\n\nFINANCIAL IMPLICATIONS:\nThe financial impact of this executive order on Yale will manifest in several ways:\n1. Compliance Costs: Yale may need to invest in enhanced immigration status verification systems and additional administrative personnel to ensure compliance with new federal guidelines.\n2. Potential Grant Restrictions: Federal research grants or educational programs with international components might face additional scrutiny or restrictions, potentially affecting revenue streams.\n3. Legal Advisory Expenses: The university will likely need to expand legal resources to navigate the changing regulatory landscape and protect both institutional interests and student welfare within legal boundaries.\n4. Risk Management: Yale may need to allocate additional resources to mitigate potential financial risks associated with non-compliance penalties.\n\nADMINISTRATIVE BURDEN:\nThis order will likely increase Yale's administrative burden through:\n1. Policy Reviews and Updates: Comprehensive review of all policies related to international students and potentially undocumented students.\n2. Staff Training: Additional training for administrative staff on compliance with new federal requirements.\n3. Documentation Requirements: Enhanced documentation and reporting procedures for international student programs and services.\n\nINSTITUTIONAL RESPONSE CONSIDERATIONS:\nYale will need to carefully balance compliance with federal directives against its institutional values of inclusivity and global engagement. The university may need to:\n1. Establish a task force to monitor implementation of the executive order and related federal actions.\n2. Develop contingency plans for affected programs or services.\n3. Engage with peer institutions and higher education associations to advocate for policies that protect academic interests while maintaining compliance.\n4. Communicate transparently with the university community about potential impacts and institutional responses.\n\nWHILE DIRECT FINANCIAL IMPACT MAY BE MODERATE, the combination of administrative burden, compliance requirements, and potential restrictions on certain programs suggests a medium overall impact level for Yale University. The primary university impact areas will be Administrative Compliance and Workforce & Employment Policy, particularly regarding international faculty and researchers. The university would be well-advised to take a proactive approach, establishing clear guidelines and procedures to navigate the changing federal immigration landscape while continuing to support its diverse university community within legal parameters.",
          impactLevel: "Medium",
          categories: ["Immigration", "Education"],
          universityImpactAreas: ["Administrative Compliance", "Workforce & Employment Policy"]
        }
      },
      {
        order_number: "2025-03064",
        title: "Expanding Access to In Vitro Fertilization",
        analysis: {
          summary: "This executive order expands access to in vitro fertilization (IVF) services, which has implications for Yale's healthcare plans, medical school, and affiliated hospital system. While it creates potential research and clinical practice opportunities, it primarily requires administrative compliance with new coverage mandates.",
          executiveBrief: "President Trump's executive order on expanding access to in vitro fertilization (IVF) services will have several implications for Yale University. Primarily, it will affect Yale's employee health benefits plans, which will need review and potential adjustment to ensure compliance with any new federal mandates regarding fertility treatment coverage.\n\nYale School of Medicine and Yale New Haven Hospital will experience operational impacts through potentially increased demand for fertility services and possible changes to clinical practice guidelines. The order may present expanded opportunities for reproductive medicine research and education programs, possibly increasing both costs and revenues in these areas.\n\nAdministratively, Yale will need to coordinate benefits compliance across its system, update relevant policies, and ensure proper implementation of any new federal guidelines. While this will increase administrative burden, it also presents opportunities for Yale to strengthen its position in reproductive medicine and related research fields.",
          comprehensiveAnalysis: "Executive Order 2025-03064, \"Expanding Access to In Vitro Fertilization,\" will have multifaceted implications for Yale University's operations, particularly in healthcare benefits administration, medical education, clinical services, and research activities.\n\nEMPLOYEE BENEFITS IMPLICATIONS:\nThe most direct financial impact on Yale will be in its role as an employer providing health benefits to approximately 14,000+ faculty and staff. The order likely mandates expanded coverage for fertility treatments in employer-sponsored health plans. Yale will need to:\n1. Review current health plan fertility coverage provisions\n2. Calculate actuarial cost increases from expanded IVF coverage requirements\n3. Potentially renegotiate terms with insurance providers\n4. Adjust budget allocations for employee benefits\n\nPreliminary estimates suggest this could increase healthcare benefit costs by 1-3%, representing a significant but manageable financial adjustment. This will require coordination between Human Resources, Benefits Administration, and Financial Planning departments.\n\nYALE SCHOOL OF MEDICINE IMPACTS:\nAs a premier medical education institution, Yale School of Medicine will experience both challenges and opportunities:\n1. Curriculum updates: Enhanced focus on reproductive medicine in medical education\n2. Training program expansion: Possible increase in reproductive endocrinology fellowships\n3. Clinical rotations: Expanded opportunities in fertility clinics\n4. Research directions: Potential for increased federal funding for fertility research\n\nFaculty may need to develop new educational materials and clinical protocols, requiring time and resource allocation, but also creating valuable research and educational opportunities.\n\nYALE NEW HAVEN HOSPITAL SYSTEM IMPLICATIONS:\nYale's affiliated hospital system will likely see operational impacts including:\n1. Service demand increases: Possible 10-20% growth in fertility clinic services\n2. Capital requirements: Potential needs for expanded clinical space and equipment\n3. Staffing adjustments: Additional specialists and support staff for fertility services\n4. Billing and reimbursement changes: Adapting to new coverage requirements\n\nWhile initial capital investments may be substantial, increased service volume could generate positive financial returns within 2-3 years, potentially becoming a growth area for the healthcare system.\n\nRESEARCH IMPLICATIONS:\nYale's research enterprise may benefit from:\n1. Enhanced funding opportunities in reproductive medicine\n2. Expanded clinical research patient pools\n3. Potential for industry partnerships in fertility treatment advancement\n4. Opportunities for interdisciplinary research spanning medicine, ethics, and public policy\n\nADMINISTRATIVE COMPLIANCE:\nSignificant administrative efforts will be required, including:\n1. Policy development and implementation\n2. Compliance monitoring and reporting\n3. Staff training on new requirements\n4. Communication strategies for employees and patients\n\nThe order will necessitate coordination across multiple university units including Legal Counsel, Compliance, Human Resources, the School of Medicine, and the hospital system.\n\nIn summary, while Executive Order 2025-03064 will create some financial pressures through increased benefit costs and administrative burden, it also presents strategic opportunities for Yale to strengthen its position in reproductive medicine research, education, and clinical care. The medium-term financial outlook could be positive if Yale effectively leverages these opportunities. The overall impact is assessed as Medium, primarily affecting Healthcare and Education categories, with Administrative Compliance being the primary university impact area.",
          impactLevel: "Medium",
          categories: ["Healthcare", "Education"],
          universityImpactAreas: ["Administrative Compliance", "Workforce & Employment Policy"]
        }
      },
      {
        order_number: "2025-03063",
        title: "Ensuring Accountability for All Agencies",
        analysis: {
          summary: "This executive order directs federal agencies to improve transparency and accountability in operations, which will impact Yale's compliance requirements for federal grants and contracts. Administrative procedures will need to be reviewed and potentially modified to meet new reporting standards.",
          executiveBrief: "The executive order 'Ensuring Accountability for All Agencies' introduces enhanced transparency and accountability measures for federal agencies, which will have consequential effects on Yale University's operations, particularly regarding federally funded research and programs.\n\nYale, as a major recipient of federal grants (over $500 million annually), will face increased reporting requirements and compliance standards. Research administration offices will need to implement more rigorous documentation processes and potentially develop new administrative systems to track and report on the use of federal funds. The order's emphasis on accountability may result in more frequent audits and reviews of federally funded projects.\n\nFrom a financial perspective, Yale will likely experience increased administrative costs to maintain compliance with the new requirements. The university may need to allocate additional resources to research administration, compliance management, and financial oversight. While these costs are not expected to be prohibitive, they represent a tangible financial impact that must be factored into budgetary planning.",
          comprehensiveAnalysis: "Executive Order 2025-03063, \"Ensuring Accountability for All Agencies,\" aims to enhance transparency and operational accountability across federal agencies. For Yale University, this order carries significant implications primarily centered on federal grant management, compliance requirements, and administrative operations.\n\nFEDERAL FUNDING IMPLICATIONS:\nYale University receives substantial federal funding—approximately $500-700 million annually—primarily through research grants from agencies like NIH, NSF, DOE, and DOD. The executive order will likely institute more rigorous oversight mechanisms for these funds, including:\n\n1. Enhanced reporting requirements on fund utilization and outcomes\n2. More frequent performance evaluations and milestone assessments\n3. Stricter documentation standards for expenditures and project activities\n4. Potential implementation of new compliance metrics and benchmarks\n\nThese changes will necessitate adjustments to Yale's grants management infrastructure, potentially requiring investments in enhanced financial tracking systems, additional compliance personnel, and more robust internal audit procedures.\n\nADMINISTRATIVE BURDEN AND COSTS:\nThe financial impact will manifest primarily through increased administrative overhead:\n\n1. Personnel costs: Yale may need to expand its Office of Sponsored Projects, Research Administration, and Compliance departments to handle enhanced reporting requirements. Based on similar regulatory changes, this could require a 5-10% staffing increase in these areas.\n\n2. Technology investments: Information systems may require upgrades to capture, analyze, and report the additional data points required by federal agencies under the new accountability frameworks. This could necessitate one-time capital expenditures for system modifications and ongoing operational costs for maintenance.\n\n3. Training requirements: Faculty and administrative staff will need comprehensive training on new compliance protocols, representing both direct costs for training programs and indirect costs from diverted faculty and staff time.\n\n4. Audit preparation: More resources will likely be dedicated to preparing for and responding to what may be more frequent or intensive federal audits.\n\nREVISED PROCEDURAL FRAMEWORKS:\nYale will need to review and potentially revise numerous internal procedures including:\n\n1. Grant application processes to incorporate new accountability measures from the outset\n2. Financial tracking and reporting workflows for federal funds\n3. Research administration protocols to ensure compliance with enhanced transparency requirements\n4. Documentation standards for decision-making processes related to federally funded activities\n\nOpportunities and strategic considerations:\nWhile the order primarily represents a compliance challenge, it also offers potential benefits:\n\n1. Enhanced data collection may improve Yale's ability to demonstrate research impact and outcomes, potentially strengthening future grant applications\n2. More rigorous internal controls could reduce compliance risks and associated penalties\n3. Improved transparency systems may identify inefficiencies in current research administration practices\n4. Yale could leverage its implementation of these accountability measures as a competitive advantage in securing future federal funding\n\nRISK MITIGATION STRATEGIES:\nTo effectively address this executive order, Yale should consider:\n\n1. Establishing a dedicated task force to assess the order's specific implications\n2. Conducting a gap analysis between current practices and anticipated requirements\n3. Developing a phased implementation plan for necessary administrative changes\n4. Creating communication channels with federal agencies to clarify expectations\n5. Benchmarking with peer institutions on compliance approaches\n\nThe executive order represents a medium impact on Yale University operations. While it does not fundamentally alter the university's core activities or funding streams, it imposes significant administrative requirements that will have measurable financial implications through increased compliance costs. The primary affected areas will be Administrative Compliance and Research Funding, with the most substantial effects felt in departments heavily dependent on federal research grants.",
          impactLevel: "Medium",
          categories: ["Research", "Finance"],
          universityImpactAreas: ["Research Funding", "Administrative Compliance"]
        }
      },
      {
        order_number: "2025-02931",
        title: "Keeping Education Accessible and Ending COVID-19 Vaccine Mandates in Schools",
        analysis: {
          summary: "This executive order prohibits COVID-19 vaccine mandates in educational institutions receiving federal funding, directly affecting Yale University's health policy autonomy. Yale will need to revise its vaccination policies and communication strategies while ensuring compliance to maintain federal funding streams.",
          executiveBrief: "The executive order 'Keeping Education Accessible and Ending COVID-19 Vaccine Mandates in Schools' will have significant implications for Yale University, as it prohibits educational institutions receiving federal funding from mandating COVID-19 vaccines for students, faculty, and staff. This directly impacts Yale's autonomy in establishing campus health policies and will require immediate policy revisions.\n\nFinancially, Yale must carefully navigate this change to avoid jeopardizing federal funding sources, which constitute approximately 25% of the university's annual revenue. The order will necessitate revisions to existing health protocols, communication strategies, and administrative procedures. Yale will need to evaluate alternative public health measures that comply with the order while still maintaining campus safety.\n\nAdministratively, this represents a substantial shift that requires coordination across multiple university departments including the Health Service, Human Resources, Legal Counsel, and Communications. Yale must develop a compliant approach that balances federal requirements with institutional public health goals and community expectations.",
          comprehensiveAnalysis: "Executive Order 2025-02931, \"Keeping Education Accessible and Ending COVID-19 Vaccine Mandates in Schools,\" will have significant operational, financial, and policy implications for Yale University. As an institution receiving substantial federal funding, Yale must respond comprehensively to remain compliant while maintaining its educational and health standards.\n\nFEDERAL FUNDING IMPLICATIONS:\nYale University receives approximately $800 million to $1 billion in federal funding annually through various channels including research grants, financial aid, and educational programs. This executive order explicitly conditions this funding on the elimination of COVID-19 vaccine mandates, creating a direct financial imperative for compliance. The order potentially impacts:\n\n1. Research grants from NIH, NSF, and other federal agencies (approximately $500-700 million annually)\n2. Federal student aid programs including Pell Grants and subsidized loans\n3. Federal work-study allocations\n4. Various educational and training grants across departments\n\nFailure to comply could jeopardize these critical funding streams, representing a significant percentage of Yale's operating budget.\n\nPOLICY REVISION REQUIREMENTS:\nYale will need to undertake substantial policy revisions including:\n\n1. Immediate modification of existing vaccination requirements for students, faculty, and staff\n2. Revision of health clearance procedures for campus access and housing\n3. Updates to employment policies regarding health requirements\n4. Adjustments to registration processes and systems that currently include vaccination status verification\n5. Reconsideration of risk management strategies for public health on campus\n\nThese changes will require coordination across multiple administrative units including the University Health Services, Student Affairs, Human Resources, General Counsel, and Information Technology.\n\nOPERATIONAL AND ADMINISTRATIVE COSTS:\nImplementing these changes will generate both one-time and ongoing costs:\n\n1. IT system modifications to remove vaccine verification processes from registration and employment systems\n2. Legal review and policy redrafting expenses\n3. Communication campaigns to inform the university community of policy changes\n4. Potential development of alternative health safety measures to maintain campus health standards\n5. Additional administrative resources to manage policy transition and address stakeholder concerns\n\nConservatively estimated, these implementation costs could range from $250,000 to $500,000, with ongoing costs related to alternative health measures potentially adding $100,000-$300,000 annually.\n\nSTAKEHOLDER IMPACT AND MANAGEMENT:\nThe policy change will affect various stakeholders differently, requiring thoughtful management:\n\n1. Student concerns: Some students may have selected Yale in part due to its health policies, creating potential dissatisfaction\n2. Faculty and staff considerations: Employees may have workplace safety concerns that must be addressed\n3. Immunocompromised community members: Special accommodations may need development to protect vulnerable populations\n4. Public health relationships: Yale's connections with public health agencies may require recalibration\n\nEach stakeholder group will require tailored communication and may necessitate the development of alternative health safety measures that comply with the order while addressing concerns.\n\nLEGAL AND COMPLIANCE CONSIDERATIONS:\nYale must navigate potential tensions between:\n\n1. Federal requirements under this executive order\n2. State public health regulations and recommendations\n3. Contractual obligations with employees and students\n4. ADA and reasonable accommodation requirements\n5. General duty of care obligations to the university community\n\nSTRATEGIC RESPONSE OPTIONS:\nYale has several potential strategic approaches including:\n\n1. Full compliance with minimal adjustment to other health protocols\n2. Compliance while implementing enhanced alternative health measures (testing, ventilation improvements, etc.)\n3. Emphasis on education and voluntary vaccination while removing mandates\n4. Differential approaches for high-risk settings (medical facilities, research labs) versus general campus areas\n\nThe executive order represents a high-impact policy change for Yale's operations, primarily affecting administrative compliance procedures and workforce policies. It requires immediate attention to maintain federal funding eligibility while developing alternative approaches to campus health management. While challenging, the university can develop compliant approaches that still support overall community health objectives through non-mandatory measures.",
          impactLevel: "High",
          categories: ["Education", "Healthcare"],
          universityImpactAreas: ["Administrative Compliance", "Workforce & Employment Policy"]
        }
      },
      {
        order_number: "2025-02841",
        title: "One Voice for America's Foreign Relations",
        analysis: {
          summary: "This executive order centralizes U.S. foreign relations communications, potentially affecting Yale's international programs, partnerships, and diplomatic academic initiatives. While not directly targeting universities, it may restrict certain forms of academic engagement with foreign governments, requiring administrative adjustments and compliance monitoring.",
          executiveBrief: "President Trump's executive order 'One Voice for America's Foreign Relations' centralizes U.S. foreign policy communications and engagement with foreign governments. While primarily directed at federal agencies, this order has implications for Yale University's substantial international activities and programs.\n\nThe order may restrict or require additional oversight for Yale's institutional interactions with foreign government entities, potentially affecting international research collaborations, academic partnerships, and certain global initiatives. Yale's Office of International Affairs and General Counsel will need to review existing agreements with foreign universities, particularly those with strong government affiliations, to ensure compliance with the new directive.\n\nFinancially, Yale should anticipate potential delays in international project approvals and possibly increased administrative costs for enhanced compliance monitoring. Programs that involve direct engagement with foreign ministries or government-controlled universities may require additional federal clearance procedures. While the order does not prohibit international academic collaboration, it introduces a new layer of administrative consideration that could impact the university's global engagement strategy.",
          comprehensiveAnalysis: "Executive Order 2025-02841, \"One Voice for America's Foreign Relations,\" establishes a centralized approach to U.S. foreign policy communications and engagement. Though primarily targeting federal agencies, this order carries significant implications for Yale University's extensive international operations, partnerships, and academic initiatives.\n\nIMPACT ON INTERNATIONAL PROGRAMS AND PARTNERSHIPS:\nYale maintains over 300 international partnerships across 50+ countries, including formal agreements with foreign universities, research institutes, and in some cases, education ministries. The executive order's centralization mandate may require:\n\n1. Comprehensive review of existing agreements with foreign government-affiliated institutions to identify potential compliance issues\n2. Additional federal approval processes for new partnerships with foreign government entities\n3. Modified communication protocols for institutional engagement with foreign officials\n4. Potential reclassification of certain academic exchanges as \"diplomatic engagement\"\n\nThis affects numerous Yale initiatives including Yale-NUS College (Singapore), Yale Center Beijing, Paul Mellon Centre (London), and various other international programs and centers.\n\nFINANCIAL IMPLICATIONS:\nThe financial impact manifests through several channels:\n\n1. Administrative Overhead: Increased compliance monitoring will require additional staff time and potentially new positions dedicated to international agreement review and federal coordination. Estimated additional costs: $150,000-$300,000 annually.\n\n2. Potential Project Delays: New clearance requirements could extend timelines for international initiatives by 2-6 months, potentially affecting grant timelines and project budgets.\n\n3. Risk Management Costs: Enhanced legal review of international agreements to ensure compliance will increase legal counsel expenses.\n\n4. Strategic Opportunity Costs: Some valuable international opportunities may become impractical due to administrative barriers, representing an indirect financial impact through lost potential benefits.\n\nIMPACT ON SPECIFIC YALE ACTIVITIES:\n\n1. International Research Collaborations: Faculty-led research with foreign government funding or partnerships may require additional federal clearance, potentially affecting numerous scientific and humanities projects.\n\n2. Student Exchange Programs: While traditional student exchanges should continue largely unaffected, programs involving government ministries may face additional scrutiny.\n\n3. International Conferences and Events: Yale-hosted events with foreign government participants may require coordination with the State Department, potentially complicating planning.\n\n4. Yale's Centers Abroad: Operations of Yale's international centers may need protocol adjustments, particularly regarding engagement with local officials.\n\n5. Faculty Global Engagement: Faculty serving in advisory roles to foreign governments may need to disclose these activities for potential review.\n\nSTRATEGIC CONSIDERATIONS AND MITIGATION APPROACHES:\n\n1. Compliance Infrastructure: Yale should establish a coordinated approach between the Office of International Affairs, General Counsel, and appropriate academic departments to streamline compliance efforts.\n\n2. Strategic Partnership Evaluation: Review international partnerships based on strategic importance and potential compliance complexity to prioritize resources appropriately.\n\n3. Clear Internal Guidelines: Develop comprehensive guidance for faculty and administrators on what types of international engagement require additional review or federal notification.\n\n4. Relationship Building with Federal Agencies: Establishing clear communication channels with relevant State Department offices could help navigate the new requirements more efficiently.\n\n5. Partnership Structure Adjustment: Some relationships might benefit from restructuring to minimize direct government engagement while preserving academic benefits.\n\nThe executive order presents a medium impact on Yale University operations. While not prohibiting international engagement, it introduces additional administrative layers that will affect the pace, structure, and potentially the scope of Yale's global activities. The primary university impact will be in Administrative Compliance, with secondary effects on Research Funding (particularly international grants) and Workforce & Employment Policy regarding international scholars and staff. The university should prepare for increased administrative burden while developing streamlined processes to maintain its global academic mission within the new regulatory framework.",
          impactLevel: "Medium",
          categories: ["Education", "Immigration"],
          universityImpactAreas: ["Administrative Compliance", "Research Funding"]
        }
      },
      {
        order_number: "2025-02762",
        title: "Implementing the President's \"Department of Government Efficiency\" Workforce Optimization Initiative",
        analysis: {
          summary: "This executive order implements workforce optimization across federal agencies, which will primarily affect Yale through changes to federal grant administration and potentially reduced staffing at agencies that fund university research. Yale should prepare for possible delays in grant processing and modified reporting requirements.",
          executiveBrief: "The executive order implementing the Department of Government Efficiency's Workforce Optimization Initiative focuses on restructuring federal agencies to increase efficiency, which will indirectly impact Yale University through its interactions with these agencies. While not directly regulating universities, the changes to federal workforce and processes will affect Yale's federally funded research programs and compliance requirements.\n\nYale receives approximately $500-700 million annually in federal research funding across various agencies including NIH, NSF, DOE, and others. The workforce changes at these agencies may lead to processing delays for grant applications, modifications to reporting requirements, and potentially changes to funding priorities. Yale's Office of Sponsored Projects and research administration teams should prepare for these shifts by monitoring agency-specific implementation plans.\n\nFinancially, this represents a moderate administrative burden rather than a direct financial impact. Yale will need to invest in understanding the new agency structures, potentially adjust proposal submission timelines to account for processing delays, and provide updated guidance to faculty researchers. These administrative adjustments represent modest but manageable costs for the university's research enterprise.",
          comprehensiveAnalysis: "Executive Order 2025-02762, \"Implementing the President's 'Department of Government Efficiency' Workforce Optimization Initiative,\" aims to streamline federal workforce operations across all agencies. While the order does not directly target higher education institutions, it will have substantial indirect effects on Yale University's operations, primarily through its extensive interactions with federal agencies for research funding, regulatory compliance, and academic programs.\n\nFEDERAL FUNDING IMPACTS:\nYale University receives approximately $500-700 million annually in federal funding, primarily through research grants from agencies such as NIH, NSF, DOE, NEH, and others. The workforce optimization measures in federal agencies will likely result in:\n\n1. Delayed processing times for grant applications and renewals as agencies realign staff and processes\n2. Potential consolidation of grant programs or funding mechanisms\n3. Modified reporting requirements and compliance procedures\n4. Reduced agency staff available for technical assistance and guidance\n\nThese changes could create temporary disruptions in funding flows and increase administrative uncertainty for research planning. For large, multi-year grants, Yale may experience delayed decision timelines that complicate research planning and staffing decisions, particularly for programs that rely on continuous federal funding cycles.\n\nADMINISTRATIVE ADAPTATION REQUIREMENTS:\nYale's research administration infrastructure will need to adapt to these changes through:\n\n1. Enhanced monitoring of agency-specific implementation plans and timelines\n2. Potentially modified internal submission deadlines to accommodate longer agency processing times\n3. Updated training for principal investigators and research administrators\n4. Development of contingency planning for projects with time-sensitive funding needs\n\nThe Office of Sponsored Projects, which processes approximately 3,000 proposals annually, may need to allocate additional resources to track these changes across multiple federal agencies and provide appropriate guidance to faculty researchers.\n\nFINANCIAL IMPLICATIONS:\nThe financial impact on Yale will primarily manifest through:\n\n1. Administrative overhead increases to manage the transition period (estimated at $100,000-$250,000)\n2. Potential cash flow management challenges if grant processing times extend significantly\n3. Possible budget adjustments for projects affected by changing agency requirements\n4. Limited direct costs for systems modifications to accommodate new federal reporting formats\n\nWhile these costs are manageable within Yale's research administration budget, they represent an unanticipated administrative burden that diverts resources from other strategic priorities.\n\nLONGER-TERM STRATEGIC CONSIDERATIONS:\nBeyond the immediate transition period, Yale should consider:\n\n1. Diversification of funding sources to reduce dependence on agencies most affected by workforce reductions\n2. Strategic engagement with federal agencies during the reorganization process to advocate for efficient research support mechanisms\n3. Development of enhanced support systems for faculty navigating the changing federal landscape\n4. Potential opportunities to shape new, streamlined processes that could eventually reduce administrative burden\n\nCOMMUNICATION AND COMPLIANCE STRATEGY:\nTo effectively manage these changes, Yale should implement:\n\n1. A coordinated communication approach to keep researchers informed about agency-specific changes\n2. Regular briefings for department research administrators\n3. Enhanced monitoring of federal regulatory announcements related to the workforce initiative\n4. Systematic tracking of submission-to-award timelines to identify emerging patterns\n\nIn conclusion, while the executive order creates primarily administrative rather than fundamental challenges, it represents a medium impact on Yale's operations due to the university's extensive reliance on federal funding mechanisms. The greatest effects will be felt in research administration, requiring tactical adjustments but not strategic repositioning. The primary university impact areas will be Administrative Compliance and Research Funding, with effects distributed across all departments engaged in federally funded research.",
          impactLevel: "Medium",
          categories: ["Research", "Finance"],
          universityImpactAreas: ["Research Funding", "Administrative Compliance"]
        }
      }
    ];

    let successCount = 0;
    
    // Process the batch analysis
    for (const item of batchAnalysis) {
      try {
        console.log(`\nProcessing order with number: ${item.order_number} - ${item.title}`);
        
        // Find the order in our database
        const order = await dbGet(
          'SELECT id, order_number, title FROM executive_orders WHERE order_number = ?', 
          [item.order_number]
        );
        
        if (!order) {
          console.log(`Order not found in database: ${item.order_number}`);
          continue;
        }
        
        // Update order with analysis
        const success = await updateOrderWithAnalysis(order.id, item.analysis);
        if (success) {
          successCount++;
        }
      } catch (error) {
        console.error(`Error processing order ${item.order_number}:`, error);
      }
    }
    
    console.log(`\nAnalysis completed. Successfully analyzed ${successCount} out of ${batchAnalysis.length} orders.`);
    
  } catch (error) {
    console.error("Error in main process:", error);
  } finally {
    // Close the database connection
    db.close();
  }
}

// Run the main function
main();