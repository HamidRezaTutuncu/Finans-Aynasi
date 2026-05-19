import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import Logo from '../components/ui/Logo'

const FEATURES = [
  { icon: '🕵️', title: 'Adli Muhasebeci', desc: 'Harcama paternlerinizi tespit eden AI dedektif', color: '#6366f1' },
  { icon: '🪞', title: 'Söz Aynası', desc: 'Verdiğiniz sözleri takip eden, aldatma raporunuzu çıkaran sistem', color: '#f59e0b' },
  { icon: '🔮', title: 'Gelecekteki Ben', desc: '5 yıl sonraki halinizle sohbet edin', color: '#8b5cf6' },
  { icon: '🎲', title: 'What-If Simülatör', desc: '\'Sigarayı bıraksam ne olur?\' sorusuna somut cevaplar', color: '#ec4899' },
  { icon: '🏥', title: 'Finansal Sağlık Skoru', desc: '0-100 arası finansal check-up', color: '#10b981' },
  { icon: '🎭', title: 'Para Kişiliği', desc: 'Avcı mısınız, Karınca mı? Harcama karakterinizi öğrenin', color: '#f97316' },
]

const STEPS = [
  { icon: '📄', title: 'Banka ekstrenizi yükleyin', desc: 'PDF veya Excel formatındaki hesap özetinizi sisteme güvenle yükleyin.' },
  { icon: '🤖', title: 'AI analiz etsin', desc: 'Yapay zeka tüm harcamalarınızı otomatik kategorize etsin ve paternleri tespit etsin.' },
  { icon: '💬', title: 'Sohbet edin', desc: 'Tek bir sohbet ekranından tüm finansal asistanlarınıza ulaşın ve sorularınızı sorun.' },
]

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } }
}

export default function LandingPage() {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <main style={{ minHeight: '100vh', background: 'var(--color-bg)', overflowX: 'hidden' }}>
      {/* NAVBAR */}
      <nav style={{
        position: 'absolute', top: 0, left: 0, right: 0,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '20px 40px', zIndex: 50,
      }}>

        <Link to="/auth" style={{ textDecoration: 'none' }}>

        </Link>
      </nav>

      {/* 1. HERO SECTION */}
      <section style={{
        position: 'relative',
        minHeight: '100vh',
        background: 'linear-gradient(135deg, var(--color-primary) 0%, #004a6e 60%, var(--color-secondary) 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}>
        {/* Floating Background Elements */}
        <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
          {[
            { icon: '💰', size: 60, top: '20%', left: '10%', delay: 0 },
            { icon: '📉', size: 80, top: '70%', left: '15%', delay: 1 },
            { icon: '📈', size: 50, top: '30%', right: '15%', delay: 2 },
            { icon: '🪞', size: 70, top: '60%', right: '10%', delay: 0.5 },
          ].map((item, i) => (
            <motion.div
              key={i}
              initial={{ y: 0, opacity: 0.15 }}
              animate={{ y: [-15, 15, -15], rotate: [-5, 5, -5] }}
              transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut', delay: item.delay }}
              style={{
                position: 'absolute',
                top: item.top,
                left: item.left,
                right: item.right,
                fontSize: item.size,
              }}
            >
              {item.icon}
            </motion.div>
          ))}

          {/* Abstract geometric shapes */}
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 150, repeat: Infinity, ease: 'linear' }}
            style={{
              position: 'absolute', top: '-10%', right: '-5%', width: '40vw', height: '40vw',
              borderRadius: '50%', background: 'radial-gradient(circle, rgba(253,240,213,0.05) 0%, transparent 70%)'
            }}
          />
          <motion.div
            animate={{ rotate: -360 }}
            transition={{ duration: 120, repeat: Infinity, ease: 'linear' }}
            style={{
              position: 'absolute', bottom: '-20%', left: '-10%', width: '50vw', height: '50vw',
              borderRadius: '50%', background: 'radial-gradient(circle, rgba(102,155,188,0.1) 0%, transparent 70%)'
            }}
          />
        </div>

        {/* Hero Content */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8, y: -30 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          style={{ textAlign: 'center', color: 'var(--color-text-light)', padding: '0 24px', zIndex: 1, maxWidth: 800, display: 'flex', flexDirection: 'column', alignItems: 'center' }}
        >
          <motion.div
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            style={{ marginBottom: '24px' }}
          >
            <Logo variant="primary" size="hero" className="max-w-[280px] xl:max-w-[400px]" />
          </motion.div>
          <p style={{ fontSize: 'clamp(1.1rem, 3vw, 1.35rem)', opacity: 0.9, margin: '0 auto 40px', lineHeight: 1.6, fontWeight: 400 }}>
            AI destekli kişisel finans aynanız Prospekt — harcamalarınızı analiz edin, sözlerinizi takip edin, geleceğinizi görün.
          </p>
          <Link to="/auth" style={{ textDecoration: 'none' }}>
            <motion.button
              className="btn btn-lg"
              animate={{ scale: [1, 1.05, 1], boxShadow: ["0 0 0 0 rgba(193,18,31,0.4)", "0 0 0 12px rgba(193,18,31,0)", "0 0 0 0 rgba(193,18,31,0)"] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              style={{
                background: 'var(--color-accent)',
                color: 'white',
                fontSize: '1.1rem',
                padding: '16px 36px',
                borderRadius: 'var(--radius-full)',
                fontWeight: 700,
              }}
            >
              🚀 Hemen Başla
            </motion.button>
          </Link>
        </motion.div>
      </section>

      {/* 2. ÖZELLİKLER SECTION */}
      <section style={{ padding: '100px 24px', maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 60 }}>
          <h2 style={{ fontSize: 'clamp(2rem, 4vw, 2.8rem)', fontWeight: 800, color: 'var(--color-primary)', marginBottom: 16 }}>
            Finansal Asistanlarınız
          </h2>
          <p style={{ color: '#64748b', fontSize: '1.1rem', maxWidth: 600, margin: '0 auto' }}>
            Farklı yeteneklere sahip yapay zeka modülleri ile paranızı yönetmenin yeni yolu.
          </p>
        </div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-100px" }}
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: 24,
          }}
        >
          {FEATURES.map((feature, i) => (
            <motion.div
              key={i}
              variants={itemVariants}
              className="card card-hover"
              style={{
                position: 'relative',
                overflow: 'hidden',
                padding: '32px 28px',
                borderLeft: `4px solid ${feature.color}`,
                display: 'flex',
                flexDirection: 'column',
                gap: 16,
                background: 'white'
              }}
            >
              <div style={{
                width: 56, height: 56, borderRadius: 16,
                background: `${feature.color}15`, display: 'flex',
                alignItems: 'center', justifyContent: 'center', fontSize: 28
              }}>
                {feature.icon}
              </div>
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-primary)', marginBottom: 8 }}>
                  {feature.title}
                </h3>
                <p style={{ color: '#64748b', fontSize: '0.95rem', lineHeight: 1.6, margin: 0 }}>
                  {feature.desc}
                </p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* 3. NASIL ÇALIŞIR SECTION */}
      <section style={{ padding: '100px 24px', background: 'rgba(255,255,255,0.6)' }}>
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 60 }}>
            <h2 style={{ fontSize: 'clamp(2rem, 4vw, 2.8rem)', fontWeight: 800, color: 'var(--color-primary)', marginBottom: 16 }}>
              Nasıl Çalışır?
            </h2>
            <p style={{ color: '#64748b', fontSize: '1.1rem' }}>Sadece 3 adımda finansal geleceğinizi şekillendirin.</p>
          </div>

          <div style={{ position: 'relative', paddingLeft: 40 }}>
            {/* Dikey Timeline Çizgisi */}
            <motion.div
              initial={{ height: 0 }}
              whileInView={{ height: '100%' }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 1.5, ease: "easeOut" }}
              style={{
                position: 'absolute',
                left: 18,
                top: 0,
                width: 4,
                background: 'linear-gradient(to bottom, var(--color-secondary), var(--color-primary))',
                borderRadius: 4,
                transform: 'translateX(-50%)'
              }}
            />

            <motion.div
              variants={containerVariants}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, margin: "-100px" }}
              style={{ display: 'flex', flexDirection: 'column', gap: 48 }}
            >
              {STEPS.map((step, i) => (
                <motion.div
                  key={i}
                  variants={itemVariants}
                  style={{ position: 'relative', display: 'flex', gap: 24, alignItems: 'flex-start' }}
                >
                  <div style={{
                    width: 44, height: 44, borderRadius: '50%',
                    background: 'white', border: '4px solid var(--color-bg)',
                    boxShadow: 'var(--shadow-md)', display: 'flex',
                    alignItems: 'center', justifyContent: 'center',
                    fontSize: 20, zIndex: 1, flexShrink: 0,
                    position: 'absolute', left: -40, transform: 'translateX(-50%)'
                  }}>
                    {step.icon}
                  </div>
                  <div className="card" style={{ padding: '24px 32px', flex: 1, marginLeft: 16 }}>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-primary)', marginBottom: 8 }}>
                      {step.title}
                    </h3>
                    <p style={{ color: '#64748b', fontSize: '1rem', margin: 0, lineHeight: 1.5 }}>
                      {step.desc}
                    </p>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </div>
      </section>

      {/* 4. FOOTER */}
      <footer style={{
        background: 'var(--color-primary)',
        color: 'rgba(253,240,213,0.8)',
        padding: '60px 24px',
        textAlign: 'center',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16
      }}>
        <Logo variant="horizontal-light" size="sm" />
        <p style={{ fontSize: '0.9rem', marginBottom: 0 }}>
          © 2026 Prospekt. Mirror of Finance.
        </p>
      </footer>
    </main>
  )
}
