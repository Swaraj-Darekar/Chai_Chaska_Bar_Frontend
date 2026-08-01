import React, { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import About from './components/About';
import MenuHighlights from './components/MenuHighlights';
import Footer from './components/Footer';
import Menu from './menu/Menu';
import Login from './auth/Login';

// Lazy-load heavy admin pages — only downloaded when actually visited
const SuperAdmin = lazy(() => import('./admin/SuperAdmin'));
const Admin = lazy(() => import('./admin/Admin'));

// Minimal loading fallback
const PageLoader = () => (
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#fff8f3' }}>
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>☕</div>
      <p style={{ color: '#e8580c', fontWeight: 600 }}>Loading...</p>
    </div>
  </div>
);

// Protected Route Component
const ProtectedRoute = ({ children, role }) => {
  // Use a slight delay or reactive check if needed, but for now, ensure it reads correctly
  const isAdmin = localStorage.getItem('ccb_admin_auth') === 'true';
  const isSuperAdmin = localStorage.getItem('ccb_superadmin_auth') === 'true';
  
  if (role === 'superadmin' && !isSuperAdmin) {
    return <Navigate to="/login" replace />;
  }
  if (role === 'admin' && !isAdmin) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

// Landing Page Layout
const LandingPage = () => {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <About />
        <MenuHighlights />
      </main>
      <Footer />
    </>
  );
};

function App() {
  return (
    <div className="app-wrapper">
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<Login />} />
          <Route 
            path="/admin" 
            element={
              <ProtectedRoute role="admin">
                <Admin />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/superadmin" 
            element={
              <ProtectedRoute role="superadmin">
                <SuperAdmin />
              </ProtectedRoute>
            } 
          />
          <Route path="/menu" element={<Menu />} />
        </Routes>
      </Suspense>
    </div>
  );
}

export default App;
