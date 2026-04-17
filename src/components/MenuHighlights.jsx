import React from 'react';
import './MenuHighlights.css';

const menuItems = [
  {
    id: 1,
    name: 'Kulhad Classic Chai',
    description: 'Our signature blend brewed slowly in earthen pots.',
    price: '₹20',
    image: 'https://images.unsplash.com/photo-1561336313-0bd5e0b27ec8?q=80&w=600&auto=format&fit=crop',
    tag: 'Bestseller'
  },
  {
    id: 2,
    name: 'Masala Chaska',
    description: 'Special blend of 7 hand-pounded spices for that extra kick.',
    price: '₹25',
    image: 'https://images.unsplash.com/photo-1596489379201-92931a74d28e?q=80&w=600&auto=format&fit=crop'
  },
  {
    id: 3,
    name: 'Bun Maska',
    description: 'Soft sweet buns generously slathered with butter.',
    price: '₹40',
    image: 'https://images.unsplash.com/photo-1589367920950-5ab350e9140e?q=80&w=600&auto=format&fit=crop'
  },
  {
    id: 4,
    name: 'Crispy Samosa',
    description: 'Golden fried pastry filled with spiced potatoes and peas.',
    price: '₹15',
    image: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?q=80&w=600&auto=format&fit=crop'
  }
];

const MenuHighlights = () => {
  return (
    <section className="section menu-section" id="menu">
      <div className="container">
        <div className="section-header text-center fade-in-up">
          <h3 className="section-subtitle">Discover</h3>
          <h2 className="section-title">Our Signature Menu</h2>
          <div className="title-underline mx-auto"></div>
        </div>

        <div className="menu-grid">
          {menuItems.map((item, index) => (
            <div 
              className={`menu-card fade-in-up delay-${(index + 1) * 100}`} 
              key={item.id}
            >
              <div className="menu-image-container">
                <img src={item.image} alt={item.name} className="menu-image" />
                {item.tag && <span className="menu-tag">{item.tag}</span>}
              </div>
              <div className="menu-info">
                <div className="menu-header-row">
                  <h4 className="menu-name">{item.name}</h4>
                  <span className="menu-price">{item.price}</span>
                </div>
                <p className="menu-desc">{item.description}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="menu-cta-container fade-in-up delay-300">
          <button className="btn btn-outline">View Full Menu</button>
        </div>
      </div>
    </section>
  );
};

export default MenuHighlights;
