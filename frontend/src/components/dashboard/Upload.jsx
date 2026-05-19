import { useState, useRef, useCallback } from 'react'
import { UploadCloud, FileText, CheckCircle, AlertTriangle, X } from 'lucide-react'
import { uploadAPI } from '../../services/api'

const ACCEPTED = '.pdf,.xlsx,.xls,.csv'
const ACCEPTED_TYPES = ['application/pdf', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel', 'text/csv']

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function Upload({ onSuccess }) {
  const [dragOver, setDragOver] = useState(false)
  const [file, setFile] = useState(null)
  const [progress, setProgress] = useState(0)
  const [status, setStatus] = useState('idle') // idle | uploading | success | error
  const [result, setResult] = useState(null)
  const [errorMsg, setErrorMsg] = useState('')
  const inputRef = useRef(null)

  const handleFile = useCallback((f) => {
    if (!f) return
    if (!ACCEPTED_TYPES.includes(f.type) && !f.name.match(/\.(pdf|xlsx|xls|csv)$/i)) {
      setErrorMsg('Desteklenmeyen dosya formatı. PDF, Excel veya CSV yükleyin.')
      setStatus('error')
      return
    }
    if (f.size > 20 * 1024 * 1024) {
      setErrorMsg('Dosya boyutu 20 MB\'ı aşamaz.')
      setStatus('error')
      return
    }
    setFile(f)
    setStatus('idle')
    setErrorMsg('')
    setProgress(0)
    setResult(null)
  }, [])

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    setDragOver(false)
    const f = e.dataTransfer.files?.[0]
    handleFile(f)
  }, [handleFile])

  const handleUpload = async () => {
    if (!file || status === 'uploading') return
    setStatus('uploading')
    setProgress(0)
    setErrorMsg('')
    try {
      const res = await uploadAPI.uploadFile(file, setProgress)
      setResult(res.data)
      setStatus('success')
      // 2.5 saniye sonra chat'e geç
      setTimeout(() => onSuccess?.(), 2500)
    } catch (err) {
      setErrorMsg(err.userMessage || 'Dosya yüklenirken bir hata oluştu.')
      setStatus('error')
    }
  }

  const reset = () => {
    setFile(null)
    setStatus('idle')
    setProgress(0)
    setResult(null)
    setErrorMsg('')
  }

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '40px 28px' }}>
      <div style={{ maxWidth: 560, margin: '0 auto' }}>
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-primary)', margin: '0 0 6px' }}>
            📄 Banka Ekstresi Yükle
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.9rem', margin: 0 }}>
            PDF, Excel (.xlsx) veya CSV formatında banka ekstrenizi yükleyin. AI otomatik analiz edecektir.
          </p>
        </div>

        {/* Drop Zone */}
        {status !== 'success' && (
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => !file && inputRef.current?.click()}
            style={{
              border: `2.5px dashed ${dragOver ? 'var(--color-primary)' : file ? 'var(--color-secondary)' : '#cbd5e1'}`,
              borderRadius: 18,
              background: dragOver ? 'rgba(0,48,73,0.04)' : file ? 'rgba(102,155,188,0.04)' : 'white',
              padding: '48px 24px', textAlign: 'center',
              cursor: file ? 'default' : 'pointer',
              transition: 'all 0.2s',
              marginBottom: 16,
            }}
          >
            <input
              ref={inputRef} type="file" accept={ACCEPTED}
              style={{ display: 'none' }}
              onChange={(e) => handleFile(e.target.files?.[0])}
            />

            {!file ? (
              <>
                <div style={{
                  width: 72, height: 72, borderRadius: 20,
                  background: 'rgba(0,48,73,0.08)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto 16px',
                }}>
                  <UploadCloud size={32} color="var(--color-primary)" />
                </div>
                <p style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-primary)', marginBottom: 8 }}>
                  Dosyayı sürükleyip bırakın
                </p>
                <p style={{ color: '#64748b', fontSize: '0.875rem', marginBottom: 16 }}>
                  veya <span style={{ color: 'var(--color-secondary)', fontWeight: 600 }}>dosya seçmek için tıklayın</span>
                </p>
                <div style={{ display: 'flex', justifyContent: 'center', gap: 8, flexWrap: 'wrap' }}>
                  {['PDF', 'Excel (.xlsx)', 'CSV'].map(fmt => (
                    <span key={fmt} style={{
                      padding: '3px 12px', borderRadius: 999, fontSize: '0.75rem',
                      background: '#f1f5f9', color: '#475569', fontWeight: 500,
                    }}>{fmt}</span>
                  ))}
                </div>
                <p style={{ color: '#94a3b8', fontSize: '0.75rem', marginTop: 12 }}>Maks. 20 MB</p>
              </>
            ) : (
              <>
                {/* Seçili Dosya */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14 }}>
                  <div style={{
                    width: 52, height: 52, borderRadius: 14,
                    background: 'rgba(102,155,188,0.12)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <FileText size={26} color="var(--color-secondary)" />
                  </div>
                  <div style={{ textAlign: 'left' }}>
                    <p style={{ fontWeight: 700, color: 'var(--color-primary)', margin: 0, fontSize: '0.95rem' }}>
                      {file.name}
                    </p>
                    <p style={{ color: '#64748b', margin: '3px 0 0', fontSize: '0.8rem' }}>
                      {formatSize(file.size)}
                    </p>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); reset() }}
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      color: '#94a3b8', padding: 4, borderRadius: 6,
                      display: 'flex', alignItems: 'center',
                      transition: 'color 0.15s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.color = 'var(--color-accent)'}
                    onMouseLeave={e => e.currentTarget.style.color = '#94a3b8'}
                  >
                    <X size={18} />
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* Hata */}
        {status === 'error' && (
          <div style={{
            background: '#fef2f2', border: '1px solid #fecaca',
            borderRadius: 12, padding: '14px 18px', marginBottom: 16,
            display: 'flex', gap: 10, alignItems: 'flex-start',
          }}>
            <AlertTriangle size={18} color="#dc2626" style={{ flexShrink: 0, marginTop: 1 }} />
            <p style={{ color: '#dc2626', fontSize: '0.875rem', margin: 0 }}>{errorMsg}</p>
          </div>
        )}

        {/* Progress Bar (yükleme sırasında) */}
        {status === 'uploading' && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: '0.83rem', color: '#64748b', fontWeight: 500 }}>
                Yükleniyor ve analiz ediliyor...
              </span>
              <span style={{ fontSize: '0.83rem', fontWeight: 700, color: 'var(--color-primary)' }}>
                %{progress}
              </span>
            </div>
            <div style={{ height: 8, background: '#e2e8f0', borderRadius: 999, overflow: 'hidden' }}>
              <div style={{
                height: '100%', borderRadius: 999,
                background: 'linear-gradient(90deg, var(--color-primary), var(--color-secondary))',
                width: `${progress}%`, transition: 'width 0.3s ease',
              }} />
            </div>
          </div>
        )}

        {/* Başarı Ekranı */}
        {status === 'success' && result && (
          <div style={{
            background: '#ecfdf5', border: '2px solid #6ee7b7',
            borderRadius: 18, padding: '32px 28px', textAlign: 'center',
          }}>
            <div style={{
              width: 64, height: 64, background: '#10b981',
              borderRadius: '50%', display: 'flex', alignItems: 'center',
              justifyContent: 'center', margin: '0 auto 16px',
            }}>
              <CheckCircle size={32} color="white" />
            </div>
            <h3 style={{ color: '#065f46', fontWeight: 800, fontSize: '1.2rem', marginBottom: 8 }}>
              Başarıyla Yüklendi!
            </h3>
            <p style={{ color: '#047857', fontSize: '0.95rem', marginBottom: 16 }}>
              {result.message || `${result.stats?.total || ''} işlem analiz edildi`}
            </p>
            {result.stats && (
              <div style={{ display: 'flex', justifyContent: 'center', gap: 20, flexWrap: 'wrap', marginBottom: 16 }}>
                {[
                  { label: 'Toplam İşlem', value: result.stats.total },
                  { label: 'Gider', value: result.stats.debits },
                  { label: 'Gelir', value: result.stats.credits },
                ].filter(x => x.value != null).map(({ label, value }) => (
                  <div key={label} style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#065f46' }}>{value}</div>
                    <div style={{ fontSize: '0.75rem', color: '#047857' }}>{label}</div>
                  </div>
                ))}
              </div>
            )}
            <p style={{ color: '#6ee7b7', fontSize: '0.8rem' }}>
              💬 Sohbet ekranına yönlendiriliyorsunuz...
            </p>
          </div>
        )}

        {/* Yükle Butonu */}
        {file && status !== 'uploading' && status !== 'success' && (
          <button
            onClick={handleUpload}
            style={{
              width: '100%', padding: '14px',
              background: 'var(--color-primary)', color: 'white',
              border: 'none', borderRadius: 12,
              fontFamily: 'var(--font-sans)', fontWeight: 700,
              fontSize: '1rem', cursor: 'pointer',
              transition: 'all 0.2s', display: 'flex',
              alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
            onMouseEnter={e => e.currentTarget.style.background = '#004a6e'}
            onMouseLeave={e => e.currentTarget.style.background = 'var(--color-primary)'}
          >
            <UploadCloud size={18} />
            Ekstreyi Yükle ve Analiz Et
          </button>
        )}

        {/* Bilgi Notu */}
        {status === 'idle' && (
          <div style={{
            marginTop: 24, padding: '14px 18px',
            background: 'rgba(102,155,188,0.08)',
            borderRadius: 12, border: '1px solid rgba(102,155,188,0.2)',
          }}>
            <p style={{ fontSize: '0.8rem', color: '#475569', lineHeight: 1.6, margin: 0 }}>
              🔒 <strong>Gizlilik:</strong> Verileriniz yalnızca sizin hesabınızda saklanır ve üçüncü taraflarla paylaşılmaz.
              AI analizi tamamen kişiseldir.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
