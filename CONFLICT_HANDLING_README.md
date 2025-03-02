# Conflict Handling System for Yale Executive Orders

## Overview

The Conflict Handling System is designed to identify, track, and resolve conflicting information from different sources about executive orders. When multiple sources provide contradictory information (e.g., different effective dates, different requirements), this system helps administrators identify and resolve these conflicts.

## Key Features

- **Conflict Detection**: Automatically identifies conflicts between facts from different sources
- **Severity Classification**: Assigns severity levels to conflicts based on their potential impact
- **Automatic Resolution**: Resolves low-severity conflicts using configurable rules
- **Manual Resolution Interface**: Records and tracks human decisions for conflict resolution
- **Source Prioritization**: Applies institutional knowledge about source reliability
- **Historical Tracking**: Maintains a record of all identified conflicts and resolutions

## System Components

### Core Files

- **models/conflict_record.js**: Data model for storing conflict information
- **resolution/conflict_detector.js**: Core conflict detection functionality
- **resolution/resolution_strategies.js**: Resolution rules and strategies
- **setup_conflict_handling.js**: Setup script to initialize the conflict system
- **conflict_handling_example.js**: Example usage of the conflict system

### Database Tables

- **conflict_records**: Stores information about detected conflicts and their resolution status

## Types of Conflicts Detected

The system currently detects the following types of conflicts:

- **DATE**: Conflicts between date information (e.g., different effective dates)
- **REQUIREMENT**: Conflicts between requirements (e.g., different deadlines, different priorities)
- **IMPACT**: Conflicts in impact assessment (e.g., different severity levels)
- **STATUS**: Conflicts about order status (e.g., active vs. revoked)
- **GUIDANCE**: Conflicts in implementation guidance from different sources

## Conflict Severity Levels

Conflicts are classified into three severity levels:

- **HIGH**: Critical conflicts that significantly affect interpretation (e.g., different effective dates)
- **MEDIUM**: Important conflicts that should be reviewed (e.g., different requirement priorities)
- **LOW**: Minor conflicts that can be automatically resolved (e.g., small text differences)

## Resolution Strategies

The system uses the following strategies to automatically resolve conflicts:

1. **Source Priority**: Prefers information from more authoritative sources
2. **Recency**: Prefers more recently extracted information
3. **Confidence**: Prefers information with higher confidence scores
4. **Newest Source**: Prefers information from more recently updated sources

## Source Priority Hierarchy

The system uses a configurable priority hierarchy for sources:

```
Federal Register: 10 (highest)
White House: 9
Department of Justice: 8
NIH/NSF: 7
COGR: 6
ACE: 5
Yale Analysis: 4
```

This hierarchy can be customized in `resolution_strategies.js` based on institutional preferences.

## Usage Examples

### Detecting Conflicts

```javascript
const ConflictDetector = require('./resolution/conflict_detector');

// Initialize conflict detector
const conflictDetector = new ConflictDetector();
await conflictDetector.initialize();

// Detect conflicts for a specific order
const orderId = 123;
const conflicts = await conflictDetector.detectConflicts(orderId);

console.log(`Detected ${conflicts.length} conflicts`);
```

### Getting Unresolved Conflicts

```javascript
// Get unresolved conflicts
const unresolvedConflicts = await conflictDetector.getUnresolvedConflicts();

// Display conflicts
for (const conflict of unresolvedConflicts) {
  console.log(`Conflict #${conflict.id}: ${conflict.conflictType} (${conflict.severity})`);
}
```

### Manually Resolving a Conflict

```javascript
// Manually resolve a conflict
const resolution = await conflictDetector.resolveConflict(conflictId, {
  selectedFactId: factId, // ID of the fact to accept
  notes: 'Selected based on consultation with legal department',
  by: 'Jane Doe'
});

console.log(`Conflict resolved with status: ${resolution.status}`);
```

### Flagging a Conflict for Special Attention

```javascript
// Flag a conflict for special attention
await conflictDetector.flagConflict(conflictId, 
  'Requires consultation with General Counsel'
);
```

## Integration with Knowledge System

The Conflict Handling System integrates with the Knowledge Representation System:

1. **Fact Retrieval**: Uses the Knowledge System to retrieve fact information
2. **Source Attribution**: Leverages source attribution from the Knowledge System
3. **Automatic Updates**: Runs conflict detection when new facts are added

## Setting Up the System

To set up the Conflict Handling System:

1. Run the setup script to create the necessary tables:
   ```
   node setup_conflict_handling.js
   ```

2. To create a sample conflict for testing:
   ```
   node setup_conflict_handling.js --with-sample
   ```

3. To see an example of the system in action:
   ```
   node conflict_handling_example.js
   ```

## Design Principles

The Conflict Handling System follows several key design principles:

1. **Transparency**: All conflict detections and resolutions are recorded and traceable
2. **Prioritization**: Conflicts are prioritized by severity and relevance
3. **Rule-Based**: Resolution follows clear, explainable rules
4. **Human-in-the-Loop**: Critical conflicts require human review
5. **System-of-Record**: Creates a permanent record of conflict resolutions

## Future Extensions

The current implementation provides a foundation that can be extended in several ways:

1. **More Sophisticated Detection**: Enhanced algorithms for detecting subtle conflicts
2. **Custom Resolution Rules**: Institution-specific rules for automatic resolution
3. **User Interface**: Web interface for reviewing and resolving conflicts
4. **Notification System**: Email alerts for critical conflicts
5. **Integration with AI**: Using AI to recommend conflict resolutions

## Yale-Specific Considerations

For Yale University, the system has been tailored to:

1. **Source Hierarchy**: Prioritize sources most relevant to Yale's context
2. **University Impact**: Highlight conflicts affecting Yale-specific impact areas
3. **Departmental Routing**: Support for routing conflicts to relevant Yale departments
4. **Compliance Focus**: Emphasis on conflicts related to compliance requirements
5. **Research Perspective**: Special attention to conflicts affecting research operations