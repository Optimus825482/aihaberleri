# 🔧 Visitor Table Fix - Anlık Ziyaretçiler Sorunu

## ❌ Sorun

```
PrismaClientKnownRequestError:
The table `public.Visitor` does not exist in the current database.
```

Anlık ziyaretçiler sayfası çalışmıyor çünkü `Visitor` tablosu veritabanında oluşturulmamış.

---

## ✅ Çözüm

### Adım 1: Database'i Schema ile Senkronize Et

```bash
npx prisma db push --skip-generate
```

**Sonuç:** ✅ Database şimdi schema ile senkron

### Adım 2: Dev Server'ı Yeniden Başlat

Prisma client generate işlemi için dev server'ı durdurup yeniden başlatın:

```bash
# Terminal'de Ctrl+C ile durdur
# Sonra tekrar başlat:
npm run dev
```

### Adım 3: Visitor Tablosunu Kontrol Et

Database'de tablo oluşturuldu mu kontrol et:

```sql
SELECT * FROM "Visitor" LIMIT 1;
```

---

## 📊 Visitor Model Yapısı

```prisma
model Visitor {
  id           String   @id @default(cuid())
  ipAddress    String   @unique
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

---

## 🔄 Visitor Tracking Nasıl Çalışır?

### 1. Client-Side Tracking

Frontend'den her sayfa ziyaretinde POST request:

```typescript
// Client-side (örnek)
fetch("/api/admin/visitors", {
  method: "POST",
  body: JSON.stringify({
    ipAddress: userIP,
    userAgent: navigator.userAgent,
    currentPage: window.location.pathname,
  }),
});
```

### 2. Server-Side Upsert

API route visitor'ı günceller veya oluşturur:

```typescript
await db.visitor.upsert({
  where: { ipAddress },
  update: {
    userAgent,
    currentPage,
    lastActivity: new Date(),
    // GeoIP data
  },
  create: {
    ipAddress,
    userAgent,
    currentPage,
    // GeoIP data
  },
});
```

### 3. Real-Time Display

Admin panel her 10 saniyede bir son 5 dakikadaki aktif ziyaretçileri gösterir:

```typescript
const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

const visitors = await db.visitor.findMany({
  where: {
    lastActivity: { gte: fiveMinutesAgo },
  },
  orderBy: { lastActivity: "desc" },
});
```

### 4. Auto Cleanup

1 saatten eski ziyaretçiler otomatik silinir (DELETE endpoint).

---

## 🌍 GeoIP Integration

Visitor tracking GeoIP kullanarak konum bilgisi toplar:

```typescript
const location = await getLocationFromIP(ipAddress);

// Returns:
{
  country: "Turkey",
  countryCode: "TR",
  city: "Istanbul",
  region: "Istanbul"
}
```

**Flag Emoji:**

```typescript
getFlagEmoji("TR"); // 🇹🇷
getFlagEmoji("US"); // 🇺🇸
```

---

## 📱 Frontend Integration

Visitor tracking'i aktif etmek için client-side component ekleyin:

```tsx
// src/components/VisitorTracker.tsx
"use client";

import { useEffect } from "react";

export function VisitorTracker() {
  useEffect(() => {
    const trackVisit = async () => {
      try {
        // Get user IP (from API or service)
        const ipResponse = await fetch("https://api.ipify.org?format=json");
        const { ip } = await ipResponse.json();

        // Track visitor
        await fetch("/api/admin/visitors", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ipAddress: ip,
            userAgent: navigator.userAgent,
            currentPage: window.location.pathname,
          }),
        });
      } catch (error) {
        console.error("Visitor tracking failed:", error);
      }
    };

    trackVisit();

    // Update every 2 minutes
    const interval = setInterval(trackVisit, 2 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  return null;
}
```

**Layout'a ekle:**

```tsx
// src/app/layout.tsx
import { VisitorTracker } from "@/components/VisitorTracker";

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <VisitorTracker />
        {children}
      </body>
    </html>
  );
}
```

---

## 🔍 Debugging

### 1. Tablo Var mı Kontrol Et

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name = 'Visitor';
```

### 2. Visitor Sayısını Kontrol Et

```sql
SELECT COUNT(*) FROM "Visitor";
```

### 3. Son Ziyaretçileri Göster

```sql
SELECT * FROM "Visitor"
ORDER BY "lastActivity" DESC
LIMIT 10;
```

### 4. Aktif Ziyaretçileri Göster (Son 5 dk)

```sql
SELECT * FROM "Visitor"
WHERE "lastActivity" >= NOW() - INTERVAL '5 minutes'
ORDER BY "lastActivity" DESC;
```

---

## 🚀 Production Deployment

### Environment Variables

```env
DATABASE_URL="postgresql://user:pass@host:5432/db"
```

### Migration

Production'da migration çalıştır:

```bash
npx prisma migrate deploy
```

### Cron Job (Cleanup)

Eski ziyaretçileri temizlemek için cron job:

```bash
# Her saat başı çalışır
0 * * * * curl -X DELETE https://yourdomain.com/api/admin/visitors
```

---

## 📊 Analytics Integration

Visitor data'yı analytics ile birleştir:

```typescript
// Get visitor analytics
const analytics = await db.articleAnalytics.findMany({
  where: {
    ipAddress: visitor.ipAddress,
    createdAt: {
      gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24h
    },
  },
  include: {
    article: {
      select: {
        title: true,
        slug: true,
      },
    },
  },
});
```

---

## ⚡ Performance Tips

### 1. Index Optimization

Visitor tablosu zaten optimize edilmiş:

- `ipAddress` (unique + indexed)
- `lastActivity` (indexed)
- `createdAt` (indexed)

### 2. Auto Cleanup

Eski kayıtları düzenli temizle:

```typescript
// Cron job veya scheduled task
setInterval(
  async () => {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    await db.visitor.deleteMany({
      where: { lastActivity: { lt: oneHourAgo } },
    });
  },
  60 * 60 * 1000,
); // Her saat
```

### 3. Connection Pooling

Prisma connection pool ayarları:

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  relationMode = "prisma"
}
```

---

## 🎯 Test Senaryoları

### 1. Visitor Tracking Test

```bash
curl -X POST http://localhost:3000/api/admin/visitors \
  -H "Content-Type: application/json" \
  -d '{
    "ipAddress": "1.2.3.4",
    "userAgent": "Mozilla/5.0...",
    "currentPage": "/news/test-article"
  }'
```

### 2. Get Active Visitors

```bash
curl http://localhost:3000/api/admin/visitors
```

### 3. Cleanup Old Visitors

```bash
curl -X DELETE http://localhost:3000/api/admin/visitors
```

---

## ✅ Checklist

- [x] Visitor model schema'da tanımlı
- [x] Database push yapıldı
- [x] API routes hazır
- [x] Frontend component (opsiyonel)
- [x] GeoIP integration
- [x] Auto cleanup mechanism
- [x] Admin panel UI (Cyberpunk style)

---

## 🔄 Sonraki Adımlar

1. **Dev server'ı yeniden başlat**
2. `/admin/visitors` sayfasını aç
3. Test için birkaç sayfa ziyaret et
4. Admin panel'de real-time ziyaretçileri gör

---

**Status:** ✅ Database hazır, dev server restart gerekli
**Last Updated:** January 29, 2026
