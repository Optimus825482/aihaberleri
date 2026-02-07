# 🧠 Copilot Hafıza Dosyası

> **SON GÜNCELLEME**: 1 Şubat 2026

---

## Kullanıcı Profili
- **Çalışma Ortamı**: Windows, VS Code
- **Dil Tercihi**: Türkçe
- **Kullandığı AI Agent'lar**: 
  - GitHub Copilot (VS Code içi)
  - Gemini CLI (terminal)

---

## Aktif Projeler

### 1. AI Haberleri (`d:\bag`)
- Next.js 14 haber platformu
- Agent sistemi kurulu (Antigravity Kit - 20 specialist agent)
- Coolify ile deploy ediliyor
- DeepSeek AI ile içerik üretimi

### 2. BUGSHUT Projesi
- Flask tabanlı Python web uygulaması
- Shuttle/Buggy servis aracı yönetim sistemi
- Firebase Cloud Messaging (FCM) push bildirimleri
- MySQL veritabanı
- Docker desteği
- iOS/Android/macOS/Watch ikonları
- WebSocket desteği
- PDF raporlama (Türkçe karakter desteği)
- Admin paneli
- Konum takibi (Buggy Location Tracking)

### 3. AI Orchestrator (PLANLI - Henüz oluşturulmadı)
- **AMAÇ**: Copilot ve Gemini CLI'ın birbirleriyle otomatik haberleşmesi
- **Neden**: Kullanıcı köprü olmak istemiyor, agent'lar kendi aralarında koordine olsun
- **Teknoloji**: Python daemon + task.json + socket/file-based iletişim
- **Durum**: Yeni proje klasörü açılacak, sonra başlanacak

---

## Kararlar ve Tercihler

### Karar Alındı (1 Şubat 2026):
1. ✅ Copilot + Gemini CLI birlikte çalışabilir
2. ✅ Python orchestrator sistemi yapılacak
3. ✅ Agent'lar arası otonom iletişim kurulacak
4. ✅ "HATIRLA" tetikleme kelimesi aktif

### Kullanıcı Tercihleri:
- Pratik çözümler seviyor
- "Neden ben köprü oluyorum?" mantığı önemli
- Agent'lar arası otonom çalışma istiyor
- Test etmeden "çalışır" denilmesini istemiyor
- **🔴 PROTOKOL ZORUNLULUĞU**: Agent aktivasyonunda GERÇEKTEN read_file yapılmalı, sadece "uygulanıyor" yazılmamalı

---

## 🔴 PROTOKOL ENFORCEMENT (7 Şubat 2026)

**Kullanıcı Talebi:** Agent ve skill protokolü GERÇEKTEN uygulanmalı, sadece metin olarak yazılmamalı.

**Çözüm:** HARD GATE sistemi GEMINI.md'ye eklendi:
- GATE 1: Agent dosyası read_file ile okunmalı
- GATE 2: PROTOKOL KANITI bloğu gösterilmeli
- GATE 3: Self-check yapılmalı

**Tetikleme:** Kullanıcı "protokolü uygulamıyorsun" derse → HEMEN düzelt ve kanıt göster

---

## Yapılacaklar (Beklemede)
- [ ] AI Orchestrator projesi için yeni klasör açılacak
- [ ] Python orchestrator daemon yazılacak
- [ ] Task/message protokolü tanımlanacak
- [ ] Copilot entegrasyonu
- [ ] Gemini CLI entegrasyonu

---

## Son Notlar
<!-- Yeni notlar buraya eklenecek -->
