# PWA & Bildirim Sistemi Kurulum Rehberi

## ✅ Tamamlanan Özellikler

### 1. Progressive Web App (PWA)

- ✅ `manifest.json` oluşturuldu
- ✅ Service Worker (`sw.js`) eklendi
- ✅ PWA meta tagları layout'a eklendi
- ✅ Offline cache stratejisi
- ✅ Install prompt desteği

### 2. Newsletter (Bülten) Sistemi

- ✅ Database schema (Newsletter modeli)
- ✅ Subscribe API endpoint
- ✅ Unsubscribe API endpoint
- ✅ Footer'da newsletter formu
- ✅ E-posta doğrulama
- ✅ Abonelik durumu yönetimi

### 3. Push Notification Sistemi

- ✅ Database schema (PushSubscription modeli)
- ✅ Subscribe API endpoint
- ✅ Service Worker push event handler
- ✅ Footer'da bildirim butonu
- ✅ İzin yönetimi

### 4. Privacy (Gizlilik) Sayfası

- ✅ Kapsamlı gizlilik politikası
- ✅ KVKK uyumlu
- ✅ GDPR uyumlu
- ✅ Türkçe içerik

### 5. Hakkımızda Sayfası Güncellemesi

- ✅ Otomasyon vurgusu kaldırıldı
- ✅ İnsan dokunuşu vurgulandı
- ✅ Gönüllü ekip bahsi eklendi
- ✅ Güncelleme sıklığı belirsiz bırakıldı

## 🔧 Firebase Cloud Messaging Kurulumu

### Adım 1: Firebase Projesi Oluştur

1. [Firebase Console](https://console.firebase.google.com/) gir
2. "Add project" tıkla
3. Proje adı: `ai-haberleri`
4. Google Analytics: İsteğe bağlı
5. Projeyi oluştur

### Adım 2: Web App Ekle

1. Project Overview → Web icon (</>) tıkla
2. App nickname: `AI Haberleri Web`
3. Firebase Hosting: Hayır
4. "Register app" tıkla

### Adım 3: Cloud Messaging Ayarları

1. Project Settings → Cloud Messaging
2. "Web Push certificates" sekmesi
3. "Generate key pair" tıkla
4. Public key'i kopyala

### Adım 4: VAPID Keys Oluştur (Alternatif)

```bash
npm install -g web-push
npx web-push generate-vapid-keys
```

### Adım 5: Environment Variables

`.env` dosyasına ekle:

```env
NEXT_PUBLIC_VAPID_PUBLIC_KEY="BKxxx...xxx"
VAPID_PRIVATE_KEY="xxx...xxx"
FIREBASE_SERVER_KEY="xxx...xxx"
```

## 📱 PWA Test Etme

### Chrome DevTools

1. F12 → Application tab
2. Manifest: manifest.json kontrol et
3. Service Workers: sw.js kontrol et
4. Storage: Cache kontrol et

### Lighthouse

1. F12 → Lighthouse tab
2. "Progressive Web App" seç
3. "Generate report" tıkla
4. Score: 90+ olmalı

### Mobil Test

1. Chrome → Menu → "Install app"
2. Veya Safari → Share → "Add to Home Screen"

## 🔔 Push Notification Test

### Test Bildirimi Gönder

```javascript
// Browser console'da çalıştır
navigator.serviceWorker.ready.then((registration) => {
  registration.showNotification("Test Bildirimi", {
    body: "Bu bir test bildirimidir",
    icon: "/logos/brand/logo-icon.png",
    badge: "/logos/brand/logo-icon.png",
  });
});
```

### API ile Bildirim Gönder

```bash
# Push subscription endpoint'ine POST request
curl -X POST https://fcm.googleapis.com/fcm/send \
  -H "Authorization: key=YOUR_SERVER_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "SUBSCRIPTION_ENDPOINT",
    "notification": {
      "title": "Yeni Haber",
      "body": "AI Haberleri'nde yeni bir haber yayınlandı!",
      "icon": "/logos/brand/logo-icon.png"
    }
  }'
```

## 📧 Newsletter Test

### Subscribe Test

```bash
curl -X POST http://localhost:3000/api/newsletter/subscribe \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com"}'
```

### Unsubscribe Test

```bash
# Token'ı database'den al
curl http://localhost:3000/api/newsletter/unsubscribe?token=TOKEN_HERE
```

## 🗄️ Database Migration

Migration otomatik uygulandı:

```bash
npx prisma migrate dev --name add_newsletter_and_push
```

Yeni tablolar:

- `Newsletter` - Bülten abonelikleri
- `PushSubscription` - Push bildirim abonelikleri

## 📊 Admin Panel Entegrasyonu (Gelecek)

### Newsletter Yönetimi

- [ ] Abone listesi görüntüleme
- [ ] Toplu e-posta gönderme
- [ ] İstatistikler (açılma oranı, tıklama oranı)
- [ ] Segment oluşturma (kategoriye göre)

### Push Notification Yönetimi

- [ ] Aktif aboneler listesi
- [ ] Manuel bildirim gönderme
- [ ] Otomatik bildirim (yeni haber yayınlandığında)
- [ ] İstatistikler (gönderim, tıklama)

## 🔒 Güvenlik Notları

1. **VAPID Keys**: Private key'i asla client-side'da kullanma
2. **Rate Limiting**: Newsletter subscribe endpoint'ine rate limit ekle
3. **Email Validation**: Gerçek e-posta doğrulaması ekle (verification email)
4. **GDPR Compliance**: Kullanıcı verilerini silme endpoint'i ekle
5. **Spam Protection**: reCAPTCHA veya hCaptcha ekle

## 📝 Yapılacaklar

- [ ] Firebase Cloud Messaging entegrasyonu
- [ ] Newsletter e-posta template'leri
- [ ] Admin panel newsletter yönetimi
- [ ] Admin panel push notification yönetimi
- [ ] E-posta doğrulama sistemi
- [ ] Unsubscribe sayfası (web UI)
- [ ] Newsletter preferences sayfası
- [ ] A/B testing için segment sistemi
- [ ] Analytics entegrasyonu

## 🚀 Production Deployment

### Vercel Deployment

1. Environment variables ekle (Vercel Dashboard)
2. `manifest.json` ve `sw.js` public folder'da
3. PWA cache stratejisi production'a uygun
4. HTTPS zorunlu (PWA ve Push için)

### Domain Ayarları

1. DNS: A record veya CNAME
2. SSL: Otomatik (Vercel)
3. manifest.json'da `start_url` güncelle
4. Service Worker scope kontrol et

## 📚 Kaynaklar

- [PWA Documentation](https://web.dev/progressive-web-apps/)
- [Firebase Cloud Messaging](https://firebase.google.com/docs/cloud-messaging)
- [Web Push Protocol](https://developers.google.com/web/fundamentals/push-notifications)
- [Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [KVKK](https://kvkk.gov.tr/)
- [GDPR](https://gdpr.eu/)
