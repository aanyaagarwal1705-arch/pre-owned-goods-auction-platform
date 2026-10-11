// CreateListingModal.jsx - Seller Form to List Pre-Owned Goods
// Submits to POST /api/products which atomically creates product + auction via DB transaction.

import React, { useState } from 'react';

export default function CreateListingModal({
  categories,
  users,
  selectedUser,
  onClose,
  onCreated
}) {
  // Sellers list for dropdown
  const sellers = users.filter((u) => u.role === 'seller' || u.role === 'admin');

  // Default end time: 7 days from today at 18:00
  const getDefaultEndTime = () => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    d.setHours(18, 0, 0, 0);
    // Format for datetime-local: YYYY-MM-DDTHH:mm
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const [sellerId, setSellerId] = useState(
    selectedUser && (selectedUser.role === 'seller' || selectedUser.role === 'admin')
      ? selectedUser.user_id
      : (sellers[0] ? sellers[0].user_id : (users[0] ? users[0].user_id : ''))
  );
  const [categoryId, setCategoryId] = useState(categories[0] ? categories[0].category_id : '');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [condition, setCondition] = useState('Good');
  const [startingPrice, setStartingPrice] = useState('1000');
  const [minBidIncrement, setMinBidIncrement] = useState('100');
  const [endTime, setEndTime] = useState(getDefaultEndTime());

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    // Frontend validations
    if (!name.trim()) {
      setError('Please enter a product name.');
      return;
    }

    const numStart = Number(startingPrice);
    const numInc = Number(minBidIncrement);

    if (isNaN(numStart) || numStart <= 0) {
      setError('Starting price must be a positive number (> 0).');
      return;
    }

    if (isNaN(numInc) || numInc <= 0) {
      setError('Minimum bid increment must be a positive number (> 0).');
      return;
    }

    const endDate = new Date(endTime);
    if (isNaN(endDate.getTime()) || endDate <= new Date()) {
      setError('Auction end time must be in the future.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          seller_id: Number(sellerId),
          category_id: Number(categoryId),
          name: name.trim(),
          description: description.trim(),
          condition,
          starting_price: numStart,
          min_bid_increment: numInc,
          end_time: endTime,
          status: 'active'
        })
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to create listing');
      }

      // Success
      if (onCreated) {
        onCreated(data.message || 'Product and auction created successfully!');
      }
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h3>List a Pre-Owned Product</h3>
            <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
              Creates both Product and Auction entries in a single database transaction
            </span>
          </div>
          <button className="close-btn" onClick={onClose} title="Close">
            ✕
          </button>
        </div>

        <div className="modal-body">
          {error && (
            <div className="alert alert-danger">
              <span>{error}</span>
              <button className="alert-close" onClick={() => setError(null)}>×</button>
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Seller selection */}
            <div className="form-group">
              <label className="form-label">Seller Account</label>
              <select
                className="form-input"
                value={sellerId}
                onChange={(e) => setSellerId(e.target.value)}
                required
              >
                {users.map((u) => (
                  <option key={u.user_id} value={u.user_id}>
                    {u.name} ({u.role}) — ID #{u.user_id}
                  </option>
                ))}
              </select>
            </div>

            {/* Product Name */}
            <div className="form-group">
              <label className="form-label">Product Name *</label>
              <input
                type="text"
                className="form-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Apple iPad 9th Gen 64GB"
                maxLength={150}
                required
              />
            </div>

            {/* Category & Condition in 2-column row */}
            <div className="form-row-2">
              <div className="form-group">
                <label className="form-label">Category *</label>
                <select
                  className="form-input"
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  required
                >
                  {categories.map((c) => (
                    <option key={c.category_id} value={c.category_id}>
                      {c.category_name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Condition *</label>
                <select
                  className="form-input"
                  value={condition}
                  onChange={(e) => setCondition(e.target.value)}
                  required
                >
                  <option value="Excellent">Excellent</option>
                  <option value="Good">Good</option>
                  <option value="Fair">Fair</option>
                </select>
              </div>
            </div>

            {/* Description */}
            <div className="form-group">
              <label className="form-label">Item Description</label>
              <textarea
                className="form-input"
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe pre-owned condition, included accessories, or reasons for selling..."
              />
            </div>

            {/* Starting Price & Minimum Bid Increment */}
            <div className="form-row-2">
              <div className="form-group">
                <label className="form-label">Starting Price (₹) *</label>
                <input
                  type="number"
                  step="1"
                  min="1"
                  className="form-input"
                  value={startingPrice}
                  onChange={(e) => setStartingPrice(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Min Bid Increment (₹) *</label>
                <input
                  type="number"
                  step="1"
                  min="1"
                  className="form-input"
                  value={minBidIncrement}
                  onChange={(e) => setMinBidIncrement(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Auction End Time */}
            <div className="form-group">
              <label className="form-label">Auction End Date & Time *</label>
              <input
                type="datetime-local"
                className="form-input"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                required
              />
              <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                Defaulted to 7 days from today. Must satisfy database constraint: end_time &gt; start_time.
              </span>
            </div>

            {/* Action buttons */}
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
              <button type="button" className="btn btn-outline" onClick={onClose} disabled={loading}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? 'Creating Listing...' : 'Create Listing'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

