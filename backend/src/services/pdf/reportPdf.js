'use strict';

const PDFDocument = require('pdfkit');
const path        = require('path');
const { pool }    = require('../../db');

// ─────────────────────────────────────────────────────────────
// RENK PALETİ — Modern, profesyonel
// ─────────────────────────────────────────────────────────────
const COLORS = {
  // Ana renkler
  primary:      '#6366f1',
  primaryDark:  '#4f46e5',
  primaryLight: '#a5b4fc',
  secondary:    '#8b5cf6',
  accent:       '#ec4899',
  
  // Status
  success:      '#10b981',
  successLight: '#d1fae5',
  warning:      '#f59e0b',
  warningLight: '#fef3c7',
  danger:       '#ef4444',
  dangerLight:  '#fee2e2',
  orange:       '#f97316',
  
  // Neutral
  dark:         '#111827',
  textDark:     '#1f2937',
  textMid:      '#4b5563',
  gray:         '#6b7280',
  lightGray:    '#e5e7eb',
  white:        '#ffffff',
  bgLight:      '#f9fafb',
  bgCard:       '#f3f4f6',
};

const MONTHS = [
  '', 'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
];

// ─────────────────────────────────────────────────────────────
// FONT YÜKLE
// ─────────────────────────────────────────────────────────────
const loadFonts = (doc) => {
  try {
    const fontDir = path.join(__dirname, '../../../fonts');
    doc.registerFont('Regular', path.join(fontDir, 'Roboto-Regular.ttf'));
    doc.registerFont('Bold',    path.join(fontDir, 'Roboto-Bold.ttf'));
    console.log('✅ Roboto fontları yüklendi');
    return true;
  } catch (err) {
    console.warn('⚠️  Roboto yüklenemedi:', err.message);
    return false;
  }
};

// ─────────────────────────────────────────────────────────────
// SKOR RENK & ETİKETLERİ
// ─────────────────────────────────────────────────────────────
const getBetrayalColor = (score) => {
  if (score <= 25) return COLORS.success;
  if (score <= 50) return COLORS.warning;
  if (score <= 75) return COLORS.orange;
  return COLORS.danger;
};

const getBetrayalLabel = (score) => {
  if (score <= 25) return 'MUKEMMEL SOZ TUTMA';
  if (score <= 50) return 'IYI PERFORMANS';
  if (score <= 75) return 'DIKKAT GEREKLI';
  return 'ACIL MUDAHALE';
};

const getBetrayalEmoji = (score) => {
  if (score <= 25) return '🏆';
  if (score <= 50) return '👍';
  if (score <= 75) return '⚠️';
  return '🚨';
};

// ─────────────────────────────────────────────────────────────
// DAIRESEL SKOR GÖSTERGE — Çiz
// ─────────────────────────────────────────────────────────────
const drawCircularScore = (doc, x, y, radius, score, color) => {
  const centerX = x + radius;
  const centerY = y + radius;
  const r = radius - 8;
  
  // Arka plan dairesi (açık gri ring)
  doc.save();
  doc.lineWidth(12)
     .strokeColor(COLORS.lightGray)
     .circle(centerX, centerY, r)
     .stroke();
  doc.restore();
  
  // Skor arc — PDFKit'in path API'si ile
  doc.save();
  doc.lineWidth(12)
     .strokeColor(color)
     .lineCap('round');
  
  const startAngle = -90; // tepeden başla (derece)
  const sweepAngle = (score / 100) * 360;
  const steps = Math.max(20, Math.floor(sweepAngle / 3));
  
  let firstPoint = true;
  for (let i = 0; i <= steps; i++) {
    const angle = (startAngle + (sweepAngle * i / steps)) * Math.PI / 180;
    const px = centerX + Math.cos(angle) * r;
    const py = centerY + Math.sin(angle) * r;
    
    if (firstPoint) {
      doc.moveTo(px, py);
      firstPoint = false;
    } else {
      doc.lineTo(px, py);
    }
  }
  doc.stroke();
  doc.restore();
  
  // Ortadaki rakam
  doc.fontSize(44)
     .fillColor(color)
     .font('Bold')
     .text(`${Math.round(score)}`, x, centerY - 26, {
       width: radius * 2,
       align: 'center',
       lineBreak: false,
     });
  
  // /100 etiketi
  doc.fontSize(10)
     .fillColor(COLORS.gray)
     .font('Regular')
     .text('/ 100', x, centerY + 20, {
       width: radius * 2,
       align: 'center',
       lineBreak: false,
     });
};

// ─────────────────────────────────────────────────────────────
// İLERLEME BARI — Çiz
// ─────────────────────────────────────────────────────────────
const drawProgressBar = (doc, x, y, width, height, percent, color, bgColor = COLORS.lightGray) => {
  // Arka plan
  doc.roundedRect(x, y, width, height, height / 2).fill(bgColor);
  
  // İlerleme
  const fillWidth = Math.max(height, (percent / 100) * width);
  if (percent > 0) {
    doc.roundedRect(x, y, fillWidth, height, height / 2).fill(color);
  }
};

// ─────────────────────────────────────────────────────────────
// BAR CHART — Kategori dağılımı
// ─────────────────────────────────────────────────────────────
const drawBarChart = (doc, x, y, width, height, data) => {
  if (!data || data.length === 0) return;
  
  const maxValue = Math.max(...data.map(d => d.value));
  const barAreaWidth = width - 50;
  const barWidth = barAreaWidth / data.length;
  const chartHeight = height - 50;
  
  // Y ekseni çizgisi
  doc.lineWidth(1)
     .strokeColor(COLORS.lightGray)
     .moveTo(x + 35, y)
     .lineTo(x + 35, y + chartHeight)
     .stroke();
  
  // X ekseni çizgisi
  doc.moveTo(x + 35, y + chartHeight)
     .lineTo(x + width - 10, y + chartHeight)
     .stroke();
  
  // Y ekseni etiketleri (max ve 0)
  doc.fontSize(7)
     .fillColor(COLORS.gray)
     .font('Regular')
     .text(`${Math.round(maxValue).toLocaleString('tr-TR')}`, x, y - 3, { 
       width: 32, align: 'right', lineBreak: false 
     });
  doc.text('0', x, y + chartHeight - 4, { 
    width: 32, align: 'right', lineBreak: false 
  });
  
  // Barlar
  const colors = [COLORS.primary, COLORS.secondary, COLORS.accent, 
                  COLORS.success, COLORS.warning, COLORS.orange, COLORS.danger];
  
  data.forEach((item, i) => {
    const barX = x + 40 + (barWidth * i) + 5;
    const actualBarWidth = barWidth - 12;
    const barH = (item.value / maxValue) * (chartHeight - 15);
    const barY = y + chartHeight - barH;
    
    // Bar
    doc.roundedRect(barX, barY, actualBarWidth, barH, 3)
       .fill(colors[i % colors.length]);
    
    // Değer (bar üstünde)
    doc.fontSize(7)
       .fillColor(COLORS.textDark)
       .font('Bold')
       .text(
         `${Math.round(item.value).toLocaleString('tr-TR')}`,
         barX - 8,
         barY - 11,
         { width: actualBarWidth + 16, align: 'center', lineBreak: false }
       );
    
    // Label (bar altında)
    const label = item.label.length > 12 
      ? item.label.slice(0, 10) + '..' 
      : item.label;
    
    doc.fontSize(7)
       .fillColor(COLORS.gray)
       .font('Regular')
       .text(
         label,
         barX - 8,
         y + chartHeight + 6,
         { width: actualBarWidth + 16, align: 'center', lineBreak: false }
       );
  });
};

// ─────────────────────────────────────────────────────────────
// İSTATİSTİK KUTUSU — Mini kart
// ─────────────────────────────────────────────────────────────
const drawStatBox = (doc, x, y, width, height, label, value, color, suffix = '') => {
  // Arka plan
  doc.roundedRect(x, y, width, height, 8).fill(COLORS.bgCard);
  
  // Sol şerit
  doc.rect(x, y, 4, height).fill(color);
  
  // Label
  doc.fontSize(8)
     .fillColor(COLORS.gray)
     .font('Regular')
     .text(label.toUpperCase(), x + 15, y + 10, { width: width - 20 });
  
  // Değer
  doc.fontSize(18)
     .fillColor(color)
     .font('Bold')
     .text(`${value}${suffix}`, x + 15, y + 24, { width: width - 20 });
};

// ─────────────────────────────────────────────────────────────
// ANA PDF ÜRETME
// ─────────────────────────────────────────────────────────────
const generateReportPDF = async (userId, month, year) => {
  // 1. Verileri çek
  const userResult = await pool.query(
    'SELECT name, email FROM users WHERE id = $1',
    [userId]
  );
  const user = userResult.rows[0];

  const reportResult = await pool.query(
    `SELECT * FROM reports
     WHERE user_id = $1 AND month = $2 AND year = $3`,
    [userId, month, year]
  );

  if (reportResult.rows.length === 0) {
    throw new Error('Bu ay için rapor bulunamadı. Önce rapor üret.');
  }

  const report   = reportResult.rows[0];
  const analysis = typeof report.analysis === 'string' 
    ? JSON.parse(report.analysis) 
    : report.analysis;

  // Kategori bazlı harcama verisi (chart için)
  const categoryResult = await pool.query(
    `SELECT category, SUM(amount) AS total
     FROM transactions
     WHERE user_id = $1 
       AND EXTRACT(YEAR FROM date) = $2
       AND EXTRACT(MONTH FROM date) = $3
       AND type = 'debit'
     GROUP BY category
     ORDER BY total DESC
     LIMIT 7`,
    [userId, year, month]
  );
  const categoryData = categoryResult.rows.map(r => ({
    label: r.category || 'Diğer',
    value: parseFloat(r.total),
  }));

  // Toplam harcama
  const totalSpent = categoryData.reduce((s, c) => s + c.value, 0);

  // Önceki ay karşılaştırması
  const prevMonth = month === 1 ? 12 : month - 1;
  const prevYear  = month === 1 ? year - 1 : year;
  const prevReportResult = await pool.query(
    `SELECT betrayal_score FROM reports 
     WHERE user_id = $1 AND month = $2 AND year = $3`,
    [userId, prevMonth, prevYear]
  );
  const prevScore = prevReportResult.rows[0]?.betrayal_score 
    ? parseFloat(prevReportResult.rows[0].betrayal_score) 
    : null;

  // 2. PDF oluştur
  const doc = new PDFDocument({
  size: 'A4',
  margin: 0,
  bufferPages: true,  // ← Footer için kritik
  info: {
    Title:   `Finans Aynasi - ${MONTHS[month]} ${year} Raporu`,
    Author:  'Finans Aynasi',
    Subject: 'Aylik Soz Tutma Raporu',
  },
});
  loadFonts(doc);

  const buffers = [];
  doc.on('data', buffers.push.bind(buffers));

  const pageWidth  = doc.page.width;
  const pageHeight = doc.page.height;
  const score      = parseFloat(report.betrayal_score);
  const scoreColor = getBetrayalColor(score);
  const promiseScore = 100 - score; // Söz tutma skoru

  // ═══════════════════════════════════════════════════════════
  // SAYFA 1 — KAPAK + SKOR
  // ═══════════════════════════════════════════════════════════

  // HEADER — Gradient mor + dekoratif daireler
  doc.rect(0, 0, pageWidth, 180).fill(COLORS.primary);
  
  // Dekoratif daireler (sağ üst)
  doc.fillOpacity(0.15)
     .circle(pageWidth - 60, 50, 80).fill(COLORS.white);
  doc.fillOpacity(0.1)
     .circle(pageWidth - 30, 150, 50).fill(COLORS.white);
  doc.fillOpacity(0.08)
     .circle(50, 160, 40).fill(COLORS.white);
  doc.fillOpacity(1);

  // Logo benzeri kare
  doc.roundedRect(40, 35, 36, 36, 8).fill(COLORS.white);
  doc.fontSize(22)
     .fillColor(COLORS.primary)
     .font('Bold')
     .text('FA', 40, 43, { width: 36, align: 'center' });

  // Başlık
  doc.fontSize(26)
     .fillColor(COLORS.white)
     .font('Bold')
     .text('FİNANS AYNASI', 90, 38);

  doc.fontSize(13)
     .font('Regular')
     .fillColor('#e0e7ff')
     .text('Aylık Söz Tutma & Davranış Raporu', 90, 70);

  // Üst bilgi şeridi
  doc.roundedRect(40, 105, pageWidth - 80, 50, 8).fill('#4f46e5');
  
  doc.fontSize(10)
     .fillColor('#c7d2fe')
     .font('Regular')
     .text('RAPOR DÖNEMİ', 60, 118);
  doc.fontSize(15)
     .fillColor(COLORS.white)
     .font('Bold')
     .text(`${MONTHS[month]} ${year}`, 60, 132);

  doc.fontSize(10)
     .fillColor('#c7d2fe')
     .font('Regular')
     .text('KULLANICI', 250, 118);
  doc.fontSize(15)
     .fillColor(COLORS.white)
     .font('Bold')
     .text(user.name, 250, 132);

  doc.fontSize(10)
     .fillColor('#c7d2fe')
     .font('Regular')
     .text('TARİH', 430, 118);
  doc.fontSize(15)
     .fillColor(COLORS.white)
     .font('Bold')
     .text(new Date().toLocaleDateString('tr-TR'), 430, 132);

  let y = 210;

  // ─────────────────────────────────────────────
  // DAIRESEL SKOR + DURUMU
  // ─────────────────────────────────────────────
  
  // Sol: Dairesel gösterge
  drawCircularScore(doc, 50, y, 75, score, scoreColor);

  // Sağ: Açıklama
  doc.fontSize(10)
     .fillColor(COLORS.gray)
     .font('Regular')
     .text('ALDATMA KATSAYISI', 230, y + 10);

  doc.fontSize(20)
     .fillColor(scoreColor)
     .font('Bold')
     .text(getBetrayalLabel(score), 230, y + 28);

  // Trend (geçen aya göre)
  if (prevScore !== null) {
    const diff = score - prevScore;
    const trendColor = diff > 0 ? COLORS.danger : COLORS.success;
    const arrow = diff > 0 ? '▲' : (diff < 0 ? '▼' : '●');
    
    doc.fontSize(10)
       .fillColor(COLORS.gray)
       .font('Regular')
       .text('Geçen aya göre:', 230, y + 68);
    
    doc.fontSize(13)
       .fillColor(trendColor)
       .font('Bold')
       .text(
         `${arrow} ${Math.abs(diff).toFixed(0)} puan ${diff > 0 ? 'kötüye gidiş' : 'iyileşme'}`,
         320, y + 66
       );
  }

  // Söz tutma yüzdesi
  doc.fontSize(10)
     .fillColor(COLORS.gray)
     .font('Regular')
     .text('Söz Tutma Başarın', 230, y + 92);
  
  drawProgressBar(doc, 230, y + 108, 280, 10, promiseScore, COLORS.success);
  
  doc.fontSize(11)
     .fillColor(COLORS.success)
     .font('Bold')
     .text(`%${Math.round(promiseScore)}`, 520, y + 105);

  y += 180;

  // ─────────────────────────────────────────────
  // İSTATİSTİK KUTULARI — 4 kart yan yana
  // ─────────────────────────────────────────────
  const successCount = (analysis.intention_results || [])
    .filter(ir => ir.status === 'success').length;
  const failedCount = (analysis.intention_results || [])
    .filter(ir => ir.status === 'failed').length;
  const partialCount = (analysis.intention_results || [])
    .filter(ir => ir.status === 'partial').length;
  
  const boxWidth = (pageWidth - 100) / 4;
  
  drawStatBox(doc, 40, y, boxWidth - 5, 65, 
    'Toplam Söz', 
    (analysis.intention_results || []).length, 
    COLORS.primary);
  
  drawStatBox(doc, 40 + boxWidth, y, boxWidth - 5, 65,
    'Başarılı',
    successCount,
    COLORS.success);
  
  drawStatBox(doc, 40 + boxWidth * 2, y, boxWidth - 5, 65,
    'Kısmen',
    partialCount,
    COLORS.warning);
  
  drawStatBox(doc, 40 + boxWidth * 3, y, boxWidth - 5, 65,
    'Başarısız',
    failedCount,
    COLORS.danger);

  y += 90;

  // ─────────────────────────────────────────────
  // GENEL DEĞERLENDİRME KUTUSU
  // ─────────────────────────────────────────────
  doc.fontSize(13)
     .fillColor(COLORS.textDark)
     .font('Bold')
     .text('GENEL DEĞERLENDİRME', 40, y);

  y += 22;

  doc.roundedRect(40, y, pageWidth - 80, 80, 8).fill(COLORS.bgLight);
  doc.rect(40, y, 4, 80).fill(COLORS.primary);
  
  doc.fontSize(10)
     .fillColor(COLORS.textMid)
     .font('Regular')
     .text(analysis.summary || 'Özet bilgisi yok.', 55, y + 12, {
       width: pageWidth - 110,
       align: 'justify',
       lineGap: 4,
     });

  y += 100;

  // ─────────────────────────────────────────────
// KATEGORİ BAR CHART — Her zaman yeni sayfada
// ─────────────────────────────────────────────
if (categoryData.length > 0) {
  if (y > 580) {
    doc.addPage();
    y = 50;
  }

  doc.fontSize(13)
     .fillColor(COLORS.textDark)
     .font('Bold')
     .text('KATEGORI BAZLI HARCAMA', 40, y);
  
  doc.fontSize(9)
     .fillColor(COLORS.gray)
     .font('Regular')
     .text(`Toplam: ${Math.round(totalSpent).toLocaleString('tr-TR')} TL`, 40, y + 18);

  y += 38;
  
  doc.roundedRect(40, y, pageWidth - 80, 170, 8).fill(COLORS.bgLight);
  drawBarChart(doc, 50, y + 15, pageWidth - 100, 150, categoryData);
  
  y += 185;
}

  // ═══════════════════════════════════════════════════════════
  // SAYFA 2 — SÖZLER DETAYI
  // ═══════════════════════════════════════════════════════════
  doc.addPage();
  y = 50;

  doc.fontSize(18)
     .fillColor(COLORS.primary)
     .font('Bold')
     .text('VERİLEN SÖZLER & PERFORMANS', 40, y);

  doc.lineWidth(2)
     .strokeColor(COLORS.primary)
     .moveTo(40, y + 28)
     .lineTo(280, y + 28)
     .stroke();

  y += 50;

  // Sözler listesi — Daha güzel kartlar
  if (analysis.intention_results && analysis.intention_results.length > 0) {
    for (const ir of analysis.intention_results) {
      if (y > 720) {
        doc.addPage();
        y = 50;
      }

      const statusColor = 
        ir.status === 'success' ? COLORS.success :
        ir.status === 'partial' ? COLORS.warning : COLORS.danger;

      const statusBgColor = 
        ir.status === 'success' ? COLORS.successLight :
        ir.status === 'partial' ? COLORS.warningLight : COLORS.dangerLight;

      const statusText = 
        ir.status === 'success' ? '✓ BAŞARILI' :
        ir.status === 'partial' ? '◐ KISMEN'   : '✗ BAŞARISIZ';

      // Ana kart
      const cardHeight = ir.analysis ? 115 : 85;
      doc.roundedRect(40, y, pageWidth - 80, cardHeight, 10).fill(COLORS.bgLight);
      
      // Sol şerit
      doc.rect(40, y, 5, cardHeight).fill(statusColor);

      // Status etiketi (sağ üst)
      doc.roundedRect(pageWidth - 130, y + 12, 85, 22, 11).fill(statusBgColor);
      doc.fontSize(8)
         .fillColor(statusColor)
         .font('Bold')
         .text(statusText, pageWidth - 130, y + 19, { width: 85, align: 'center' });

      // Söz başlığı
      doc.fontSize(12)
         .fillColor(COLORS.textDark)
         .font('Bold')
         .text(ir.description || ir.goal_type, 60, y + 15, { width: 350 });

      // Hedef / Gerçek
      if (ir.target_value !== null) {
        const targetStr = Number(ir.target_value).toLocaleString('tr-TR');
        const actualStr = Number(ir.actual_value || 0).toLocaleString('tr-TR');
        
        doc.fontSize(9)
           .fillColor(COLORS.gray)
           .font('Regular')
           .text('HEDEF', 60, y + 42);
        doc.fontSize(11)
           .fillColor(COLORS.textDark)
           .font('Bold')
           .text(`${targetStr} TL`, 60, y + 53);

        doc.fontSize(9)
           .fillColor(COLORS.gray)
           .font('Regular')
           .text('GERÇEK', 180, y + 42);
        doc.fontSize(11)
           .fillColor(statusColor)
           .font('Bold')
           .text(`${actualStr} TL`, 180, y + 53);

        if (ir.achievement_pct !== null) {
          doc.fontSize(9)
             .fillColor(COLORS.gray)
             .font('Regular')
             .text('BAŞARI', 320, y + 42);
          doc.fontSize(11)
             .fillColor(statusColor)
             .font('Bold')
             .text(`%${Math.round(ir.achievement_pct)}`, 320, y + 53);
        }

        // İlerleme barı
        const pct = Math.min(100, ir.achievement_pct || 0);
        drawProgressBar(doc, 410, y + 50, 130, 8, pct, statusColor);
      }

      // Analiz metni
      if (ir.analysis) {
        doc.fontSize(9)
           .fillColor(COLORS.textMid)
           .font('Regular')
           .text(ir.analysis, 60, y + 78, { 
             width: pageWidth - 130, 
             height: 30,
             ellipsis: true,
           });
      }

      y += cardHeight + 12;
    }
  } else {
    doc.fontSize(10)
       .fillColor(COLORS.gray)
       .font('Regular')
       .text('Bu ay için söz bilgisi yok.', 40, y);
    y += 30;
  }

  // ═══════════════════════════════════════════════════════════
  // KRİTİK GÜNLER + PATERN + ÖNERİ
  // ═══════════════════════════════════════════════════════════
  if (analysis.betrayal_days && analysis.betrayal_days.length > 0) {
    if (y > 600) {
      doc.addPage();
      y = 50;
    }

    y += 10;
    doc.fontSize(15)
       .fillColor(COLORS.danger)
       .font('Bold')
       .text('🚨 KRİTİK GÜNLER', 40, y);

    y += 30;

    for (const bd of analysis.betrayal_days.slice(0, 4)) {
      if (y > 720) {
        doc.addPage();
        y = 50;
      }

      // Mini kart
      doc.roundedRect(40, y, pageWidth - 80, 55, 8).fill(COLORS.dangerLight);
      
      // Tarih çemberi (sol)
      doc.circle(70, y + 27, 22).fill(COLORS.danger);
      
      // Gün numarası
      const dayNum = bd.date ? bd.date.split('-')[2] : '?';
      doc.fontSize(14)
         .fillColor(COLORS.white)
         .font('Bold')
         .text(dayNum, 55, y + 19, { width: 30, align: 'center' });

      // Tarih + gün adı
      doc.fontSize(11)
         .fillColor(COLORS.textDark)
         .font('Bold')
         .text(`${bd.date} • ${bd.day_name}`, 105, y + 12);

      // Harcama tutarı
      doc.fontSize(13)
         .fillColor(COLORS.danger)
         .font('Bold')
         .text(`${Number(bd.total_spent).toLocaleString('tr-TR')} TL`, 105, y + 28);

      // Not
      if (bd.note) {
        doc.fontSize(8)
           .fillColor(COLORS.textMid)
           .font('Regular')
           .text(bd.note, 230, y + 18, { width: 310, height: 30, ellipsis: true });
      }

      y += 65;
    }
  }

  // PATERN
  if (analysis.pattern) {
    if (y > 600) {
      doc.addPage();
      y = 50;
    }

    y += 15;
    doc.fontSize(15)
       .fillColor(COLORS.secondary)
       .font('Bold')
       .text('🔍 TESPİT EDİLEN PATERN', 40, y);

    y += 28;
    
    doc.roundedRect(40, y, pageWidth - 80, 60, 8).fill('#f5f3ff');
    doc.rect(40, y, 4, 60).fill(COLORS.secondary);
    
    doc.fontSize(10)
       .fillColor(COLORS.textDark)
       .font('Regular')
       .text(analysis.pattern, 55, y + 12, { 
         width: pageWidth - 110, 
         lineGap: 4,
       });

    y += 75;
  }

  // ÖNERİ — En vurgulu
  if (analysis.single_change) {
    if (y > 600) {
      doc.addPage();
      y = 50;
    }

    y += 15;

    // Gradient benzeri arka plan
    doc.roundedRect(40, y, pageWidth - 80, 130, 12).fill(COLORS.primary);
    
    // Dekoratif daire
    doc.fillOpacity(0.15)
       .circle(pageWidth - 80, y + 30, 50).fill(COLORS.white);
    doc.fillOpacity(1);
    
    doc.fontSize(11)
       .fillColor('#c7d2fe')
       .font('Bold')
       .text('💡 TEK DEĞİŞİKLİK ÖNERİSİ', 60, y + 18);

    doc.fontSize(14)
       .fillColor(COLORS.white)
       .font('Bold')
       .text('Bu ay sadece şunu değiştir:', 60, y + 38);
    
    doc.fontSize(11)
       .fillColor('#e0e7ff')
       .font('Regular')
       .text(analysis.single_change, 60, y + 65, { 
         width: pageWidth - 120, 
         lineGap: 4,
       });

    y += 145;
  }

  // ═══════════════════════════════════════════════════════════
  // FOOTER — Her sayfaya uygulanmıyor, sadece son sayfaya
  // ═══════════════════════════════════════════════════════════
  const range = doc.bufferedPageRange();
const totalPages = range.count;

for (let i = 0; i < totalPages; i++) {
  doc.switchToPage(range.start + i);
  
  const footerY = pageHeight - 40;
  doc.rect(0, footerY, pageWidth, 40).fill(COLORS.primary);
  
  doc.fontSize(8)
     .fillColor('#c7d2fe')
     .font('Regular')
     .text(
       `Sayfa ${i + 1} / ${totalPages}  •  ${new Date().toLocaleString('tr-TR')}`,
       40, footerY + 14,
       { lineBreak: false }
     );
  
  doc.fontSize(8)
     .fillColor(COLORS.white)
     .font('Bold')
     .text(
       'FİNANS AYNASI © 2026  •  BTK Akademi Hackathon',
       0, footerY + 14,
       { width: pageWidth - 40, align: 'right', lineBreak: false }
     );
}

  doc.end();

  return new Promise((resolve, reject) => {
    doc.on('end', () => resolve(Buffer.concat(buffers)));
    doc.on('error', reject);
  });
};

module.exports = { generateReportPDF };