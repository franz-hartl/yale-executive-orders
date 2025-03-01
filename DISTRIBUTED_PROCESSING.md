# Distributed Processing for Yale Executive Orders

This document describes the resilient distributed processing approach for the Yale Executive Orders analysis system. This approach balances resilience with maintainability by standardizing job implementation while keeping processes distributed.

## Core Design Principles

1. **Distributed Resilience**: Individual processes can fail and recover independently
2. **Standardized Implementation**: Common code and patterns reduce duplication
3. **Clean Interfaces**: Well-defined inputs and outputs make components composable
4. **Robust Error Handling**: Each job handles errors independently
5. **Clean Restarts**: Jobs can be stopped and resumed without data loss

## System Components

### 1. Shared Utilities

Located in the `/utils` directory, these components provide common functionality:

- **db.js**: Database utilities for consistent database access
- **analysis.js**: Shared analysis functions and database update operations
- **logger.js**: Consistent logging framework with configurable levels

### 2. Job Templates

Located in the `/templates` directory, these provide standardized job structures:

- **analysis_job_template.js**: Template for creating analysis jobs with common structure

### 3. Analysis Jobs

Located in the `/analysis_jobs` directory, these implement specific analysis workflows:

- **ai_analysis_job.js**: Uses Claude AI to analyze executive orders
- **batch_analysis_job.js**: Processes orders with predefined analyses

## Job State Management

Each job maintains its state in a JSON file in the `/job_states` directory, enabling:

1. **Interrupted Job Recovery**: If a job is stopped prematurely, it can resume from where it left off
2. **Processing Tracking**: Each job tracks which items it has successfully processed
3. **Independent Progress**: Multiple jobs can run independently tracking their own progress

## Logging Framework

A consistent logging system captures operational information:

1. **Centralized Logs**: All logs are stored in the `/logs` directory
2. **Configurable Levels**: ERROR, WARN, INFO, and DEBUG levels
3. **Job-Specific Logging**: Each job creates its own log file
4. **Formatted Output**: Timestamps and log levels for easy analysis

## Creating New Analysis Jobs

To create a new analysis job:

1. Copy the template from `/templates/analysis_job_template.js`
2. Customize the job configuration (name, description, batch size, etc.)
3. Implement the `analyzeOrder` function for your specific analysis logic
4. Place the file in the `/analysis_jobs` directory
5. Run with proper environment variables (e.g., ANTHROPIC_API_KEY for AI-based jobs)

## Running Jobs

Each job is an independent Node.js script that can be run directly:

```bash
# For AI-based analysis
node analysis_jobs/ai_analysis_job.js

# For batch analysis with predefined data
node analysis_jobs/batch_analysis_job.js
```

For production environments, consider using a process manager like PM2:

```bash
# Install PM2
npm install -g pm2

# Start a job with PM2
pm2 start analysis_jobs/ai_analysis_job.js

# Monitor running jobs
pm2 list
pm2 logs
```

## Error Handling and Recovery

Each job implements robust error handling:

1. **Individual Item Failures**: Errors in one item don't stop the entire job
2. **State Preservation**: Successfully processed items are saved immediately
3. **Clean Restart**: After fixing an error, the job will skip already processed items
4. **Detailed Logging**: Error details are captured for troubleshooting

## Directory Structure

```
yale-executive-orders/
├── utils/                  # Shared utilities
│   ├── db.js               # Database utilities
│   ├── analysis.js         # Analysis utilities
│   └── logger.js           # Logging utilities
│
├── templates/              # Job templates
│   └── analysis_job_template.js  # Template for analysis jobs
│
├── analysis_jobs/          # Specific job implementations
│   ├── ai_analysis_job.js  # AI-based analysis job
│   └── batch_analysis_job.js  # Pre-defined batch analysis job
│
├── job_states/             # Job state data (for restarts)
│   └── *.json              # State files for each job
│
├── logs/                   # Log files
│   └── *.log               # Log files for each job
│
└── DISTRIBUTED_PROCESSING.md  # This documentation
```

## Benefits of This Approach

1. **Resilience**: Jobs can fail and recover independently
2. **Maintainability**: Shared code reduces duplication
3. **Flexibility**: Different analysis approaches can coexist
4. **Scalability**: Additional jobs can be added for parallel processing
5. **Reliability**: Robust error handling and clean restarts
6. **Observability**: Consistent logging across all jobs