# ✅ SearXNG Optimizasyon Checklist

**5 dakikada tamamla!**

---

## 📋 Adım 1: SearXNG Projesini Güncelle

### A. Coolify'da SearXNG Projesine Git

- [ ] Coolify dashboard'u aç
- [ ] SearXNG projesini bul ve aç

### B. Settings.yml'i Güncelle

- [ ] Mevcut `settings.yml` dosyasını aç
- [ ] Mevcut `secret_key` değerini kopyala
- [ ] `searxng/settings-optimized.yml` dosyasını aç
- [ ] `__MEVCUT_SECRET_KEY_I_BURAYA_YAZ__` yerine kopyaladığın key'i yapıştır
- [ ] Tüm içeriği kopyala
- [ ] Coolify'daki `settings.yml` dosyasına yapıştır
- [ ] Kaydet

**Kritik Değişiklikler:**

- ✅ DuckDuckGo devre dışı (`remove:` listesinde)
- ✅ Google devre dışı (`remove:` listesinde)
- ✅ Bing, Qwant, Brave, Startpage, Mojeek aktif
- ✅ Timeout: 5-15 saniye
- ✅ Rate limiting: aktif

### C. Limiter.toml Ekle (Eğer Yoksa)

- [ ] Coolify'da yeni dosya oluştur: `limiter.toml`
- [ ] `searxng/limiter.toml` içeriğini kopyala
- [ ] Yapıştır ve kaydet

### D. Redeploy Et

- [ ] "Redeploy" butonuna tıkla
- [ ] Logları izle (2-3 dakika bekle)
- [ ] Container başarıyla başladı mı kontrol et

---

## 📋 Adım 2: SearXNG'yi Test Et

### A. Health Check

```bash
curl http://searxng-pwcsc8ow08oks0ggokwoo8ww.77.42.68.4.sslip.io/healthz
```

- [ ] Yanıt: `OK` veya `200 OK`

### B. Test Arama

```bash
curl "http://searxng-pwcsc8ow08oks0ggokwoo8ww.77.42.68.4.sslip.io/search?q=test&format=json"
```

- [ ] JSON formatında sonuç geldi
- [ ] `results` array'i dolu
- [ ] `unresponsive_engines` boş veya sadece devre dışı engine'ler

### C. Logları Kontrol Et

```bash
docker logs <searxng-container-name> | grep -E "CAPTCHA|timeout|ERROR" | tail -20
```

- [ ] DuckDuckGo CAPTCHA hatası yok
- [ ] Google timeout hatası yok
- [ ] Bing/Qwant/Brave çalışıyor

---

## 📋 Adım 3: AIHaberleri'ne Bağla

### A. Environment Variable Ekle

**Coolify'da:**

- [ ] AIHaberleri projesine git
- [ ] "Environment Variables" sekmesine git
- [ ] Yeni variable ekle:
  - Key: `SEARXNG_BASE_URL`
  - Value: `http://searxng-pwcsc8ow08oks0ggokwoo8ww.77.42.68.4.sslip.io`
- [ ] Kaydet

**Veya .env dosyasında:**

```bash
SEARXNG_BASE_URL=http://searxng-pwcsc8ow08oks0ggokwoo8ww.77.42.68.4.sslip.io
```

### B. Worker ve App'i Restart Et

**Coolify'da:**

- [ ] "Restart" butonuna tıkla

**Veya komut satırından:**

```bash
docker restart aihaberleri-worker
docker restart aihaberleri-app
```

---

## 📋 Adım 4: Entegrasyonu Test Et

### A. Worker Loglarını Kontrol Et

```bash
docker logs -f aihaberleri-worker | grep -E "SearXNG|CAPTCHA|timeout"
```

- [ ] SearXNG bağlantısı başarılı
- [ ] CAPTCHA hatası yok
- [ ] Timeout hatası yok

### B. Manuel Haber Oluşturma Testi

- [ ] Admin paneline git
- [ ] Manuel olarak bir haber oluştur
- [ ] Logları izle
- [ ] Haber başarıyla oluşturuldu
- [ ] SearXNG kullanıldı

---

## 📋 Adım 5: 1 Saat Sonra Kontrol

### A. Logları Kontrol Et

```bash
# SearXNG logları
docker logs <searxng-container> | grep -E "ERROR|WARNING|CAPTCHA" | tail -50

# Worker logları
docker logs aihaberleri-worker | grep -E "ERROR|CAPTCHA|timeout" | tail -50
```

- [ ] Hata yok
- [ ] CAPTCHA yok
- [ ] Timeout yok

### B. Metrics Kontrol Et

```bash
curl http://searxng-pwcsc8ow08oks0ggokwoo8ww.77.42.68.4.sslip.io/metrics | grep searx_search
```

- [ ] `searx_search_requests_total` artıyor
- [ ] `searx_search_errors_total` düşük (<%5)

---

## 📋 Adım 6: 24 Saat Sonra Stabilite Kontrolü

### A. Başarı Oranını Hesapla

```bash
# Worker loglarında SearXNG kullanımı
total=$(docker logs aihaberleri-worker | grep "SearXNG" | wc -l)
errors=$(docker logs aihaberleri-worker | grep -E "CAPTCHA|timeout" | wc -l)
echo "Total: $total, Errors: $errors"
```

- [ ] Başarı oranı: >%95
- [ ] CAPTCHA hatası: 0
- [ ] Timeout hatası: <5

### B. Haber Oluşturma Kontrolü

- [ ] Son 24 saatte oluşturulan haber sayısı normal
- [ ] Haber kalitesi iyi
- [ ] Görsel oluşturma başarılı

---

## 🔄 Rollback (Sorun Çıkarsa)

### SearXNG Tarafı

- [ ] Eski `settings.yml` backup'ını geri yükle
- [ ] Redeploy et

### AIHaberleri Tarafı

- [ ] `SEARXNG_BASE_URL` variable'ını sil veya yorum satırı yap
- [ ] Worker ve app'i restart et
- [ ] Eski Brave/Tavily sistemine dön

---

## ✅ Başarı Kriterleri

Tüm bunlar sağlanmalı:

- [x] SearXNG container çalışıyor
- [x] Health check başarılı
- [x] Test arama başarılı
- [x] DuckDuckGo CAPTCHA hatası yok
- [x] Google timeout hatası yok
- [x] AIHaberleri SearXNG'ye bağlandı
- [x] Worker loglarında hata yok
- [x] Haber oluşturma başarılı
- [x] 24 saat stabil çalışıyor

---

## 📞 Yardım

Sorun yaşarsan:

1. **Logları kontrol et** (yukarıdaki komutlar)
2. **Health check yap** (curl komutları)
3. **Rollback yap** (yukarıdaki adımlar)
4. **Dokümantasyona bak** (`SEARXNG-OPTIMIZATION-STEPS.md`)

---

**Başarılar! 🚀**
