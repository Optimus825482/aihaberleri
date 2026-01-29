# Admin Panel - Yeni Sayfalar

Bu dokümantasyon, admin paneline eklenen 4 yeni sayfa hakkında bilgi içerir.

## 📦 Eklenen Sayfalar

### 1. 📨 Mesajlar Sayfası (`/admin/messages`)

İletişim formundan gelen mesajları yönetme sayfası.

**Özellikler:**

- Mesaj listesi (okunmuş/okunmamış filtreleme)
- Mesaj detayları görüntüleme
- Okundu/okunmadı işaretleme
- Mesaj silme
- İstatistikler (toplam, okunmamış, okunmuş)
- Real-time güncelleme

**API Endpoints:**

- `GET /api/admin/messages?filter=all|unread|read` - Mesajları listele
- `PATCH /api/admin/messages` - Mesaj durumunu güncelle
- `DELETE /api/admin/messages?id={id}` - Mesaj sil

### 2. ⚙️ Ayarlar Sayfası (`/admin/settings`)

Site genel ayarları, SEO, email ve sosyal medya yönetimi.

**Özellikler:**

- Genel ayarlar (site adı, açıklama, URL, dil)
- SEO ayarları (meta başlık, açıklama, keywords, OG image)
- Email ayarları (SMTP konfigürasyonu)
- Sosyal medya bağlantıları (Facebook, Twitter, Instagram, LinkedIn, YouTube)
- Otomatik kaydetme (blur event)

**API Endpoints:**

- `GET /api/admin/settings` - Tüm ayarları getir
- `POST /api/admin/settings` - Ayar kaydet/güncelle
- `PATCH /api/admin/settings` - Sosyal medya güncelle

### 3. 🏷️ Kategoriler Sayfası (`/admin/categories`)

Haber kategorilerini yönetme sayfası.

**Özellikler:**

- Kategori listesi (CRUD)
- Kategori ekleme/düzenleme/silme
- Otomatik slug oluşturma (Türkçe karakter desteği)
- Kategori sıralaması
- Her kategorideki haber sayısı
- İstatistikler (toplam kategori, toplam haber, ortalama haber)

**API Endpoints:**

- `GET /api/admin/categories` - Kategorileri listele
- `POST /api/admin/categories` - Yeni kategori ekle
- `PATCH /api/admin/categories` - Kategori güncelle
- `DELETE /api/admin/categories?id={id}` - Kategori sil

### 4. 👥 Anlık Ziyaretçiler Sayfası (`/admin/visitors`)

IP bazlı anlık ziyaretçi takibi ve GeoIP konum bilgisi.

**Özellikler:**

- Son 5 dakikadaki aktif ziyaretçiler
- GeoIP ile konum tespiti (ülke, şehir, bayrak emoji)
- Hangi sayfada olduğu bilgisi
- User agent analizi (cihaz tipi, tarayıcı)
- Son aktivite zamanı
- Ülke dağılımı
- Real-time güncelleme (10 saniyede bir)
- İstatistikler (aktif, toplam, farklı ülke sayısı)

**API Endpoints:**

- `GET /api/admin/visitors` - Aktif ziyaretçileri listele
- `POST /api/admin/visitors` - Ziyaretçi kaydı oluştur/güncelle
- `DELETE /api/admin/visitors` - Eski ziyaretçileri temizle

## 🗄️ Veritabanı Değişiklikleri

### Yeni Modeller

#### Visitor Model

```prisma
model Visitor {
  id           String   @id @default(cuid())
  ipAddress    String
  userAgent    String?
  currentPage  String
  country      String?
  countryCode  String?
  city         String?
  region       String?
  lastActivity DateTime @default(now())
  createdAt    DateTime @default(now())

  @@index([ipAddress])
  @@index([lastActivity])
  @@index([createdAt])
}
```

**Not:** `ContactMessage` modeli zaten mevcut, değişiklik yapılmadı.

## 🚀 Kurulum

### 1. Prisma Migration

```bash
# Migration oluştur
npx prisma migrate dev --name add_visitor_model

# Prisma Client'ı güncelle
npx prisma generate
```

### 2. Veritabanını Güncelle

```bash
# Migration'ı uygula
npx prisma db push
```

### 3. Development Server'ı Başlat

```bash
npm run dev
```

## 📱 Kullanım

### Admin Paneli Menüsü

Yeni sayfalar admin paneli sol menüsüne otomatik olarak eklendi:

1. **Dashboard** - `/admin`
2. **Haberler** - `/admin/articles`
3. **Kategoriler** - `/admin/categories` ✨ YENİ
4. **Mesajlar** - `/admin/messages` ✨ YENİ
5. **Newsletter Aboneleri** - `/admin/newsletter`
6. **Push Mesajları** - `/admin/notifications`
7. **Anlık Ziyaretçiler** - `/admin/visitors` ✨ YENİ
8. **Ayarlar** - `/admin/settings` ✨ YENİ
9. **Agent Ayarları** - `/admin/agent-settings`

### Ziyaretçi Takibi Entegrasyonu

Client-side'da ziyaretçi takibi için:

```typescript
// pages/_app.tsx veya layout.tsx
useEffect(() => {
  const trackVisitor = async () => {
    try {
      await fetch("/api/admin/visitors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ipAddress: "CLIENT_IP", // Server-side'dan alınmalı
          userAgent: navigator.userAgent,
          currentPage: window.location.pathname,
        }),
      });
    } catch (error) {
      console.error("Visitor tracking failed:", error);
    }
  };

  trackVisitor();

  // Her sayfa değişiminde güncelle
  const interval = setInterval(trackVisitor, 30000); // 30 saniyede bir

  return () => clearInterval(interval);
}, []);
```

### Eski Ziyaretçileri Temizleme (Cron Job)

```typescript
// Örnek: Vercel Cron Job
// api/cron/cleanup-visitors.ts
export default async function handler(req: Request) {
  if (
    req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return new Response("Unauthorized", { status: 401 });
  }

  const response = await fetch(
    `${process.env.NEXT_PUBLIC_URL}/api/admin/visitors`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${process.env.ADMIN_API_KEY}`,
      },
    },
  );

  return response;
}
```

## 🎨 UI/UX Özellikleri

### Tasarım Dili

- **Modern & Minimal:** Google Analytics benzeri temiz tasarım
- **Dark Mode:** Otomatik tema desteği
- **Responsive:** Mobil, tablet ve desktop uyumlu
- **Animasyonlar:** Smooth transitions ve hover effects
- **Loading States:** Skeleton loaders ve spinners
- **Error Handling:** User-friendly hata mesajları

### Renk Paleti

- **Primary:** Mavi tonları (dashboard, buttons)
- **Success:** Yeşil (aktif durumlar, başarılı işlemler)
- **Warning:** Turuncu (okunmamış mesajlar, uyarılar)
- **Danger:** Kırmızı (silme işlemleri, hatalar)
- **Muted:** Gri tonları (secondary text, borders)

## 🔒 Güvenlik

### Authentication

Tüm admin sayfaları ve API endpoint'leri `auth()` middleware ile korunmaktadır:

```typescript
const session = await auth();
if (!session) {
  return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
}
```

### Rate Limiting

GeoIP API için rate limiting uygulanmıştır:

- **ip-api.com:** 45 request/minute (ücretsiz)
- **Cache:** 24 saat TTL ile in-memory cache

### Data Validation

- Tüm form input'ları client-side ve server-side validate edilir
- SQL Injection koruması (Prisma ORM)
- XSS koruması (React otomatik escape)

## 📊 Performans

### Optimizasyonlar

- **Lazy Loading:** Component'ler gerektiğinde yüklenir
- **Memoization:** Gereksiz re-render'lar önlenir
- **Debouncing:** Search ve filter işlemleri debounce edilir
- **Pagination:** Büyük listeler sayfalanır
- **Caching:** GeoIP sonuçları cache'lenir

### Real-time Updates

- **Polling:** 10 saniyede bir otomatik güncelleme (visitors)
- **Optimistic UI:** Kullanıcı aksiyonları anında yansıtılır
- **Error Recovery:** Network hataları gracefully handle edilir

## 🐛 Troubleshooting

### Migration Hataları

```bash
# Migration sıfırlama (dikkatli kullanın!)
npx prisma migrate reset

# Migration durumunu kontrol et
npx prisma migrate status
```

### GeoIP Çalışmıyor

- `ip-api.com` rate limit'e takılmış olabilir (45 req/min)
- Localhost'ta test ediyorsanız, mock data kullanılır
- Production'da Cloudflare/Vercel IP headers'ları kontrol edin

### Ziyaretçiler Görünmüyor

- Client-side tracking kodu eklendi mi?
- API endpoint'i çalışıyor mu? (`/api/admin/visitors`)
- Son 5 dakikada ziyaretçi var mı?

## 📝 TODO / İyileştirmeler

- [ ] Mesajlara yanıt gönderme özelliği
- [ ] Kategori sürükle-bırak sıralama
- [ ] Ziyaretçi heatmap görselleştirmesi
- [ ] Export to CSV/Excel
- [ ] Bulk operations (toplu silme, güncelleme)
- [ ] Advanced filtering ve search
- [ ] Email notifications (yeni mesaj geldiğinde)
- [ ] WebSocket ile gerçek zamanlı güncelleme

## 🤝 Katkıda Bulunma

Yeni özellik eklemek veya bug fix yapmak için:

1. Feature branch oluştur: `git checkout -b feature/amazing-feature`
2. Değişiklikleri commit et: `git commit -m 'Add amazing feature'`
3. Branch'i push et: `git push origin feature/amazing-feature`
4. Pull Request aç

## 📄 Lisans

Bu proje MIT lisansı altında lisanslanmıştır.

---

**Geliştirici:** Kiro AI Assistant
**Tarih:** 2025
**Versiyon:** 1.0.0
