import React, { useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import './HomePage.css'

function HomePage() {
  const navigate = useNavigate()
  const exploreSectionRef = useRef(null)

  const handleGetStartedClick = () => {
    if (exploreSectionRef.current) {
      exploreSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  const handleBankingClick = () => {
    navigate('/bank-services')
  }

  const handleTelecomClick = () => {
    alert('Telecom services - Coming soon!')
  }

  return (
    <div className="homepage">
      {/* Header */}
      <Navbar />

      {/* Hero Section */}
      <section id="home" className="hero">
        <div className="hero-shapes">
          <div className="shape shape-1"></div>
          <div className="shape shape-2"></div>
          <div className="shape shape-3"></div>
        </div>
        <div className="container">
          <h1>Comparison for finding the best deal</h1>
          <p className="hero-subtitle">
            Empowering Bangladesh with data-driven financial comparison and intelligent 
            decision-making solutions
          </p>
          <div className="hero-buttons">
            <button className="get-started-btn" onClick={handleGetStartedClick}>
              <span>Get Started</span>
              <i className="fas fa-arrow-right"></i>
            </button>
            <button className="learn-more-btn">
              <i className="fas fa-play-circle"></i>
              <span>Learn More</span>
            </button>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section id="explore-services" className="categories" ref={exploreSectionRef}>
        <div className="container">
          <h2 className="section-title explore-services-title">Explore Services</h2>
          <div className="category-grid">
            {/* Banking */}
            <div className="category-card banking-card" onClick={handleBankingClick}>
              <div className="card-glow"></div>
              <div className="category-icon">
                <i className="fas fa-university"></i>
              </div>
              <div className="category-number">01</div>
              <h3>Banking Services</h3>
              <p>Compare credit cards, loans, deposits, and investment options from top banks</p>
              <div className="category-tags">
                <span className="tag"><i className="fas fa-credit-card"></i> Credit Cards</span>
                <span className="tag"><i className="fas fa-hand-holding-usd"></i> Loans</span>
                <span className="tag"><i className="fas fa-piggy-bank"></i> Deposits</span>
                <span className="tag"><i className="fas fa-chart-line"></i> Investments</span>
              </div>
              <button className="explore-btn">
                <span>Explore Banking</span>
                <i className="fas fa-arrow-right"></i>
              </button>
            </div>

            {/* Telecom */}
            <div className="category-card telecom-card" onClick={handleTelecomClick}>
              <div className="card-glow"></div>
              <div className="category-icon">
                <i className="fas fa-mobile-alt"></i>
              </div>
              <div className="category-number">02</div>
              <h3>Telecom Services</h3>
              <p>Find the best mobile plans, broadband, and DTH services tailored to your needs</p>
              <div className="category-tags">
                <span className="tag"><i className="fas fa-mobile-alt"></i> Mobile Plans</span>
                <span className="tag"><i className="fas fa-wifi"></i> Broadband</span>
                <span className="tag"><i className="fas fa-satellite-dish"></i> DTH</span>
                <span className="tag"><i className="fas fa-gift"></i> Bundles</span>
              </div>
              <button className="explore-btn">
                <span>Explore Telecom</span>
                <i className="fas fa-arrow-right"></i>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="features">
        <div className="container">
          <h2 className="section-title">Why Choose TULONA?</h2>
          <div className="feature-grid">
            <div className="feature-card">
              <div className="feature-icon">
                <i className="fas fa-balance-scale"></i>
              </div>
              <h4>Easy Comparison</h4>
              <p>Compare multiple products side-by-side with detailed charts and tables</p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">
                <i className="fas fa-robot"></i>
              </div>
              <h4>AI Recommendations</h4>
              <p>Get personalized suggestions based on your profile and preferences</p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">
                <i className="fas fa-shield-alt"></i>
              </div>
              <h4>Secure & Trusted</h4>
              <p>Your data is protected with enterprise-grade security</p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">
                <i className="fas fa-bolt"></i>
              </div>
              <h4>Quick Decisions</h4>
              <p>Make informed choices faster with our smart filters</p>
            </div>
          </div>
        </div>
      </section>

      {/* About */}
      <section id="about" className="about-section">
        <div className="container">
          <div className="about-card">
            <h2 className="section-title about-title">About Us</h2>
            <p className="about-message">
              Project of Sadia and Mrinmoy. Which will help you find the best deal possible.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer id="contact" className="footer">
        <div className="container">
          <div className="contact-section">
            <h3 className="contact-title">Contact Developers</h3>

            <div className="contact-grid">
              <div className="contact-card">
                <h4 className="developer-name">Sadia Akter Snigdha</h4>
                <p className="contact-item">
                  <span>Contact no:</span>{' '}
                  <a href="tel:01848156590">01848156590</a>
                </p>
                <p className="contact-item">
                  <span>Mail:</span>{' '}
                  <a href="mailto:bsse1513@iit.du.ac.bd">bsse1513@iit.du.ac.bd</a>
                </p>
              </div>

              <div className="contact-card">
                <h4 className="developer-name">Mrinmoy Poit</h4>
                <p className="contact-item">
                  <span>Contact no:</span>{' '}
                  <a href="tel:01751285949">01751285949</a>
                </p>
                <p className="contact-item">
                  <span>Mail:</span>{' '}
                  <a href="mailto:bsse1524@iit.du.ac.bd">bsse1524@iit.du.ac.bd</a>
                </p>
              </div>
            </div>
          </div>

          <p>&copy; 2026 TULONA. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}

export default HomePage
