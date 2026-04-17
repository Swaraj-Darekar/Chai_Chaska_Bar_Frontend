import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import About from './components/About';
import MenuHighlights from './components/MenuHighlights';
import Footer from './components/Footer';
import SuperAdmin from './admin/SuperAdmin';
import Admin from './admin/Admin';
import Menu from './menu/Menu';
import Login from './auth/Login';

// Protected Route Component
const ProtectedRoute = ({ children, role }) => {
  // Use a slight delay or reactive check if needed, but for now, ensure it reads correctly
  const isAdmin = localStorage.getItem('ccb_admin_auth') === 'true';
  const isSuperAdmin = localStorage.getItem('ccb_superadmin_auth') === 'true';
  
  // Debugging logs to help identify refresh issues in production
  console.log(`Auth Check - Role: ${role}, isAdmin: ${isAdmin}, isSuperAdmin: ${isSuperAdmin}`);

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
    </div>
  );
}

export default App;
