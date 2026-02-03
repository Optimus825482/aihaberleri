# 🔧 SearXNG Optimizasyon Adımları

**Tarih:** 3 Şubat 2026  
**Hedef:** Mevcut SearXNG'yi optimize et ve AIHaberleri'ne bağla

---

## 📋 Ön Kontrol

### 1. SearXNG URL'ini Bul

Coolify dashboard'da SearXNG projesini aç ve URL'i not et:

```
Mevcut URL: http://searxng-pwcsc8ow08oks0ggokwoo8ww.77.42.68.4.sslip.io
```

### 2. Mevcut Durumu Test Et

```bash
# Health check
curl http://searxng-pwcsc8ow08oks0ggokwoo8ww.77.42.68.4.sslip.io/healthz

# Test arama
curl "http://searxng-pwcsc8ow08oks0ggokwoo8ww.77.42.68.4.sslip.io/search?q=test&format=json" | jq '.results[0]'
```

**Beklenen:** Çalışıyor olmalı (ama DuckDuckGo CAPTCHA hataları var)

---

## 🔧 Adım 2: SearXNG Ayarlarını Güncelle

### A. Settings.yml Dosyasını Hazırla

Coolify'da SearXNG projesine git ve `settings.yml` dosyasını düzenle.

**Kritik Değişiklikler:**

#### 1. Sorunlu Engine'leri Devre Dışı Bırak

```yaml
engines:
  # SORUNLU ENGINE'LERI KALDIR
  remove:
    - duckduckgo
    - duckduckgo_images
    - duckduckgo_videos
    - duckduckgo_news
    - google
    - google_images
    - google_news
    - google_videos
```

#### 2. Alternatif Engine'leri Etkinleştir

```yaml
# ALTERNATİF ENGINE'LER
- name: bing
  disabled: false
  weight: 1.5
  timeout: 5.0
  categories: general

- name: bing_images
  disabled: false
  weight: 1.2
  timeout: 5.0
  categories: images

- name: bing_news
  disabled: false
  weight: 1.2
  timeout: 5.0
  categories: news

- name: qwant
  disabled: false
  weight: 1.2
  timeout: 5.0
  categories: general

- name: brave
  disabled: false
  weight: 1.0
  timeout: 5.0
  categories: general

- name: startpage
  disabled: false
  weight: 1.0
  timeout: 5.0
  categories: general

- name: mojeek
  disabled: false
  weight: 0.8
  timeout: 5.0
  categories: general
```

#### 3. Timeout Ayarlarını Güncelle

```yaml
outgoing:
  request_timeout: 5.0 # 4.0 → 5.0
  max_request_timeout: 15.0 # 12.0 → 15.0
  pool_connections: 200
  pool_maxsize: 20
  enable_http2: true
  useragent_suffix: " (+https://aihaberleri.org)"
```

#### 4. Suspension Times Güncelle

```yaml
search:
  ban_time_on_fail: 10
  max_ban_time_on_fail: 300
  suspended_times:
    SearxEngineAccessDenied: 86400
    SearxEngineCaptcha: 86400
    SearxEngineTooManyRequests: 7200
```

### B. Limiter.toml Ekle (Eğer Yoksa)

Coolify'da SearXNG projesine `limiter.toml` dosyası ekle:

```toml
[botdetection.ip_limit]
link_token = true
rate = "30/60"
burst = 10

[botdetection.ip_lists]
pass_ip = [
  "127.0.0.0/8",
  "::1/128",
  "10.0.0.0/8",
  "172.16.0.0/12",
  "192.168.0.0/16",
]

block_ip = []
```

### C. Limiter'ı Aktif Et

`settings.yml` içinde:

```yaml
server:
  limiter: true

valkey:
  url: "valkey://valkey:6379/0" # Eğer Valkey varsa
  # veya
  # url: "redis://redis:6379/0"  # Redis kullanıyorsan
```

---

## 🚀 Adım 3: SearXNG'yi Redeploy Et

### Coolify'da:

1. SearXNG projesine git
2. "Redeploy" butonuna tıkla
3. Logları izle

### Komut satırından (opsiyonel):

```bash
# Container'ı restart et
docker restart <searxng-container-name>

# Logları izle
docker logs -f <searxng-container-name>
```

---

## ✅ Adım 4: SearXNG'yi Test Et

### A. Health Check

```bash
curl http://searxng-pwcsc8ow08oks0ggokwoo8ww.77.42.68.4.sslip.io/healthz
```

**Beklenen:** `OK`

### B. Test Arama

```bash
curl "http://searxng-pwcsc8ow08oks0ggokwoo8ww.77.42.68.4.sslip.io/search?q=artificial+intelligence&format=json" | jq '.results[0:3]'
```

**Beklenen:** JSON formatında arama sonuçları

### C. Engine Durumlarını Kontrol Et

```bash
curl "http://searxng-pwcsc8ow08oks0ggokwoo8ww.77.42.68.4.sslip.io/search?q=test&format=json" | jq '.unresponsive_engines'
```

**Beklenen:** Boş array `[]` veya sadece devre dışı bıraktığımız engine'ler

### D. Logları Kontrol Et

```bash
docker logs <searxng-container-name> | grep -E "CAPTCHA|timeout|ERROR"
```

**Beklenen:** DuckDuckGo CAPTCHA hatası yok, Google timeout yok

---

## 🔗 Adım 5: AIHaberleri'ne Bağla

### A. Environment Variable Ekle

AIHaberleri projesinin `.env` dosyasına:

```bash
# SearXNG (External)
SEARXNG_BASE_URL=http://searxng-pwcsc8ow08oks0ggokwoo8ww.77.42.68.4.sslip.io
```

**Coolify'da:**

1. AIHaberleri projesine git
2. "Environment Variables" sekmesine git
3. Yeni variable ekle:
   - Key: `SEARXNG_BASE_URL`
   - Value: `http://searxng-pwcsc8ow08oks0ggokwoo8ww.77.42.68.4.sslip.io`

### B. Worker ve App'i Restart Et

**Coolify'da:**

1. AIHaberleri projesine git
2. "Restart" butonuna tıkla

**Komut satırından:**

```bash
docker restart aihaberleri-worker
docker restart aihaberleri-app
```

---

## ✅ Adım 6: Entegrasyonu Test Et

### A. Worker Loglarını Kontrol Et

```bash
docker logs -f aihaberleri-worker | grep -E "SearXNG|CAPTCHA|timeout"
```

**Beklenen:**

- ✅ SearXNG bağlantısı başarılı
- ✅ CAPTCHA hatası yok
- ✅ Timeout hatası yok

### B. Manuel Haber Oluşturma Testi

1. Admin paneline git
2. Manuel olarak bir haber oluştur
3. Logları izle

**Beklenen:**

- ✅ Haber başarıyla oluşturuldu
- ✅ SearXNG kullanıldı
- ✅ Hata yok

### C. Hybrid Search Testi

```bash
# Worker loglarında hybrid search kullanımını kontrol et
docker logs aihaberleri-worker | grep "hybrid"
```

**Beklenen:**

- ✅ SearXNG primary olarak kullanılıyor
- ✅ Brave/Tavily fallback olarak hazır

---

## 📊 Adım 7: 24 Saat Monitoring

### A. Logları İzle

```bash
# SearXNG logları
docker logs -f <searxng-container> | grep -E "ERROR|WARNING|CAPTCHA"

# Worker logları
docker logs -f aihaberleri-worker | grep -E "ERROR|CAPTCHA|timeout"
```

### B. Metrics Kontrol Et

```bash
# SearXNG metrics
curl http://searxng-pwcsc8ow08oks0ggokwoo8ww.77.42.68.4.sslip.io/metrics | grep searx_search

# Önemli metrikler:
# - searx_search_requests_total
# - searx_search_errors_total
```

### C. Başarı Oranını Hesapla

```bash
# 24 saat sonra
total_requests=$(docker logs aihaberleri-worker | grep "SearXNG" | wc -l)
errors=$(docker logs aihaberleri-worker | grep -E "CAPTCHA|timeout" | wc -l)
success_rate=$(echo "scale=2; (1 - $errors/$total_requests) * 100" | bc)
echo "Başarı oranı: $success_rate%"
```

**Hedef:** %95+ başarı oranı

---

## ✅ Verification Checklist

### SearXNG Tarafı

- [ ] Settings.yml güncellendi
- [ ] DuckDuckGo devre dışı
- [ ] Google devre dışı
- [ ] Alternatif engine'ler aktif (Bing, Qwant, Brave, Startpage, Mojeek)
- [ ] Limiter eklendi/aktif
- [ ] Timeout ayarları güncellendi
- [ ] Redeploy yapıldı
- [ ] Health check başarılı
- [ ] Test arama başarılı
- [ ] Loglar temiz (CAPTCHA/timeout yok)

### AIHaberleri Tarafı

- [ ] SEARXNG_BASE_URL eklendi
- [ ] Worker restart edildi
- [ ] App restart edildi
- [ ] Worker SearXNG'ye bağlanabiliyor
- [ ] Haber oluşturma başarılı
- [ ] CAPTCHA hatası yok
- [ ] Timeout hatası yok
- [ ] Hybrid search çalışıyor

---

## 🔄 Rollback Planı

Eğer sorun çıkarsa:

### SearXNG Tarafı

```bash
# 1. Eski settings.yml'i geri yükle (backup'tan)
# 2. Redeploy et
```

### AIHaberleri Tarafı

```bash
# 1. SEARXNG_BASE_URL'i kaldır veya yorum satırı yap
# 2. Worker ve app'i restart et
# 3. Eski Brave/Tavily sistemine dön
```

---

## 📈 Beklenen Sonuçlar

### Öncesi (Sorunlu)

- DuckDuckGo CAPTCHA: ~100 hata/saat
- Google Timeout: ~50 hata/saat
- Başarı oranı: ~60%

### Sonrası (Hedef)

- DuckDuckGo CAPTCHA: 0 hata (devre dışı)
- Google Timeout: 0 hata (devre dışı)
- Başarı oranı: ~95%+

---

## 🎯 Sonraki Adımlar

1. **Şimdi:** SearXNG settings.yml'i güncelle
2. **Şimdi:** SearXNG'yi redeploy et
3. **Şimdi:** Test et
4. **Şimdi:** AIHaberleri'ne bağla
5. **1 saat sonra:** Logları kontrol et
6. **24 saat sonra:** Stabilite kontrolü
7. **1 hafta sonra:** Performance tuning

---

**Optimizasyona başlamaya hazırsın! 🚀**

**Sıradaki adım:** Coolify'da SearXNG projesini aç ve settings.yml'i düzenle
