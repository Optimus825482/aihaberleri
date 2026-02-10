# Google AdSense Onay Planı — aihaberleri.org

> **Tarih:** 10 Şubat 2026  
> **Durum:** Daha önce AdSense ve Ezoic'ten red alındı  
> **Hedef:** AdSense incelemesinden olumlu sonuç almak  
> **Tahmini Süre:** 4-6 hafta

---

## Mevcut Durum Özeti

### ✅ Hazır Olan Alanlar

- Profesyonel tasarım, mobil uyumlu, hızlı yükleme
- SSL/HTTPS aktif
- Google Analytics (GA4) + Google Tag Manager entegre
- Sitemap.xml + news-sitemap.xml mevcut
- robots.txt düzgün yapılandırılmış
- Structured data (JSON-LD) kapsamlı (Organization, NewsArticle, FAQ, Breadcrumb)
- Open Graph + Twitter Card meta tag'leri
- Google Search Console doğrulanmış
- Gizlilik Politikası, Hizmet Şartları, SSS, Hakkımızda, İletişim sayfaları mevcut
- Footer'da tüm yasal ve navigasyon linkleri var
- Çift dil desteği (TR/EN) hreflang ile
- Arama fonksiyonu aktif
- Newsletter aboneliği + Push bildirim

### ❌ Eksik / Sorunlu Alanlar

- ads.txt dosyası yok
- AI-generated content orijinallik sorunu
- CMP (Consent Management Platform) yok — mevcut cookie banner çok basit
- Çerez Politikası ve KVKK sayfaları redirect ediyor, bağımsız içerik yok
- E-E-A-T sinyalleri zayıf (yazar sayfaları, editör kadrosu yok)
- MontagAds kalıntısı ~~kaldırıldı~~ ✅ (10 Şubat 2026)

---

## AŞAMA 1 — Teknik Temizlik ve Zorunlu Dosyalar (1-2 Gün)

### 1.1 ads.txt Dosyası Oluştur

- [ ] `public/ads.txt` dosyası oluştur
- [ ] AdSense publisher ID'yi ekle: `google.com, pub-XXXXXXXXXXXXXXXX, DIRECT, f08c47fec0942fa0`
- [ ] Deploy sonrası `https://aihaberleri.org/ads.txt` erişimini doğrula

### ~~1.2 MontagAds Import'unu Kaldır~~ ✅ TAMAMLANDI

- [x] `src/app/layout.tsx`'ten MontagAds import ve kullanımı kaldırıldı

### 1.3 Bidvertiser Kalıntıları

- [ ] Bidvertiser şimdilik kalacak (kullanıcı talebi)
- [ ] AdSense başvurusu öncesinde kaldırılması değerlendirilecek

### 1.4 MontagAds Komponent Dosyasını Temizle

- [ ] `src/components/MontagAds.tsx` dosyasını sil veya boş bırak
- [ ] Başka yerde import edilip edilmediğini kontrol et

---

## AŞAMA 2 — Yasal Sayfaları Güçlendir (2-3 Gün)

### 2.1 Çerez Politikası Sayfası — Bağımsız İçerik

- [ ] `/cookies` sayfasını redirect yerine tam içerikli bağımsız sayfa yap
- [ ] İçerik: Hangi çerezler kullanılıyor, amaçları, süreleri, üçüncü taraf çerezleri
- [ ] Google Analytics, GTM, AdSense çerezlerini listele
- [ ] Çerez yönetim talimatları (tarayıcı bazlı)
- [ ] SEO metadata ekle (title, description, canonical)

### 2.2 KVKK Aydınlatma Metni — Bağımsız İçerik

- [ ] `/kvkk` sayfasını redirect yerine tam içerikli bağımsız sayfa yap
- [ ] 6698 sayılı KVKK'ya uygun aydınlatma metni
- [ ] Veri sorumlusu bilgileri
- [ ] Kişisel veri işleme amaçları ve hukuki dayanakları
- [ ] Veri sahibi hakları ve başvuru yöntemleri
- [ ] SEO metadata ekle

### 2.3 Gizlilik Politikası Güncelleme

- [ ] Google AdSense çerez ve reklam bildirimini ekle
- [ ] "Reklam Ortaklarımız" bölümü ekle
- [ ] Kişiselleştirilmiş reklamlar hakkında bilgilendirme
- [ ] Google'ın reklam çerezlerini nasıl kullandığına dair link ekle

### 2.4 Hizmet Şartları Güncelleme

- [ ] Reklam gösterimi ile ilgili madde ekle
- [ ] Üçüncü taraf hizmetleri (Google AdSense) bildirimi

---

## AŞAMA 3 — Consent Management Platform (CMP) Entegrasyonu (3-5 Gün)

### 3.1 CMP Seçimi

- [ ] Google Certified CMP seç (öneriler):
  - **Seçenek A:** Google Funding Choices (ücretsiz, Google'ın kendi çözümü)
  - **Seçenek B:** Cookiebot (ücretli, kapsamlı)
  - **Seçenek C:** Quantcast Choice (ücretsiz, TCF 2.2 uyumlu)
- [ ] Karar: ******\_\_\_\_******

### 3.2 CMP Entegrasyonu

- [ ] Mevcut basit `CookieConsent` komponentini CMP ile değiştir
- [ ] TCF 2.2 (Transparency & Consent Framework) uyumlu consent akışı kur
- [ ] Consent kategorileri:
  - Zorunlu çerezler (her zaman aktif)
  - Analitik çerezleri (Google Analytics)
  - Reklam çerezleri (Google AdSense)
  - Fonksiyonel çerezler
- [ ] Consent durumuna göre script yükleme mantığı:
  - Consent verilmeden GA/GTM/AdSense yüklenmemeli
  - Consent geri çekildiğinde çerezler temizlenmeli
- [ ] Consent banner'ı her sayfada görünür olmalı (ilk ziyarette)
- [ ] "Çerez Tercihlerini Yönet" butonu footer'a ekle

### 3.3 Google AdSense Consent Entegrasyonu

- [ ] `gtag('consent', 'default', {...})` konfigürasyonu ekle
- [ ] Consent mode v2 entegrasyonu
- [ ] Ad personalization consent kontrolü

---

## AŞAMA 4 — İçerik Kalitesi ve Orijinallik (Sürekli — En Az 2 Hafta)

### 4.1 Mevcut İçerikleri Zenginleştir

- [ ] Her mevcut makaleye "Editörün Notu" bölümü ekle (2-3 paragraf orijinal yorum)
- [ ] Türkiye perspektifinden analiz paragrafları ekle
- [ ] Kısa makaleleri zenginleştir (minimum 800 kelime hedefi)
- [ ] İçeriklerin sadece çeviri değil, analiz ve yorum içerdiğinden emin ol

### 4.2 Orijinal İçerik Üretimi

- [ ] Haftada en az 2-3 tamamen orijinal makale yaz:
  - Türkiye'deki AI ekosistemi haberleri
  - AI araçları karşılaştırma/inceleme yazıları
  - Sektör analizi ve trend raporları
  - Başlangıç rehberleri (ör: "ChatGPT Nasıl Kullanılır?")
  - Röportajlar veya uzman görüşleri
- [ ] Orijinal makalelerde "AI Destekli İçerik" rozeti OLMAMALI
- [ ] İçerik takvimi oluştur ve düzenli yayın yap

### 4.3 İçerik Çeşitliliği

- [ ] Farklı içerik formatları ekle:
  - Listicle'lar ("2026'nın En İyi 10 AI Aracı")
  - How-to rehberleri
  - Karşılaştırma yazıları
  - Infografikler
  - Video embed'leri (YouTube)
- [ ] Her kategoride en az 5-10 makale olmalı

### 4.4 İçerik Kalite Kontrol

- [ ] Tüm makalelerde kaynak linkleri çalışıyor mu kontrol et
- [ ] Görsellerin alt text'leri var mı kontrol et
- [ ] Kırık linkler var mı tarama yap
- [ ] Duplicate content kontrolü yap

---

## AŞAMA 5 — E-E-A-T Güçlendirme (3-5 Gün)

### 5.1 Yazar/Editör Sayfaları

- [ ] `/yazarlar` veya `/team` sayfası oluştur
- [ ] Her yazar/editör için profil kartı:
  - Ad, soyad
  - Fotoğraf
  - Uzmanlık alanı
  - Kısa biyografi
  - Sosyal medya linkleri (LinkedIn, Twitter)
  - Yazdığı makaleler listesi
- [ ] Schema.org Person markup ekle

### 5.2 Hakkımızda Sayfası Güçlendirme

- [ ] Editoryal süreç açıklaması ekle:
  - Haber kaynakları nasıl seçiliyor?
  - AI ile içerik üretim süreci nasıl işliyor?
  - Fact-checking süreci
  - Editoryal bağımsızlık bildirimi
- [ ] Şirket/kuruluş bilgileri (adres, vergi no vb. — varsa)
- [ ] Basın kiti veya medya bilgileri

### 5.3 İçeriklerde E-E-A-T Sinyalleri

- [ ] Her makalede yazar bilgisi göster (isim + profil linki)
- [ ] Makalelerde "Son Güncelleme" tarihi göster
- [ ] Kaynak sayısını artır (her makalede en az 2-3 kaynak)
- [ ] İç linkler ekle (ilgili makalelere)
- [ ] Dış linkler ekle (güvenilir kaynaklara — Wikipedia, resmi siteler)

---

## AŞAMA 6 — Teknik SEO ve Performans Optimizasyonu (2-3 Gün)

### 6.1 Core Web Vitals

- [ ] Lighthouse testi çalıştır (mobil + masaüstü)
- [ ] LCP (Largest Contentful Paint) < 2.5s hedefi
- [ ] FID/INP (Interaction to Next Paint) < 200ms hedefi
- [ ] CLS (Cumulative Layout Shift) < 0.1 hedefi
- [ ] Sorunlu alanları optimize et

### 6.2 Sayfa Hızı

- [ ] Görsel optimizasyonu (WebP format, lazy loading)
- [ ] JavaScript bundle boyutunu kontrol et
- [ ] Üçüncü taraf script'lerin yükleme etkisini ölç
- [ ] Font yükleme stratejisini kontrol et (swap kullanılıyor ✅)

### 6.3 İndexleme Kontrolü

- [ ] Google Search Console'da tüm önemli sayfaların indexlendiğini doğrula
- [ ] "Sayfa indexlenemedi" hatalarını düzelt
- [ ] Canonical URL'lerin doğru olduğunu kontrol et
- [ ] hreflang tag'lerinin doğru çalıştığını doğrula

### 6.4 Mobil Uyumluluk

- [ ] Google Mobile-Friendly Test'i geç
- [ ] Tüm sayfalarda mobil deneyimi kontrol et
- [ ] Touch target boyutlarını kontrol et (min 48x48px)

---

## AŞAMA 7 — AdSense Başvuru Hazırlığı (1-2 Gün)

### 7.1 Son Kontrol Listesi

- [ ] ads.txt erişilebilir ve doğru
- [ ] Tüm yasal sayfalar bağımsız ve kapsamlı
- [ ] CMP entegre ve çalışıyor
- [ ] En az 30+ kaliteli makale yayında
- [ ] Düzenli içerik yayını (son 30 günde en az 15-20 makale)
- [ ] Organik trafik var (Google Search Console'dan kontrol)
- [ ] Core Web Vitals yeşil
- [ ] Mobil uyumluluk testi geçildi
- [ ] Kırık link yok
- [ ] 404 hataları düzeltildi
- [ ] Tüm görsellerde alt text var
- [ ] Diğer reklam ağı kalıntıları temizlendi (Bidvertiser dahil)

### 7.2 AdSense Başvurusu

- [ ] https://www.google.com/adsense/ adresinden başvur
- [ ] Site URL: https://aihaberleri.org
- [ ] AdSense kod snippet'ini `<head>` tag'ine ekle
- [ ] Doğrulama kodunu deploy et
- [ ] Başvuru durumunu takip et (genellikle 1-14 gün)

### 7.3 Red Durumunda

- [ ] Red sebebini oku ve not al
- [ ] İlgili aşamaya geri dön ve düzelt
- [ ] En az 2 hafta bekle ve tekrar başvur
- [ ] Yaygın red sebepleri:
  - "Yetersiz içerik" → Aşama 4'e dön
  - "Navigasyon sorunları" → Site yapısını kontrol et
  - "Politika ihlali" → Yasal sayfaları güncelle
  - "Değerli envanter yok" → İçerik kalitesini artır

---

## AŞAMA 8 — AdSense Onay Sonrası (Onay Alındıktan Sonra)

### 8.1 Reklam Yerleşimi Stratejisi

- [ ] Reklam yerleşim noktalarını belirle:
  - Header altı (leaderboard 728x90)
  - Makale içi (3. paragraf sonrası — zaten content split var)
  - Sidebar (300x250 veya 300x600)
  - Makale sonu
  - İlgili haberler arasında (native)
- [ ] Auto ads vs manual placement kararı
- [ ] Mobilde reklam sayısını sınırla (UX için)

### 8.2 Reklam Komponenti Geliştir

- [ ] `src/components/AdSense.tsx` komponenti oluştur
- [ ] Consent durumuna göre reklam yükleme
- [ ] Admin panelinde reklam göstermeme
- [ ] Lazy loading ile reklam yükleme (performans)

### 8.3 Performans İzleme

- [ ] AdSense dashboard'u düzenli kontrol et
- [ ] RPM/CPM takibi
- [ ] Core Web Vitals'a reklam etkisini izle
- [ ] Kullanıcı deneyimi metriklerini takip et

---

## Zaman Çizelgesi

| Hafta | Aşama       | Açıklama                         |
| ----- | ----------- | -------------------------------- |
| 1     | Aşama 1 + 2 | Teknik temizlik + yasal sayfalar |
| 1-2   | Aşama 3     | CMP entegrasyonu                 |
| 2-4   | Aşama 4     | İçerik kalitesi (sürekli)        |
| 3     | Aşama 5     | E-E-A-T güçlendirme              |
| 3-4   | Aşama 6     | Teknik SEO optimizasyonu         |
| 5     | Aşama 7     | Başvuru hazırlığı ve başvuru     |
| 6+    | Aşama 8     | Onay sonrası reklam entegrasyonu |

---

## Notlar

- AdSense başvurusu yapmadan önce Bidvertiser meta tag'inin kaldırılması şiddetle önerilir
- İçerik üretimi Aşama 4'te başlamalı ama başvuru sonrasına kadar devam etmeli
- Google, düzenli güncellenen siteleri tercih eder — başvuru öncesi en az 30 gün düzenli yayın yapılmalı
- AI-generated content en büyük risk faktörü — orijinal içerik oranını artırmak kritik
- Türkçe site olduğu için Türkiye'den organik trafik önemli
