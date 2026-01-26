# 📊 Dashboard Reform & Otonom Sistem Revizyon Planı

Bu plan, Admin Panel'in ana sayfasını modern bir "Data Dashboard" görünümüne kavuşturmayı ve otonom sistemdeki teknik aksaklıkları gidermeyi amaçlar.

## 🎯 Hedefler

1. **Dashboard Temizliği:** "Görev Planla" ve "Manuel Tetikle" butonlarının ana sayfadan kaldırılması (Bu işlevler Agent Ayarları sayfasında zaten mevcut).
2. **Otonom Durum Paneli:**
   - Agent AKTİF ise: "BİR SONRAKİ TARAMA: [DİNAMİK GERİ SAYIM]" şeklinde canlı sayaç.
   - Agent PASİF ise: "OTONOM SİSTEM KAPALI" uyarısı (Neon Kırmızı/Koyu stil).
3. **Grafiksel İstatistikler:** Kategori dağılımı ve Agent performansını tek bir "Donut" veya "Stacked Bar" grafiğinde (`Recharts` veya `Google Charts`) estetik şekilde birleştirmek.
4. **Otonom Tetikleme Tamiri:** Ayarlanan `intervalHours` değerinin neden otomatik olarak yeni bir `BullMQ` job'ı yaratmadığının tespiti ve onarımı.

## 🧱 Mimari Bileşenler

### 1. UI: Dashboard Ana Sayfa (`src/app/admin/page.tsx`)

- Buton gruplarının kaldırılması.
- Yeni `AutonomousStatus` bileşeninin entegrasyonu.
- `StatsChart` bileşeninin (Recharts kütüphanesi önerilir; Next.js ile çok daha stabil çalışır) eklenmesi.

### 2. Logic: Agent Scheduling (`src/lib/queue.ts` & `src/workers/news-agent.worker.ts`)

- `scheduleNewsAgentJob` fonksiyonunun kontrolü.
- Job ID çakışmalarının veya `repeat` parametrelerinin denetimi.

## 🛠️ Uygulama Adımları

### 🔍 Aşama 1: Debug (Otonom Sorunu)

- `@[debugger]` ile logların ve kuyruk yapısının incelenmesi.
- `intervalHours` değişiminin anında kuyruğu güncellediğinden emin olunması.

### 🏗️ Aşama 2: UI Reform (Implementation)

- `@[frontend-specialist]` ile butonların temizlenmesi.
- Grafik kütüphanesinin (Recharts seçildi - hafif ve premium) entegre edilmesi.
- "Otonom Durum" göstergesinin tasarımı.

### 🧪 Aşama 3: Doğrulama (Testing)

- Sayaç sıfıra ulaştığında Agent'ın gerçekten tetiklenip tetiklenmediğinin testi.
- Mobil görünüm kontrolü.

---

## 🚦 Onay Bekleniyor

Bu kapsamlı reform planını onaylıyor musunuz Erkan Bey? (Y/N)
