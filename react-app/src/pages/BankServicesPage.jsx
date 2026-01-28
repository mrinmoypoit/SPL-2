import React from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import './BankServicesPage.css'

function BankServicesPage() {
  const navigate = useNavigate()

  const services = [
    { 
      title: 'Loans', 
      icon: 'fa-hand-holding-usd',
      description: 'Personal, home, and business loans with competitive rates',
      tags: ['Personal Loan', 'Home Loan', 'Auto Loan'],
      number: '01'
    },
    { 
      title: 'Deposits', 
      icon: 'fa-piggy-bank',
      description: 'Secure your savings with high-interest deposit accounts',
      tags: ['Fixed Deposit', 'Savings', 'Recurring Deposit'],
      number: '02'
    },
    { 
      title: 'Credit Cards', 
      icon: 'fa-credit-card',
      description: 'Explore cards with rewards, cashback, and travel benefits',
      tags: ['Rewards', 'Cashback', 'Travel'],
      number: '03'
    }
  ]

  return (
    <div className="bank-services-page">
      {/* Header */}
      <Navbar />

      {/* Floating Shapes */}
      <div className="bank-shapes">
        <div className="bank-shape bank-shape-1"></div>
        <div className="bank-shape bank-shape-2"></div>
        <div className="bank-shape bank-shape-3"></div>
      </div>

      {/* Services Section */}
      <div className="services-container">
        <div className="services-header">
          <h1 className="services-title">Banking Services</h1>
          <p className="services-subtitle">Choose the service that best fits your financial needs</p>
        </div>

        <div className="services-grid">
          {services.map((service, idx) => (
            <div key={idx} className="service-card">
              <div className="service-glow"></div>
              <div className="service-number">{service.number}</div>
              <div className="service-icon-wrapper">
                <i className={`fas ${service.icon}`}></i>
              </div>
              <h3>{service.title}</h3>
              <p>{service.description}</p>
              <div className="service-tags">
                {service.tags.map((tag, i) => (
                  <span key={i} className="service-tag">{tag}</span>
                ))}
              </div>
              <button className="service-explore-btn">
                <span>Explore {service.title}</span>
                <i className="fas fa-arrow-right"></i>
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default BankServicesPage
