# 🔐 Coolify Environment Variables Setup Guide

## 📋 Quick Setup Checklist

### Step 1: PostgreSQL Configuration

```env
POSTGRES_USER=postgres
POSTGRES_PASSWORD=<GENERATE_SECURE_PASSWORD>
POSTGRES_DB=ainewsdb
```

**Generate secure password:**

```bash
openssl rand -base64 32
```

### Step 2: NextAuth Configuration

```env
NEXTAUTH_URL=https://aihaberleri.org
NEXTAUTH_SECRET=<GENERATE_SECRET>
```

**Generate secret:**

```bash
openssl rand -base64 32
```

### Step 3: Database Connection String

```env
DATABASE_URL=postgresql://postgres:<POSTGRES_PASSWORD>@postgres:5432/ainewsdb
```

**Important**: Replace `<POSTGRES_PASSWORD>` with the password from Step 1

### Step 4: Redis Configuration

```env
REDIS_URL=redis://redis:6379
```

### Step 5: AI Services

```env
DEEPSEEK_API_KEY=sk-2750fa1691164dd2940c2ec3cb37d2e6
```

### Step 6: Search APIs

```env
BRAVE_API_KEY=BSAGBjbQoeFNCjKwfzhJg9cdsmG4UXu
TAVILY_API_KEY=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
EXA_API_KEY=e02e87e4-7221-4d22-beaa-56a3a683d374
```

### Step 7: Email Service (Resend)

```env
RESEND_API_KEY=re_bMuDv7VC_3nwhr6Ab6GLndqyxsBbvDc9R
RESEND_FROM_EMAIL=noreply@aihaberleri.org
```

### Step 8: Firebase (Push Notifications)

```env
FIREBASE_PROJECT_ID=aihaberleri-46042
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-fbsvc@aihaberleri-46042.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQDi92vXIVWGF7CX\nmmZSa7jU0GUP1tqeZxf9J9RWvt5+2dp7GDnl77dBomZXrW1mADhFSR/FeqmCan74\nC0LUMwV4gHo7aJ8RQpjIJ+g5KQYRKGU1RttR3+9KfTeWKQ955GF/dRK+z/JYJA08\n5GCp0DiMstpxl+HKU9Xn2sKfu04aWIpstqcPTSekk1w195EDt8dOhNcrkUGmaD5g\nZJc8oHJAQvOffdabjLdQuMf8MJqKXVJv1O/2ROn3S4AzLi4vdOjP9+hCIOpQOq66\n2zlcRhEq79khHrGDLHZ6zBIIynN4v80a+fZ8U002ARUEGN6VopgLKuCHD7wn4OhY\nvBexPlcVAgMBAAECggEADi9ojgmHTtosL013F6+j3akop9TF1SCcXzYeD03emg8D\nmK3q8HQLAA8mVlSAgd+BpNLtKWqBLaV6SgZqJtkJfn6JJS1kw69l3RyhZvEpb+kW\naj4DdxqH2h/5WWk3jma3sT+f7E0S2G9oZGXhpLtezWxgOrlDY2HZ/KOvhkwulXbV\nA6LKuwqNK3fLeBbx2Mu4Cfi6taHedre53FL8jZ0aIoeeErWM3u7qZjtuZdfEfrrm\nHikVLlejnAqC8Skj7YZtSCO4F63H/LuAjnmqH6SL9sVvX9dxViYU5T+9yPr/kCEH\nKqoiy/QOZmEBSrttXqEoEJHgo50J97nubiEG24nAAQKBgQD+KvmsYQwYRKrreysU\nosjY6EcT0xobne3CPcGoKKIUEcAxBwF3cmxTA4KAu8GLNfZhXTt+9NMqE2UWaa5U\nbVDVnw87XQFmcvsjfo3dUzj0SCok0PoE6/p1PmRDEXUeaXbc2+6Aux/gDcacQN/L\nbdKUa8sNA10aox4nFqwiZwGBHwKBgQDkmkAU0OyL/5kBvKXdZRXhCzF4cq3kfxdy\n4dVhCmPiNGa480Jl4WPO+tj9LAxp7HCjgaY7iqSgqQR6Dr6IV35mR9ipLsGJNQe2\nnKnSdCJjLa9R+7eZvbtQhx2ea8jMXT97g/aeX8XHgUP+B22RhueYg8DAK9fIOIRe\nwRilgTMdSwKBgQDbUWwGAev02PP/pFWFRf43pR8IDUXfBMTPsohzuTQ6SyLja18p\nmfO9Ii8vNFSK8nJ6i3+2Sj4YdYnp8CE8uuNgohL7r4Jwy9DHTQHPNGvV5ptvD2Be\ndN2247KSaPL93hVx+Nlx/YZAyMJTvGsgV9C4v9cDkJ57SLvREPBR8z5KEwKBgFXv\n+tkYdWRn0OBLR9tDzgbMy2spSV/Vuz3v0eRqIISACIHMyRA9u+SqfnomXgBP50RA\nT/qgMyVGhK1R76SXp6fRqIxpTE5FRkILAPhhui+ok/jw9ONx5QHv2V2dzV2uTFgl\nkseU32gRmzrbFgCYQ2YdWY+kq7jULkbktlw5hrqjAoGBAM4vU8Tu8PIgo52Jpng2\nVhQmoubm5xhY5lcsEuz+CUlrbV8Iis/X/yhJP1m49XKki0YdxbJQnvg4hISXQSRd\nmCpqEaxXyM3gAJkR+tXbBpkblH0ordQ8auzfc3LsgbBJYuqUwBhz1I9OKuBvnjTc\n7MRZ7Fasf3vcCchQcMl2zkuu\n-----END PRIVATE KEY-----\n"
```

**Important**: Keep the `\n` characters in the private key - they are required!

### Step 9: Site Configuration

```env
NEXT_PUBLIC_SITE_URL=https://aihaberleri.org
NEXT_PUBLIC_SITE_NAME=AI Haberleri
NEXT_PUBLIC_SITE_DESCRIPTION=Yapay zeka dünyasındaki gelişmeleri yakından takip edin
```

### Step 10: Social Media

```env
TWITTER_HANDLE=@aihaberleriorg
CONTACT_EMAIL=info@aihaberleri.org
```

### Step 11: Agent Configuration

```env
AGENT_ENABLED=true
AGENT_MIN_ARTICLES_PER_RUN=3
AGENT_MAX_ARTICLES_PER_RUN=5
AGENT_MIN_INTERVAL_HOURS=6
```

### Step 12: Production Settings

```env
NODE_ENV=production
NEXT_TELEMETRY_DISABLED=1
APP_PORT=3001
```

---

## 🏗️ Build Environment Variables (Separate Section in Coolify)

Add these to the **Build Environment** section:

```env
SKIP_ENV_VALIDATION=1
NODE_ENV=production
NEXT_TELEMETRY_DISABLED=1
```

**Important**: These should ONLY be in build environment, NOT in runtime!

---

## 🔒 Security Best Practices

### 1. Generate Strong Passwords

```bash
# PostgreSQL password
openssl rand -base64 32

# NextAuth secret
openssl rand -base64 32
```

### 2. Never Commit Secrets

- ❌ Don't commit `.env` files
- ❌ Don't hardcode secrets in code
- ✅ Use Coolify's environment variable management
- ✅ Use different secrets for staging/production

### 3. Rotate Secrets Regularly

- Rotate `NEXTAUTH_SECRET` every 90 days
- Rotate `POSTGRES_PASSWORD` every 180 days
- Rotate API keys when compromised

---

## 📝 Coolify Setup Instructions

### Method 1: Web UI

1. Go to your Coolify project
2. Click on "Environment Variables"
3. Click "Add Variable"
4. For each variable:
   - Name: `VARIABLE_NAME`
   - Value: `variable_value`
   - Click "Save"

### Method 2: Bulk Import

1. Copy all variables from this guide
2. Go to Coolify → Environment Variables
3. Click "Bulk Import"
4. Paste all variables
5. Click "Import"

### Method 3: CLI (if available)

```bash
coolify env set POSTGRES_USER=postgres
coolify env set POSTGRES_PASSWORD=<your-password>
# ... repeat for all variables
```

---

## ✅ Verification

### Check Environment Variables

In Coolify, verify all variables are set:

```bash
# Should show all variables (values hidden)
coolify env list
```

### Test Database Connection

After deployment:

```bash
# Check if DATABASE_URL is correct
docker exec aihaberleri-app printenv DATABASE_URL

# Test connection
docker exec aihaberleri-app node -e "console.log(process.env.DATABASE_URL)"
```

### Test App Health

```bash
curl https://aihaberleri.org/api/health
```

Expected response:

```json
{
  "status": "ok",
  "timestamp": "2026-01-25T10:30:00.000Z",
  "services": {
    "database": "connected",
    "redis": "connected"
  }
}
```

---

## 🚨 Common Mistakes

### 1. Wrong DATABASE_URL Format

❌ **Wrong:**

```env
DATABASE_URL=postgresql://localhost:5432/ainewsdb
```

✅ **Correct:**

```env
DATABASE_URL=postgresql://postgres:password@postgres:5432/ainewsdb
```

**Note**: Use `postgres` as hostname (Docker service name), not `localhost`

### 2. Missing Password in DATABASE_URL

❌ **Wrong:**

```env
DATABASE_URL=postgresql://postgres@postgres:5432/ainewsdb
```

✅ **Correct:**

```env
DATABASE_URL=postgresql://postgres:your-password@postgres:5432/ainewsdb
```

### 3. FIREBASE_PRIVATE_KEY Without \n

❌ **Wrong:**

```env
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY----- MIIEvgIBADANBg... -----END PRIVATE KEY-----"
```

✅ **Correct:**

```env
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBg...\n-----END PRIVATE KEY-----\n"
```

### 4. NEXTAUTH_URL Without HTTPS

❌ **Wrong:**

```env
NEXTAUTH_URL=http://aihaberleri.org
```

✅ **Correct:**

```env
NEXTAUTH_URL=https://aihaberleri.org
```

### 5. Missing Build Environment Variables

❌ **Wrong**: Adding `SKIP_ENV_VALIDATION=1` to runtime environment

✅ **Correct**: Add to **Build Environment** section only

---

## 📊 Environment Variable Priority

1. **Build Time** (Coolify Build Environment)
   - `SKIP_ENV_VALIDATION=1`
   - `NODE_ENV=production`
   - `NEXT_TELEMETRY_DISABLED=1`

2. **Runtime** (Coolify Runtime Environment)
   - All other variables from this guide

3. **Docker Compose** (docker-compose.coolify.yaml)
   - Uses runtime environment variables
   - Constructs `DATABASE_URL` and `REDIS_URL`

---

## 🎯 Final Checklist

Before deploying, verify:

- [ ] All 30+ environment variables are set
- [ ] `POSTGRES_PASSWORD` is strong (32+ characters)
- [ ] `NEXTAUTH_SECRET` is generated with `openssl rand -base64 32`
- [ ] `DATABASE_URL` uses correct format with password
- [ ] `NEXTAUTH_URL` uses HTTPS
- [ ] `FIREBASE_PRIVATE_KEY` includes `\n` characters
- [ ] Build environment has `SKIP_ENV_VALIDATION=1`
- [ ] Runtime environment does NOT have `SKIP_ENV_VALIDATION=1`
- [ ] All API keys are valid and active

---

**Status**: ✅ **READY FOR CONFIGURATION**  
**Date**: 2026-01-25  
**Version**: 1.0
