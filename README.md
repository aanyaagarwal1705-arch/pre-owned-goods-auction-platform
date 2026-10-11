# Pre-Owned Goods Auction Platform (DBMS College Project)

A full-stack database management system application for auctioning pre-owned goods with relational integrity, ACID transactions, and pessimistic concurrency control.

---

## Tech Stack
* **Frontend**: React (v18) + Vite (v5) + Plain CSS
* **Backend**: Node.js + Express (v4)
* **Database**: MySQL (`preowned_auction_db`) using `mysql2` with Promise API

---

## Project Structure
```text
pre-owned-goods-auction-platform/
├── database/
│   ├── schema.sql           # Database DDL: 7 tables with PK, FK, and CHECK constraints
│   └── seed.sql             # Sample seed data for users, categories, products, bids
├── server/
│   ├── db.js                # MySQL connection pool
│   ├── server.js            # Express API with parameterized SQL and transactions
│   ├── .env.example         # Template for database credentials
│   └── package.json
├── client/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Navbar.jsx               # Demo user selector & navigation
│   │   │   ├── AuctionCard.jsx          # Marketplace listing card
│   │   │   ├── AuctionDetailModal.jsx   # Live bidding console & bid history table
│   │   │   └── CreateListingModal.jsx   # Seller product & auction creation form
│   │   ├── App.jsx          # Main state, category filters, and search
│   │   ├── index.css        # Responsive styling (no external UI libraries)
│   │   └── main.jsx
│   ├── vite.config.js       # Vite development proxy to port 5000
│   └── package.json
├── .gitignore
└── README.md
```

---

## How to Run the Application

### 1. Database Setup (One-time)
Ensure your MySQL server is running locally and import the schema and seed files:
```powershell
mysql -u root -p < database/schema.sql
mysql -u root -p < database/seed.sql
```

### 2. Backend Setup
In a terminal, navigate to the `server` directory:
```powershell
cd server
npm install
```
Create your `.env` file from the example:
```powershell
cp .env.example .env
```
Open `server/.env` and enter your MySQL password:
```env
PORT=5000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=preowned_auction_db
DB_PORT=3306
```
Start the backend server:
```powershell
npm run dev
```
*(Backend runs on `http://localhost:5000`)*

### 3. Frontend Setup
In a **second terminal**, navigate to the `client` directory:
```powershell
cd client
npm install
npm run dev
```
*(Frontend runs on `http://localhost:5173`)*

Open your browser at: **`http://localhost:5173`**

---

## Key REST API Endpoints
* `GET /api/categories` — Lists all categories for filtering.
* `GET /api/users` — Returns safe user profiles (passwords strictly excluded).
* `GET /api/auctions` — Fetches auctions joined with products, categories, sellers, current price, and bid counts.
* `GET /api/auctions/:id` — Fetches single auction details and full chronological bid history.
* `POST /api/products` — Creates a product and starts its auction within an ACID database transaction.
* `POST /api/bids` — Validates and inserts competitive bids using pessimistic row locking (`FOR UPDATE`).

---

