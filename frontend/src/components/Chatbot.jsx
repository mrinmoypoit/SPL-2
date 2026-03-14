import React, { useState, useRef, useEffect } from 'react'
import './Chatbot.css'

function Chatbot() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: 'bot',
      text: 'Hello! I\'m your TULONA AI assistant. How can I help you today?',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ])
  const [inputMessage, setInputMessage] = useState('')
  const messagesEndRef = useRef(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSendMessage = (e) => {
    e.preventDefault()
    if (!inputMessage.trim()) return

    const userMessage = {
      id: messages.length + 1,
      type: 'user',
      text: inputMessage,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }

    setMessages([...messages, userMessage])
    setInputMessage('')

    // Simulate bot response
    setTimeout(() => {
      const botResponse = {
        id: messages.length + 2,
        type: 'bot',
        text: getBotResponse(inputMessage),
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
      setMessages(prev => [...prev, botResponse])
    }, 1000)
  }

  const getBotResponse = (message) => {
    const lowerMessage = message.toLowerCase()
    
    if (lowerMessage.includes('loan') || lowerMessage.includes('credit')) {
      return 'I can help you compare loans and credit cards! Would you like to see our best offers? We have options for personal loans, home loans, and credit cards with great rewards.'
    } else if (lowerMessage.includes('bank') || lowerMessage.includes('deposit')) {
      return 'Looking for banking services? I can help you compare deposit rates, account types, and find the best bank for your needs. What specific service are you interested in?'
    } else if (lowerMessage.includes('telecom') || lowerMessage.includes('mobile')) {
      return 'I can help you find the perfect mobile plan! We compare plans from all major telecom providers. What\'s your monthly usage like?'
    } else if (lowerMessage.includes('help') || lowerMessage.includes('guide')) {
      return 'I\'m here to help! You can ask me about:\n• Credit cards and loans\n• Bank accounts and deposits\n• Mobile and telecom plans\n• Personalized recommendations\n\nWhat would you like to know more about?'
    } else {
      return 'Thank you for your message! Our AI is learning to provide better responses. In the meantime, you can explore our comparison tools for banking and telecom services. Is there anything specific I can help you with?'
    }
  }

  const quickActions = [
    { icon: 'fa-credit-card', text: 'Find Credit Cards' },
    { icon: 'fa-hand-holding-usd', text: 'Compare Loans' },
    { icon: 'fa-mobile-alt', text: 'Mobile Plans' },
    { icon: 'fa-piggy-bank', text: 'Best Deposits' }
  ]

  return (
    <>
      {/* Chat Window */}
      {isOpen && (
        <div className="chatbot-window">
          <div className="chatbot-header">
            <div className="chatbot-header-info">
              <div className="chatbot-avatar">
                <i className="fas fa-robot"></i>
              </div>
              <div>
                <h4>TULONA AI</h4>
                <span className="status">Online</span>
              </div>
            </div>
            <button className="close-chat" onClick={() => setIsOpen(false)}>
              <i className="fas fa-times"></i>
            </button>
          </div>

          <div className="chatbot-messages">
            {messages.map((message) => (
              <div key={message.id} className={`message ${message.type}`}>
                {message.type === 'bot' && (
                  <div className="message-avatar">
                    <i className="fas fa-robot"></i>
                  </div>
                )}
                <div className="message-content">
                  <p>{message.text}</p>
                  <span className="message-time">{message.time}</span>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          <div className="quick-actions">
            {quickActions.map((action, index) => (
              <button
                key={index}
                className="quick-action-btn"
                onClick={() => setInputMessage(action.text)}
              >
                <i className={`fas ${action.icon}`}></i>
                <span>{action.text}</span>
              </button>
            ))}
          </div>

          <form className="chatbot-input" onSubmit={handleSendMessage}>
            <input
              type="text"
              placeholder="Type your message..."
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
            />
            <button type="submit">
              <i className="fas fa-paper-plane"></i>
            </button>
          </form>
        </div>
      )}

      {/* Floating Button */}
      <button
        className={`chatbot-toggle ${isOpen ? 'active' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        title="Chat with AI Assistant"
      >
        {isOpen ? (
          <i className="fas fa-times"></i>
        ) : (
          <>
            <i className="fas fa-robot"></i>
            <span className="chat-badge">AI</span>
          </>
        )}
      </button>
    </>
  )
}

export default Chatbot
