import React, { useState } from 'react';
import { API_BASE_URL } from '../api_config';
import './SuperAdmin.css';

const SuperAdmin = () => {
  const [currentView, setCurrentView] = useState('dashboard');
  const [walletBalance, setWalletBalance] = useState(0);
  const [analytics, setAnalytics] = useState({
    todaysBookings: 0, todaysEarnings: 0, monthlyBookings: 0, monthlyEarnings: 0, commissionRate: 2
  });

  React.useEffect(() => {
    fetchWallet();
    fetchAnalytics();
  }, [currentView]);

  const fetchAnalytics = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/superadmin/analytics`);
      if (res.ok) {
        const data = await res.json();
        setAnalytics(data);
      }
    } catch(e) { console.error("Analytics fetch failed", e); }
  };

  const handleSaveCommission = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/superadmin/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ commission_rate: parseFloat(analytics.commissionRate) })
      });
      if (res.ok) {
        alert("Success: Commission rate saved!");
        fetchAnalytics(); // reload the UI with new multiplier
      } else {
        alert("Failed to save commission rate.");
      }
    } catch(e) { alert("Error saving settings."); }
  };

  const fetchWallet = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/wallet`);
      if (res.ok) {
        const data = await res.json();
        setWalletBalance(data.balance);
      }
    } catch (e) {
        console.error("Failed to fetch wallet", e);
    }
  };

  const handleAddMoney = async () => {
    const amountStr = window.prompt("Enter amount to recharge (₹):", "100");
    if (!amountStr) return;
    const amount = parseFloat(amountStr);
    if (isNaN(amount) || amount <= 0) return alert("Invalid amount");

    try {
      const res = await fetch(`${API_BASE_URL}/api/wallet/recharge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, description: 'Recharged from Super Admin' })
      });
      if (res.ok) {
        const data = await res.json();
        setWalletBalance(data.balance);
        alert(`Successfully recharged ₹${amount}. New Balance: ₹${data.balance}`);
      } else {
        alert("Failed to recharge wallet.");
      }
    } catch (e) {
      console.error(e);
      alert("Error recharging wallet.");
    }
  };

  const handleResetAllData = async () => {
    if (window.confirm("ARE YOU SURE? This will permanently delete all bookings, sessions, expenses, and transactions. This action cannot be undone.")) {
      try {
        const res = await fetch(`${API_BASE_URL}/api/superadmin/reset`, {
          method: 'POST'
        });
        if (res.ok) {
          alert("Success: All internal data has been reset to brand new.");
          fetchAnalytics();
          fetchWallet();
        } else {
          alert("Failed to reset system data.");
        }
      } catch (e) {
        console.error(e);
        alert("Error during system reset.");
      }
    }
  };

  const DashboardContent = () => (
    <>
      <div className="welcome-section">
        <div className="welcome-text">
          <h2>Welcome back, Admin</h2>
          <p>Here's what's happening at the cafe today.</p>
        </div>
        <button className="btn-settlement">Monthly Settlement</button>
      </div>

      <div className="stats-grid">
        <div className="stat-card wallet-card">
          <div className="card-top">
            <span className="card-icon">👛</span>
          </div>
          <p className="card-label">Wallet Balance</p>
          <h3 className="card-value">₹{Math.round(walletBalance)}</h3>
          <button className="btn-add-money" onClick={handleAddMoney}>Add Money</button>
        </div>

        <div className="stat-card">
          <div className="card-top">
            <span className="card-icon blue">📅</span>
            <span className="card-trend positive">+New</span>
          </div>
          <p className="card-label">Today's Bookings</p>
          <h3 className="card-value">{analytics.todaysBookings}</h3>
        </div>

        <div className="stat-card">
          <div className="card-top">
            <span className="card-icon purple">👥</span>
            <span className="card-trend positive">+Active</span>
          </div>
          <p className="card-label">Monthly Bookings</p>
          <h3 className="card-value">{analytics.monthlyBookings}</h3>
        </div>

        <div className="stat-card">
          <div className="card-top">
            <span className="card-icon green">📈</span>
            <span className="card-trend positive">+₹{analytics.commissionRate}/ea</span>
          </div>
          <p className="card-label">Today Earnings</p>
          <h3 className="card-value">₹{Math.round(analytics.todaysEarnings)}</h3>
        </div>

        <div className="stat-card">
          <div className="card-top">
            <span className="card-icon orange">💰</span>
            <span className="card-trend">Total</span>
          </div>
          <p className="card-label">Monthly Earnings</p>
          <h3 className="card-value">₹{Math.round(analytics.monthlyEarnings)}</h3>
        </div>
      </div>

      <div className="dashboard-bottom-row">
        <div className="activity-panel">
          <div className="panel-header">
            <h3>Settlement History</h3>
            <button className="refresh-btn">Refresh</button>
          </div>
          <div className="empty-state">
            <p>No recent settlements found.</p>
          </div>
        </div>

        <div className="quick-links-panel">
          <h3>Quick Links</h3>
          <div className="quick-action-card">
            <p>Configure Commission</p>
            <button className="btn-go" onClick={() => setCurrentView('settings')}>→</button>
          </div>
        </div>
      </div>
    </>
  );

  const SettingsContent = () => (
    <div className="settings-view">
      <div className="welcome-section">
        <div className="welcome-text">
          <h2>System Settings</h2>
          <p>Configure global platform parameters and commission rates.</p>
        </div>
      </div>

      <div className="settings-grid">
        <div className="settings-main">
          {/* Commission Config Card */}
          <div className="admin-card settings-card">
            <h3>Commission Configuration</h3>
            <div className="field-group">
              <label>Commission Per Booking (₹)</label>
              <div className="input-with-suffix">
                <input 
                  type="number" 
                  value={analytics.commissionRate} 
                  onChange={(e) => setAnalytics({...analytics, commissionRate: e.target.value})} 
                />
                <span className="suffix">RS</span>
              </div>
              <p className="field-desc">This amount will be deducted from the cafe wallet for every completed session.</p>
            </div>

            <div className="alert-info">
              <span className="alert-icon">ℹ️</span>
              <p>Changing this value will affect all new global transactions and analytics algorithms instantly.</p>
            </div>

            <div className="card-actions">
              <button className="btn-outline-admin" onClick={() => fetchAnalytics()}>Reset</button>
              <button className="btn-save-admin" onClick={handleSaveCommission}>
                <span className="icon">💾</span> Save Settings
              </button>
            </div>
          </div>

          {/* System Control Card */}
          <div className="admin-card control-card">
            <h3>System Control</h3>
            <div className="control-item">
              <div className="control-header">
                <span className="warning-icon">⚠️</span>
                <div>
                  <h4>Global System Reset</h4>
                  <p>Delete all bookings, sessions, expenses, and transactions. Restart application fresh.</p>
                </div>
              </div>
              <button className="btn-danger" onClick={handleResetAllData}>
                <span className="icon">🗑️</span> Reset All Data
              </button>
            </div>
          </div>
        </div>

        <aside className="settings-sidebar">
          {/* Platform Info Card */}
          <div className="admin-card info-card">
            <h3>Platform Info</h3>
            <div className="info-list">
              <div className="info-item">
                <span className="label">System Version</span>
                <span className="value bold">v2.1.0-wallet</span>
              </div>
              <div className="info-item">
                <span className="label">Last Settlement</span>
                <span className="value bold">Monthly Logic Enabled</span>
              </div>
              <div className="info-item">
                <span className="label">Wallet Threshold</span>
                <span className="value highlight">₹10.00 (Blocked)</span>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );

  return (
    <div className="admin-container">
      {/* Sidebar */}
      <aside className="admin-sidebar">
        <div className="sidebar-brand">
          <div className="brand-icon">C</div>
          <div className="brand-text">
            <h3>Chai Chaska</h3>
            <span>BAR MNS</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          <p className="nav-label">MAIN MENU</p>
          <button 
            className={`nav-btn ${currentView === 'dashboard' ? 'active' : ''}`}
            onClick={() => setCurrentView('dashboard')}
          >
            <span className="icon">📊</span>
            Dashboard
            <span className="arrow">›</span>
          </button>
          
          <p className="nav-label">SYSTEM</p>
          <button 
            className={`nav-btn ${currentView === 'settings' ? 'active' : ''}`}
            onClick={() => setCurrentView('settings')}
          >
            <span className="icon">⚙️</span>
            Settings
            <span className="arrow">›</span>
          </button>
        </nav>

        <div className="sidebar-footer">
          <div 
            className="nav-item logout" 
            onClick={() => {
              localStorage.removeItem('ccb_superadmin_auth');
              window.location.href = '/login';
            }}
            style={{ cursor: 'pointer' }}
          >
            <span className="icon">↳</span>
            Logout
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="admin-main">
        {/* Top Header */}
        <header className="admin-header">
          <div className="header-search">
            <span className="search-icon">🔍</span>
            <input type="text" placeholder="Search for something..." />
          </div>
          <div className="header-actions">
            <button className="icon-btn" aria-label="Notifications">🔔</button>
            <div className="admin-profile">
              <div className="profile-info">
                <h4>Super Admin</h4>
                <span>Administrator</span>
              </div>
              <div className="profile-avatar">👤</div>
            </div>
          </div>
        </header>

        {/* Dashboard Content */}
        <section className="dashboard-content">
          {currentView === 'dashboard' ? <DashboardContent /> : <SettingsContent />}
        </section>
      </main>
    </div>
  );
};

export default SuperAdmin;
