import { useState, useEffect, useRef } from 'react'
import { TrendingUp, TrendingDown, AlertTriangle, CheckCircle, Clock, ShoppingBag, Calendar, Target } from 'lucide-react'
import { healthAPI, personaAPI, forensicAPI, intentionsAPI } from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import { CardSkeleton } from '../ui/LoadingSpinner'

// ── Animasyonlu Sayaç ────────────────────────────────────────────────────────
function CountUp({ target, duration = 1500, suffix = '' }) {
  const [count, setCount] = useState(0)
  useEffect(() => {
    let start = null
    const step = (ts) => {
      if (!start) start = ts
      const progress = Math.min((ts - start) / duration, 1)
      setCount(Math.floor(progress * target))
      if (progress < 1) requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
  }, [target, duration])
  return <>{count}{suffix}</>
}

// ── Dairesel Sağlık Skoru ────────────────────────────────────────────────────
function HealthRing({ score, color }) {
  const r = 52
  const circ = 2 * Math.PI * r
  const dash = (score / 100) * circ
  return (
    <div style={{ position: 'relative', width: 130, height: 130 }}>
      <svg width="130" height="130" viewBox="0 0 130 130">
        {/* Arka plan halkası */}
        <circle cx="65" cy="65" r={r} fill="none" stroke="#e2e8f0" strokeWidth="10" />
        {/* Değer halkası */}
        <circle
          cx="65" cy="65" r={r} fill="none"
          stroke={color || 'var(--color-success)'}
          strokeWidth="10" strokeLinecap="round"
          strokeDasharray={`${dash} ${circ}`}
          style={{ transform: 'rotate(-90deg)', transformOrigin: 'center', transition: 'stroke-dasharray 1.2s ease' }}
        />
      </svg>
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
      }}>
        <span style={{ fontSize: '1.8rem', fontWeight: 900, color: color || 'var(--color-success)', lineHeight: 1 }}>
          <CountUp target={score} />
        </span>
        <span style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: 2 }}>/ 100</span>
      </div>
    </div>
  )
}

// ── Özet Kart Bileşeni ───────────────────────────────────────────────────────
function SummaryCard({ title, value, sub, icon, color, trend, onClick }) {
  const [hovered, setHovered] = useState(false)
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: 'white', borderRadius: 16,
        padding: '22px 24px', cursor: 'pointer',
        boxShadow: hovered ? 'var(--shadow-lg)' : 'var(--shadow-md)',
        transform: hovered ? 'translateY(-4px)' : 'translateY(0)',
        transition: 'all 0.22s',
        border: `1.5px solid ${hovered ? color + '40' : 'transparent'}`,
        display: 'flex', flexDirection: 'column', gap: 12,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <p style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 500, margin: 0 }}>{title}</p>
          <p style={{ fontSize: '1.6rem', fontWeight: 900, color: 'var(--color-text)', margin: '4px 0 0', lineHeight: 1.1 }}>
            {value}
          </p>
        </div>
        <div style={{
          width: 44, height: 44, borderRadius: 12,
          background: color + '18', display: 'flex',
          alignItems: 'center', justifyContent: 'center', fontSize: 22,
        }}>
          {icon}
        </div>
      </div>
      {sub && (
        <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: 0, display: 'flex', alignItems: 'center', gap: 4 }}>
          {trend === 'up' && <TrendingUp size={13} color="var(--color-success)" />}
          {trend === 'down' && <TrendingDown size={13} color="var(--color-accent)" />}
          {sub}
        </p>
      )}
    </div>
  )
}

// ── Söz Durumu Rozeti ─────────────────────────────────────────────────────────
const intentionStatusMap = {
  successful: { label: 'Başarılı',   color: '#10b981', icon: CheckCircle },
  partial:    { label: 'Kısmen',     color: '#f59e0b', icon: Clock },
  failed:     { label: 'Başarısız',  color: '#c1121f', icon: AlertTriangle },
  // Fallbacks
  kept:       { label: 'Başarılı',   color: '#10b981', icon: CheckCircle },
  pending:    { label: 'Kısmen',     color: '#f59e0b', icon: Clock },
  broken:     { label: 'Başarısız',  color: '#c1121f', icon: AlertTriangle },
}

// ── Ana Dashboard Kartları ────────────────────────────────────────────────────
export default function DashboardCards({ onNavigate, refreshKey }) {
  const { user } = useAuth()
  const [health, setHealth] = useState(null)
  const [persona, setPersona] = useState(null)
  const [summary, setSummary] = useState(null)
  const [intentions, setIntentions] = useState([])
  const [patterns, setPatterns] = useState([])
  const [loading, setLoading] = useState(true)
  const [loaded, setLoaded] = useState(false) // İlk yükleme yapıldı mı?
  const [lastRefreshKey, setLastRefreshKey] = useState(-1)
  const [error, setError] = useState(null)
  const mounted = useRef(true)

  useEffect(() => {
    // Zaten yüklendiyse ve refresh key aynıysa tekrar API çağrısı yapma
    if (loaded && lastRefreshKey === refreshKey) return

    mounted.current = true
    setLoading(true) // refresh anında loader göster

    mounted.current = true
    const now = new Date()
    const month = now.getMonth() + 1
    const year = now.getFullYear()

    const load = async () => {
      try {
        const [h, p, s, i, pat] = await Promise.allSettled([
          healthAPI.getScore(),
          personaAPI.getMoneyType(),
          forensicAPI.getSummary(),
          intentionsAPI.getByMonth(month, year),
          forensicAPI.getPatterns(),
        ])
        if (!mounted.current) return

        // 429 veya 500+ hataları kontrol et
        const failedResults = [h, p, s, i, pat].filter(r => r.status === 'rejected')
        const hasRateLimit = failedResults.some(r => r.reason?.response?.status === 429)
        const hasServerError = failedResults.some(r => r.reason?.response?.status >= 500)

        if (hasRateLimit || hasServerError) {
          setError('⏳ Şu an yoğunluk var, lütfen biraz sonra tekrar deneyin.')
        }

        if (h.status === 'fulfilled') setHealth(h.value.data)
        if (p.status === 'fulfilled') setPersona(p.value.data)
        if (s.status === 'fulfilled') setSummary(s.value.data)
        if (i.status === 'fulfilled') setIntentions(
          (i.value.data?.intentions || i.value.data || []).slice(0, 5)
        )
        if (pat.status === 'fulfilled') setPatterns(
          (pat.value.data?.patterns || pat.value.data || []).slice(0, 3)
        )
      } catch {
        if (mounted.current) setError('⏳ Şu an yoğunluk var, lütfen biraz sonra tekrar deneyin.')
      } finally {
        if (mounted.current) {
          setLoading(false)
          setLoaded(true)
          setLastRefreshKey(refreshKey)
        }
      }
    }
    load()
    return () => { mounted.current = false }
  }, [loaded, refreshKey, lastRefreshKey])

  const formatTL = (amount) => {
    const num = parseFloat(amount)
    if (isNaN(num)) return '0 ₺'
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(num)
  }

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '28px 28px' }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--color-primary)', margin: '0 0 4px' }}>
          Finansal Paneliniz
        </h1>
        <p style={{ color: '#64748b', fontSize: '0.875rem', margin: 0 }}>
          Tüm finansal verilerinize tek bakışta erişin
        </p>
      </div>

      {/* Hata Bildirimi */}
      {error && (
        <div style={{
          padding: '14px 20px', borderRadius: 12, marginBottom: 18,
          background: '#fef3c7', border: '1px solid #fbbf24',
          color: '#92400e', fontSize: '0.88rem', fontWeight: 500,
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          {error}
        </div>
      )}

      {/* ── ÜST SIRA: 3 Büyük Kart ─────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 18, marginBottom: 18 }}>

        {/* 1 — Finansal Sağlık Skoru */}
        {loading ? <CardSkeleton height={180} /> : (
          <div
            onClick={() => onNavigate('chat')}
            style={{
              background: 'white', borderRadius: 16, padding: '24px',
              boxShadow: 'var(--shadow-md)', cursor: 'pointer',
              transition: 'all 0.22s', display: 'flex',
              flexDirection: 'column', alignItems: 'center', gap: 12,
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = 'var(--shadow-xl)' }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'var(--shadow-md)' }}
          >
            <p style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 500, margin: 0, alignSelf: 'flex-start' }}>
              🏥 Finansal Sağlık Skoru
            </p>
            <HealthRing score={parseInt(health?.score) || 0} color={health?.color} />
            <div style={{ textAlign: 'center' }}>
              <div style={{
                display: 'inline-block', padding: '4px 12px',
                borderRadius: 999, background: (health?.color || '#10b981') + '15',
                color: health?.color || '#10b981', fontWeight: 700, fontSize: '0.85rem',
              }}>
                {health?.grade} — {health?.status || 'Hesaplanıyor'}
              </div>
              {health?.advice && (
                <p style={{ fontSize: '0.78rem', color: '#64748b', marginTop: 8, lineHeight: 1.4 }}>
                  {health.advice.slice(0, 80)}{health.advice.length > 80 ? '...' : ''}
                </p>
              )}
              {health?.sub_scores && (
                <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 6, marginTop: 12 }}>
                  {Object.entries(health.sub_scores).map(([key, val]) => (
                    <div key={key}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: '#64748b', marginBottom: 2 }}>
                        <span>{key.toUpperCase()}</span>
                        <span style={{ fontWeight: 600, color: 'var(--color-primary)' }}>{val}</span>
                      </div>
                      <div style={{ width: '100%', height: 6, background: '#f1f5f9', borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{ width: `${parseInt(val) || 0}%`, height: '100%', background: health.color || 'var(--color-success)' }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 2 — Para Kişiliği */}
        {loading ? <CardSkeleton height={180} /> : (
          <div
            onClick={() => onNavigate('chat')}
            style={{
              background: 'white', borderRadius: 16, padding: '24px',
              boxShadow: 'var(--shadow-md)', cursor: 'pointer',
              transition: 'all 0.22s', display: 'flex',
              flexDirection: 'column', gap: 12,
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = 'var(--shadow-xl)' }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'var(--shadow-md)' }}
          >
            <p style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 500, margin: 0 }}>🎭 Para Kişiliği</p>
            {persona ? (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{
                    width: 56, height: 56, borderRadius: 16,
                    background: (persona.color || '#f59e0b') + '18',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28,
                  }}>
                    {persona.icon || '🦋'}
                  </div>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '1.15rem', color: 'var(--color-primary)' }}>
                      {persona.name}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#64748b' }}>{persona.title}</div>
                  </div>
                </div>
                <p style={{ fontSize: '0.8rem', color: '#64748b', lineHeight: 1.5, margin: 0 }}>
                  {(persona.description || '').slice(0, 100)}{persona.description?.length > 100 ? '...' : ''}
                </p>
                {persona.traits?.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {persona.traits.slice(0, 2).map((t, i) => (
                      <span key={i} style={{
                        padding: '2px 10px', borderRadius: 999, fontSize: '0.72rem',
                        background: (persona.color || '#f59e0b') + '15',
                        color: persona.color || '#f59e0b', fontWeight: 600,
                      }}>{t}</span>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: '20px 0', color: '#94a3b8', fontSize: '0.85rem' }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>🎭</div>
                Henüz veri yok
                <div style={{ marginTop: 8 }}>
                  <button onClick={(e) => { e.stopPropagation(); onNavigate('upload'); }} className="btn btn-sm" style={{ background: 'var(--color-primary)', color: 'white', padding: '6px 12px', fontSize: '0.75rem', borderRadius: 6, border: 'none', cursor: 'pointer' }}>
                    Ekstre Yükle
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 3 — Harcama Özeti */}
        {loading ? <CardSkeleton height={180} /> : (
          <div
            onClick={() => onNavigate('chat')}
            style={{
              background: 'white', borderRadius: 16, padding: '24px',
              boxShadow: 'var(--shadow-md)', cursor: 'pointer',
              transition: 'all 0.22s', display: 'flex',
              flexDirection: 'column', gap: 12,
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = 'var(--shadow-xl)' }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'var(--shadow-md)' }}
          >
            <p style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 500, margin: 0 }}>📊 Harcama Özeti</p>
            {summary ? (() => {
              const totalSpent = parseFloat(summary.total_expense || summary.total_debit || summary.total_spent) || 0
              const totalCount = parseInt(summary.transaction_count || summary.total_count, 10) || 0
              
              // Aylık ortalama hesapla
              let monthsDiff = 1
              if (summary.earliest_date && summary.latest_date) {
                const start = new Date(summary.earliest_date)
                const end = new Date(summary.latest_date)
                monthsDiff = Math.max(1, (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()) + 1)
              }
              const monthlyAvg = totalSpent / monthsDiff

              // En çok harcanan kategori
              const categories = summary.by_category || {}
              const sortedCats = Object.entries(categories)
                .map(([cat, amt]) => [cat, parseFloat(amt)])
                .sort((a, b) => b[1] - a[1])
              const topCategory = sortedCats[0]
              const topCategoryPct = topCategory && totalSpent > 0 ? Math.round((topCategory[1] / totalSpent) * 100) : 0

              // Gelir / Maaş oranı hesaplaması (Kullanıcı girdiyse)
              const userIncome = user?.monthly_income ? parseFloat(user.monthly_income) : 0
              const incomeRatio = userIncome > 0 ? Math.round((monthlyAvg / userIncome) * 100) : 0

              return (
                <>
                  <div style={{ textAlign: 'center', padding: '12px 0', borderBottom: '1px solid #e2e8f0', marginBottom: 4 }}>
                    <div style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: 4 }}>Toplam Harcama</div>
                    <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#c1121f', lineHeight: 1 }}>
                      {formatTL(totalSpent)}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: 6 }}>
                      {monthsDiff} ay • {totalCount} işlem
                    </div>
                    {userIncome > 0 && (
                      <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: 4, fontStyle: 'italic' }}>
                        Ortalama harcaman aylık gelirinin %{incomeRatio}'si.
                      </div>
                    )}
                  </div>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                      <Calendar size={18} color="#669bbc" style={{ marginTop: 2 }} />
                      <div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Aylık Ortalama</div>
                        <div style={{ fontWeight: 700, color: '#003049', fontSize: '0.9rem' }}>{formatTL(monthlyAvg)}</div>
                      </div>
                    </div>
                    
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                      <ShoppingBag size={18} color="#669bbc" style={{ marginTop: 2 }} />
                      <div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>İşlem Sayısı</div>
                        <div style={{ fontWeight: 700, color: '#003049', fontSize: '0.9rem' }}>{totalCount}</div>
                      </div>
                    </div>
                  </div>

                  {topCategory && (
                    <div style={{ marginTop: 4, padding: '12px', background: '#fdf0d5', borderRadius: 10 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                        <Target size={14} color="#c1121f" />
                        <span style={{ fontSize: '0.75rem', color: '#475569', fontWeight: 600 }}>En Çok Harcanan</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: 700, color: '#003049', fontSize: '0.85rem' }}>{topCategory[0]}</span>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '0.7rem', color: '#64748b' }}>%{topCategoryPct}</div>
                          <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#003049' }}>{formatTL(topCategory[1])}</div>
                        </div>
                      </div>
                      <div style={{ marginTop: 8, height: 6, background: 'white', borderRadius: 999, overflow: 'hidden' }}>
                        <div style={{ height: '100%', background: '#c1121f', transition: 'width 1s ease-out', width: `${topCategoryPct}%` }} />
                      </div>
                    </div>
                  )}
                </>
              )
            })() : (
              <div style={{ textAlign: 'center', padding: '20px 0', color: '#94a3b8', fontSize: '0.85rem' }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>📄</div>
                Henüz veri yok
                <div style={{ marginTop: 8 }}>
                  <button onClick={(e) => { e.stopPropagation(); onNavigate('upload'); }} className="btn btn-sm" style={{ background: 'var(--color-primary)', color: 'white', padding: '6px 12px', fontSize: '0.75rem', borderRadius: 6, border: 'none', cursor: 'pointer' }}>
                    Ekstre Yükle
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── ALT SIRA: 2 Geniş Kart ──────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>

        {/* 4 — Son Sözler */}
        {loading ? <CardSkeleton height={240} /> : (
          <div style={{
            background: 'white', borderRadius: 16, padding: '24px',
            boxShadow: 'var(--shadow-md)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontWeight: 700, color: 'var(--color-primary)', fontSize: '0.95rem', margin: 0 }}>
                🪞 Son Sözlerim
              </h3>
              <button onClick={() => onNavigate('chat')} style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--color-secondary)', fontSize: '0.78rem', fontWeight: 600, padding: 0,
              }}>Tümü →</button>
            </div>
            {intentions.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '20px 0', color: '#94a3b8', fontSize: '0.85rem' }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>🫂</div>
                Henüz veri yok
                <div style={{ marginTop: 8 }}>
                  <button onClick={(e) => { e.stopPropagation(); onNavigate('upload'); }} className="btn btn-sm" style={{ background: 'var(--color-primary)', color: 'white', padding: '6px 12px', fontSize: '0.75rem', borderRadius: 6, border: 'none', cursor: 'pointer' }}>
                    Ekstre Yükle
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {intentions.map((item, i) => {
                  const status = intentionStatusMap[item.status] || intentionStatusMap.pending
                  const StatusIcon = status.icon
                  return (
                    <div key={i} style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '10px 12px', borderRadius: 10,
                      background: status.color + '08',
                      border: `1px solid ${status.color}20`,
                    }}>
                      <StatusIcon size={15} color={status.color} strokeWidth={2.5} style={{ flexShrink: 0 }} />
                      <span style={{ flex: 1, fontSize: '0.83rem', color: 'var(--color-text)', lineHeight: 1.4 }}>
                        {item.goal_description || item.description}
                      </span>
                      <span style={{
                        padding: '2px 8px', borderRadius: 999, fontSize: '0.7rem',
                        background: status.color + '15', color: status.color, fontWeight: 600, flexShrink: 0,
                      }}>
                        {status.label}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* 5 — Son Paternler */}
        {loading ? <CardSkeleton height={240} /> : (
          <div style={{
            background: 'white', borderRadius: 16, padding: '24px',
            boxShadow: 'var(--shadow-md)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontWeight: 700, color: 'var(--color-primary)', fontSize: '0.95rem', margin: 0 }}>
                🕵️ Tespit Edilen Paternler
              </h3>
              <button onClick={() => onNavigate('chat')} style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--color-secondary)', fontSize: '0.78rem', fontWeight: 600, padding: 0,
              }}>Tümü →</button>
            </div>
            {patterns.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '20px 0', color: '#94a3b8', fontSize: '0.85rem' }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>🔍</div>
                Henüz veri yok
                <div style={{ marginTop: 8 }}>
                  <button onClick={(e) => { e.stopPropagation(); onNavigate('upload'); }} className="btn btn-sm" style={{ background: 'var(--color-primary)', color: 'white', padding: '6px 12px', fontSize: '0.75rem', borderRadius: 6, border: 'none', cursor: 'pointer' }}>
                    Ekstre Yükle
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {patterns.map((p, i) => (
                  <div key={i} style={{
                    padding: '12px 14px', borderRadius: 10,
                    background: '#f8fafc', border: '1px solid #e2e8f0',
                    cursor: 'pointer', transition: 'all 0.18s',
                  }}
                    onClick={() => onNavigate('chat')}
                    onMouseEnter={e => e.currentTarget.style.borderColor = '#6366f1'}
                    onMouseLeave={e => e.currentTarget.style.borderColor = '#e2e8f0'}
                  >
                    <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--color-text)', marginBottom: 3 }}>
                      {p.pattern_name || p.title || p.type}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#64748b', lineHeight: 1.4 }}>
                      {(p.description || p.summary || '').slice(0, 90)}
                    </div>
                    {p.confidence != null && (
                      <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{ flex: 1, height: 4, background: '#e2e8f0', borderRadius: 2, overflow: 'hidden' }}>
                          <div style={{ width: `${p.confidence * 100}%`, height: '100%', background: '#6366f1' }} />
                        </div>
                        <span style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 600 }}>%{Math.round(p.confidence * 100)}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
