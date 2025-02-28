# External Source Attribution System

This document outlines the attribution system for integrating external sources into the Yale Executive Orders Analysis platform. Proper attribution ensures transparency, enhances credibility, and acknowledges the valuable contributions of authoritative sources.

## Attribution System Overview

The attribution system has been designed with several key components:

1. **Database Schema Extensions** - Tracking source metadata and attributions
2. **Visual Indicators** - Clearly identifying external sources in the user interface
3. **Citation Standards** - Consistent format for crediting external sources
4. **Filter Capabilities** - Allowing users to view analyses by source

## Database Schema Components

The attribution system leverages two primary database tables:

### 1. `source_metadata` Table

This table stores information about each external source:

| Column | Description |
|--------|-------------|
| `id` | Unique identifier for the source |
| `source_name` | Full name of the organization (e.g., "Council on Governmental Relations") |
| `source_url` | URL to the organization's website |
| `last_updated` | When source data was last retrieved |
| `fetch_frequency` | How often the source is checked for updates |
| `description` | Description of the source's focus and relevance |

### 2. `order_sources` Table

This table maps executive orders to their external sources:

| Column | Description |
|--------|-------------|
| `order_id` | References the executive_orders table |
| `source_id` | References the source_metadata table |
| `external_reference_id` | Source-specific identifier for cross-referencing |
| `source_specific_data` | JSON blob containing source-specific analysis |
| `fetch_date` | Date when this specific data was retrieved |

The `source_specific_data` field contains:
- Source-specific analysis text
- Attribution statements
- Citation information
- Any additional metadata relevant to the source

## Visual Attribution Implementation

The user interface includes several components for clearly identifying external sources:

### 1. Source Badges

Source badges appear throughout the interface:

- Each external source has a distinctive badge with:
  - Unique color coding (COGR: blue, NSF: green, NIH: orange, ACE: purple)
  - Standardized name format
  - Consistent placement next to relevant content

Example badge markup:
```html
<span class="source-badge source-cogr">COGR</span>
```

### 2. Multi-Source Indicators

When analyses incorporate multiple sources:

- A numeric indicator shows the number of sources (e.g., "+3")
- Hovering reveals all contributing sources
- A "View Sources" button provides detailed attribution information

### 3. Source Tabs in Analysis View

The detailed view of executive orders includes:

- A tab interface with source-specific content
- Each source has its own tab with distinctive styling
- The source's analysis is presented with clear attribution

### 4. Attribution Footer

Each analysis includes an attribution footer with:

- List of all contributing sources
- Retrieval date(s)
- Links to original source materials where available

Standard attribution format:
```
Analysis incorporates data from: [Source 1], [Source 2], and [Source 3] (retrieved on [date])
```

## Source Filtering System

The platform allows users to filter content by source:

1. **Source Filter Pills** - Quick toggles to show/hide content from specific sources
2. **Advanced Filtering** - Combined filtering by source, category, and impact area
3. **Search Integration** - Ability to search within specific source's analyses
4. **Favorites/Bookmarks** - Users can save preferred sources for quick access

## Citation Standards

When displaying content from external sources, the following citation standards are applied:

### Short-form citation (used in badges and brief mentions):
```
[Organization Acronym]
```

### Standard citation (used in attribution footers):
```
[Organization Name]. ([Year]). [Document Title]. Retrieved on [Date] from [URL]
```

### Academic citation (available for export):
```
[Organization Name]. ([Year, Month Day]). [Document Title]. [Publication/Website Name]. [URL]
```

## Technical Implementation Notes

The attribution system is implemented through:

1. Database triggers that ensure every analysis from an external source is properly attributed
2. JSON structure for `source_specific_data` that standardizes attribution fields
3. UI components that visually distinguish different sources
4. Export formats that maintain attribution through various data transformations

## Future Enhancements

The attribution system is designed for future expansion:

1. **Machine-readable citations** - Adding structured data formats (e.g., BibTeX, RIS)
2. **Citation export** - Allowing users to export citations in various academic formats
3. **Attribution analytics** - Tracking which sources are most frequently referenced
4. **Source verification** - Adding digital signatures to verify source authenticity
5. **Automated attribution** - Using NLP to detect and attribute source content

## Integration with Static Site Generation

The attribution system integrates with the static site generation process:

1. Source attribution data is included in the JSON export
2. Frontend templates render attribution badges and footers from this data
3. Source filter functionality works client-side using the exported attribution data
4. Source metadata is included in the system information export

This ensures that attribution is maintained even in the static GitHub Pages deployment.