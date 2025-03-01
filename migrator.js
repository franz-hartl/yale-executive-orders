/**
 * migrator.js
 * 
 * Database migration tool for the Yale Executive Orders project
 * Handles smooth transition to the new schema while preserving data
 */

const fs = require('fs');
const path = require('path');
const Database = require('./utils/database');
const oldDbPath = path.join(__dirname, 'executive_orders.db');
const newDbPath = path.join(__dirname, 'executive_orders_new.db');
const backupPath = path.join(__dirname, `executive_orders_backup_${Date.now()}.db`);

async function migrateDatabase() {
  console.log('Starting database migration...');
  
  // Create backup of current database
  console.log('Creating database backup...');
  fs.copyFileSync(oldDbPath, backupPath);
  console.log(`Backup created at ${backupPath}`);
  
  // Create a new database with the new schema
  const newDb = new Database(newDbPath);
  await newDb.connect();
  await newDb.createTables();
  await newDb.initializeReferenceData();
  
  // Connect to the old database
  const oldDb = new Database(oldDbPath);
  await oldDb.connect();
  
  // Migrate executive orders
  console.log('Migrating executive orders...');
  const orders = await oldDb.all('SELECT * FROM executive_orders');
  
  for (const order of orders) {
    // Insert the order into the new database
    const result = await newDb.run(
      `INSERT INTO executive_orders 
       (id, order_number, title, signing_date, publication_date, president, summary, full_text, url, 
        impact_level, status, plain_language_summary, executive_brief, comprehensive_analysis,
        added_date, last_updated) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        order.id,
        order.order_number,
        order.title,
        order.signing_date,
        order.publication_date || order.signing_date,
        order.president,
        order.summary,
        order.full_text,
        order.url,
        order.impact_level,
        order.status || 'Active',
        order.plain_language_summary,
        order.executive_brief,
        order.comprehensive_analysis,
        order.added_date || new Date().toISOString(),
        order.last_updated || new Date().toISOString()
      ]
    );
  }
  
  // Migrate categories
  console.log('Migrating categories...');
  const categories = await oldDb.all('SELECT * FROM categories');
  for (const category of categories) {
    await newDb.run(
      'INSERT OR IGNORE INTO categories (id, name, description) VALUES (?, ?, ?)',
      [category.id, category.name, category.description]
    );
  }
  
  // Migrate order categories
  console.log('Migrating order categories...');
  const orderCategories = await oldDb.all('SELECT * FROM order_categories');
  for (const oc of orderCategories) {
    await newDb.run(
      'INSERT OR IGNORE INTO order_categories (order_id, category_id) VALUES (?, ?)',
      [oc.order_id, oc.category_id]
    );
  }
  
  // Migrate impact areas
  console.log('Migrating impact areas...');
  const impactAreas = await oldDb.all('SELECT * FROM impact_areas');
  for (const ia of impactAreas) {
    await newDb.run(
      'INSERT OR IGNORE INTO impact_areas (id, name, description) VALUES (?, ?, ?)',
      [ia.id, ia.name, ia.description]
    );
  }
  
  // Migrate order impact areas
  console.log('Migrating order impact areas...');
  const orderImpactAreas = await oldDb.all('SELECT * FROM order_impact_areas');
  for (const oia of orderImpactAreas) {
    await newDb.run(
      'INSERT OR IGNORE INTO order_impact_areas (order_id, impact_area_id) VALUES (?, ?)',
      [oia.order_id, oia.impact_area_id]
    );
  }
  
  // Migrate university impact areas
  console.log('Migrating university impact areas...');
  const universityImpactAreas = await oldDb.all('SELECT * FROM university_impact_areas');
  for (const uia of universityImpactAreas) {
    await newDb.run(
      'INSERT OR IGNORE INTO university_impact_areas (id, name, description) VALUES (?, ?, ?)',
      [uia.id, uia.name, uia.description]
    );
  }
  
  // Migrate order university impact areas
  console.log('Migrating order university impact areas...');
  const orderUniversityImpactAreas = await oldDb.all('SELECT * FROM order_university_impact_areas');
  for (const ouia of orderUniversityImpactAreas) {
    await newDb.run(
      'INSERT OR IGNORE INTO order_university_impact_areas (order_id, university_impact_area_id, notes) VALUES (?, ?, ?)',
      [ouia.order_id, ouia.university_impact_area_id, ouia.notes]
    );
  }
  
  // Migrate Yale-specific tables
  try {
    // Yale departments
    console.log('Migrating Yale departments...');
    const yaleDepartments = await oldDb.all('SELECT * FROM yale_departments');
    for (const dept of yaleDepartments) {
      await newDb.run(
        `INSERT OR IGNORE INTO yale_departments 
         (id, name, description, contact_info, parent_department_id) 
         VALUES (?, ?, ?, ?, ?)`,
        [dept.id, dept.name, dept.description, dept.contact_info, dept.parent_department_id]
      );
    }
    
    // Yale impact areas
    console.log('Migrating Yale impact areas...');
    const yaleImpactAreas = await oldDb.all('SELECT * FROM yale_impact_areas');
    for (const yia of yaleImpactAreas) {
      await newDb.run(
        `INSERT OR IGNORE INTO yale_impact_areas 
         (id, name, description, related_r1_area_id) 
         VALUES (?, ?, ?, ?)`,
        [yia.id, yia.name, yia.description, yia.related_r1_area_id]
      );
    }
    
    // Order Yale impact areas
    console.log('Migrating order Yale impact areas...');
    const orderYaleImpactAreas = await oldDb.all('SELECT * FROM order_yale_impact_areas');
    for (const oyia of orderYaleImpactAreas) {
      await newDb.run(
        `INSERT OR IGNORE INTO order_yale_impact_areas 
         (order_id, yale_impact_area_id, yale_specific_notes, yale_impact_rating) 
         VALUES (?, ?, ?, ?)`,
        [oyia.order_id, oyia.yale_impact_area_id, oyia.yale_specific_notes, oyia.yale_impact_rating]
      );
    }
    
    // Yale compliance actions
    console.log('Migrating Yale compliance actions...');
    const yaleComplianceActions = await oldDb.all('SELECT * FROM yale_compliance_actions');
    for (const yca of yaleComplianceActions) {
      await newDb.run(
        `INSERT OR IGNORE INTO yale_compliance_actions 
         (id, order_id, title, description, deadline, yale_department_id, 
          status, required, resource_requirement, complexity_level) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          yca.id, yca.order_id, yca.title, yca.description, yca.deadline, 
          yca.yale_department_id, yca.status, yca.required, 
          yca.resource_requirement, yca.complexity_level
        ]
      );
    }
    
    // Yale impact mapping
    console.log('Migrating Yale impact mapping...');
    const yaleImpactMapping = await oldDb.all('SELECT * FROM yale_impact_mapping');
    for (const yim of yaleImpactMapping) {
      await newDb.run(
        `INSERT OR IGNORE INTO yale_impact_mapping 
         (id, order_id, yale_department_id, impact_score, impact_description, 
          action_required, priority_level, resource_implications) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          yim.id, yim.order_id, yim.yale_department_id, yim.impact_score, 
          yim.impact_description, yim.action_required, yim.priority_level, 
          yim.resource_implications
        ]
      );
    }
  } catch (err) {
    // Yale tables might not exist in old database, that's okay
    console.log('Some Yale-specific tables may not have been migrated:', err.message);
  }
  
  // Create FTS index
  console.log('Creating full-text search index...');
  try {
    // First populate the FTS table with existing data
    const orders = await newDb.all('SELECT id, order_number, title, summary, full_text FROM executive_orders');
    for (const order of orders) {
      await newDb.run(
        `INSERT INTO executive_orders_fts(rowid, order_number, title, summary, full_text) 
         VALUES (?, ?, ?, ?, ?)`,
        [order.id, order.order_number, order.title, order.summary || '', order.full_text || '']
      );
    }
    console.log('Full-text search index created successfully!');
  } catch (err) {
    console.log('Error creating full-text search index:', err.message);
  }
  
  // Close database connections
  await oldDb.close();
  await newDb.close();
  
  // Replace old database with new database
  console.log('Replacing old database with new database...');
  fs.renameSync(newDbPath, oldDbPath);
  
  console.log('Migration completed successfully!');
  console.log(`A backup of the original database is available at ${backupPath}`);
}

// Run the migration
if (require.main === module) {
  migrateDatabase().catch(err => {
    console.error('Migration failed:', err);
    process.exit(1);
  });
}

module.exports = { migrateDatabase };