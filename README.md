# Yapay Zeka Haber Sitesi - Production-Ready Otonom Haber Platformu

DeepSeek Reasoner kullanarak günde iki kez yapay zeka haberlerini tarayan, yeniden yazan ve yayınlayan tamamen otomatik bir yapay zeka haber sitesi.

## 🚀 Özellikler

### Genel Web Sitesi

- ✅ Next.js 15 ile modern, responsive tasarım
- ✅ SEO-optimize (metadata, sitemap, yapılandırılmış veri)
- ✅ Görsel optimizasyonu ile hızlı yükleme
- ✅ Kategori tabanlı navigasyon
- ✅ Makale görüntüleme takibi
- ✅ Google AdSense entegrasyonu hazır
- ✅ RSS feed desteği

### Otonom Agent

- ✅ Birden fazla kaynaktan yapay zeka haberlerini tarar
- ✅ Makaleleri yeniden yazmak için DeepSeek Reasoner kullanır (intihal yok)
- ✅ Unsplash'tan otomatik görsel oluşturur
- ✅ Her çalıştırmada 2-3 makale yayınlar
- ✅ Değişken zamanlama ile günde iki kez çalışır (5+ saat arayla)
- ✅ Tamamen otonom çalışma

### Yönetim Paneli

- ✅ NextAuth ile güvenli kimlik doğrulama
- ✅ Analitik içeren dashboard
- ✅ Manuel agent çalıştırma
- ✅ Çalıştırma geçmişi ve loglar
- ✅ Makale yönetimi
- ✅ Agent izleme

## 📋 Gereksinimler

- Node.js 18+
- PostgreSQL 15+
- Redis 7+
- Docker & Docker Compose (önerilen)

## 🛠️ Kurulum

### Seçenek 1: Coolify (Production - Önerilen)

Coolify ile otomatik deployment için:

1. **Coolify Dashboard'a giriş yapın**
   - URL: https://your-coolify-instance.com

2. **Yeni Resource oluşturun**
   - Resource Type: **Docker Compose**
   - Repository: `https://github.com/Optimus825482/aihaberleri.git`
   - Branch: `main`
   - Compose File: `docker-compose.coolify.yaml`

3. **PostgreSQL ekleyin**
   - Coolify Dashboard → New Resource → PostgreSQL
   - Database: `postgresainewsdb`
   - Internal URL'i not alın: `postgresql://postgres:PASSWORD@postgres:5432/postgresainewsdb`

4. **Environment Variables ekleyin**
   - `.env.coolify.example` dosyasındaki tüm değişkenleri kopyalayın
   - Coolify Dashboard → Environment sekmesine yapıştırın
   - **Kritik**: `DATABASE_URL` için Internal URL kullanın!

5. **Deploy edin**
   - Save → Deploy
   - Logs'tan deployment'ı takip edin

6. **İlk kurulum komutlarını çalıştırın**
   ```bash
   # App container'a gir
   docker exec -it aihaberleri-app sh
   
   # Migrations
   npx prisma migrate deploy
   
   # Seed data
   npx prisma db seed
   ```

📚 **Detaylı guide**: [COOLIFY-DEPLOYMENT-GUIDE.md](COOLIFY-DEPLOYMENT-GUIDE.md)

---

### Seçenek 2: Docker Compose (Local/Development)

1. **Repository'yi klonlayın**

```bash
git clone <repository-url>
cd ai-news-site
```

2. **Environment dosyası oluşturun**

```bash
cp .env.example .env
```

3. **Environment değişkenlerini yapılandırın**
   `.env` dosyasını düzenleyin ve ayarlayın:

- `DEEPSEEK_API_KEY` - DeepSeek API anahtarınız (gerekli)
- `NEXTAUTH_SECRET` - Şununla oluşturun: `openssl rand -base64 32`
- `UNSPLASH_ACCESS_KEY` - Unsplash API anahtarı (opsiyonel)
- `NEXT_PUBLIC_ADSENSE_CLIENT_ID` - Google AdSense ID (opsiyonel)

4. **Servisleri başlatın**

```bash
docker-compose up -d
```

5. **Veritabanı migration'larını çalıştırın**

```bash
docker-compose exec app npx prisma migrate deploy
```

6. **Admin kullanıcısı oluşturun**

```bash
docker-compose exec app npx prisma db seed
```

7. **Siteye erişin**

- Web sitesi: http://localhost:3000
- Yönetim: http://localhost:3000/admin
- Varsayılan kimlik bilgileri: admin@example.com / admin123

### Seçenek 2: Manuel Kurulum

1. **Bağımlılıkları yükleyin**

```bash
npm install
```

2. **Veritabanını kurun**

```bash
# PostgreSQL ve Redis'i başlatın
# .env dosyasında DATABASE_URL ve REDIS_URL'yi güncelleyin

# Migration'ları çalıştırın
npx prisma migrate deploy
npx prisma generate
```

3. **Admin kullanıcısı oluşturun**

```bash
npx prisma db seed
```

4. **Development sunucusunu başlatın**

```bash
npm run dev
```

5. **Arka plan worker'ını başlatın** (ayrı terminal'de)

```bash
npm run worker
```

## 🤖 Otonom Agent Yapılandırması

Agent, environment değişkenleri ile yapılandırılır:

```env
# Agent'ı etkinleştir/devre dışı bırak
AGENT_ENABLED=true

# Her çalıştırmada makale sayısı
AGENT_MIN_ARTICLES_PER_RUN=2
AGENT_MAX_ARTICLES_PER_RUN=3

# Çalıştırmalar arası minimum saat
AGENT_MIN_INTERVAL_HOURS=5
```

### Nasıl Çalışır

1. **Haber Keşfi**: Brave Search API kullanarak yapay zeka haberlerini arar
2. **İçerik Analizi**: DeepSeek Reasoner en iyi makaleleri analiz eder ve seçer
3. **İçerik Yeniden Yazımı**: Makaleleri benzersiz ve SEO-optimize edilmiş şekilde yeniden yazar
4. **Görsel Oluşturma**: Unsplash'tan ilgili görselleri alır
5. **Yayınlama**: Web sitesine otomatik olarak yayınlar
6. **Zamanlama**: Sonraki çalıştırmayı planlar (5-8 saat sonra, rastgele zaman)

### Manuel Çalıştırma

Yönetim panelinden:

1. `/admin` adresine giriş yapın
2. "Agent'ı Şimdi Çalıştır" butonuna tıklayın
3. Çalıştırmayı gerçek zamanlı izleyin

CLI'dan:

```bash
# Docker kullanarak
docker-compose exec app npm run worker

# Docker olmadan
npm run worker
```

## 📊 Yönetim Paneli

Erişim: `http://localhost:3000/admin`

Özellikler:

- **Dashboard**: Çalıştırma istatistikleri, makale sayısı, başarı oranı
- **Manuel Çalıştırma**: Agent'ı isteğe bağlı çalıştırın
- **Çalıştırma Geçmişi**: Detaylarla birlikte geçmiş çalıştırmaları görüntüleyin
- **Kuyruk Yönetimi**: Planlanmış işleri izleyin
- **Makale Yönetimi**: Makaleleri düzenleyin/silin (yakında)

## 🔧 API Endpoint'leri

### Genel API'ler

- `GET /` - Ana sayfa
- `GET /news/[slug]` - Makale detayı
- `GET /category/[slug]` - Kategori sayfası
- `GET /sitemap.xml` - Sitemap
- `GET /rss.xml` - RSS feed

### Yönetim API'leri (Kimlik Doğrulamalı)

- `POST /api/agent/execute` - Agent'ı manuel çalıştır
- `POST /api/agent/schedule` - Sonraki çalıştırmayı planla
- `GET /api/agent/stats` - Agent istatistiklerini al
- `GET /api/agent/schedule` - Yaklaşan işleri al

## 🗄️ Veritabanı Şeması

### Ana Tablolar

- **Article**: Yayınlanmış makaleler
- **Category**: Makale kategorileri
- **User**: Yönetici kullanıcılar
- **AgentLog**: Agent çalıştırma logları
- **Setting**: Sistem yapılandırması

Tam şema için `prisma/schema.prisma` dosyasına bakın.

## 🚀 Deployment

### Production Deployment

1. **Production için build edin**

```bash
docker-compose -f docker-compose.prod.yml up -d
```

2. **Domain yapılandırın**
   `.env` dosyasında `NEXT_PUBLIC_SITE_URL`'yi güncelleyin

3. **SSL kurun**
   Let's Encrypt ile Nginx veya Caddy'yi reverse proxy olarak kullanın

4. **İzleme yapılandırın**

- Hata takibi kurun (Sentry)
- Uptime monitoring yapılandırın
- Log toplama etkinleştirin

### Environment Değişkenleri (Production)

Gerekli:

- `DATABASE_URL` - PostgreSQL bağlantı string'i
- `REDIS_URL` - Redis bağlantı string'i
- `NEXTAUTH_SECRET` - Güçlü rastgele secret
- `DEEPSEEK_API_KEY` - DeepSeek API anahtarı

Opsiyonel:

- `UNSPLASH_ACCESS_KEY` - Görseller için
- `PEXELS_API_KEY` - Görseller için yedek
- `NEXT_PUBLIC_ADSENSE_CLIENT_ID` - Google AdSense
- `BRAVE_API_KEY` - Brave Search API

## 🧪 Test

```bash
# Testleri çalıştır
npm test

# E2E testleri çalıştır
npm run test:e2e

# Tip kontrolü
npm run type-check

# Linting
npm run lint
```

## 📈 SEO Optimizasyonu

Site, arama motorları için tamamen optimize edilmiştir:

- ✅ Tüm sayfalar için dinamik metadata
- ✅ Open Graph etiketleri
- ✅ Twitter Card etiketleri
- ✅ Yapılandırılmış veri (JSON-LD)
- ✅ Sitemap oluşturma
- ✅ RSS feed
- ✅ Robots.txt
- ✅ Hızlı yükleme (Core Web Vitals)
- ✅ Mobile-first responsive tasarım
- ✅ Semantik HTML

## 🔒 Güvenlik

- ✅ Kimlik doğrulama için NextAuth
- ✅ httpOnly çerezler ile JWT token'ları
- ✅ CSRF koruması
- ✅ SQL injection önleme (Prisma)
- ✅ XSS koruması
- ✅ Rate limiting (yakında)
- ✅ Environment değişkeni doğrulama

## 📝 Lisans

MIT Lisansı - Detaylar için LICENSE dosyasına bakın

## 🤝 Katkıda Bulunma

Katkılar memnuniyetle karşılanır! Lütfen önce CONTRIBUTING.md dosyasını okuyun.

## 📧 Destek

Sorunlar ve sorular için:

- GitHub Issues: [repository-url]/issues
- E-posta: support@example.com

## 🎯 Yol Haritası

- [ ] Çoklu dil desteği
- [ ] Gelişmiş analitik dashboard
- [ ] Sosyal medya otomatik paylaşım
- [ ] Newsletter entegrasyonu
- [ ] Yorum sistemi
- [ ] Kullanıcı hesapları
- [ ] Yer imi özelliği
- [ ] Mobil uygulama

## 🙏 Teşekkürler

- Harika framework için Next.js ekibine
- AI API için DeepSeek'e
- Ücretsiz görseller için Unsplash'a
- Güzel component'ler için Shadcn UI'ya

---

**Next.js, TypeScript, Prisma ve DeepSeek AI kullanılarak ❤️ ile yapıldı**
