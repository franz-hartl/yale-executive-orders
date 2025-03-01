/**
 * schema.js
 * 
 * Central schema definition for the Yale Executive Orders project
 * Following "Essential Simplicity" design philosophy
 */

module.exports = {
  // Core tables
  tables: {
    executive_orders: {
      id: 'INTEGER PRIMARY KEY AUTOINCREMENT',
      order_number: 'TEXT UNIQUE NOT NULL',
      title: 'TEXT NOT NULL',
      signing_date: 'DATE',
      publication_date: 'DATE',
      president: 'TEXT',
      summary: 'TEXT',
      full_text: 'TEXT',
      url: 'TEXT',
      impact_level: 'TEXT',
      status: "TEXT DEFAULT 'Active'",
      plain_language_summary: 'TEXT',
      executive_brief: 'TEXT',
      comprehensive_analysis: 'TEXT',
      added_date: 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP',
      last_updated: 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP'
    },
    
    categories: {
      id: 'INTEGER PRIMARY KEY AUTOINCREMENT',
      name: 'TEXT UNIQUE NOT NULL',
      description: 'TEXT'
    },
    
    impact_areas: {
      id: 'INTEGER PRIMARY KEY AUTOINCREMENT',
      name: 'TEXT UNIQUE NOT NULL',
      description: 'TEXT'
    },
    
    university_impact_areas: {
      id: 'INTEGER PRIMARY KEY AUTOINCREMENT',
      name: 'TEXT UNIQUE NOT NULL',
      description: 'TEXT'
    },
    
    yale_departments: {
      id: 'INTEGER PRIMARY KEY AUTOINCREMENT',
      name: 'TEXT UNIQUE NOT NULL',
      description: 'TEXT',
      contact_info: 'TEXT',
      parent_department_id: 'INTEGER NULL',
      // Foreign key defined in relationships
    }
  },
  
  // Junction tables
  junctions: {
    order_categories: {
      order_id: 'INTEGER',
      category_id: 'INTEGER',
      primary_key: ['order_id', 'category_id'],
      foreign_keys: [
        { column: 'order_id', references: 'executive_orders(id)', onDelete: 'CASCADE' },
        { column: 'category_id', references: 'categories(id)', onDelete: 'CASCADE' }
      ]
    },
    
    order_impact_areas: {
      order_id: 'INTEGER',
      impact_area_id: 'INTEGER',
      primary_key: ['order_id', 'impact_area_id'],
      foreign_keys: [
        { column: 'order_id', references: 'executive_orders(id)', onDelete: 'CASCADE' },
        { column: 'impact_area_id', references: 'impact_areas(id)', onDelete: 'CASCADE' }
      ]
    },
    
    order_university_impact_areas: {
      order_id: 'INTEGER',
      university_impact_area_id: 'INTEGER',
      notes: 'TEXT',
      primary_key: ['order_id', 'university_impact_area_id'],
      foreign_keys: [
        { column: 'order_id', references: 'executive_orders(id)', onDelete: 'CASCADE' },
        { column: 'university_impact_area_id', references: 'university_impact_areas(id)', onDelete: 'CASCADE' }
      ]
    }
  },
  
  // Yale-specific tables
  yale_tables: {
    yale_impact_areas: {
      id: 'INTEGER PRIMARY KEY AUTOINCREMENT',
      name: 'TEXT UNIQUE NOT NULL',
      description: 'TEXT',
      related_r1_area_id: 'INTEGER NULL',
      foreign_keys: [
        { column: 'related_r1_area_id', references: 'university_impact_areas(id)', onDelete: 'SET NULL' }
      ]
    },
    
    order_yale_impact_areas: {
      order_id: 'INTEGER',
      yale_impact_area_id: 'INTEGER',
      yale_specific_notes: 'TEXT',
      yale_impact_rating: 'TEXT',
      primary_key: ['order_id', 'yale_impact_area_id'],
      foreign_keys: [
        { column: 'order_id', references: 'executive_orders(id)', onDelete: 'CASCADE' },
        { column: 'yale_impact_area_id', references: 'yale_impact_areas(id)', onDelete: 'CASCADE' }
      ]
    },
    
    yale_compliance_actions: {
      id: 'INTEGER PRIMARY KEY AUTOINCREMENT',
      order_id: 'INTEGER',
      title: 'TEXT NOT NULL',
      description: 'TEXT',
      deadline: 'TEXT',
      yale_department_id: 'INTEGER',
      status: "TEXT DEFAULT 'Pending'",
      required: 'INTEGER DEFAULT 1',
      resource_requirement: 'TEXT',
      complexity_level: 'TEXT',
      foreign_keys: [
        { column: 'order_id', references: 'executive_orders(id)', onDelete: 'CASCADE' },
        { column: 'yale_department_id', references: 'yale_departments(id)', onDelete: 'SET NULL' }
      ]
    },
    
    yale_impact_mapping: {
      id: 'INTEGER PRIMARY KEY AUTOINCREMENT',
      order_id: 'INTEGER',
      yale_department_id: 'INTEGER',
      impact_score: 'INTEGER',
      impact_description: 'TEXT',
      action_required: 'INTEGER DEFAULT 0',
      priority_level: 'TEXT',
      resource_implications: 'TEXT',
      foreign_keys: [
        { column: 'order_id', references: 'executive_orders(id)', onDelete: 'CASCADE' },
        { column: 'yale_department_id', references: 'yale_departments(id)', onDelete: 'CASCADE' }
      ]
    }
  },
  
  // FTS search configuration
  search: {
    executive_orders_fts: {
      type: 'VIRTUAL',
      using: 'fts5',
      columns: ['order_number', 'title', 'summary', 'full_text'],
      content: 'executive_orders',
      content_rowid: 'id'
    }
  },
  
  // Predefined reference data
  reference_data: {
    categories: [
      { name: 'Technology', description: 'Related to technology, AI, computing, and digital infrastructure' },
      { name: 'Education', description: 'Related to education policy, learning, and academic programs' },
      { name: 'Finance', description: 'Related to financial regulations, funding, and economic policy' },
      { name: 'Healthcare', description: 'Related to healthcare, public health, and medical research' },
      { name: 'Research & Science Policy', description: 'Related to research initiatives, scientific methodology, funding priorities, and federal science policy' },
      { name: 'Immigration', description: 'Related to immigration policy, international student/scholar visas, and academic mobility' },
      { name: 'National Security', description: 'Related to national security, defense, sensitive research, and export controls' },
      { name: 'Diversity, Equity & Inclusion', description: 'Related to diversity, equity, inclusion, civil rights, and accessibility initiatives' },
      { name: 'Environment', description: 'Related to environmental protection, climate, and sustainability' },
      { name: 'Industry', description: 'Related to industry partnerships, business, and economic development' }
    ],
    
    university_impact_areas: [
      { name: 'Research Funding & Science Policy', description: 'Impact on federal research grants, funding priorities, research security, and national science initiatives across all institution types' },
      { name: 'Student Aid & Higher Education Finance', description: 'Impact on student financial aid, loan programs, and education financing for diverse institution types' },
      { name: 'Regulatory Compliance', description: 'Impact on regulatory requirements, federal reporting mandates, certifications, and compliance obligations for higher education institutions' },
      { name: 'Labor & Employment', description: 'Impact on faculty/staff hiring, employment law, union relations, compensation, and workforce policies in higher education' },
      { name: 'Public-Private Partnerships', description: 'Impact on academic-industry collaboration, technology transfer, and economic development initiatives' },
      { name: 'Institutional Accessibility', description: 'Impact on educational access, affordability, and inclusion across diverse student populations and institution types' },
      { name: 'Academic Freedom & Curriculum', description: 'Impact on instructional policy, academic freedom, and curriculum requirements across different institutional contexts' },
      { name: 'Immigration & International Programs', description: 'Impact on international student/scholar visas, study abroad, global partnerships, and academic mobility' },
      { name: 'Diversity, Equity & Inclusion', description: 'Impact on institutional diversity initiatives, civil rights compliance, and inclusion efforts across higher education' }
    ]
  }
};