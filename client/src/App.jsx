// App.jsx - Main Application Component
// Pre-Owned Goods Auction Platform (DBMS College Project)

import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar.jsx';
import AuctionCard from './components/AuctionCard.jsx';
import AuctionDetailModal from './components/AuctionDetailModal.jsx';
import CreateListingModal from './components/CreateListingModal.jsx';
const API_URL = import.meta.env.VITE_API_URL || '';
export default function App() {
  // Core state
  const [auctions, setAuctions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);

  // Filters & Search state
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  // UI state
  const [loading, setLoading] = useState(true);
  const [activeAuctionId, setActiveAuctionId] = useState(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [alert, setAlert] = useState(null); // { type: 'success' | 'danger', message: string }

  // 1. Fetch initial categories & users
  const fetchMetadata = async () => {
    try {
      const [catsRes, usersRes] = await Promise.all([
        fetch(`${API_URL}/api/categories`),
fetch(`${API_URL}/api/users`)
      ]);

      const [catsData, usersData] = await Promise.all([
        catsRes.json(),
        usersRes.json()
      ]);

      if (catsData.success) {
        setCategories(catsData.categories);
      }

      if (usersData.success && usersData.users.length > 0) {
        setUsers(usersData.users);
        // Default to Rahul Sharma (buyer) or first user for immediate testing
        const defaultBuyer = usersData.users.find((u) => u.role === 'buyer') || usersData.users[0];
        setSelectedUser(defaultBuyer);
      }
    } catch (err) {
      console.error('Failed to load initial metadata:', err);
      showAlert('danger', 'Failed to connect to backend server. Make sure server is running on port 5000.');
    }
  };

  // 2. Fetch auctions feed with optional query filters
  const fetchAuctions = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (selectedCategoryId) params.append('category_id', selectedCategoryId);
      if (selectedStatus && selectedStatus !== 'all') params.append('status', selectedStatus);
      if (searchTerm.trim()) params.append('search', searchTerm.trim());

const url = `${API_URL}/api/auctions${params.toString() ? `?${params.toString()}` : ''}`;      const res = await fetch(url);
      const data = await res.json();

      if (data.success) {
        setAuctions(data.auctions);
      } else {
        showAlert('danger', data.message || 'Error fetching auctions');
      }
    } catch (err) {
      console.error('Error fetching auctions:', err);
      showAlert('danger', 'Could not fetch auctions from database.');
    } finally {
      setLoading(false);
    }
  };

  // On mount: load metadata and first set of auctions
  useEffect(() => {
    fetchMetadata();
  }, []);

  // When filters or search change: re-fetch auctions
  useEffect(() => {
    fetchAuctions();
  }, [selectedCategoryId, selectedStatus, searchTerm]);

  const showAlert = (type, message) => {
    setAlert({ type, message });
    // Auto-dismiss after 6 seconds
    setTimeout(() => {
      setAlert((curr) => (curr && curr.message === message ? null : curr));
    }, 6000);
  };

  return (
    <div>
      {/* Top Navigation */}
      <Navbar
        users={users}
        selectedUser={selectedUser}
        onSelectUser={setSelectedUser}
        onOpenCreate={() => setIsCreateOpen(true)}
        onRefresh={() => {
          fetchAuctions();
          showAlert('success', 'Auctions refreshed from MySQL database.');
        }}
        loading={loading}
      />

      <main className="main-container">
        {/* Global Notification Banner */}
        {alert && (
          <div className={`alert alert-${alert.type}`}>
            <span>{alert.message}</span>
            <button className="alert-close" onClick={() => setAlert(null)}>✕</button>
          </div>
        )}

        {/* Hero Section */}
        <section className="hero-section">
          <div className="hero-title">
            <h2>Marketplace Auctions</h2>
            <p>
              Pre-owned goods verified and auctioned with relational database integrity and row-locked concurrency control.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
              Showing <strong>{auctions.length}</strong> items
            </span>
          </div>
        </section>

        {/* Filter and Search Bar */}
        <section className="filter-bar">
          <div className="filter-row-top">
            {/* Search Input */}
            <div className="search-input-wrapper">
              <span className="search-icon">🔍</span>
              <input
                type="text"
                className="search-input"
                placeholder="Search products by title..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {/* Status Tabs */}
            <div style={{ display: 'flex', gap: '0.35rem', background: '#f1f5f9', padding: '0.25rem', borderRadius: '8px' }}>
              {['all', 'active', 'ended'].map((status) => (
                <button
                  key={status}
                  className="category-pill"
                  style={{
                    textTransform: 'capitalize',
                    background: selectedStatus === status ? '#ffffff' : 'transparent',
                    color: selectedStatus === status ? '#0f172a' : '#64748b',
                    boxShadow: selectedStatus === status ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                  }}
                  onClick={() => setSelectedStatus(status)}
                >
                  {status === 'all' ? 'All Auctions' : status}
                </button>
              ))}
            </div>
          </div>

          {/* Category Filter Pills */}
          <div className="category-pills">
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>
              Categories:
            </span>
            <button
              className={`category-pill ${selectedCategoryId === '' ? 'active' : ''}`}
              onClick={() => setSelectedCategoryId('')}
            >
              All Categories
            </button>
            {categories.map((c) => (
              <button
                key={c.category_id}
                className={`category-pill ${selectedCategoryId === String(c.category_id) ? 'active' : ''}`}
                onClick={() =>
                  setSelectedCategoryId(
                    selectedCategoryId === String(c.category_id) ? '' : String(c.category_id)
                  )
                }
              >
                {c.category_name}
              </button>
            ))}
          </div>
        </section>

        {/* Auctions Grid / Feed */}
        {loading && auctions.length === 0 ? (
          <div className="empty-state">
            <div className="spinner"></div>
            <p style={{ marginTop: '0.75rem' }}>Fetching live auctions from MySQL database...</p>
          </div>
        ) : auctions.length === 0 ? (
          <div className="empty-state">
            <h3>No auctions found</h3>
            <p>Try clearing filters or search keywords, or list a new product as a seller.</p>
            <button
              className="btn btn-outline btn-sm"
              style={{ marginTop: '1rem' }}
              onClick={() => {
                setSelectedCategoryId('');
                setSelectedStatus('all');
                setSearchTerm('');
              }}
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="auction-grid">
            {auctions.map((a) => (
              <AuctionCard
                key={a.auction_id}
                auction={a}
                onSelect={(id) => setActiveAuctionId(id)}
              />
            ))}
          </div>
        )}
      </main>

      {/* Auction Detail & Bidding Modal */}
      {activeAuctionId && (
        <AuctionDetailModal
          auctionId={activeAuctionId}
          selectedUser={selectedUser}
          onClose={() => setActiveAuctionId(null)}
          onBidPlaced={() => {
            fetchAuctions();
            showAlert('success', 'Bid was accepted and database updated successfully!');
          }}
        />
      )}

      {/* Create Listing Modal */}
      {isCreateOpen && (
        <CreateListingModal
          categories={categories}
          users={users}
          selectedUser={selectedUser}
          onClose={() => setIsCreateOpen(false)}
          onCreated={(msg) => {
            fetchAuctions();
            showAlert('success', msg);
          }}
        />
      )}
    </div>
  );
}

