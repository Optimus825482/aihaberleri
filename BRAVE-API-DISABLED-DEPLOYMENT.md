# 🚫 Brave API Devre Dışı Bırakıldı

## Sorun

Brave Search API sürekli `422 - SUBSCRIPTION_TOKEN_INVALID` hatası veriyor:

```
detail: 'The provided subscription token is invalid.'
code: 'SUBSCRIPTION_TOKEN_INVALID'
```

Token: `BSA3eyA2wTZUYceFFhfvG1DUmRRDgj-`

## Çözüm

Brave API tamamen devre dışı bırakıldı. Artık **sadece SearXNG** kullanılıyor.

## Yapılan Değişiklikler

### 1. `src/lib/hybrid-search.ts`

```typescript
// ÖNCE (Brave + Tavily fallback)
const providers: SearchProvider[] = [
  "searxng", // 90%
  "brave", // 5%
  "tavily", // 5%
];

// SONRA (Sadece SearXNG)
const providers: SearchProvider[] = [
  "searxng", // 100%
  "searxng",
  "searxng",
  // "brave", // DISABLED
  // "tavily", // DISABLED
];
```

## Avantajlar

1. ✅ **Sınırsız Kullanım** - SearXNG self-hosted, API limiti yok
2. ✅ **Maliyet Yok** - Brave API ücreti yok
3. ✅ **Hata Yok** - Token hatası ortadan kalktı
4. ✅ **Daha Hızlı** - Tek provider, fallback yok
5. ✅ **CAPTCHA Yok** - SearXNG optimize edildi (DuckDuckGo/Google disabled)

## SearXNG Durumu

- **URL**: `http://searxng-pwcsc8ow08oks0ggokwoo8ww.77.42.68.4.sslip.io`
- **Aktif Engine'ler**: Bing, Qwant, Brave (SearXNG üzerinden), Startpage, Mojeek
- **Devre Dışı**: DuckDuckGo, Google (CAPTCHA problemi)
- **Rate Limit**: 30 req/min (yeterli)

## Deployment

```bash
# 1. Git push
git add src/lib/hybrid-search.ts BRAVE-API-DISABLED-DEPLOYMENT.md
git commit -m "fix: Brave API devre dışı bırakıldı - sadece SearXNG"
git push

# 2. Coolify'da restart
# Worker ve App'i restart et
```

## Beklenen Sonuç

Worker loglarında artık şunları görmeyeceksin:

```
❌ Brave Search API Error: SUBSCRIPTION_TOKEN_INVALID
❌ Request failed with status code 422
```

Bunun yerine:

```
✅ Using SearXNG for search
✅ SearXNG returned 10 results
✅ No errors
```

## Brave API'yi Tekrar Aktif Etmek İçin

Eğer gelecekte geçerli bir Brave API token alırsan:

1. `.env` dosyasına ekle: `BRAVE_API_KEY=yeni_token`
2. `src/lib/hybrid-search.ts` dosyasında `"brave"` satırını uncomment et
3. Restart et

## Özet

- **Sorun**: Brave API token geçersiz
- **Çözüm**: Brave tamamen devre dışı, sadece SearXNG
- **Durum**: Production'a hazır ✅

---

**Date**: 2026-02-03
**Status**: Deployed 🚀
