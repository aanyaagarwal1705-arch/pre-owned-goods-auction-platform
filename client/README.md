# Pre-Owned Goods Auction Platform - Frontend (Client)

This is the React + Vite frontend for the Pre-Owned Goods Auction Platform DBMS College Project.

## Prerequisites
- Node.js (v18+)
- Backend server running on `http://localhost:5000`

## Installation
From the repository root, navigate to the `client` directory and install dependencies:

```powershell
cd client
npm install
```

## Running Development Server
Start the Vite development server:

```powershell
npm run dev
```

The frontend will run at `http://localhost:5173`.

Vite is pre-configured with a development proxy in `vite.config.js` to redirect all `/api/*` network requests to `http://localhost:5000`.

## Building for Production
To build the optimized static assets:

```powershell
npm run build
```

The compiled output will be generated inside `client/dist`.

## Key Viva Features to Demonstrate
1. **Active Demo User Selector**: Switch between buyers (e.g. Rahul Sharma) and sellers (e.g. Aanya Agarwal) in the top navigation bar without complex auth sessions.
2. **Category & Status Filters**: Filter auction cards dynamically using SQL backend endpoints.
3. **Live Bidding**: Place competitive bids with real-time feedback, concurrency protection, and minimum increment calculations.
4. **Seller Listing**: Create pre-owned product listings and start new auctions via atomic database transactions.

