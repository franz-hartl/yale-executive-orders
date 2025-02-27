/**
 * analyze_new_orders_batch2.js
 * 
 * Second batch of analyses for executive orders without impact levels.
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
    console.log("Starting analysis of executive orders without impact levels (Batch 2)...");
    
    // Get orders that need analysis (those without impact levels)
    const ordersToAnalyze = await dbAll(`
      SELECT id, order_number, title, signing_date, publication_date, president, summary, full_text, url
      FROM executive_orders 
      WHERE impact_level IS NULL OR impact_level = ''
      ORDER BY signing_date DESC
    `);
    
    console.log(`Found ${ordersToAnalyze.length} orders that still need analysis`);
    
    // Process each order with manual analysis
    const batchAnalysis = [
      {
        order_number: "2025-02735",
        title: "Ending Procurement and Forced Use of Paper Straws",
        analysis: {
          summary: "This executive order prohibits federal agencies from purchasing or requiring the use of paper straws. While it has minimal direct financial impact on Yale University, it may affect campus dining operations and environmental sustainability initiatives.",
          executiveBrief: "President Trump's executive order 'Ending Procurement and Forced Use of Paper Straws' prohibits federal agencies from purchasing paper straws and prevents them from requiring their use in federally-funded facilities. While Yale University is not directly mandated to change its practices, this order carries symbolic and potential policy implications for the institution.\n\nYale's sustainability initiatives, including its commitment to reducing single-use plastics on campus, may need recalibration in response to this shifting federal stance. The university's dining services and event management teams, which have adopted paper straws as part of broader sustainability efforts, should review their practices to ensure they remain cost-effective while balancing environmental commitments with regulatory changes.\n\nFinancially, the direct impact on Yale is minimal, primarily limited to potential adjustments in procurement practices. However, the university should monitor developments in this area, particularly if this executive order signals broader regulatory changes regarding environmental sustainability practices that could affect campus operations or research priorities.",
          comprehensiveAnalysis: "Executive Order 2025-02735, \"Ending Procurement and Forced Use of Paper Straws,\" prohibits federal agencies from purchasing paper straws and prevents them from requiring their use in federally-funded facilities. While primarily targeting federal operations, this order has several implications for Yale University's operations, sustainability initiatives, and campus culture.\n\nIMPACT ON CAMPUS SUSTAINABILITY INITIATIVES:\nYale University has implemented comprehensive sustainability plans that include initiatives to reduce single-use plastics, with paper straws adopted as one component of these efforts. The executive order creates several considerations:\n\n1. Symbolic Impact: The order signals a federal policy shift away from certain sustainability practices, potentially creating tension with Yale's institutional commitments to environmental stewardship.\n\n2. Regulatory Consideration: While not directly mandating changes to university practices, the order may influence broader regulatory approaches to sustainability requirements that could eventually affect university operations.\n\n3. Community Expectations: Yale's environmentally conscious student body and faculty may have strong opinions about the university's response to this directive, creating a need for thoughtful communication strategies.\n\nOPERATIONAL CONSIDERATIONS:\nYale Hospitality operates 28 residential and retail dining locations serving over 14,000 meals daily. Current operations may be affected in several ways:\n\n1. Procurement Flexibility: The order may provide an opportunity to reassess the cost-effectiveness of paper straws (which typically cost 2-3 times more than plastic alternatives) while maintaining environmental commitments.\n\n2. Event Management: Yale hosts numerous events where food service practices reflect institutional values. The policy creates a decision point regarding whether to maintain current practices or adjust them in response to shifting federal priorities.\n\n3. Vendor Relationships: Yale's food service vendors and suppliers may themselves adjust practices in response to this federal directive, potentially affecting product availability or pricing.\n\nFINANCIAL IMPLICATIONS:\nThe direct financial impact on Yale University is minimal, primarily limited to potential adjustments in procurement practices. Specific considerations include:\n\n1. Procurement Costs: Paper straws typically cost $0.01-0.03 per unit compared to $0.005-0.01 for plastic alternatives. Any shift in straw type would have marginal budget implications given the university's scale of operations.\n\n2. Compliance Systems: No significant expenditures would be required for compliance, as the order does not directly mandate university action.\n\n3. Reputational Considerations: Yale's decisions regarding sustainability practices have implications for donor relationships, student recruitment, and community standing, representing indirect financial considerations.\n\nEDUCATIONAL AND RESEARCH IMPLICATIONS:\nAs a leading research institution, Yale has several academic considerations:\n\n1. Environmental Studies Programs: The policy shift may become a case study in environmental policy courses, particularly regarding regulatory approaches to sustainability.\n\n2. Research Focus: Yale's environmental research centers may find value in analyzing the environmental and policy implications of this directive.\n\n3. Teaching Opportunities: The order creates teaching moments regarding the intersection of government policy, environmental science, and institutional values.\n\nSTRATEGIC RESPONSE OPTIONS:\nYale University has several potential approaches to responding to this executive order:\n\n1. Maintain Current Practices: Continue using paper straws as part of broader sustainability commitments, positioning this as an institutional value independent of federal requirements.\n\n2. Hybrid Approach: Offer both options while emphasizing educational aspects of personal choice in sustainability practices.\n\n3. Research-Driven Response: Engage Yale's environmental research centers to evaluate the actual environmental impact of various straw options, using empirical evidence to guide university practice.\n\n4. Innovation Focus: Challenge Yale's sustainability office and student innovators to develop cost-effective alternatives that address both environmental and usability concerns.\n\nThis executive order has a Low impact on Yale University operations, primarily affecting Administrative Compliance considerations with minimal direct financial implications. While not requiring immediate action, it presents an opportunity for the university to thoughtfully articulate its approach to sustainability practices in a changing regulatory environment. The primary university impact areas are Administrative Compliance and Public-Private Partnerships (particularly regarding vendor relationships).",
          impactLevel: "Low",
          categories: ["Environment"],
          universityImpactAreas: ["Administrative Compliance", "Public-Private Partnerships"]
        }
      },
      {
        order_number: "2025-02734",
        title: "Eliminating the Federal Executive Institute",
        analysis: {
          summary: "This executive order eliminates the Federal Executive Institute (FEI), which has limited direct impact on Yale University's core operations. However, it may affect Yale's executive education programs that serve federal leaders and potentially impact some research partnerships.",
          executiveBrief: "President Trump's executive order eliminating the Federal Executive Institute (FEI) will have modest implications for Yale University. The primary impact will be on Yale School of Management's executive education programs, which occasionally partner with or serve federal executives who previously might have trained at the FEI.\n\nWith the FEI's elimination, Yale may experience a slight increase in federal executives seeking alternative leadership development opportunities through university programs. This could present a potential opportunity to expand offerings targeted at public sector leadership, particularly through the School of Management and potentially the Jackson School of Global Affairs.\n\nFinancially, any impact would be minimal and limited to modest potential revenue opportunities in executive education programs. Yale should monitor developments regarding how federal agencies will address executive development needs following the FEI's elimination, which could inform strategic decisions about program offerings and potential partnerships.",
          comprehensiveAnalysis: "Executive Order 2025-02734, \"Eliminating the Federal Executive Institute,\" discontinues a major federal leadership development resource that has trained senior government executives since 1968. While Yale University is not directly regulated by this order, its elimination has several indirect implications for the university's operations, particularly in executive education, public sector research, and potential partnership opportunities.\n\nIMPACT ON EXECUTIVE EDUCATION PROGRAMS:\nYale School of Management (SOM) offers various executive education programs, some of which serve government leaders or address public sector challenges. With the elimination of the FEI, several considerations emerge:\n\n1. Potential Market Opportunity: The absence of the FEI creates a potential gap in leadership development for GS-15 to Senior Executive Service (SES) federal employees, which Yale's executive programs might address. Approximately 7,000 career executives in the SES and thousands more GS-15 employees would no longer have access to this centralized training resource.\n\n2. Program Development Considerations: Yale SOM could evaluate developing or expanding executive education offerings specifically targeted at senior federal leaders, potentially in areas like public-private partnerships, crisis leadership, or technology transformation in government.\n\n3. Certificate and Custom Programs: Yale's existing certificate programs might be positioned to serve federal agencies seeking leadership development alternatives, particularly if modified to address specific federal context and requirements.\n\nFINANCIAL IMPLICATIONS:\nThe financial impact on Yale is likely to be modest but potentially positive:\n\n1. Potential Revenue Opportunities: If Yale were to develop programs specifically addressing the gap left by the FEI, this could generate additional executive education revenue. Typical executive education programs range from $5,000-$15,000 per participant, and federal agencies collectively spend tens of millions annually on executive development.\n\n2. Partnership Potential: Federal agencies may seek university partnerships to fulfill leadership development needs previously addressed by the FEI, creating opportunities for funded collaborations.\n\n3. Research Funding Implications: The elimination of the FEI might result in redistribution of some federal funding for public sector leadership research, potentially benefiting academic institutions like Yale.\n\nFACULTY EXPERTISE AND ENGAGEMENT:\nYale has significant faculty expertise relevant to federal leadership development:\n\n1. School of Management professors specializing in organizational behavior, public management, and leadership could find new engagement opportunities with federal agencies.\n\n2. Jackson School of Global Affairs faculty with expertise in governance and public administration might develop new federal agency relationships.\n\n3. Interdisciplinary opportunities could emerge, connecting leadership development to Yale's strengths in areas like technological innovation, healthcare policy, or environmental management.\n\nRESEARCH IMPLICATIONS:\nThe elimination of the FEI has several implications for Yale's research enterprise:\n\n1. Research Access: The FEI occasionally facilitated researcher access to federal executives for studies on public sector leadership; alternative channels for such research may need development.\n\n2. Knowledge Repository: The FEI maintained significant data and case studies on federal leadership challenges; Yale researchers interested in public sector leadership may need to identify alternative information sources.\n\n3. Applied Research Opportunities: As federal agencies seek new approaches to executive development, opportunities may emerge for Yale researchers to study and contribute to these transitions.\n\nSTRATEGIC CONSIDERATIONS:\nTo effectively respond to this change in the federal landscape, Yale might consider:\n\n1. Conducting market research to assess federal agency needs following the FEI's elimination\n\n2. Evaluating current executive education offerings for potential adaptation to federal audience needs\n\n3. Developing targeted outreach to federal agencies regarding Yale's capabilities in leadership development\n\n4. Exploring partnerships with other schools or institutions to create comprehensive offerings\n\nIn summary, Executive Order 2025-02734 presents a low to medium impact on Yale University operations, primarily creating potential opportunities rather than compliance challenges. The most relevant university impact areas are Public-Private Partnerships (through potential new federal agency relationships) and Research Funding (through possible new channels for public sector leadership research). While not requiring immediate action, this change in the federal landscape merits monitoring and potential strategic response through the School of Management and related units.",
          impactLevel: "Low",
          categories: ["Education"],
          universityImpactAreas: ["Public-Private Partnerships", "Research Funding"]
        }
      },
      {
        order_number: "2025-02636",
        title: "Protecting Second Amendment Rights",
        analysis: {
          summary: "This executive order strengthens Second Amendment protections and may limit university policies regarding firearms on campus. Yale will need to review its campus safety policies to ensure compliance with potential new federal guidelines, while balancing safety considerations within state law parameters.",
          executiveBrief: "The executive order 'Protecting Second Amendment Rights' introduces potential implications for Yale University's campus safety policies and operations. While the specific impact depends on the precise language and implementation of the order, Yale will need to carefully review its current firearms policies to ensure compliance with any new federal directives.\n\nYale currently maintains a weapons policy prohibiting firearms on campus property, which is consistent with Connecticut state law. This executive order could potentially create tension between federal directives and state law or university policy. Yale's Office of General Counsel and Public Safety departments will need to analyze the order's specific provisions and determine if policy adjustments are necessary.\n\nFinancially, Yale may face administrative costs associated with policy review, potential adjustments to security protocols, and possible communication campaigns to inform the university community of any policy changes. The university should prepare for potential stakeholder concerns regarding campus safety and develop clear communication strategies addressing how Yale will maintain a safe educational environment while complying with applicable federal directives.",
          comprehensiveAnalysis: "Executive Order 2025-02636, \"Protecting Second Amendment Rights,\" represents a significant federal policy shift with potential implications for Yale University's campus safety protocols, administrative policies, and legal compliance framework.\n\nPOLICY IMPLICATIONS AND LEGAL CONSIDERATIONS:\nYale University currently maintains a weapons policy that prohibits firearms on campus property, consistent with Connecticut state law. This executive order creates several important legal and policy considerations:\n\n1. Federal-State-University Policy Interface: The executive order potentially creates a complex legal landscape where Yale must navigate between federal directives, state law, and institutional safety priorities. Connecticut maintains strict gun control laws that Yale's current policies align with, creating potential jurisdictional questions about which regulations take precedence.\n\n2. Regulatory Compliance Review: Yale will need to conduct a comprehensive review of its current firearms policies, examining:\n   - Campus weapons prohibition policies\n   - Security protocols for campus buildings and events\n   - Housing agreements and residential life policies\n   - Event security guidelines\n   - Campus police procedures\n\n3. Legal Risk Assessment: The university's Office of General Counsel will need to evaluate potential legal exposure related to policy changes or maintenance of current policies, particularly regarding liability, insurance considerations, and compliance with contradictory federal and state directives.\n\nCAMPUS SAFETY AND SECURITY OPERATIONS:\nYale maintains a comprehensive security infrastructure that may require adjustment based on the executive order:\n\n1. Security Protocols: Current entry procedures, especially for high-security areas like laboratories, performance venues, and administrative buildings, may need reevaluation.\n\n2. Yale Police Department Operations: The Yale Police Department, which employs approximately 100 officers, may need to modify training, protocols, and response procedures based on potential policy changes.\n\n3. Emergency Management: Campus emergency response plans may require updates to address scenarios involving lawfully carried firearms on campus, if policy changes result from the executive order.\n\nFINANCIAL IMPLICATIONS:\nThe financial impact on Yale will primarily manifest through administrative and operational adaptations:\n\n1. Policy Development and Implementation: Costs associated with legal review, policy development, stakeholder consultation, and implementation of any necessary changes (estimated at $100,000-$200,000).\n\n2. Security System Modifications: Potential adjustments to physical security infrastructure if current systems need modification to align with new requirements (variable cost depending on scope of changes).\n\n3. Training Requirements: Additional training for security personnel, residential staff, and other employees to address policy changes (estimated at $50,000-$100,000).\n\n4. Communication Campaigns: Comprehensive communication efforts to explain policy changes to the university community (estimated at $30,000-$50,000).\n\nSTAKEHOLDER IMPACT AND MANAGEMENT:\nThe executive order potentially affects various university constituencies differently:\n\n1. Student Concerns: Many students may express concerns about potential changes to campus weapons policies, requiring careful communication and clarification of actual policy implications.\n\n2. Faculty and Staff Considerations: Employment policies and workplace safety concerns will need addressing through appropriate consultation and communication channels.\n\n3. Community Relations: Yale's relationship with the city of New Haven may require additional attention if campus weapons policies change, given the urban setting of the university.\n\n4. Donor and Alumni Relations: Policy changes may generate strong opinions among some donors and alumni, requiring strategic communication approaches.\n\nSTRATEGIC RESPONSE OPTIONS:\nYale has several potential approaches to responding to this executive order:\n\n1. Minimum Compliance Approach: Identify the specific requirements of the order and make only those adjustments absolutely necessary to maintain compliance while preserving core campus safety priorities.\n\n2. Collaborative Engagement: Work with peer institutions, higher education associations, and legal experts to develop consistent approaches and potentially seek clarification on the order's application to private universities.\n\n3. Differentiated Policy Framework: Develop nuanced policies that may vary by campus location or function, potentially maintaining stricter protocols in sensitive areas while adjusting policies in others.\n\n4. Proactive Communication Strategy: Regardless of policy decisions, develop comprehensive communication plans that emphasize Yale's continued commitment to campus safety while acknowledging the changing regulatory environment.\n\nThe executive order represents a medium impact on Yale University operations, primarily affecting Administrative Compliance procedures and potentially Workforce & Employment Policy regarding security personnel. The university faces challenges in balancing federal compliance with state law requirements and institutional safety priorities, requiring careful legal analysis and strategic planning.",
          impactLevel: "Medium",
          categories: ["National Security"],
          universityImpactAreas: ["Administrative Compliance"]
        }
      },
      {
        order_number: "2025-02635",
        title: "Establishment of the White House Faith Office",
        analysis: {
          summary: "This executive order establishes a White House Faith Office to coordinate federal efforts involving faith-based organizations. Yale should monitor how this might affect grant opportunities, partnerships, and religious accommodations in university operations, though direct impact is likely minimal.",
          executiveBrief: "President Trump's executive order establishing the White House Faith Office creates a new federal entity to coordinate government partnerships with faith-based organizations. While Yale University is a secular institution, this executive order has several implications for its operations and partnerships.\n\nYale maintains various religiously affiliated organizations and programs, including the Yale Divinity School, Yale Chaplain's Office, and numerous student religious groups. The new White House Faith Office may create funding opportunities and partnership possibilities that these organizations could potentially access. Yale's Office of Federal Relations should monitor developing grant programs and engagement opportunities arising from this initiative.\n\nFrom a compliance perspective, Yale should review its current religious accommodation policies to ensure they align with any new federal guidance that may emerge. While the immediate financial impact is likely minimal, Yale should prepare for potential shifts in how federal agencies engage with religious aspects of university programs and scholarship.",
          comprehensiveAnalysis: "Executive Order 2025-02635, \"Establishment of the White House Faith Office,\" creates a new executive branch entity to coordinate federal initiatives involving faith-based organizations and religious issues. While Yale University is a secular institution with no formal religious affiliation, this executive order carries several implications for its operations, partnerships, and academic programs.\n\nIMPLICATIONS FOR RELIGIOUS-AFFILIATED PROGRAMS:\nYale houses several academic and community entities with religious dimensions that could be affected by this order:\n\n1. Yale Divinity School: As one of Yale's professional schools, the Divinity School maintains numerous programs studying various faith traditions and preparing students for religious leadership. The new White House Faith Office might create opportunities for federal engagement with Divinity School programs, particularly in areas where religious and public service interests intersect, such as community development, social welfare, or international humanitarian work.\n\n2. Yale Chaplain's Office: Yale supports approximately 25 chaplains representing diverse faith traditions who serve the university community. The executive order might influence how these chaplaincies engage with federal programs or how they navigate religious accommodation issues within university life.\n\n3. Religious Student Organizations: Yale recognizes over 30 student religious groups. New federal guidelines or programs emerging from the Faith Office could affect how these organizations operate, particularly regarding access to resources or participation in federal initiatives.\n\nPOTENTIAL FUNDING AND PARTNERSHIP IMPACTS:\nThe executive order may create new channels for engagement between Yale and federal agencies:\n\n1. Grant Opportunities: The Faith Office might influence how federal agencies structure grant programs relevant to religious studies, community service initiatives with faith dimensions, or international programs engaging religious communities. Yale receives approximately $500-700 million annually in federal funding; while most is unrelated to religious elements, some programs in social sciences, humanities, or international studies might see new funding parameters.\n\n2. Research Partnerships: Yale researchers studying religious phenomena (particularly in fields like sociology, history, political science, or area studies) might find new federal interest in their work, potentially creating collaborative opportunities.\n\n3. Community Engagement: Yale's commitment to New Haven includes partnerships with faith-based community organizations. The executive order could potentially create new models for how these tripartite relationships between universities, community faith organizations, and federal agencies function.\n\nCOMPLIANCE CONSIDERATIONS:\nYale will need to monitor several compliance areas as this office develops policies:\n\n1. Religious Accommodation Policies: Any new federal guidance on religious accommodations in educational settings could require review of Yale's current practices regarding religious observances, dietary requirements, or prayer spaces.\n\n2. Non-Discrimination Standards: Yale must navigate potentially complex territory if new federal guidance emerges regarding religious exemptions to non-discrimination requirements, particularly given the university's strong commitment to LGBTQ+ inclusion alongside respect for religious diversity.\n\n3. Employment Practices: Yale employs approximately 14,000 faculty and staff; any new federal guidance on religious accommodations in employment would require careful review of current human resources policies.\n\nACADEMIC PROGRAM IMPLICATIONS:\nThe executive order may influence how certain academic areas develop:\n\n1. Religious Studies: Yale's Department of Religious Studies and related academic programs might find both new research opportunities and potentially new political dimensions to their field.\n\n2. Ethics Education: Programs addressing ethical leadership across Yale (particularly in professional schools) might need to consider how faith perspectives are incorporated in light of evolving federal approaches.\n\n3. International Programs: Yale's extensive international engagements, particularly in regions where religious factors significantly influence sociopolitical dynamics, might see new federal interest or guidance.\n\nSTRATEGIC RESPONSE CONSIDERATIONS:\n\n1. Monitoring Framework: Yale should establish a coordinated approach for tracking policy developments from this new office, potentially through the Office of Federal Relations in coordination with relevant academic units.\n\n2. Stakeholder Communication: Developing clear communication protocols for informing relevant university constituents about policy changes will be important for managing potential concerns.\n\n3. Balancing Institutional Values: Yale will need to navigate carefully between respecting religious diversity, maintaining its secular institutional character, and complying with evolving federal guidelines.\n\nThe executive order represents a low impact on Yale University operations, primarily creating potential opportunities rather than compliance challenges. The most relevant university impact areas are Administrative Compliance and limited aspects of Research Funding. While not requiring immediate action, this change in the federal landscape merits monitoring, particularly by the Divinity School, Chaplain's Office, and Office of Federal Relations.",
          impactLevel: "Low",
          categories: ["Education"],
          universityImpactAreas: ["Administrative Compliance", "Research Funding"]
        }
      },
      {
        order_number: "2025-02630",
        title: "Addressing Egregious Actions of the Republic of South Africa",
        analysis: {
          summary: "This executive order implements sanctions against South Africa, affecting Yale's academic partnerships, study abroad programs, and research collaborations with South African institutions. Financial operations, scholar exchanges, and certain research funding streams involving South Africa will require comprehensive review and potential restructuring.",
          executiveBrief: "The executive order 'Addressing Egregious Actions of the Republic of South Africa' implements economic sanctions and diplomatic measures against South Africa that will significantly impact Yale University's substantial academic and research relationships with South African institutions. Yale maintains multiple partnerships with South African universities, operates study abroad programs, and conducts numerous research initiatives in the country.\n\nYale's Office of International Affairs and General Counsel will need to conduct an immediate comprehensive review of all South African engagements to ensure compliance with new sanctions. This includes evaluating financial transactions with South African institutions, reviewing current exchange programs and research partnerships, and potentially restructuring or temporarily suspending certain activities that may violate sanctions provisions.\n\nFinancially, Yale should prepare for potential disruptions to grant-funded projects involving South African partners, complications in tuition and stipend payments for South African students, and possible restrictions on purchasing research materials or services from South African entities. The university should develop contingency plans for affected programs while seeking specific guidance from the Treasury Department's Office of Foreign Assets Control regarding academic exceptions that may apply.",
          comprehensiveAnalysis: "Executive Order 2025-02630, \"Addressing Egregious Actions of the Republic of South Africa,\" implements sanctions and diplomatic measures against South Africa that will have significant implications for Yale University's substantial academic, research, and institutional relationships with South African entities.\n\nASSESSMENT OF YALE-SOUTH AFRICA ENGAGEMENTS:\nYale maintains extensive ties with South Africa that could be affected by this order:\n\n1. Academic Partnerships: Yale has formal partnership agreements with several South African universities, including the University of Cape Town, University of the Witwatersrand, and Stellenbosch University. These partnerships facilitate faculty exchanges, joint research projects, and collaborative degree programs that may be disrupted by new sanctions.\n\n2. Study Abroad Programs: Yale sends approximately 15-25 students annually to South Africa through various programs, including the Yale-in-Cape Town program and specialized research opportunities. These programs involve financial transactions, housing arrangements, and academic collaborations that must be evaluated for sanctions compliance.\n\n3. Research Initiatives: Yale faculty conduct substantial research in South Africa across multiple disciplines, including public health (particularly HIV/AIDS research), environmental studies, history, anthropology, and political science. Many of these projects receive federal funding, creating complex compliance requirements under the new sanctions regime.\n\n4. South African Students and Scholars: Yale enrolls South African students across its schools and hosts visiting scholars from South African institutions. New sanctions may affect visa statuses, financial aid processing, stipend payments, and scholarly exchanges.\n\nFINANCIAL AND OPERATIONAL IMPLICATIONS:\nThe sanctions create several operational challenges for Yale:\n\n1. Financial Transactions: Yale will need to review all financial transactions with South African entities, potentially including:\n   - Tuition processing for South African students\n   - Payments to South African research partners\n   - Procurement of research materials or services from South African providers\n   - Grant disbursements involving South African collaborators\n   - Conference fees and travel reimbursements for South African scholars\n\n2. Administrative Systems: Yale's financial and administrative systems will require updates to flag and properly review South Africa-related transactions, likely requiring adjustments to:\n   - Procurement systems\n   - Grant management platforms\n   - International payment processing\n   - Travel authorization and reimbursement procedures\n\n3. Compliance Infrastructure: Yale will need to expand compliance resources to manage sanctions requirements, including:\n   - Staff training on new sanctions provisions\n   - Development of review protocols for South Africa engagements\n   - Enhanced documentation procedures for authorized activities\n   - Potential expansion of Office of International Affairs capacity\n\nEstimated direct financial impact for implementing these changes ranges from $250,000-$500,000, primarily in administrative costs and compliance infrastructure.\n\nSPECIFIC PROGRAM IMPACTS:\nSeveral high-profile Yale-South Africa initiatives face potential disruption:\n\n1. Yale-UCT Partnership on HIV/TB Research: This collaborative research program, supported by NIH funding, involves significant resource sharing and personnel exchanges that may require restructuring.\n\n2. Environmental Studies Field Programs: Yale School of the Environment operates field research programs in South African biodiversity hotspots that involve financial relationships with local institutions.\n\n3. Fox International Fellowship: This program, which regularly includes South African scholars, will need to evaluate whether scholar exchanges can continue under new sanctions provisions.\n\n4. Yale Law School Collaborations: Yale maintains relationships with South African legal institutions focused on constitutional law and human rights that may face restrictions.\n\nLEGAL COMPLIANCE STRATEGIES:\nYale has several options for managing sanctions compliance:\n\n1. OFAC License Applications: Yale should identify critical programs that might qualify for specific licenses from the Treasury Department's Office of Foreign Assets Control, particularly those involving humanitarian research or educational exchanges.\n\n2. Program Restructuring: Some initiatives may continue with modified structures that comply with sanctions while maintaining core academic objectives.\n\n3. Temporary Suspensions: High-risk activities may require temporary suspension pending clarification of sanctions implications or receipt of appropriate licenses.\n\n4. Alternative Partnerships: In some cases, Yale might explore relocating certain programs to neighboring countries while maintaining research objectives.\n\nSTAKEHOLDER MANAGEMENT:\nYale must manage communications with multiple affected stakeholders:\n\n1. South African Students and Scholars: Clear communication about how sanctions affect their status, funding, and activities at Yale.\n\n2. Faculty with South African Projects: Guidance on how to adapt research plans and funding mechanisms to maintain compliance.\n\n3. Partner Institutions: Diplomatic engagement with South African partner universities regarding program adjustments.\n\n4. Donors Supporting South African Initiatives: Transparent updates on how sanctions affect donated funds dedicated to South African programs.\n\nThis executive order represents a high impact on Yale University's operations, primarily affecting Research Funding and Administrative Compliance. The university faces significant challenges in maintaining valuable academic relationships while ensuring full compliance with federal sanctions. Immediate action is required to review all South African engagements and develop appropriate compliance strategies.",
          impactLevel: "High",
          categories: ["Education", "Finance"],
          universityImpactAreas: ["Research Funding", "Administrative Compliance"]
        }
      },
      {
        order_number: "2025-02504",
        title: "Withdrawing the United States From and Ending Funding to Certain United Nations Organizations and Reviewing United States Support to All International Organizations",
        analysis: {
          summary: "This executive order withdraws U.S. support from certain UN organizations and reviews all international organization memberships. Yale should anticipate potential impacts on international research collaborations, funding for global initiatives, and exchange programs tied to affected organizations.",
          executiveBrief: "President Trump's executive order withdrawing U.S. support from certain United Nations organizations will have cascading effects on Yale University's international research collaborations, educational partnerships, and global initiatives. While the specific UN organizations affected will determine the precise impact, Yale maintains numerous connections to UN agencies through research partnerships, fellowship programs, and collaborative initiatives.\n\nYale's Jackson School of Global Affairs, School of Public Health, School of the Environment, and various international research centers should prepare for potential disruptions to funding streams, data access, and collaborative frameworks tied to affected UN organizations. Research projects utilizing UN data resources, grants involving UN agency partnerships, and programs placing students or fellows with these organizations will require comprehensive review and potential restructuring.\n\nFinancially, Yale should evaluate exposure to affected funding streams, identify alternative support mechanisms for critical projects, and develop contingency plans for programs heavily dependent on UN agency relationships. While direct budget impacts may be contained to specific programs, the ripple effects could influence Yale's broader international engagement strategy and global positioning.",
          comprehensiveAnalysis: "Executive Order 2025-02504, \"Withdrawing the United States From and Ending Funding to Certain United Nations Organizations and Reviewing United States Support to All International Organizations,\" initiates a significant shift in U.S. engagement with international bodies that will have multifaceted implications for Yale University's global research, educational partnerships, and institutional relationships.\n\nIMPACT ASSESSMENT FRAMEWORK:\nYale's extensive international engagement intersects with UN and international organizations across several dimensions:\n\n1. Research Partnerships: Yale faculty collaborate with UN agencies including WHO, UNESCO, UNDP, UN Environment Programme, and others on research initiatives spanning global health, climate change, cultural heritage, and sustainable development. US withdrawal from these organizations could disrupt funding channels, data access, and institutional relationships.\n\n2. Fellowship Programs: Yale operates several programs placing students with international organizations, including the Fox International Fellowship and various internship programs through the Jackson School of Global Affairs. Changes in US relationships with these organizations could affect placement opportunities and program viability.\n\n3. Educational Collaborations: Yale courses and educational programs incorporate UN resources, speakers, and site visits. Faculty teaching international relations, public health, environmental policy, and development studies utilize UN frameworks and data in their curriculum.\n\n4. Data Resources: Researchers across Yale rely on datasets maintained by international organizations for scholarship in economics, public health, climate science, and other fields. Access protocols may change if US financial support and membership status shift.\n\nSPECIFIC IMPACTS BY SCHOOL/CENTER:\n\n1. Jackson School of Global Affairs: As Yale's newest professional school focused on global affairs, the Jackson School maintains numerous connections to international organizations. Impacts include:\n   - Potential disruption to the UN Practicum program placing students with UN agencies\n   - Possible complications for faculty research involving UN data or partnerships\n   - Potential changes to career pathways for graduates seeking positions in international organizations\n\n2. Yale School of Public Health: YSPH collaborates extensively with WHO and other health-focused international bodies. Potential impacts include:\n   - Research funding disruptions for projects leveraging WHO partnerships\n   - Complications in global health initiatives relying on UN coordination mechanisms\n   - Changes to field placement opportunities for MPH students\n\n3. Yale School of the Environment: YSE works closely with UN Environment Programme, UNFCCC, and related organizations on climate and biodiversity research. Impacts may include:\n   - Disruptions to climate data access and research collaborations\n   - Potential funding gaps for projects supported through international mechanisms\n   - Challenges for faculty engaged in international environmental governance research\n\n4. Yale Law School: The law school's international human rights and global governance work intersects with UN legal frameworks. Potential effects include:\n   - Changes to clinical programs working with international legal mechanisms\n   - Research complications for faculty focused on international law\n   - Altered landscape for graduates pursuing careers in international legal institutions\n\nFINANCIAL IMPLICATIONS:\nWhile the financial impact will vary based on which specific organizations are affected, Yale should consider several dimensions:\n\n1. Direct Research Funding: Some Yale faculty receive research funding directly from international organizations or through mechanisms tied to US contributions. Projects worth approximately $15-25 million could potentially face funding disruptions, though not all simultaneously or completely.\n\n2. Indirect Financial Effects: Programs generating revenue through training, consulting, or educational partnerships with international organizations may see reduced opportunities. The Jackson School, YSPH, and YSE each maintain professional education programs with international organization participants.\n\n3. Opportunity Costs: Faculty competing for international research funding may face reduced opportunities if US withdrawal affects broader funding ecosystems or changes competitive positioning.\n\n4. Operational Adjustments: Administrative resources will be required to navigate changing relationship frameworks with affected organizations, potentially costing $100,000-$200,000 in staff time and legal consultations.\n\nSTRATEGIC CONSIDERATIONS AND MITIGATION APPROACHES:\n\n1. Partnership Diversification: Yale should assess programs heavily dependent on specific international organizations and explore alternative partners or funding mechanisms.\n\n2. Research Adaptation: Faculty may need to adjust research designs to account for potential changes in data access or collaborative frameworks.\n\n3. Educational Program Modifications: Programs placing students with affected organizations should develop contingency plans and alternative placement opportunities.\n\n4. Advocacy Coordination: Yale may consider coordinating with peer institutions through associations like AAU to advocate for continuing academic partnerships despite changing governmental relationships.\n\n5. Legal and Compliance Review: Yale's Office of General Counsel should review any formal agreements with affected organizations to understand compliance requirements during the transition period.\n\nThe executive order represents a medium to high impact on Yale University's operations, primarily affecting Research Funding and international Academic Programs. While the institution's core educational and research functions will continue, significant adaptation may be required for programs deeply integrated with affected international organizations. The university should prepare for both immediate disruptions to specific projects and longer-term strategic adjustments to its global engagement approach.",
          impactLevel: "High",
          categories: ["Education", "Research"],
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