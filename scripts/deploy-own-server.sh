#!/bin/bash

echo "🚀 Google Batch Indexing - Kendi Sunucu Deployment"
echo ""

# 1. Prisma Generate
echo "📦 Prisma Client oluşturuluyor..."
npx prisma generate
if [ $? -ne 0 ]; then
    echo "❌ Prisma generate başarısız!"
    exit 1
fi
echo "✅ Prisma Client oluşturuldu"
echo ""

# 2. Migration
echo "🗄️ Database migration uygulanıyor..."
npx prisma migrate deploy
if [ $? -ne 0 ]; then
    echo "❌ Migration başarısız!"
    exit 1
fi
echo "✅ Migration uygulandı"
echo ""

# 3. Build
echo "🔨 Build yapılıyor..."
npm run build
if [ $? -ne 0 ]; then
    echo "❌ Build başarısız!"
    exit 1
fi
echo "✅ Build başarılı"
echo ""

# 4. PM2 Restart (eğer PM2 kullanılıyorsa)
if command -v pm2 &> /dev/null; then
    echo "🔄 PM2 restart..."
    pm2 restart all
    echo "✅ PM2 restart tamamlandı"
else
    echo "⚠️ PM2 bulunamadı, restart atlandı"
fi
echo ""

# 5. Cron Job Kurulumu
echo "⏰ Cron job kuruluyor..."

# CRON_SECRET'i .env.production'dan al
if [ -f .env.production ]; then
    CRON_SECRET=$(grep CRON_SECRET .env.production | cut -d '=' -f2)
else
    echo "⚠️ .env.production bulunamadı, .env kullanılıyor"
    CRON_SECRET=$(grep CRON_SECRET .env | cut -d '=' -f2)
fi

if [ -z "$CRON_SECRET" ]; then
    echo "❌ CRON_SECRET bulunamadı!"
    echo "Lütfen .env.production dosyasına CRON_SECRET ekleyin:"
    echo "CRON_SECRET=$(openssl rand -base64 32)"
    exit 1
fi

# Port'u .env'den al (varsayılan 3000)
PORT=$(grep PORT .env.production 2>/dev/null | cut -d '=' -f2)
if [ -z "$PORT" ]; then
    PORT=3000
fi

# Mevcut cron'u kontrol et
if crontab -l 2>/dev/null | grep -q "google-indexing-batch"; then
    echo "✅ Cron job zaten mevcut"
    echo "Mevcut cron job:"
    crontab -l | grep "google-indexing-batch"
else
    # Yeni cron job ekle
    echo "📝 Yeni cron job ekleniyor..."
    
    # Log dizinini oluştur
    sudo mkdir -p /var/log
    sudo touch /var/log/google-indexing-cron.log
    sudo chmod 666 /var/log/google-indexing-cron.log
    
    # Cron job ekle
    (crontab -l 2>/dev/null; echo "0 * * * * curl -X POST http://localhost:$PORT/api/cron/google-indexing-batch -H \"Authorization: Bearer $CRON_SECRET\" >> /var/log/google-indexing-cron.log 2>&1") | crontab -
    
    echo "✅ Cron job eklendi"
    echo "Cron job: Her saat başı çalışacak"
fi
echo ""

# 6. Test
echo "🧪 Cron endpoint test ediliyor..."
echo "URL: http://localhost:$PORT/api/cron/google-indexing-batch"
echo ""

response=$(curl -s -X POST http://localhost:$PORT/api/cron/google-indexing-batch \
  -H "Authorization: Bearer $CRON_SECRET" \
  -H "Content-Type: application/json")

echo "Yanıt:"
echo "$response" | jq . 2>/dev/null || echo "$response"
echo ""

# 7. Git Commit (opsiyonel)
read -p "Git commit yapmak ister misiniz? (y/n) " git_commit
if [ "$git_commit" = "y" ] || [ "$git_commit" = "Y" ]; then
    echo "📝 Git commit yapılıyor..."
    git add .
    git commit -m "feat: Google Batch Indexing sistemi eklendi (kendi sunucu)"
    
    read -p "Git push yapmak ister misiniz? (y/n) " git_push
    if [ "$git_push" = "y" ] || [ "$git_push" = "Y" ]; then
        git push origin main
        echo "✅ Git push tamamlandı"
    fi
fi
echo ""

# 8. Özet
echo "✅ Deployment tamamlandı!"
echo ""
echo "📋 Kontrol Komutları:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "1. Cron job listesi:        crontab -l"
echo "2. Cron logları:            tail -f /var/log/google-indexing-cron.log"
echo "3. PM2 logları:             pm2 logs"
echo "4. Manuel test:             curl -X POST http://localhost:$PORT/api/cron/google-indexing-batch -H \"Authorization: Bearer $CRON_SECRET\""
echo "5. Database kontrol:        psql -d your_db -c \"SELECT * FROM \\\"GoogleIndexingBatch\\\" ORDER BY createdAt DESC LIMIT 5;\""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📖 Detaylı bilgi: KENDI-SUNUCU-DEPLOYMENT.md"
echo ""
echo "🎉 Sistem hazır! Admin panel: http://localhost:$PORT/admin/google-indexing-batch"
