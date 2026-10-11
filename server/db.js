// db.js - Database Connection Pool Configuration
// Uses mysql2 with Promise support for clean async/await syntax.

const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from .env file located in the server directory
dotenv.config({ path: path.join(__dirname, '.env') });

// Create a connection pool.
// DBMS Concept: A connection pool maintains an active group of reusable database connections.
// Instead of creating and destroying a TCP connection for every single request,
// the server borrows a connection from the pool and returns it when done.
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'preowned_auction_db',
  port: Number(process.env.DB_PORT) || 3306,
  waitForConnections: true,
  connectionLimit: 10,       // Maximum active connections at any time
  queueLimit: 0              // Unlimited queued requests waiting for a free connection
});

// Helper function to test database connectivity
async function testConnection() {
  try {
    const connection = await pool.getConnection();
    console.log('✓ Successfully connected to MySQL database:', process.env.DB_NAME || 'preowned_auction_db');
    connection.release(); // Return connection back to the pool
    return true;
  } catch (error) {
    console.error('✗ Failed to connect to MySQL database:', error.message);
    return false;
  }
}

module.exports = {
  pool,
  testConnection
};

