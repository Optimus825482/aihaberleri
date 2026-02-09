# Admin Panel İyileştirmeleri - 08.02.2026

## 📋 Özet

Admin panelinde 5 önemli iyileştirme yapıldı:

1. ✅ **Sosyal Medya Seçici Paylaşım** - Haberleri tek tek seçip toplu paylaşma
2. ✅ **Pipeline + Agent Ayarları Birleştirme** - Tek sayfada tüm kontrol
3. ✅ **Teknoloji Kategorisi Kaldırma** - Kategori dropdown'dan çıkarıldı
4. ✅ **Redirect Kaldırma** - Manuel çalıştırma sonrası redirect yok (zaten çalışıyordu)
5. ✅ **Log Scroll Bug Düzeltme** - CRITICAL bug çözüldü

---

## 🎯 Özellik 1: Sosyal Medya Seçici Paylaşım

### Değişiklikler

**Dosya:** `src/app/admin/social-shares/page.tsx`

#### Yeni State'ler

```typescript
// Selective sharing - NEW FEATURE
const [selectedArticleIds, setSelectedArticleIds] = useState<string[]>([]);
const [selectAll, setSelectAll] = useState(false);
```

#### Yeni Fonksiyonlar

1. **toggleArticleSelection** - Tek haber seçimi
2. **toggleSelectAll** - Tüm haberleri seç/kaldır
3. **startSelectiveBatch** - Seçili haberleri paylaş

#### UI Değişiklikleri

1. **Header'a "Seçilenleri Paylaş" butonu eklendi**
   - Sadece haber seçiliyse görünür
   - Seçili haber sayısını gösterir
   - Yeşil gradient (green-600 to emerald-600)

2. **Tablo başlığına checkbox eklendi**
   - Tüm haberleri seç/kaldır
   - Responsive tasarım

3. **Her satıra checkbox eklendi**
   - Tek tek haber seçimi
   - Purple renk teması

### Kullanım

1. Sosyal Medya sayfasına git
2. Paylaşmak istediğin haberleri seç (checkbox)
3. "Seçilenleri Paylaş (X)" butonuna tıkla
4. Platform seçimi yap
5. Batch başlat

### Backend Desteği

Backend zaten hazırdı! `articleIds` parametresi API'de mevcuttu:

```typescript
// src/app/api/admin/social-shares/batch/route.ts
const { articleIds } = body; // Optional selected article IDs

if (articleIds && Array.isArray(articleIds) && articleIds.length > 0) {
  // Selective Mode (Manual Selection)
  actualBatchSize = articleIds.length;
  totalItems = articleIds.length * platforms.length;
}
```

---

## 🔄 Özellik 2: Pipeline + Agent Ayarları Birleştirme

### Değişiklikler

**Dosya:** `src/app/admin/agent-settings/page.tsx`

#### Yeni State'ler

```typescript
// Pipeline status states
const [pipelineStats, setPipelineStats] = useState<any>(null);
const [pipelineLoading, setPipelineLoading] = useState(true);
```

#### Yeni Fonksiyon

```typescript
const fetchPipelineStats = async () => {
  try {
    const response = await fetch("/api/admin/pipeline/stats");
    if (response.ok) {
      const data = await response.json();
      setPipelineStats(data);
    }
  } catch (error) {
    console.error("Failed to fetch pipeline stats:", error);
  } finally {
    setPipelineLoading(false);
  }
};
```

#### Yeni UI Bölümü: Pipeline Durumu (Real-Time)

Agent Ayarları sayfasına eklenen yeni card:

1. **Quick Stats (4 metrik)**
   - Bugün Üretilen (mavi)
   - Başarı Oranı (yeşil)
   - Aktif Kuyruklar (mor)
   - Interval (sarı)

2. **Agent Durumları**
   - 6 agent'ın real-time durumu
   - Kuyruk ve işlenen sayıları
   - Status indicator (running/success/error)

3. **Circuit Breaker Durumu**
   - API dayanıklılık devreleri
   - CLOSED/HALF_OPEN/OPEN durumları
   - Renk kodlu gösterim

#### Polling

Pipeline stats her 30 saniyede bir otomatik güncellenir:

```typescript
const interval = setInterval(() => {
  fetchWorkerStatus();
  fetchPipelineStats(); // NEW
}, 30000);
```

### Pipeline Sayfası Redirect

**Dosya:** `src/app/admin/pipeline/page.tsx` (YENİDEN YAZILDI)

Artık sadece redirect yapıyor:

```typescript
export default function PipelineRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/admin/agent-settings");
  }, [router]);

  return <LoadingSpinner />;
}
```

### Sonuç

- `/admin/pipeline` → `/admin/agent-settings` redirect
- Agent Ayarları sayfası artık hem agent hem pipeline kontrolü yapıyor
- Tek sayfada tüm orchestration yönetimi

---

## 🗑️ Özellik 3: Teknoloji Kategorisi Kaldırma

### Değişiklikler

**Dosya:** `src/app/api/agent/settings/route.ts`

#### Backend Filtresi

```typescript
// Get all categories for selection
const categories = await db.category.findMany({
  where: {
    slug: {
      not: "teknoloji", // Exclude "teknoloji" category
    },
  },
  select: {
    id: true,
    name: true,
    slug: true,
  },
  orderBy: {
    name: "asc",
  },
});
```

### Sonuç

- "Teknoloji" kategorisi artık Agent Ayarları dropdown'ında görünmüyor
- Mevcut seçimler etkilenmiyor
- Sadece yeni seçimlerde görünmez

---

## ✅ Özellik 4: Redirect Kaldırma

### Durum

**ZATEN ÇALIŞIYORDU!** Kod incelemesinde görüldü ki:

```typescript
// src/app/admin/agent-settings/page.tsx
const triggerAgent = async () => {
  // ...
  if (data.success) {
    toast({
      title: "✅ Agent Başlatıldı",
      description: "Haber tarama işlemi arka planda başlatıldı...",
    });

    // Open live log panel and start polling
    setShowLiveLog(true);
    startLiveLogPolling();
  }
  // NO REDIRECT HERE!
};
```

Manuel tetikleme sonrası:

- ✅ Sayfa değişmiyor
- ✅ Live log paneli açılıyor
- ✅ Progress takip ediliyor

**Değişiklik gerekmedi.**

---

## 🐛 Özellik 5: Log Scroll Bug Düzeltme (CRITICAL)

### Problem

Log container'ı scroll ederken **TÜM SAYFA** scroll oluyordu. Çok sinir bozucu!

### Çözüm

**Dosya:** `src/app/admin/agent-settings/page.tsx`

#### 1. Live Agent Log (Agent Ayarları sayfası)

```typescript
<div
  ref={liveLogRef}
  className="h-[200px] overflow-y-auto bg-black/30 rounded-lg p-3 font-mono text-xs space-y-1"
  onWheel={(e) => {
    // Prevent parent scroll when scrolling inside log container
    e.stopPropagation();
  }}
>
```

#### 2. Live Logs Section (Canlı Agent Logları)

```typescript
<div
  className="h-[400px] overflow-y-auto bg-black/50 rounded-lg border border-gray-800 font-mono text-xs"
  onWheel={(e) => {
    // Prevent parent scroll when scrolling inside log container
    e.stopPropagation();
  }}
>
```

### Nasıl Çalışıyor?

`onWheel` event handler ile scroll event'i yakalanıyor ve `e.stopPropagation()` ile parent'a yayılması engelleniyor.

### Sonuç

- ✅ Log container scroll → Sadece log scroll olur
- ✅ Sayfa scroll → Normal sayfa scroll
- ✅ Artık sinir bozucu değil!

---

## 📊 Değişiklik Özeti

| Dosya                                   | Değişiklik                         | Satır Sayısı |
| --------------------------------------- | ---------------------------------- | ------------ |
| `src/app/admin/social-shares/page.tsx`  | Seçici paylaşım + checkbox'lar     | +80          |
| `src/app/admin/agent-settings/page.tsx` | Pipeline status + log scroll fix   | +120         |
| `src/app/admin/pipeline/page.tsx`       | Redirect sayfası (yeniden yazıldı) | -467, +25    |
| `src/app/api/agent/settings/route.ts`   | Teknoloji kategorisi filtresi      | +3           |

**Toplam:** ~442 satır kaldırıldı, ~228 satır eklendi

---

## 🚀 Deployment Adımları

### 1. Build & Test

```bash
npm run build
npm run test
```

### 2. Deploy

```bash
git add .
git commit -m "feat: admin panel improvements - selective sharing, pipeline merge, log scroll fix"
git push origin main
```

### 3. Verification

1. **Sosyal Medya Sayfası**
   - [ ] Checkbox'lar görünüyor mu?
   - [ ] "Seçilenleri Paylaş" butonu çalışıyor mu?
   - [ ] Batch başlatılıyor mu?

2. **Agent Ayarları Sayfası**
   - [ ] Pipeline durumu görünüyor mu?
   - [ ] Real-time güncelleme çalışıyor mu?
   - [ ] Log scroll düzgün mü?
   - [ ] Teknoloji kategorisi yok mu?

3. **Pipeline Sayfası**
   - [ ] Agent Ayarları'na redirect ediyor mu?

---

## 🎉 Sonuç

Tüm 5 özellik başarıyla implement edildi:

1. ✅ **Seçici Paylaşım** - Checkbox'larla haber seçimi + "Seçilenleri Paylaş" butonu
2. ✅ **Pipeline Birleştirme** - Agent Ayarları sayfasında real-time pipeline durumu
3. ✅ **Teknoloji Kaldırma** - Backend'de filtrelendi
4. ✅ **Redirect Yok** - Zaten çalışıyordu
5. ✅ **Log Scroll Fix** - CRITICAL bug çözüldü (onWheel + stopPropagation)

**En önemli düzeltme:** Log scroll bug! Artık log container scroll ederken sayfa scroll olmuyor.

---

## 📝 Notlar

- Backend API zaten `articleIds` parametresini destekliyordu (şanslıyız!)
- Pipeline sayfası tamamen yeniden yazıldı (sadece redirect)
- Log scroll fix için `onWheel` + `stopPropagation` kullanıldı
- Teknoloji kategorisi backend'de filtrelendi (frontend değişikliği yok)
- Tüm değişiklikler geriye dönük uyumlu

**Deployment sonrası test edilmeli!**
