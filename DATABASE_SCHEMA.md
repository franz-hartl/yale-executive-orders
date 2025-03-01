# Yale Executive Orders Database Schema

This document provides a detailed reference for the database schema used in the Yale Executive Orders project. The schema is defined in `schema.js` and follows the "Essential Simplicity" design philosophy.

## Overview

The database is structured around these key components:

1. **Core Tables**: Primary data storage for executive orders and related entities
2. **Junction Tables**: Manage many-to-many relationships
3. **Yale-Specific Tables**: Institution-specific extensions
4. **Full-Text Search**: Virtual tables for efficient text search
5. **Reference Data**: Predefined lookup values

## Schema Definition

All schema components are defined in a centralized `schema.js` file using a structured JavaScript object format.

## Core Tables

### `executive_orders`

Primary table storing executive order data.

| Column | Type | Description |
|--------|------|-------------|
| `id` | INTEGER PRIMARY KEY AUTOINCREMENT | Auto-incremented unique identifier |
| `order_number` | TEXT UNIQUE NOT NULL | Executive order number (e.g., "EO 14067") |
| `title` | TEXT NOT NULL | Order title |
| `signing_date` | DATE | Date the order was signed |
| `publication_date` | DATE | Date the order was published |
| `president` | TEXT | President who signed the order |
| `summary` | TEXT | Brief summary of the order |
| `full_text` | TEXT | Complete text of the order |
| `url` | TEXT | URL to the official order |
| `impact_level` | TEXT | Impact assessment ("Critical", "High", "Medium", "Low") |
| `status` | TEXT DEFAULT 'Active' | Status of the order ("Active", "Superseded", "Revoked") |
| `plain_language_summary` | TEXT | AI-generated plain language summary |
| `executive_brief` | TEXT | AI-generated executive brief (1-2 sentences) |
| `comprehensive_analysis` | TEXT | AI-generated comprehensive analysis |
| `added_date` | TIMESTAMP DEFAULT CURRENT_TIMESTAMP | When the order was added to the database |
| `last_updated` | TIMESTAMP DEFAULT CURRENT_TIMESTAMP | When the order was last updated |

### `categories`

Categories for classifying executive orders.

| Column | Type | Description |
|--------|------|-------------|
| `id` | INTEGER PRIMARY KEY AUTOINCREMENT | Auto-incremented unique identifier |
| `name` | TEXT UNIQUE NOT NULL | Category name |
| `description` | TEXT | Category description |

### `impact_areas`

General impact areas affected by executive orders.

| Column | Type | Description |
|--------|------|-------------|
| `id` | INTEGER PRIMARY KEY AUTOINCREMENT | Auto-incremented unique identifier |
| `name` | TEXT UNIQUE NOT NULL | Impact area name |
| `description` | TEXT | Impact area description |

### `university_impact_areas`

Higher education-specific impact areas.

| Column | Type | Description |
|--------|------|-------------|
| `id` | INTEGER PRIMARY KEY AUTOINCREMENT | Auto-incremented unique identifier |
| `name` | TEXT UNIQUE NOT NULL | University impact area name |
| `description` | TEXT | University impact area description |

### `yale_departments`

Yale organizational units affected by executive orders.

| Column | Type | Description |
|--------|------|-------------|
| `id` | INTEGER PRIMARY KEY AUTOINCREMENT | Auto-incremented unique identifier |
| `name` | TEXT UNIQUE NOT NULL | Department name |
| `description` | TEXT | Department description |
| `contact_info` | TEXT | Department contact information |
| `parent_department_id` | INTEGER NULL | Reference to parent department (self-reference) |

## Junction Tables

### `order_categories`

Links executive orders to categories (many-to-many).

| Column | Type | Description |
|--------|------|-------------|
| `order_id` | INTEGER | Reference to executive_orders.id |
| `category_id` | INTEGER | Reference to categories.id |
| PRIMARY KEY | | (order_id, category_id) |
| FOREIGN KEY | | order_id → executive_orders(id) ON DELETE CASCADE |
| FOREIGN KEY | | category_id → categories(id) ON DELETE CASCADE |

### `order_impact_areas`

Links executive orders to impact areas (many-to-many).

| Column | Type | Description |
|--------|------|-------------|
| `order_id` | INTEGER | Reference to executive_orders.id |
| `impact_area_id` | INTEGER | Reference to impact_areas.id |
| PRIMARY KEY | | (order_id, impact_area_id) |
| FOREIGN KEY | | order_id → executive_orders(id) ON DELETE CASCADE |
| FOREIGN KEY | | impact_area_id → impact_areas(id) ON DELETE CASCADE |

### `order_university_impact_areas`

Links executive orders to university impact areas (many-to-many).

| Column | Type | Description |
|--------|------|-------------|
| `order_id` | INTEGER | Reference to executive_orders.id |
| `university_impact_area_id` | INTEGER | Reference to university_impact_areas.id |
| `notes` | TEXT | Additional notes specific to this relationship |
| PRIMARY KEY | | (order_id, university_impact_area_id) |
| FOREIGN KEY | | order_id → executive_orders(id) ON DELETE CASCADE |
| FOREIGN KEY | | university_impact_area_id → university_impact_areas(id) ON DELETE CASCADE |

## Yale-Specific Tables

### `yale_impact_areas`

Yale-specific impact areas.

| Column | Type | Description |
|--------|------|-------------|
| `id` | INTEGER PRIMARY KEY AUTOINCREMENT | Auto-incremented unique identifier |
| `name` | TEXT UNIQUE NOT NULL | Yale impact area name |
| `description` | TEXT | Yale impact area description |
| `related_r1_area_id` | INTEGER NULL | Reference to university_impact_areas.id |
| FOREIGN KEY | | related_r1_area_id → university_impact_areas(id) ON DELETE SET NULL |

### `order_yale_impact_areas`

Links executive orders to Yale impact areas (many-to-many).

| Column | Type | Description |
|--------|------|-------------|
| `order_id` | INTEGER | Reference to executive_orders.id |
| `yale_impact_area_id` | INTEGER | Reference to yale_impact_areas.id |
| `yale_specific_notes` | TEXT | Yale-specific impact notes |
| `yale_impact_rating` | TEXT | Yale-specific impact rating |
| PRIMARY KEY | | (order_id, yale_impact_area_id) |
| FOREIGN KEY | | order_id → executive_orders(id) ON DELETE CASCADE |
| FOREIGN KEY | | yale_impact_area_id → yale_impact_areas(id) ON DELETE CASCADE |

### `yale_compliance_actions`

Compliance actions required by Yale for specific executive orders.

| Column | Type | Description |
|--------|------|-------------|
| `id` | INTEGER PRIMARY KEY AUTOINCREMENT | Auto-incremented unique identifier |
| `order_id` | INTEGER | Reference to executive_orders.id |
| `title` | TEXT NOT NULL | Action title |
| `description` | TEXT | Action description |
| `deadline` | TEXT | Compliance deadline |
| `yale_department_id` | INTEGER | Reference to yale_departments.id |
| `status` | TEXT DEFAULT 'Pending' | Status of the action ("Pending", "In Progress", "Completed") |
| `required` | INTEGER DEFAULT 1 | Whether the action is required (1) or optional (0) |
| `resource_requirement` | TEXT | Resources required for the action |
| `complexity_level` | TEXT | Complexity level of the action |
| FOREIGN KEY | | order_id → executive_orders(id) ON DELETE CASCADE |
| FOREIGN KEY | | yale_department_id → yale_departments(id) ON DELETE SET NULL |

### `yale_impact_mapping`

Detailed impact mapping for Yale departments.

| Column | Type | Description |
|--------|------|-------------|
| `id` | INTEGER PRIMARY KEY AUTOINCREMENT | Auto-incremented unique identifier |
| `order_id` | INTEGER | Reference to executive_orders.id |
| `yale_department_id` | INTEGER | Reference to yale_departments.id |
| `impact_score` | INTEGER | Numerical impact score |
| `impact_description` | TEXT | Description of the impact |
| `action_required` | INTEGER DEFAULT 0 | Whether action is required (1) or not (0) |
| `priority_level` | TEXT | Priority level for the department |
| `resource_implications` | TEXT | Resource implications for the department |
| FOREIGN KEY | | order_id → executive_orders(id) ON DELETE CASCADE |
| FOREIGN KEY | | yale_department_id → yale_departments(id) ON DELETE CASCADE |

## Full-Text Search Configuration

### `executive_orders_fts`

Full-text search virtual table for efficient text search.

| Column | Type | Description |
|--------|------|-------------|
| `order_number` | TEXT | Executive order number |
| `title` | TEXT | Order title |
| `summary` | TEXT | Order summary |
| `full_text` | TEXT | Full text of the order |

This is configured as a virtual FTS5 table with:
- Content table: `executive_orders`
- Content rowid: `id`

## Reference Data

The schema includes predefined reference data for common lookup tables:

### Categories

Default categories for executive orders:
- Technology
- Education
- Finance
- Healthcare
- Research & Science Policy
- Immigration
- National Security
- Diversity, Equity & Inclusion
- Environment
- Industry

### University Impact Areas

Default university impact areas:
- Research Funding & Science Policy
- Student Aid & Higher Education Finance
- Regulatory Compliance
- Labor & Employment
- Public-Private Partnerships
- Institutional Accessibility
- Academic Freedom & Curriculum
- Immigration & International Programs
- Diversity, Equity & Inclusion

## Schema Creation

The schema creation process is handled by the `createTables()` method in the Database class, which:

1. Creates core tables
2. Creates junction tables with specified keys
3. Creates Yale-specific tables
4. Sets up FTS virtual tables
5. Creates necessary triggers:
   - FTS synchronization triggers
   - last_updated timestamp trigger

## Schema Evolution

The schema is designed to evolve over time with new requirements:

1. **Adding Fields**: Add new columns to existing tables
2. **Adding Tables**: Add new tables for new entity types
3. **Adding Relationships**: Create new junction tables
4. **Institution Extensions**: Add new institution-specific table groups

When schema changes are made, use the `migrator.js` script to safely migrate data to the new schema.

## Schema Relationships Diagram

```
┌──────────────────┐       ┌──────────────┐       ┌─────────────────┐
│ executive_orders │       │  categories  │       │   impact_areas  │
└────────┬─────────┘       └─────┬────────┘       └────────┬────────┘
         │                       │                         │
         │                       │                         │
         │  ┌──────────────────┐ │                         │
         └──┤ order_categories ├─┘                         │
         │  └──────────────────┘                           │
         │                                                 │
         │  ┌─────────────────────┐                        │
         └──┤ order_impact_areas  ├────────────────────────┘
         │  └─────────────────────┘
         │
         │  ┌────────────────────────────┐      ┌────────────────────────┐
         └──┤ order_university_impact_areas ├────┤ university_impact_areas │
         │  └────────────────────────────┘      └────────────────────────┘
         │
         │                    ┌─────────────────┐     ┌─────────────────────┐
         │                    │ yale_impact_areas │     │ yale_departments    │
         │                    └─────────┬─────────┘     └──────────┬──────────┘
         │                              │                          │
         │ ┌───────────────────────────┐│                          │
         └─┤ order_yale_impact_areas   ├┘                          │
         │ └───────────────────────────┘                           │
         │                                                         │
         │ ┌────────────────────────┐                              │
         └─┤ yale_compliance_actions ├─────────────────────────────┘
         │ └────────────────────────┘                              │
         │                                                         │
         │ ┌────────────────────┐                                  │
         └─┤ yale_impact_mapping ├──────────────────────────────────┘
           └────────────────────┘
```

## Schema Usage Examples

### Creating a New Executive Order

```javascript
const order = {
  order_number: 'EO 14067',
  title: 'Digital Assets Order',
  signing_date: '2022-03-09',
  president: 'Biden',
  summary: 'This EO focuses on digital assets...',
  url: 'https://example.gov/eo14067',
  impact_level: 'High'
};

const orderId = await db.createOrder(order);

// Add categories
await db.run(
  'INSERT INTO order_categories (order_id, category_id) VALUES (?, ?)',
  [orderId, 1] // Technology category
);

// Add impact areas
await db.run(
  'INSERT INTO order_impact_areas (order_id, impact_area_id) VALUES (?, ?)',
  [orderId, 3] // Financial impact area
);
```

### Querying Complex Relationships

```javascript
// Get all orders with their categories and impact areas
const ordersWithRelations = await db.all(`
  SELECT eo.*, 
    GROUP_CONCAT(DISTINCT c.name) as categories,
    GROUP_CONCAT(DISTINCT ia.name) as impact_areas
  FROM executive_orders eo
  LEFT JOIN order_categories oc ON eo.id = oc.order_id
  LEFT JOIN categories c ON oc.category_id = c.id
  LEFT JOIN order_impact_areas oia ON eo.id = oia.order_id
  LEFT JOIN impact_areas ia ON oia.impact_area_id = ia.id
  GROUP BY eo.id
  ORDER BY eo.signing_date DESC
`);

// Get Yale-specific impacts for an order
const yaleImpacts = await db.all(`
  SELECT yia.name, yia.description, oyia.yale_specific_notes, oyia.yale_impact_rating
  FROM yale_impact_areas yia
  JOIN order_yale_impact_areas oyia ON yia.id = oyia.yale_impact_area_id
  WHERE oyia.order_id = ?
  ORDER BY oyia.yale_impact_rating DESC
`, [orderId]);
```

## Conclusion

The Yale Executive Orders database schema follows the "Essential Simplicity" design philosophy with clear entity definitions and relationships. The centralized schema definition in `schema.js` makes it easy to understand and modify, while the Database API provides a clean interface for interacting with the data.

This schema design supports both the core requirements for executive order analysis and the Yale-specific extensions, while maintaining a clean separation between them.