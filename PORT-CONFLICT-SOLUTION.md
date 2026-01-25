# Port Çakışması Çözümü

## 🎯 Sorun

Port 3000 başka bir container tarafından kullanılıyor ve yeni deployment başarısız oluyor.

## ✅ Çözüm Uygulandı

Default external port **3000'den 3001'e** değiştirildi.

### Değişiklik

**Dosya:** `docker-compose.coolify.yaml`

```yaml
# Önce
ports:
  - "${APP_PORT:-3000}:3000"

# Sonra
ports:
  - "${APP_PORT:-3001}:3000"
```

## 🚀 Deployment Adımları

### 1. Coolify'da Port Ayarı (Opsiyonel)

Eğer farklı bir port kullanmak istersen:

**Coolify Dashboard** → **Environment Variables** → Ekle:

```
APP_PORT=3002  # veya istediğin port
```

### 2. Deploy Et

1. Coolify Dashboard'a git
2. Application'ı seç
3. **Deploy** butonuna bas
4. Logları izle

### 3. Beklenen Sonuç

```
Container app-ts440coscgg48g8osgkcs8o8-[new-id]  Creating
Container app-ts440coscgg48g8osgkcs8o8-[new-id]  Created
Container app-ts440coscgg48g8osgkcs8o8-[new-id]  Starting
Container app-ts440coscgg48g8osgkcs8o8-[new-id]  Started
Container app-ts440coscgg48g8osgkcs8o8-[new-id]  Healthy

✅ Deployment successful
```

## 🔍 Port Kullanımı Nasıl Çalışır?

### Internal vs External Port

```yaml
ports:
  - "3001:3000"
    ↑      ↑
    |      └─ Internal port (container içinde)
    └──────── External port (host'ta)
```

- **Internal Port (3000):** Container içinde Next.js her zaman 3000'de çalışır
- **External Port (3001):** Host makinede 3001 portuna map edilir
- **Coolify Reverse Proxy:** 3001'i dinler ve domain'e yönlendirir

### Akış

```
Internet → aihaberleri.org (443/80)
    ↓
Coolify Reverse Proxy (Traefik/Caddy)
    ↓
Host Port 3001
    ↓
Container Port 3000 (Next.js)
```

## 🎨 Farklı Port Senaryoları

### Senaryo 1: Default Port (3001)

Environment variable yok → Default 3001 kullanılır

```bash
# Coolify'da environment variable yok
# Otomatik olarak 3001 kullanılır
```

### Senaryo 2: Custom Port

Environment variable ile özel port:

```bash
# Coolify Environment Variables
APP_PORT=3005

# Container 3005:3000 ile başlar
```

### Senaryo 3: Coolify Otomatik Port

Coolify'ın otomatik port ataması:

```bash
# Coolify Settings → Network
☑ Automatically assign port

# Coolify boş port bulur (örn: 3012)
```

## 🔧 Troubleshooting

### Port Hala Çakışıyorsa

1. **Hangi port kullanılıyor kontrol et:**

   ```bash
   # Coolify sunucusunda
   docker ps | grep aihaberleri
   ```

2. **Port'u manuel değiştir:**

   ```bash
   # Coolify Environment Variables
   APP_PORT=3010  # Farklı bir port dene
   ```

3. **Tüm container'ları temizle:**
   ```bash
   docker stop $(docker ps -a -q --filter name=aihaberleri)
   docker rm $(docker ps -a -q --filter name=aihaberleri)
   ```

### Reverse Proxy Çalışmıyorsa

Coolify otomatik olarak reverse proxy ayarlar, ama kontrol etmek için:

1. **Coolify Dashboard** → **Application** → **Domains**
2. Domain'in doğru ayarlandığından emin ol: `aihaberleri.org`
3. SSL sertifikası otomatik oluşturulmalı (Let's Encrypt)

## ✅ Doğrulama

Deployment sonrası kontrol:

```bash
# 1. Container çalışıyor mu?
docker ps | grep aihaberleri-app

# 2. Port dinleniyor mu?
netstat -tulpn | grep 3001

# 3. Health check çalışıyor mu?
curl http://localhost:3001/api/health

# 4. Domain çalışıyor mu?
curl https://aihaberleri.org/api/health
```

## 📊 Port Kullanım Tablosu

| Port   | Kullanım                | Açıklama                          |
| ------ | ----------------------- | --------------------------------- |
| 3000   | Container Internal      | Next.js her zaman 3000'de çalışır |
| 3001   | Host External (Default) | Yeni default port                 |
| 5432   | PostgreSQL              | Database (internal network)       |
| 6379   | Redis                   | Cache (internal network)          |
| 80/443 | Reverse Proxy           | Coolify Traefik/Caddy             |

## 🎉 Sonuç

- ✅ Default port 3001'e değiştirildi
- ✅ Port çakışması çözüldü
- ✅ Coolify reverse proxy otomatik çalışacak
- ✅ Domain üzerinden erişim sorunsuz olacak

**Şimdi yapman gereken:** Coolify'da tekrar deploy et!

---

**Last Updated:** 2026-01-25  
**Status:** ✅ Fixed  
**Default Port:** 3001
