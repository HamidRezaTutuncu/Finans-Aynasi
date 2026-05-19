# Prospekt — Mirror of Finance (Frontend)

Prospekt, kullanıcıların banka ekstrelerini yükleyerek finansal durumlarını analiz edebildikleri, yapay zeka destekli bir kişisel finans ve adli muhasebe asistanıdır. Kullanıcılar harcama paternlerini görebilir, finansal sağlık skorlarını öğrenebilir, para kişiliklerini keşfedebilir ve gelecekleriyle sohbet edebilirler.

## Özellikler

- **Banka Ekstresi Analizi:** PDF veya Excel formatındaki ekstreleri sisteme yükleyip otomatik kategorizasyon sağlama.
- **Finansal Sağlık Skoru:** 0-100 arası akıllı finansal check-up ve sağlık karnesi.
- **Para Kişiliği:** Harcama davranışlarına göre karakter analizi (Örnek: Avcı, Karınca).
- **Harcama Özeti:** Net tasarruf, toplam harcama, en çok harcanan kategori ve aylık ortalama gibi temel metriklerin gösterimi.
- **Yapay Zeka Asistanları:**
  - **Adli Muhasebeci:** Harcama paternlerini tespit eder.
  - **Söz Aynası:** Verilen sözleri takip eder ve aldatma raporu çıkarır.
  - **Gelecekteki Ben:** 5 yıl sonraki halinizle sohbet etme imkanı.
  - **What-If Simülatörü:** Varsayımsal senaryoları test etme.

## Teknolojiler

- **React & Vite:** Hızlı ve modern frontend mimarisi.
- **Framer Motion:** Akıcı ve dinamik UI animasyonları.
- **Tailwind CSS & Vanilla CSS:** Özelleştirilmiş, modern "Prospekt" tasarım sistemi ve bileşenleri.
- **Lucide React:** Modern ikon seti.
- **React Router:** Sayfa yönlendirmeleri.

## Kurulum ve Çalıştırma

1. Repoyu klonlayın:
   ```bash
   git clone <repo_url>
   ```

2. Bağımlılıkları yükleyin:
   ```bash
   npm install
   ```

3. Geliştirme sunucusunu başlatın:
   ```bash
   npm run dev
   ```

## Tasarım Sistemi
Prospekt, kendi tasarım sistemini kullanır. Ana renkler:
- **Deep Space Blue:** `#003049` (Primary)
- **Steel Blue:** `#669bbc` (Secondary)
- **Flag Red:** `#c1121f` (Accent)
- **Papaya Whip:** `#fdf0d5` (Background)

Bu renkler ve sistem genelindeki diğer tasarım tokenları `src/index.css` içerisinde tanımlanmıştır.
