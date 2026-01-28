# 📘 Facebook Otomatik Paylaşım Kurulum Rehberi

Bu rehber, AI Haberleri sitesi için Facebook Page otomasyonu kurulumunu adım adım açıklamaktadır.

---

## 📌 Genel Bakış

| Adım | İşlem                     | Süre  |
| ---- | ------------------------- | ----- |
| 1    | Facebook Developer Hesabı | 5 dk  |
| 2    | App Oluşturma             | 10 dk |
| 3    | Facebook Sayfası Bağlama  | 5 dk  |
| 4    | Access Token Alma         | 10 dk |
| 5    | Environment Variables     | 5 dk  |

**Toplam Süre:** ~35 dakika

---

## 🔹 ADIM 1: Facebook Developer Hesabı

### 1.1 Developer Portal'a Git

1. **[developers.facebook.com](https://developers.facebook.com)** adresine git
2. Sağ üstten **"Get Started"** veya **"Log In"** tıkla
3. Facebook hesabınla giriş yap

### 1.2 Developer Hesabını Aktifleştir

1. **"Get Started"** butonuna tıkla
2. **"Continue"** → Email doğrulama yap
3. Telefon numarası doğrulama (SMS kodu gelecek)
4. **"Developer"** rolünü kabul et

✅ **Sonuç:** Developer Dashboard'a erişim sağlandı

---

## 🔹 ADIM 2: Facebook App Oluşturma

### 2.1 Yeni App Oluştur

1. **[developers.facebook.com/apps](https://developers.facebook.com/apps)** adresine git
2. **"Create App"** butonuna tıkla
3. **Use case seç:** `Other` → **Next**
4. **App type seç:** `Business` → **Next**
5. **App bilgilerini doldur:**
   - **App name:** `AI Haberleri Bot`
   - **App contact email:** `info@aihaberleri.org`
   - **Business Account:** (Opsiyonel, atlayabilirsin)
6. **"Create App"** → Şifre girişi yap

### 2.2 Gerekli Ürünleri Ekle

1. App Dashboard'da sol menüden **"Add Product"** tıkla
2. Aşağıdaki ürünleri ekle:
   - **"Facebook Login"** → **"Set Up"**
   - **"Pages API"** → **"Set Up"** (varsa)

---

## 🔹 ADIM 3: Facebook Sayfası

### 3.1 Sayfa Yoksa Oluştur

1. **[facebook.com/pages/create](https://facebook.com/pages/create)** adresine git
2. **"Business or Brand"** seç
3. **Sayfa adı:** `AI Haberleri`
4. **Kategori:** `News & Media Website`
5. Profil ve kapak fotoğrafı ekle
6. **"Oluştur"** tıkla

### 3.2 Sayfa ID'sini Al

1. Oluşturduğun sayfaya git
2. **About (Hakkında)** sekmesine tıkla
3. Sayfanın en altında **"Page ID"** veya **"Sayfa Kimliği"** yazar
4. Bu ID'yi kopyala ve bir yere not et

> **Alternatif:** URL'den de bulabilirsin: `facebook.com/YourPageName` → ID genellikle sayfa ayarlarında görünür

### 3.3 Sayfayı App'e Bağla

1. Developer Dashboard → App'in → **Settings** → **Basic**
2. Aşağı kaydır → **"Add Platform"** → **"Website"**
3. **Site URL:** `https://aihaberleri.org`
4. **"Save Changes"** tıkla

---

## 🔹 ADIM 4: Access Token Alma (EN ÖNEMLİ)

### 4.1 Graph API Explorer'ı Aç

1. **[developers.facebook.com/tools/explorer](https://developers.facebook.com/tools/explorer)** adresine git
2. Sağ üst köşeden **App'ini seç** (AI Haberleri Bot)
3. **"User or Page"** dropdown'ından → **"Get Page Access Token"** seç

### 4.2 Gerekli İzinleri Seç

Sağ tarafta **"Add Permission"** butonuna tıkla ve aşağıdaki izinleri ekle:

```
pages_show_list
pages_read_engagement
pages_manage_posts
pages_read_user_content
```

### 4.3 Token Oluştur

1. **"Generate Access Token"** butonuna tıkla
2. Facebook'a giriş yap → Açılan pencerede izinleri onayla
3. **Sayfanı seç** (AI Haberleri)
4. **"Done"** tıkla
5. Oluşan token'ı kopyala

> ⚠️ **DİKKAT:** Bu token **kısa süreli** (1-2 saat geçerli). Bir sonraki adımda uzun süreli token'a çevireceğiz.

### 4.4 Uzun Süreli Token'a Çevir (ÇOK ÖNEMLİ!)

Kısa süreli token 1-2 saat sonra expire olur. **Kalıcı token** için:

1. **[developers.facebook.com/tools/debug/accesstoken](https://developers.facebook.com/tools/debug/accesstoken)** adresine git
2. Token kutusuna az önce kopyaladığın token'ı yapıştır
3. **"Debug"** butonuna tıkla
4. Token bilgileri görünecek
5. **"Extend Access Token"** butonuna tıkla
6. Yeni oluşan **Long-lived Token**'ı kopyala

> ✅ Bu token **60 gün** geçerli. 60 gün sonra yenilemeniz gerekecek.

---

## 🔹 ADIM 5: Environment Variables

### 5.1 Local (.env dosyası)

`.env` dosyasına aşağıdaki satırları ekle:

```env
# Facebook API (FREE - Page posting)
FACEBOOK_ENABLED="true"
FACEBOOK_PAGE_ID="BURAYA_SAYFA_ID_YAZ"
FACEBOOK_PAGE_ACCESS_TOKEN="BURAYA_UZUN_SURELI_TOKEN_YAZ"
```

### 5.2 Coolify Environment Variables

Coolify dashboard'unda aynı değişkenleri ekle:

| Variable                     | Value             |
| ---------------------------- | ----------------- |
| `FACEBOOK_ENABLED`           | `true`            |
| `FACEBOOK_PAGE_ID`           | Sayfa ID'n        |
| `FACEBOOK_PAGE_ACCESS_TOKEN` | Uzun süreli token |

---

## 🔹 ADIM 6: Test Etme

### 6.1 Server'ı Yeniden Başlat

```bash
# Terminal'de Ctrl+C ile durdur
# Sonra tekrar çalıştır:
npm run dev
```

### 6.2 Haber Yayınla

Agent'ı çalıştır veya manuel haber yayınla. Log'larda şunları görmelisin:

```
📘 Posting to Facebook Page...
✅ Facebook post successful! ID: 123456789
```

### 6.3 Sayfayı Kontrol Et

Facebook sayfana git ve paylaşımın yapılıp yapılmadığını kontrol et.

---

## ❓ Sık Karşılaşılan Hatalar

### Token Expired (190 Error)

```
❌ Facebook API Error: Token expired
```

**Çözüm:** Adım 4.4'ü tekrarla ve yeni token al.

### Permission Denied (200 Error)

```
❌ Facebook API Error: Permission denied
```

**Çözüm:** Graph API Explorer'da `pages_manage_posts` iznini ekle.

### Page Not Found

```
❌ Facebook API Error: Page not found
```

**Çözüm:** `FACEBOOK_PAGE_ID` değerini kontrol et. Sayfa ID doğru olmalı.

### Content Policy Violation (368 Error)

```
❌ Facebook API Error: Content blocked
```

**Çözüm:** Paylaşım içeriğinde yasaklı kelimeler olabilir. Haber başlığını kontrol et.

---

## 📊 Maliyet

| Özellik                    | Maliyet      |
| -------------------------- | ------------ |
| Facebook Developer Account | **ÜCRETSİZ** |
| Graph API kullanımı        | **ÜCRETSİZ** |
| Page posting               | **ÜCRETSİZ** |

> ✅ Facebook Page posting tamamen **ücretsizdir**. Twitter'ın aksine ödeme gerektirmez.

---

## 🔄 Token Yenileme Hatırlatması

Long-lived token **60 gün** geçerlidir. Takvime hatırlatma ekle:

- [ ] 60 gün sonra token yenile
- [ ] Coolify'daki `FACEBOOK_PAGE_ACCESS_TOKEN` güncelle
- [ ] Server'ı yeniden deploy et

---

## 📁 İlgili Dosyalar

| Dosya                             | Açıklama                  |
| --------------------------------- | ------------------------- |
| `src/lib/social/facebook.ts`      | Facebook API entegrasyonu |
| `src/services/content.service.ts` | Haber yayınlama servisi   |
| `.env`                            | Environment variables     |

---

## ✅ Checklist

- [ ] Developer hesabı oluşturuldu
- [ ] App oluşturuldu (AI Haberleri Bot)
- [ ] Facebook sayfası oluşturuldu/bağlandı
- [ ] Page ID alındı
- [ ] İzinler eklendi (pages_manage_posts)
- [ ] Short-lived token alındı
- [ ] Long-lived token'a çevrildi
- [ ] .env dosyasına eklendi
- [ ] Coolify'a eklendi
- [ ] Test edildi ✅

---

**Sorularınız için:** Gemini'ye sorun! 🤖

### BÖLÜM 1: Facebook İçin "Sınırsız" (Asla Bitmeyen) Token Nasıl Alınır?

Facebook API'de tokenlar normalde 1-2 saatliktir. "Sınırsız" (Page Access Token) almak için şu adımları **manuel** olarak yapman gerekiyor (Bu bir kere yapılır):

1. **Meta for Developers** (developers.facebook.com) adresine git ve uygulamana gir.

2. **Graph API Explorer** aracını aç: https://developers.facebook.com/tools/explorer/

3. Sağ taraftan uygulamanı seç.

4. "Get Token" -> "Get User Access Token"

    

   de. Şu izinleri mutlaka seç:

   - ```
     pages_manage_posts
     ```

   - ```
     pages_read_engagement
     ```

   - ```
     public_profile
     ```

5. Token oluşunca, bu "Kısa Ömürlü User Token"dır.

6. Şimdi bunu "Uzun Ömürlü"ye çevireceğiz. Explorer'daki

    

   ```
   i
   ```

    

   (info) i butonuna bas,

    

   "Open in Access Token Tool"

    

   de.

7. Açılan sayfada **"Extend Access Token"** butonuna bas. Sana yeni bir (60 günlük) token verecek. **Bunu kopyala.**

8. Tekrar **Graph API Explorer**'a dön.

9. Kopyaladığın uzun ömürlü token'ı yapıştır.

10. Adres çubuğuna:

     

    ```
    me/accounts
    ```

     

    yaz ve "Submit" de.

11. Sonuçlarda yönettiğin sayfaları göreceksin. Sayfanın yanındaki

     

    ```
    access_token
    ```

     

    değerini al.

    - 🎯

       

      İŞTE BU!

       

      Bu token, sen şifreni değiştirmediğin sürece

       

      sonsuza kadar

       

      geçerlidir. Bunu

       

      ```
      .env
      ```

       

      dosyanı güncellemek için kullan.
