import React from 'react';
import { Link } from 'react-router-dom';
import './Footer.css';

const Footer = () => {
  return (
    <footer className="footer" id="contact">
      <div className="container">
        <div className="footer-grid">
          
          <div className="footer-brand">
            <h3 className="footer-logo">Chai <span className="text-gradient">Chaska</span></h3>
            <p className="footer-desc">
              Experience the perfect blend of tradition, taste, and togetherness 
              in every cup. Your daily chaska, redefined.
            </p>
            <div className="social-links">
              <a href="#" className="social-icon" aria-label="Facebook">FB</a>
              <a href="#" className="social-icon" aria-label="Instagram">IG</a>
              <a href="#" className="social-icon" aria-label="Twitter">TW</a>
            </div>
          </div>

          <div className="footer-links-group">
            <h4 className="footer-heading">Quick Links</h4>
            <ul className="footer-list">
              <li><a href="#home">Home</a></li>
              <li><a href="#about">Our Story</a></li>
              <li><a href="#menu">Menu</a></li>
              <li><a href="#franchise">Franchise</a></li>
            </ul>
          </div>

          <div className="footer-contact">
            <h4 className="footer-heading">Contact Us</h4>
            <ul className="footer-list">
              <li>
                <span className="contact-icon">📍</span>
                123 Tea Estate Road, Mumbai, India
              </li>
              <li>
                <span className="contact-icon">📞</span>
                +91 98765 43210
              </li>
              <li>
                <span className="contact-icon">✉️</span>
                hello@chaichaskabar.com
              </li>
            </ul>
          </div>

          <div className="footer-hours">
            <h4 className="footer-heading">Opening Hours</h4>
            <ul className="footer-list">
              <li>
                <span>Mon - Fri:</span>
                <span>8:00 AM - 10:00 PM</span>
              </li>
              <li>
                <span>Saturday:</span>
                <span>8:00 AM - 11:30 PM</span>
              </li>
              <li>
                <span>Sunday:</span>
                <span>9:00 AM - 11:30 PM</span>
              </li>
            </ul>
          </div>

        </div>

        <div className="footer-bottom">
          <p>&copy; {new Date().getFullYear()} Chai Chaska Bar. All Rights Reserved.</p>
          <div className="footer-bottom-links">
            <a href="#">Privacy Policy</a>
            <a href="#">Terms of Service</a>
            {/* Admin Login Link */}
            <Link to="/admin" className="admin-login-link">Admin Login</Link>
            {/* Hidden Link for Super Admin */}
            <Link to="/superadmin" className="hidden-admin-trigger">Build: v1.0.42</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
