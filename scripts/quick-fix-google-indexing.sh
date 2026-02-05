#!/bin/bash

# 🚀 Google Indexing Rate Limit - Hızlı Fix Script
# Bu script Prisma client'ı yeniden generate eder ve sistemi hazır hale getirir

echo "🚀 Google Indexing Rate Limit Fix başlatılıyor..."
echo ""

# Step 1: Prisma Client Temizle
echo "📦 Prisma client temizleniyor..."
rm -rf node_modules/.prisma
echo "✅ Prisma client temizlendi"
echo ""

# Step 2: Prisma Generate
echo "🔧 Prisma client generate ediliyor..."
npx prisma generate
if [ $? -eq 0 ]; then
    echo "✅ Prisma client başarıyla generate edildi"
else
    echo "❌ Prisma generate hatası!"
    exit 1
fi
echo ""

# Step 3: TypeScript Type Check
echo "🔍 TypeScript type check..."
npm run type-check
if [ $? -eq 0 ]; then
    echo "✅ Type check başarılı"
else
    echo "⚠️  Type check uyarıları var (devam ediliyor)"
fi
echo ""

# Step 4: Build Test
echo "🏗️  Build test..."
npm run build
if [ $? -eq 0 ]; then
    echo "✅ Build başarılı"
else
    echo "❌ Build hatası!"
    exit 1
fi
echo ""

# Step 5: Özet
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ FIX TAMAMLANDI!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📋 Sonraki Adımlar:"
echo "1. Admin panele git: http://localhost:3000/admin/google-indexing-batch"
echo "2. Bildirilmemiş haberleri seç"
echo "3. 'Yarın İçin Planla' butonuna tıkla"
echo "4. Cron job otomatik çalışacak (her saat başı)"
echo ""
echo "📊 Monitoring:"
echo "- Batch durumu: /admin/google-indexing-batch"
echo "- Database: npx prisma studio"
echo "- Logs: Vercel Dashboard"
echo ""
echo "🚀 Sistem hazır!"
