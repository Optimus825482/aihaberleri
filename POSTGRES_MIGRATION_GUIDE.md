# 🗄️ PostgreSQL'i Production Environment'ına Taşıma Rehberi

## 📋 Mevcut Durum

| Servis | Environment | Durum |
|--------|-------------|-------|
| AIHABERLERI (app + worker + redis) | `AIHABER > production` | ❌ unhealthy (10x restart) |
| AIHABER-POSTGRES | `AIHABER > postgresql-aihaber` | ✅ healthy |

**Sorun:** App ve Database farklı Coolify environment'larında = farklı Docker network'ler = birbirlerini göremiyorlar.

**Hedef:** PostgreSQL'i `production` environment'ına taşıyarak aynı Docker network'e almak.

---

## 🛡️ ADIM 1: Veritabanı Yedeği Al (ÇOK ÖNEMLİ)

### 1.1 Coolify Terminal'den Yedek

1. Coolify panelinde `AIHABER-POSTGRES` servisine git
2. **Terminal** sekmesine tıkla
3. Aşağıdaki komutu çalıştır:

```bash
pg_dump -U postgres -d postgresainewsdb -F c -f /tmp/backup_$(date +%Y%m%d_%H%M%S).dump
```

### 1.2 Yedeği Sunucuya Kopyala

Coolify Terminal'den:

```bash
# Yedek dosyasının adını kontrol et
ls -la /tmp/backup_*.dump
```

### 1.3 Alternatif: SQL formatında yedek

```bash
pg_dump -U postgres -d postgresainewsdb > /tmp/backup_full.sql
```

> ⚠️ **BU ADIMI ATLAMA! Veri kaybı geri alınamaz.**

---

## 📦 ADIM 2: Production Environment'ına Yeni PostgreSQL Ekle

1. Coolify panelinde **AIHABER** projesine git
2. **production** environment'ına tıkla
3. **+ New** butonuna tıkla
4. **Database** → **PostgreSQL** seç
5. Aşağıdaki ayarları gir:

| Alan | Değer |
|------|-------|
| **Name** | `postgres-production` |
| **Image** | `postgres:17-alpine` |
| **Username** | `postgres` |
| **Password** | `518518Erkan` |
| **Initial Database** | `postgresainewsdb` |

6. **Custom Docker Options** alanına:
```
--cap-add SYS_ADMIN --device=/dev/fuse --security-opt apparmor:unconfined --ulimit nofile=1024:1024 --tmpfs /run:rw,noexec,nosuid,size=65536k
```

7. **Port Mappings** alanını **BOŞ BIRAKIN** (internal erişim yeterli)
8. **Public** yapma → Sadece internal erişim
9. **Save** ve **Start** tıkla
10. Servisin **Running (healthy)** olmasını bekle

---

## 🔗 ADIM 3: Yeni Internal URL'yi Al

1. Yeni oluşturulan `postgres-production` servisine git
2. **Configuration** → **Network** bölümünde **Postgres URL (internal)** değerini kopyala
3. Format şu şekilde olacak:

```
postgres://postgres:518518Erkan@YENI_HOSTNAME:5432/postgresainewsdb
```

> 📝 `YENI_HOSTNAME` kısmını not al (örn: `abc123def456...`)

---

## 📥 ADIM 4: Veritabanını Yeni Servise Aktar

### 4.1 Eski veritabanından yedeği al (ADIM 1'de yaptıysanız atlayın)

Coolify'da **AIHABER-POSTGRES** (eski) Terminal'inden:

```bash
pg_dump -U postgres -d postgresainewsdb -F c -f /tmp/backup_migration.dump
```

### 4.2 Yedeği sunucu üzerinden yeni container'a kopyala

Coolify sunucunuzun **SSH Terminal**'inden (veya Coolify > Servers > localhost > Terminal):

```bash
# Eski container adını bul
docker ps | grep postgres

# Yedeği eski container'dan sunucuya kopyala
docker cp ESKİ_CONTAINER_ADI:/tmp/backup_migration.dump /tmp/backup_migration.dump

# Yedeği yeni container'a kopyala
docker cp /tmp/backup_migration.dump YENI_CONTAINER_ADI:/tmp/backup_migration.dump
```

### 4.3 Yeni container'da restore et

Coolify'da **postgres-production** (yeni) Terminal'inden:

```bash
# Önce mevcut boş veritabanını düşür ve yeniden oluştur
dropdb -U postgres postgresainewsdb
createdb -U postgres postgresainewsdb

# Yedeği restore et
pg_restore -U postgres -d postgresainewsdb -F c /tmp/backup_migration.dump

# Kontrol et
psql -U postgres -d postgresainewsdb -c "SELECT COUNT(*) FROM articles;"
```

### 4.4 Shadow database oluştur (Prisma için)

```bash
createdb -U postgres postgresainewsdb_shadow
```

---

## ⚙️ ADIM 5: Environment Variables Güncelle

### 5.1 Coolify'da AIHABERLERI → Environment Variables

`DATABASE_URL` değerini yeni internal URL ile güncelle:

```env
DATABASE_URL=postgres://postgres:518518Erkan@YENI_HOSTNAME:5432/postgresainewsdb?schema=public&connection_limit=10&pool_timeout=20&connect_timeout=10
```

> ⚠️ `YENI_HOSTNAME` yerine ADIM 3'te aldığınız hostname'i yazın!

### 5.2 Yerel .env dosyasını güncelle (opsiyonel)

Yerel geliştirme için `DATABASE_URL_COOLFY` kullanılıyor, dokunmaya gerek yok.
Ama production URL'yi de not olarak güncelleyin:

```env
# Production (Coolify internal)
DATABASE_URL="postgres://postgres:518518Erkan@YENI_HOSTNAME:5432/postgresainewsdb?schema=public&connection_limit=10&pool_timeout=20&connect_timeout=10"
SHADOW_DATABASE_URL="postgres://postgres:518518Erkan@YENI_HOSTNAME:5432/postgresainewsdb_shadow?schema=public&connection_limit=10&pool_timeout=20&connect_timeout=10"
```

---

## 🚀 ADIM 6: Redeploy & Test

### 6.1 Redeploy

1. Coolify'da **AIHABERLERI** servisine git
2. **Redeploy** butonuna tıkla
3. Deployment loglarını takip et

### 6.2 Kontrol Listesi

- [ ] App container **Running (healthy)** mı?
- [ ] Restart sayısı artmıyor mu?
- [ ] `https://aihaberleri.org` açılıyor mu?
- [ ] Haberler listeleniyor mu?
- [ ] Admin paneli çalışıyor mu?

### 6.3 Logları kontrol et

Coolify → AIHABERLERI → Logs → `app-...` container loglarını aç:

```
✅ Beklenen: "Ready on http://0.0.0.0:3001"
❌ Hata varsa: "PrismaClientInitializationError" veya "ECONNREFUSED"
```

---

## 🧹 ADIM 7: Eski Database'i Temizle

> ⚠️ BU ADIMI SADECE HER ŞEY ÇALIŞTIĞINDA YAPIN!

1. `https://aihaberleri.org` en az **24 saat** sorunsuz çalıştığını doğrula
2. Coolify → `AIHABER > postgresql-aihaber` → **AIHABER-POSTGRES**
3. **Stop** tıkla
4. 1 gün daha bekle, sorun yoksa **Delete** tıkla
5. `postgresql-aihaber` environment'ı boşsa → **Delete Environment**

---

## 🔧 Sorun Giderme

### Hata: "ECONNREFUSED"
```
Sebep: Yeni PostgreSQL henüz başlamamış veya hostname yanlış
Çözüm: Yeni PostgreSQL servisinin "Running (healthy)" olduğunu doğrula
```

### Hata: "password authentication failed"
```
Sebep: Şifre yanlış
Çözüm: Yeni PostgreSQL'in şifresini kontrol et (518518Erkan)
```

### Hata: "database does not exist"
```
Sebep: Restore yapılmamış veya database adı yanlış
Çözüm: ADIM 4'ü tekrarla
```

### Hata: "relation does not exist"
```
Sebep: Restore başarısız olmuş, tablolar oluşmamış
Çözüm: Prisma migration çalıştır:
  - Coolify → AIHABERLERI → Terminal → app container
  - npx prisma db push --force-reset
  - Sonra ADIM 4'ü tekrarla (veri restore)
```

---

## 📊 Özet Zaman Çizelgesi

| Adım | Süre | Risk |
|------|------|------|
| 1. Yedek al | 5 dk | Düşük |
| 2. Yeni PostgreSQL ekle | 3 dk | Düşük |
| 3. Internal URL al | 1 dk | Düşük |
| 4. Veri aktar | 10 dk | Orta |
| 5. ENV güncelle | 2 dk | Düşük |
| 6. Redeploy & test | 10 dk | Orta |
| 7. Eski DB temizle | 1 dk | - |
| **Toplam** | **~30-45 dk** | |

---

> 💡 **İpucu:** Her adımdan sonra durumu kontrol edin. Acele etmeyin.
> Herhangi bir adımda takılırsanız, ekran görüntüsü paylaşın.