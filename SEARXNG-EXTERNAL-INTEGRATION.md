# 🔗 Harici SearXNG Entegrasyonu

**Durum:** SearXNG ayrı bir Coolify projesinde çalışıyor  
**Hedef:** Mevcut SearXNG'yi optimize et ve aihaberleri'ne bağla

---

## 📋 Mevcut Durum

- ✅ SearXNG ayrı Coolify projesinde çalışıyor
- ✅ Kendi domain/URL'si var
- ❌ DuckDuckGo CAPTCHA sorunu var
- ❌ Google timeout sorunu var

---

## 🎯 Yapılacaklar

### 1. SearXNG Projesinde Optimizasyon

#### A. Settings.yml Güncelle

SearXNG projesindeki `settings.yml` dosyasını güncelle:

```yaml
# Sorunlu engine'leri devre dışı bırak
engines:
  remove:
    - duckduckgo
    - duckduckgo_images
    - duckduckgo_videos
    - duckduckgo_news
    - google
    - google_images
    - google_news
    - google_videos

  # Alternatif engine'leri etkinleştir
  - name: bing
    disabled: false
    weight: 1.5
    timeout: 5.0

  - name: qwant
    disabled: false
    weight: 1.2
    timeout: 5.0

  - name: brave
    disabled: false
    weight: 1.0
    timeout: 5.0

  - name: startpage
    disabled: false
    weight: 1.0
    timeout: 5.0

  - name: mojeek
    disabled: false
    weight: 0.8
    timeout: 5.0
```

#### B. Limiter.toml Ekle/Güncelle

SearXNG projesine `limiter.toml` ekle:

```toml
[botdetection.ip_limit]
link_token = true
rate = "30/60"  # Dakikada 30 request
burst = 10

[botdetection.ip_lists]
pass_ip = [
  "127.0.0.0/8",
  "::1/128",
]
```

#### C. Timeout Ayarlarını Güncelle

`settings.yml` içinde:

```yaml
outgoing:
  request_timeout: 5.0
  max_request_timeout: 15.0
  pool_connections: 200
  pool_maxsize: 20
```

### 2. AIHaberleri Projesinde Bağlantı

#### A. Environment Variable Ekle

AIHaberleri projesinin `.env` dosyasına:

```bash
# SearXNG (External)
SEARXNG_BASE_URL=http://searxng-pwcsc8ow08oks0ggokwoo8ww.77.42.68.4.sslip.io
# veya
SEARXNG_BASE_URL=https://your-searxng-domain.com
```

#### B. Docker Compose Güncelleme (Opsiyonel)

Eğer SearXNG internal network'te ise:

```yaml
# docker-compose.coolify.yaml
services:
  worker:
    environment:
      SEARXNG_BASE_URL: ${SEARXNG_BASE_URL:-http://searxng-pwcsc8ow08oks0ggokwoo8ww.77.42.68.4.sslip.io}

  app:
    environment:
      SEARXNG_BASE_URL: ${SEARXNG_BASE_URL:-http://searxng-pwcsc8ow08oks0ggokwoo8ww.77.42.68.4.sslip.io}
```

---

## 🚀 Deployment Adımları

### Adım 1: SearXNG Projesini Güncelle

```bash
# 1. SearXNG projesine git (Coolify'da)
# 2. settings.yml dosyasını güncelle (yukarıdaki değişiklikleri yap)
# 3. limiter.toml dosyasını ekle
# 4. Projeyi redeploy et
```

### Adım 2: SearXNG'yi Test Et

```bash
# Health check
curl http://searxng-pwcsc8ow08oks0ggokwoo8ww.77.42.68.4.sslip.io/healthz

# Test arama
curl "http://searxng-pwcsc8ow08oks0ggokwoo8ww.77.42.68.4.sslip.io/search?q=test&format=json"
```

### Adım 3: AIHaberleri Projesini Güncelle

```bash
# 1. AIHaberleri projesine git (Coolify'da)
# 2. .env dosyasına SEARXNG_BASE_URL ekle
# 3. Worker ve app'i restart et
```

### Adım 4: Bağlantıyı Test Et

```bash
# Worker loglarını kontrol et
docker logs aihaberleri-worker | grep -i searxng

# Test news creation
# Manuel olarak bir haber oluştur ve logları izle
```

---

## ✅ Verification Checklist

### SearXNG Tarafı

- [ ] Settings.yml güncellendi
- [ ] DuckDuckGo devre dışı
- [ ] Google devre dışı
- [ ] Alternatif engine'ler aktif
- [ ] Limiter eklendi
- [ ] Timeout ayarları güncellendi
- [ ] Redeploy yapıldı
- [ ] Health check başarılı
- [ ] Test arama başarılı

### AIHaberleri Tarafı

- [ ] SEARXNG_BASE_URL eklendi
- [ ] Worker restart edildi
- [ ] App restart edildi
- [ ] Worker SearXNG'ye bağlanabiliyor
- [ ] Haber oluşturma başarılı
- [ ] CAPTCHA hatası yok
- [ ] Timeout hatası yok

---

## 🔍 SearXNG URL'ini Bulma

Coolify'da SearXNG projesinin URL'ini bul:

1. Coolify dashboard'a git
2. SearXNG projesini aç
3. "Domains" sekmesine bak
4. URL'yi kopyala (örn: `http://searxng-xxx.sslip.io` veya custom domain)

**Veya:**

```bash
# Coolify CLI ile
coolify project list | grep searxng

# Docker ile
docker ps | grep searxng
docker inspect <container-id> | grep IPAddress
```

---

## 🐛 Troubleshooting

### Problem 1: SearXNG'ye erişilemiyor

**Çözüm:**

```bash
# 1. SearXNG container çalışıyor mu?
docker ps | grep searxng

# 2. Port açık mı?
curl http://localhost:8080/healthz

# 3. Network bağlantısı var mı?
ping searxng-pwcsc8ow08oks0ggokwoo8ww.77.42.68.4.sslip.io
```

### Problem 2: CAPTCHA hataları devam ediyor

**Çözüm:**

```bash
# 1. Settings.yml'de DuckDuckGo gerçekten devre dışı mı?
grep -A 5 "remove:" settings.yml

# 2. SearXNG redeploy edildi mi?
# Coolify'da "Redeploy" butonuna bas

# 3. Cache temizle
docker exec <searxng-container> rm -rf /var/cache/searxng/*
```

### Problem 3: AIHaberleri SearXNG'ye bağlanamıyor

**Çözüm:**

```bash
# 1. URL doğru mu?
echo $SEARXNG_BASE_URL

# 2. Network erişimi var mı?
docker exec aihaberleri-worker curl http://searxng-xxx.sslip.io/healthz

# 3. Firewall/security group açık mı?
```

---

## 📊 Monitoring

### SearXNG Metrics

```bash
# Metrics endpoint
curl http://searxng-xxx.sslip.io/metrics

# Önemli metrikler:
# - searx_search_requests_total
# - searx_search_errors_total
# - searx_limiter_blocked_total
```

### AIHaberleri Logs

```bash
# Worker logları
docker logs aihaberleri-worker | grep -E "SearXNG|CAPTCHA|timeout"

# App logları
docker logs aihaberleri-app | grep -E "SearXNG|CAPTCHA|timeout"
```

---

## 🔄 Rollback Planı

Eğer sorun çıkarsa:

### SearXNG Tarafı

```bash
# 1. Eski settings.yml'i geri yükle
# 2. Redeploy et
```

### AIHaberleri Tarafı

```bash
# 1. SEARXNG_BASE_URL'i kaldır veya yorum satırı yap
# 2. Worker ve app'i restart et
# 3. Eski Brave/Tavily sistemine dön
```

---

## 📈 Beklenen İyileştirmeler

### Öncesi

- DuckDuckGo CAPTCHA: ~100 hata/saat
- Google Timeout: ~50 hata/saat
- Başarı oranı: ~60%

### Sonrası

- DuckDuckGo CAPTCHA: 0 hata (devre dışı)
- Google Timeout: 0 hata (devre dışı)
- Başarı oranı: ~95%+

---

## 🎯 Sonraki Adımlar

1. **Şimdi:** SearXNG settings.yml'i güncelle
2. **Şimdi:** SearXNG'yi redeploy et
3. **Şimdi:** AIHaberleri'ne SEARXNG_BASE_URL ekle
4. **1 saat sonra:** Logları kontrol et
5. **24 saat sonra:** Stabilite kontrolü

---

**Mevcut SearXNG'yi optimize etmeye hazırsın! 🚀**
