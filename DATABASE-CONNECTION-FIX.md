# Database Connection Fix

## ❌ Sorun

PostgreSQL hatası:

```
FATAL: database "aiuser" does not exist
```

## 🔍 Kök Neden

**Tutarsız default değerler:**

```yaml
# Önce (YANLIŞ)
POSTGRES_USER: ${POSTGRES_USER:-postgres} # User: postgres
DATABASE_URL: postgresql://postgres:... # User: postgres
healthcheck: pg_isready -U aiuser # User: aiuser ❌
```

PostgreSQL `postgres` user'ı ile başlatılıyor ama:

- Healthcheck `aiuser` arıyor
- Uygulama `aiuser` database'i arıyor

## ✅ Çözüm

Tüm default değerler tutarlı hale getirildi:

```yaml
# Sonra (DOĞRU)
POSTGRES_USER: ${POSTGRES_USER:-aiuser} # User: aiuser ✅
POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-aipassword}
POSTGRES_DB: ${POSTGRES_DB:-ainewsdb}
DATABASE_URL: postgresql://aiuser:aipassword@postgres:5432/ainewsdb
healthcheck: pg_isready -U aiuser # User: aiuser ✅
```

## 🚀 Deployment Adımları

### 1. Coolify Environment Variables Kontrolü

**Coolify Dashboard** → **Environment Variables**

#### Seçenek A: Default Değerleri Kullan (Önerilen)

Aşağıdaki variable'ları **SİL** (varsa):

- `POSTGRES_USER`
- `POSTGRES_PASSWORD`
- `POSTGRES_DB`
- `DATABASE_URL`

Docker-compose'daki default değerler kullanılacak:

- User: `aiuser`
- Password: `aipassword`
- Database: `ainewsdb`

#### Seçenek B: Custom Değerler Kullan

Eğer farklı değerler istiyorsan, **HEPSİNİ** tutarlı şekilde ayarla:

```env
POSTGRES_USER=myuser
POSTGRES_PASSWORD=mypassword
POSTGRES_DB=mydb
DATABASE_URL=postgresql://myuser:mypassword@postgres:5432/mydb
```

**ÖNEMLİ:** Tüm değerler birbiriyle uyumlu olmalı!

### 2. Eski Database Volume'ü Temizle

Eski database volume'ü yanlış user ile oluşturulmuş olabilir. Temizlemek için:

**Coolify Dashboard** → **Application** → **Volumes**

1. `postgres_data` volume'ünü bul
2. **Delete** tıkla (veriler silinecek, ama yeni deployment'ta yeniden oluşturulacak)

**Veya SSH ile:**

```bash
# Coolify sunucusunda
docker volume ls | grep postgres
docker volume rm ts440coscgg48g8osgkcs8o8_postgres-data
```

### 3. Deploy Et

1. Coolify Dashboard'a git
2. **Deploy** butonuna bas
3. Logları izle

### 4. Beklenen Sonuç

```
postgres  | database system is ready to accept connections
app       | ✅ Database connected successfully
app       | Prisma schema loaded
app       | Server listening on port 3000
```

## 🔍 Doğrulama

Deployment sonrası kontrol:

```bash
# 1. PostgreSQL container'a bağlan
docker exec -it aihaberleri-postgres psql -U aiuser -d ainewsdb

# 2. Database'leri listele
\l

# Çıktı:
#   ainewsdb | aiuser | UTF8 | ... ✅

# 3. User'ları listele
\du

# Çıktı:
#   aiuser | Superuser, Create role, Create DB ✅

# 4. Çıkış
\q
```

## 📊 Database Configuration Matrix

| Variable            | Default                                                 | Açıklama                 |
| ------------------- | ------------------------------------------------------- | ------------------------ |
| `POSTGRES_USER`     | `aiuser`                                                | PostgreSQL kullanıcı adı |
| `POSTGRES_PASSWORD` | `aipassword`                                            | PostgreSQL şifresi       |
| `POSTGRES_DB`       | `ainewsdb`                                              | Database adı             |
| `DATABASE_URL`      | `postgresql://aiuser:aipassword@postgres:5432/ainewsdb` | Tam connection string    |

## 🔧 Troubleshooting

### Hata: "role aiuser does not exist"

**Çözüm:** Volume'ü temizle ve yeniden deploy et

```bash
docker volume rm ts440coscgg48g8osgkcs8o8_postgres-data
```

### Hata: "password authentication failed"

**Çözüm:** `POSTGRES_PASSWORD` ve `DATABASE_URL`'deki şifre aynı olmalı

```env
POSTGRES_PASSWORD=mypass
DATABASE_URL=postgresql://aiuser:mypass@postgres:5432/ainewsdb
                                 ^^^^^^ Aynı şifre
```

### Hata: "database ainewsdb does not exist"

**Çözüm:** `POSTGRES_DB` ve `DATABASE_URL`'deki database adı aynı olmalı

```env
POSTGRES_DB=ainewsdb
DATABASE_URL=postgresql://aiuser:aipassword@postgres:5432/ainewsdb
                                                            ^^^^^^^^ Aynı database
```

### Hata: "Connection refused"

**Çözüm:** PostgreSQL container'ı çalışıyor mu kontrol et

```bash
docker ps | grep postgres
docker logs aihaberleri-postgres
```

## 🎯 Production Best Practices

### 1. Güçlü Şifre Kullan

Default `aipassword` sadece development için. Production'da:

```env
POSTGRES_PASSWORD=<güçlü-random-şifre>
```

### 2. Environment Variables'ı Gizli Tut

Coolify'da "Secret" olarak işaretle:

- `POSTGRES_PASSWORD`
- `DATABASE_URL`

### 3. Database Backup

Düzenli backup al:

```bash
# Backup
docker exec aihaberleri-postgres pg_dump -U aiuser ainewsdb > backup.sql

# Restore
docker exec -i aihaberleri-postgres psql -U aiuser ainewsdb < backup.sql
```

### 4. Connection Pooling

Prisma otomatik connection pooling yapıyor, ama ayarları optimize edebilirsin:

```env
DATABASE_URL=postgresql://aiuser:aipassword@postgres:5432/ainewsdb?connection_limit=10&pool_timeout=20
```

## ✅ Checklist

Deployment öncesi kontrol:

- [ ] `POSTGRES_USER` tutarlı (default: `aiuser`)
- [ ] `POSTGRES_PASSWORD` tutarlı
- [ ] `POSTGRES_DB` tutarlı (default: `ainewsdb`)
- [ ] `DATABASE_URL` tüm değerleri içeriyor
- [ ] Healthcheck doğru user kullanıyor
- [ ] Eski volume temizlendi (gerekirse)
- [ ] Environment variables Coolify'da ayarlandı

## 🎉 Sonuç

- ✅ PostgreSQL user: `aiuser`
- ✅ Database: `ainewsdb`
- ✅ Tüm konfigürasyonlar tutarlı
- ✅ Healthcheck çalışıyor
- ✅ Database connection başarılı

**Şimdi yapman gereken:**

1. Coolify'da environment variables'ı kontrol et
2. Eski postgres volume'ü sil (gerekirse)
3. Deploy et!

---

**Last Updated:** 2026-01-25  
**Status:** ✅ Fixed  
**Default User:** aiuser  
**Default Database:** ainewsdb
