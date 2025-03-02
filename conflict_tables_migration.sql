-- conflict_tables_migration.sql
-- SQL migration for the conflict handling system

-- Conflict records table
CREATE TABLE IF NOT EXISTS conflict_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL,
  conflict_type TEXT NOT NULL,
  conflict_severity TEXT NOT NULL,
  fact1_id INTEGER NOT NULL,
  fact2_id INTEGER NOT NULL,
  detection_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  status TEXT DEFAULT 'unresolved',
  resolution_strategy TEXT,
  resolution_date TIMESTAMP,
  resolution_by TEXT,
  resolution_notes TEXT,
  FOREIGN KEY (order_id) REFERENCES executive_orders(id) ON DELETE CASCADE,
  FOREIGN KEY (fact1_id) REFERENCES knowledge_facts(id) ON DELETE CASCADE,
  FOREIGN KEY (fact2_id) REFERENCES knowledge_facts(id) ON DELETE CASCADE
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_conflict_order_id ON conflict_records(order_id);
CREATE INDEX IF NOT EXISTS idx_conflict_status ON conflict_records(status);
CREATE INDEX IF NOT EXISTS idx_conflict_types ON conflict_records(conflict_type, conflict_severity);
CREATE INDEX IF NOT EXISTS idx_conflict_facts ON conflict_records(fact1_id, fact2_id);