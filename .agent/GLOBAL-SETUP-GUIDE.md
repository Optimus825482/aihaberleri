# 🚀 Global AI Agent System Setup Guide

## 📍 Neden Global Kurulum?

### ❌ Eski Yöntem (Kötü)
```
Project A/
  └─ .agent/ (50MB)
Project B/
  └─ .agent/ (50MB) 
Project C/
  └─ .agent/ (50MB)

❌ Her projede kopyalama
❌ 10 proje = 500MB
❌ Güncelleme için 10 yerde değişiklik
❌ Versiyon tutarsızlıkları
```

### ✅ Yeni Yöntem (İyi)
```
~/.ai-agents/ (50MB) ← TEK KURULUM
     ↓
     ├→ Project A (minimal referans)
     ├→ Project B (minimal referans)  
     └→ Project C (minimal referans)

✅ Tek kurulum, tüm projeler kullanır
✅ 50MB toplam (10 proje için bile)
✅ Güncelleme bir yerde
✅ Her zaman senkron
```

---

## 🛠️ Kurulum Adımları

### Adım 1: Global Klasör Oluştur

```bash
# Windows (PowerShell)
mkdir $env:USERPROFILE\.ai-agents
cd $env:USERPROFILE\.ai-agents

# Linux/Mac
mkdir -p ~/.ai-agents
cd ~/.ai-agents
```

### Adım 2: Antigravity Kit'i Taşı

```bash
# Bu projedeki .agent klasörünü global lokasyona kopyala
# Windows
Copy-Item -Recurse "D:\bag\.agent\*" "$env:USERPROFILE\.ai-agents\"

# Linux/Mac
cp -r /path/to/current/project/.agent/* ~/.ai-agents/
```

### Adım 3: Environment Variable (Opsiyonel ama Önerilen)

```bash
# Windows (PowerShell - Admin gerekir)
[System.Environment]::SetEnvironmentVariable('AI_AGENTS_PATH', "$env:USERPROFILE\.ai-agents", 'User')

# Linux/Mac (add to ~/.bashrc or ~/.zshrc)
echo 'export AI_AGENTS_PATH="$HOME/.ai-agents"' >> ~/.bashrc
source ~/.bashrc
```

### Adım 4: Her Projede Minimal Referans

Artık her projede sadece `.github/copilot-instructions.md` dosyasına şu minimal referansı ekle:

```markdown
# AI Agent System

**Global Location**: 
- Windows: `%USERPROFILE%\.ai-agents`
- Linux/Mac: `~/.ai-agents`

**Full Documentation**: See global `ARCHITECTURE.md`

**Auto-Routing**: Enabled - AI automatically selects appropriate agents/skills based on context.

**Quick Reference**:
- Frontend → @frontend-specialist
- Backend → @backend-specialist  
- Database → @database-architect
- Security → @security-auditor
- Complex → @orchestrator

**Validation**: 
```bash
python %AI_AGENTS_PATH%\scripts\checklist.py .
```
```

---

## 🎯 Kullanım

### Herhangi Bir Projede

```bash
# Yeni proje aç
cd /yeni-proje

# Sadece copilot instructions'a referans ekle (yukarıdaki gibi)
# ARTIK KOPYALAMAYA GEREK YOK!

# AI ile çalış - otomatik routing çalışır
# "Optimize React component" → @frontend-specialist auto-load
# "Review security" → @security-auditor auto-load
```

### Validation Scripts

```bash
# Core check
python %USERPROFILE%\.ai-agents\scripts\checklist.py .

# Full check  
python ~/.ai-agents/scripts/verify_all.py . --url http://localhost:3000
```

---

## 🔄 Güncelleme

Tek bir yerde güncelle, TÜM projeler hemen yararlanır:

```bash
cd %USERPROFILE%\.ai-agents  # veya ~/.ai-agents

# Git ile güncelle (eğer repo ise)
git pull

# Veya manuel güncelle
# Tüm projeler otomatik olarak yeni versiyonu kullanır!
```

---

## 📦 Bu Projeden Geçiş

### Şu Anki Durum
```
D:\bag\
  ├─ .agent/         ← Lokal kopya
  └─ .github/
      └─ copilot-instructions.md  ← .agent'a referans
```

### Hedef Durum
```
%USERPROFILE%\.ai-agents\  ← GLOBAL (taşındı)
  ├─ agents/
  ├─ skills/
  ├─ workflows/
  └─ ...

D:\bag\
  ├─ [.agent/ SİLİNEBİLİR]
  └─ .github/
      └─ copilot-instructions.md  ← Global path'e referans
```

### Geçiş Komutu

```powershell
# 1. Global'e kopyala
Copy-Item -Recurse "D:\bag\.agent\*" "$env:USERPROFILE\.ai-agents\"

# 2. Test et
Test-Path "$env:USERPROFILE\.ai-agents\ARCHITECTURE.md"  # True dönmeli

# 3. Lokal .agent klasörünü sil (opsiyonel)
Remove-Item -Recurse "D:\bag\.agent"

# 4. copilot-instructions.md'yi güncelle (yukarıdaki minimal referansla)
```

---

## ✅ Avantajlar

| Özellik | Lokal Kopya | Global Kurulum |
|---------|-------------|----------------|
| **Disk Kullanımı** | 50MB × N proje | 50MB toplam |
| **Güncelleme** | N projede değişiklik | 1 yerde değişiklik |
| **Tutarlılık** | Versiyon farklılıkları | Her zaman senkron |
| **Yeni Proje** | 50MB kopyala | 5 satır referans |
| **Bakım** | Her proje ayrı | Tek merkez |

---

## 🎓 Best Practices

1. **Global path'i environment variable yap** - Taşınabilirlik için
2. **Git repo olarak tut** - Versiyon kontrolü ve güncelleme kolaylığı
3. **Her projede minimal referans** - Sadece path + auto-routing bilgisi
4. **Validation scriptleri global path'ten çalıştır**
5. **Yeni agent/skill eklendiğinde** - Sadece global'i güncelle

---

## 🤝 Çoklu Geliştirici Ortamı

Takım içinde:

```bash
# 1. Antigravity Kit'i repo'ya ekle
git clone <antigravity-kit-repo> ~/.ai-agents

# 2. Her geliştirici kendi makinesinde:
cd ~/.ai-agents
git pull  # Güncellemeleri al

# 3. Tüm projeler otomatik olarak güncel versiyonu kullanır
```

---

## 📞 Sorun Giderme

### AI, global path'i bulamıyor?

```markdown
<!-- .github/copilot-instructions.md -->
# AI Agent System

**ABSOLUTE PATH** (Windows): C:\Users\YourUsername\.ai-agents
**ABSOLUTE PATH** (Unix): /home/username/.ai-agents

AI: Read ARCHITECTURE.md from above path for agent/skill documentation.
```

### Script çalışmıyor?

```bash
# Path'i explicit ver
python C:\Users\YourUsername\.ai-agents\scripts\checklist.py .
```

---

**Sonuç**: Artık `.agent` klasörünü kopyalamıyoruz - global kurulum, tüm projeler faydalanıyor! 🚀
