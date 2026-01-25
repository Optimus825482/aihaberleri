# 🚀 Hızlı Başlangıç Kılavuzu

Bu kılavuz, Yapay Zeka Haber Sitesini 5 dakikada çalıştırmanıza yardımcı olacaktır.

## ⚡ Hızlı Kurulum (Docker)

### 1. Ön Gereksinimler

- Docker ve Docker Compose yüklü
- DeepSeek API anahtarı ([buradan alın](https://platform.deepseek.com))

### 2. Kurulum Adımları

```bash
# 1. Repository'yi klonlayın
git clone <repository-url>
cd ai-news-site

# 2. Environment dosyasını oluşturun
cp .env.example .env

# 3. .env dosyasını düzenleyin ve API anahtarlarınızı ekleyin
# GEREKLİ: DEEPSEEK_API_KEY
# GEREKLİ: NEXTAUTH_SECRET (openssl rand -base64 32 ile oluşturun)

# 4. Servisleri başlatın
docker-compose up -d

# 5. Veritabanını kurun
docker-compose exec app npx prisma migrate deploy
docker-compose exec app npx tsx scripts/seed-categories.ts
docker-compose exec app npx tsx scripts/create-admin.ts

# 6. Siteye erişin
# Web sitesi: http://localhost:3000
# Yönetim: http://localhost:3000/admin
# Giriş: admin@example.com / admin123
```

### 3. İlk Agent Çalıştırması

```bash
# Yönetim paneline gidin
http://localhost:3000/admin

# "Agent'ı Şimdi Çalıştır" butonuna tıklayın
# Agent otomatik olarak:
# - Yapay zeka haberlerini arayacak
# - En iyi 2-3 makaleyi seçecek
# - DeepSeek ile yeniden yazacak
# - Görseller ekleyecek
# - Yayınlayacak
```

## 🔧 Manuel Kurulum (Docker Olmadan)

### 1. Ön Gereksinimler

- Node.js 18+
- PostgreSQL 15+
- Redis 7+
- DeepSeek API anahtarı

### 2. Kurulum

```bash
# 1. Bağımlılıkları yükleyin
npm install

# 2. Environment dosyasını oluşturun
cp .env.example .env

# 3. .env dosyasını düzenleyin
# DATABASE_URL="postgresql://user:password@localhost:5432/ai_news"
# REDIS_URL="redis://localhost:6379"
# DEEPSEEK_API_KEY="your-key-here"
# NEXTAUTH_SECRET="your-secret-here"

# 4. Veritabanını kurun
npx prisma migrate deploy
npx prisma generate

# 5. Kategorileri ve admin kullanıcısı oluşturun
npx tsx scripts/seed-categories.ts
npx tsx scripts/create-admin.ts

# 6. Development sunucusunu başlatın
npm run dev

# 7. Worker'ı başlatın (ayrı terminal)
npm run worker
```

## 📝 Environment Değişkenleri

### Gerekli

```env
# Veritabanı
DATABASE_URL="postgresql://user:password@localhost:5432/ai_news"
REDIS_URL="redis://localhost:6379"

# Kimlik Doğrulama
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-here"  # openssl rand -base64 32

# DeepSeek AI (GEREKLİ)
DEEPSEEK_API_KEY="your-deepseek-api-key"
DEEPSEEK_API_URL="https://api.deepseek.com/v1"
```

### Opsiyonel

```env
# Unsplash (Görseller için)
UNSPLASH_ACCESS_KEY="your-unsplash-key"

# Pexels (Yedek görsel kaynağı)
PEXELS_API_KEY="your-pexels-key"

# Google AdSense
NEXT_PUBLIC_ADSENSE_CLIENT_ID="ca-pub-xxxxxxxxxxxxxxxx"

# Brave Search (Gelişmiş haber arama)
BRAVE_API_KEY="your-brave-api-key"

# Site Yapılandırması
NEXT_PUBLIC_SITE_NAME="Yapay Zeka Haberleri"
NEXT_PUBLIC_SITE_DESCRIPTION="En son yapay zeka haberleri ve gelişmeleri"
NEXT_PUBLIC_SITE_URL="http://localhost:3000"

# Agent Yapılandırması
AGENT_ENABLED=true
AGENT_MIN_ARTICLES_PER_RUN=2
AGENT_MAX_ARTICLES_PER_RUN=3
AGENT_MIN_INTERVAL_HOURS=5
```

## 🎯 İlk Adımlar

### 1. Yönetim Paneline Giriş

```
URL: http://localhost:3000/admin
E-posta: admin@example.com
Şifre: admin123
```

**ÖNEMLİ**: İlk girişten sonra şifrenizi değiştirin!

### 2. Agent'ı Test Edin

1. Dashboard'a gidin
2. "Agent'ı Şimdi Çalıştır" butonuna tıklayın
3. Çalıştırma loglarını izleyin
4. Ana sayfada yeni makaleleri görün

### 3. Kategorileri Kontrol Edin

Varsayılan kategoriler:

- Makine Öğrenmesi
- Doğal Dil İşleme
- Bilgisayarlı Görü
- Robotik
- Yapay Zeka Etiği
- Yapay Zeka Araçları
- Sektör Haberleri
- Araştırma

### 4. Otomatik Zamanlama

Agent otomatik olarak günde 2 kez çalışır:

- İlk çalıştırma: Manuel veya zamanlanmış
- Sonraki çalıştırmalar: 5-8 saat arayla otomatik

## 🐛 Sorun Giderme

### Agent Çalışmıyor

```bash
# Logları kontrol edin
docker-compose logs -f app

# Worker'ın çalıştığından emin olun
docker-compose ps

# Redis bağlantısını test edin
docker-compose exec redis redis-cli ping
```

### Veritabanı Bağlantı Hatası

```bash
# PostgreSQL'in çalıştığından emin olun
docker-compose ps postgres

# Bağlantıyı test edin
docker-compose exec postgres psql -U postgres -d ai_news -c "SELECT 1"

# Migration'ları tekrar çalıştırın
docker-compose exec app npx prisma migrate deploy
```

### DeepSeek API Hatası

```bash
# API anahtarını kontrol edin
echo $DEEPSEEK_API_KEY

# API'yi test edin
curl -X POST https://api.deepseek.com/v1/chat/completions \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model":"deepseek-reasoner","messages":[{"role":"user","content":"test"}]}'
```

### Port Çakışması

```bash
# Portları değiştirin (docker-compose.yml)
ports:
  - "3001:3000"  # 3000 yerine 3001 kullanın
```

## 📚 Sonraki Adımlar

1. **Özelleştirme**
   - Site adını ve logosunu değiştirin
   - Renk temasını özelleştirin (`tailwind.config.ts`)
   - Kategorileri düzenleyin

2. **SEO Optimizasyonu**
   - Google Search Console'a ekleyin
   - Sitemap'i gönderin: `http://localhost:3000/sitemap.xml`
   - Google Analytics ekleyin

3. **Monetizasyon**
   - Google AdSense'i yapılandırın
   - Reklam yerleşimlerini optimize edin

4. **Production Deployment**
   - Domain satın alın
   - SSL sertifikası kurun
   - Production environment'ı yapılandırın
   - Monitoring kurun

## 🔗 Faydalı Linkler

- [Tam Dokümantasyon](README.md)
- [Deployment Kılavuzu](DEPLOYMENT.md)
- [API Referansı](docs/API.md)
- [DeepSeek Dokümantasyonu](https://platform.deepseek.com/docs)

## 💡 İpuçları

1. **Agent Sıklığı**: Production'da `AGENT_MIN_INTERVAL_HOURS=6` kullanın
2. **Makale Sayısı**: Günde 4-6 makale için `AGENT_MAX_ARTICLES_PER_RUN=3` ayarlayın
3. **Görsel Kalitesi**: Unsplash API anahtarı kullanın (ücretsiz)
4. **Performans**: Redis cache'i etkinleştirin
5. **Güvenlik**: Production'da güçlü şifreler kullanın

## 🆘 Yardım

Sorun mu yaşıyorsunuz?

1. [GitHub Issues](https://github.com/your-repo/issues) kontrol edin
2. [Dokümantasyonu](README.md) okuyun
3. Yeni issue açın

---

**Mutlu kodlamalar! 🚀**
