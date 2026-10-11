// AuctionCard.jsx - Single Auction Card in Marketplace Feed
// Shows product overview, category, condition, current price, and bid counts.

import React from 'react';

export default function AuctionCard({ auction, onSelect }) {
  const isExpired = new Date(auction.end_time) <= new Date() || auction.status === 'ended';
  const isActive = auction.status === 'active' && !isExpired;
  const currentPriceFormatted = Number(auction.current_price).toLocaleString('en-IN', {
    maximumFractionDigits: 2
  });
  const startPriceFormatted = Number(auction.starting_price).toLocaleString('en-IN', {
    maximumFractionDigits: 2
  });
  const minIncFormatted = Number(auction.min_bid_increment).toLocaleString('en-IN', {
    maximumFractionDigits: 2
  });

  return (
    <div className="auction-card">
      {/* Header Badges */}
      <div className="card-header-bar">
        <div className="card-badges">
          <span className={`badge ${isActive ? 'badge-active' : 'badge-ended'}`}>
            {isActive ? '● Active' : '■ Ended'}
          </span>
          <span className="badge badge-category">
            {auction.category_name}
          </span>
        </div>
        <span className="badge badge-condition" title="Product Condition">
          {auction.condition}
        </span>
      </div>

      {/* Main Content */}
      <div className="card-body">
        <h3 className="product-name">{auction.product_name}</h3>
        <p className="product-desc">
          {auction.description || 'No description provided.'}
        </p>

        {/* Pricing Box */}
        <div className="card-pricing">
          <div className="pricing-row">
            <span className="current-price-label">
              {auction.highest_bid ? 'Current Highest Bid' : 'Starting Price'}
            </span>
            <span className="current-price-value">₹{currentPriceFormatted}</span>
          </div>
          <div className="pricing-sub">
            <span>Starts: ₹{startPriceFormatted}</span>
            <span>Min Inc: +₹{minIncFormatted}</span>
          </div>
        </div>

        {/* Footer Meta & Action */}
        <div className="card-footer">
          <div>
            <span>Seller: </span>
            <span className="seller-tag">{auction.seller_name}</span>
            <div style={{ fontSize: '0.75rem', color: isExpired ? '#dc2626' : '#64748b' }}>
              {isExpired ? 'Ended' : `Ends: ${new Date(auction.end_time).toLocaleDateString()}`} • {auction.total_bids} {auction.total_bids === 1 ? 'bid' : 'bids'}
            </div>
          </div>
          <button
            className={`btn btn-sm ${isActive ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => onSelect(auction.auction_id)}
          >
            {isActive ? 'View & Bid' : 'View Results'}
          </button>
        </div>
      </div>
    </div>
  );
}

