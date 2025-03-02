-- knowledge_tables_migration.sql
-- SQL migration for the knowledge representation system

-- Knowledge facts table
CREATE TABLE IF NOT EXISTS knowledge_facts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL,
  fact_type TEXT NOT NULL,
  fact_value TEXT NOT NULL,
  confidence REAL DEFAULT 0.5,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES executive_orders(id) ON DELETE CASCADE
);

-- Knowledge sources table
CREATE TABLE IF NOT EXISTS knowledge_sources (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  fact_id INTEGER NOT NULL,
  source_id INTEGER NOT NULL,
  source_context TEXT,
  extraction_date TIMESTAMP,
  extraction_method TEXT,
  extraction_metadata TEXT,
  FOREIGN KEY (fact_id) REFERENCES knowledge_facts(id) ON DELETE CASCADE,
  FOREIGN KEY (source_id) REFERENCES source_metadata(id) ON DELETE CASCADE
);

-- Knowledge relationships table
CREATE TABLE IF NOT EXISTS knowledge_relationships (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  fact_id INTEGER NOT NULL,
  related_fact_id INTEGER NOT NULL,
  relationship_type TEXT NOT NULL,
  description TEXT,
  confidence REAL DEFAULT 0.5,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (fact_id) REFERENCES knowledge_facts(id) ON DELETE CASCADE,
  FOREIGN KEY (related_fact_id) REFERENCES knowledge_facts(id) ON DELETE CASCADE
);

-- Yale-specific impact assessments table
CREATE TABLE IF NOT EXISTS knowledge_yale_impacts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  fact_id INTEGER NOT NULL,
  yale_department_id INTEGER,
  impact_level TEXT,
  impact_description TEXT,
  analysis_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  analyst TEXT,
  FOREIGN KEY (fact_id) REFERENCES knowledge_facts(id) ON DELETE CASCADE,
  FOREIGN KEY (yale_department_id) REFERENCES yale_departments(id) ON DELETE SET NULL
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_knowledge_facts_order_id ON knowledge_facts(order_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_facts_fact_type ON knowledge_facts(fact_type);
CREATE INDEX IF NOT EXISTS idx_knowledge_sources_fact_id ON knowledge_sources(fact_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_sources_source_id ON knowledge_sources(source_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_relationships_fact_id ON knowledge_relationships(fact_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_relationships_related_fact_id ON knowledge_relationships(related_fact_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_yale_impacts_fact_id ON knowledge_yale_impacts(fact_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_yale_impacts_department_id ON knowledge_yale_impacts(yale_department_id);