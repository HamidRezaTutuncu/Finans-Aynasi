import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Logo from '../components/ui/Logo'

// Auth Sayfası — Login ve Register tabları
export default function AuthPage() {
  const [tab, setTab] = useState('login') // 'login' | 'register'
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { login, register } = useAuth()
  const navigate = useNavigate()

  // Login form state
  const [loginData, setLoginData] = useState({ email: '', password: '' })

  // Register form state
  const [registerData, setRegisterData] = useState({
    name: '', email: '', password: '',
    age: '', city: '', monthly_income: '',
  })

  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(loginData.email, loginData.password)
      navigate('/dashboard')
    } catch (err) {
      setError(err.userMessage || 'Email veya şifre hatalı.')
    } finally {
      setLoading(false)
    }
  }

  const handleRegister = async (e) => {
    e.preventDefault()
    setError('')
    if (registerData.password.length < 6) {
      setError('Şifre en az 6 karakter olmalıdır.')
      return
    }
    setLoading(true)
    try {
      const payload = {
        name: registerData.name,
        email: registerData.email,
        password: registerData.password,
        ...(registerData.age && { age: Number(registerData.age) }),
        ...(registerData.city && { city: registerData.city }),
        ...(registerData.monthly_income && { monthly_income: Number(registerData.monthly_income) }),
      }
      await register(payload)
      navigate('/dashboard')
    } catch (err) {
      setError(err.userMessage || 'Bu email zaten kayıtlı veya bir hata oluştu.')
    } finally {
      setLoading(false)
    }
  }

  const inputStyle = {
    width: '100%', padding: '11px 14px',
    border: '1.5px solid #e2e8f0', borderRadius: 10,
    fontFamily: 'var(--font-sans)', fontSize: '0.9rem',
    color: 'var(--color-text)', background: 'white',
    outline: 'none', transition: 'border-color 0.2s',
  }

  const labelStyle = {
    fontSize: '0.83rem', fontWeight: 600,
    color: 'var(--color-text)', marginBottom: 5, display: 'block',
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex',
      background: 'var(--color-bg)', fontFamily: 'var(--font-sans)',
    }}>
      {/* Sol — Dekoratif Panel */}
      <div style={{
        flex: '0 0 40%',
        background: 'var(--color-primary)',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '60px 40px', color: 'var(--color-text-light)',
      }} className="auth-left-panel">
        <Logo variant="horizontal-dark" size="md" className="mb-8" />
        <p style={{ opacity: 0.8, textAlign: 'center', lineHeight: 1.6, maxWidth: 400, fontSize: '1.5rem' }}>
          Paranızla yüzleşmenin zamanı geldi
        </p>
      </div>

      {/* Sağ — Form Alanı */}
      <div style={{
        flex: '0 0 60%', display: 'flex', alignItems: 'center',
        justifyContent: 'center', padding: '40px 24px',
        flexDirection: 'column',
      }}>
        {/* Mobile Logo */}
        <div className="mobile-logo-wrapper" style={{ marginBottom: '2rem' }}>
          <Logo variant="horizontal-light" size="md" />
        </div>
        <div style={{ width: '100%', maxWidth: 460 }}>
          {/* Tab Seçici */}
          <div style={{
            display: 'flex', borderBottom: '2px solid #e2e8f0', marginBottom: 32,
          }}>
            {[
              { id: 'login', label: 'Giriş Yap' },
              { id: 'register', label: 'Kayıt Ol' },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => { setTab(t.id); setError('') }}
                style={{
                  flex: 1, padding: '14px',
                  border: 'none', background: 'transparent',
                  fontFamily: 'var(--font-sans)', fontWeight: 600,
                  fontSize: '1rem', cursor: 'pointer',
                  transition: 'all 0.2s',
                  color: tab === t.id ? 'var(--color-primary)' : '#64748b',
                  borderBottom: tab === t.id ? '4px solid var(--color-primary)' : '4px solid transparent',
                  marginBottom: '-2px',
                }}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Hata Mesajı */}
          {error && (
            <div style={{
              background: '#fef2f2', border: '1px solid #fecaca',
              borderRadius: 10, padding: '12px 16px',
              marginBottom: 20, color: '#dc2626',
              fontSize: '0.875rem', display: 'flex', gap: 8, alignItems: 'flex-start',
            }}>
              ⚠️ {error}
            </div>
          )}

          {/* LOGIN FORMU */}
          {tab === 'login' && (
            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div>
                <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--color-primary)', marginBottom: 6 }}>
                  Tekrar Hoş Geldiniz
                </h2>
                <p style={{ color: '#64748b', fontSize: '0.9rem' }}>Hesabınıza giriş yapın</p>
              </div>

              <div>
                <label style={labelStyle}>E-posta Adresi <span style={{ color: 'var(--color-accent)' }}>*</span></label>
                <input
                  type="email" required placeholder="ornek@email.com"
                  style={inputStyle}
                  value={loginData.email}
                  onChange={(e) => setLoginData(p => ({ ...p, email: e.target.value }))}
                />
              </div>

              <div>
                <label style={labelStyle}>Şifre <span style={{ color: 'var(--color-accent)' }}>*</span></label>
                <input
                  type="password" required placeholder="Şifrenizi girin"
                  style={inputStyle}
                  value={loginData.password}
                  onChange={(e) => setLoginData(p => ({ ...p, password: e.target.value }))}
                />
              </div>

              <button
                type="submit" disabled={loading}
                style={{
                  width: '100%', padding: '13px',
                  background: 'var(--color-accent)', color: 'white',
                  border: 'none', borderRadius: 10,
                  fontFamily: 'var(--font-sans)', fontWeight: 700,
                  fontSize: '1rem', cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.7 : 1, transition: 'all 0.2s',
                }}
              >
                {loading ? 'Yükleniyor...' : 'Giriş Yap'}
              </button>

              <p style={{ textAlign: 'center', fontSize: '0.875rem', color: '#64748b' }}>
                Hesabınız yok mu?{' '}
                <button type="button" onClick={() => setTab('register')}
                  style={{ background: 'none', border: 'none', color: 'var(--color-secondary)', fontWeight: 600, cursor: 'pointer', padding: 0 }}>
                  Kayıt Olun
                </button>
              </p>
            </form>
          )}

          {/* REGISTER FORMU */}
          {tab === 'register' && (
            <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--color-primary)', marginBottom: 6 }}>
                  Hesap Oluşturun
                </h2>
                <p style={{ color: '#64748b', fontSize: '0.9rem' }}>Finansal yolculuğunuza başlayın</p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={labelStyle}>Ad Soyad <span style={{ color: 'var(--color-accent)' }}>*</span></label>
                  <input type="text" required placeholder="Ahmet Yılmaz" style={inputStyle}
                    value={registerData.name}
                    onChange={(e) => setRegisterData(p => ({ ...p, name: e.target.value }))} />
                </div>

                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={labelStyle}>E-posta <span style={{ color: 'var(--color-accent)' }}>*</span></label>
                  <input type="email" required placeholder="ornek@email.com" style={inputStyle}
                    value={registerData.email}
                    onChange={(e) => setRegisterData(p => ({ ...p, email: e.target.value }))} />
                </div>

                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={labelStyle}>Şifre <span style={{ color: 'var(--color-accent)' }}>*</span></label>
                  <input type="password" required placeholder="En az 6 karakter" style={inputStyle}
                    value={registerData.password}
                    onChange={(e) => setRegisterData(p => ({ ...p, password: e.target.value }))} />
                  <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: 4 }}>
                    Aylık gelir bilginiz, AI analizinin doğruluğunu artırır
                  </p>
                </div>

                <div>
                  <label style={labelStyle}>Yaş <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>(opsiyonel)</span></label>
                  <input type="number" placeholder="28" min="18" max="100" style={inputStyle}
                    value={registerData.age}
                    onChange={(e) => setRegisterData(p => ({ ...p, age: e.target.value }))} />
                </div>

                <div>
                  <label style={labelStyle}>Şehir <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>(opsiyonel)</span></label>
                  <input type="text" placeholder="İstanbul" style={inputStyle}
                    value={registerData.city}
                    onChange={(e) => setRegisterData(p => ({ ...p, city: e.target.value }))} />
                </div>

                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={labelStyle}>Aylık Gelir (₺) <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>(opsiyonel)</span></label>
                  <input type="number" placeholder="Ör: 25000" min="0" style={inputStyle}
                    value={registerData.monthly_income}
                    onChange={(e) => setRegisterData(p => ({ ...p, monthly_income: e.target.value }))} />
                </div>
              </div>

              <button
                type="submit" disabled={loading}
                style={{
                  width: '100%', padding: '13px',
                  background: 'var(--color-accent)', color: 'white',
                  border: 'none', borderRadius: 10,
                  fontFamily: 'var(--font-sans)', fontWeight: 700,
                  fontSize: '1rem', cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.7 : 1, transition: 'all 0.2s',
                  marginTop: 4,
                }}
              >
                {loading ? 'Yükleniyor...' : 'Kayıt Ol'}
              </button>

              <p style={{ textAlign: 'center', fontSize: '0.875rem', color: '#64748b' }}>
                Zaten hesabınız var mı?{' '}
                <button type="button" onClick={() => setTab('login')}
                  style={{ background: 'none', border: 'none', color: 'var(--color-secondary)', fontWeight: 600, cursor: 'pointer', padding: 0 }}>
                  Giriş Yapın
                </button>
              </p>
            </form>
          )}
        </div>
      </div>

      {/* Responsive: mobilde sol panel gizle ve mobile logoyu göster */}
      <style>{`
        .mobile-logo-wrapper { display: none; }
        @media (max-width: 768px) {
          .auth-left-panel { display: none !important; }
          .mobile-logo-wrapper { display: block; }
        }
      `}</style>
    </div>
  )
}
