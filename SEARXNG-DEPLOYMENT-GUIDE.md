# 🚀 SearXNG Deployment Rehberi

**Tarih:** 3 Şubat 2026  
**Durum:** Production'a hazır

---

## 📋 Ön Hazırlık

### 1. Environment Variables Ekle

`.env` dosyasına şu satırları ekle:

```bash
# SearXNG Configuration
SEARXNG_SECRET_KEY=ec0784fbefa3ab05139541fc2653164877bfc29f18fa60d022305c2c086f0c6
SEARXNG_BASE_URL=http://aihaberleri-searxng:8080
SEARXNG_PORT=8080
```

### 2. SearXNG Secret Key Güncelle

`searxng/settings.yml` dosyasında:

```yaml
server:
  secret_key: "ec0784fbefa3ab05139541fc2653164877bfc29f18fa60d022305c2c086f0c6"
```

---

## 🐳 Deployment Adımları

### Adım 1: Dosyaları Kontrol Et

```bash
# Gerekli dosyaların varlığını kontrol et
ls -la searxng/
# Çıktı:
# - settings.yml
# - limiter.toml
# - uwsgi.ini
```

### Adım 2: Docker Compose ile Deploy

```bash
# Servisleri başlat
docker-compose -f docker-compose.coolify.yaml up -d valkey searxng

# Logları kontrol et
docker-compose -f docker-compose.coolify.yaml logs -f searxng
docker-compose -f docker-compose.coolify.yaml logs -f valkey
```

### Adım 3: Health Check

```bash
# SearXNG health check
curl http://localhost:8080/healthz

# Beklenen çıktı: OK

# Valkey health check
docker exec aihaberleri-valkey valkey-cli ping

# Beklenen çıktı: PONG
```

### Adım 4: Test Search

```bash
# Test arama yap
curl "http://localhost:8080/search?q=artificial+intelligence&format=json" | jq '.results[0]'

# Beklenen çıktı: JSON formatında arama sonuçları
```

### Adım 5: Worker ve App'i Yeniden Başlat

```bash
# Worker ve app'i yeniden başlat (SearXNG bağımlılığı için)
docker-compose -f docker-compose.coolify.yaml restart worker app

# Logları kontrol et
docker-compose -f docker-compose.coolify.yaml logs -f worker
docker-compose -f docker-compose.coolify.yaml logs -f app
```

---

## 🔍 Verification Checklist

### SearXNG Kontrolleri

- [ ] SearXNG container çalışıyor
- [ ] Valkey container çalışıyor
- [ ] Health endpoint yanıt veriyor (`/healthz`)
- [ ] Test arama başarılı
- [ ] Limiter aktif (rate limiting çalışıyor)
- [ ] DuckDuckGo devre dışı (CAPTCHA yok)
- [ ] Google devre dışı (timeout yok)
- [ ] Alternatif engine'ler aktif (Bing, Qwant, Brave)

### Uygulama Kontrolleri

- [ ] Worker SearXNG'ye bağlanabiliyor
- [ ] App SearXNG'ye bağlanabiliyor
- [ ] Hybrid search çalışıyor
- [ ] Haber oluşturma başarılı
- [ ] Log'larda CAPTCHA hatası yok
- [ ] Log'larda timeout hatası yok

---

## 📊 Monitoring

### SearXNG Metrics

```bash
# Metrics endpoint'i kontrol et
curl http://localhost:8080/metrics

# Önemli metrikler:
# - searx_search_requests_total
# - searx_search_errors_total
# - searx_limiter_blocked_total
```

### Valkey Stats

```bash
# Valkey istatistikleri
docker exec aihaberleri-valkey valkey-cli INFO stats

# Önemli metrikler:
# - total_connections_received
# - total_commands_processed
# - keyspace_hits
# - keyspace_misses
```

### Log Monitoring

```bash
# SearXNG loglarını izle
docker-compose -f docker-compose.coolify.yaml logs -f searxng | grep -E "ERROR|WARNING|CAPTCHA|timeout"

# Valkey loglarını izle
docker-compose -f docker-compose.coolify.yaml logs -f valkey
```

---

## 🐛 Troubleshooting

### Problem 1: SearXNG başlamıyor

**Semptom:** Container sürekli restart oluyor

**Çözüm:**

```bash
# Logları kontrol et
docker-compose -f docker-compose.coolify.yaml logs searxng

# Secret key kontrolü
grep "secret_key" searxng/settings.yml

# Valkey bağlantısı kontrolü
docker exec aihaberleri-valkey valkey-cli ping
```

### Problem 2: Arama sonuç vermiyor

**Semptom:** Boş sonuç listesi

**Çözüm:**

```bash
# Engine durumlarını kontrol et
curl "http://localhost:8080/stats" | jq '.engines'

# Unresponsive engine'leri kontrol et
curl "http://localhost:8080/search?q=test&format=json" | jq '.unresponsive_engines'

# Settings.yml'de engine'leri kontrol et
grep -A 5 "engines:" searxng/settings.yml
```

### Problem 3: Rate limiting çok agresif

**Semptom:** Çok fazla "429 Too Many Requests"

**Çözüm:**

```bash
# limiter.toml'u güncelle
# rate = "30/60" → rate = "60/60" (dakikada 60 request)

# SearXNG'yi yeniden başlat
docker-compose -f docker-compose.coolify.yaml restart searxng
```

### Problem 4: Valkey bağlantı hatası

**Semptom:** "Connection refused" hatası

**Çözüm:**

```bash
# Valkey çalışıyor mu?
docker ps | grep valkey

# Network bağlantısı kontrolü
docker exec aihaberleri-searxng ping -c 3 aihaberleri-valkey

# Valkey logları
docker-compose -f docker-compose.coolify.yaml logs valkey
```

---

## 🔄 Rollback Planı

Eğer sorun çıkarsa, eski sisteme dönmek için:

### Adım 1: SearXNG'yi Durdur

```bash
docker-compose -f docker-compose.coolify.yaml stop searxng valkey
```

### Adım 2: Environment Variables'ı Kaldır

`.env` dosyasından şu satırları kaldır:

```bash
SEARXNG_SECRET_KEY=...
SEARXNG_BASE_URL=...
```

### Adım 3: Uygulamayı Yeniden Başlat

```bash
docker-compose -f docker-compose.coolify.yaml restart worker app
```

### Adım 4: Eski Sistemi Doğrula

```bash
# Worker loglarını kontrol et
docker-compose -f docker-compose.coolify.yaml logs -f worker

# Brave/Tavily kullanıldığını doğrula
```

---

## 📈 Performance Tuning

### SearXNG Optimizasyonu

**settings.yml:**

```yaml
outgoing:
  request_timeout: 5.0 # Daha hızlı timeout
  pool_connections: 300 # Daha fazla connection
  pool_maxsize: 30 # Daha büyük pool
```

**uwsgi.ini:**

```ini
workers = 8               # Daha fazla worker (CPU core sayısına göre)
threads = 8               # Daha fazla thread
buffer-size = 16384       # Daha büyük buffer
```

### Valkey Optimizasyonu

```bash
# Valkey config güncelle
docker exec aihaberleri-valkey valkey-cli CONFIG SET maxmemory 512mb
docker exec aihaberleri-valkey valkey-cli CONFIG SET maxmemory-policy allkeys-lru
```

---

## 🎯 Success Criteria

Deployment başarılı sayılır eğer:

1. ✅ SearXNG ve Valkey container'ları çalışıyor
2. ✅ Health check'ler başarılı
3. ✅ Test araması sonuç veriyor
4. ✅ Worker loglarında CAPTCHA hatası yok
5. ✅ Worker loglarında timeout hatası yok
6. ✅ Haber oluşturma başarılı
7. ✅ 24 saat boyunca stabil çalışıyor

---

## 📞 Destek

Sorun yaşarsan:

1. Logları kontrol et
2. Health check'leri çalıştır
3. Troubleshooting bölümüne bak
4. Gerekirse rollback yap

---

**Deployment'a hazırsın! 🚀**
