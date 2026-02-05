# 🚀 Sunucuda Çalıştırılacak Komutlar

## Container ID: 28f19417ef06

---

## 1️⃣ Prisma Client Generate Et

```bash
docker exec 28f19417ef06 npx prisma generate
```

**Beklenen Çıktı:**

```
✔ Generated Prisma Client (5.22.0) to ./node_modules/@prisma/client
```

---

## 2️⃣ Container'ı Restart Et

```bash
docker restart 28f19417ef06
```

**Beklenen Çıktı:**

```
28f19417ef06
```

---

## 3️⃣ Container Log'larını Kontrol Et (Opsiyonel)

```bash
docker logs -f 28f19417ef06 --tail 50
```

**Ctrl+C** ile çıkabilirsin.

---

## 4️⃣ Prisma Client'ın Güncellendiğini Doğrula (Opsiyonel)

```bash
docker exec 28f19417ef06 cat node_modules/.prisma/client/index.d.ts | grep googleIndexStatus
```

**Beklenen Çıktı:**

```
googleIndexStatus?: IndexStatus | null
googleIndexedAt?: Date | null
```

Eğer bu satırları görüyorsan ✅ başarılı!

---

## ✅ Test Et

1. Tarayıcıda aç: https://aihaberleri.org/admin/seo-notifications
2. "Hepsini Google'a Gönder" butonuna bas
3. Realtime log'ları izle
4. Batch processing'in çalıştığını gör

---

## 📊 Beklenen Sonuç

✅ Prisma client `googleIndexStatus` kolonunu tanıyacak
✅ TypeScript hataları kaybolacak
✅ "Hepsini Google'a Gönder" butonu çalışacak
✅ Batch processing (100 URL/batch) aktif olacak
✅ Rate limiting (2 saniye/batch) çalışacak
✅ Quota exceeded (429) detection çalışacak

---

## 🎯 Özet

**Sadece bu 2 komutu çalıştır:**

```bash
docker exec 28f19417ef06 npx prisma generate
docker restart 28f19417ef06
```

**Sonra test et:**
https://aihaberleri.org/admin/seo-notifications

---

## ⚠️ Önemli Notlar

- **Günlük Limit:** Google Indexing API günde 200 URL
- **Batch Size:** 100 URL/batch (hız için)
- **Rate Limiting:** Batch'ler arası 2 saniye
- **Quota Exceeded:** 429 hatası gelirse işlem durur
- **Yarın Tekrar:** Quota dolduğunda yarın tekrar butonuna bas

---

**Hazır! Komutları çalıştır ve test et! 🚀**
