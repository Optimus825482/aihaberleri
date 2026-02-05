#!/bin/bash

# Google Batch Indexing Deployment Script (Linux/Mac)

echo "🚀 Google Batch Indexing Sistemi Deployment Başlıyor..."
echo ""

# Step 1: Prisma Generate
echo "📦 Adım 1: Prisma Client oluşturuluyor..."
npx prisma generate
if [ $? -ne 0 ]; then
    echo "❌ Prisma generate başarısız!"
    exit 1
fi
echo "✅ Prisma Client oluşturuldu"
echo ""

# Step 2: Prisma Migration (Development)
echo "🗄️ Adım 2: Database migration uygulanıyor..."
npx prisma migrate dev --name add_language_field
if [ $? -ne 0 ]; then
    echo "❌ Migration başarısız!"
    exit 1
fi
echo "✅ Migration uygulandı"
echo ""

# Step 3: Build Test
echo "🔨 Adım 3: Build test yapılıyor..."
npm run build
if [ $? -ne 0 ]; then
    echo "❌ Build başarısız!"
    exit 1
fi
echo "✅ Build başarılı"
echo ""

# Step 4: Git Commit
echo "📝 Adım 4: Git commit yapılıyor..."
git add .
git commit -m "feat: Google Batch Indexing sistemi eklendi

- Article modelinde language field eklendi
- GoogleIndexingBatch ve GoogleIndexingBatchItem tabloları eklendi
- Admin panel sayfası oluşturuldu
- API endpoints eklendi (unindexed, batch, cron)
- Background worker implementasyonu
- Sidebar menüye eklendi
- Rate limiting ve retry mekanizması"

if [ $? -ne 0 ]; then
    echo "⚠️ Git commit başarısız (değişiklik yok olabilir)"
fi
echo "✅ Git commit tamamlandı"
echo ""

# Step 5: Summary
echo "🎉 Deployment Hazır!"
echo ""
echo "📋 Sonraki Adımlar:"
echo "1. Production migration: npx prisma migrate deploy"
echo "2. Vercel Cron Job ayarla:"
echo "   - Path: /api/cron/google-indexing-batch"
echo "   - Schedule: 0 * * * * (Her saat başı)"
echo "3. Environment variable ekle:"
echo "   - CRON_SECRET=your-secret-key"
echo "4. Deploy: git push origin main"
echo ""
echo "📖 Detaylı bilgi: GOOGLE-BATCH-INDEXING-DEPLOYMENT-SUCCESS.md"
echo ""

# Ask for push
read -p "Git push yapmak ister misiniz? (y/n) " push
if [ "$push" = "y" ] || [ "$push" = "Y" ]; then
    echo "🚀 Git push yapılıyor..."
    git push origin main
    if [ $? -eq 0 ]; then
        echo "✅ Push başarılı!"
    else
        echo "❌ Push başarısız!"
    fi
else
    echo "⏭️ Push atlandı. Manuel olarak yapabilirsiniz: git push origin main"
fi

echo ""
echo "✨ Deployment tamamlandı!"
