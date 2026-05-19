import { useAuth } from '../../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import Logo from '../ui/Logo'
import {
  MessageCircle, LayoutDashboard, Upload,
  FileText, Settings, LogOut, Menu
} from 'lucide-react'

const MENU_ITEMS = [
  { id: 'chat',      icon: MessageCircle,   label: 'Sohbet' },
  { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { id: 'upload',    icon: Upload,          label: 'Ekstre Yükle' },
  { id: 'reports',   icon: FileText,        label: 'Raporlar' },
  { id: 'profile',   icon: Settings,        label: 'Profil Ayarları' },
]

export default function Sidebar({ activeMenu, onMenuChange, collapsed, onToggleCollapse }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  // Kullanıcı adının baş harfi(leri)
  const initials = user?.name
    ? user.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    : 'FA'

  return (
    <aside style={{
      width: collapsed ? 72 : 260,
      minHeight: '100vh',
      background: 'var(--color-primary)',
      display: 'flex',
      flexDirection: 'column',
      transition: 'width 0.35s cubic-bezier(0.4,0,0.2,1)',
      overflow: 'hidden',
      flexShrink: 0,
      position: 'relative',
    }}>
      {/* Logo / Başlık */}
      <div style={{
        padding: collapsed ? '20px 16px' : '20px 20px',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
        display: 'flex', alignItems: 'center',
        justifyContent: collapsed ? 'center' : 'flex-start',
        cursor: 'pointer',
        minHeight: '76px', // fixed height to prevent jitter
      }} onClick={() => navigate('/dashboard')}>
        <AnimatePresence mode="wait">
          {collapsed ? (
            <motion.div
              key="icon"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <Logo variant="icon" size="sm" />
            </motion.div>
          ) : (
            <motion.div
              key="full"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <Logo variant="horizontal-dark" size="sm" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Kullanıcı Profil Özeti */}
      <div style={{
        padding: collapsed ? '16px 16px' : '16px 20px',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        display: 'flex', alignItems: 'center',
        gap: 12, justifyContent: collapsed ? 'center' : 'flex-start',
      }}>
        {/* Avatar */}
        <div style={{
          width: 38, height: 38, borderRadius: '50%',
          background: 'var(--color-secondary)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'white', fontWeight: 700, fontSize: '0.9rem', flexShrink: 0,
        }}>
          {initials}
        </div>
        {!collapsed && (
          <div style={{ overflow: 'hidden' }}>
            <div style={{
              color: 'var(--color-text-light)', fontWeight: 600,
              fontSize: '0.875rem', whiteSpace: 'nowrap',
              overflow: 'hidden', textOverflow: 'ellipsis',
            }}>
              {user?.name || 'Kullanıcı'}
            </div>
            <div style={{
              color: 'rgba(253,240,213,0.5)', fontSize: '0.72rem',
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>
              {user?.email || ''}
            </div>
          </div>
        )}
      </div>

      {/* Menü Öğeleri */}
      <nav style={{ flex: 1, padding: '12px 10px', display: 'flex', flexDirection: 'column', gap: 4 }}>
        {MENU_ITEMS.map(({ id, icon: Icon, label }) => {
          const isActive = activeMenu === id
          return (
            <button
              key={id}
              onClick={() => onMenuChange(id)}
              title={collapsed ? label : undefined}
              style={{
                display: 'flex', alignItems: 'center',
                gap: 12, padding: collapsed ? '11px' : '11px 14px',
                borderRadius: 10, border: 'none', cursor: 'pointer',
                fontFamily: 'var(--font-sans)', fontSize: '0.875rem',
                fontWeight: isActive ? 600 : 500,
                transition: 'all 0.18s',
                background: isActive ? 'rgba(255,255,255,0.1)' : 'transparent',
                color: isActive ? 'var(--color-text-light)' : 'rgba(253,240,213,0.65)',
                borderLeft: isActive ? '4px solid var(--color-accent)' : '4px solid transparent',
                justifyContent: collapsed ? 'center' : 'flex-start',
                whiteSpace: 'nowrap',
              }}
              onMouseEnter={e => {
                if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.05)'
              }}
              onMouseLeave={e => {
                if (!isActive) e.currentTarget.style.background = 'transparent'
              }}
            >
              <Icon size={18} strokeWidth={isActive ? 2.5 : 2} style={{ flexShrink: 0 }} />
              {!collapsed && label}
            </button>
          )
        })}
      </nav>

      {/* Alt — Çıkış + Daralt butonu */}
      <div style={{
        padding: '12px 10px',
        borderTop: '1px solid rgba(255,255,255,0.08)',
        display: 'flex', flexDirection: 'column', gap: 4,
      }}>
        <button
          onClick={handleLogout}
          title={collapsed ? 'Çıkış Yap' : undefined}
          style={{
            display: 'flex', alignItems: 'center',
            gap: 12, padding: collapsed ? '11px' : '11px 14px',
            borderRadius: 10, border: 'none', cursor: 'pointer',
            fontFamily: 'var(--font-sans)', fontSize: '0.875rem',
            fontWeight: 500, background: 'transparent',
            color: 'rgba(253,240,213,0.55)',
            justifyContent: collapsed ? 'center' : 'flex-start',
            transition: 'all 0.18s',
            width: '100%',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = 'rgba(193,18,31,0.2)'
            e.currentTarget.style.color = '#fca5a5'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'transparent'
            e.currentTarget.style.color = 'rgba(253,240,213,0.55)'
          }}
        >
          <LogOut size={18} style={{ flexShrink: 0 }} />
          {!collapsed && 'Çıkış Yap'}
        </button>

        {/* Daralt / Genişlet Butonu */}
        <button
          onClick={onToggleCollapse}
          title={collapsed ? 'Genişlet' : 'Daralt'}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 10, borderRadius: 10, border: 'none', cursor: 'pointer',
            background: 'rgba(255,255,255,0.06)', color: 'rgba(253,240,213,0.5)',
            transition: 'all 0.18s', width: '100%',
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.12)'}
          onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
        >
          <Menu size={16} />
          {!collapsed && (
            <span style={{ marginLeft: 8, fontSize: '0.8rem' }}>Daralt</span>
          )}
        </button>
      </div>
    </aside>
  )
}
