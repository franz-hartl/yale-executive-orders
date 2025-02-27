// Script to delete executive orders before January 20, 2025
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

// Connect to the SQLite database
const db = new sqlite3.Database('./executive_orders.db');

// Begin a transaction for database operations
db.serialize(() => {
    db.run('BEGIN TRANSACTION');

    // Step 1: Get the IDs of executive orders to delete
    db.all(`SELECT id FROM executive_orders WHERE signing_date < '2025-01-20'`, [], (err, rows) => {
        if (err) {
            console.error('Error selecting orders to delete:', err);
            db.run('ROLLBACK');
            db.close();
            return;
        }

        const idsToDelete = rows.map(row => row.id);
        
        if (idsToDelete.length === 0) {
            console.log('No orders to delete.');
            db.run('COMMIT');
            db.close();
            return;
        }

        console.log(`Found ${idsToDelete.length} orders to delete.`);

        // Step 2: Delete from related tables first
        const deleteTasks = [
            deleteFromTable('order_categories', 'order_id', idsToDelete),
            deleteFromTable('order_impact_areas', 'order_id', idsToDelete),
            deleteFromTable('order_university_impact_areas', 'order_id', idsToDelete),
            // Add any other related tables here
        ];

        Promise.all(deleteTasks)
            .then(() => {
                // Step 3: Delete from the main executive_orders table
                return new Promise((resolve, reject) => {
                    const idPlaceholders = idsToDelete.map(() => '?').join(',');
                    const deleteSql = `DELETE FROM executive_orders WHERE id IN (${idPlaceholders})`;
                    
                    db.run(deleteSql, idsToDelete, function(err) {
                        if (err) {
                            console.error('Error deleting from executive_orders:', err);
                            reject(err);
                        } else {
                            console.log(`Deleted ${this.changes} orders from executive_orders.`);
                            resolve();
                        }
                    });
                });
            })
            .then(() => {
                // Step 4: Update JSON files
                return updateJsonFiles();
            })
            .then(() => {
                // Commit the transaction
                db.run('COMMIT', [], (err) => {
                    if (err) {
                        console.error('Error committing transaction:', err);
                        db.run('ROLLBACK');
                    } else {
                        console.log('Transaction committed successfully.');
                    }
                    db.close();
                });
            })
            .catch(err => {
                console.error('Error processing deletions:', err);
                db.run('ROLLBACK');
                db.close();
            });
    });
});

// Function to delete from a related table
function deleteFromTable(tableName, idColumnName, ids) {
    return new Promise((resolve, reject) => {
        const idPlaceholders = ids.map(() => '?').join(',');
        const deleteSql = `DELETE FROM ${tableName} WHERE ${idColumnName} IN (${idPlaceholders})`;
        
        db.run(deleteSql, ids, function(err) {
            if (err) {
                console.error(`Error deleting from ${tableName}:`, err);
                reject(err);
            } else {
                console.log(`Deleted ${this.changes} rows from ${tableName}.`);
                resolve();
            }
        });
    });
}

// Function to update JSON files
function updateJsonFiles() {
    return new Promise((resolve, reject) => {
        // Update the main JSON file with filtered orders
        db.all(`SELECT * FROM executive_orders`, [], (err, orders) => {
            if (err) {
                console.error('Error fetching updated orders:', err);
                reject(err);
                return;
            }
            
            // Update the main executive_orders.json file
            try {
                // Update docs/data/executive_orders.json
                fs.writeFileSync(
                    path.join(__dirname, 'docs', 'data', 'executive_orders.json'), 
                    JSON.stringify(orders, null, 2)
                );
                console.log('Updated docs/data/executive_orders.json');
                
                // Also update public/data/executive_orders.json if it exists
                const publicJsonPath = path.join(__dirname, 'public', 'data', 'executive_orders.json');
                if (fs.existsSync(publicJsonPath)) {
                    fs.writeFileSync(publicJsonPath, JSON.stringify(orders, null, 2));
                    console.log('Updated public/data/executive_orders.json');
                }
                
                resolve();
            } catch (writeErr) {
                console.error('Error writing JSON files:', writeErr);
                reject(writeErr);
            }
        });
    });
}