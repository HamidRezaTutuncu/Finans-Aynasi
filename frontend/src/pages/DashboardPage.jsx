import { useState, useEffect } from 'react'
import Sidebar from '../components/dashboard/Sidebar'
import ChatPanel from '../components/dashboard/ChatPanel'
import DashboardPanel from '../components/dashboard/DashboardPanel'
import UploadPanel from '../components/dashboard/UploadPanel'
import ReportsPanel from '../components/dashboard/ReportsPanel'
import ProfilePanel from '../components/dashboard/ProfilePanel'
import { MessageCircle, LayoutDashboard, Upload as UploadIcon, FileText, Settings } from 'lucide-react'

// Dashboard sayfası — Sidebar + değişken ana alan
export default function DashboardPage() {
  const [activeMenu, setActiveMenu] = useState('chat') // 'chat' | 'dashboard' | 'upload' | 'reports' | 'profile'
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768)

  // Chat mesajlarını burada tutuyoruz — panel geçişlerinde kaybolmasın
  const [chatMessages, setChatMessages] = useState([])
  
  // Dashboard Refresh Key
  const [dashboardRefreshKey, setDashboardRefreshKey] = useState(0)

  const handleUploadSuccess = () => {
    setDashboardRefreshKey(prev => prev + 1)
    setActiveMenu('chat')
  }

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const BOTTOM_NAV = [
    { id: 'chat', icon: MessageCircle, label: 'Sohbet' },
    { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { id: 'upload', icon: UploadIcon, label: 'Yükle' },
    { id: 'reports', icon: FileText, label: 'Raporlar' },
    { id: 'profile', icon: Settings, label: 'Profil' },
  ]

  return (
    <div style={{
      display: 'flex',
      minHeight: '100vh',
      background: 'var(--color-bg)',
      fontFamily: 'var(--font-sans)',
      paddingBottom: isMobile ? 60 : 0, // Alt bar için boşluk
    }}>
      {/* Sidebar (Sadece Masaüstü) */}
      {!isMobile && (
        <Sidebar
          activeMenu={activeMenu}
          onMenuChange={setActiveMenu}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(p => !p)}
        />
      )}

      {/* Ana İçerik — Tüm paneller her zaman renderlanır, sadece aktif olan gösterilir */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        minWidth: 0,
        position: 'relative',
      }}>
        {/* Her panel her zaman mount durumunda kalır, display ile gizlenir/gösterilir */}
        <div style={{ display: activeMenu === 'chat' ? 'flex' : 'none', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
          <ChatPanel messages={chatMessages} setMessages={setChatMessages} />
        </div>
        <div style={{ display: activeMenu === 'dashboard' ? 'flex' : 'none', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
          <DashboardPanel onNavigate={setActiveMenu} refreshKey={dashboardRefreshKey} />
        </div>
        <div style={{ display: activeMenu === 'upload' ? 'flex' : 'none', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
          <UploadPanel onSuccess={handleUploadSuccess} />
        </div>
        <div style={{ display: activeMenu === 'reports' ? 'flex' : 'none', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
          <ReportsPanel />
        </div>
        <div style={{ display: activeMenu === 'profile' ? 'flex' : 'none', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
          <ProfilePanel />
        </div>
      </div>

      {/* Mobil Alt Navigasyon Barı */}
      {isMobile && (
        <nav style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          height: 60,
          background: 'var(--color-primary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-around',
          padding: '0 10px',
          boxShadow: '0 -2px 10px rgba(0,0,0,0.1)',
          zIndex: 50,
        }}>
          {BOTTOM_NAV.map(({ id, icon: Icon, label }) => {
            const isActive = activeMenu === id
            return (
              <button
                key={id}
                onClick={() => setActiveMenu(id)}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  background: 'none', border: 'none', gap: 4,
                  color: isActive ? 'var(--color-accent)' : 'rgba(253,240,213,0.5)',
                  cursor: 'pointer',
                  padding: '4px',
                }}
              >
                <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                <span style={{ fontSize: '0.65rem', fontWeight: isActive ? 700 : 500 }}>
                  {label}
                </span>
              </button>
            )
          })}
        </nav>
      )}
    </div>
  )
}
