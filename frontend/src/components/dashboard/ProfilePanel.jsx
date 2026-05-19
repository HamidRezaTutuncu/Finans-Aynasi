import { useAuth } from '../../context/AuthContext'

export default function ProfilePanel() {
  const { user } = useAuth()

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '40px 28px' }}>
      <div style={{ maxWidth: 600, margin: '0 auto' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-primary)', margin: '0 0 6px' }}>
          ⚙️ Profil Ayarları
        </h1>
        <p style={{ color: '#64748b', fontSize: '0.9rem', margin: '0 0 32px' }}>
          Hesap bilgilerinizi görüntüleyin.
        </p>

        <div style={{ background: 'white', borderRadius: 16, padding: 32, boxShadow: 'var(--shadow-md)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 32 }}>
            <div style={{
              width: 80, height: 80, borderRadius: '50%', background: 'var(--color-secondary)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '2rem', fontWeight: 700
            }}>
              {user?.name ? user.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) : 'FA'}
            </div>
            <div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--color-primary)' }}>{user?.name || 'Kullanıcı'}</div>
              <div style={{ color: '#64748b' }}>{user?.email || 'email@yok'}</div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {[
              { label: 'Yaş', value: user?.age || 'Belirtilmedi' },
              { label: 'Şehir', value: user?.city || 'Belirtilmedi' },
              { label: 'Aylık Gelir', value: user?.monthly_income ? `₺${user.monthly_income.toLocaleString('tr-TR')}` : 'Belirtilmedi' }
            ].map(item => (
              <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 16, borderBottom: '1px solid #f1f5f9' }}>
                <span style={{ color: '#64748b', fontWeight: 500 }}>{item.label}</span>
                <span style={{ color: 'var(--color-text)', fontWeight: 600 }}>{item.value}</span>
              </div>
            ))}
          </div>
          
          <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: 24, textAlign: 'center' }}>
            Profil düzenleme özelliği yakında eklenecektir.
          </p>
        </div>
      </div>
    </div>
  )
}
