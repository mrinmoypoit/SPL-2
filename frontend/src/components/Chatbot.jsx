import React, { useState, useRef, useEffect } from 'react'
import './Chatbot.css'
import { aiAPI } from '../services/api'

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
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const createMessage = (type, text) => ({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type,
    text,
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  })

  const createStreamingBotMessage = () => {
    const messageId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

    setMessages(prev => [
      ...prev,
      {
        id: messageId,
        type: 'bot',
        text: '',
        time,
        isStreaming: true
      }
    ])

    return messageId
  }

  const appendToBotMessage = (messageId, chunkText) => {
    setMessages(prev =>
      prev.map((message) =>
        message.id === messageId
          ? {
              ...message,
              text: `${message.text || ''}${chunkText || ''}`,
              isStreaming: true
            }
          : message
      )
    )
  }

  const finalizeBotMessage = (messageId, options = {}) => {
    const { finalText, fallbackText = 'I could not generate a response. Please try again.' } = options

    setMessages(prev =>
      prev.map((message) => {
        if (message.id !== messageId) {
          return message
        }

        const resolvedText = String(finalText ?? message.text ?? '').trim() || fallbackText

        return {
          ...message,
          text: resolvedText,
          isStreaming: false
        }
      })
    )
  }

  const sendToAssistant = async (question) => {
    setIsLoading(true)
    const streamMessageId = createStreamingBotMessage()
    let streamHasChunks = false

    try {
      const donePayload = await aiAPI.askStream(question, {
        onChunk: (payload) => {
          streamHasChunks = true
          appendToBotMessage(streamMessageId, payload?.text || '')
        },
        onDone: (payload) => {
          if (!streamHasChunks && payload?.answer) {
            finalizeBotMessage(streamMessageId, { finalText: payload.answer })
          }
        }
      })

      finalizeBotMessage(streamMessageId, {
        finalText: donePayload?.answer,
        fallbackText: 'I could not generate an answer right now. Please try again.'
      })
    } catch (error) {
      try {
        const response = await aiAPI.ask(question)
        const answerText = response?.answer || 'I could not generate an answer right now. Please try again.'
        finalizeBotMessage(streamMessageId, { finalText: answerText })
      } catch (fallbackError) {
        const mergedError = fallbackError?.message || error?.message || ''
        finalizeBotMessage(streamMessageId, {
          finalText: `Sorry, I could not reach the AI service right now. ${mergedError}`.trim(),
          fallbackText: 'Sorry, I could not reach the AI service right now.'
        })
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleSendMessage = async (e) => {
    e.preventDefault()
    if (!inputMessage.trim() || isLoading) return

    const question = inputMessage.trim()
    const userMessage = createMessage('user', question)

    setMessages(prev => [...prev, userMessage])
    setInputMessage('')
    await sendToAssistant(question)
  }

  const quickActions = [
    { icon: 'fa-credit-card', text: 'Find the best credit cards under 3000 annual fee' },
    { icon: 'fa-hand-holding-usd', text: 'Compare personal loans with low interest' },
    { icon: 'fa-mobile-alt', text: 'Suggest best telecom data plans for heavy use' },
    { icon: 'fa-piggy-bank', text: 'Best deposits for secure long term savings' }
  ]

  const handleQuickAction = async (text) => {
    if (isLoading) return
    const userMessage = createMessage('user', text)
    setMessages(prev => [...prev, userMessage])
    setInputMessage('')
    await sendToAssistant(text)
  }

  const hasStreamingMessage = messages.some((message) => message.type === 'bot' && message.isStreaming)

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
                <div className={`message-content ${message.isStreaming ? 'message-streaming' : ''}`}>
                  <p>{message.text}</p>
                  <span className="message-time">{message.time}</span>
                </div>
              </div>
            ))}
            {isLoading && !hasStreamingMessage && (
              <div className="message bot">
                <div className="message-avatar">
                  <i className="fas fa-robot"></i>
                </div>
                <div className="message-content message-loading">
                  <p>Thinking with database context...</p>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="quick-actions">
            {quickActions.map((action, index) => (
              <button
                key={index}
                className="quick-action-btn"
                onClick={() => handleQuickAction(action.text)}
                disabled={isLoading}
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
              disabled={isLoading}
              onChange={(e) => setInputMessage(e.target.value)}
            />
            <button type="submit" disabled={isLoading || !inputMessage.trim()}>
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
