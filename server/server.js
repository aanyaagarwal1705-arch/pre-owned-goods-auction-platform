// server.js - Main Express Server Entry Point
// Pre-Owned Goods Auction Platform (DBMS College Project)

const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const { pool, testConnection } = require('./db');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env') });

const app = express();
const PORT = process.env.PORT || 5000;

// -------------------------------------------------------------
// MIDDLEWARE
// -------------------------------------------------------------

// 1. CORS: Allows frontend (e.g. React/Vite on port 5173) to call this API
app.use(cors());

// 2. JSON Parser: Automatically parses incoming JSON bodies (req.body)
app.use(express.json());

// -------------------------------------------------------------
// HELPER FUNCTIONS
// -------------------------------------------------------------

// Helper to format JavaScript dates into MySQL DATETIME ('YYYY-MM-DD HH:MM:SS')
function formatToMySQLDateTime(dateInput) {
  const date = dateInput ? new Date(dateInput) : new Date();
  if (isNaN(date.getTime())) {
    throw new Error('Invalid date value');
  }
  const pad = (n) => String(n).padStart(2, '0');
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  const seconds = pad(date.getSeconds());
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

// Helper: Synchronize expired auctions with the database
// Whenever end_time <= NOW() and status != 'ended', safely marks status as 'ended'
// and determines winner_id based on the highest bid placed (or NULL if no bids).
async function syncExpiredAuctions(auctionId = null) {
  try {
    let sql = `
      UPDATE auctions
      SET 
        status = 'ended',
        winner_id = (
          SELECT buyer_id 
          FROM bids 
          WHERE bids.auction_id = auctions.auction_id 
          ORDER BY bid_amount DESC, bid_time ASC 
          LIMIT 1
        )
      WHERE end_time <= NOW() AND status != 'ended'
    `;
    const params = [];
    if (auctionId) {
      sql += ' AND auction_id = ?';
      params.push(auctionId);
    }
    await pool.query(sql, params);
  } catch (err) {
    console.error('Error synchronizing expired auctions:', err.message);
  }
}

// -------------------------------------------------------------
// SYSTEM & HEALTH ROUTES
// -------------------------------------------------------------

// Root route: Quick check to verify server is running
app.get('/', (req, res) => {
  res.json({
    project: 'Pre-Owned Goods Auction Platform API',
    status: 'Server is running',
    version: '1.0.0'
  });
});

// Health check route: Confirms MySQL connection status and server time
app.get('/api/health', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT 1 + 1 AS test_calc, NOW() AS db_current_time');
    res.json({
      success: true,
      message: 'Server and database are healthy',
      database: process.env.DB_NAME || 'preowned_auction_db',
      dbResponse: rows[0]
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Database connection failed',
      error: error.message
    });
  }
});

// Read-only database verification route: Returns table record counts
app.get('/api/test-db', async (req, res) => {
  try {
    const [tables] = await pool.query('SHOW TABLES');
    const [[usersCount]] = await pool.query('SELECT COUNT(*) AS total FROM users');
    const [[categoriesCount]] = await pool.query('SELECT COUNT(*) AS total FROM categories');
    const [[productsCount]] = await pool.query('SELECT COUNT(*) AS total FROM products');
    const [[auctionsCount]] = await pool.query('SELECT COUNT(*) AS total FROM auctions');
    const [[bidsCount]] = await pool.query('SELECT COUNT(*) AS total FROM bids');
    const [[paymentsCount]] = await pool.query('SELECT COUNT(*) AS total FROM payments');
    const [[reviewsCount]] = await pool.query('SELECT COUNT(*) AS total FROM reviews');

    res.json({
      success: true,
      message: 'Database tables verified successfully',
      tablesFound: tables.length,
      counts: {
        users: usersCount.total,
        categories: categoriesCount.total,
        products: productsCount.total,
        auctions: auctionsCount.total,
        bids: bidsCount.total,
        payments: paymentsCount.total,
        reviews: reviewsCount.total
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error querying database tables',
      error: error.message
    });
  }
});

// -------------------------------------------------------------
// CORE AUCTION PLATFORM API ROUTES
// -------------------------------------------------------------

/**
 * 1. GET /api/categories
 * Returns all categories sorted alphabetically.
 * Used for dropdown filters and product listing forms.
 */
app.get('/api/categories', async (req, res) => {
  try {
    const [categories] = await pool.query(
      'SELECT category_id, category_name FROM categories ORDER BY category_name ASC'
    );
    res.json({
      success: true,
      count: categories.length,
      categories
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch categories',
      error: error.message
    });
  }
});

/**
 * 2. GET /api/users
 * Returns safe user fields for a demonstration user selector.
 * SECURITY: Passwords are NEVER selected or exposed.
 */
app.get('/api/users', async (req, res) => {
  try {
    const [users] = await pool.query(
      'SELECT user_id, name, email, role, phone FROM users ORDER BY user_id ASC'
    );
    res.json({
      success: true,
      count: users.length,
      users
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch users',
      error: error.message
    });
  }
});

/**
 * 3. GET /api/auctions
 * Lists auctions with joined product, category, and seller details,
 * along with the current highest bid and total bid count.
 * 
 * DBMS Concept (Viva Point):
 * Uses INNER JOINs across auctions, products, categories, and users.
 * Uses a LEFT JOIN on an aggregated derived subquery (MAX(bid_amount), COUNT(bid_id))
 * to compute the highest bid without violating ONLY_FULL_GROUP_BY in MySQL.
 * 
 * Optional query params:
 *   ?category_id=1
 *   ?status=active
 *   ?search=laptop
 */
app.get('/api/auctions', async (req, res) => {
  try {
    // 1. Synchronize any expired auctions: if end_time <= NOW(), transition status to 'ended'
    // and assign winner_id to the highest bidder in MySQL.
    await syncExpiredAuctions();

    const { category_id, status, search } = req.query;

    let sql = `
      SELECT 
        a.auction_id,
        a.product_id,
        p.name AS product_name,
        p.description,
        p.condition,
        c.category_id,
        c.category_name,
        u.user_id AS seller_id,
        u.name AS seller_name,
        a.starting_price,
        a.min_bid_increment,
        a.start_time,
        a.end_time,
        CASE WHEN a.end_time <= NOW() THEN 'ended' ELSE a.status END AS status,
        a.winner_id,
        w.name AS winner_name,
        COALESCE(hb.highest_bid, a.starting_price) AS current_price,
        hb.highest_bid,
        COALESCE(hb.total_bids, 0) AS total_bids
      FROM auctions a
      JOIN products p ON a.product_id = p.product_id
      JOIN categories c ON p.category_id = c.category_id
      JOIN users u ON p.seller_id = u.user_id
      LEFT JOIN users w ON a.winner_id = w.user_id
      LEFT JOIN (
        SELECT 
          auction_id, 
          MAX(bid_amount) AS highest_bid, 
          COUNT(bid_id) AS total_bids 
        FROM bids 
        GROUP BY auction_id
      ) hb ON a.auction_id = hb.auction_id
    `;

    const conditions = [];
    const params = [];

    if (category_id) {
      conditions.push('c.category_id = ?');
      params.push(Number(category_id));
    }

    if (status) {
      if (status === 'active') {
        conditions.push("(a.status = 'active' AND a.end_time > NOW())");
      } else if (status === 'ended') {
        conditions.push("(a.status = 'ended' OR a.end_time <= NOW())");
      } else {
        conditions.push('a.status = ?');
        params.push(status);
      }
    }

    if (search) {
      conditions.push('p.name LIKE ?');
      params.push(`%${search.trim()}%`);
    }

    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }

    sql += ' ORDER BY a.auction_id DESC';

    const [auctions] = await pool.query(sql, params);

    res.json({
      success: true,
      count: auctions.length,
      auctions
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch auctions',
      error: error.message
    });
  }
});

/**
 * 4. GET /api/auctions/:id
 * Fetches a single auction by ID with full product details, seller info,
 * and complete chronological bid history (ordered by highest bid first).
 */
app.get('/api/auctions/:id', async (req, res) => {
  try {
    const auctionId = parseInt(req.params.id, 10);
    if (isNaN(auctionId)) {
      return res.status(400).json({ success: false, message: 'Invalid auction ID parameter' });
    }

    // 1. Sync this auction if its end_time has passed
    await syncExpiredAuctions(auctionId);

    // 2. Fetch auction and joined product/seller details
    const [auctionRows] = await pool.query(
      `SELECT 
        a.auction_id,
        a.product_id,
        p.name AS product_name,
        p.description,
        p.condition,
        p.created_at AS product_created_at,
        c.category_id,
        c.category_name,
        u.user_id AS seller_id,
        u.name AS seller_name,
        u.email AS seller_email,
        u.phone AS seller_phone,
        a.starting_price,
        a.min_bid_increment,
        a.start_time,
        a.end_time,
        CASE WHEN a.end_time <= NOW() THEN 'ended' ELSE a.status END AS status,
        a.winner_id,
        w.name AS winner_name
      FROM auctions a
      JOIN products p ON a.product_id = p.product_id
      JOIN categories c ON p.category_id = c.category_id
      JOIN users u ON p.seller_id = u.user_id
      LEFT JOIN users w ON a.winner_id = w.user_id
      WHERE a.auction_id = ?`,
      [auctionId]
    );

    if (auctionRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Auction not found' });
    }

    const auction = auctionRows[0];

    // 2. Fetch bid history for this auction with buyer names
    const [bids] = await pool.query(
      `SELECT 
        b.bid_id,
        b.auction_id,
        b.buyer_id,
        u.name AS buyer_name,
        b.bid_amount,
        b.bid_time
      FROM bids b
      JOIN users u ON b.buyer_id = u.user_id
      WHERE b.auction_id = ?
      ORDER BY b.bid_amount DESC, b.bid_time DESC`,
      [auctionId]
    );

    // Calculate current highest bid and minimum acceptable next bid
    const highestBid = bids.length > 0 ? Number(bids[0].bid_amount) : null;
    const currentPrice = highestBid !== null ? highestBid : Number(auction.starting_price);
    const minNextBid = highestBid !== null
      ? Number((highestBid + Number(auction.min_bid_increment)).toFixed(2))
      : Number(Number(auction.starting_price).toFixed(2));

    res.json({
      success: true,
      auction: {
        ...auction,
        current_price: currentPrice,
        highest_bid: highestBid,
        min_next_bid: minNextBid,
        total_bids: bids.length,
        bids
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch auction details',
      error: error.message
    });
  }
});

/**
 * 5. POST /api/products
 * Creates a product and initiates its corresponding auction.
 * 
 * DBMS Concept (Viva Point):
 * Uses a Database Transaction (beginTransaction, commit, rollback)
 * to maintain ACID properties (Atomicity): a product and its auction
 * must be created together or not at all.
 */
app.post('/api/products', async (req, res) => {
  const {
    seller_id,
    category_id,
    name,
    description,
    condition,
    starting_price,
    min_bid_increment,
    start_time,
    end_time,
    status
  } = req.body;

  // Validation: Check required fields
  if (!seller_id || !category_id || !name || !condition || starting_price === undefined || min_bid_increment === undefined || !end_time) {
    return res.status(400).json({
      success: false,
      message: 'Missing required fields: seller_id, category_id, name, condition, starting_price, min_bid_increment, end_time'
    });
  }

  // Validation: Condition ENUM check ('Excellent', 'Good', 'Fair')
  const validConditions = ['Excellent', 'Good', 'Fair'];
  if (!validConditions.includes(condition)) {
    return res.status(400).json({
      success: false,
      message: `Invalid condition. Must be one of: ${validConditions.join(', ')}`
    });
  }

  // Validation: Positive numeric amounts
  const numStartingPrice = Number(starting_price);
  const numMinBidIncrement = Number(min_bid_increment);
  if (isNaN(numStartingPrice) || numStartingPrice <= 0) {
    return res.status(400).json({ success: false, message: 'starting_price must be a positive number (> 0)' });
  }
  if (isNaN(numMinBidIncrement) || numMinBidIncrement <= 0) {
    return res.status(400).json({ success: false, message: 'min_bid_increment must be a positive number (> 0)' });
  }

  // Validation: Date comparison (end_time > start_time)
  let formattedStart;
  let formattedEnd;
  try {
    const startDateObj = start_time ? new Date(start_time) : new Date();
    const endDateObj = new Date(end_time);

    if (endDateObj <= startDateObj) {
      return res.status(400).json({
        success: false,
        message: 'end_time must be strictly later than start_time'
      });
    }

    formattedStart = formatToMySQLDateTime(startDateObj);
    formattedEnd = formatToMySQLDateTime(endDateObj);
  } catch (err) {
    return res.status(400).json({
      success: false,
      message: 'Invalid date format provided for start_time or end_time'
    });
  }

  // Start Transaction
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // 1. Verify seller exists
    const [sellers] = await connection.query(
      'SELECT user_id, role FROM users WHERE user_id = ?',
      [seller_id]
    );
    if (sellers.length === 0) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: 'Seller user not found' });
    }

    // 2. Verify category exists
    const [cats] = await connection.query(
      'SELECT category_id FROM categories WHERE category_id = ?',
      [category_id]
    );
    if (cats.length === 0) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: 'Category not found' });
    }

    // 3. Insert product record
    const [productResult] = await connection.query(
      'INSERT INTO products (seller_id, category_id, name, description, `condition`) VALUES (?, ?, ?, ?, ?)',
      [seller_id, category_id, name.trim(), description ? description.trim() : '', condition]
    );
    const productId = productResult.insertId;

    // 4. Insert corresponding auction record
    const auctionStatus = status || 'active';
    const [auctionResult] = await connection.query(
      'INSERT INTO auctions (product_id, starting_price, min_bid_increment, start_time, end_time, status) VALUES (?, ?, ?, ?, ?, ?)',
      [productId, numStartingPrice, numMinBidIncrement, formattedStart, formattedEnd, auctionStatus]
    );
    const auctionId = auctionResult.insertId;

    // Commit transaction
    await connection.commit();

    res.status(201).json({
      success: true,
      message: 'Product and auction created successfully',
      data: {
        product_id: productId,
        auction_id: auctionId,
        name: name.trim(),
        seller_id: Number(seller_id),
        category_id: Number(category_id),
        condition,
        starting_price: numStartingPrice,
        min_bid_increment: numMinBidIncrement,
        start_time: formattedStart,
        end_time: formattedEnd,
        status: auctionStatus
      }
    });
  } catch (error) {
    await connection.rollback();
    res.status(500).json({
      success: false,
      message: 'Failed to create product and auction',
      error: error.message
    });
  } finally {
    connection.release();
  }
});

/**
 * 6. POST /api/bids
 * Places a bid on an auction.
 * 
 * DBMS Concept (Viva Point):
 * Implements Concurrency Control using a Transaction and Pessimistic Row Locking (`FOR UPDATE`).
 * When multiple buyers bid at the same time, row-locking prevents race conditions and
 * ensures each bid is evaluated against the true current highest bid.
 */
app.post('/api/bids', async (req, res) => {
  const { auction_id, buyer_id, bid_amount } = req.body;

  // Validation: Check input presence
  if (!auction_id || !buyer_id || bid_amount === undefined || bid_amount === null) {
    return res.status(400).json({
      success: false,
      message: 'auction_id, buyer_id, and bid_amount are required'
    });
  }

  const numericBidAmount = Number(bid_amount);
  if (isNaN(numericBidAmount) || numericBidAmount <= 0) {
    return res.status(400).json({
      success: false,
      message: 'bid_amount must be a positive number (> 0)'
    });
  }

  // Start Transaction with row-level locking
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // 1. Lock auction row with FOR UPDATE to prevent concurrent modifications
    const [auctionRows] = await connection.query(
      `SELECT 
        a.auction_id, 
        a.starting_price, 
        a.min_bid_increment, 
        a.status, 
        a.end_time, 
        p.seller_id,
        p.name AS product_name
      FROM auctions a
      JOIN products p ON a.product_id = p.product_id
      WHERE a.auction_id = ?
      FOR UPDATE`,
      [auction_id]
    );

    if (auctionRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: 'Auction not found' });
    }

    const auction = auctionRows[0];

    // Check if auction has expired based on database/server time (end_time <= NOW())
    const now = new Date();
    const isExpired = new Date(auction.end_time) <= now;

    if (auction.status !== 'active' || isExpired) {
      // If stored status was active but end_time has passed, safely transition to 'ended' in DB
      // and determine the winner from the highest bid
      if (isExpired && auction.status !== 'ended') {
        await connection.query(
          `UPDATE auctions
           SET 
             status = 'ended',
             winner_id = (
               SELECT buyer_id 
               FROM bids 
               WHERE bids.auction_id = ? 
               ORDER BY bid_amount DESC, bid_time ASC 
               LIMIT 1
             )
           WHERE auction_id = ?`,
          [auction_id, auction_id]
        );
        await connection.commit();
      } else {
        await connection.rollback();
      }

      return res.status(400).json({
        success: false,
        message: isExpired
          ? `Cannot place bid: this auction has ended (ended on ${new Date(auction.end_time).toLocaleString()}).`
          : `Cannot place bid: auction is currently '${auction.status}'. Only active auctions accept bids.`
      });
    }

    // Business Rule: Seller cannot bid on their own auction
    if (Number(auction.seller_id) === Number(buyer_id)) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: 'Forbidden: Sellers cannot place bids on their own products.'
      });
    }

    // Validation: Verify buyer exists in users table
    const [buyerRows] = await connection.query(
      'SELECT user_id, name FROM users WHERE user_id = ?',
      [buyer_id]
    );
    if (buyerRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: 'Buyer user not found' });
    }
    const buyerName = buyerRows[0].name;

    // 2. Lock and retrieve current highest bid for this auction
    const [highestBidRows] = await connection.query(
      'SELECT MAX(bid_amount) AS highest_bid FROM bids WHERE auction_id = ? FOR UPDATE',
      [auction_id]
    );

    const highestBid = highestBidRows[0].highest_bid !== null
      ? Number(highestBidRows[0].highest_bid)
      : null;

    // Calculate minimum required bid:
    // If bids exist: new bid must be >= highest_bid + min_bid_increment
    // If no bids yet: new bid must be >= starting_price
    const minRequiredBid = highestBid !== null
      ? Number((highestBid + Number(auction.min_bid_increment)).toFixed(2))
      : Number(Number(auction.starting_price).toFixed(2));

    if (numericBidAmount < minRequiredBid) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: `Bid of ₹${numericBidAmount.toFixed(2)} is too low. Minimum required bid is ₹${minRequiredBid.toFixed(2)}. ${
          highestBid !== null
            ? `(Current highest bid: ₹${highestBid.toFixed(2)} + min increment: ₹${Number(auction.min_bid_increment).toFixed(2)})`
            : `(Starting price: ₹${Number(auction.starting_price).toFixed(2)})`
        }`
      });
    }

    // 3. Insert the new bid
    const [insertResult] = await connection.query(
      'INSERT INTO bids (auction_id, buyer_id, bid_amount) VALUES (?, ?, ?)',
      [auction_id, buyer_id, numericBidAmount]
    );

    // Commit transaction: atomicity guarantees the bid is saved cleanly
    await connection.commit();

    res.status(201).json({
      success: true,
      message: 'Bid placed successfully!',
      bid: {
        bid_id: insertResult.insertId,
        auction_id: Number(auction_id),
        product_name: auction.product_name,
        buyer_id: Number(buyer_id),
        buyer_name: buyerName,
        bid_amount: numericBidAmount,
        previous_highest_bid: highestBid,
        new_highest_bid: numericBidAmount
      }
    });
  } catch (error) {
    await connection.rollback();
    res.status(500).json({
      success: false,
      message: 'Failed to place bid due to server error',
      error: error.message
    });
  } finally {
    connection.release();
  }
});

// -------------------------------------------------------------
// 404 & ERROR HANDLING MIDDLEWARE
// -------------------------------------------------------------

// 404 Handler for undefined routes
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.url}`
  });
});

// Global error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err.stack);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: err.message
  });
});

// -------------------------------------------------------------
// START SERVER
// -------------------------------------------------------------

app.listen(PORT, '0.0.0.0', async () => {  console.log(`===============================================`);
  console.log(`Server listening at: http://localhost:${PORT}`);
  console.log(`Testing database connection...`);
  await testConnection();
  console.log(`===============================================`);
});
