// Navbar.jsx - Top Navigation Bar & Demonstration User Selector
// Pre-Owned Goods Auction Platform (DBMS College Project)

import React from 'react';

export default function Navbar({ users, selectedUser, onSelectUser, onOpenCreate, onRefresh, loading }) {
  return (
    <header className="navbar">
      <div className="navbar-container">
        {/* Brand Header */}
        <div className="brand" onClick={onRefresh} title="Click to refresh auctions">
          <div className="brand-icon">⚖️</div>
          <div className="brand-text">
            <h1>Pre-Owned Auction Platform</h1>
            <span>DBMS College Project</span>
          </div>
        </div>

        {/* Navigation Controls & Demo User Selector */}
        <div className="nav-actions">
          {/* Demo User Switcher - Viva point: Allows immediate role demonstration (buyer vs seller) */}
          <div className="user-selector-box" title="Switch active demo user to test buyer or seller permissions">
            <span className="user-selector-label">Active User:</span>
            <select
              className="user-select"
              value={selectedUser ? selectedUser.user_id : ''}
              onChange={(e) => {
                const found = users.find((u) => u.user_id === Number(e.target.value));
                if (found) onSelectUser(found);
              }}
            >
              {users.map((u) => (
                <option key={u.user_id} value={u.user_id}>
                  {u.name} ({u.role})
                </option>
              ))}
            </select>
            {selectedUser && (
              <span className={`role-badge role-${selectedUser.role}`}>
                {selectedUser.role}
              </span>
            )}
          </div>

          {/* Refresh Button */}
          <button
            className="btn btn-outline btn-sm"
            onClick={onRefresh}
            disabled={loading}
            title="Refresh database records"
          >
            {loading ? '⟳ Refreshing...' : '↻ Refresh'}
          </button>

          {/* Create Listing Button */}
          <button
            className="btn btn-primary btn-sm"
            onClick={onOpenCreate}
            title="List a pre-owned good and create an auction"
          >
            + List Product
          </button>
        </div>
      </div>
    </header>
  );
}

