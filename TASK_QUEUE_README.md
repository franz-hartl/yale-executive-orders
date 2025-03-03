# Task Queue System for Yale Executive Orders

## Overview

The Task Queue system provides background processing capabilities for handling large batches of executive orders. This system decouples the scraping and processing tasks from the analysis tasks, preventing resource exhaustion and better managing rate limits.

## Key Features

* **Background Processing**: Run tasks in the background without blocking the main process
* **Persistent State**: Save queue state to disk for resuming after interruptions
* **Concurrency Control**: Configure how many tasks run simultaneously
* **Priority Queueing**: Process more important tasks first
* **Rate Limiting**: Prevent overwhelming APIs with configurable throttling
* **Error Handling**: Automatic retries with exponential backoff
* **Monitoring**: Track queue statistics and task status

## Architecture

The task queue system consists of several components:

1. **TaskQueue** (`utils/task_queue.js`): Core implementation of the queue with worker management
2. **QueueManager** (`utils/queue_manager.js`): Manages multiple queues and provides task handlers
3. **CLI Scripts**: Command-line interfaces for interacting with the queue system

## Queue Types

The system supports multiple queue types for different kinds of tasks:

* **Analysis Queue**: Processes AI-based analysis of executive orders (slower, rate-limited)
* **Extraction Queue**: Handles data extraction tasks (faster, parallelized)
* **Export Queue**: Manages export operations (fast file operations)

## Usage

### Starting the Queue Processor

```bash
node analyze_orders_queue.js [batchSize] [limit]
```

Parameters:
- `batchSize`: Number of orders to process in each batch (default: 10)
- `limit`: Maximum number of orders to queue (optional)

Example:
```bash
# Process all pending orders in batches of 20
node analyze_orders_queue.js 20

# Process up to 50 orders in batches of 5
node analyze_orders_queue.js 5 50
```

### Monitoring Queue Status

The queue process will log status updates every 5 seconds, showing:
- Number of pending tasks
- Number of processing tasks
- Number of completed tasks
- Number of failed tasks

### Integration with Workflow

The queue system is integrated with the workflow pipeline. For batches larger than 5 orders, the system automatically switches to using the task queue for better resource management.

## Configuration

The queue system can be configured in several ways:

```javascript
// Create a queue with custom settings
const queue = new TaskQueue({
  name: 'custom-queue',
  concurrency: 3,          // Process 3 tasks concurrently
  throttleDelay: 2000,     // 2 second delay between tasks
  retryDelay: 5000,        // Base delay for retries (increases exponentially)
  maxRetries: 3,           // Maximum retry attempts
  persistPath: './queues', // Path to store queue state
  saveInterval: 10000      // Save state every 10 seconds
});
```

## Programmatic API

### Adding Tasks to the Queue

```javascript
// Add a single task
const taskId = queueManager.queueOrderAnalysis(order, {
  priority: 10 // Higher priority tasks run first
});

// Add multiple tasks in a batch
const taskIds = queueManager.queueBatchAnalysis(orders, {
  batchId: 'batch-2023-05-01',
  priority: 5
});
```

### Monitoring Tasks

```javascript
// Get queue statistics
const stats = queueManager.getQueueStats();
console.log(stats.analysis.pendingTasks); // Number of pending tasks
console.log(stats.analysis.completedTasks); // Number of completed tasks

// Get information about a specific task
const task = queueManager.getQueue('analysis').getTask(taskId);
```

## Benefits

1. **Resource Management**: Prevents memory exhaustion when processing large numbers of orders
2. **Reliability**: Automatically retries failed tasks and can resume after interruptions
3. **Efficiency**: Better utilizes system resources with controlled concurrency
4. **Monitoring**: Provides insights into processing status and performance
5. **Scalability**: Can be extended to support distributed processing across multiple machines