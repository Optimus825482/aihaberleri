# Specification - Audio Suite Integration

## Overview
Haber sayfalarına, kullanıcıların makaleleri sesli olarak dinlemesine olanak tanıyan gelişmiş bir "Audio Suite" eklenmesi. Bu özellik, erişilebilirliği artırmayı ve kullanıcı etkileşimini güçlendirmeyi hedefler.

## User Stories
- **Okuyucu olarak**, haberi okumak yerine dinlemek istiyorum.
- **Kullanıcı olarak**, okuma hızını kendime göre ayarlamak istiyorum.
- **Kullanıcı olarak**, farklı ses tonları (erkek/kadın) arasından seçim yapabilmek istiyorum.
- **Kullanıcı olarak**, dinlerken hangi kısmın okunduğunu görsel olarak takip etmek istiyorum.
- **Kullanıcı olarak**, sayfada aşağı indiğimde dinleme kontrolünü kaybetmemek için bir mini-oynatıcı görmek istiyorum.

## Functional Requirements
- **Audio Service:** Tarayıcı tabanlı Web Speech API veya alternatif bir TTS servisi üzerinden ses üretimi.
- **Voice Selection:** En az bir kadın ve bir erkek ses seçeneği.
- **Playback Controls:** Oynat/Duraklat, Durdur, İleri/Geri sarma.
- **Speed Control:** 0.75x, 1.0x, 1.25x, 1.5x hız seçenekleri.
- **Text Highlighting:** Okunan cümlenin veya kelimenin makale metni üzerinde vurgulanması.
- **Mini-Player:** Ana oynatıcı ekrandan çıktığında (scroll) aktifleşen sticky mini-player.
- **Persistence:** Sayfa yenilendiğinde veya sekmeler arasında geçiş yapıldığında (mümkünse) dinleme durumunun korunması.

## Technical Constraints
- **Framework:** Next.js 15 (App Router).
- **State Management:** React Context API (global player state).
- **Styling:** Tailwind CSS & Shadcn UI.
- **Accessibility:** ARIA etiketleri ve klavye kontrolleri.

## Acceptance Criteria
- Sesli okuma başarıyla başlatılabilmeli ve durdurulabilmeli.
- Hız ve ses seçimi anlık olarak sese yansımalı.
- Okunan metin görsel olarak vurgulanmalı.
- Mobil cihazlarda sorunsuz çalışmalı.
- %80 test kapsama oranına ulaşılmalı.