# External Data Sources Integration

This document describes the integration of external authoritative sources into the Yale Executive Orders Analysis system.

## Overview

The system integrates data from key external sources to enhance the analysis of executive orders and their impact on higher education institutions. These sources provide specialized insights and guidance that complement our own analysis.

## Implemented Sources

### 1. COGR Executive Order Tracker

**Status:** Implemented (Phase 1)

The Council on Governmental Relations (COGR) maintains a tracker of executive orders relevant to research universities. This implementation:

- Searches the COGR resources page for PDF documents related to executive orders
- Downloads and stores PDFs with timestamps for versioning
- Extracts text content for further analysis
- Maintains detailed fetch logs for audit and troubleshooting

**Implementation Details:**
- Located in `fetch_external_sources.js` in the `fetchCOGRTracker()` function
- PDF files are stored in `external_sources/cogr/` directory
- Text extraction uses the `pdf-parse` library
- Includes fallback to a sample file for testing when live data isn't available

**Usage:**
```bash
npm run fetch:external
```

### 2. NSF Implementation Pages

**Status:** Implemented (Phase 2)

This integration extracts information about how NSF implements executive orders in their grant processes:

- Fetches content from multiple NSF policy pages
- Identifies executive order references in both links and content
- Extracts implementation context and associates it with specific EOs
- Augments existing executive orders with NSF-specific implementation details
- Automatically categorizes items with Research & Science Policy category

**Implementation Details:**
- Located in `fetch_external_sources.js` in the `fetchNSFImplementation()` function
- Uses regex pattern matching to identify references to specific executive orders
- Extracts surrounding context to provide implementation details
- Links NSF guidance to existing executive orders in the database

**Testing:**
```bash
node test_nsf_fetch.js
```

### 3. NIH Policy Notices

**Status:** Implemented (Phase 3)

This integration extracts NIH notices about executive order implementation in biomedical research:

- Scans NIH grants policy pages and notice archives
- Identifies policy notices related to executive orders using notice ID patterns (NOT-OD-XX-XXX)
- Extracts notice metadata (ID, title, date) and EO references
- Automatically associates notices with Healthcare and Research categories
- Links NIH-specific guidance to existing executive orders in the database

**Implementation Details:**
- Located in `fetch_external_sources.js` in the `fetchNIHPolicyNotices()` function
- Uses pattern matching to identify NIH notice IDs and executive order references
- Extracts contextual information to provide implementation guidance
- Includes sample data generation via `createSampleNIHData()`
- Store files in `external_sources/nih/` directory

**Usage:**
```bash
npm run fetch:external
```

### 4. ACE Policy Briefs

**Status:** Planned (Phase 3)

This integration will extract American Council on Education policy briefs:

- Will download policy briefs and analyses from ACE related to executive orders
- Will extract sector-wide impact assessments produced by ACE
- Will identify implementation guidance specific to higher education institutions
- Will follow similar approach to COGR and NSF data integration

## Source Integration Architecture

The system follows a consistent pattern for all data sources:

1. **Fetch**: Retrieves data from external source
2. **Extract**: Parses and extracts relevant content
3. **Store**: Saves original content and extracted data with timestamps
4. **Log**: Records detailed fetch information for auditing
5. **Process**: Integrates extracted data into the system database

## Database Schema

External source data is tracked in two tables:

### source_metadata
- `id`: Primary key
- `source_name`: Name of the external source
- `source_url`: URL of the source
- `last_updated`: Timestamp of last successful fetch
- `fetch_frequency`: How often the source should be updated
- `description`: Description of the source

### order_sources
- `order_id`: FK to executive_orders
- `source_id`: FK to source_metadata
- `external_reference_id`: Source's ID for this order
- `source_specific_data`: JSON of source-specific metadata
- `fetch_date`: When this association was created

## Next Steps

1. **Enhance COGR integration (Phase 2)**: Parse extracted text to identify specific executive orders and extract structured data
2. **Improve NSF integration (Phase 2)**: Fix URL handling and enhance pattern matching for more accurate EO detection
3. **Enhance NIH integration (Phase 3)**: Add pagination to scan more notice archives and improve date extraction
4. **Implement ACE source integration (Phase 3)**: Extract relevant ACE policy briefs following a similar approach
5. **Add comprehensive integration tests**: Ensure reliable functioning with mock responses and sample data 
6. **Create unified data access layer**: Develop API endpoints to expose the combined data from multiple sources
7. **Extend NIH notice parser**: Improve categorization of NIH notices based on content analysis