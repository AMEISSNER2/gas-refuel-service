const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Establish a physical file-based local database ledger
const dbPath = path.join(__dirname, 'pennygas_ledger.db');
const db = new sqlite3.Database(dbPath);

// Initialize the data tables inside the database file
db.serialize(() => {
    db.run(`
        CREATE TABLE IF NOT EXISTS transactions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            user_address TEXT,
            network_id INTEGER,
            token_symbol TEXT,
            eth_delivered REAL,
            fee_earned_usd REAL
        )
    `);
    console.log("💾 Secure PennyGas SQLite Accounting Ledger Initialized successfully.");
});

/**
 * Commits a processed transaction block straight to your immutable income audit logs
 */
function logRefuelTransaction(userAddress, networkId, tokenSymbol, ethDelivered, feeEarnedUsd) {
    const query = `INSERT INTO transactions (user_address, network_id, token_symbol, eth_delivered, fee_earned_usd) VALUES (?, ?, ?, ?, ?)`;
    
    db.run(query, [userAddress, networkId, tokenSymbol, ethDelivered, feeEarnedUsd], function(err) {
        if (err) {
            return console.error("❌ Database logging failed:", err.message);
        }
        console.log(`📝 Audit Log Saved! Transaction Entry #${this.lastID} stored safely in file ledger.`);
    });
}

/**
 * Queries the database file and prints an accounting report of your cumulative earnings
 */
function printRevenueReport() {
    console.log(`\n=======================================================`);
    console.log(`📈  PENNYGAS FINANCIAL REVENUE & AUDIT REPORT`);
    console.log(`=======================================================`);

    db.get(`SELECT COUNT(*) as total_tx, SUM(fee_earned_usd) as total_profit FROM transactions`, [], (err, row) => {
        if (err) return console.error(err.message);
        
        console.log(`   🏆 Total Refuels Processed : ${row.total_tx || 0}`);
        console.log(`   💰 Cumulative Revenue (USD): $${(row.total_profit || 0).toFixed(2)}`);
        console.log(`=======================================================\n`);
    });
}

// SIMULATION: Simulate recording two back-to-back 6-cent refills to seed the file
logRefuelTransaction('0x1111...2222', 1, 'USDC', 0.01, 0.06);
logRefuelTransaction('0x3333...4444', 42161, 'USDT', 0.01, 0.06);

// Run the accountant reporter after a brief delay to let records finish writing
setTimeout(printRevenueReport, 500);