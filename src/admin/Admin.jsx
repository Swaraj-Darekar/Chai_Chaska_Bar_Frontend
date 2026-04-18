import React, { useState, useEffect, useRef } from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { API_BASE_URL } from '../api_config';
import './Admin.css';
const getDateKey = (isoString) => {
  if (!isoString) return 'unknown';
  const date = new Date(isoString);
  // Use local date string as key: YYYY-MM-DD
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

const getDateLabel = (dateKey) => {
  if (!dateKey || dateKey === 'unknown') return 'Unknown Date';
  const today = new Date();
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  const yesterdayKey = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;
  
  if (dateKey === todayKey) return 'Today';
  if (dateKey === yesterdayKey) return 'Yesterday';
  
  // Format as: Monday, 14 Apr 2026
  const [y, m, d] = dateKey.split('-');
  const dateObj = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
  return dateObj.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' });
};

const groupOrdersByDate = (orders) => {
  const groups = {};
  orders.forEach(order => {
    const key = getDateKey(order.completed_at || order.created_at);
    if (!groups[key]) {
      groups[key] = { label: getDateLabel(key), orders: [], total: 0, cash: 0, online: 0 };
    }
    groups[key].orders.push(order);
    const amt = parseFloat(order.final_amount || order.total_price) || 0;
    groups[key].total += amt;
    if ((order.payment_mode || '').toLowerCase() === 'cash') {
      groups[key].cash += amt;
    } else {
      groups[key].online += amt;
    }
  });

  // EXPLICIT SORT: Sort keys descending (newest dates first)
  const sortedKeys = Object.keys(groups).sort((a, b) => b.localeCompare(a));
  
  const ordered = {};
  sortedKeys.forEach(k => { 
    // Sort orders within the day by time descending
    groups[k].orders.sort((a, b) => new Date(b.completed_at || b.created_at) - new Date(a.completed_at || a.created_at));
    ordered[k] = groups[k]; 
  });
  return ordered;
};


const DashboardView = ({ 
  activeOrders, 
  tables, 
  activeMenuId, 
  toggleMenu, 
  closeMenu, 
  viewQRCode, 
  downloadQRCode, 
  setSelectedOrder, 
  setShowAddItemModal, 
  setShowViewItemsModal, 
  setShowBillingModal, 
  qrModalData, 
  setQrModalData,
  handleStartOrder,
  walletBalance,
  setMoveOrderData,
  setShowMoveTableModal
}) => (
  <div className="admin-dashboard">
    <div className="stats-grid">
      <div className="stat-item card">
        <p className="stat-label">Total Tables</p>
        <h2 className="stat-value">6</h2>
      </div>
      <div className="stat-item card active-tint">
        <p className="stat-label">Active Sessions</p>
        <h2 className="stat-value">{activeOrders.filter(o => o.status !== 'pending').length}</h2>
      </div>
      <div className="stat-item card">
        <p className="stat-label">Available Tables</p>
        <h2 className="stat-value">{tables.length - activeOrders.filter(o => o.status !== 'pending').length}</h2>
      </div>
      <div className="stat-item card wallet-tint">
        <p className="stat-label">Wallet Balance</p>
        <h2 className="stat-value" style={{ color: walletBalance < 10 ? '#ef4444' : walletBalance < 15 ? '#f59e0b' : undefined }}>₹{Math.round(walletBalance)}</h2>
        {walletBalance < 15 && walletBalance >= 10 && <p style={{ fontSize: '0.7rem', color: '#f59e0b', fontWeight: 700, marginTop: '4px' }}>⚠️ Balance low! Recharge soon.</p>}
        {walletBalance < 10 && <p style={{ fontSize: '0.7rem', color: '#ef4444', fontWeight: 700, marginTop: '4px' }}>🚫 System Locked! Recharge now.</p>}
      </div>
    </div>

    <div className="section-header">
      <h2 className="section-title">Table Management</h2>
      <div className="header-actions">
        <button className="btn-find-booking">
           <span className="icon">🔍</span> Find Order
        </button>
      </div>
    </div>

    <div className="tables-grid" onClick={closeMenu}>
      {tables.map((table) => {
        const activeOrder = activeOrders.find(o => o.table_id === table.id.toString() && ['pending', 'preparing', 'served'].includes(o.status));
        const isOccupied = !!activeOrder;
        
        return (
          <div key={table.id} className={`table-card ${isOccupied ? 'active' : 'available'}`}>
            <div className="table-card-top-actions">
              <div className="table-menu-wrapper">
                <button className="btn-table-menu" onClick={(e) => toggleMenu(e, table.id)}>⋮</button>
                {activeMenuId === table.id && (
                  <div className="table-dropdown shadow-lg">
                    <div className="dropdown-item" onClick={() => { window.open(`/menu?table=${table.id}`, '_blank'); closeMenu(); }}>
                       <span className="icon">📋</span> View Menu
                    </div>
                    <div className="dropdown-item" onClick={() => viewQRCode(table)}>
                       <span className="icon">📱</span> View QR Code
                    </div>
                    <div className="dropdown-item" onClick={() => downloadQRCode(table)}>
                       <span className="icon">⬇️</span> Download QR
                    </div>
                    {isOccupied && (
                      <div className="dropdown-item" onClick={() => { setMoveOrderData(activeOrder); setShowMoveTableModal(true); closeMenu(); }} style={{ color: '#6366f1', fontWeight: 'bold' }}>
                         <span className="icon">🔄</span> Shift Table
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="table-card-main-content">
              <h3 className="table-title">{table.name}</h3>
              {isOccupied && <p className="table-subtitle">OCCUPIED</p>}
              
              {isOccupied ? (
                <div className="active-order-detailed">
                  <div className="order-main-info">
                    <div className="customer-primary">
                      <span className="name">{activeOrder.customer_name}</span>
                      <span className="phone">{activeOrder.customer_phone}</span>
                    </div>
                    <div className="order-total-price">₹{activeOrder.total_price}</div>
                  </div>
                  
                  <div className="order-control-actions">
                    <button className="btn-icon-add" title="Add Menu Item" onClick={() => { setSelectedOrder(activeOrder); setShowAddItemModal(true); }}>+</button>
                    <div className="order-status-mini">
                       {activeOrder.status === 'pending' ? '🔔 New' : '🍳 Preparing'}
                    </div>
                    <button className="btn-icon-eye" title="View Items" onClick={() => { setSelectedOrder(activeOrder); setShowViewItemsModal(true); }}>
                      👁
                    </button>
                  </div>

                  <button className="btn-generate-bill" onClick={() => { setSelectedOrder({...activeOrder, payment_mode: 'online'}); setShowBillingModal(true); }}>
                    Generate Bill
                  </button>
                </div>
              ) : (
                <div className="table-start-action" onClick={() => handleStartOrder(table.id)} style={{ cursor: 'pointer' }}>
                  <div className="start-icon-circle">
                    <span className="plus-icon">+</span>
                  </div>
                  <span className="start-label">START</span>
                </div>
              )}
            </div>
          </div>
        );
      })}

      <div className="table-card takeaway-card">
        <div className="table-card-main-content">
          <h3 className="table-title text-white">Take Away</h3>
          <p className="table-subtitle opacity-70">CAFÉ ORDERS</p>
          <div className="table-start-action mt-auto" onClick={() => handleStartOrder('Takeaway')} style={{ cursor: 'pointer' }}>
            <div className="start-icon-circle bg-gray-dark">
              <span className="plus-icon white">+</span>
            </div>
            <span className="start-label white">START</span>
          </div>
        </div>
      </div>
    </div>

    {qrModalData && (
      <div className="qr-modal-overlay" onClick={() => setQrModalData(null)}>
        <div className="qr-modal-content card shadow-2xl" onClick={e => e.stopPropagation()}>
          <button className="modal-close" onClick={() => setQrModalData(null)}>×</button>
          <div className="modal-body">
            <h2 className="modal-title">{qrModalData.name} QR Code</h2>
            <p className="modal-desc">Scan to open digital menu on phone</p>
            <div className="qr-image-wrapper">
              <img 
                src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(window.location.origin + '/menu?table=' + qrModalData.id)}`} 
                alt="QR Code" 
              />
            </div>
            <div className="modal-actions">
              <button className="btn-download-modal" onClick={() => downloadQRCode(qrModalData)}>Download PNG</button>
            </div>
          </div>
        </div>
      </div>
    )}
  </div>
);


const HistoryView = ({ 
  historyOrders, 
  fetchHistory, 
  historySearchQuery, 
  setHistorySearchQuery, 
  expandedDates, 
  setExpandedDates, 
  setHistoryViewOrder, 
  historyViewOrder 
}) => {
  useEffect(() => { fetchHistory(); }, []);

  const today = new Date();
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  const filteredOrders = historyOrders.filter(order => {
    const search = historySearchQuery.toLowerCase();
    return (
      (order.customer_name?.toLowerCase().includes(search)) ||
      (order.customer_phone?.toLowerCase().includes(search)) ||
      (order.table_id?.toString().includes(search)) ||
      (order.id?.toString().includes(search))
    );
  });

  const grouped = groupOrdersByDate(filteredOrders);
  const dateKeys = Object.keys(grouped);

  const toggleDate = (key) => {
    setExpandedDates(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Auto-expand today on first load
  useEffect(() => {
    setExpandedDates(prev => (prev[todayKey] === undefined ? { ...prev, [todayKey]: true } : prev));
  }, [historyOrders]);

  const totalRevenue = historyOrders.reduce((s, o) => s + (parseFloat(o.final_amount || o.total_price) || 0), 0);
  const todayGroup = grouped[todayKey];
  const todayRevenue = todayGroup ? todayGroup.total : 0;

  return (
    <div className="admin-history">
      {/* Header + Search */}
      <div className="history-header-v2">
        <div className="history-title-group">
          <h2 className="section-title">Billing Records</h2>
          <p className="section-desc">All settled bills grouped by date — click a date to expand</p>
        </div>
        <div className="history-controls">
          <div className="history-search-wrapper">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              placeholder="Search by name, phone or table..."
              value={historySearchQuery}
              onChange={(e) => setHistorySearchQuery(e.target.value)}
            />
          </div>
          <button className="btn-refresh-history" onClick={fetchHistory} title="Refresh">
            🔄
          </button>
        </div>
      </div>

      {/* Column Header */}
      {dateKeys.length > 0 && (
        <div className="h-table-col-header">
          <span className="h-col h-col-table">Table</span>
          <span className="h-col h-col-name">Customer</span>
          <span className="h-col h-col-payment">Payment</span>
          <span className="h-col h-col-items">Items</span>
          <span className="h-col h-col-time">Time</span>
          <span className="h-col h-col-total">Total</span>
        </div>
      )}

      {/* Empty State */}
      {dateKeys.length === 0 ? (
        <div className="history-empty-state">
          <div className="empty-icon">🧾</div>
          <h3>No Billing History Yet</h3>
          <p>Bills will appear here once a table is settled.</p>
        </div>
      ) : (
        <div className="history-list">
          {dateKeys.map((key) => {
            const group = grouped[key];
            const isExpanded = !!expandedDates[key];

            return (
              <div key={key} className={`history-day-card ${isExpanded ? 'expanded' : ''}`}>
                {/* Date Header / Dropdown Toggle */}
                <div className={`h-day-header ${isExpanded ? 'active' : ''}`} onClick={() => toggleDate(key)}>
                  <div className="h-day-left">
                    <div className="h-day-dot"></div>
                    <span className="h-day-title">{group.label}</span>
                    <span className="h-day-count">{group.orders.length} bill{group.orders.length !== 1 ? 's' : ''}</span>
                  </div>
                  <div className="h-day-right">
                    <div className="h-day-payment-split">
                      <span className="split-cash">💵 ₹{group.cash.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                      <span className="split-online">📱 ₹{group.online.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                    </div>
                    <span className="h-day-total">₹{group.total.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                    <span className={`h-day-chevron ${isExpanded ? 'up' : ''}`}>▾</span>
                  </div>
                </div>

                {/* Expanded Orders Table */}
                {isExpanded && (
                  <div className="h-day-content">
                    {group.orders.map((order, idx) => {
                      const timeStr = order.completed_at
                        ? new Date(order.completed_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
                        : '—';
                      const payMode = (order.payment_mode || 'online').toLowerCase();
                      const finalAmt = parseFloat(order.final_amount || order.total_price) || 0;

                      return (
                        <div key={order.id} className={`h-order-row ${idx % 2 === 0 ? 'even' : 'odd'}`}>
                          {/* Table Number */}
                          <div className="h-col h-col-table">
                            <span className="h-table-badge">
                              {order.table_id === 'Takeaway' ? '🥡' : `T${order.table_id}`}
                            </span>
                          </div>

                          {/* Customer Name */}
                          <div className="h-col h-col-name">
                            <span className="h-customer-name">{order.customer_name || '—'}</span>
                          </div>

                          {/* Payment Mode */}
                          <div className="h-col h-col-payment">
                            <span className={`h-pay-badge ${payMode}`}>
                              {payMode === 'cash' ? '💵 Cash' : '📱 Online'}
                            </span>
                          </div>

                          {/* View Items Button */}
                          <div className="h-col h-col-items">
                            <button
                              className="h-btn-view"
                              onClick={(e) => { e.stopPropagation(); setHistoryViewOrder(order); }}
                            >
                              👁 View
                            </button>
                          </div>

                          {/* Billing Time */}
                          <div className="h-col h-col-time">
                            <span className="h-time">{timeStr}</span>
                          </div>

                          {/* Total Bill */}
                          <div className="h-col h-col-total">
                            <span className="h-price-val">₹{finalAmt.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                            {parseFloat(order.discount) > 0 && (
                              <span className="h-discount-text">-₹{order.discount} off</span>
                            )}
                          </div>
                        </div>
                      );
                    })}

                    {/* Day Footer */}
                    <div className="h-day-footer">
                      <span>{group.orders.length} order{group.orders.length !== 1 ? 's' : ''} settled on {group.label}</span>
                      <span className="h-f-total">₹{group.total.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Order Items Popup */}
      {historyViewOrder && (
        <div className="h-items-overlay" onClick={() => setHistoryViewOrder(null)}>
          <div className="h-items-modal" onClick={e => e.stopPropagation()}>
            <div className="h-items-modal-header">
              <div className="h-items-header-left">
                <div className="h-items-table-badge">
                  {historyViewOrder.table_id === 'Takeaway' ? '🥡' : `T${historyViewOrder.table_id}`}
                </div>
                <div>
                  <h3 className="h-items-title">
                    {historyViewOrder.table_id === 'Takeaway' ? 'Take Away Order' : `Table ${historyViewOrder.table_id}`}
                  </h3>
                  <p className="h-items-subtitle">{historyViewOrder.customer_name} • {historyViewOrder.customer_phone}</p>
                </div>
              </div>
              <button className="h-items-close" onClick={() => setHistoryViewOrder(null)}>×</button>
            </div>

            <div className="h-items-meta-row">
              <span className={`h-pay-badge ${(historyViewOrder.payment_mode || 'online').toLowerCase()}`}>
                {(historyViewOrder.payment_mode || 'online').toLowerCase() === 'cash' ? '💵 Cash' : '📱 Online'}
              </span>
              <span className="h-items-time">
                🕐 {historyViewOrder.completed_at ? new Date(historyViewOrder.completed_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'N/A'}
              </span>
            </div>

            <div className="h-items-divider"></div>

            <div className="h-items-list-header">
              <span>Item Name</span>
              <span>Qty</span>
              <span>Amount</span>
            </div>

            <div className="h-items-list">
              {(historyViewOrder.items || []).map((it, i) => (
                <div key={i} className="h-items-list-row">
                  <span className="item-name">{it.item_name}</span>
                  <span className="item-qty">×{it.quantity}</span>
                  <span className="item-amt">₹{(it.item_price * it.quantity).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                </div>
              ))}
            </div>

            <div className="h-items-divider"></div>

            <div className="h-items-summary">
              <div className="h-sum-row">
                <span>Subtotal</span>
                <span>₹{parseFloat(historyViewOrder.total_price || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
              </div>
              {parseFloat(historyViewOrder.discount) > 0 && (
                <div className="h-sum-row discount">
                  <span>Discount</span>
                  <span>−₹{historyViewOrder.discount}</span>
                </div>
              )}
              <div className="h-sum-row grand">
                <span>Grand Total</span>
                <span>₹{parseFloat(historyViewOrder.final_amount || historyViewOrder.total_price || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


const AnalyticsCard = ({ icon, title, amount, badges, breakdown, desc }) => (
  <div className="analytics-card">
    <div className="card-top">
      <div className="analytics-icon-box">{icon}</div>
      <div className="card-info">
        <p className="card-title">{title}</p>
        <h3 className="card-amount">₹{amount}</h3>
      </div>
    </div>
    
    {(badges || breakdown || desc) && (
      <div className="card-footer">
        {badges && (
          <div className="card-badges">
            {badges.map((b, i) => (
              <span key={i} className={`mini-badge ${b.type}`}>{b.label}</span>
            ))}
          </div>
        )}
        {breakdown && (
          <div className="card-breakdown">
            <span className="on">On: ₹{breakdown.online}</span>
            <span className="ca">Ca: ₹{breakdown.cash}</span>
          </div>
        )}
        {desc && <p className="card-desc">{desc}</p>}
      </div>
    )}
  </div>
);

const AnalyticsView = ({ historyOrders, expenses, settlements, onSettle, onViewSettlementExpenses }) => {
  const today = new Date();
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  const yesterdayKey = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;

  const grouped = groupOrdersByDate(historyOrders);
  
  // Today's Stats
  const todayData = grouped[todayKey] || { total: 0, orders: [], cash: 0, online: 0 };
  
  // Yesterday's Stats
  const yesterdayData = grouped[yesterdayKey] || { total: 0, orders: [], cash: 0, online: 0 };
  
  // Monthly Stats (Current period items only)
  const monthlySales = historyOrders.reduce((acc, o) => acc + (parseFloat(o.final_amount || o.total_price) || 0), 0);
  const totalExpenses = expenses.reduce((acc, e) => acc + (parseFloat(e.amount) || 0), 0);
  const netProfit = monthlySales - totalExpenses;

  return (
    <div className="admin-analytics">
      <div className="analytics-header">
        <div className="header-left">
          <h2 className="section-title">Business Analytics</h2>
          <p className="section-desc">Financial performance since last settlement</p>
        </div>
        <div className="header-right">
          <button className="btn-settle" onClick={onSettle}>Settle This Month</button>
        </div>
      </div>

      <div className="analytics-grid">
        <AnalyticsCard 
          icon="💰" 
          title="Today's Sales" 
          amount={todayData.total.toLocaleString('en-IN', { maximumFractionDigits: 0 })} 
          badges={[{ label: `${todayData.orders.length} Orders`, type: 'bookings' }]}
          breakdown={{ online: todayData.online.toLocaleString('en-IN', { maximumFractionDigits: 0 }), cash: todayData.cash.toLocaleString('en-IN', { maximumFractionDigits: 0 }) }}
        />
        <AnalyticsCard 
          icon="📊" 
          title="Yesterday's Sales" 
          amount={yesterdayData.total.toLocaleString('en-IN', { maximumFractionDigits: 0 })} 
          badges={[
            { label: `${yesterdayData.orders.length} Orders`, type: 'bookings' }
          ]}
          breakdown={{ online: yesterdayData.online.toLocaleString('en-IN', { maximumFractionDigits: 0 }), cash: yesterdayData.cash.toLocaleString('en-IN', { maximumFractionDigits: 0 }) }}
        />
        <AnalyticsCard 
          icon="📅" 
          title="This Month Sales" 
          amount={monthlySales.toLocaleString('en-IN', { maximumFractionDigits: 0 })} 
          desc={`Calculated from ${historyOrders.length} records`}
        />
        <AnalyticsCard 
          icon="📉" 
          title="This Month Expense" 
          amount={totalExpenses.toLocaleString('en-IN', { maximumFractionDigits: 0 })} 
          desc={`${expenses.length} Active Records`}
        />
        <AnalyticsCard 
          icon="📈" 
          title="Net Profit" 
          amount={netProfit.toLocaleString('en-IN', { maximumFractionDigits: 0 })} 
          desc="Current Period"
        />
      </div>

      <div className="settlement-history-section" style={{ marginTop: '2rem' }}>
        <h3 className="section-title" style={{ marginBottom: '1.5rem' }}>Monthly Profit & Loss History</h3>
        
        {settlements.length === 0 ? (
          <div className="no-data-card" style={{ padding: '40px' }}>
            <p>No historical settlements found.</p>
          </div>
        ) : (
          <div className="settlement-history-list" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '1.5rem' }}>
            {settlements.map((s) => (
              <div key={s.id} className="analytics-card" style={{ borderLeft: '5px solid #6366f1' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                  <h4 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '800' }}>{s.month_name}</h4>
                  <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: '600' }}>#{s.id}</span>
                </div>
                
                <div className="settlement-stats-mini" style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '1.5rem' }}>
                  <div style={{ background: '#f8fafc', padding: '8px 12px', borderRadius: '10px', flex: '1 1 100px' }}>
                    <p style={{ margin: 0, fontSize: '0.7rem', color: '#64748b', fontWeight: 700 }}>SALES</p>
                    <p style={{ margin: 0, fontWeight: 800 }}>₹{s.total_sales.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
                  </div>
                  <div style={{ background: '#f8fafc', padding: '8px 12px', borderRadius: '10px', flex: '1 1 100px' }}>
                    <p style={{ margin: 0, fontSize: '0.7rem', color: '#64748b', fontWeight: 700 }}>EXPENSES</p>
                    <p style={{ margin: 0, fontWeight: 800, color: '#ef4444' }}>₹{s.total_expenses.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
                  </div>
                  <div style={{ background: '#f0fdf4', padding: '8px 12px', borderRadius: '10px', flex: '1 1 100px' }}>
                    <p style={{ margin: 0, fontSize: '0.7rem', color: '#15803d', fontWeight: 700 }}>NET PROFIT</p>
                    <p style={{ margin: 0, fontWeight: 800, color: '#10b981' }}>₹{s.net_profit.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
                  </div>
                </div>
                
                <button 
                  className="btn-filter" 
                  style={{ width: '100%', padding: '10px', background: '#eff6ff', color: '#2563eb', fontWeight: 700 }}
                  onClick={() => onViewSettlementExpenses(s.id)}
                >
                  👁️ View Expense Records
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};


const ExpensesView = ({ expenses, setExpenses, addNotification }) => {
  const [formData, setFormData] = useState({
    name: '',
    amount: '',
    date: new Date().toISOString().split('T')[0]
  });

  const handleAddExpense = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.amount) {
      addNotification('Please fill in both name and amount', 'error');
      return;
    }
    try {
      const res = await fetch(`${API_BASE_URL}/api/expenses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          amount: parseFloat(formData.amount),
          date: formData.date
        })
      });
      if (res.ok) {
        const newExp = await res.json();
        setExpenses([newExp, ...expenses]);
        setFormData({ name: '', amount: '', date: new Date().toISOString().split('T')[0] });
        addNotification('Expense recorded successfully!', 'success');
      }
    } catch (e) {
      addNotification('Failed to record expense', 'error');
    }
  };

  return (
    <div className="admin-expenses">
      <div className="expenses-header">
        <h2 className="section-title">Expense Management</h2>
        <p className="section-desc">Track and manage your business expenditures</p>
      </div>
      <div className="expenses-grid">
        <div className="expense-card form-card">
          <h3 className="card-subtitle">Add New Expense</h3>
          <form onSubmit={handleAddExpense} className="expense-form">
            <div className="form-group">
              <label>Expense Name</label>
              <input type="text" placeholder="e.g. Rent, Electricity" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} />
            </div>
            <div className="form-group">
              <label>Amount (₹)</label>
              <input type="number" placeholder="0.00" value={formData.amount} onChange={(e) => setFormData({...formData, amount: e.target.value})} />
            </div>
            <div className="form-group">
              <label>Date</label>
              <input type="date" value={formData.date} onChange={(e) => setFormData({...formData, date: e.target.value})} />
            </div>
            <button type="submit" className="btn-add-expense">Add Expense</button>
          </form>
        </div>
        <div className="expense-card list-card">
          <h3 className="card-subtitle">Recent Expenses</h3>
          <div className="expenses-list">
            {expenses.length === 0 ? (
              <div className="no-data-card"><p>No expenses recorded yet.</p></div>
            ) : (
              expenses.map(exp => (
                <div key={exp.id} className="expense-row-card">
                  <div className="expense-info">
                    <div className="expense-icon-bg">💸</div>
                    <div className="expense-details">
                      <h4 className="expense-name">{exp.name}</h4>
                      <span className="expense-date">{exp.date}</span>
                    </div>
                  </div>
                  <div className="expense-actions">
                    <span className="expense-amount">₹{exp.amount}</span>
                    <button className="btn-delete-card" onClick={async () => {
                      if (!window.confirm("Remove this expense?")) return;
                      try {
                        const res = await fetch(`${API_BASE_URL}/api/expenses/${exp.id}`, { method: 'DELETE' });
                        if (res.ok) {
                          setExpenses(expenses.filter(e => e.id !== exp.id));
                          addNotification('Expense removed', 'success');
                        }
                      } catch (e) {
                        addNotification('Failed to remove expense', 'error');
                      }
                    }} title="Delete Expense">🗑️</button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const OrdersView = ({ activeOrders, handleUpdateOrderStatus, setSelectedOrder, setShowBillingModal, handleDeleteItemFromOrder, setShowAddItemModal }) => {
  const visibleOrders = activeOrders
    .filter(o => o.status === 'preparing' || o.status === 'served')
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  return (
    <div className="admin-orders-view">
      <div className="view-header-row">
        <h2 className="view-page-title">Active Orders Overview</h2>
        <span className="pending-badge">{visibleOrders.length} Pending Actions</span>
      </div>
      <div className="orders-grid">
        {visibleOrders.length === 0 ? (<div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '60px', color: '#94a3b8', background: '#f8fafc', borderRadius: '20px', fontSize: '1.2rem', fontWeight: 'bold' }}>No active orders at the moment.</div>) : visibleOrders.map(order => (
          <div key={order.id} className="order-manage-card" style={{ borderTop: order.status === 'served' ? '5px solid #10b981' : '5px solid #f59e0b', display: 'flex', flexDirection: 'column' }}>
            <div className="card-header" style={{ marginBottom: '20px' }}><div className="table-id-badge" style={{fontSize: '1.5rem', padding: '15px', background: order.status === 'served' ? '#10b981' : '#6366f1'}}>{order.table_id === 'Takeaway' ? '🥡' : `T${order.table_id}`}</div><div className="order-meta" style={{ gap: '4px' }}><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}><span className="customer-name" style={{fontSize: '1.25rem', fontWeight: '900'}}>{order.customer_name}</span><button className="btn-add-item-card" onClick={() => { setSelectedOrder(order); setShowAddItemModal(true); }}>+ Add</button></div><span className="customer-phone" style={{fontSize: '0.9rem', color: '#64748b', fontWeight: '700'}}>📞 {order.customer_phone}</span><span className="order-time" style={{ background: '#f1f5f9', display: 'inline-block', padding: '4px 8px', borderRadius: '6px', width: 'fit-content', marginTop: '4px' }}>{order.status === 'preparing' ? '⏳ Preparing' : '✅ Ready'} • {new Date(order.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span></div></div>
            <div className="card-items" style={{ maxHeight: '220px', overflowY: 'auto', minHeight: '120px', flex: 1, display: 'flex', flexDirection: 'column', gap: '8px', padding: '15px' }}>
              {order.items.map((item, idx) => (
                <div key={idx} className="item-line" style={{fontSize: '1.1rem', paddingBottom: '8px', borderBottom: '1px solid #e2e8f0', display: 'flex', gap: '10px', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <span style={{color: '#6366f1', fontWeight: '900'}}>{item.quantity}x</span>
                    <span style={{fontWeight: '700', color: '#334155'}}>{item.item_name}</span>
                  </div>
                  <button className="btn-delete-order-item" onClick={() => handleDeleteItemFromOrder(order.id, item.id)}>🗑️</button>
                </div>
              ))}
            </div>
            <div className="card-footer" style={{ marginTop: 'auto', paddingTop: '20px' }}><div className="total" style={{fontSize: '1.4rem', color: '#ef4444'}}>₹{order.total_price}</div><div className="actions">{order.status === 'preparing' ? (<button className="btn-status-next preparing" style={{ padding: '12px 20px', fontSize: '1rem', width: '100%' }} onClick={() => handleUpdateOrderStatus(order.id, 'served')}>✔️ Mark Ready</button>) : (<button className="btn-status-next done" style={{ padding: '12px 20px', fontSize: '1rem', background: '#1e293b', width: '100%' }} onClick={() => { setSelectedOrder({...order, payment_mode: 'online'}); setShowBillingModal(true); }}>💳 Pay & Complete</button>)}</div></div>
          </div>))}
      </div>
    </div>
  );
};

const NotificationToasts = ({ newOrderNotifications, handleRejectOrder, handleAcceptOrder }) => (
  <div className="notification-container">
    {newOrderNotifications.map(order => (
      <div key={order.id} className="order-toast-card modern-toast">
        <div className="toast-header-modern">
          <div className="toast-pulse-dot"></div>
          <div className="toast-title-wrap">
            <h4 className="toast-title">New Order Received</h4>
            <p className="toast-subtitle">{new Date(order.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
          </div>
          <button className="btn-close-toast" onClick={() => handleRejectOrder(order.id)}>✕</button>
        </div>
        <div className="toast-body-modern">
          <div className="toast-info-grid">
            <div className="info-box table-box">
              <span className="label">Order Type</span>
              <span className="value t-badge">{order.table_id === 'Takeaway' ? '🥡 Takeaway' : `Table ${order.table_id}`}</span>
            </div>
            <div className="info-box">
              <span className="label">Customer</span>
              <span className="value">{order.customer_name}</span>
            </div>
          </div>
          <div className="toast-items-modern">
            <span className="items-label">Order Items</span>
            <div className="items-scroll">
              {order.items.map((item, idx) => (
                <div key={idx} className="toast-item-row-modern">
                  <span className="item-qty">{item.quantity}×</span>
                  <span className="item-name">{item.item_name}</span>
                  <span className="item-price">₹{item.item_price * item.quantity}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="toast-footer-modern">
          <div className="toast-total-wrap">
            <span className="total-label">Amount</span>
            <span className="total-val">₹{order.total_price}</span>
          </div>
          <div className="toast-actions">
            <button className="btn-reject" onClick={() => handleRejectOrder(order.id)}>Reject</button>
            <button className="btn-accept" onClick={() => handleAcceptOrder(order.id)}>Accept</button>
          </div>
        </div>
      </div>))}
  </div>
);


const SettingsView = ({
  addNotification,
  fetchMenuData,
  categories,
  setCategories,
  menuItems,
  setMenuItems
}) => {
  const [settings, setSettings] = useState({
    upiId: 'paytm.slzkdbs@pty',
    businessName: 'Pool Cafe',
    mccCode: '0000',
    commission: '2',
    commissionEnabled: true
  });
  const [showAddModal, setShowAddModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [newItem, setNewItem] = useState({ name: '', price: '', category_id: '', image_url: '' });
  const [newCategoryName, setNewCategoryName] = useState('');

  const handleAddCategory = async () => {
    if (!newCategoryName) return;
    try {
      const catPost = await fetch(`${API_BASE_URL}/api/categories`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newCategoryName })
      });
      const catData = await catPost.json();
      setCategories([...categories, catData]);
      setNewCategoryName('');
      addNotification('Category added successfully!', 'success');
    } catch(e) { addNotification('Failed to add category', 'error'); }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => { setNewItem({ ...newItem, image_url: reader.result }); };
      reader.readAsDataURL(file);
    }
  };

  const handleDeleteItem = async (id) => {
    if(!window.confirm("Are you sure you want to delete this item?")) return;
    try {
      await fetch(`${API_BASE_URL}/api/menu/${id}`, { method: 'DELETE' });
      fetchMenuData(); 
    } catch (e) { console.error(e); }
  };

  const handleEditItemPrice = async (item) => {
    const newPrice = window.prompt(`Enter new price for ${item.name}:`, item.price);
    if(newPrice && !isNaN(newPrice)){
      try {
        await fetch(`${API_BASE_URL}/api/menu/${item.id}`, {
          method: 'PUT',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({...item, price: parseFloat(newPrice)})
        });
        fetchMenuData();
      } catch(e) { console.error(e); }
    }
  };

  const handleEditCategoryName = async (cat) => {
    const newName = window.prompt("Enter new category name:", cat.name);
    if(newName && newName.trim() !== "") {
      try {
        await fetch(`${API_BASE_URL}/api/categories/${cat.id}`, {
          method: 'PUT',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({...cat, name: newName})
        });
        fetchMenuData();
      } catch(e) { console.error(e); }
    }
  };

  const handleDeleteCategory = async (cat) => {
    const itemsInCat = menuItems.filter(item => item.category_id === cat.id);
    const msg = itemsInCat.length > 0
      ? `"${cat.name}" has ${itemsInCat.length} item(s). Deleting it will remove ALL items inside. Continue?`
      : `Delete category "${cat.name}"? This cannot be undone.`;
    if (!window.confirm(msg)) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/categories/${cat.id}`, { method: 'DELETE' });
      if (res.ok) {
        setCategories(prev => prev.filter(c => c.id !== cat.id));
        setMenuItems(prev => prev.filter(i => i.category_id !== cat.id));
        addNotification(`Category "${cat.name}" deleted!`, 'success');
      } else {
        addNotification('Failed to delete category', 'error');
      }
    } catch(e) { addNotification('Failed to delete category', 'error'); }
  };

  const handleUpdateItemImage = (item) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onloadend = async () => {
        try {
          const res = await fetch(`${API_BASE_URL}/api/menu/${item.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...item, image_url: reader.result })
          });
          if (res.ok) {
            fetchMenuData();
            addNotification(`Image updated for "${item.name}"!`, 'success');
          } else {
            addNotification('Failed to update image', 'error');
          }
        } catch(e) { addNotification('Failed to update image', 'error'); }
      };
      reader.readAsDataURL(file);
    };
    input.click();
  };

  const handleAddItem = async () => {
    if (!newItem.name || !newItem.price || !newItem.category_id) { addNotification('Please choose category, name and price.', 'error'); return; }
    try {
      const fallbackImage = 'https://images.unsplash.com/photo-1541167760496-1628856ab772?q=80&w=300&auto=format&fit=crop';
      await fetch(`${API_BASE_URL}/api/menu`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newItem.name, price: parseFloat(newItem.price), category_id: parseInt(newItem.category_id), image_url: newItem.image_url || fallbackImage })
      });
      setShowAddModal(false);
      setNewItem({ name: '', price: '', category_id: '', image_url: '' });
      addNotification('Item added successfully!', 'success');
    } catch (e) { addNotification('Failed to add item', 'error'); }
  };

  const handleSave = () => { addNotification('Settings saved successfully!', 'success'); };

  return (
    <div className="admin-settings">
      <div className="settings-view-header">
        <div className="header-text">
          <h2 className="section-title">Café Settings</h2>
          <div className="subtitle-row">
            <p className="section-desc">Manage payment and inventory.</p>
            <span className="live-status">• LIVE DATABASE CONNECTED</span>
          </div>
        </div>
      </div>
      <div className="settings-grid">
        <div className="settings-card">
          <div className="card-top-row"><h3 className="settings-card-title">Payment & UPI</h3><span className="settings-tag account">Account</span></div>
          <div className="settings-form-group"><label>Receiver UPI ID</label><input type="text" value={settings.upiId} onChange={(e) => setSettings({...settings, upiId: e.target.value})} /></div>
          <div className="settings-form-group"><label>Business / Payee Name</label><input type="text" value={settings.businessName} onChange={(e) => setSettings({...settings, businessName: e.target.value})} /><p className="input-hint">Must match your registered bank name.</p></div>
          <div className="settings-form-group"><label>Merchant Code (MCC)</label><input type="text" value={settings.mccCode} onChange={(e) => setSettings({...settings, mccCode: e.target.value})} /><p className="input-hint">Use 0000 if unsure.</p></div>
        </div>
        <div className="settings-card">
          <div className="card-top-row"><h3 className="settings-card-title">Menu Management</h3><span className="settings-tag inventory">Inventory</span></div>
          <div className="menu-actions"><button className="btn-add-item-purple" onClick={() => setShowAddModal(true)}>+ Add Item</button><button className="btn-view-menu" onClick={() => setShowViewModal(true)}>👁 View Menu ({menuItems.length})</button></div>
        </div>
        <div className="settings-card">
          <div className="card-top-row"><h3 className="settings-card-title">Active Commission</h3><span className="commission-value">₹{settings.commission}</span></div>
          <div className="toggle-group"><button className={`toggle-btn ${settings.commissionEnabled ? 'active-green' : ''}`} onClick={() => setSettings({...settings, commissionEnabled: true})}>Enable</button><button className={`toggle-btn ${!settings.commissionEnabled ? 'active-red' : ''}`} onClick={() => setSettings({...settings, commissionEnabled: false})}>Disable</button></div>
        </div>
      </div>
      <div className="settings-footer-actions"><button className="btn-save-all" onClick={handleSave}>Save All Changes</button></div>
      {showAddModal && (
        <div className="qr-modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="admin-menu-modal card shadow-2xl" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowAddModal(false)}>×</button>
            <h2 className="modal-title" style={{marginBottom: '20px'}}>Menu Configuration</h2>
            <div className="config-section" style={{background: '#f8fafc', padding: '20px', borderRadius: '12px', marginBottom: '20px'}}>
              <h3 style={{fontSize: '1rem', fontWeight: '700', marginBottom: '15px'}}>1. Create Category</h3>
              <div className="form-group"><label>Category Name</label><div style={{display: 'flex', gap: '10px'}}><input type="text" value={newCategoryName} onChange={e => setNewCategoryName(e.target.value)} placeholder="e.g. Hot Drinks" style={{flex: 1}} /><button className="btn-add-item-purple" onClick={handleAddCategory}>Add Category</button></div></div>
            </div>
            <div className="config-section" style={{background: '#f8fafc', padding: '20px', borderRadius: '12px'}}>
              <h3 style={{fontSize: '1rem', fontWeight: '700', marginBottom: '15px'}}>2. Add Menu Item</h3>
              <div className="expense-form">
                <div className="form-group"><label>Select Category</label><select value={newItem.category_id} onChange={e => setNewItem({...newItem, category_id: e.target.value})} style={{padding: '12px 16px', borderRadius: '10px', border: '1px solid #e2e8f0', width: '100%'}}><option value="">Select a category</option>{categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}</select></div>
                <div style={{display: 'flex', gap: '15px'}}><div className="form-group" style={{flex: 2, minWidth: 0}}><label>Item Name</label><input type="text" value={newItem.name} onChange={e => setNewItem({...newItem, name: e.target.value})} placeholder="e.g. Cappuccino" style={{minWidth: 0}} /></div><div className="form-group" style={{flex: 1, minWidth: 0}}><label>Price (₹)</label><input type="number" value={newItem.price} onChange={e => setNewItem({...newItem, price: e.target.value})} placeholder="150" style={{minWidth: 0}} /></div></div>
                <div className="form-group"><label>Item Image</label><input type="file" accept="image/*" onChange={handleImageUpload} style={{padding: '10px'}} />{newItem.image_url && <img src={newItem.image_url} alt="Preview" style={{width: '60px', height: '60px', marginTop: '10px', borderRadius: '8px', objectFit: 'cover'}} />}</div>
                <button className="btn-add-item-purple" style={{ width: '100%', marginTop: '10px' }} onClick={handleAddItem}>Add Item</button>
              </div>
            </div>
          </div>
        </div>
      )}
      {showViewModal && (
        <div className="qr-modal-overlay" onClick={() => setShowViewModal(false)}>
          <div className="admin-menu-modal wide-modal card shadow-2xl" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowViewModal(false)}>×</button>
            <h2 className="modal-title">Menu Live View</h2>
            <div className="expenses-list" style={{ marginTop: '20px', maxHeight: '500px', overflowY: 'auto', paddingRight: '10px' }}>
              {categories.map(cat => (
                <div key={cat.id} style={{marginBottom: '20px'}}>
                  <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', paddingBottom: '8px', borderBottom: '2px solid #f1f5f9'}}>
                    <h3 style={{fontSize: '1.15rem', fontWeight: 'bold', color: '#1e293b'}}>{cat.name}</h3>
                    <div style={{display: 'flex', gap: '8px'}}>
                      <button className="btn-filter" style={{padding: '6px 12px', fontSize: '0.8rem', background: '#e0e7ff'}} onClick={() => handleEditCategoryName(cat)}>✎ Edit Name</button>
                      <button className="btn-delete-card" style={{padding: '6px 12px', fontSize: '0.8rem', borderRadius: '8px'}} onClick={() => handleDeleteCategory(cat)}>🗑️</button>
                    </div>
                  </div>
                  {menuItems.filter(item => item.category_id === cat.id).map(item => (
                    <div key={item.id} className="expense-row-card" style={{marginBottom: '10px'}}>
                      <div className="expense-info">
                        <div style={{position: 'relative', cursor: 'pointer'}} title="Click to update image" onClick={() => handleUpdateItemImage(item)}>
                          <img src={item.image_url} alt={item.name} style={{ width: '48px', height: '48px', borderRadius: '8px', objectFit: 'cover', display: 'block' }} />
                          <div style={{position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0, transition: 'opacity 0.2s'}} className="img-hover-overlay">📷</div>
                        </div>
                        <div className="expense-details" style={{ marginLeft: '12px' }}><h4 className="expense-name">{item.name}</h4></div>
                      </div>
                      <div className="expense-actions" style={{display: 'flex', gap: '8px', alignItems: 'center'}}>
                        <span className="expense-amount" style={{marginRight: '4px'}}>₹{item.price}</span>
                        <button className="btn-filter" style={{padding: '6px 10px', background: '#f1f5f9', color: '#64748b', fontSize: '0.8rem'}} onClick={() => handleEditItemPrice(item)}>✎ Price</button>
                        <button className="btn-filter" style={{padding: '6px 10px', background: '#eff6ff', color: '#2563eb', fontSize: '0.8rem'}} onClick={() => handleUpdateItemImage(item)}>📷 Image</button>
                        <button className="btn-delete-card" onClick={() => handleDeleteItem(item.id)}>🗑️</button>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const VaultLockView = ({ onUnlock, onCancel }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (password === 'admin777') {
      onUnlock();
    } else {
      setError('Incorrect password. Please try again.');
      setPassword('');
    }
  };

  return (
    <div className="vault-lock-container">
      <div className="vault-lock-card">
        <div className="vault-icon">🔒</div>
        <h2>Secure Access</h2>
        <p>This section is protected. Please enter your secure access password.</p>
        <form onSubmit={handleSubmit}>
          <input
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="vault-input"
            autoFocus
          />
          {error && <p className="vault-error-msg">{error}</p>}
          <div className="vault-actions">
            <button type="button" className="btn-vault-cancel" onClick={onCancel}>Cancel</button>
            <button type="submit" className="btn-vault-unlock">Unlock Section</button>
          </div>
        </form>
      </div>
    </div>
  );
};

const Admin = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isVaultUnlocked, setIsVaultUnlocked] = useState(false);
  const [vaultTargetView, setVaultTargetView] = useState(null);

  const handleNavigate = (view) => {
    if (['analytics', 'expenses', 'settings'].includes(view) && !isVaultUnlocked) {
      setVaultTargetView(view);
      setActiveTab('vault-lock');
    } else {
      setActiveTab(view);
    }
  };

  const currentView = activeTab;
  const setCurrentView = handleNavigate;
  const [showBillingModal, setShowBillingModal] = useState(false);
  const [showDiscountInput, setShowDiscountInput] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState(null);
  const [qrModalData, setQrModalData] = useState(null);

  const [activeOrders, setActiveOrders] = useState([]);
  const lastOrderTimestampRef = useRef(0);
  const setLastOrderTimestamp = (val) => { lastOrderTimestampRef.current = val; };
  const lastOrderTimestamp = lastOrderTimestampRef.current;
  const [expandedTableId, setExpandedTableId] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [walletBalance, setWalletBalance] = useState(0);
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const qrTemplateRef = useRef(null);
  const [qrDownloadData, setQrDownloadData] = useState(null);
  const [categories, setCategories] = useState(() => {
    const cached = localStorage.getItem('cached_admin_categories');
    return cached ? JSON.parse(cached) : [];
  });
  const [menuItems, setMenuItems] = useState(() => {
    const cached = localStorage.getItem('cached_admin_items');
    return cached ? JSON.parse(cached) : [];
  });
  const [newOrderNotifications, setNewOrderNotifications] = useState([]);
  const [showViewItemsModal, setShowViewItemsModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [systemNotifications, setSystemNotifications] = useState([]);
  const [historyOrders, setHistoryOrders] = useState([]);
  const [expandedDates, setExpandedDates] = useState({});
  const [historyViewOrder, setHistoryViewOrder] = useState(null);
  const [historySearchQuery, setHistorySearchQuery] = useState('');
  const [billingDiscount, setBillingDiscount] = useState(0);
  const [billingExtraMoney, setBillingExtraMoney] = useState(0);
  const [showExtraMoneyInput, setShowExtraMoneyInput] = useState(false);
  const [showMoveTableModal, setShowMoveTableModal] = useState(false);
  const [moveOrderData, setMoveOrderData] = useState(null);

  const activeOrderCount = activeOrders.length;


  const handleDeleteItemFromOrder = async (orderId, itemId) => {
    if (!window.confirm("Remove this item from order?")) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/orders/${orderId}/items/${itemId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        fetchOrders(); // Refresh to see updated total and items in background
        
        // If the modal for this order is open, update its state immediately
        if (selectedOrder && selectedOrder.id === orderId) {
          setSelectedOrder(prev => {
            const updatedItems = prev.items.filter(it => it.id !== itemId);
            const updatedTotal = updatedItems.reduce((sum, it) => sum + (it.item_price * it.quantity), 0);
            return {
              ...prev,
              items: updatedItems,
              total_price: updatedTotal
            };
          });
        }
        
        addNotification("Item removed from order", "success");
      }
    } catch (e) {
      console.error(e);
      addNotification("Failed to remove item", "error");
    }
  };

  // Modal Cart for multi-selection
  const [modalCart, setModalCart] = useState([]);
  const [activeCategory, setActiveCategory] = useState('All');

  const handleAddToModalCart = (item) => {
    setModalCart(prev => {
      const existing = prev.find(i => i.id === item.id);
      if (existing) {
        return prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { ...item, quantity: 1 }];
    });
  };

  const handleUpdateModalCartQty = (id, delta) => {
    setModalCart(prev => prev.map(item => {
      if (item.id === id) {
        const newQty = Math.max(0, item.quantity + delta);
        return { ...item, quantity: newQty };
      }
      return item;
    }).filter(i => i.quantity > 0));
  };

  const handleClearModalCart = () => {
    setModalCart([]);
    setSearchQuery('');
  };

  const submitModalCart = async () => {
    if (modalCart.length === 0) return;
    try {
      const itemsToSubmit = modalCart.map(i => ({
        item_name: i.name,
        item_price: i.price,
        quantity: i.quantity
      }));

      const res = await fetch(`${API_BASE_URL}/api/orders/${selectedOrder.id}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: itemsToSubmit })
      });

      if (res.ok) {
        const updatedOrder = await res.json();
        fetchOrders();
        handleClearModalCart();
        setShowAddItemModal(false);
        addNotification(`Added ${itemsToSubmit.length} items to order!`, 'success');
        
        if (selectedOrder.table_id === 'Takeaway') {
           setSelectedOrder({ ...updatedOrder, payment_mode: 'online' });
           setShowBillingModal(true);
        }
      }
    } catch (e) {
      console.error(e);
      addNotification('Failed to add items', 'error');
    }
  };


  // Manual Order Start States
  const [showStartOrderModal, setShowStartOrderModal] = useState(false);
  const [startOrderTableId, setStartOrderTableId] = useState(null);
  const [newOrderCustomer, setNewOrderCustomer] = useState({ name: '', phone: '' });

  const handleStartOrder = (tableId) => {
    if (walletBalance < 10) {
      addNotification('First balance your wallet.', 'error');
      return;
    }
    setStartOrderTableId(tableId);
    setNewOrderCustomer({ name: '', phone: '' });
    setShowStartOrderModal(true);
  };

  const handleConfirmStart = async () => {
    try {
      const orderData = {
        customer_name: newOrderCustomer.name || 'Walk-in Customer',
        customer_phone: newOrderCustomer.phone || '—',
        table_id: startOrderTableId.toString(),
        total_price: 0,
        status: 'preparing', // ⚡️ Combined creation and status update
        items: []
      };
      
      const res = await fetch(`${API_BASE_URL}/api/orders`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(orderData)
      });
      
      if (res.ok) {
        let createdOrder = await res.json();
        
        // ⚡️ Performance: Open menu instantly without waiting for additional API calls
        setShowStartOrderModal(false);
        setSelectedOrder(createdOrder);
        setShowAddItemModal(true);
        
        // Refresh dashboard in background
        fetchOrders(); 
        
        addNotification(`Table ${startOrderTableId} started!`, 'success');
      } else {
        const errText = await res.text();
        console.error("Server Error:", errText);
        addNotification(`Server Error: ${res.status}`, 'error');
      }
    } catch (e) {
      console.error(e);
      addNotification('Failed to start order', 'error');
    }
  };
  const [expenses, setExpenses] = useState([]);
  const [settlements, setSettlements] = useState([]);
  const [showExpenseModal, setShowExpenseModal] = useState(null); // id of settlement to view expenses for
  const [settlementExpenses, setSettlementExpenses] = useState([]);

  const addNotification = (msg, type = 'success') => {
    const id = Date.now();
    setSystemNotifications(prev => [...prev, { id, msg, type }]);
    setTimeout(() => {
      setSystemNotifications(prev => prev.filter(n => n.id !== id));
    }, 4000);
  };

  const ringTone = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');

  const fetchMenuData = async () => {
    try {
      const [catRes, itemRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/categories`),
        fetch(`${API_BASE_URL}/api/menu`)
      ]);

      const [cats, items] = await Promise.all([
        catRes.json(),
        itemRes.json()
      ]);

      setCategories(cats);
      setMenuItems(items);
      
      localStorage.setItem('cached_admin_categories', JSON.stringify(cats));
      localStorage.setItem('cached_admin_items', JSON.stringify(items));
    } catch (e) {
      console.error("Error fetching menu data", e);
    }
  };

  const fetchExpenses = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/expenses`);
      if (res.ok) setExpenses(await res.json());
    } catch (e) { console.error('Failed to fetch expenses', e); }
  };

  const fetchSettlements = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/analytics/settlements`);
      if (res.ok) setSettlements(await res.json());
    } catch (e) { console.error('Failed to fetch settlements', e); }
  };

  const fetchWallet = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/wallet`);
      if (res.ok) {
        const data = await res.json();
        setWalletBalance(data.balance);
      }
    } catch (e) {
      console.error('Failed to fetch wallet', e);
    }
  };

  useEffect(() => {
    fetchMenuData();
    fetchWallet();
    fetchExpenses();
    fetchSettlements();
    fetchHistory();
  }, []);

  const fetchOrders = async () => {
    try {
       const res = await fetch(`${API_BASE_URL}/api/orders/active`);
       if (res.ok) {
          const data = await res.json();
          setActiveOrders(data);
          
          const pendingOrders = data.filter(o => o.status === 'pending');
          if (pendingOrders.length > 0) {
            const maxId = Math.max(...pendingOrders.map(o => o.id));
            if (maxId > lastOrderTimestampRef.current) {
              const prevTimestamp = lastOrderTimestampRef.current;
              lastOrderTimestampRef.current = maxId;
              setNewOrderNotifications(prev => [...prev, ...pendingOrders.filter(o => o.id > prevTimestamp)]);
              ringTone.play().catch(e => console.log("Audio play blocked by browser"));
            }
          }
       }
    } catch (e) {
       console.error("Failed to fetch active orders", e);
    }
  };

  useEffect(() => {
    fetchOrders();
    const intervalId = setInterval(fetchOrders, 5000);
    return () => clearInterval(intervalId);
  }, []);

  // Continuous ringing while notifications exist
  useEffect(() => {
    let ringInterval;
    if (newOrderNotifications.length > 0) {
      ringInterval = setInterval(() => {
        ringTone.play().catch(e => console.log("Audio play blocked by browser"));
      }, 10000); // 10 seconds
    }
    return () => {
      if (ringInterval) clearInterval(ringInterval);
    };
  }, [newOrderNotifications]);
  
  const handleUpdateOrderStatus = async (orderId, newStatus) => {
     try {
        await fetch(`${API_BASE_URL}/api/orders/${orderId}/status?status=${newStatus}`, { method: 'PUT' });
        setActiveOrders(prev => {
          if (newStatus === 'done') return prev.filter(o => o.id !== orderId);
          return prev.map(o => o.id === orderId ? {...o, status: newStatus} : o);
        });
     } catch (e) {
        console.error(e);
     }
  };

  const toggleMenu = (e, id) => {
    e.stopPropagation();
    setActiveMenuId(activeMenuId === id ? null : id);
  };

  const closeMenu = () => setActiveMenuId(null);

  const viewQRCode = (table) => {
    setQrModalData(table);
    closeMenu();
  };

  const handleSettleMonth = async () => {
    if (!window.confirm("This will archive all current orders and expenses into a historical record and reset your dashboard. Proceed?")) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/analytics/settle`, { method: 'POST' });
      if (res.ok) {
        addNotification("Month settled successfully!", "success");
        fetchOrders();
        fetchHistory();
        fetchExpenses();
        fetchSettlements();
        fetchWallet();
      } else {
        addNotification("Settlement failed", "error");
      }
    } catch (e) {
      addNotification("Network error during settlement", "error");
    }
  };

  const downloadQRCode = async (table) => {
    setQrDownloadData(table);
    addNotification("Generating Modern Stand PDF...", "success");
    
    // Wait for the template to render
    setTimeout(async () => {
      if (qrTemplateRef.current) {
        try {
          const canvas = await html2canvas(qrTemplateRef.current, {
            scale: 3, // Higher resolution
            useCORS: true,
            backgroundColor: '#ffffff'
          });
          
          const imgData = canvas.toDataURL('image/png');
          const pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'in',
            format: 'a4' // Full A4 page
          });
          
          // Center the 4x6 stand on the A4 page
          // A4 is 8.27 x 11.69 inches
          const pageWidth = 8.27;
          const pageHeight = 11.69;
          const imgWidth = 4;
          const imgHeight = 6;
          const x = (pageWidth - imgWidth) / 2;
          const y = (pageHeight - imgHeight) / 2;

          pdf.addImage(imgData, 'PNG', x, y, imgWidth, imgHeight);
          pdf.save(`${table.name}_Stand_A4.pdf`);
          addNotification("A4 Stand PDF downloaded!", "success");
        } catch (err) {
          console.error("PDF Scan Error:", err);
          addNotification("PDF generation failed", "error");
        } finally {
          setQrDownloadData(null);
        }
      }
    }, 500);
    closeMenu();
  };

  const tables = [
    { id: 1, name: 'Table 1', status: 'available' },
    { id: 2, name: 'Table 2', status: 'available' },
    { id: 3, name: 'Table 3', status: 'available' },
    { id: 4, name: 'Table 4', status: 'available' },
    { id: 5, name: 'Table 5', status: 'available' },
    { id: 6, name: 'Table 6', status: 'available' },
  ];

  const fetchHistory = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/orders/history`);
      if (res.ok) {
        const data = await res.json();
        setHistoryOrders(data);
      }
    } catch (e) {
      console.error('Failed to fetch history', e);
    }
  };








  const handleAcceptOrder = (orderId) => { 
    handleUpdateOrderStatus(orderId, 'preparing'); 
    setNewOrderNotifications(prev => prev.filter(n => n.id !== orderId)); 
  };

  const handleRejectOrder = (orderId) => {
    handleUpdateOrderStatus(orderId, 'rejected');
    setNewOrderNotifications(prev => prev.filter(n => n.id !== orderId));
  };

  const handleCancelOrDeleteOrder = async (order) => {
    if (!order) return;
    try {
      if (order.total_price <= 2) {
        const res = await fetch(`${API_BASE_URL}/api/orders/${order.id}`, { method: 'DELETE' });
        if (res.ok) addNotification("Order cancelled and removed.", "success");
      } else {
        const res = await fetch(`${API_BASE_URL}/api/orders/${order.id}/complete`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            payment_mode: 'cash',
            discount: 0,
            extra_money: 0,
            final_amount: order.total_price
          })
        });
        if (res.ok) addNotification("Order saved to history (Cash).", "success");
      }
      setShowBillingModal(false);
      setBillingDiscount(0);
      setBillingExtraMoney(0);
      fetchOrders();
      fetchHistory();
      fetchWallet();
    } catch (e) {
      console.error(e);
      addNotification("Failed to process cancellation", "error");
    }
  };

  const handleMoveOrder = async (orderId, newTableId) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/orders/${orderId}/move?new_table_id=${newTableId}`, {
        method: 'PUT'
      });
      if (res.ok) {
        addNotification(`Order shifted to Table ${newTableId}`, "success");
        setShowMoveTableModal(false);
        setMoveOrderData(null);
        fetchOrders();
      } else {
        const err = await res.json();
        addNotification(err.detail || "Failed to shift table", "error");
      }
    } catch (e) {
      console.error(e);
      addNotification("Network error while shifting table", "error");
    }
  };



  const billingPlatformFee = selectedOrder && selectedOrder.total_price > 40 ? 2 : 0;
  const billingFinalPayable = selectedOrder ? Math.max(0, selectedOrder.total_price + billingPlatformFee + (billingExtraMoney || 0) - (billingDiscount || 0)) : 0;

  return (
    <div className="admin-panel-container">
      {/* Sidebar */}
      <aside className="admin-panel-sidebar">
        <div className="sidebar-brand">
          <div className="brand-logo">C</div>
          <h2 className="brand-name">Chai Chaska Bar</h2>
        </div>

        <nav className="sidebar-links">
          <div 
            className={`sidebar-item ${currentView === 'dashboard' ? 'active' : ''}`}
            onClick={() => setCurrentView('dashboard')}
          >
            <span className="icon">🏠</span>
            <span className="label">Dashboard</span>
          </div>
          
          <div 
            className={`sidebar-item ${currentView === 'orders' ? 'active' : ''}`}
            onClick={() => setCurrentView('orders')}
          >
            <span className="icon">📅</span>
            <span className="label">Orders</span>
            {activeOrderCount > 0 && <span className="sidebar-badge">{activeOrderCount}</span>}
          </div>

          <div 
            className={`sidebar-item ${currentView === 'history' ? 'active' : ''}`}
            onClick={() => setCurrentView('history')}
          >
            <span className="icon">🕒</span>
            <span className="label">History</span>
          </div>

          <div 
            className={`sidebar-item ${currentView === 'analytics' ? 'active' : ''}`}
            onClick={() => setCurrentView('analytics')}
          >
            <span className="icon">📊</span>
            <span className="label">Analytics 🔒</span>
          </div>

          <div 
            className={`sidebar-item ${currentView === 'expenses' ? 'active' : ''}`}
            onClick={() => setCurrentView('expenses')}
          >
            <span className="icon">💸</span>
            <span className="label">Expenses 🔒</span>
          </div>

          <div 
            className={`sidebar-item ${currentView === 'settings' ? 'active' : ''}`}
            onClick={() => setCurrentView('settings')}
          >
            <span className="icon">⚙️</span>
            <span className="label">Settings 🔒</span>
          </div>

          <div 
            className="sidebar-item logout"
            onClick={() => {
              localStorage.removeItem('ccb_admin_auth');
              window.location.href = '/login';
            }}
            style={{ marginTop: 'auto', color: '#ef4444' }}
          >
            <span className="icon">↳</span>
            <span className="label">Logout</span>
          </div>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="admin-panel-main">
        <header className="main-header">
          <h1 className="header-title">{currentView.charAt(0).toUpperCase() + currentView.slice(1)}</h1>
          <div className="header-user">
             <span className="user-role">Super Admin</span>
             <div className="user-avatar">👤</div>
          </div>
        </header>

        {/* Wallet Balance Warning/Lock Banner */}
        {walletBalance < 15 && (
          <div style={{
            margin: '0 24px 0 24px',
            padding: '12px 20px',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            fontWeight: 700,
            fontSize: '0.95rem',
            background: walletBalance < 10 ? '#fee2e2' : '#fef3c7',
            color: walletBalance < 10 ? '#dc2626' : '#92400e',
            border: walletBalance < 10 ? '1.5px solid #fca5a5' : '1.5px solid #fde68a'
          }}>
            <span style={{ fontSize: '1.3rem' }}>{walletBalance < 10 ? '🚫' : '⚠️'}</span>
            <div>
              {walletBalance < 10
                ? `System Locked! Your wallet balance is ₹${Math.round(walletBalance)}. Please recharge via Super Admin to resume operations.`
                : `Low Balance Warning! Your wallet balance is ₹${Math.round(walletBalance)}. Please recharge soon to avoid service interruption.`}
            </div>
          </div>
        )}

        <section className="view-content">
          {currentView === 'vault-lock' ? (
            <VaultLockView 
              onUnlock={() => {
                setIsVaultUnlocked(true);
                setActiveTab(vaultTargetView);
              }}
              onCancel={() => setActiveTab('dashboard')}
            />
          ) : currentView === 'dashboard' ? (
            <DashboardView 
              activeOrders={activeOrders}
              tables={tables}
              activeMenuId={activeMenuId}
              toggleMenu={toggleMenu}
              closeMenu={closeMenu}
              viewQRCode={viewQRCode}
              downloadQRCode={downloadQRCode}
              setSelectedOrder={setSelectedOrder}
              setShowAddItemModal={setShowAddItemModal}
              setShowViewItemsModal={setShowViewItemsModal}
              setShowBillingModal={setShowBillingModal}
              qrModalData={qrModalData}
              setQrModalData={setQrModalData}
              handleStartOrder={handleStartOrder}
              walletBalance={walletBalance}
              setMoveOrderData={setMoveOrderData}
              setShowMoveTableModal={setShowMoveTableModal}
            />

          ) : currentView === 'history' ? (
            <HistoryView 
              historyOrders={historyOrders}
              fetchHistory={fetchHistory}
              historySearchQuery={historySearchQuery}
              setHistorySearchQuery={setHistorySearchQuery}
              expandedDates={expandedDates}
              setExpandedDates={setExpandedDates}
              setHistoryViewOrder={setHistoryViewOrder}
              historyViewOrder={historyViewOrder}
            />
          ) : currentView === 'analytics' ? (
            <AnalyticsView 
              historyOrders={historyOrders}
              expenses={expenses}
              settlements={settlements}
              onSettle={handleSettleMonth}
              onViewSettlementExpenses={async (sid) => {
                try {
                  const res = await fetch(`${API_BASE_URL}/api/analytics/settlements/${sid}/expenses`);
                  if (res.ok) {
                    setSettlementExpenses(await res.json());
                    setShowExpenseModal(sid);
                  }
                } catch (e) { console.error(e); }
              }}
            />
          ) : currentView === 'expenses' ? (
            <ExpensesView 
              expenses={expenses}
              setExpenses={setExpenses}
              addNotification={addNotification}
            />
          ) : currentView === 'settings' ? (
            <SettingsView 
              addNotification={addNotification}
              fetchMenuData={fetchMenuData}
              categories={categories}
              setCategories={setCategories}
              menuItems={menuItems}
              setMenuItems={setMenuItems}
            />
          ) : currentView === 'orders' ? (
            <OrdersView 
              activeOrders={activeOrders}
              handleUpdateOrderStatus={handleUpdateOrderStatus}
              setSelectedOrder={setSelectedOrder}
              setShowBillingModal={setShowBillingModal}
              handleDeleteItemFromOrder={handleDeleteItemFromOrder}
              setShowAddItemModal={setShowAddItemModal}
            />
          ) : (
            <div>View: {currentView}</div>
          )}
        </section>
      </main>
      {showViewItemsModal && selectedOrder && (
        <div className="qr-modal-overlay" onClick={() => setShowViewItemsModal(false)}>
          <div className="view-items-modal card shadow-2xl" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowViewItemsModal(false)}>×</button>
            <div className="modal-header-modern">
              <div className="table-badge-large">T{selectedOrder.table_id}</div>
              <div className="header-info">
                <h2 className="modal-title">Current Order</h2>
                <p className="modal-subtitle">{selectedOrder.customer_name} • {selectedOrder.customer_phone}</p>
              </div>
            </div>
            <div className="items-popup-list">
              <div className="list-header">
                <span>ITEM NAME</span>
                <span>QTY</span>
                <span style={{ textAlign: 'right' }}>PRICE</span>
                <span style={{ width: '40px' }}></span>
              </div>
              <div className="list-body">
                {selectedOrder.items.map((it, i) => (
                  <div key={i} className="list-item-row">
                    <span className="name">{it.item_name}</span>
                    <span className="qty">×{it.quantity}</span>
                    <span className="price">₹{Math.round(it.item_price * it.quantity)}</span>
                    <button 
                      className="btn-delete-row" 
                      onClick={() => handleDeleteItemFromOrder(selectedOrder.id, it.id)}
                      title="Remove Item"
                    >
                      🗑️
                    </button>
                  </div>
                ))}
              </div>
            </div>
            <div className="modal-footer-summary">
              <div className="summary-row">
                <span>Global Total</span>
                <span className="total-amount">₹{Math.round(selectedOrder.total_price)}</span>
              </div>
            </div>
          </div>
        </div>
      )}
      {showAddItemModal && selectedOrder && (
        <div className="qr-modal-overlay" onClick={() => { setShowAddItemModal(false); handleClearModalCart(); }}>
          <div className="modern-menu-modal card shadow-2xl" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={() => { setShowAddItemModal(false); handleClearModalCart(); }}>×</button>
            
            <div className="menu-modal-layout">
              {/* Left Side: Item Browser */}
              <div className="menu-browser-side">
                <div className="browser-header">
                  <h2 className="modal-title">Menu Explorer</h2>
                  <div className="smart-search-box">
                    <span className="search-icon">🔍</span>
                    <input 
                      type="text" 
                      placeholder="Search items..." 
                      value={searchQuery} 
                      onChange={(e) => setSearchQuery(e.target.value)} 
                    />
                  </div>
                  
                  <div className="category-tabs">
                    <button 
                      className={`cat-tab ${activeCategory === 'All' ? 'active' : ''}`}
                      onClick={() => setActiveCategory('All')}
                    >
                      All
                    </button>
                    {categories.map(cat => (
                      <button 
                        key={cat.id} 
                        className={`cat-tab ${activeCategory === cat.id ? 'active' : ''}`}
                        onClick={() => setActiveCategory(cat.id)}
                      >
                        {cat.name}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="menu-items-grid">
                  {menuItems
                    .filter(item => {
                      const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
                      const matchesCat = activeCategory === 'All' || item.category_id === activeCategory;
                      return matchesSearch && matchesCat;
                    })
                    .map(item => {
                      const cartItem = modalCart.find(i => i.id === item.id);
                      return (
                        <div 
                          key={item.id} 
                          className={`menu-item-card ${cartItem ? 'in-cart' : ''}`}
                          onClick={() => handleAddToModalCart(item)}
                        >
                          <div className="m-item-info">
                            <span className="m-name">{item.name}</span>
                            <span className="m-price">₹{item.price}</span>
                          </div>
                          <div className="m-item-actions">
                            {cartItem ? (
                              <div className="qty-control-mini" onClick={(e) => e.stopPropagation()}>
                                <button onClick={(e) => { e.stopPropagation(); handleUpdateModalCartQty(item.id, -1); }}>−</button>
                                <span>{cartItem.quantity}</span>
                                <button onClick={(e) => { e.stopPropagation(); handleUpdateModalCartQty(item.id, 1); }}>+</button>
                              </div>
                            ) : (
                              <div className="btn-add-mini">
                                <span>+</span> Add
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>

              {/* Right Side: Cart Summary */}
              <div className="menu-cart-side">
                <div className="cart-header">
                  <h3>Your Selection</h3>
                  <span className="table-badge-mini">T{selectedOrder.table_id}</span>
                </div>
                
                <div className="cart-items-list">
                  {modalCart.length === 0 ? (
                    <div className="empty-cart-msg">
                      <span className="icon">🛒</span>
                      <p>Select items to start</p>
                    </div>
                  ) : (
                    modalCart.map(item => (
                      <div key={item.id} className="cart-row">
                        <div className="cart-item-info">
                          <span className="name">{item.name}</span>
                          <span className="subtotal">₹{item.price * item.quantity}</span>
                        </div>
                        <div className="qty-control-mini">
                          <button onClick={() => handleUpdateModalCartQty(item.id, -1)}>−</button>
                          <span>{item.quantity}</span>
                          <button onClick={() => handleUpdateModalCartQty(item.id, 1)}>+</button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div className="cart-footer">
                  <div className="cart-total-row">
                    <span>Total Amount</span>
                    <span className="total-val">₹{modalCart.reduce((sum, i) => sum + (i.price * i.quantity), 0)}</span>
                  </div>
                  <button 
                    className="btn-submit-menu" 
                    disabled={modalCart.length === 0}
                    onClick={submitModalCart}
                  >
                    Confirm & Add to Order
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {showBillingModal && selectedOrder && (
          <div className="qr-modal-overlay" onClick={() => { setShowBillingModal(false); setBillingDiscount(0); setBillingExtraMoney(0); }}>
            <div className="billing-modal-container card shadow-2xl" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={() => { setShowBillingModal(false); setBillingDiscount(0); }}>×</button>
            <div className="billing-modal-content-grid">
              {/* Left Side: Receipt & Summary */}
              <div className="billing-col-receipt">
                <div className="receipt-branded-header">
                  <h2 className="brand-name-main">CHAI CHASKA BAR</h2>
                  <p className="brand-tagline-sub">Authentic Tea Experience</p>
                </div>

                <div className="customer-info-box">
                  <div className="c-row"><span>Customer:</span> <strong>{selectedOrder.customer_name}</strong></div>
                  <div className="c-row"><span>Phone:</span> <strong>{selectedOrder.customer_phone}</strong></div>
                  <div className="c-row"><span>Table:</span> <span className="t-badge">{selectedOrder.table_id}</span></div>
                </div>

                <div className="bill-items-container">
                  <div className="bill-header-row">
                    <span>Item Name</span>
                    <span>Qty</span>
                    <span>Total</span>
                  </div>
                  <div className="bill-items-scroller">
                    {selectedOrder.items.map((it, i) => (
                      <div key={i} className="bill-item-line">
                        <span className="name">{it.item_name}</span>
                        <span className="qty">{it.quantity}</span>
                        <span className="price">₹{it.item_price * it.quantity}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bill-summary-v2" id="billing-summary-section">
                  <div className="s-line-v2">
                    <span className="s-label">Subtotal</span>
                    <span className="s-val">₹{Math.round(selectedOrder.total_price)}</span>
                  </div>
                  
                  {billingPlatformFee > 0 && (
                    <div className="s-line-v2 s-fee-line">
                      <span className="s-label">Platform Fees</span>
                      <span className="s-val">+₹{Math.round(billingPlatformFee)}</span>
                    </div>
                  )}

                  <div className="s-separator-v2"></div>

                  <div className="s-line-v2 s-total-line">
                    <span className="s-label">Total</span>
                    <span className="s-val">₹{Math.round(billingFinalPayable)}</span>
                  </div>

                  <div className="s-actions-v2">
                    {!showDiscountInput ? (
                      <button className="s-pill-btn-v2 d-red" onClick={() => setShowDiscountInput(true)}>
                        % Apply Discount
                      </button>
                    ) : (
                      <div className="s-input-v2 d-red">
                        <input 
                          type="number" 
                          placeholder="0" 
                          value={billingDiscount || ''} 
                          onChange={(e) => setBillingDiscount(parseFloat(e.target.value) || 0)} 
                        />
                        <button onClick={() => setShowDiscountInput(false)}>Done</button>
                      </div>
                    )}

                    {!showExtraMoneyInput ? (
                      <button className="s-pill-btn-v2 d-green" onClick={() => setShowExtraMoneyInput(true)}>
                        + Add Extra Money
                      </button>
                    ) : (
                      <div className="s-input-v2 d-green">
                        <input 
                          type="number" 
                          placeholder="0" 
                          value={billingExtraMoney || ''} 
                          onChange={(e) => setBillingExtraMoney(parseFloat(e.target.value) || 0)} 
                        />
                        <button onClick={() => setShowExtraMoneyInput(false)}>Done</button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Side: Payment Hub */}
              <div className="billing-col-payment">
                <div className="payment-mode-header-modern">
                  <h3>Payment Method</h3>
                  <div className="mode-toggle-pill">
                    <button 
                      className={`mode-pill-btn ${selectedOrder.payment_mode === 'online' ? 'active' : ''}`}
                      onClick={() => setSelectedOrder({...selectedOrder, payment_mode: 'online'})}
                    >
                      Online
                    </button>
                    <button 
                      className={`mode-pill-btn ${selectedOrder.payment_mode === 'cash' ? 'active' : ''}`}
                      onClick={() => setSelectedOrder({...selectedOrder, payment_mode: 'cash'})}
                    >
                      Cash
                    </button>
                  </div>
                </div>

                <div className="payment-body-context">
                    {selectedOrder.payment_mode === 'online' && (
                      <div className="payment-online-view">
                        <div className="trust-badge-pill">🛡️ Secure UPI Payment</div>
                        <p className="instruction">Scan QR to Complete Payment</p>
                        <div className="qr-box-inner">
                          <img src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(`upi://pay?pa=paytm.slzkdbs@pty&pn=ChaiChaskaBar&am=${billingFinalPayable}&cu=INR`)}`} alt="UPI QR" />
                        </div>
                        <div className="payment-detail-pill">
                          <span className="amt">₹{Math.round(billingFinalPayable)}</span>
                          <span className="id">UPI ID: paytm.slzkdbs@pty</span>
                        </div>
                      </div>
                    )}

                  {selectedOrder.payment_mode === 'cash' && (
                    <div className="payment-cash-view">
                      <div className="cash-input-group">
                        <label>Tendered Cash Amount</label>
                        <input 
                          type="number" 
                          placeholder="0.00" 
                          className="input-cash-big" 
                          onChange={(e) => { 
                            const tendered = parseFloat(e.target.value) || 0; 
                            setSelectedOrder({...selectedOrder, tendered, change: tendered - billingFinalPayable}); 
                          }} 
                        />
                      </div>
                      <div className="cash-return-box">
                        <span className="lbl">Change to Return</span>
                        <span className={`val ${selectedOrder.change >= 0 ? 'pos' : 'neg'}`}>
                          ₹{selectedOrder.change !== undefined ? Math.round(selectedOrder.change) : 0}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="billing-footer-actions">
                  <button className="btn-cancel-bill" onClick={() => handleCancelOrDeleteOrder(selectedOrder)}>
                    Cancel
                  </button>

                  <button 
                    className="btn-mark-paid" 
                    disabled={!selectedOrder.payment_mode}
                    onClick={async () => { 
                      try { 
                        const res = await fetch(`${API_BASE_URL}/api/orders/${selectedOrder.id}/complete`, { 
                          method: 'PUT', 
                          headers: { 'Content-Type': 'application/json' }, 
                          body: JSON.stringify({ 
                            payment_mode: selectedOrder.payment_mode, 
                            discount: billingDiscount, 
                            extra_money: billingExtraMoney,
                            final_amount: billingFinalPayable 
                          }) 
                        }); 
                        if (!res.ok) {
                          const errData = await res.json();
                          if (res.status === 400 && errData.detail) {
                            return addNotification(errData.detail, 'error');
                          }
                          throw new Error("Failed");
                        }
                        // Prepare the optimistic history record
                        const completedRecord = {
                          ...selectedOrder,
                          status: 'done',
                          payment_mode: selectedOrder.payment_mode,
                          discount: billingDiscount,
                          extra_money: billingExtraMoney,
                          final_amount: billingFinalPayable,
                          completed_at: new Date().toISOString(),
                          settled: 0
                        };

                        setShowBillingModal(false); 
                        setBillingDiscount(0); 
                        setBillingExtraMoney(0); 
                        
                        // 🚀 Optimistic State Update: Immediately add to history and remove from active
                        setHistoryOrders(prev => [completedRecord, ...prev]);
                        setActiveOrders(prev => prev.filter(o => o.id !== selectedOrder.id));

                        // Fetch fresh data in background to ensure sync
                        setTimeout(() => {
                          fetchOrders(); 
                          fetchHistory(); 
                          fetchWallet(); 
                        }, 2000); // Wait a bit longer for DB to be absolutely sure
                        
                        addNotification(`Bill completed! ₹${Math.round(billingFinalPayable)}`, 'success'); 
                      } catch (e) { 
                        console.error(e); addNotification('Failed to complete payment', 'error'); 
                      } 
                    }}
                  >
                    Mark as Paid & Complete
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {showStartOrderModal && (
        <div className="qr-modal-overlay" onClick={() => setShowStartOrderModal(false)}>
          <div className="admin-menu-modal card shadow-2xl" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px' }}>
            <button className="modal-close" onClick={() => setShowStartOrderModal(false)}>×</button>
            <h2 className="modal-title" style={{ marginBottom: '10px' }}>Start Table {startOrderTableId}</h2>
            <p className="section-desc" style={{ marginBottom: '20px' }}>Enter walk-in customer details or leave blank.</p>
            
            <div className="expense-form">
              <div className="form-group">
                <label>Customer Name</label>
                <input 
                  type="text" 
                  placeholder="e.g. Rahul" 
                  value={newOrderCustomer.name} 
                  onChange={e => setNewOrderCustomer({...newOrderCustomer, name: e.target.value})}
                  autoFocus
                />
              </div>
              <div className="form-group">
                <label>Phone Number (Optional)</label>
                <input 
                  type="tel" 
                  placeholder="e.g. 9876543210" 
                  value={newOrderCustomer.phone} 
                  onChange={e => setNewOrderCustomer({...newOrderCustomer, phone: e.target.value})}
                />
              </div>
              <button className="btn-add-item-purple" style={{ width: '100%', marginTop: '10px' }} onClick={handleConfirmStart}>
                Confirm & Open Menu
              </button>
            </div>
          </div>
        </div>
      )}

      {showMoveTableModal && moveOrderData && (
        <div className="qr-modal-overlay" onClick={() => { setShowMoveTableModal(false); setMoveOrderData(null); }}>
          <div className="admin-menu-modal card shadow-2xl" onClick={e => e.stopPropagation()} style={{ maxWidth: '450px' }}>
            <button className="modal-close" onClick={() => { setShowMoveTableModal(false); setMoveOrderData(null); }}>×</button>
            <h2 className="modal-title">Shift Table</h2>
            <p className="section-desc" style={{ marginBottom: '20px' }}>Move <strong>{moveOrderData.customer_name}</strong>'s order from Table {moveOrderData.table_id} to:</p>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px' }}>
              {tables.map(t => {
                const isTargetOccupied = activeOrders.some(o => o.table_id === t.id.toString() && ['pending', 'preparing', 'served'].includes(o.status));
                const isCurrent = moveOrderData.table_id === t.id.toString();
                
                return (
                  <button
                    key={t.id}
                    disabled={isTargetOccupied || isCurrent}
                    onClick={() => handleMoveOrder(moveOrderData.id, t.id)}
                    style={{
                      padding: '20px 10px',
                      borderRadius: '12px',
                      border: '2px solid',
                      borderColor: isCurrent ? '#6366f1' : isTargetOccupied ? '#e2e8f0' : '#e2e8f0',
                      background: isCurrent ? '#eef2ff' : isTargetOccupied ? '#f8fafc' : 'white',
                      color: isTargetOccupied ? '#94a3b8' : '#1e293b',
                      cursor: (isTargetOccupied || isCurrent) ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '5px',
                      transition: 'all 0.2s'
                    }}
                  >
                    <span style={{ fontSize: '1.2rem', fontWeight: '800' }}>T{t.id}</span>
                    <span style={{ fontSize: '0.7rem', fontWeight: '600', textTransform: 'uppercase' }}>
                      {isCurrent ? 'Current' : isTargetOccupied ? 'Occupied' : 'Select'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <NotificationToasts 
        newOrderNotifications={newOrderNotifications}
        handleRejectOrder={handleRejectOrder}
        handleAcceptOrder={handleAcceptOrder}
      />
      <div className="system-toast-container">
        {systemNotifications.map(note => (
          <div key={note.id} className={`system-toast ${note.type}`}>
            <div className="toast-icon">{note.type === 'success' ? '✓' : '✕'}</div>
            <div className="toast-content">
              <h4>{note.type === 'success' ? 'Success' : 'Error'}</h4>
              <p>{note.msg}</p>
            </div>
            <button className="toast-close" onClick={() => setSystemNotifications(prev => prev.filter(n => n.id !== note.id))}>✕</button>
          </div>
        ))}
      </div>

      {/* Hidden QR Stand Template for PDF generation */}
      {qrDownloadData && (
        <div 
          ref={qrTemplateRef} 
          className="qr-stand-original-template"
          style={{
            width: '4in',
            height: '6in',
            position: 'fixed',
            left: '-9999px',
            top: '-9999px',
            background: 'white'
          }}
        >
          <div className="stand-content">
            <div className="stand-header">
              <div className="brand-dot"></div>
              <h1 className="stand-cafe-name">CHAI CHASKA BAR</h1>
              <p className="stand-tagline">Authentic Tea Experience</p>
            </div>
            
            <div className="stand-table-section">
              <div className="table-line"></div>
              <h2 className="stand-table-no">{qrDownloadData.name}</h2>
              <div className="table-line"></div>
            </div>

            <div className="stand-qr-container">
              <div className="qr-frame">
                <img 
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(window.location.origin + '/menu?table=' + qrDownloadData.id)}`} 
                  alt="Generate QR" 
                />
              </div>
            </div>

            <div className="stand-footer">
              <div className="scan-instruction">
                <span className="scan-icon">📱</span>
                <p>SCAN ME FOR ORDER</p>
              </div>
              <div className="footer-accent-circles"></div>
            </div>
          </div>
        </div>
      )}
      {showExpenseModal && (
        <div className="qr-modal-overlay" onClick={() => setShowExpenseModal(null)}>
          <div className="admin-menu-modal card shadow-2xl" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <button className="modal-close" onClick={() => setShowExpenseModal(null)}>×</button>
            <h2 className="modal-title" style={{ marginBottom: '10px' }}>Settlement Expenses</h2>
            <p className="section-desc" style={{ marginBottom: '20px' }}>Full record of expenses for this archived period.</p>
            
            <div className="expenses-list" style={{ maxHeight: '400px', overflowY: 'auto' }}>
              {settlementExpenses.length === 0 ? (
                <div className="no-data-card"><p>No expenses recorded for this month.</p></div>
              ) : (
                settlementExpenses.map(exp => (
                  <div key={exp.id} className="expense-row-card">
                    <div className="expense-info">
                      <div className="expense-icon-bg">💸</div>
                      <div className="expense-details">
                        <h4 className="expense-name">{exp.name}</h4>
                        <span className="expense-date">{exp.date}</span>
                      </div>
                    </div>
                    <div className="expense-actions">
                      <span className="expense-amount">₹{exp.amount}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
            
            <div style={{ marginTop: '20px', paddingTop: '15px', borderTop: '2px solid #f1f5f9', textAlign: 'right' }}>
              <span style={{ fontWeight: 700, color: '#64748b', marginRight: '10px' }}>Total Period Expense:</span>
              <span style={{ fontWeight: 800, color: '#ef4444', fontSize: '1.2rem' }}>
                ₹{Math.round(settlementExpenses.reduce((sum, e) => sum + e.amount, 0))}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Admin;
