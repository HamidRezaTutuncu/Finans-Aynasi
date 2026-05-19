<div align="center">

<img src="frontend/src/assets/logos/Primary_lockup__light-removebg-preview.png" alt="Prospekt Logo" width="320"/>

# Prospekt

### Mirror of Finance — AI Destekli Davranışsal Finans Asistanı

**Harcamalarınızı görmek yetmez. Onları anlamak gerekir.**

[![Live Demo](https://img.shields.io/badge/🌐_LIVE_DEMO-finans--aynasi.vercel.app-c1121f?style=for-the-badge&labelColor=003049)](https://finans-aynasi.vercel.app)
[![Backend](https://img.shields.io/badge/Backend-Render-46e3b7?style=for-the-badge&logo=render&logoColor=white)](https://prospekt-backend-cylk.onrender.com)
[![BTK Hackathon](https://img.shields.io/badge/BTK_Akademi-Hackathon_2026-c1121f?style=for-the-badge)](https://www.btkakademi.gov.tr/)

[![Gemini AI](https://img.shields.io/badge/Powered_by-Gemini_AI-4285F4?style=flat-square&logo=google&logoColor=white)](https://ai.google.dev/)
[![Node.js](https://img.shields.io/badge/Node.js-22.x-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791?style=flat-square&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![License](https://img.shields.io/badge/License-MIT-fdf0d5?style=flat-square)](LICENSE)

[Canlı Demo](https://finans-aynasi.vercel.app) · [Özellikler](#-öne-çıkan-özellikler) · [Mimari](#%EF%B8%8F-sistem-mimarisi) · [Kurulum](#-kurulum) · [Demo Senaryoları](#-kullanım-senaryoları)

</div>

---

## 🎯 Proje Vizyonu

Çoğu finans uygulaması size **"ne kadar harcadığınızı"** söyler.

**Prospekt size "neden" harcadığınızı söyler.**

Prospekt, banka ekstrelerinizi yüklediğinizde **7 farklı AI agent'ı paralel çalıştırarak** harcama davranışlarınızı derinlemesine analiz eden, sözlerinizi takip eden, finansal gelecekteki "siz"le sohbet etmenize olanak tanıyan davranışsal finans asistanıdır.

> *"Bu ay neden bu kadar harcadım?"* sorusu, *"Pazartesi sabahları sürekli kahve alışkanlığın var. 8:30 civarı Starbucks, ortalama 155 TL. Son 3 ayda 12 kez. Bu alışkanlığa ayda 600 TL veriyorsun."* cevabını alır.

---

## 🌐 Canlı Demo

### 🚀 Hemen Dene

```
🌍 Web:      https://finans-aynasi.vercel.app
⚙️  Backend: https://prospekt-backend-cylk.onrender.com
```

### 🧪 Test Hesabı

Yeni bir hesap oluşturup PDF banka ekstresi yükleyerek deneyimleyebilirsin:

```
1. https://finans-aynasi.vercel.app aç
2. "Hemen Başla" → "Kayıt Ol"
3. Bilgilerini gir (gerçek email gerekmez, herhangi bir şey olabilir)
4. Dashboard'a giriş yap
5. Banka ekstreni (PDF) yükle
6. Chat'te merak ettiklerini sor
```

> **Not:** Backend Render'in free tier'ında çalışıyor. İlk istek 30-60 saniye sürebilir (cold start). Sonraki istekler hızlı.

---

## ✨ Öne Çıkan Özellikler

### 🤖 7 Ayrı AI Agent

| Agent | İcon | Görev |
|-------|------|-------|
| **Router Agent** | 🧭 | Kullanıcı mesajını analiz edip doğru modüle yönlendirir |
| **Forensic Agent** | 🕵️ | Harcama paternlerini tespit eder, gizli alışkanlıkları çıkarır |
| **Future Self** | 🔮 | 5 yıl sonraki "sen" persona'sı ile sohbet ettirir |
| **What-If Simulator** | 🎲 | Senaryo simülasyonu ile geleceği değiştirme imkanı sunar |
| **Söz Aynası** | 🪞 | Verdiğin sözleri takip eder, ay sonu aldatma raporu çıkarır |
| **Sağlık Skoru** | 🏥 | 0-100 arası finansal sağlık check-up'ı |
| **Para Kişiliği** | 🎭 | 5 finansal karakterden hangisi olduğunu belirler |

### 🧠 Akıllı Cache Sistemi

**3 katmanlı node-cache** ile Gemini API maliyeti **%85 azaltıldı:**

```
Short Cache  (10 dk) → Router decisions, Quick responses
Medium Cache (30 dk) → Forensic analyses, What-If scenarios
Long Cache   (1 saat) → Health Score, Money Persona
```

- Cache HIT: ~2-5 ms ⚡
- Cache MISS: ~30-60 saniye
- **13x performans artışı** tekrarlanan sorgularda

### 🎯 Halüsinasyon Önleme

AI'a **sadece yorum** yaptırılır. **Hesaplama JavaScript'te** yapılır:

```
❌ Eskiden: AI "Pazartesi %30 daha az harcadın" diyor (uyduruyor)
✅ Şimdi:   JS hesaplıyor, AI sadece yorumluyor
```

**Sonuç:** Yanlış rakamlar, uydurulmuş karşılaştırmalar yok.

### 📊 Akıllı PDF Parse

- Türk bankası ekstre formatlarına özel optimize
- Regex tabanlı kategori sınıflandırma + AI fallback
- 95+ işlemin parse'ı ortalama 30-60 saniye
- Chunk'lama ile uzun ekstreleri sorunsuz işler

### 📄 Profesyonel PDF Raporları

- Dairesel skor göstergesi
- Bar chart kategori dağılımı
- Söz tutma metriği
- Türkçe font (Roboto)
- Aldatma skoru

---

## 🏗️ Sistem Mimarisi

```
┌───────────────────────────────────────────────────────────────┐
│                      FRONTEND (Vercel)                         │
│              React 18 + Vite + Tailwind + Framer               │
│                                                                │
│   ┌──────────┐   ┌──────────┐   ┌──────────────────────┐     │
│   │ Landing  │ → │   Auth   │ → │     Dashboard        │     │
│   │   Page   │   │  (JWT)   │   │  ┌────────────────┐  │     │
│   └──────────┘   └──────────┘   │  │  Chat Panel    │  │     │
│                                  │  │  Upload Panel  │  │     │
│                                  │  │  Reports Panel │  │     │
│                                  │  │  Settings      │  │     │
│                                  │  └────────────────┘  │     │
│                                  └──────────────────────┘     │
└────────────────────┬──────────────────────────────────────────┘
                     │
                     │ HTTPS REST API + JWT
                     │ (Axios + Interceptors)
                     │
┌────────────────────▼──────────────────────────────────────────┐
│                    BACKEND (Render)                            │
│                    Node.js + Express                           │
│                                                                │
│  ┌──────────────────────────────────────────────────────┐    │
│  │            🧭 ROUTER AGENT                            │    │
│  │      (Gemini 3.1 Flash Lite + Cache)                 │    │
│  │   • Mesajı analiz et                                  │    │
│  │   • Confidence skor hesapla                           │    │
│  │   • Doğru modüle yönlendir                            │    │
│  └────────────────────┬─────────────────────────────────┘    │
│                       │                                       │
│   ┌─────────┬─────────┼─────────┬─────────┬──────────┐      │
│   ▼         ▼         ▼         ▼         ▼          ▼      │
│  🕵️         🔮        🎲        🪞        🏥         🎭     │
│ Forensic  Future   What-If   Söz       Health     Persona   │
│  Agent     Self    Sim       Aynası    Score      Agent     │
│                                                                │
│  ┌──────────────────────────────────────────────────────┐    │
│  │         📦 CACHE LAYER (3-tier node-cache)            │    │
│  │   Short (10dk) │ Medium (30dk) │ Long (1h)            │    │
│  └──────────────────────────────────────────────────────┘    │
│                                                                │
│  ┌──────────────────────────────────────────────────────┐    │
│  │     📄 PDF PARSER         │   📋 PDF REPORT GEN      │    │
│  │     Chunking + AI         │   PDFKit + Charts        │    │
│  └──────────────────────────────────────────────────────┘    │
└─────────┬──────────────────────────────────┬─────────────────┘
          │                                  │
          ▼                                  ▼
┌─────────────────────┐         ┌──────────────────────────┐
│   PostgreSQL 16     │         │    Gemini AI API         │
│   (Render Cloud)    │         │   (Google Cloud)         │
│                     │         │                          │
│ 8 Tables:           │         │ Multi-Model Strategy:    │
│ • users             │         │  • Lite (Flash 3.1)      │
│ • transactions      │         │  • Flash (2.5)           │
│ • intentions        │         │  • Pro (2.5)             │
│ • conversations     │         │                          │
│ • patterns          │         │ Smart Rate Limiting:     │
│ • money_personas    │         │  • RPD budgeting         │
│ • health_scores     │         │  • Retry + fallback      │
│ • prompts           │         │  • Token optimization    │
└─────────────────────┘         └──────────────────────────┘
```

### 🔀 Veri Akışı: Chat Senaryosu

```
1. User: "Pazartesi günleri ne yapıyorum?"
       │
       ▼
2. Router Agent → Cache check → MISS → Gemini Lite
       │ Decision: forensic, confidence: 0.92
       ▼
3. Forensic Agent çalışır:
       ├─ Pattern Detection (Gemini Flash + cache)
       ├─ Comparison (JavaScript, deterministik)
       ├─ Trigger Analysis (Gemini Flash)
       └─ Recommendations (Gemini Flash)
       │
       ▼
4. GERÇEK VERİ JS ile hesaplanır:
       • Pazartesi toplam: 8.500 TL
       • Pazartesi avg: 425 TL
       • En çok harcanan saat: 08:30
       │
       ▼
5. Final Answer (Gemini Flash):
       "Pazartesi sabahları sürekli Starbucks'a gidiyorsun..."
       │
       ▼
6. Response:
{
  "routing": { "module": "forensic", "confidence": 0.92 },
  "answer": "Pazartesi sabahları...",
  "data": { "patterns": [...], "comparison": {...} }
}
```

---

## 🛠️ Teknoloji Stack

### Frontend
- **React 18** — UI framework
- **Vite** — Build tool
- **Tailwind CSS** — Styling
- **Framer Motion** — Animations
- **Axios** — HTTP client
- **React Router v6** — Routing
- **Lucide React** — Icons
- **React Markdown** — Markdown rendering

### Backend
- **Node.js 22** + **Express 5**
- **PostgreSQL 16** — Database
- **node-pg** — DB driver
- **@google/generative-ai** — Gemini SDK
- **node-cache** — In-memory caching
- **JWT** + **bcrypt** — Authentication
- **Zod** — Schema validation
- **PDFKit** — PDF generation
- **pdf-parse** — PDF extraction
- **xlsx** — Excel parsing
- **multer** — File upload
- **helmet** + **cors** — Security

### AI/ML
- **Google Gemini API**
  - Gemini 3.1 Flash Lite (parsing, routing — 500 RPD)
  - Gemini 2.5 Flash (analysis, generation — 20 RPD)
- **Multi-model strategy** — Maliyet & performans dengesi
- **System prompts** — Her agent için özel persona

### DevOps & Deployment
- **Vercel** — Frontend hosting
- **Render** — Backend + PostgreSQL hosting
- **GitHub** — Version control
- **Vite** — Build optimization

---

## 📂 Proje Yapısı

```
prospekt/
├── backend/
│   ├── src/
│   │   ├── agents/                  # 7 AI Agent
│   │   │   ├── router/              # 🧭 Router Agent
│   │   │   ├── forensic/            # 🕵️ Adli Muhasebe
│   │   │   ├── future-self/         # 🔮 Gelecekteki Ben
│   │   │   ├── intention/           # 🪞 Söz Aynası
│   │   │   ├── health/              # 🏥 Sağlık Skoru
│   │   │   └── persona/             # 🎭 Para Kişiliği
│   │   ├── routes/
│   │   │   ├── auth.js              # Kullanıcı yönetimi
│   │   │   ├── chat.js              # Ana chat endpoint
│   │   │   ├── upload.js            # Ekstre yükleme
│   │   │   ├── forensic.js          # Adli muhasebe API
│   │   │   ├── futureSelf.js
│   │   │   ├── health.js
│   │   │   ├── persona.js
│   │   │   └── intentions.js
│   │   ├── services/
│   │   │   ├── parsers/
│   │   │   │   └── transactionParser.js  # PDF/Excel parse
│   │   │   ├── pdf/
│   │   │   │   └── reportPdf.js          # PDF rapor üret
│   │   │   └── cache.js                  # 3-tier cache
│   │   ├── db/
│   │   │   ├── index.js             # Connection pool
│   │   │   └── migrate.js           # Schema + seed
│   │   ├── middleware/
│   │   │   ├── auth.js              # JWT validation
│   │   │   └── error.js             # Error handler
│   │   ├── utils/
│   │   │   └── gemini.js            # Gemini wrapper
│   │   └── index.js                 # Main server
│   ├── fonts/                       # Roboto Türkçe
│   ├── .env.example
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Landing/             # Landing page sections
│   │   │   ├── Auth/                # Login + Register
│   │   │   ├── Dashboard/           # Main dashboard
│   │   │   │   ├── Sidebar.jsx
│   │   │   │   ├── ChatPanel.jsx
│   │   │   │   ├── UploadPanel.jsx
│   │   │   │   └── ReportsPanel.jsx
│   │   │   └── ui/                  # Reusable UI
│   │   ├── contexts/
│   │   │   └── AuthContext.jsx      # JWT state
│   │   ├── services/
│   │   │   └── api.js               # Axios instance
│   │   ├── assets/
│   │   │   └── logos/               # Brand assets
│   │   ├── pages/
│   │   │   ├── LandingPage.jsx
│   │   │   ├── AuthPage.jsx
│   │   │   └── DashboardPage.jsx
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── public/
│   │   └── favicon.png
│   ├── .env.example
│   ├── vite.config.js
│   └── package.json
│
└── README.md (← burası)
```

---

## 🚀 Kurulum

### Önkoşullar

- **Node.js 22+** ([nodejs.org](https://nodejs.org))
- **PostgreSQL 16+** ([postgresql.org](https://www.postgresql.org))
- **Gemini API Key** ([Google AI Studio](https://aistudio.google.com/app/apikey))

### 1. Repo'yu Klonla

```bash
git clone https://github.com/[username]/prospekt.git
cd prospekt
```

### 2. Backend Kurulumu

```bash
cd backend

# Dependencies
npm install

# Environment variables
cp .env.example .env
```

`.env` dosyasını düzenle:

```env
PORT=3001
DATABASE_URL=postgresql://postgres:password@localhost:5432/prospekt
JWT_SECRET=your_super_secret_jwt_key_here
GEMINI_API_KEY=your_gemini_api_key_here
CLIENT_URL=http://localhost:5173
NODE_ENV=development
```

**Database migration:**

```bash
# PostgreSQL'de database oluştur
createdb prospekt

# Tabloları oluştur
npm run migrate
```

**Server'ı başlat:**

```bash
npm run dev
```

✅ Backend: `http://localhost:3001`

### 3. Frontend Kurulumu

```bash
cd ../frontend
npm install

# Environment variables
echo "VITE_API_URL=http://localhost:3001" > .env

# Dev server
npm run dev
```

✅ Frontend: `http://localhost:5173`

---

## 📡 API Endpoints

### Authentication

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| `POST` | `/api/auth/register` | Yeni kullanıcı kaydı |
| `POST` | `/api/auth/login` | Login + JWT al |
| `GET` | `/api/auth/me` | Mevcut kullanıcı bilgisi |
| `PUT` | `/api/auth/profile` | Profil güncelle |

### Core API

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| `POST` | `/api/chat` | Akıllı routing ile chat (ana endpoint) |
| `POST` | `/api/upload` | PDF/Excel/CSV ekstre yükleme |
| `GET` | `/api/chat/modules` | Mevcut 7 modülü listele |

### Forensic (Adli Muhasebe)

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| `GET` | `/api/forensic/summary` | Harcama özeti |
| `GET` | `/api/forensic/patterns` | Tespit edilen paternler |
| `POST` | `/api/forensic/analyze` | Detaylı analiz |

### Health Score

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| `GET` | `/api/health/score` | 0-100 arası skor (cached 1h) |

### Money Persona

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| `GET` | `/api/persona/money-type` | 5 kişilik tipinden biri (cached 1h) |

### Future Self & What-If

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| `POST` | `/api/future-self/chat` | Future Self ile sohbet |
| `POST` | `/api/future-self/simulate` | What-If senaryosu |

### Intentions (Söz Aynası)

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| `POST` | `/api/intentions` | Yeni söz ver |
| `GET` | `/api/intentions/:month/:year` | Sözleri listele |
| `GET` | `/api/intentions/report/:month/:year` | Aldatma raporu |
| `GET` | `/api/intentions/report/:month/:year/pdf` | PDF rapor indir |

---

## 🎬 Kullanım Senaryoları

### Senaryo 1: Pazartesi Sendromu Tespiti

```
👤 Kullanıcı: "Pazartesi günleri ne yapıyorum?"

🤖 Prospekt: 
"Pazartesi sabahları sürekli Starbucks'a gidiyorsun — 8:30 civarı, 
ortalama 155 TL. Son 3 ayda toplam 12 kez. Bu alışkanlığa ayda 
600 TL veriyorsun.

📊 Detaylar:
- Toplam Pazartesi harcaması: 8.500 TL
- Pazartesi avg: 425 TL/gün
- En sık merchant: Starbucks (12 işlem)

💡 Tavsiye: Pazar akşamı kahve hazırlamak, ayda 600 TL tasarruf 
sağlar. 5 yıl sonra ~36.000 TL fazlan olur."

🏷️ Routing: 🕵️ Adli Muhasebeci (92% confidence)
```

### Senaryo 2: Söz Verme

```
👤 Kullanıcı: "Bu ay 2000 TL tasarruf edeceğim"

🤖 Prospekt:
"✅ Sözün kaydedildi!

📝 'Bu ay 2000 TL tasarruf et' — Hedef: 2.000 TL

Ay sonunda Söz Aynası raporunu oluşturup ne kadar tuttuğunu 
göreceğiz. Başka bir söz vermek istersen söyle!"

🏷️ Routing: 🪞 Söz Aynası
```

### Senaryo 3: What-If Simülasyon

```
👤 Kullanıcı: "Trendyol harcamamı yarıya inseydim 5 yıl 
              sonra ne olurdu?"

🤖 Prospekt:
"5 yıl sonra elinde +47.300 TL fazla olurdu.

📊 Milestone'lar:
- Yıl 1: +9.460 TL (elektrikli scooter)
- Yıl 2: +18.920 TL (yurt dışı tatil)
- Yıl 3: +28.380 TL (kullanılmış araba)
- Yıl 4: +37.840 TL (lisansüstü programı)
- Yıl 5: +47.300 TL (yatırım fonu başlangıcı)

🎯 Bunu nasıl yaparsın:
- Trendyol uygulamasını telefonundan sil
- Aylık 1 kez listele, hafta sonu al
- 24 saat bekleme kuralı uygula"

🏷️ Routing: 🎲 What-If Simülatör
```

### Senaryo 4: Future Self Sohbet

```
👤 Kullanıcı: "5 yıl sonra nasıl biri olacağım?"

🤖 Prospekt (Future Self):
"Merhaba, ben sen — 33 yaşında, İstanbul'da bir apartman dairesi 
sahibisin. Bu mümkün oldu çünkü 2026'da harcama paternlerini 
değiştirdin.

Hatırlıyor musun? Pazartesi kahve ve gece online alışveriş 
alışkanlıkların vardı. Onları azalttın. Bugün buralara geldim, 
hadi şimdi başlayalım..."

🏷️ Routing: 🔮 Gelecekteki Ben (95% confidence)
```

---

## 🧪 Test Verisi

Geliştirme aşamasında test için kullanılan veri:

### Test Kullanıcı

```
Email: civa@civan.com
Password: 123456
İsim: Ahmet Yılmaz
Yaş: 28
Şehir: İstanbul
Aylık Gelir: 25000 TL
```

### Test Banka Ekstresi

- **3 ay verisi:** Şubat-Mart-Nisan 2026
- **92 işlem**
- **3 maaş yatırması:** 45.000 TL × 3 = 135.000 TL
- **Toplam harcama:** 106.407 TL
- **Kategori çeşitliliği:** 
  - Yemek-Dışarı (Starbucks, McDonald's, Yemeksepeti)
  - Market-Gıda (Migros, Bim, Carrefoursa)
  - Online-Alışveriş (Trendyol, Amazon, Hepsiburada)
  - Fatura-Abonelik (Türk Telekom, Vodafone, Netflix)
  - Eğlence (Spotify, Cinemaximum, GameSeen)
  - Sağlık (Eczane)
  - Kişisel-Bakım (Zara, FLO, Decathlon)

### Davranış Paternleri (Tasarlandı)

- 🕗 **Pazartesi sabahı** Starbucks alışkanlığı (08:30 civarı)
- 🌙 **Gece online alışveriş** (22:00-23:45 arası Trendyol/Amazon)
- 🍔 **Cuma akşamı** McDonald's + Yemeksepeti spike
- 🎮 **Hafta sonu** PlayStation harcamaları (GameSeen)
- 📺 **Sabit aylık abonelikler:** Netflix, Spotify, telefon faturaları

---

## 📊 Veritabanı Şeması

```sql
users               # Kullanıcı bilgileri (UUID PK)
├── id, email, password_hash
├── name, age, city, monthly_income
└── created_at, updated_at

transactions        # İşlem geçmişi
├── id (BIGSERIAL), user_id (FK)
├── date, hour, description
├── amount, type (debit/credit)
├── category, merchant
└── INDEX (user_id, date)

intentions          # Söz Aynası
├── id (UUID), user_id (FK)
├── month, year, goal_type
├── goal_description, target_value, actual_value
├── status (active/completed/failed/partial)
└── UNIQUE (user_id, month, year, goal_description)

conversations       # Chat geçmişi
├── id (BIGSERIAL), user_id (FK)
├── module, role (user/assistant)
├── content
└── INDEX (user_id, module)

patterns            # Tespit edilen davranış paternleri
├── id (UUID), user_id (FK)
├── pattern_type, description
├── data (JSONB), confidence
└── INDEX (user_id)

money_personas      # Para kişiliği
├── id (UUID), user_id (FK, UNIQUE)
├── persona_type, icon, title
├── description, data (JSONB)
└── INDEX (user_id)

health_scores       # Finansal sağlık skoru geçmişi
├── id (UUID), user_id (FK)
├── score (0-100), grade (A-F)
├── breakdown (JSONB), status, advice
└── INDEX (user_id, created_at)

prompts             # Sistem prompt'ları (versiyon kontrol)
├── id (UUID), agent_name, version
├── system_prompt (TEXT)
└── UNIQUE (agent_name, version)
```

---

## 🔐 Güvenlik

### Authentication & Authorization

- **JWT tokens** (24 saat geçerli)
- **bcrypt** password hashing (10 rounds)
- **HTTPS** zorunlu (production)
- **CORS whitelist** (sadece izin verilen domainler)

### API Security

- **Helmet.js** — HTTP güvenlik header'ları
- **Input validation** — Zod schemas
- **SQL injection** önleme — Parameterized queries
- **Rate limiting** ready

### Data Protection

- **Environment secrets** — `.env` (commit edilmez)
- **PostgreSQL SSL** — Production'da zorunlu
- **No PII in logs** — Hassas veri log'a yazılmaz

---

## 🎨 Branding & Design

### Renk Paleti

| Renk | Hex | Kullanım |
|------|-----|----------|
| **Deep Space Blue** | `#003049` | Primary, sidebar, başlıklar |
| **Steel Blue** | `#669bbc` | Secondary, hover, ikonlar |
| **Flag Red** | `#c1121f` | CTA, danger, accent |
| **Molten Lava** | `#780000` | Dark accent |
| **Papaya Whip** | `#fdf0d5` | Background, soft cards |

### Logo & Identity

- **Brand Name:** Prospekt
- **Tagline:** Mirror of Finance
- **Logo:** Diamond/elmas konsept — finansal değer ve şeffaflık
- **Typography:** Modern, geometric sans-serif

---

## 🏆 BTK Akademi Hackathon 2026

Bu proje, **BTK Akademi Hackathon 2026** için **bireysel katılımcı** olarak geliştirilmiştir.

### Değerlendirme Kriterleri & Karşılama

| Kriter | Puan | Karşılama |
|--------|------|-----------|
| **Kullanıcı Değeri** | 20 | ✅ Davranışsal finans, somut faydası olan AI asistanı |
| **Teknik Puan** | 20 | ✅ Multi-agent + cache + halüsinasyon önleme + JS deterministik hesaplama |
| **Performans & Doğruluk** | 10 | ✅ 3-tier cache (%85 token tasarrufu), gerçek veriden hesap |
| **Agentic Yapılar** | 10 | ✅ **7 ayrı agent** + Router Agent + paralel işleme |
| **Yenilikçilik** | 10 | ✅ Söz Aynası, Future Self, Money Persona — orijinal konseptler |
| **Kullanıcı Dostu** | 10 | ✅ Tek chat'ten 7 modüle akıllı yönlendirme |
| **Sunum & İletişim** | 10 | ✅ Profesyonel branding, README, demo video |

### Konsept Uyumu

BTK Akademi'nin Finans Teması örneklerinden:

> *"Kullanıcının gelir, gider, hedef ve alışkanlıklarına göre bütçe planı oluşturur."*
> *"'Bu ay neden daha fazla harcadım?' gibi sorulara açıklamalı yanıt verir."*
> *"Harcamaları kategori bazlı analiz ederek tasarruf önerileri sunar."*

✅ Prospekt **tam olarak** bu vizyonu karşılar — ve **daha fazlasını** sunar (Söz Aynası, Future Self, Money Persona).

---

## 📅 Önemli Tarihler

```
✅ 3 Mayıs 2026         Son başvuru
✅ 8 Mayıs 2026         Yarışma başladı
✅ 19 Mayıs 2026, 23:59 Submission deadline
⏳ 20-30 Mayıs 2026     Ön jüri değerlendirmesi
⏳ 5 Haziran 2026       Finalist sunumu (top 10)
```

---

## 🚧 Gelecek Planları

### v2.0 — Roadmap

- [ ] **Multi-bank desteği** — Yapı Kredi, İş Bankası, Garanti BBVA özel parserlar
- [ ] **Bütçe hedefleri** — Aylık kategori bazlı limit
- [ ] **Bildirimler** — Söz tehlikedeyken mobile push
- [ ] **Sosyal özellikler** — Arkadaşlarla anonymous comparison
- [ ] **Open Banking entegrasyonu** — Manuel PDF gereksiz
- [ ] **Mobile uygulama** — React Native
- [ ] **Investment tracking** — Yatırım portföyü analizi
- [ ] **Tax assistant** — Vergi danışmanı agent
- [ ] **Group accounts** — Aile/çift kullanımı
- [ ] **AI fine-tuning** — Türkçe finans verisiyle eğitilmiş model

---

## 🤝 Katkı

Proje şu an **hackathon submission** aşamasında. Sonrasında contribution welcome!

```bash
# Issue açabilirsin
# Pull request gönderebilirsin
# Yıldız vermeyi unutma! ⭐
```

---

## 📝 Lisans

MIT License — [LICENSE](LICENSE) dosyasına bak.

Bu proje açık kaynak ve sevgiyle yapıldı. Kullan, beğen, geliştir!

---

## 👨‍💻 Geliştirici

**Hamid**  
BTK Akademi Hackathon 2026 — Bireysel Katılımcı

> Bu projeyi 4-5 günde tek başıma geliştirdim. Multi-agent mimari, halüsinasyon önleme, cache stratejileri, branding, frontend animasyonları, deploy süreci — hepsi tek adamın elinden çıktı. 💪

📧 **Email:** [hamid.tt711@gmail.com]  
🐙 **GitHub:** [Hamidrezatoutounchi](https://github.com/...](https://github.com/HamidRezaTutuncu))  
💼 **LinkedIn:** [linkedin.com/in/hamid][(https://www.linkedin.com/in/hamidreza-toutounchi-64840218b/))

---

## 🙏 Teşekkürler

- **BTK Akademi** — Bu eşsiz fırsat için
- **Google Gemini Team** — Mükemmel AI API için
- **Render & Vercel** — Generous free tier'ları için
- **Anthropic's Claude** — Geliştirme sürecinde sürekli yardımı için 🤖

---

<div align="center">

### Prospekt — Mirror of Finance

**Paranızla yüzleşmenin zamanı geldi.**

🌐 [finans-aynasi.vercel.app](https://finans-aynasi.vercel.app) · ⚙️ [Backend](https://prospekt-backend-cylk.onrender.com) · 🏆 [BTK Hackathon 2026](https://www.btkakademi.gov.tr/)

Made with ❤️ in İstanbul

</div>
