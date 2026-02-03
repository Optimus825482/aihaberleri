# ⚡ SearXNG Hızlı Başlangıç

**5 dakikada production'a deploy et!**

---

## 🚀 Hızlı Deployment

### 1. Environment Variables Ekle

`.env` dosyasına ekle:

```bash
SEARXNG_SECRET_KEY=ec0784fbefa3ab05139541fc2653164877bfc29f18fa60d022305c2c086f0c6
SEARXNG_BASE_URL=http://aihaberleri-searxng:8080
```

### 2. Secret Key Güncelle

`searxng/settings.yml` dosyasında:

```yaml
server:
  secret_key: "ec0784fbefa3ab05139541fc2653164877bfc29f18fa60d022305c2c086f0c6"
```

### 3. Deploy

```bash
# Servisleri başlat
docker-compose -f docker-compose.coolify.yaml up -d valkey searxng

# Logları izle
docker-compose -f docker-compose.coolify.yaml logs -f searxng
```

### 4. Test

```bash
# Health check
curl http://localhost:8080/healthz

# Test arama
curl "http://localhost:8080/search?q=test&format=json"
```

### 5. Worker ve App'i Yeniden Başlat

```bash
docker-compose -f docker-compose.coolify.yaml restart worker app
```

---

## ✅ Başarı Kontrolü

```bash
# SearXNG çalışıyor mu?
docker ps | grep searxng

# Valkey çalışıyor mu?
docker ps | grep valkey

# Worker loglarında hata var mı?
docker-compose -f docker-compose.coolify.yaml logs worker | grep -E "CAPTCHA|timeout"
```

**Hata yoksa başarılı! 🎉**

---

## 🔄 Rollback (Sorun Çıkarsa)

```bash
# SearXNG'yi durdur
docker-compose -f docker-compose.coolify.yaml stop searxng valkey

# .env'den SEARXNG satırlarını kaldır

# Worker ve app'i yeniden başlat
docker-compose -f docker-compose.coolify.yaml restart worker app
```

---

**Detaylı bilgi için:** `SEARXNG-DEPLOYMENT-GUIDE.md`
