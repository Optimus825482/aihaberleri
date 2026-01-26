# 🚨 URGENT: Coolify Build Fix

## ❌ Mevcut Hata

Build başarısız oluyor: `npm run build` exit code 1

## 🔍 Tespit Edilen Sorunlar

### 1. DATABASE_URL Yanlış ❌

**Şu an:**

```env
DATABASE_URL=postgresql://postgres:<şifre>@postgres:5432/ainewsdb
```

**Olması gereken:**

```env
DATABASE_URL=postgresql://postgres:81d6bHPEr80Pj7YKZjdv7sc3neY4q8eOyGdOimtGgLA=@postgres:5432/ainewsdb
```

### 2. Eksik Environment Variables

Build sırasında şu değişkenler de gerekli:

```env
# Email Service
RESEND_API_KEY=re_bMuDv7VC_3nwhr6Ab6GLndqyxsBbvDc9R
RESEND_FROM_EMAIL=noreply@aihaberleri.org

# Firebase
FIREBASE_PROJECT_ID=aihaberleri-46042
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-fbsvc@aihaberleri-46042.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQDi92vXIVWGF7CX\nmmZSa7jU0GUP1tqeZxf9J9RWvt5+2dp7GDnl77dBomZXrW1mADhFSR/FeqmCan74\nC0LUMwV4gHo7aJ8RQpjIJ+g5KQYRKGU1RttR3+9KfTeWKQ955GF/dRK+z/JYJA08\n5GCp0DiMstpxl+HKU9Xn2sKfu04aWIpstqcPTSekk1w195EDt8dOhNcrkUGmaD5g\nZJc8oHJAQvOffdabjLdQuMf8MJqKXVJv1O/2ROn3S4AzLi4vdOjP9+hCIOpQOq66\n2zlcRhEq79khHrGDLHZ6zBIIynN4v80a+fZ8U002ARUEGN6VopgLKuCHD7wn4OhY\nvBexPlcVAgMBAAECggEADi9ojgmHTtosL013F6+j3akop9TF1SCcXzYeD03emg8D\nmK3q8HQLAA8mVlSAgd+BpNLtKWqBLaV6SgZqJtkJfn6JJS1kw69l3RyhZvEpb+kW\naj4DdxqH2h/5WWk3jma3sT+f7E0S2G9oZGXhpLtezWxgOrlDY2HZ/KOvhkwulXbV\nA6LKuwqNK3fLeBbx2Mu4Cfi6taHedre53FL8jZ0aIoeeErWM3u7qZjtuZdfEfrrm\nHikVLlejnAqC8Skj7YZtSCO4F63H/LuAjnmqH6SL9sVvX9dxViYU5T+9yPr/kCEH\nKqoiy/QOZmEBSrttXqEoEJHgo50J97nubiEG24nAAQKBgQD+KvmsYQwYRKrreysU\nosjY6EcT0xobne3CPcGoKKIUEcAxBwF3cmxTA4KAu8GLNfZhXTt+9NMqE2UWaa5U\nbVDVnw87XQFmcvsjfo3dUzj0SCok0PoE6/p1PmRDEXUeaXbc2+6Aux/gDcacQN/L\nbdKUa8sNA10aox4nFqwiZwGBHwKBgQDkmkAU0OyL/5kBvKXdZRXhCzF4cq3kfxdy\n4dVhCmPiNGa480Jl4WPO+tj9LAxp7HCjgaY7iqSgqQR6Dr6IV35mR9ipLsGJNQe2\nnKnSdCJjLa9R+7eZvbtQhx2ea8jMXT97g/aeX8XHgUP+B22RhueYg8DAK9fIOIRe\nwRilgTMdSwKBgQDbUWwGAev02PP/pFWFRf43pR8IDUXfBMTPsohzuTQ6SyLja18p\nmfO9Ii8vNFSK8nJ6i3+2Sj4YdYnp8CE8uuNgohL7r4Jwy9DHTQHPNGvV5ptvD2Be\ndN2247KSaPL93hVx+Nlx/YZAyMJTvGsgV9C4v9cDkJ57SLvREPBR8z5KEwKBgFXv\n+tkYdWRn0OBLR9tDzgbMy2spSV/Vuz3v0eRqIISACIHMyRA9u+SqfnomXgBP50RA\nT/qgMyVGhK1R76SXp6fRqIxpTE5FRkILAPhhui+ok/jw9ONx5QHv2V2dzV2uTFgl\nkseU32gRmzrbFgCYQ2YdWY+kq7jULkbktlw5hrqjAoGBAM4vU8Tu8PIgo52Jpng2\nVhQmoubm5xhY5lcsEuz+CUlrbV8Iis/X/yhJP1m49XKki0YdxbJQnvg4hISXQSRd\nmCpqEaxXyM3gAJkR+tXbBpkblH0ordQ8auzfc3LsgbBJYuqUwBhz1I9OKuBvnjTc\n7MRZ7Fasf3vcCchQcMl2zkuu\n-----END PRIVATE KEY-----\n"

# Push Notifications
NEXT_PUBLIC_VAPID_PUBLIC_KEY=BEuzabZL4FeqPH3Z5QjmAUr4bJ774juFnZ_YslFJWh_FZJJQ54LdR3dw34w014XBa_iz3raZo9zI4GBxunuRZaE
VAPID_PRIVATE_KEY=BC3Cp8mqzQ-KlTbJ5mhb4Lheu2qeVB-09lk8WfdrTipWY26YSW9qcdLO5x6vygWVV3RLlp0CurQ242xBvyxQJu8
VAPID_EMAIL=info@aihaberleri.org

# Site Config
NEXT_PUBLIC_SITE_NAME=AI Haberleri
NEXT_PUBLIC_SITE_URL=https://aihaberleri.org
NEXT_PUBLIC_SITE_DESCRIPTION=Yapay zeka dünyasındaki gelişmeleri yakından takip edin

# Social
TWITTER_HANDLE=@aihaberleriorg
CONTACT_EMAIL=info@aihaberleri.org

# AI Services
DEEPSEEK_API_KEY=sk-2750fa1691164dd2940c2ec3cb37d2e6
DEEPSEEK_API_URL=https://api.deepseek.com/v1

# Search APIs
BRAVE_API_KEY=BSAGBjbQoeFNCjKwfzhJg9cdsmG4UXu
TAVILY_API_KEY=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
EXA_API_KEY=e02e87e4-7221-4d22-beaa-56a3a683d374

# Image APIs
UNSPLASH_ACCESS_KEY=eaIPxtw55vqDZU46x1kUGzmffVs2T07rPd1beP9STRU
PEXELS_API_KEY=599cntPiPHJ2GwwuWIrbcdqf9PInilnj8Lhx2jlHQFE8jwPfjYSX6L0

# Agent Config
AGENT_ENABLED=true
AGENT_MIN_ARTICLES_PER_RUN=3
AGENT_MAX_ARTICLES_PER_RUN=5
AGENT_MIN_INTERVAL_HOURS=6

# Redis
REDIS_URL=redis://redis:6379

# App Port
APP_PORT=3001
```

## ✅ Hızlı Çözüm

### Coolify'da Şu Değişkenleri Güncelle:

1. **DATABASE_URL** - Şifreyi düzelt:

```
postgresql://postgres:81d6bHPEr80Pj7YKZjdv7sc3neY4q8eOyGdOimtGgLA=@postgres:5432/ainewsdb
```

2. Yukarıdaki tüm eksik değişkenleri ekle

### Build Environment'a Ekle:

```env
SKIP_ENV_VALIDATION=1
NODE_ENV=production
NEXT_TELEMETRY_DISABLED=1
```

## 🚀 Sonra Deploy Et

Değişkenleri güncelledikten sonra tekrar deploy et.

---

**Status**: 🔴 CRITICAL - DATABASE_URL şifresi yanlış!
**Action**: Coolify'da DATABASE_URL'i düzelt ve eksik değişkenleri ekle
