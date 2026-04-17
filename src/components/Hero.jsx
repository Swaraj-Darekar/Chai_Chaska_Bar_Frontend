import React, { useEffect, useState } from 'react';
import './Hero.css';

const Hero = () => {
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <section className="hero-section" id="home">
      <div 
        className="hero-background"
        style={{ transform: `translateY(${scrollY * 0.5}px)` }}
      ></div>
      <div className="hero-overlay"></div>
      
      <div className="container hero-content">
        <div className="hero-text-wrapper">
          <h2 className="hero-subtitle fade-in-up">Welcome to</h2>
          <h1 className="hero-title fade-in-up delay-100">
            <span className="text-gradient">Chai Chaska Bar</span>
          </h1>
          <p className="hero-description fade-in-up delay-200">
            Experience the authentic taste of Indian street chai in a modern, 
            cozy setting. Where every sip tells a story of tradition.
          </p>
          <div className="hero-cta-group fade-in-up delay-300">
            <a href="#menu" className="btn btn-primary">Explore Menu</a>
            <a href="#about" className="btn btn-outline">Our Story</a>
          </div>
        </div>
      </div>

      <div className="scroll-indicator fade-in-up delay-300">
        <span className="mouse">
          <span className="wheel"></span>
        </span>
      </div>
    </section>
  );
};

export default Hero;
