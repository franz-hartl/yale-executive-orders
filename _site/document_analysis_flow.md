# Document Analysis Workflow

This document outlines the detailed process flow for analyzing documents against the Yale Executive Orders database.

## Overview

The document analysis process provides a systematic way to evaluate documents (such as research proposals, policies, or contracts) against relevant executive orders to ensure compliance and identify potential issues or requirements.

## Process Flow

### Step 1: Extract Key Terms from Document

The first step is to identify important terms and concepts in the document:

1. **Input**: Document text
2. **Process**: 
   - Remove stop words and punctuation
   - Identify frequently occurring terms
   - Extract key phrases and concepts
   - Recognize domain-specific terminology
3. **Output**: List of key terms ranked by relevance

```javascript
// Example term extraction
const extractedTerms = [
  "research security",
  "international collaboration",
  "federal funding",
  "data sharing",
  "sensitive information",
  "cybersecurity",
  "intellectual property"
];
```

### Step 2: Query Yale EO Data with Extracted Terms

Using the extracted terms, search for relevant executive orders:

1. **Input**: Extracted terms
2. **Process**:
   - Match terms against executive order content
   - Calculate relevance scores for each match
   - Sort results by relevance
3. **Output**: Ranked list of relevant executive orders

```javascript
// Example search results
const relevantOrders = [
  {
    "id": 5432,
    "order_number": "14110",
    "title": "Executive Order on Enhancing Research Security",
    "relevance_score": 4.85,
    // Other order details...
  },
  {
    "id": 5433,
    "order_number": "14087",
    "title": "Executive Order on Protection of Sensitive Research",
    "relevance_score": 3.72,
    // Other order details...
  }
];
```

### Step 3: Format Relevant EOs as Context

Prepare the executive order data in a format suitable for analysis:

1. **Input**: Relevant executive orders
2. **Process**:
   - Extract key sections from each order
   - Format with appropriate structure
   - Highlight Yale-specific guidance
3. **Output**: Formatted context for analysis

```
# EXECUTIVE ORDER 14110
Title: Executive Order on Enhancing Research Security
Signing Date: 2022-06-15
President: Biden
Impact Level: High

Summary: This order establishes new requirements for international research collaborations...

Core Impact: Significant implications for Yale's international research programs...

Yale Imperative: Yale must implement enhanced security reviews for international collaborations...

Categories: Science, Security
Impact Areas: Research, International
```

### Step 4: Generate Analysis

Analyze the document against the executive orders:

1. **Input**: Document text and formatted executive order context
2. **Process**:
   - Identify compliance requirements from executive orders
   - Compare document content against requirements
   - Assess potential issues or gaps
   - Determine Yale-specific implications
3. **Output**: Comprehensive analysis

### Step 5: Structure Results

Format the analysis in a clear, actionable structure:

1. **Executive Summary**: Brief overview of key findings
2. **Compliance Analysis**: Detailed analysis of compliance with each relevant executive order
3. **Potential Issues**: Specific areas of concern or non-compliance
4. **Recommendations**: Actionable steps to address issues
5. **Yale-Specific Considerations**: Implications specific to Yale University

## Example Analysis Format

```
# Document Analysis Report

## Executive Summary
This research proposal involves international collaborations and handling of sensitive data, 
implicating Executive Orders 14110 and 14087 on research security. Several compliance issues
need to be addressed before proceeding.

## Compliance Analysis

### EO 14110: Enhancing Research Security
- **Compliance Status**: Partial
- **Requirements**: Enhanced vetting of international collaborators, data security protocols
- **Document Alignment**: The proposal mentions international partners but lacks specific 
  security protocols for data sharing

### EO 14087: Protection of Sensitive Research
- **Compliance Status**: Non-compliant
- **Requirements**: Implementation of cybersecurity measures for sensitive research data
- **Document Alignment**: No cybersecurity measures are specifically outlined

## Potential Issues
1. Insufficient vetting protocols for international partners
2. Lack of defined data security measures for sensitive information
3. Missing cybersecurity infrastructure specifications

## Recommendations
1. Develop specific security protocols for international collaborations
2. Implement Yale's data classification system for all shared information
3. Consult with Yale IT Security for appropriate cybersecurity measures
4. Add explicit section addressing compliance with EO 14110 and 14087

## Yale-Specific Considerations
- Office of International Affairs should review all international partnerships
- Research security training required for all project personnel
- Proposal must align with Yale's Research Data Security Assessment procedures
```

## Implementation in Different Clients

### Claude Terminal Client

When using Claude to analyze documents, the workflow typically includes:

1. Submit document text to Claude
2. Claude extracts key terms from the document
3. Claude retrieves relevant executive orders (using provided context)
4. Claude generates the analysis report
5. Report is returned to the user

Example Claude prompt:

```
I need to analyze this research proposal against relevant executive orders:

[RESEARCH PROPOSAL TEXT]

Please:
1. Extract key terms from this proposal
2. Identify relevant executive orders from the Yale database
3. Analyze potential compliance issues or requirements
4. Provide recommendations for ensuring the proposal meets all requirements
```

### Web Application Client

For web-based implementations:

1. User uploads or pastes document text
2. Application sends document to `/mcp/extract-terms` endpoint
3. Application uses returned terms to query `/mcp/search`
4. Application retrieves detailed information with `/mcp/context`
5. Application displays formatted analysis to user

### Programmatic Client

For programmatic use:

1. Call client library's `analyzeDocument()` method
2. Library handles term extraction, search, and analysis
3. Return structured analysis object for further processing

## Best Practices

1. **Privacy**: Process documents client-side whenever possible
2. **Performance**: Cache executive order data to minimize API calls
3. **Accuracy**: Use multiple terms for searching to improve relevance
4. **Actionability**: Always provide specific recommendations
5. **Yale Specificity**: Include Yale-specific guidance from the executive orders

## Additional Resources

- API reference: See `/docs/data/api_description.json`
- Client implementation examples: See `/docs/api-client-guide.md`
- MCP Client guide: See `/MODEL_CONTEXT_PROTOCOL_CLIENTS.md`