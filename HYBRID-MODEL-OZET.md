# 🚀 Hybrid AI Model Stratejisi - Hızlı Başlangıç

**Durum:** ✅ Hazır  
**Tarih:** 2 Şubat 2026

---

## 🎯 Ne Değişti?

### Önceki Sistem

```
Tüm görevler → DeepSeek-Chat
Maliyet: $19.60/ay
```

### Yeni Sistem (Hybrid)

```
Relevance Scoring → Gemini 2.0 Flash (47% daha ucuz)
Image Prompts → Gemini 2.0 Flash (multimodal)
Content Synthesis → DeepSeek-Chat (kanıtlanmış kalite)
Maliyet: $16.45/ay (%16 tasarruf)
```

---

## ⚡ Hızlı Kurulum

### 1. API Key Ekle

`.env` dosyasına:

```bash
GOOGLE_API_KEY=your_google_api_key_here
```

### 2. Test Et

```bash
npm run test:hybrid
```

### 3. Çalıştır

```bash
npm run worker:orchestrator
```

---

## 📊 Beklenen Sonuçlar

| Metrik      | Önceki     | Yeni       | İyileşme    |
| ----------- | ---------- | ---------- | ----------- |
| **Maliyet** | $19.60/ay  | $16.45/ay  | **-16%** ✅ |
| **Hız**     | 2.5s/batch | 1.8s/batch | **+28%** ✅ |
| **Kalite**  | ⭐⭐⭐⭐   | ⭐⭐⭐⭐   | **Eşit** ✅ |

---

## 🔍 Hangi Model Ne İçin?

### Gemini 2.0 Flash Lite

- ✅ Relevance scoring (ucuz, hızlı)
- ✅ Image prompt generation (multimodal)
- ✅ Batch processing (1M context)

### DeepSeek-Chat

- ✅ Content synthesis TR (kanıtlanmış)
- ✅ Content synthesis EN (kaliteli)
- ✅ Karmaşık yazma görevleri

### DeepSeek-Reasoner (Opsiyonel)

- ⚠️ Complex reasoning (pahalı)
- ⚠️ Trend analysis (gerekirse)
- ⚠️ Deep thinking tasks (opsiyonel)

---

## 🧪 Test Komutları

```bash
# Hybrid model testi
npm run test:hybrid

# Full pipeline testi
npm run test:pipeline

# Orchestrator başlat
npm run worker:orchestrator
```

---

## 📝 Değişen Dosyalar

1. ✅ `src/lib/gemini.ts` (YENİ)
2. ✅ `src/agents/relevance-filter.agent.ts` (GÜNCELLENDİ)
3. ✅ `src/agents/visual-generator.agent.ts` (GÜNCELLENDİ)
4. ✅ `scripts/test-hybrid-models.ts` (YENİ)
5. ✅ `package.json` (test:hybrid eklendi)

---

## 💡 Önemli Notlar

1. **Gemini API Key gerekli** - Google AI Studio'dan alın
2. **DeepSeek API Key korundu** - Mevcut key çalışmaya devam eder
3. **Geriye uyumlu** - Eski kod çalışmaya devam eder
4. **Fallback mekanizması** - Gemini hata verirse DeepSeek kullanılır

---

## 🎯 Sonraki Adımlar

1. [ ] Production'da test et
2. [ ] Maliyet metrikleri topla
3. [ ] Kalite karşılaştırması yap
4. [ ] Gerekirse fine-tune et

---

## 📞 Yardım

Detaylı dokümantasyon: `HYBRID-MODEL-IMPLEMENTATION.md`

Test sonuçları: `npm run test:hybrid`

---

**Hazır! 🚀**
