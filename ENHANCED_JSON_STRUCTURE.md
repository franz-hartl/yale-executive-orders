# Enhanced JSON Export Structure

This document describes the enhanced JSON export with integrated source data implemented in Phase 5.

## Overview

The enhanced JSON export creates a rich, integrated data structure that intelligently combines information from multiple sources to provide added value. Instead of simply appending source information, the export now processes source data to create:

1. **Normalized Source Attribution** - Standardized metadata for each data source
2. **Combined Analysis Section** - Merged perspectives maintaining proper attribution
3. **Institution-Specific Guidance** - Tailored recommendations for different institution types
4. **Source-Aware Impact Analysis** - Impact assessments with attribution and consensus ratings

## New Data Structures

### 1. Normalized Source Attribution

```json
"sources": [
  {
    "name": "COGR Executive Order Tracker",
    "abbreviation": "COGR",
    "url": "https://www.cogr.edu/cogr-resources",
    "reference_id": "EO-14110",
    "fetch_date": "2024-02-15",
    "data": { /* Source-specific parsed data */ }
  },
  {
    "name": "NIH Policy Notices",
    "abbreviation": "NIH",
    "url": "https://grants.nih.gov/policy/index.htm",
    "reference_id": "NOT-OD-24-086",
    "fetch_date": "2024-02-20",
    "data": { /* Source-specific parsed data */ }
  }
]
```

### 2. Combined Analysis Section

```json
"integrated_analysis": {
  "summary": "Base summary from primary record",
  "extended_analysis": "Comprehensive analysis from primary record",
  "source_contributions": {
    "COGR": {
      "text": "COGR's analysis of the order...",
      "url": "https://www.cogr.edu/eo-14110"
    },
    "NIH": {
      "text": "NIH's implementation notes...",
      "url": "https://grants.nih.gov/notice/NOT-OD-24-086"
    }
  },
  "key_perspectives": [
    {
      "source": "COGR",
      "summary": "Shortened version of COGR's analysis...",
      "full_text": "Complete analysis from COGR...",
      "url": "https://www.cogr.edu/eo-14110"
    }
  ]
}
```

### 3. Institution-Specific Guidance

```json
"institution_specific_guidance": {
  "R1 Research Universities": {
    "relevance_score": 8,
    "action_items": [
      {
        "title": "Update AI research protocols",
        "description": "Implement new security measures for AI research",
        "deadline": "2024-06-30",
        "source": "COGR, NSF"
      }
    ],
    "exemptions": [
      {
        "source": "NIH",
        "description": "Exemption noted in NIH Notice NOT-OD-24-086"
      }
    ],
    "source_considerations": {
      "COGR": [
        {
          "title": "Implementation Reference",
          "guidance": "Specific guidance for R1 institutions...",
          "url": "https://www.cogr.edu/eo-14110"
        }
      ]
    }
  },
  "Community Colleges": {
    "relevance_score": 3,
    /* Similar structure as above */
  }
}
```

### 4. Source-Aware Impact Analysis

```json
"source_aware_impact_analysis": {
  "Research Funding & Science Policy": {
    "description": "Impact on federal research grants...",
    "notes": "Additional context from primary record",
    "source_insights": {
      "COGR": {
        "impact": "Positive",
        "description": "COGR's assessment of research impact",
        "url": "https://www.cogr.edu/eo-14110"
      },
      "NIH": {
        "impact": "Neutral",
        "description": "NIH's assessment of research impact",
        "url": "https://grants.nih.gov/notice/NOT-OD-24-086"
      }
    },
    "consensus_rating": "Positive",
    "perspectives": [
      {
        "source": "COGR",
        "impact": "Positive",
        "insight": "COGR's assessment of research impact"
      },
      {
        "source": "NIH",
        "impact": "Neutral",
        "insight": "NIH's assessment of research impact"
      }
    ]
  }
}
```

## Integration Algorithms

The enhanced export uses several sophisticated algorithms to process source data:

### 1. Source Attribution Normalization

- Standardizes source names and adds abbreviations
- Ensures consistent format for all source metadata
- Preserves original data while adding convenient access attributes

### 2. Institution Guidance Generation

- Calculates relevance scores for each institution type based on impact and source data
- Aggregates action items from all sources with deduplication
- Identifies exemptions or special provisions for specific institution types
- Organizes source-specific guidance by source

### 3. Impact Analysis Integration

- Starts with base university impact areas from primary records
- Incorporates source-specific assessments for each impact area
- Calculates consensus ratings based on multiple perspectives
- Preserves individual source insights while providing integrated view

### 4. Combined Analysis Processing

- Merges analyses from multiple sources with clear attribution
- Extracts key perspectives for highlighted insights
- Maintains links to original source materials
- Provides both summary and full text options

## Benefits

This enhanced JSON structure transforms the exported data from a simple container into a value-added resource:

1. **Richer Context**: Users gain multiple perspectives on each executive order
2. **Intelligent Integration**: Source data is processed with business logic rather than simple concatenation
3. **Clear Attribution**: All perspectives maintain their source information
4. **Tailored Guidance**: Institution-specific recommendations derived from multiple sources
5. **Consensus Insights**: Areas of agreement and difference across sources are highlighted

## Usage Notes

- The new fields are additive - all existing fields remain available
- Source-specific raw data is still included for advanced use cases
- The integration process respects the integrity of each source while adding value through combination
- Relevance scores help users quickly assess priority by institution type