# Yale University Executive Order API

This API provides comprehensive functionality for tracking, categorizing, and analyzing executive orders that impact Yale University operations, compliance requirements, and academic activities.

## Features

- **Full REST API**: Complete CRUD operations for executive orders
- **Categorization**: Automatically categorizes executive orders by topic and impact area
- **University-specific Impact Analysis**: Specialized categorization for university impact areas
- **Full-text Search**: Powerful search capabilities across all executive order content
- **Filterable Results**: Multiple filtering options for narrowing down results
- **Compliance Management**: Track compliance requirements and deadlines
- **SQLite Database**: Easy to set up with no external dependencies

## Getting Started

### Prerequisites

- Node.js (v16 or later)
- Anthropic API key for AI categorization features

### Installation

1. Clone the repository
2. Install dependencies:
   ```
   npm install
   ```
3. Add your Anthropic API key to the `.env` file:
   ```
   ANTHROPIC_API_KEY=your_api_key
   ```
4. Start the API server:
   ```
   ./start_api.sh
   ```

The server will start on port 3001 by default (separate from the main application server which runs on port 3000).

## API Endpoints

### Executive Orders

#### Get all executive orders
```
GET /api/executive-orders
```

Optional query parameters:
- `category`: Filter by category name
- `impact_area`: Filter by impact area
- `university_impact_area`: Filter by university impact area
- `impact_level`: Filter by impact level (Critical, High, Medium, Low)
- `president`: Filter by president name
- `search`: Full-text search across order content
- `order_by`: Sort field (id, order_number, title, signing_date, president, impact_level)
- `order_dir`: Sort direction (asc, desc)
- `limit`: Number of results to return (default: 100)
- `offset`: Offset for pagination

#### Get a single executive order
```
GET /api/executive-orders/:id
```

Returns detailed information about a single executive order including all categorizations, impact areas, and compliance actions.

#### Create a new executive order
```
POST /api/executive-orders
```

Required fields:
- `order_number`: The executive order number
- `title`: The title of the executive order

Optional fields:
- `signing_date`: Date the order was signed (ISO format)
- `publication_date`: Date the order was published (ISO format)
- `president`: Name of the president who signed the order
- `summary`: Summary of the executive order
- `full_text`: Full text of the executive order
- `url`: URL to the official publication
- `impact_level`: Critical, High, Medium, or Low
- `status`: Status of the order (Active, Revoked, etc.)
- `implementation_phase`: Current implementation phase
- `categories`: Array of category names
- `impact_areas`: Array of impact area names
- `university_impact_areas`: Array of university impact area names or objects with name and notes

#### Update an executive order
```
PUT /api/executive-orders/:id
```

Same fields as the create endpoint.

#### Delete an executive order
```
DELETE /api/executive-orders/:id
```

### Categories and Impact Areas

#### Get all categories
```
GET /api/categories
```

#### Get all impact areas
```
GET /api/impact-areas
```

#### Get all university impact areas
```
GET /api/university-impact-areas
```

### Compliance Actions

#### Add a compliance action
```
POST /api/executive-orders/:id/compliance-actions
```

Required fields:
- `title`: Title of the compliance action

Optional fields:
- `description`: Detailed description
- `deadline`: Due date (ISO format)
- `status`: Status (Pending, In Progress, Completed, etc.)
- `priority`: Priority level
- `responsible_office`: Office responsible for this action

### Statistics

#### Get system statistics
```
GET /api/statistics
```

Returns statistics about the executive orders, including:
- Counts by impact level
- Counts by university impact area
- Counts by category
- Timeline of orders by month

#### Get system information
```
GET /api/system-info
```

Returns information about the system, including:
- Topic name and description
- Database type and status
- Number of orders in the system
- Version and last updated date

## Examples

### Example: Searching for executive orders related to education funding

```
GET /api/executive-orders?search=education+funding&university_impact_area=Student+Aid+%26+Higher+Education+Finance
```

### Example: Creating a new executive order

```json
POST /api/executive-orders

{
  "order_number": "EO 14123",
  "title": "Promoting Excellence in Higher Education",
  "signing_date": "2025-06-15",
  "president": "Sanders",
  "summary": "This executive order establishes new guidelines for federal funding of higher education institutions, with emphasis on research infrastructure and affordability.",
  "impact_level": "High",
  "categories": ["Education", "Finance", "Research"],
  "impact_areas": ["Funding", "Policy", "Research"],
  "university_impact_areas": [
    "Research Funding", 
    {
      "name": "Student Aid & Higher Education Finance",
      "notes": "Requires review of tuition assistance programs by September 2025"
    }
  ]
}
```

## Database Schema

The system uses an SQLite database with the following main tables:

- `executive_orders`: Stores the core information about executive orders
- `categories`: Predefined categories for executive orders
- `order_categories`: Junction table linking orders to categories
- `impact_areas`: Predefined impact areas
- `order_impact_areas`: Junction table linking orders to impact areas
- `university_impact_areas`: University-specific impact areas
- `order_university_impact_areas`: Junction table linking orders to university impact areas
- `compliance_actions`: Compliance requirements and actions for executive orders
- `executive_orders_fts`: Full-text search index for executive orders

## Contributing

Contributions to improve the API are welcome. Please follow these steps:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

This project is licensed under the MIT License.