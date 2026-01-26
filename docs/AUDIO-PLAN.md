# 🎙️ Server-Side Neural TTS Implementation Plan (Edge-TTS)

Bu plan, istemci taraflı (browser) sentezleme yerine, sunucu üzerinden Microsoft Edge Neural seslerini stream eden "Whisper Kalitesinde" bir ses motorunu hedefler.

## 🎯 Hedefler

- **Kalite:** Microsoft "Neural" sesleri (Ahmet/Emel) ile insan doğallığında okuma.
- **Mobil Stabilite:** HTML5 Audio Stream kullanarak iOS/Android kilit ekranında bile kesintisiz oynatma.
- **Maliyet:** Ücretsiz Edge-TTS API kullanımı.

## 🧱 Mimari

### 1. Backend: Streaming TTS Endpoint (`src/app/api/tts/route.ts`)

- **Teknoloji:** Native WebSocket (`ws` paketi) ile Microsoft Edge sunucularına bağlantı.
- **Protokol:** Metni al -> SSML oluştur -> WebSocket ile gönder -> Binary audioları birleştir -> Client'a stream et.
- **Cache (Opsiyonel):** Aynı metin için tekrar istek gelirse Redis/FS cache kullanılabilir (V2).

### 2. Frontend: Universal Audio Player (`src/components/AudioPlayer.tsx`)

- **Core:** Standart `<audio>` elementi (görünmez).
- **UI:** Mevcut şık tasarım korunacak, sadece "Source" ve "Control" mantığı değişecek.
- **Özellikler:**
  - Hız ayarı (Backend'e `rate` parametresi gönderilerek veya frontend `playbackRate` ile).
  - İndirme opsiyonu (Mp3 olarak).

## 🛠️ Uygulama Adımları

### 🏗️ Aşama 1: Backend Service (Kiro Agent)

1. `npm install ws uuid` paketlerini kur.
2. `src/lib/edge-tts.ts` servisini oluştur (MS WebSocket protokolünü implement eden utility).
3. `src/app/api/tts/route.ts` API rotasını oluştur.

### 🏗️ Aşama 2: Frontend Player (Gemini Agent)

1. Mevcut `AudioPlayer.tsx` refaktör edilecek.
2. `window.speechSynthesis` yerine `/api/tts?text=...` kaynağına bağlanan bir `<audio>` yapısı kurulacak.
3. Hız kontrolü `<audio>.playbackRate` ile yapılacak (Pitch bozulmadan hızlandırma sağlar).

### 🏗️ Aşama 3: Test & Verify

1. Mobilde test et (Background play).
2. Uzun metinlerde (1000+ karakter) stream performansını ölç.

---

## 🚦 Teknik Notlar

- **Ses Modeli:** `tr-TR-AhmetNeural` (Erkek) veya `tr-TR-EmelNeural` (Kadın). Varsayılan: **Ahmet**.
- **Rate Limit:** Aşırı yüklenmeyi önlemek için API route'a basit bir rate limit eklenebilir.
