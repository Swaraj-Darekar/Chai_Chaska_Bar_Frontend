import React from 'react';
import './About.css';

const About = () => {
  return (
    <section className="section about-section" id="about">
      <div className="container">
        <div className="about-grid">
          <div className="about-image-wrapper fade-in-up">
            <div className="about-image-container">
              <img 
                src="https://images.unsplash.com/photo-1576092762791-dd9e2220abd4?q=80&w=1000&auto=format&fit=crop" 
                alt="Pouring hot masala chai" 
                className="about-img"
              />
              <div className="about-badge">
                <span>100%</span>
                <p>Authentic</p>
              </div>
            </div>
          </div>
          
          <div className="about-content fade-in-up delay-200">
            <h3 className="section-subtitle">Our Story</h3>
            <h2 className="section-title">The Perfect Cup Every Time</h2>
            <div className="title-underline"></div>
            
            <p className="about-text">
              At Chai Chaska Bar, we believe that chai is more than just a beverage; 
              it's an emotion, a conversation starter, and a daily ritual. Born from 
              a deep passion for authentic Indian street flavors, we source the finest 
              tea leaves from the gardens of Assam and Darjeeling.
            </p>
            
            <p className="about-text">
              Every cup of our signature Kulhad Chai is brewed to perfection with hand-pounded 
              spices and a lot of love, bringing you the authentic aroma and taste that 
              feels like a warm hug.
            </p>

            <div className="features-list">
              <div className="feature-item">
                <span className="feature-icon">🌿</span>
                <div>
                  <h4>Premium Tea Leaves</h4>
                  <p>Sourced directly from finest estates</p>
                </div>
              </div>
              <div className="feature-item">
                <span className="feature-icon">☕</span>
                <div>
                  <h4>Served in Kulhads</h4>
                  <p>Earthy flavor and eco-friendly</p>
                </div>
              </div>
              <div className="feature-item">
                <span className="feature-icon">✨</span>
                <div>
                  <h4>Fresh Ingredients</h4>
                  <p>Hand-pounded spices daily</p>
                </div>
              </div>
            </div>
            
          </div>
        </div>
      </div>
    </section>
  );
};

export default About;
