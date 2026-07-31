import React, { useState, useRef, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { API_BASE_URL } from '../api_config';
import './Menu.css';


const VegIcon = () => (
  <span className="veg-icon" title="Vegetarian">
    <span className="veg-dot" />
  </span>
);

const Menu = () => {
  const [searchParams] = useSearchParams();
  const tableId = searchParams.get('table') || 'Takeaway';
  const [cart, setCart] = useState({});
  const [menuData, setMenuData] = useState(() => {
    const cached = localStorage.getItem('cached_menu_data');
    return cached ? JSON.parse(cached) : [];
  });
  const [activeCategory, setActiveCategory] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  
  // New States for Flow
  const [customerInfo, setCustomerInfo] = useState({ name: '', phone: '' });
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [showBillingModal, setShowBillingModal] = useState(false);
  const [activeOrderId, setActiveOrderId] = useState(null);
  const [orderRejected, setOrderRejected] = useState(false);
  const [orderWaiting, setOrderWaiting] = useState(false);
  const [isTableOccupied, setIsTableOccupied] = useState(false);
  const [existingOrder, setExistingOrder] = useState(null);

  const categoryRefs = useRef({});

  useEffect(() => {
    let intervalId;
    if (activeOrderId) {
      intervalId = setInterval(async () => {
        try {
          const res = await fetch(`${API_BASE_URL}/api/orders/${activeOrderId}`);
          if (res.ok) {
            const data = await res.json();
            if (data.status === 'rejected') {
              setOrderRejected(true);
              setOrderWaiting(false);
              setOrderPlaced(false);
              setActiveOrderId(null);
              setIsTableOccupied(false);
            } else if (data.status !== 'pending') {
              // Any status other than pending or rejected means it's confirmed (preparing, served, done)
              setOrderWaiting(false);
              setOrderPlaced(true);
              
              // If it's done, we can stop polling
              if (data.status === 'done') {
                setActiveOrderId(null);
              }
            }
          }
        } catch(e) { console.error(e) }
      }, 3000);
    }
    return () => clearInterval(intervalId);
  }, [activeOrderId]);

  useEffect(() => {
    // Always show customer modal on mount as per user request
    setShowCustomerModal(true);

    const loadMenu = async () => {
      try {
        const [catRes, itemRes] = await Promise.all([
          fetch(`${API_BASE_URL}/api/categories`),
          fetch(`${API_BASE_URL}/api/menu`)
        ]);

        const [categories, items] = await Promise.all([
          catRes.json(),
          itemRes.json()
        ]);
        
        const getPriority = (name) => {
          const n = (name || '').toLowerCase();
          if (n.includes('chai') || (n.includes('tea') && !n.includes('ice'))) return 1;
          if (n.includes('ciga') || n.includes('cigr') || n.includes('cigarette') || n.includes('smoke') || n.includes('tobacco')) return 2;
          if (n.includes('hot') && (n.includes('coff') || n.includes('cofe') || n.includes('coffee'))) return 3;
          if (n.includes('cold') && (n.includes('coff') || n.includes('cofe') || n.includes('coffee'))) return 4;
          if (n.includes('ice') && (n.includes('tea') || n.includes('lemon'))) return 5;
          if (n.includes('mocktail') || n.includes('shake') || n.includes('cooler') || n.includes('cold drink')) return 6;
          if (n.includes('water') || n.includes('bottle')) return 7;
          return 99;
        };

        const sortedCats = Array.isArray(categories) ? [...categories].sort((a, b) => {
          const pA = getPriority(a.name);
          const pB = getPriority(b.name);
          if (pA !== pB) return pA - pB;
          return (a.name || '').localeCompare(b.name || '');
        }) : [];
        
        const groupedData = sortedCats.map(cat => ({
          category: cat.name,
          emoji: '🍽️',
          items: items.filter(item => item.category_id === cat.id).map(item => ({...item, veg: true})) // Assuming all veg for mock UI
        })).filter(cat => cat.items.length > 0);
        
        if (groupedData.length > 0) {
           setMenuData(groupedData);
           setActiveCategory(groupedData[0].category);
           
           // Cache menu data for instant load next time
           localStorage.setItem('cached_menu_data', JSON.stringify(groupedData));
        }
      } catch (err) {
        console.error("Failed to load menu data", err);
      }
    };
    const checkTableStatus = async () => {
      if (tableId === 'Takeaway') return;
      setIsTableOccupied(false);
      try {
        const res = await fetch(`${API_BASE_URL}/api/tables/${tableId}/active`);
        if (res.ok) {
          const data = await res.json();
          if (data && data.id) {
            setExistingOrder(data);
            setIsTableOccupied(true);
            
            // Check if this is the "same" customer by comparing phone from localStorage
            const savedPhone = localStorage.getItem('ccb_customer_phone');
            if (savedPhone === data.customer_phone) {
               setActiveOrderId(data.id);
               if (data.status === 'pending') setOrderWaiting(true);
               else if (data.status !== 'done') setOrderPlaced(true);
            }
          } else {
            setIsTableOccupied(false);
          }
        }
      } catch (err) { console.error("Status check failed", err); }
    };
    
    checkTableStatus();
    loadMenu();
  }, [tableId]);

  const handleSaveCustomer = () => {
    if (!customerInfo.name.trim() || !customerInfo.phone.trim()) {
       alert("Please enter your name and phone number");
       return;
    }
    // Store phone for status matching
    localStorage.setItem('ccb_customer_phone', customerInfo.phone);
    setShowCustomerModal(false);
  };


  const addToCart = (item) => {
    setCart(prev => ({
      ...prev,
      [item.id]: { ...item, quantity: (prev[item.id]?.quantity || 0) + 1 }
    }));
  };

  const removeFromCart = (id) => {
    setCart(prev => {
      if (!prev[id]) return prev;
      const newQty = prev[id].quantity - 1;
      if (newQty <= 0) {
        const { [id]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [id]: { ...prev[id], quantity: newQty } };
    });
  };

  const cartTotal = Object.values(cart).reduce((sum, item) => sum + item.price * item.quantity, 0);
  const cartCount = Object.values(cart).reduce((sum, item) => sum + item.quantity, 0);

  const PLATFORM_FEE_THRESHOLD = 40;
  const platformFee = cartTotal > PLATFORM_FEE_THRESHOLD ? 2 : 0;
  const grandTotal = cartTotal + platformFee;

  const scrollToCategory = (category) => {
    setActiveCategory(category);
    categoryRefs.current[category]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleViewOrder = () => {
    if (!customerInfo.name) {
      setShowCustomerModal(true);
      return;
    }
    setShowBillingModal(true);
  };

  const placeOrder = async () => {
    try {
      const orderData = {
        customer_name: customerInfo.name,
        customer_phone: customerInfo.phone,
        table_id: tableId,
        total_price: grandTotal,
        items: Object.values(cart).map(item => ({
             item_name: item.name,
             item_price: item.price,
             quantity: item.quantity
        }))
      };
      
      const res = await fetch(`${API_BASE_URL}/api/orders`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(orderData)
      });
      
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || "Order failed");
      }
      
      const createdOrder = await res.json();
      
      // Store phone for later matching
      localStorage.setItem('ccb_customer_phone', customerInfo.phone);

      setShowBillingModal(false);
      setCart({});
      setActiveOrderId(createdOrder.id);
      setOrderWaiting(true); 
      setOrderPlaced(false);
      setOrderRejected(false);
    } catch(err) {
      alert(err.message);
      console.error(err);
    }
  };

  const allFilteredItems = menuData.flatMap(cat =>
    cat.items.filter(item => item.name.toLowerCase().includes(searchTerm.toLowerCase()))
  );
  const isSearching = searchTerm.length > 0;

  return (
    <div className="m-app">
      {/* ── Header ── */}
      <header className="m-header">
        <div className="m-header-top">
          <div className="m-brand">
            <div className="m-brand-icon">☕</div>
            <div>
              <h1 className="m-brand-name">Chai Chaska Bar</h1>
              <p className="m-brand-tagline">Fresh • Warm • Authentic</p>
            </div>
          </div>
          <div className="m-table-badge" onClick={() => setShowCustomerModal(true)}>
            <span className="m-table-icon">🪑</span>
            <span>{customerInfo.name ? `Hi, ${customerInfo.name.split(' ')[0]}` : `Table ${tableId}`}</span>
          </div>
        </div>

        {/* Search */}
        <div className={`m-search-wrap ${searchFocused ? 'focused' : ''}`}>
          <span className="m-search-icon">🔍</span>
          <input
            type="text"
            placeholder="Search dishes..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            className="m-search-input"
          />
          {searchTerm && (
            <button className="m-search-clear" onClick={() => setSearchTerm('')}>✕</button>
          )}
        </div>
      </header>

      {/* ── Category Pills ── */}
      {!isSearching && (
        <nav className="m-cat-nav">
          {menuData.map(cat => (
            <button
              key={cat.category}
              className={`m-cat-pill ${activeCategory === cat.category ? 'active' : ''}`}
              onClick={() => scrollToCategory(cat.category)}
            >
              <span>{cat.emoji}</span>
              <span>{cat.category}</span>
            </button>
          ))}
        </nav>
      )}

      {/* ── Menu Body ── */}
      <main className="m-body">
        {isSearching ? (
          // Search results view
          <div className="m-search-results">
            <p className="m-results-label">
              {allFilteredItems.length} result{allFilteredItems.length !== 1 ? 's' : ''} for "{searchTerm}"
            </p>
            {allFilteredItems.length === 0 ? (
              <div className="m-empty-state">
                <div className="m-empty-icon">🍽️</div>
                <p>No dishes found</p>
                <span>Try a different keyword</span>
              </div>
            ) : (
              allFilteredItems.map(item => (
                <ItemCard key={item.id} item={item} cart={cart} addToCart={addToCart} removeFromCart={removeFromCart} />
              ))
            )}
          </div>
        ) : (
          // Full menu view
          menuData.map(cat => (
            <section
              key={cat.category}
              className="m-section"
              ref={el => categoryRefs.current[cat.category] = el}
            >
              <div className="m-section-header">
                <span className="m-section-emoji">{cat.emoji}</span>
                <h2 className="m-section-title">{cat.category}</h2>
                <span className="m-section-count">{cat.items.length}</span>
              </div>
              {cat.items.map(item => (
                <ItemCard key={item.id} item={item} cart={cart} addToCart={addToCart} removeFromCart={removeFromCart} />
              ))}
            </section>
          ))
        )}

        {/* Bottom padding for cart bar */}
        <div style={{ height: '100px' }} />
      </main>

      {/* ── Cart Bar ── */}
      {cartCount > 0 && (
        <div className="m-cart-bar">
          <div className="m-cart-info">
            <div className="m-cart-count-bubble">{cartCount}</div>
            <div>
              <p className="m-cart-label">{cartCount} item{cartCount > 1 ? 's' : ''}</p>
              <p className="m-cart-total">₹{Math.round(cartTotal)}</p>
            </div>
          </div>
          <button className="m-cart-btn" onClick={handleViewOrder}>
            View Order <span>→</span>
          </button>
        </div>
      )}

      {/* ── Customer Info Modal ── */}
      {showCustomerModal && (
        <div className="m-modal-overlay">
          <div className="m-modal-card">
            <div className="m-modal-header">
              <h2 className="m-modal-title">Welcome! 👋</h2>
              <p className="m-modal-desc">Please enter your details to proceed.</p>
            </div>
            <div className="m-modal-body">
              <div className="m-form-group">
                <label>Name</label>
                <input 
                  type="text" 
                  placeholder="e.g. Rahul" 
                  value={customerInfo.name} 
                  onChange={e => setCustomerInfo({...customerInfo, name: e.target.value})}
                />
              </div>
              <div className="m-form-group">
                <label>Phone Number</label>
                <input 
                  type="tel" 
                  placeholder="e.g. 9876543210" 
                  value={customerInfo.phone} 
                  onChange={e => setCustomerInfo({...customerInfo, phone: e.target.value})}
                />
              </div>
              <button className="m-btn-primary" onClick={handleSaveCustomer}>Continue</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Billing Summary Modal ── */}
      {showBillingModal && (
         <div className="m-modal-overlay" onClick={() => setShowBillingModal(false)}>
           <div className="m-modal-card billing" onClick={e => e.stopPropagation()}>
             <div className="m-modal-header split">
                <h2 className="m-modal-title">Checkout</h2>
                <button className="m-modal-close" onClick={() => setShowBillingModal(false)}>✕</button>
             </div>
             
             <div className="m-billing-items">
               {Object.values(cart).map(item => (
                 <div key={item.id} className="m-billing-item">
                   <div className="m-bi-info">
                     <span className="m-bi-name">{item.name}</span>
                     <span className="m-bi-unit-price">₹{Math.round(item.price)} each</span>
                   </div>
                   <div className="m-bi-actions">
                     <div className="m-qty-control mini">
                       <button className="m-qty-btn" onClick={() => removeFromCart(item.id)}>−</button>
                       <span className="m-qty-num">{item.quantity}</span>
                       <button className="m-qty-btn" onClick={() => addToCart(item)}>+</button>
                     </div>
                     <span className="m-bi-price">₹{Math.round(item.price * item.quantity)}</span>
                   </div>
                 </div>
               ))}
             </div>

             <div className="m-billing-totals">
                <div className="m-bi-row">
                  <span>Subtotal</span>
                  <span>₹{Math.round(cartTotal)}</span>
                </div>
                {platformFee > 0 && (
                  <div className="m-bi-row">
                    <span>Platform Fee</span>
                    <span>₹{Math.round(platformFee)}</span>
                  </div>
                )}
                <div className="m-bi-row grand">
                  <span>Grand Total</span>
                  <span>₹{Math.round(grandTotal)}</span>
                </div>
             </div>

             <div className="m-billing-footer" style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
                <button className="m-btn-secondary" style={{ flex: 1 }} onClick={() => setShowBillingModal(false)}>
                   + Add More Items
                </button>
                <button className="m-btn-primary" style={{ flex: 1.5, margin: 0 }} onClick={placeOrder}>
                   Place Order (₹{Math.round(grandTotal)})
                </button>
             </div>
           </div>
         </div>
      )}

      {/* ── Table Occupied Blocking Overlay ── */}
      {isTableOccupied && !activeOrderId && (
        <div className="m-success-overlay" style={{ zIndex: 1000 }}>
          <div className="m-success-card">
            <div className="m-success-anim" style={{ fontSize: '3rem' }}>🪑</div>
            <h2 className="m-success-title" style={{ color: '#6366f1' }}>Table Occupied</h2>
            <p className="m-success-msg" style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#1e293b' }}>
              "Please contact counter to add more items"
            </p>
            <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '10px' }}>
              This table already has an active session.
            </p>
            <button className="m-btn-primary" onClick={() => window.location.reload()} style={{ marginTop: '20px' }}>
              Check Again
            </button>
          </div>
        </div>
      )}

      {/* ── Order Status overlays (with Contact Counter msg if activeOrderId exists on occupied table) ── */}
      {orderWaiting && (
        <div className="m-success-overlay">
          <div className="m-success-card">
            <div className="m-waiting-anim">⏳</div>
            <h2 className="m-success-title">Order Received!</h2>
            <p className="m-success-msg">Waiting for <strong>Admin Confirmation</strong>. Please wait a moment...</p>
            {isTableOccupied && <p style={{ color: '#6366f1', fontWeight: 700, marginTop: '10px' }}>"Please contact counter to add more items"</p>}
            <div className="m-loading-bar-container">
              <div className="m-loading-bar-fill" />
            </div>
          </div>
        </div>
      )}

      {orderPlaced && (
        <div className="m-success-overlay">
          <div className="m-success-card">
            <div className="m-success-anim">🎉</div>
            <h2 className="m-success-title">Order Confirmed!</h2>
            <p className="m-success-msg">Your order for <strong>Table {tableId}</strong> has been accepted and is being prepared.</p>
            {isTableOccupied && <p style={{ color: '#6366f1', fontWeight: 700, marginTop: '10px' }}>"Please contact counter to add more items"</p>}
            <button className="m-btn-primary" onClick={() => window.location.href = '/'}>Done</button>
          </div>
        </div>
      )}

      {/* ── Order Rejected ── */}
      {orderRejected && (
        <div className="m-success-overlay">
          <div className="m-success-card" style={{ borderTop: '5px solid #ef4444' }}>
            <div className="m-success-anim">❌</div>
            <h2 className="m-success-title" style={{ color: '#ef4444' }}>Order Rejected</h2>
            <p className="m-success-msg">Your order was rejected. Please contact the counter.</p>
            <button className="m-btn-primary" style={{ background: '#ef4444', marginTop: '15px' }} onClick={() => setOrderRejected(false)}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
};

const ItemCard = ({ item, cart, addToCart, removeFromCart }) => {
  const inCart = cart[item.id];
  return (
    <div className="m-item-card">
      <div className="m-item-img-wrap">
        <img src={item.image_url || item.image} alt={item.name} className="m-item-img" loading="lazy" />
        {inCart && <div className="m-item-qty-badge">{inCart.quantity}</div>}
      </div>
      <div className="m-item-info">
        <div className="m-item-top">
          {item.veg && <VegIcon />}
          <h3 className="m-item-name">{item.name}</h3>
        </div>
        <p className="m-item-desc">{item.description}</p>
        <div className="m-item-footer">
          <span className="m-item-price">₹{Math.round(item.price)}</span>
          {inCart ? (
            <div className="m-qty-control">
              <button className="m-qty-btn" onClick={() => removeFromCart(item.id)}>−</button>
              <span className="m-qty-num">{inCart.quantity}</span>
              <button className="m-qty-btn" onClick={() => addToCart(item)}>+</button>
            </div>
          ) : (
            <button className="m-add-btn" onClick={() => addToCart(item)}>
              <span>+</span> ADD
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Menu;
