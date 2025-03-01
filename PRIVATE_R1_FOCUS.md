# Private R1 Institution Focus

## Overview

This document outlines the refocused approach of the Yale Executive Orders Analysis tool to prioritize Private R1 research universities. This strategic refocus aims to create a more targeted, specialized tool that delivers higher value to its primary audience while maintaining compatibility with the broader schema structure.

## Key Changes in Phase 1

### 1. Schema and Taxonomy Adjustments

The database schema retains its comprehensive structure but has been refocused to prioritize Private R1 institutions:

- **Institution Types**: Reorganized with "Private R1 Universities" as the highest priority
- **Impact Areas**: Redefined to highlight research-intensive university concerns:
  - Research Funding & Security
  - Advanced Research Programs
  - International Collaboration
  - Endowment Management
  - Graduate Education
  - Public-Private Partnerships
  - Administrative Compliance

### 2. Default Prioritization

- Data export functions now prioritize Private R1 institutions in all displays
- Non-R1 institution types remain in the database but receive lower priority in the UI
- Search and filter capabilities maintain access to all institution types

### 3. User Interface Implications

- Default views will show Private R1 impact analysis first
- Secondary institution types can still be accessed through filtering
- Specialized R1-focused impact scores and compliance timelines are emphasized

## Technical Implementation Details

### Modified Files

- `university_impact_areas.json`: Updated impact areas to focus on research-intensive institutions
- `database_setup.js`: Modified institution type priorities and descriptions
- `export_to_json.js`: Added prioritization logic for Private R1 institutions
  - Enhanced impact analysis generation with priority flags
  - Modified institution guidance to default to Private R1s
  - Updated system metadata to reflect the specialized focus

### Default Values

- Default institution type: "Private R1 Universities"
- Priority impact areas are flagged with `isPriority: true`
- System version updated to 1.3.0 to reflect the Private R1 focus

## Future Phases

This initial refocusing represents Phase 1 of a multi-phase approach. Future phases will include:

1. **Phase 2**: Enhanced Private R1 UI Elements
   - Custom UI components for R1-specific analysis
   - Visual differentiation of priority impact areas

2. **Phase 3**: Specialized Data Integration
   - Integration with R1-specific external data sources
   - Enhanced analytics for research-intensive institutions

3. **Phase 4**: Advanced Compliance Tools
   - Specialized compliance workflows for Private R1 universities
   - Customized implementation guidance for research institutions

## Maintaining Compatibility

While refocusing on Private R1 institutions, the system maintains compatibility with the broader higher education sector:

- All institution types remain in the database
- Filter functionality allows access to any institution type
- The data schema preserves all fields needed for comprehensive analysis
- Analysis for non-R1 institutions continues to be generated but at lower priority

This approach ensures the tool delivers specialized value to its primary audience while remaining flexible enough to serve other institution types when needed.