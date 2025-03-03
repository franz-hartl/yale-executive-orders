/**
 * extractor_example.js
 * 
 * Example script to demonstrate how to use the knowledge extractor with
 * an executive order sample.
 */

const { KnowledgeExtractor } = require('../extraction/knowledge_extractor');
const logger = require('../utils/logger');

// Set log level to DEBUG to see more details
logger.setLogLevel('DEBUG');

// Sample executive order text (shortened example)
const sampleExecutiveOrder = {
  sourceId: 'eo12345',
  sourceName: 'Executive Order 12345',
  order_number: '12345',
  title: 'Promoting Excellence in Higher Education',
  president: 'Sample President',
  signing_date: '2023-03-01',
  publication_date: '2023-03-02',
  url: 'https://example.gov/eo12345',
  full_text: `
    By the authority vested in me as President by the Constitution and the laws of the United States of America, including the Higher Education Act of 1965 (20 U.S.C. 1001 et seq.), and in order to promote excellence in higher education, it is hereby ordered as follows:

    Section 1. Purpose. This order aims to strengthen America's higher education system by promoting innovation, research, and international collaboration.

    Sec. 2. Definitions. For purposes of this order:
    (a) "Higher education institution" means an educational institution that:
      (i) admits students who have completed secondary education;
      (ii) is legally authorized to provide educational programs beyond secondary education; and
      (iii) awards academic degrees, certificates, or diplomas beyond the secondary level.
    
    (b) "Research collaboration" means a cooperative arrangement between institutions, researchers, or faculty members to conduct scientific, scholarly, or academic research.
    
    Section 3. Policy. It is the policy of the United States to foster excellence in higher education by:
    (a) Promoting innovative teaching and learning methods;
    (b) Supporting world-class research at American institutions;
    (c) Encouraging international academic collaboration; and
    (d) Ensuring access to quality higher education for all Americans.
    
    Sec. 4. Implementation. (a) The Secretary of Education shall, within 90 days of this order, develop a strategic plan to implement the policies described in Section 3.
    
    (b) The Director of the Office of Science and Technology Policy shall coordinate with the Secretary of Education to identify opportunities for promoting research excellence.
    
    (c) The Secretary of State, in consultation with the Secretary of Education, shall work to strengthen international academic partnerships.
    
    Sec. 5. Annual Report. The Secretary of Education shall report annually to the President, beginning one year after the date of this order, on progress made in implementing this order.
    
    Sec. 6. General Provisions. (a) Nothing in this order shall be construed to impair or otherwise affect:
      (i) the authority granted by law to an executive department or agency, or the head thereof; or
      (ii) the functions of the Director of the Office of Management and Budget relating to budgetary, administrative, or legislative proposals.
    
    (b) This order shall be implemented consistent with applicable law and subject to the availability of appropriations.
    
    (c) This order is not intended to, and does not, create any right or benefit, substantive or procedural, enforceable at law or in equity by any party against the United States, its departments, agencies, or entities, its officers, employees, or agents, or any other person.
    
    IN WITNESS WHEREOF, I have hereunto set my hand this first day of March, in the year of our Lord two thousand twenty-three, and of the Independence of the United States of America the two hundred and forty-seventh.
  `
};

/**
 * Run the example extraction
 */
async function runExample() {
  try {
    // Create knowledge extractor
    const extractor = new KnowledgeExtractor();
    
    logger.info('Extracting knowledge from sample executive order...');
    
    // Extract all knowledge types
    const extractedKnowledge = await extractor.extractAll(sampleExecutiveOrder);
    
    // Log results
    logger.info(`Extraction complete with overall confidence: ${extractedKnowledge.sourceAnalysis.overallConfidence.toFixed(2)}`);
    
    // Log knowledge counts by type
    logger.info('Extracted knowledge items:');
    logger.info(` - Dates: ${extractedKnowledge.dates?.length || 0}`);
    logger.info(` - Requirements: ${extractedKnowledge.requirements?.length || 0}`);
    logger.info(` - Impacts: ${extractedKnowledge.impacts?.length || 0}`);
    logger.info(` - Entities: ${extractedKnowledge.entities?.length || 0}`);
    logger.info(` - Definitions: ${extractedKnowledge.definitions?.length || 0}`);
    logger.info(` - Authorities: ${extractedKnowledge.authorities?.length || 0}`);
    
    // Output the first few items of each type as examples
    if (extractedKnowledge.dates?.length > 0) {
      console.log('\nSample Dates:');
      extractedKnowledge.dates.slice(0, 2).forEach(date => {
        console.log(` - Type: ${date.dateType}, Date: ${date.date}, Description: ${date.description}`);
      });
    }
    
    if (extractedKnowledge.requirements?.length > 0) {
      console.log('\nSample Requirements:');
      extractedKnowledge.requirements.slice(0, 2).forEach(req => {
        console.log(` - Type: ${req.requirementType}, Description: ${req.description.substring(0, 100)}...`);
      });
    }
    
    if (extractedKnowledge.entities?.length > 0) {
      console.log('\nSample Entities:');
      extractedKnowledge.entities.slice(0, 2).forEach(entity => {
        console.log(` - Type: ${entity.entityType}, Name: ${entity.name}`);
      });
    }
    
    if (extractedKnowledge.definitions?.length > 0) {
      console.log('\nSample Definitions:');
      extractedKnowledge.definitions.slice(0, 2).forEach(def => {
        console.log(` - Term: "${def.term}", Definition: ${def.definition.substring(0, 100)}...`);
      });
    }
    
    if (extractedKnowledge.authorities?.length > 0) {
      console.log('\nSample Authorities:');
      extractedKnowledge.authorities.slice(0, 2).forEach(auth => {
        console.log(` - Type: ${auth.authorityType}, Citation: ${auth.citation}`);
      });
    }
    
    // Save the full extracted knowledge to a JSON file for examination
    const fs = require('fs');
    fs.writeFileSync(
      'extracted_knowledge_sample.json', 
      JSON.stringify(extractedKnowledge, null, 2)
    );
    logger.info('Saved complete extraction results to extracted_knowledge_sample.json');
    
  } catch (error) {
    logger.error(`Error running example: ${error.message}`);
    logger.error(error.stack);
  }
}

// Run the example
runExample().then(() => {
  logger.info('Example completed');
});