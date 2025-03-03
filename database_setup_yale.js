/**
 * database_setup_yale.js
 * 
 * This script updates the SQLite database with Yale-specific taxonomy for executive orders.
 */

const sqlite3 = require('sqlite3').verbose();
const fs = require('fs').promises;
const path = require('path');

// Database file path
const dbFile = path.join(__dirname, 'executive_orders.db');

// Connect to database
const db = new sqlite3.Database(dbFile, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
    process.exit(1);
  }
  console.log('Connected to the SQLite database.');
});

// Promisify database operations
function dbRun(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
}

function dbGet(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

function dbAll(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

// Ensure Yale taxonomy tables exist
async function createYaleTaxonomyTables() {
  try {
    // Create Yale departments table if it doesn't exist
    await dbRun(`
      CREATE TABLE IF NOT EXISTS yale_departments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE,
        description TEXT,
        contact_info TEXT,
        parent_department_id INTEGER NULL,
        FOREIGN KEY (parent_department_id) REFERENCES yale_departments(id)
      )
    `);
    
    // Create Yale-specific impact areas table if it doesn't exist
    await dbRun(`
      CREATE TABLE IF NOT EXISTS yale_impact_areas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE,
        description TEXT,
        primary_yale_department_id INTEGER,
        secondary_yale_department_ids TEXT,
        related_r1_area_id INTEGER NULL,
        FOREIGN KEY (related_r1_area_id) REFERENCES university_impact_areas(id),
        FOREIGN KEY (primary_yale_department_id) REFERENCES yale_departments(id)
      )
    `);
    
    // Create junction table for orders and Yale impact areas
    await dbRun(`
      CREATE TABLE IF NOT EXISTS order_yale_impact_areas (
        order_id INTEGER,
        yale_impact_area_id INTEGER,
        yale_specific_notes TEXT,
        yale_impact_rating TEXT,
        PRIMARY KEY (order_id, yale_impact_area_id),
        FOREIGN KEY (order_id) REFERENCES executive_orders(id),
        FOREIGN KEY (yale_impact_area_id) REFERENCES yale_impact_areas(id)
      )
    `);
    
    // Create Yale stakeholders table if it doesn't exist
    await dbRun(`
      CREATE TABLE IF NOT EXISTS yale_stakeholders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE,
        description TEXT,
        relevant_impact_areas TEXT
      )
    `);
    
    // Create junction table for orders and Yale stakeholders
    await dbRun(`
      CREATE TABLE IF NOT EXISTS order_yale_stakeholders (
        order_id INTEGER,
        yale_stakeholder_id INTEGER,
        priority_level TEXT,
        action_required BOOLEAN DEFAULT 0,
        stakeholder_notes TEXT,
        PRIMARY KEY (order_id, yale_stakeholder_id),
        FOREIGN KEY (order_id) REFERENCES executive_orders(id),
        FOREIGN KEY (yale_stakeholder_id) REFERENCES yale_stakeholders(id)
      )
    `);
    
    console.log('Yale taxonomy tables created successfully');
  } catch (error) {
    console.error('Error creating Yale taxonomy tables:', error);
    throw error;
  }
}

// Set up Yale departments
async function setupYaleDepartments() {
  try {
    // Check if departments already exist
    const deptCount = await dbGet('SELECT COUNT(*) as count FROM yale_departments');
    
    // If departments exist, don't recreate them
    if (deptCount.count > 0) {
      console.log(`${deptCount.count} Yale departments already exist, skipping...`);
      return;
    }
    
    // Create Yale departments
    const departments = [
      { id: 1, name: "Office of the President", description: "Executive leadership" },
      { id: 2, name: "Office of the Provost", description: "Chief academic officer" },
      { id: 3, name: "General Counsel", description: "Legal services" },
      { id: 4, name: "Office of Research Administration", description: "Research grants and compliance" },
      { id: 5, name: "Finance & Administration", description: "Financial management" },
      { id: 6, name: "Human Resources", description: "Employment and workforce" },
      { id: 7, name: "Student Affairs", description: "Student services and residential life" },
      { id: 8, name: "International Affairs", description: "Global initiatives" },
      { id: 9, name: "Yale College", description: "Undergraduate education" },
      { id: 10, name: "Graduate School", description: "Graduate education and research training" },
      { id: 11, name: "Yale School of Medicine", description: "Medical education and clinical practice" },
      { id: 12, name: "Yale Arts & Museums", description: "Arts programs and collections" },
      { id: 13, name: "Athletics", description: "Sports programs" }
    ];
    
    for (const dept of departments) {
      await dbRun(
        `INSERT INTO yale_departments (id, name, description) VALUES (?, ?, ?)`,
        [dept.id, dept.name, dept.description]
      );
    }
    
    console.log(`Created ${departments.length} Yale departments`);
  } catch (error) {
    console.error('Error setting up Yale departments:', error);
    throw error;
  }
}

// Load Yale-specific impact areas from JSON file
async function loadYaleImpactAreas() {
  try {
    // Read yale_impact_areas.json file
    const filePath = path.join(__dirname, 'yale_specific_data', 'yale_impact_areas.json');
    const data = await fs.readFile(filePath, 'utf8');
    const yaleImpactAreas = JSON.parse(data);
    
    // Clear existing table
    await dbRun(`DELETE FROM yale_impact_areas`);
    
    // Reset sequence
    await dbRun(`DELETE FROM sqlite_sequence WHERE name = 'yale_impact_areas'`);
    
    // Insert each Yale impact area
    for (const area of yaleImpactAreas) {
      // Convert secondary_yale_department_ids array to string
      const secondaryDepts = area.secondary_yale_department_ids ? JSON.stringify(area.secondary_yale_department_ids) : null;
      
      await dbRun(
        `INSERT INTO yale_impact_areas (id, name, description, primary_yale_department_id, secondary_yale_department_ids)
         VALUES (?, ?, ?, ?, ?)`,
        [area.id, area.name, area.description, area.primary_yale_department_id, secondaryDepts]
      );
    }
    
    console.log(`Loaded ${yaleImpactAreas.length} Yale-specific impact areas`);
  } catch (error) {
    console.error('Error loading Yale impact areas:', error);
    throw error;
  }
}

// Load Yale stakeholders from JSON file
async function loadYaleStakeholders() {
  try {
    // Read yale_stakeholders.json file
    const filePath = path.join(__dirname, 'yale_specific_data', 'yale_stakeholders.json');
    const data = await fs.readFile(filePath, 'utf8');
    const yaleStakeholders = JSON.parse(data);
    
    // Clear existing table
    await dbRun(`DELETE FROM yale_stakeholders`);
    
    // Reset sequence
    await dbRun(`DELETE FROM sqlite_sequence WHERE name = 'yale_stakeholders'`);
    
    // Insert each Yale stakeholder
    for (const stakeholder of yaleStakeholders) {
      // Convert relevant_impact_areas array to string
      const relevantAreas = stakeholder.relevant_impact_areas ? JSON.stringify(stakeholder.relevant_impact_areas) : null;
      
      await dbRun(
        `INSERT INTO yale_stakeholders (id, name, description, relevant_impact_areas)
         VALUES (?, ?, ?, ?)`,
        [stakeholder.id, stakeholder.name, stakeholder.description, relevantAreas]
      );
    }
    
    console.log(`Loaded ${yaleStakeholders.length} Yale stakeholders`);
  } catch (error) {
    console.error('Error loading Yale stakeholders:', error);
    throw error;
  }
}

// Main function
async function main() {
  try {
    // Create Yale taxonomy tables
    await createYaleTaxonomyTables();
    
    // Setup Yale departments
    await setupYaleDepartments();
    
    // Load Yale-specific data
    await loadYaleImpactAreas();
    await loadYaleStakeholders();
    
    console.log('Yale-specific taxonomy setup complete!');
  } catch (error) {
    console.error('Error in main process:', error);
  } finally {
    db.close();
  }
}

// Run main function
main();