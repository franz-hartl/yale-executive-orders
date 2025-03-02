# Yale Executive Orders MCP Client

This project implements a Model Context Protocol (MCP) client for the Yale Executive Orders database. It allows Claude to access and retrieve executive order data as contextual information, enabling more accurate and informed responses to queries about executive orders and their impact on universities.

## What is Model Context Protocol (MCP)?

Model Context Protocol (MCP) is a standardized way for large language models (LLMs) to retrieve external information as context for generating responses. It defines how context providers can expose data to LLMs through a consistent API.

## Features

- **Static MCP Client**: Works directly with JSON files hosted on GitHub Pages - no server required!
- **Rich Data Access**: Provides access to executive orders, categories, impact areas, and more
- **Intelligent Search**: Finds relevant executive orders based on user queries
- **Claude Integration**: Seamlessly feeds context to Claude for informative responses
- **Interactive CLI**: Simple command-line interface for asking questions
- **Easy Setup**: Quick setup process with the provided setup script

## Getting Started

### Prerequisites

- Node.js (v16 or later)
- Anthropic API key (for LLM integration examples)
- Either:
  - Yale Executive Orders database (SQLite) for the full server version
  - Access to the static JSON files for the static client version

### Installation

1. Clone the repository
2. Install dependencies:
   ```
   npm install
   ```
3. Add your Anthropic API key to the `.env` file if you want to use the LLM integration:
   ```
   ANTHROPIC_API_KEY=your_api_key
   ```

### Quick Setup

Run the setup script to configure the static MCP client:

```
npm run mcp:setup
```

This will:
1. Ask for your Anthropic API key and save it to the `.env` file
2. Test connectivity to the GitHub Pages data files
3. Provide instructions for using the client

### Running the Static MCP Client

After setup, run the client with:

```
npm run mcp:static
```

This will:
1. Load executive order data from the GitHub Pages site
2. Present an interactive command line interface
3. Allow you to ask questions about executive orders
4. Search for relevant executive orders based on your query
5. Use Claude to generate informative responses with the retrieved context

## Usage Examples

### Example Questions

Here are some examples of questions you can ask the MCP client:

```
What executive orders have been issued related to research funding?
```

```
How do President Biden's executive orders impact university operations?
```

```
What executive orders have the highest impact level for Yale University?
```

```
What are the compliance requirements for universities from recent executive orders?
```

```
Which executive orders affect international student programs?
```

### How It Works

1. **Query Processing**: The client extracts key search terms from your question
2. **Data Retrieval**: It searches through the executive orders data for relevant orders
3. **Context Formation**: The most relevant orders are formatted as context
4. **LLM Integration**: The context and your question are sent to Claude
5. **Response Generation**: Claude analyzes the context and provides an informative response

## Behind the Scenes

The static MCP client is designed to follow the Model Context Protocol pattern, which is a standard way for LLMs to retrieve and use external information.

### How the Static Client Works

1. **Data Loading**: The client loads JSON data files from the GitHub Pages site
2. **Local Processing**: All search operations happen locally in the client
3. **Smart Search**: The client uses term frequency and relevance scoring to find the most applicable executive orders
4. **Context Building**: It formats the executive orders into a structured context document
5. **Claude Integration**: The context is sent to Claude along with your question

### Data Files Used

The client accesses these JSON files from your GitHub Pages site:
- `processed_executive_orders.json` (or `executive_orders.json` as fallback)
- `categories.json`
- `impact_areas.json`
- `university_impact_areas.json`

## Future Enhancements

1. **Vector Search**: Add semantic search using embeddings for better relevance
2. **Result Filtering**: Add more filtering options by category, date, etc.
3. **Local Caching**: Cache data files locally to reduce network requests
4. **Custom Contexts**: Allow creating specialized context formats for different question types
5. **Web Interface**: Develop a web-based UI as an alternative to the CLI

## About the Yale Executive Orders Project

This client is part of the Yale Executive Orders Analysis project, which aims to analyze executive orders and their impact on Yale University and other higher education institutions. The project uses AI and data analysis to provide insights into policy implications and compliance requirements.

For more information, see the main project README.md.