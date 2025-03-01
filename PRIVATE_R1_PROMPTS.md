# Private R1 AI Prompt and Analysis Refinement

## Overview

This document outlines Phase 2 of the refocusing effort to shift our executive order analysis system toward a private R1 institution focus. Phase 2 has specifically modified our AI prompting system and analysis output formats to ensure all generated content is tailored to the specific needs, challenges, and contexts of private research universities.

## Key Changes Implemented

### 1. AI System Prompt Modification

The system prompt for Claude has been completely rewritten to instruct the AI to analyze executive orders specifically from a private R1 perspective:

```
You are an expert in private R1 research university administration with specialized expertise in policy domains relevant to research-intensive private universities. You have deep expertise in how federal policies specifically affect private research universities with very high research activity, substantial endowments, and significant international presence.
```

The expertise areas in the system prompt have been recalibrated to emphasize:
- Research Funding & Security 
- Advanced Research Programs
- International Collaboration
- Endowment Management
- Graduate Education

### 2. Analysis Request Refinement

The main prompt for analysis now explicitly directs the AI to:
- Focus entirely on private R1 research university implications
- Consider the unique characteristics of these institutions
- Structure all analyses with R1-specific sections and concerns

We've added explicit context reminders about what makes private R1s unique:
```
Focus on their unique characteristics:
- Very high research activity (annual research expenditures >$100M)
- Substantial endowments
- Significant international presence
- Strong graduate and professional programs
- Extensive research infrastructure
```

### 3. JSON Structure Overhaul

The JSON structure for all three analysis levels has been completely redesigned:

#### Executive Brief
- Now contains a clear "Private R1 Focus" marker
- Simplified to focus exclusively on private R1 implications

#### Standard Summary
- Replaced institution comparison matrix with a single R1 impact rating
- Added dedicated "Research Implications" section
- All implementation steps now specifically for R1 context

#### Comprehensive Analysis
- Added specialized "Research Impact Analysis" with 5 key dimensions:
  - Research Security
  - International Collaboration
  - Funding Implications
  - Compliance Burden
  - Competitive Position
- New "Specialized Analysis" section covering R1-specific concerns:
  - Research Competitiveness
  - Talent Acquisition
  - Institutional Autonomy
  - Financial Implications
  - Reputation Management
- Restructured implementation strategy into immediate/short-term/long-term phases
- Enhanced risk analysis specifically for research operations

### 4. HTML Template Updates

All HTML templates for rendering the analyses have been redesigned:
- Clear "PRIVATE R1 UNIVERSITY ANALYSIS" headers
- Visual design that emphasizes research-specific sections
- Modified color schemes to draw attention to R1-relevant content
- Removed multi-institution comparison sections

### 5. Prioritization System for Reanalysis

Created a new script (`regenerate_r1_summaries.js`) that:
- Identifies executive orders most relevant to private R1s
- Prioritizes orders with "Critical" or "High" impact levels
- Focuses on those affecting research, international collaboration, etc.
- Regenerates analyses using the new R1-focused prompts

## Implementation Details

### Files Modified:
- `generate_plain_summaries.js`: Updated prompt system and templates
- `regenerate_r1_summaries.js`: New script for targeted reanalysis

### Additional Changes:
- Added module exports to allow function reuse between scripts
- Enhanced error handling for the regeneration process
- Added visual markers throughout the UI to emphasize R1 focus

## Using the New System

### Running the Standard Summary Generator

The main summary generator continues to work as before, but now produces R1-focused content:
```
node generate_plain_summaries.js
```

### Regenerating Existing High-Impact Analyses

To regenerate analyses for existing executive orders with high impact on R1s:
```
node regenerate_r1_summaries.js
```

This will:
1. Identify the 10 most relevant executive orders for R1s
2. Regenerate all three summary types with R1 focus
3. Replace the existing summaries in the database

## Technical Considerations

- All new R1-focused prompts maintain the same token limits to avoid cost increases
- Enhanced error handling for JSON parsing of complex responses
- Performance optimization to reduce redundant API calls

## Future Enhancements

Upcoming improvements to the AI prompting system:
- Further refinement of research security analysis sections
- Enhanced endowment management implications
- Additional customization for different private R1 subtypes (e.g., medical vs. non-medical)
- Integration with external sources specific to private R1 concerns