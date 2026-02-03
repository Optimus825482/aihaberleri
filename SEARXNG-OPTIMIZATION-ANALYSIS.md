# 🔍 SearXNG Optimizasyon Analizi

**Tarih:** 3 Şubat 2026  
**Durum:** DuckDuckGo CAPTCHA + Google Timeout Sorunu

---

## 📊 Mevcut Durum Analizi

### Tespit Edilen Sorunlar

1. **DuckDuckGo CAPTCHA Bombardımanı**
   - Sürekli `SearxEngineCaptchaException` hatası
   - Hata mesajı: `CAPTCHA (us-en) (suspended_time=0)`
   - Sebep: Aşırı request yükü, bot detection

2. **Google Timeout**
   - 3 saniyelik timeout aşılıyor
   - `HTTP requests timeout (search duration: 3.2s, timeout: 3.0s)`
   - Sebep: Yavaş yanıt süresi veya rate limiting

3. **Aşırı Request Yükü**
   - Worker sürekli arama yapıyor
   - Rate limiting tetikleniyor
   - IP bazlı bloklamalar

---

## 🎯 SearXNG Resmi Dokümantasyon Bulguları

### 1. DuckDuckGo Engine Davranışı

**Kaynak:** [SearXNG DuckDuckGo Docs](https://docs.searxng.org/dev/engines/online/duckduckgo.html)

- **VQD Token Sistemi:** DuckDuckGo bot koruması için VQD token kullanıyor
- **IP Blok Listesi:** Şüpheli IP'ler sliding window ile bloklanıyor
- **Cooldown Süresi:** Bloklanan IP'ler için 1 saat cooldown gerekiyor
- **CAPTCHA Davranışı:** DDG kendi "not a Robot" dialogunu gösteriyor

### 2. Suspension Times (Askıya Alma Süreleri)

**Kaynak:** [SearXNG Settings Docs](https://docs.searxng.org/admin/settings/settings_search.html)

```yaml
suspended_times:
  SearxEngineAccessDenied: 86400 # 24 saat
  SearxEngineCaptcha: 86400 # 24 saat (DuckDuckGo için)
  SearxEngineTooManyRequests: 3600 # 1 saat
  cf_SearxEngineCaptcha: 1296000 # 15 gün (Cloudflare)
  cf_SearxEngineAccessDenied: 86400 # 24 saat
  recaptcha_SearxEngineCaptcha: 604800 # 7 gün (Google)
```

**Önemli:** DuckDuckGo CAPTCHA aldığında 24 saat askıya alınıyor!

### 3. Engine Yönetimi

**Kaynak:** [SearXNG Settings Reference](https://docs.searxng.org/admin/settings/settings)

```yaml
use_default_settings: true

engines:
  # Sorunlu engine'leri kaldır
  remove:
    - duckduckgo
    - google

  # Alternatif engine'leri etkinleştir
  - name: bing
    disabled: false
    weight: 1.2

  - name: qwant
    disabled: false
    weight: 1.0

  - name: brave
    disabled: false
    weight: 1.0
```

---

## 🛠️ Önerilen Çözümler

### Çözüm 1: Engine Yapılandırması (Öncelikli)

**SearXNG settings.yml dosyasını güncelle:**

```yaml
use_default_settings: true

server:
  secret_key: "ultrasecretkey-replace-with-32-byte-random"
  limiter: true  # Rate limiting aktif et

# Valkey/Redis (limiter için)
valkey:
  url: "valkey://localhost:6379/0"

# Arama ayarları
search:
  ban_time_on_fail: 10              # 5 → 10 saniye (daha uzun cooldown)
  max_ban_time_on_fail: 300         # 120 → 300 saniye (5 dakika max)
  suspended_times:
    SearxEngineAccessDenied: 86400
    SearxEngineCaptcha: 86400       # DuckDuckGo için 24 saat
    SearxEngineTooManyRequests: 7200 # 3600 → 7200 (2 saat)

# Outgoing request ayarları
outgoing:
  request_timeout: 5.0              # 4.0 → 5.0 (Google için)
  max_request_timeout: 15.0         # 12.0 → 15.0
  pool_connections: 200
  pool_maxsize: 20
  enable_http2: true
  useragent_suffix: " (+https://aihaberleri.org)"

# Engine yönetimi
engines:
  # Sorunlu engine'leri geçici olarak devre dışı bırak
  remove:
    - duckduckgo  # CAPTCHA sorunu
    - google      # Timeout sorunu

  # Alternatif engine'leri etkinleştir
  - name: bing
    disabled: false
    weight: 1.5
    timeout: 5.0

  - name: qwant
    disabled: false
    weight: 1.2
    timeout: 5.0

  - name: brave
    disabled: false
    weight: 1.0
    timeout: 5.0

  - name: startpage
    disabled: false
    weight: 1.0
    timeout: 5.0

  - name: mojeek
    disabled: false
    weight: 0.8
    timeout: 5.0
```

### Çözüm 2: Limiter Yapılandırması

**limiter.toml dosyası oluştur:**

```toml
[botdetection.ip_limit]
link_token = true
rate = "30/60"  # Dakikada 30 request
burst = 10

[botdetection.ip_lists]
pass_ip = [
  "127.0.0.0/8",
  "::1/128",
]

block_ip = []
```

### Çözüm 3: Docker Compose Güncellemesi

**SearXNG servisini docker-compose.yaml'a ekle:**

```yaml
services:
  # ... mevcut servisler ...

  searxng:
    image: searxng/searxng:latest
    container_name: aihaberleri-searxng
    ports:
      - "8080:8080"
    volumes:
      - ./searxng/settings.yml:/etc/searxng/settings.yml:ro
      - ./searxng/limiter.toml:/etc/searxng/limiter.toml:ro
    environment:
      - SEARXNG_SECRET_KEY=${SEARXNG_SECRET_KEY}
      - SEARXNG_LIMITER=true
      - SEARXNG_VALKEY_URL=valkey://valkey:6379/0
    depends_on:
      - valkey
    restart: unless-stopped
    networks:
      - aihaberleri-network
    healthcheck:
      test: ["CMD", "wget", "--spider", "http://localhost:8080/healthz"]
      interval: 30s
      timeout: 10s
      retries: 3

  valkey:
    image: valkey/valkey:7-alpine
    container_name: aihaberleri-valkey
    command: valkey-server --appendonly yes
    volumes:
      - valkey_data:/data
    restart: unless-stopped
    networks:
      - aihaberleri-network

volumes:
  valkey_data:
    driver: local
```

### Çözüm 4: Uygulama Kodu Güncellemesi

**src/lib/searxng.ts - Timeout ve retry logic:**

```typescript
const SEARXNG_BASE_URL = process.env.SEARXNG_BASE_URL || "http://searxng:8080";

export async function searxngSearch(
  query: string,
  options: {
    count?: number;
    language?: string;
    time_range?: string;
    safesearch?: 0 | 1 | 2;
    categories?: string;
  } = {},
): Promise<SearXNGResult[]> {
  try {
    const params = new URLSearchParams({
      q: query,
      format: "json",
      language: options.language || "en",
      safesearch: String(options.safesearch ?? 1),
    });

    if (options.time_range) {
      params.append("time_range", options.time_range);
    }

    if (options.categories) {
      params.append("categories", options.categories);
    }

    const response = await axios.get<SearXNGResponse>(
      `${SEARXNG_BASE_URL}/search`,
      {
        params,
        timeout: 10000, // 10 saniye timeout
        headers: {
          "User-Agent": "AIHaberleri-NewsBot/1.0 (+https://aihaberleri.org)",
        },
      },
    );

    const results = response.data.results || [];
    const limitedResults = results.slice(0, options.count || 10);

    console.log(
      `✅ SearXNG: ${limitedResults.length} sonuç bulundu (toplam: ${results.length})`,
    );

    return limitedResults;
  } catch (error: any) {
    console.error("❌ SearXNG search error:", error.message);

    // Eğer tüm engine'ler başarısız olduysa, boş array dön
    if (error.response?.data?.unresponsive_engines?.length > 0) {
      console.warn(
        `⚠️ Unresponsive engines: ${error.response.data.unresponsive_engines.join(", ")}`,
      );
    }

    throw error;
  }
}
```

---

## 📈 Beklenen İyileştirmeler

### Kısa Vadeli (1-2 gün)

1. ✅ DuckDuckGo CAPTCHA hatalarının durması
2. ✅ Google timeout hatalarının azalması
3. ✅ Alternatif engine'lerle (Bing, Qwant, Brave) arama yapılması
4. ✅ Rate limiting ile kontrollü request yükü

### Orta Vadeli (1 hafta)

1. ✅ SearXNG limiter ile bot koruması
2. ✅ IP bazlı rate limiting
3. ✅ Valkey ile performans iyileştirmesi
4. ✅ Monitoring ve metrics

### Uzun Vadeli (1 ay)

1. ✅ Proxy rotation (opsiyonel)
2. ✅ User-Agent rotation
3. ✅ Engine health monitoring
4. ✅ Otomatik failover stratejisi

---

## 🚀 Uygulama Adımları

### Adım 1: SearXNG Yapılandırma Dosyalarını Oluştur

```bash
mkdir -p searxng
# settings.yml ve limiter.toml dosyalarını oluştur
```

### Adım 2: Docker Compose Güncelle

```bash
# docker-compose.yaml'a SearXNG ve Valkey servislerini ekle
```

### Adım 3: Environment Variables Ekle

```bash
# .env dosyasına ekle:
SEARXNG_SECRET_KEY=<32-byte-random-key>
SEARXNG_BASE_URL=http://searxng:8080
```

### Adım 4: Deploy

```bash
docker-compose up -d searxng valkey
docker-compose logs -f searxng
```

### Adım 5: Test

```bash
# SearXNG health check
curl http://localhost:8080/healthz

# Test search
curl "http://localhost:8080/search?q=test&format=json"
```

---

## 📚 Referanslar

1. [SearXNG DuckDuckGo Engine Docs](https://docs.searxng.org/dev/engines/online/duckduckgo.html)
2. [SearXNG Settings Reference](https://docs.searxng.org/admin/settings/settings)
3. [SearXNG Limiter Docs](https://docs.searxng.org/admin/searx.limiter.html)
4. [SearXNG GitHub Issue #4824](https://github.com/searxng/searxng/issues/4824)
5. [SearXNG Answer CAPTCHA Guide](https://docs.searxng.org/admin/answer-captcha.html)

---

## ⚠️ Önemli Notlar

1. **DuckDuckGo'yu tamamen devre dışı bırakıyoruz** - CAPTCHA sorunu çözülene kadar
2. **Google'ı da devre dışı bırakıyoruz** - Timeout sorunu nedeniyle
3. **Alternatif engine'ler kullanıyoruz** - Bing, Qwant, Brave, Startpage, Mojeek
4. **Rate limiting aktif** - Aşırı request yükünü önlemek için
5. **Monitoring gerekli** - Engine health'i takip etmek için

---

**Sonraki Adım:** Bu analizi inceleyip onay aldıktan sonra implementasyona geçebiliriz.
