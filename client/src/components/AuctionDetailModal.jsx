// AuctionDetailModal.jsx - Detailed View with Live Bidding Console and Bid History
// Connects to GET /api/auctions/:id and POST /api/bids

import React, { useState, useEffect } from 'react';

export default function AuctionDetailModal({
  auctionId,
  selectedUser,
  onClose,
  onBidPlaced
}) {
  const [auction, setAuction] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Bidding form state
  const [bidAmount, setBidAmount] = useState('');
  const [submittingBid, setSubmittingBid] = useState(false);
  const [bidError, setBidError] = useState(null);
  const [bidSuccess, setBidSuccess] = useState(null);

  // Fetch auction details by ID
  const fetchAuctionDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/auctions/${auctionId}`);
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to load auction details');
      }

      setAuction(data.auction);
      // Pre-fill input with the minimum valid next bid
      setBidAmount(data.auction.min_next_bid ? String(data.auction.min_next_bid) : '');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (auctionId) {
      fetchAuctionDetails();
    }
  }, [auctionId]);

  // Handle placing a bid
  const handlePlaceBid = async (e) => {
    e.preventDefault();
    if (!selectedUser) {
      setBidError('Please select a demo user from the navigation bar first.');
      return;
    }

    const numericAmount = Number(bidAmount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      setBidError('Please enter a valid positive bid amount.');
      return;
    }

    setSubmittingBid(true);
    setBidError(null);
    setBidSuccess(null);

    try {
      const res = await fetch('/api/bids', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          auction_id: auction.auction_id,
          buyer_id: selectedUser.user_id,
          bid_amount: numericAmount
        })
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Bid was rejected by server');
      }

      setBidSuccess(`Success! Bid of ₹${numericAmount.toLocaleString('en-IN')} placed for ${data.bid.buyer_name}.`);
      
      // Refresh details to show new highest bid and updated history table
      await fetchAuctionDetails();

      // Notify parent to refresh the main marketplace grid
      if (onBidPlaced) onBidPlaced();
    } catch (err) {
      setBidError(err.message);
    } finally {
      setSubmittingBid(false);
    }
  };

  if (!auctionId) return null;

  // Determine permissions & conditions
  const isSeller = auction && selectedUser && Number(auction.seller_id) === Number(selectedUser.user_id);
  const isExpired = auction ? (new Date(auction.end_time) <= new Date() || auction.status === 'ended') : false;
  const isActive = auction && auction.status === 'active' && !isExpired;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="modal-header">
          <div>
            <h3>{auction ? auction.product_name : 'Auction Details'}</h3>
            {auction && (
              <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                Auction ID: #{auction.auction_id} • Product ID: #{auction.product_id}
              </span>
            )}
          </div>
          <button className="close-btn" onClick={onClose} title="Close">
            ✕
          </button>
        </div>

        <div className="modal-body">
          {loading && (
            <div style={{ textAlign: 'center', padding: '2rem' }}>
              <div className="spinner"></div>
              <p style={{ marginTop: '0.5rem', color: '#64748b' }}>Loading auction information...</p>
            </div>
          )}

          {error && (
            <div className="alert alert-danger">
              <span>{error}</span>
              <button className="alert-close" onClick={() => setError(null)}>×</button>
            </div>
          )}

          {!loading && auction && (
            <>
              {/* Product & Seller Details Grid */}
              <div className="detail-grid">
                <div>
                  <div className="detail-item-label">Category</div>
                  <div className="detail-item-val">{auction.category_name}</div>
                </div>
                <div>
                  <div className="detail-item-label">Condition</div>
                  <div className="detail-item-val">{auction.condition}</div>
                </div>
                <div>
                  <div className="detail-item-label">Seller</div>
                  <div className="detail-item-val">
                    {auction.seller_name} {auction.seller_phone && `(${auction.seller_phone})`}
                  </div>
                </div>
                <div>
                  <div className="detail-item-label">Status</div>
                  <div className="detail-item-val" style={{ textTransform: 'capitalize' }}>
                    <span className={`badge ${isActive ? 'badge-active' : 'badge-ended'}`}>
                      {isActive ? 'Active' : 'Ended'}
                    </span>
                  </div>
                </div>
                <div>
                  <div className="detail-item-label">Starting Price</div>
                  <div className="detail-item-val">
                    ₹{Number(auction.starting_price).toLocaleString('en-IN')}
                  </div>
                </div>
                <div>
                  <div className="detail-item-label">Min Increment</div>
                  <div className="detail-item-val">
                    +₹{Number(auction.min_bid_increment).toLocaleString('en-IN')}
                  </div>
                </div>
                <div>
                  <div className="detail-item-label">Start Time</div>
                  <div className="detail-item-val" style={{ fontSize: '0.8rem' }}>
                    {new Date(auction.start_time).toLocaleString()}
                  </div>
                </div>
                <div>
                  <div className="detail-item-label">End Time</div>
                  <div className="detail-item-val" style={{ fontSize: '0.8rem' }}>
                    {new Date(auction.end_time).toLocaleString()} {isExpired && <span style={{ color: '#dc2626', fontWeight: 700 }}>(Ended)</span>}
                  </div>
                </div>
              </div>

              {/* Description */}
              {auction.description && (
                <div>
                  <div className="detail-item-label" style={{ marginBottom: '0.25rem' }}>Description</div>
                  <p style={{ fontSize: '0.9rem', color: '#334155', background: '#f8fafc', padding: '0.75rem', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                    {auction.description}
                  </p>
                </div>
              )}

              {/* Bidding Console Box */}
              <div className={`bidding-box ${isActive ? 'active-bidding' : ''}`}>
                <div className="bidding-status-row">
                  <div>
                    <div className="detail-item-label">Current Highest Bid</div>
                    <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#059669' }}>
                      ₹{Number(auction.current_price).toLocaleString('en-IN')}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div className="detail-item-label">Minimum Allowed Bid</div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#4f46e5' }}>
                      ₹{Number(auction.min_next_bid).toLocaleString('en-IN')}
                    </div>
                  </div>
                </div>

                {/* Inline Bidding Alert Banners */}
                {bidError && (
                  <div className="alert alert-danger" style={{ marginBottom: '0.75rem' }}>
                    <span>{bidError}</span>
                    <button className="alert-close" onClick={() => setBidError(null)}>×</button>
                  </div>
                )}
                {bidSuccess && (
                  <div className="alert alert-success" style={{ marginBottom: '0.75rem' }}>
                    <span>{bidSuccess}</span>
                    <button className="alert-close" onClick={() => setBidSuccess(null)}>×</button>
                  </div>
                )}

                {/* Seller Warning */}
                {isSeller && (
                  <div className="alert alert-danger" style={{ marginBottom: '0.75rem' }}>
                    <span>⚠️ You are logged in as the seller (<strong>{auction.seller_name}</strong>). Sellers cannot bid on their own listings.</span>
                  </div>
                )}

                {/* Ended Warning */}
                {!isActive && (
                  <div className="alert alert-danger" style={{ marginBottom: '0.75rem' }}>
                    <span>This auction has ended. Winning buyer: <strong>{auction.winner_name || (auction.bids[0] && auction.bids[0].buyer_name) || 'None (No bids placed)'}</strong>. Bidding is closed.</span>
                  </div>
                )}

                {/* Bidding Form */}
                {isActive && (
                  <form onSubmit={handlePlaceBid} className="bidding-form">
                    <div className="form-group">
                      <label className="form-label">
                        Enter Your Bid as <strong>{selectedUser ? selectedUser.name : 'Unknown User'}</strong>:
                      </label>
                      <div className="input-with-currency">
                        <span className="currency-prefix">₹</span>
                        <input
                          type="number"
                          step="1"
                          min={auction.min_next_bid}
                          className="form-input"
                          value={bidAmount}
                          disabled={submittingBid || isSeller}
                          onChange={(e) => setBidAmount(e.target.value)}
                          placeholder={`Min: ₹${auction.min_next_bid}`}
                          required
                        />
                      </div>
                    </div>

                    {/* Quick increment buttons for easy viva presentation */}
                    {!isSeller && (
                      <div className="quick-increments">
                        <span style={{ fontSize: '0.75rem', color: '#64748b', alignSelf: 'center' }}>Quick add:</span>
                        <button
                          type="button"
                          className="quick-inc-btn"
                          onClick={() => setBidAmount(String(Number(auction.min_next_bid)))}
                        >
                        Min (₹{Number(auction.min_next_bid).toLocaleString('en-IN')}) 
                        </button>
                        
{[1, 2, 5].map((multiplier) => {
  const increment = Number(auction.min_bid_increment) * multiplier;

  return (
    <button
      key={multiplier}
      type="button"
      className="quick-inc-btn"
      onClick={() =>
        setBidAmount(
          String(Number(auction.min_next_bid) + increment)
        )
      }
    >
      +₹{increment.toLocaleString('en-IN')}
    </button>
  );
})}

                      </div>
                    )}

                    <button
                      type="submit"
                      className="btn btn-primary"
                      style={{ width: '100%', marginTop: '0.35rem' }}
                      disabled={submittingBid || isSeller}
                    >
                      {submittingBid ? 'Submitting Bid...' : `Place Bid (₹${Number(bidAmount || 0).toLocaleString('en-IN')})`}
                    </button>
                  </form>
                )}
              </div>

              {/* Bid History Table */}
              <div className="bid-history-container">
                <div className="bid-history-title">
                  <span>Bid History ({auction.bids.length} total)</span>
                  <span style={{ fontSize: '0.75rem', fontWeight: 500, color: '#64748b' }}>
                    Ordered by highest bid first
                  </span>
                </div>

                {auction.bids.length === 0 ? (
                  <p style={{ fontSize: '0.85rem', color: '#94a3b8', fontStyle: 'italic', padding: '0.5rem 0' }}>
                    No bids have been placed yet. Be the first to place an opening bid!
                  </p>
                ) : (
                  <table className="history-table">
                    <thead>
                      <tr>
                        <th>Bidder</th>
                        <th>Amount</th>
                        <th>Timestamp</th>
                      </tr>
                    </thead>
                    <tbody>
                      {auction.bids.map((b, idx) => (
                        <tr key={b.bid_id} className={idx === 0 ? 'highest-bid-row' : ''}>
                          <td>
                            {b.buyer_name}
                            {idx === 0 && <span style={{ marginLeft: '0.4rem', fontSize: '0.7rem' }}>🏆 (Highest)</span>}
                          </td>
                          <td>₹{Number(b.bid_amount).toLocaleString('en-IN')}</td>
                          <td>{new Date(b.bid_time).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

