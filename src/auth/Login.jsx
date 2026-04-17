import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './Login.css';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogin = (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Simulate network delay
    setTimeout(() => {
      if (username === 'admin' && password === 'admin123') {
        localStorage.setItem('ccb_admin_auth', 'true');
        localStorage.removeItem('ccb_superadmin_auth'); // Clear other role
        navigate('/admin');
      } else if (username === 'superadmin' && password === 'superadmin123') {
        localStorage.setItem('ccb_superadmin_auth', 'true');
        localStorage.removeItem('ccb_admin_auth'); // Clear other role
        navigate('/superadmin');
      } else {
        setError('Invalid username or password');
        setLoading(false);
      }
    }, 800);
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-card">
          <div className="login-header">
            <div className="login-logo">☕</div>
            <h1>Welcome Back</h1>
            <p>Please enter your credentials to access the dashboard</p>
          </div>

          <form className="login-form" onSubmit={handleLogin}>
            <div className="form-group">
              <label>Username</label>
              <div className="input-wrapper">
                <span className="input-icon">👤</span>
                <input
                  type="text"
                  placeholder="Enter your username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label>Password</label>
              <div className="input-wrapper">
                <span className="input-icon">🔒</span>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            {error && <div className="login-error">{error}</div>}

            <button type="submit" className={`login-button ${loading ? 'loading' : ''}`} disabled={loading}>
              {loading ? 'Authenticating...' : 'Sign In'}
            </button>
          </form>

          <div className="login-footer">
            <p>© {new Date().getFullYear()} Chai Chaska Bar. Authorized Access Only.</p>
          </div>
        </div>
      </div>
      
      {/* Background elements for aesthetic */}
      <div className="login-bg-circles">
        <div className="circle circle-1"></div>
        <div className="circle circle-2"></div>
      </div>
    </div>
  );
};

export default Login;
