# External Source Integration Framework

This document outlines the integration of external authoritative sources into the Yale Executive Orders Analysis system as part of Phase 3 of the project expansion. By incorporating data from key higher education policy organizations, we enhance the comprehensiveness and credibility of our executive order analysis.

## Sources and Integration Strategy

The system integrates data from four primary sources:

### 1. COGR Executive Order Tracker

**Source Details:**
- **Organization:** Council on Governmental Relations
- **URL:** https://www.cogr.edu/cogr-resources
- **Format:** PDF document updated periodically
- **Focus:** Comprehensive list of executive orders with analysis of impacts on research institutions
- **Update Frequency:** Monthly

**Integration Method:**
- Web scraping to locate the latest tracker PDF
- PDF text extraction and parsing
- Data normalization to match database schema

**Database Mapping:**
- COGR EO number → `order_number`
- COGR title → `title`
- COGR date → `signing_date`
- COGR analysis → supplements `summary`
- COGR status information → `status`
- Source tracking in `order_sources` table with `source_specific_data` capturing COGR-specific analysis

### 2. NSF Implementation Pages

**Source Details:**
- **Organization:** National Science Foundation
- **URL:** https://www.nsf.gov/news/policies_and_procedures/
- **Format:** HTML pages with implementation details
- **Focus:** Specific guidance on how executive orders affect NSF grant procedures
- **Update Frequency:** Bi-weekly

**Integration Method:**
- Web scraping to identify EO implementation pages
- HTML parsing to extract relevant information
- Cross-reference with existing executive orders

**Database Mapping:**
- Reference to EO number → linked to existing `order_number`
- NSF-specific implementation details → `source_specific_data` in JSON format
- Impact categorization → supplements `university_impact_areas` with focus on "Research Funding & Science Policy"

### 3. NIH Policy Notices

**Source Details:**
- **Organization:** National Institutes of Health
- **URL:** https://grants.nih.gov/policy/index.htm
- **Format:** Policy notices and guidance documents
- **Focus:** How executive orders affect NIH grant administration
- **Update Frequency:** Bi-weekly

**Integration Method:**
- API or web scraping to extract policy notices
- Filtering for executive order references
- Text analysis to extract key implementation details

**Database Mapping:**
- NIH notice number → `external_reference_id`
- Policy details → `source_specific_data` in JSON format
- Health research impacts → supplements categorization in `categories` and `university_impact_areas`

### 4. ACE Policy Briefs

**Source Details:**
- **Organization:** American Council on Education
- **URL:** https://www.acenet.edu/Policy-Advocacy/Pages/default.aspx
- **Format:** HTML pages, PDFs, and press releases
- **Focus:** Higher education sector-wide analysis of executive order impacts
- **Update Frequency:** Monthly

**Integration Method:**
- Web scraping to identify relevant policy briefs
- Text extraction and analysis
- Cross-reference with existing executive orders

**Database Mapping:**
- Brief publication date → supplements `signing_date` with publication context
- Sector-wide analysis → enhances `comprehensive_analysis`
- Policy recommendations → supplements action plans in summaries
- Cross-institutional examples → supports sector-wide perspective

## Database Schema Extensions

To support external source integration, the database schema has been extended with two new tables:

### 1. `source_metadata`

Tracks information about each external source:

| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER | Primary key |
| source_name | TEXT | Name of the source organization |
| source_url | TEXT | Base URL for the source |
| last_updated | TEXT | Timestamp of last successful fetch |
| fetch_frequency | TEXT | How often the source should be checked |
| description | TEXT | Description of the source and its focus |

### 2. `order_sources`

Maps executive orders to their external sources with additional metadata:

| Column | Type | Description |
|--------|------|-------------|
| order_id | INTEGER | References executive_orders(id) |
| source_id | INTEGER | References source_metadata(id) |
| external_reference_id | TEXT | Source-specific identifier (e.g., NIH notice number) |
| source_specific_data | TEXT | JSON blob with source-specific analysis |
| fetch_date | TEXT | When this specific data was fetched |

## Integration Process

The integration process follows these steps:

1. **Setup:** Create necessary database tables and initialize source metadata
2. **Fetch:** Retrieve data from each external source using appropriate methods
3. **Parse:** Extract relevant executive order information from source data
4. **Match:** Determine if orders already exist in our database
5. **Merge:** Combine existing data with new source data, preserving attribution
6. **Store:** Save integrated data with source references

## Usage in the Application

When displaying executive orders in the application:

1. The frontend can show source attribution badges
2. Source-specific analysis can be presented in dedicated tabs
3. The "View Sources" option can display all contributing sources with links
4. Agency-specific implementation details can be highlighted when relevant

## Next Steps

The current implementation provides the framework for external source integration. Future enhancements will include:

1. Implementing full source-specific parsers for each data source
2. Adding automated scheduled fetching based on source frequency
3. Developing source conflict resolution strategies
4. Creating a source quality assessment system
5. Implementing source citation displays in the frontend