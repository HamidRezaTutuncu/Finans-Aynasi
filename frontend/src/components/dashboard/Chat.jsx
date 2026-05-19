import { useState, useRef, useEffect, useCallback } from 'react'
import { Send, Paperclip } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import { motion, AnimatePresence } from 'framer-motion'
import { chatAPI } from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import { TypingIndicator } from '../ui/LoadingSpinner'
import Logo from '../ui/Logo'

// Modül renk ve ikon tanımları
const MODULE_STYLES = {
  forensic:  { color: '#6366f1', bg: '#eef2ff', name: '🕵️ Adli Muhasebeci' },
  future:    { color: '#8b5cf6', bg: '#f5f3ff', name: '🔮 Gelecekteki Ben' },
  whatif:    { color: '#ec4899', bg: '#fdf2f8', name: '🎲 What-If Simülatör' },
  mirror:    { color: '#f59e0b', bg: '#fffbeb', name: '🪞 Söz Aynası' },
  health:    { color: '#10b981', bg: '#ecfdf5', name: '🏥 Finansal Sağlık' },
  persona:   { color: '#f97316', bg: '#fff7ed', name: '🎭 Para Kişiliği' },
  general:   { color: '#6b7280', bg: '#f9fafb', name: '💬 Genel Asistan' },
}

// Hızlı erişim kartları
const QUICK_CARDS = [
  { id: 'forensic', icon: '🕵️', label: 'Harcama Analizi',  question: 'Harcamalarımı analiz et' },
  { id: 'future',   icon: '🔮', label: 'Gelecekteki Ben',  question: '5 yıl sonra nasıl olacağım?' },
  { id: 'whatif',   icon: '🎲', label: 'What-If Simülatör', question: 'Sigarayı bıraksam ne olur?' },
  { id: 'mirror',   icon: '🪞', label: 'Söz Aynası',       question: 'Bu ayki sözlerimi göster' },
  { id: 'health',   icon: '🏥', label: 'Sağlık Skorum',    question: 'Finansal sağlık skorumu göster' },
  { id: 'persona',  icon: '🎭', label: 'Para Kişiliğim',   question: 'Para kişiliğim nedir?' },
]

// Tek bir chat mesajı
function ChatMessage({ msg }) {
  if (msg.role === 'user') {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="message-user" 
        style={{ marginBottom: 16 }}
      >
        <div className="bubble">
          {msg.content}
        </div>
      </motion.div>
    )
  }

  const moduleStyle = MODULE_STYLES[msg.module] || MODULE_STYLES.general

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="message-ai" 
      style={{ marginBottom: 20 }}
    >
      {/* Modül Etiketi */}
      {msg.module && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2 }}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '4px 12px', borderRadius: 999,
            background: `${moduleStyle.color}26`, // %15 opacity
            color: moduleStyle.color, fontSize: '0.76rem', fontWeight: 700,
            marginBottom: 8, marginLeft: 0,
          }}
        >
          {moduleStyle.name}
          {msg.confidence != null && (
            <span style={{ opacity: 0.85, fontWeight: 500 }}>
              • %{Math.round(msg.confidence * 100)}
            </span>
          )}
        </motion.div>
      )}
      <div className="bubble markdown-content" style={{
        background: '#ffffff',
        border: `1px solid ${moduleStyle.color}20`,
        boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
      }}>
        <ReactMarkdown>{msg.content}</ReactMarkdown>
      </div>
    </motion.div>
  )
}

// Karşılama + Hızlı erişim kartları
function WelcomeScreen({ user, onQuickCard }) {
  return (
    <div style={{ textAlign: 'center', padding: '40px 20px' }}>
      <div style={{ fontSize: 48, marginBottom: 12 }}>🪞</div>
      <h2 style={{ color: 'var(--color-primary)', fontWeight: 800, fontSize: '1.5rem', marginBottom: 8 }}>
        Merhaba {user?.name ? user.name.split(' ')[0] : 'Kullanıcı'}!
      </h2>
      <p style={{ color: '#64748b', fontSize: '0.95rem', maxWidth: 460, margin: '0 auto 32px' }}>
        Sana nasıl yardımcı olabilirim?
      </p>

      {/* Hızlı Erişim Kartları */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 12, maxWidth: 600, margin: '0 auto',
      }}>
        {QUICK_CARDS.map((card) => {
          const style = MODULE_STYLES[card.id]
          return (
            <motion.button
              key={card.id}
              onClick={() => onQuickCard(card.question)}
              whileHover={{ scale: 1.05 }}
              style={{
                padding: '16px 12px', borderRadius: 14,
                border: `1.5px solid ${style.color}30`,
                background: style.bg, cursor: 'pointer',
                textAlign: 'center',
                fontFamily: 'var(--font-sans)',
              }}
            >
              <div style={{ fontSize: 28, marginBottom: 6 }}>{card.icon}</div>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: style.color, lineHeight: 1.3 }}>
                {card.label}
              </div>
            </motion.button>
          )
        })}
      </div>
    </div>
  )
}

// Ana Chat Bileşeni
export default function Chat({ messages, setMessages }) {
  const { user } = useAuth()
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [typingModule, setTypingModule] = useState('Asistan')
  const bottomRef = useRef(null)
  const inputRef = useRef(null)

  // Yeni mesaj gelince en alta scroll et
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isTyping])

  const sendMessage = useCallback(async (text) => {
    const trimmed = (text || input).trim()
    if (!trimmed || isTyping) return

    const userMsg = { id: Date.now(), role: 'user', content: trimmed }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setIsTyping(true)
    setTypingModule('Asistan analiz ediyor')

    try {
      const res = await chatAPI.send(trimmed)
      const { routing, answer } = res.data

      // Modül ismini typing indicator'da göster
      if (routing?.module_name) {
        setTypingModule(`${routing.module_icon || ''} ${routing.module_name} analiz ediyor`)
      }

      const aiMsg = {
        id: Date.now() + 1,
        role: 'ai',
        content: answer || res.data.message || 'Yanıt alınamadı.',
        module: routing?.module || 'general',
        confidence: routing?.confidence,
      }
      setMessages(prev => [...prev, aiMsg])
    } catch (err) {
      const status = err.response?.status
      let errorContent
      if (status === 429 || (status >= 500)) {
        errorContent = '⏳ **Şu an yoğunluk var.** Lütfen biraz sonra tekrar deneyin.'
      } else {
        errorContent = `⚠️ **Hata:** ${err.userMessage || 'Yanıt alınamadı. Lütfen tekrar deneyin.'}`
      }
      const errMsg = {
        id: Date.now() + 1,
        role: 'ai',
        content: errorContent,
        module: 'general',
      }
      setMessages(prev => [...prev, errMsg])
    } finally {
      setIsTyping(false)
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [input, isTyping, setMessages])

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      height: '100vh', overflow: 'hidden',
      background: 'var(--color-bg)',
    }}>
      {/* Chat Header */}
      <div style={{
        padding: '16px 24px',
        background: 'white',
        borderBottom: '1px solid rgba(0,0,0,0.08)',
        display: 'flex', alignItems: 'center', gap: 12,
        flexShrink: 0,
        boxShadow: 'var(--shadow-sm)',
      }}>
        <motion.div
          animate={isTyping ? { scale: [1, 1.05, 1] } : {}}
          transition={isTyping ? { duration: 1.5, repeat: Infinity } : {}}
        >
          <Logo variant="icon" size="xs" />
        </motion.div>
        <div>
          <div style={{ fontWeight: 700, color: 'var(--color-primary)', fontSize: '0.95rem' }}>
            Prospekt Asistanı
          </div>
          <div style={{ fontSize: '0.75rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 6, height: 6, background: '#10b981', borderRadius: '50%', display: 'inline-block' }} />
            Çevrimiçi — 7 modül aktif
          </div>
        </div>
      </div>

      {/* Mesaj Alanı */}
      <div style={{
        flex: 1, overflowY: 'auto', padding: '24px',
        display: 'flex', flexDirection: 'column',
      }}>
        {/* Karşılama ekranı (mesaj yoksa) */}
        {messages.length === 0 && (
          <WelcomeScreen user={user} onQuickCard={(q) => sendMessage(q)} />
        )}

        {/* Mesajlar */}
        <AnimatePresence initial={false}>
          {messages.map(msg => (
            <ChatMessage key={msg.id} msg={msg} />
          ))}
        </AnimatePresence>

        {/* Typing Indicator */}
        {isTyping && <TypingIndicator moduleName={typingModule} />}

        <div ref={bottomRef} />
      </div>

      {/* Giriş Alanı */}
      <div style={{
        padding: '16px 24px',
        background: 'white',
        borderTop: '1px solid rgba(0,0,0,0.08)',
        flexShrink: 0,
      }}>
        <div style={{
          display: 'flex', gap: 10, alignItems: 'flex-end',
          background: '#f8fafc', borderRadius: 14,
          padding: '8px 8px 8px 16px',
          border: '1.5px solid #e2e8f0',
          transition: 'border-color 0.2s, box-shadow 0.2s',
        }}
          onFocusCapture={e => {
            e.currentTarget.style.borderColor = 'var(--color-secondary)'
            e.currentTarget.style.boxShadow = '0 0 0 3px rgba(102,155,188,0.15)'
          }}
          onBlurCapture={e => {
            e.currentTarget.style.borderColor = '#e2e8f0'
            e.currentTarget.style.boxShadow = 'none'
          }}
        >
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Mesajını yaz..."
            disabled={isTyping}
            rows={1}
            style={{
              flex: 1, border: 'none', outline: 'none',
              background: 'transparent', fontFamily: 'var(--font-sans)',
              fontSize: '0.9rem', color: 'var(--color-text)',
              resize: 'none', lineHeight: 1.5,
              maxHeight: 120, overflowY: 'auto',
              paddingTop: 6, paddingBottom: 6,
            }}
          />
          <button
            onClick={() => sendMessage()}
            disabled={!input.trim() || isTyping}
            style={{
              width: 40, height: 40, borderRadius: 10,
              border: 'none', cursor: (!input.trim() || isTyping) ? 'not-allowed' : 'pointer',
              background: (!input.trim() || isTyping) ? '#e2e8f0' : 'var(--color-accent)',
              color: (!input.trim() || isTyping) ? '#94a3b8' : 'white',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.2s', flexShrink: 0,
            }}
          >
            <Send size={17} />
          </button>
        </div>
        <p style={{ fontSize: '0.72rem', color: '#94a3b8', textAlign: 'center', marginTop: 6 }}>
          Prospekt AI • Yanıtlar bilgilendirme amaçlıdır
        </p>
      </div>
    </div>
  )
}
