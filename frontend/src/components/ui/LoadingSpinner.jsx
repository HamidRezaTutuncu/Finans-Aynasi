// Yükleme spinner bileşenleri

// Dönüyor spinner
export function LoadingSpinner({ size = 32, color = 'var(--color-secondary)' }) {
  return (
    <>
      <div style={{
        width: size,
        height: size,
        border: `3px solid ${color}20`,
        borderTopColor: color,
        borderRadius: '50%',
        animation: 'spin 0.7s linear infinite',
        flexShrink: 0,
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </>
  )
}

// Tam ekran yükleme
export function FullPageLoader({ message = 'Yükleniyor...' }) {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 16,
      background: 'var(--color-bg)',
    }}>
      <div style={{
        width: 56,
        height: 56,
        background: 'var(--color-primary)',
        borderRadius: 16,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 8,
      }}>
        <span style={{ fontSize: 24 }}>🪞</span>
      </div>
      <LoadingSpinner size={36} />
      <p style={{ color: '#64748b', fontSize: '0.9rem', margin: 0 }}>{message}</p>
    </div>
  )
}

// Kart skeleton
export function CardSkeleton({ height = 120 }) {
  return (
    <div className="skeleton" style={{ height, borderRadius: 'var(--radius-lg)' }} />
  )
}

// Satır skeleton
export function LineSkeleton({ width = '100%', height = 14 }) {
  return (
    <div className="skeleton" style={{ width, height, borderRadius: 4 }} />
  )
}

// Chat mesajı skeleton
export function MessageSkeleton() {
  return (
    <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
      <div className="skeleton" style={{ width: 36, height: 36, borderRadius: '50%', flexShrink: 0 }} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <LineSkeleton width="80%" height={12} />
        <LineSkeleton width="60%" height={12} />
        <LineSkeleton width="70%" height={12} />
      </div>
    </div>
  )
}

// Typing indicator (AI yazıyor...)
export function TypingIndicator({ moduleName = 'Asistan' }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0' }}>
      <div style={{
        background: 'var(--color-bg-white)',
        border: '1px solid rgba(0,0,0,0.08)',
        borderRadius: '18px',
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        boxShadow: 'var(--shadow-sm)',
      }}>
        <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
          {moduleName} analiz ediyor
        </span>
        <div style={{ display: 'flex', gap: 4 }}>
          <div className="typing-dot" />
          <div className="typing-dot" />
          <div className="typing-dot" />
        </div>
      </div>
    </div>
  )
}

export default LoadingSpinner
