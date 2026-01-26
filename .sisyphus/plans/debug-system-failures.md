# Plan: Sistem Hatalarını Giderme ve TDD Uygulaması

## Bağlam

### Orijinal İstek
Kullanıcı; rotalama (404), Google AdSense (400), TTS API (500) ve ses oynatma hatalarını içeren bir dizi sistem arızasını bildirdi.

### Görüşme Özeti
**Kritik Kararlar**:
- **Test Stratejisi**: TDD (Test Driven Development) - Önce hataları gösteren testler yazılacak, ardından düzeltme yapılacak.
- **Dil**: Tüm iletişim ve plan Türkçe dilinde olacak.

**Araştırma Bulguları**:
- `/news` ve `/categories` sayfaları eksik, ancak menüde linkleri var.
- Reklam slot ID'leri numerik olması gerekirken placeholder stringler kullanılmış.
- TTS servisi gayri resmi bir API kullanıyor ve hata durumunda geçerli bir ses dosyası yerine hata mesajı döndürüyor.

---

## İş Hedefleri

### Temel Hedef
Sistem genelindeki 404, 400 ve 500 hatalarını gidermek ve ses oynatıcısının kararlı çalışmasını sağlamak.

### Somut Çıktılar
- `src/app/news/page.tsx` ve `src/app/category/page.tsx` (Yeni index sayfaları)
- `.env` ve `src/app/news/[slug]/page.tsx` güncellemeleri (Reklam ID'leri)
- `src/lib/edge-tts.ts` ve `src/app/api/tts/route.ts` güncellemeleri (Hata yakalama)
- Playwright E2E ve Jest birim testleri.

---

## Doğrulama Stratejisi (TDD)

### Test Kararı
- **Altyapı Mevcut**: EVET (Jest, Playwright)
- **Yaklaşım**: TDD (Red-Green-Refactor)
- **Çerçeve**: Jest (API/Logic), Playwright (E2E/Routing)

### TDD İş Akışı
Her TODO şu adımları takip eder:
1. **RED**: Hatayı kanıtlayan başarısız testi yaz.
2. **GREEN**: Testi geçirecek minimum kodu yaz.
3. **REFACTOR**: Kodu temizle ve testin hala geçtiğini doğrula.

---

## TODO Listesi

- [ ] 1. **Yönlendirme (404) Hatalarını Tespit Et ve Gider**
  **Yapılacaklar**:
  - `tests/e2e/routing.spec.ts` dosyası oluştur ve `/news` ile `/categories` sayfalarına erişimi test et (Şu an fail etmeli).
  - `src/app/news/page.tsx` ve `src/app/category/page.tsx` dosyalarını oluştur.
  - `src/config/site.ts` içindeki `/categories` linkini `/category` olarak düzelt.
  **Kabul Kriterleri**:
  - Playwright testi `PASSED` olmalı.

- [ ] 2. **AdSense (400) Hatalarını Gider**
  **Yapılacaklar**:
  - `src/app/news/[slug]/page.tsx` içindeki AdSense slot çağrılarını kontrol eden bir birim testi yaz.
  - Slot ID'lerini `process.env` üzerinden alacak şekilde güncelle.
  - `.env.example` dosyasına örnek numerik ID'leri ekle.
  **Kabul Kriterleri**:
  - Network sekmesinde AdSense istekleri 400 yerine 200 (veya 403 - account mismatch) dönmeli.

- [ ] 3. **TTS (500) API Hatalarını Gider**
  **Yapılacaklar**:
  - `src/app/api/tts/route.test.ts` oluştur ve API'nin hata durumunda JSON yerine sessiz bir ses veya anlamlı bir hata kodu döndürdüğünü test et.
  - `src/lib/edge-tts.ts` içine WebSocket timeout ve boş veri kontrolü ekle.
  **Kabul Kriterleri**:
  - API fail ettiğinde 500 JSON yerine uygun bir ses/durum kodu dönmeli.

- [ ] 4. **Ses Oynatıcı (Playback) Hatasını Gider**
  **Yapılacaklar**:
  - `src/components/AudioPlayer.tsx` içinde ses kaynağının `type="audio/mpeg"` olduğunu doğrulayan bir test ekle.
  - Oynatıcıya hata durumunda kullanıcıya bilgi veren bir uyarı (toast) ekle.
  **Kabul Kriterleri**:
  - `NotSupportedError` yerine kullanıcı dostu bir hata mesajı görünmeli.

---

## Başarı Kriterleri
- [ ] Tüm Playwright testleri geçiyor.
- [ ] Tarayıcı konsolunda 404, 400 ve 500 hataları görünmüyor.
- [ ] Ses oynatıcısı bozuk veri geldiğinde çökmüyor.
