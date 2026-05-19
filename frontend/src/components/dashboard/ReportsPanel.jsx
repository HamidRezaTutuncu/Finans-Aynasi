import { useState } from 'react'
import { FileText, Download, AlertTriangle, CheckCircle, Clock } from 'lucide-react'
import { intentionsAPI } from '../../services/api'
import axios from 'axios'
import { CardSkeleton } from '../ui/LoadingSpinner'

const intentionStatusMap = {
  successful: { label: 'Başarılı',   color: '#10b981', icon: CheckCircle },
  partial:    { label: 'Kısmen',     color: '#f59e0b', icon: Clock },
  failed:     { label: 'Başarısız',  color: '#c1121f', icon: AlertTriangle },
  kept:       { label: 'Başarılı',   color: '#10b981', icon: CheckCircle },
  pending:    { label: 'Kısmen',     color: '#f59e0b', icon: Clock },
  broken:     { label: 'Başarısız',  color: '#c1121f', icon: AlertTriangle },
}

export default function ReportsPanel() {
  const [month, setMonth] = useState(new Date().getMonth() + 1)
  const [year, setYear] = useState(new Date().getFullYear())
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchReport = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await intentionsAPI.getReport(month, year)
      setReport(res.data)
    } catch (err) {
      setError(err.userMessage || 'Rapor alınamadı.')
    } finally {
      setLoading(false)
    }
  }

  const downloadPDF = async () => {
    try {
      const token = localStorage.getItem('finans_token')
      const url = `http://localhost:3001/api/intentions/report/${month}/${year}/pdf`
      const response = await axios.get(url, { 
        responseType: 'blob',
        headers: { Authorization: `Bearer ${token}` }
      })
      const blobUrl = window.URL.createObjectURL(new Blob([response.data]))
      const a = document.createElement('a')
      a.href = blobUrl
      a.download = `finans-aynasi-rapor-${month}-${year}.pdf`
      a.click()
    } catch (err) {
      alert('PDF indirilirken bir hata oluştu.')
    }
  }

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '40px 28px' }}>
      <div style={{ maxWidth: 800, margin: '0 auto' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-primary)', margin: '0 0 6px' }}>
          📋 Aylık Raporlar
        </h1>
        <p style={{ color: '#64748b', fontSize: '0.9rem', margin: '0 0 24px' }}>
          Geçmiş aylardaki harcama performansınızı ve sözlerinizi inceleyin.
        </p>

        {/* Seçiciler */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
          <select 
            value={month} onChange={(e) => setMonth(e.target.value)}
            style={{ padding: '10px 14px', borderRadius: 10, border: '1px solid #cbd5e1', outline: 'none' }}
          >
            {[1,2,3,4,5,6,7,8,9,10,11,12].map(m => (
              <option key={m} value={m}>{new Date(0, m - 1).toLocaleString('tr', { month: 'long' })}</option>
            ))}
          </select>
          <select 
            value={year} onChange={(e) => setYear(e.target.value)}
            style={{ padding: '10px 14px', borderRadius: 10, border: '1px solid #cbd5e1', outline: 'none' }}
          >
            {[2024, 2025, 2026].map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <button 
            onClick={fetchReport}
            style={{ padding: '10px 20px', background: 'var(--color-primary)', color: 'white', border: 'none', borderRadius: 10, cursor: 'pointer', fontWeight: 600 }}
          >
            Raporu Göster
          </button>
        </div>

        {error && <div style={{ color: 'red', marginBottom: 20 }}>{error}</div>}

        {loading ? <CardSkeleton height={300} /> : report && (
          <div style={{ background: 'white', padding: 32, borderRadius: 16, boxShadow: 'var(--shadow-md)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <div>
                <h2 style={{ fontSize: '1.2rem', color: 'var(--color-primary)', margin: '0 0 4px' }}>Aldatma Skoru</h2>
                <div style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--color-accent)' }}>
                  %{report.cheating_score || 0}
                </div>
              </div>
              <button 
                onClick={downloadPDF}
                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', background: 'var(--color-secondary)', color: 'white', border: 'none', borderRadius: 10, cursor: 'pointer', fontWeight: 600 }}
              >
                <Download size={18} />
                PDF İndir
              </button>
            </div>

            <h3 style={{ fontSize: '1rem', color: 'var(--color-primary)', marginBottom: 12 }}>Sözler ve Sonuçları</h3>
            {report.intentions?.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {report.intentions.map((item, i) => {
                  const status = intentionStatusMap[item.status] || intentionStatusMap.pending
                  const StatusIcon = status.icon
                  return (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px', borderRadius: 10, background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                      <StatusIcon size={18} color={status.color} />
                      <span style={{ flex: 1, fontSize: '0.9rem', color: 'var(--color-text)' }}>{item.goal_description || item.description}</span>
                      <span style={{ padding: '4px 10px', borderRadius: 999, fontSize: '0.75rem', background: status.color + '15', color: status.color, fontWeight: 600 }}>
                        {status.label}
                      </span>
                    </div>
                  )
                })}
              </div>
            ) : (
              <p style={{ color: '#64748b', fontSize: '0.9rem' }}>Bu ay için kaydedilmiş söz bulunamadı.</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
