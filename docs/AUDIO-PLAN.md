# 🎙️ Sesli Haber & Akıllı Kullanıcı Deneyimi Planı (v1.0)

Bu plan, AI Haberleri sitesindeki içeriklerin daha erişilebilir ve premium bir hisle dinlenmesini, mobil uyumluluğun sağlanmasını ve kullanıcıların bu özellikten akıllı bildirimlerle haberdar edilmesini hedefler.

## 🎯 Hedefler

- **Mobil Uyumluluk:** iOS/Android tarayıcı kısıtlamalarını aşan agresif "User-Interaction" tetikleme sistemi.
- **Neural Ses Deneyimi:** Tarayıcıda varsa Microsoft/Google Neural seslerini önceliklendiren, yoksa yüksek kaliteli yedeklere geçen akıllı spiker motoru.
- **Hız Kontrolü:** Kullanıcının okuma hızını (0.75x - 2.0x) seçebileceği dinamik kontrol paneli.
- **Akıllı Duyuru:** Sadece haber okumaya gelen yeni kullanıcılara şık bir "Pop-over" bildirim gösterilmesi (ve reddetme opsiyonu).
- **UX Excellence:** @[/ui-ux-pro-max] prensiplerine uygun, sayfa layout'unu kaydırmayan şık player arayüzü.

## 🧱 Mimari Bileşenler

### 1. Frontend: Advanced Audio Player (`src/components/AudioPlayer.tsx`)

- **Neural Voice Selector:** `window.speechSynthesis` üzerindeki "Natural", "Online" ve "Neural" etiketli Türkçe sesleri bulan algoritma.
- **Mobile-Direct Logic:** Mobil Safari'nin ses blokajını kırmak için `onClick` anında `resume()` ve `speak()` tetiklenmesi.
- **Visual Feedback:** Okuma sırasında animasyonlu "Live" indicator.

### 2. Frontend: Smart Promo Manager (`src/components/AudioPromo.tsx`)

- **LocalStorage Integration:** `has-seen-audio-promo` anahtarı ile "Bir daha gösterme" kontrolü.
- **Timed Display:** Sayfa yüklendikten 2 saniye sonra yumuşak bir giriş (fade-in).

### 3. Page Integration (`src/app/news/[slug]/page.tsx`)

- Player'ın paylaşım butonları altına stratejik yerleşimi.
- Promo bileşeninin sayfa sonuna eklenmesi.

## 🛠️ Uygulama Adımları

### 🏗️ Aşama 1: Core Audio Engine (Implementation)

1. `AudioPlayer.tsx` bileşeninin neural ses öncelikli ve mobil uyumlu olarak yeniden yazılması.
2. Türkçe vurgular için `rate` ve `pitch` optimizasyonu.

### 🏗️ Aşama 2: UI/UX & Duyuru (Implementation)

1. `AudioPromo.tsx` bileşeninin premium kart tasarımı ile oluşturulması.
2. "BİR DAHA GÖSTERME" mantığının test edilmesi.

### 🏗️ Aşama 3: Entegrasyon & Doğrulama (Testing)

1. Haber sayfasına montaj.
2. `ux_audit.py` ile tasarım kontrolü.
3. Mobil tarayıcı test simülasyonu.

---

## 🚦 Onay Bekleniyor

Bu planı onaylıyor musunuz? (Y/N)

- **Y:** Implementation aşamasına geçilir.
- **N:** Plan üzerinde revize istediğiniz noktaları belirtebilirsiniz.
