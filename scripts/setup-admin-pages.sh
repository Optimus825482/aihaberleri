#!/bin/bash

# Admin Pages Setup Script
# Bu script yeni admin sayfaları için gerekli kurulumu yapar

echo "🚀 Admin Sayfaları Kurulum Başlatılıyor..."
echo ""

# 1. Prisma Migration
echo "📦 Prisma migration oluşturuluyor..."
npx prisma migrate dev --name add_visitor_model

if [ $? -eq 0 ]; then
    echo "✅ Migration başarılı!"
else
    echo "❌ Migration başarısız! Lütfen hataları kontrol edin."
    exit 1
fi

echo ""

# 2. Prisma Client Generate
echo "🔧 Prisma Client güncelleniyor..."
npx prisma generate

if [ $? -eq 0 ]; then
    echo "✅ Prisma Client güncellendi!"
else
    echo "❌ Prisma Client güncellenemedi!"
    exit 1
fi

echo ""

# 3. Database Push (opsiyonel, development için)
echo "🗄️ Veritabanı güncelleniyor..."
npx prisma db push

if [ $? -eq 0 ]; then
    echo "✅ Veritabanı güncellendi!"
else
    echo "⚠️ Veritabanı güncellenemedi (bu normal olabilir)"
fi

echo ""
echo "✨ Kurulum tamamlandı!"
echo ""
echo "📋 Eklenen Sayfalar:"
echo "  - 📨 Mesajlar: /admin/messages"
echo "  - ⚙️ Ayarlar: /admin/settings"
echo "  - 🏷️ Kategoriler: /admin/categories"
echo "  - 👥 Anlık Ziyaretçiler: /admin/visitors"
echo ""
echo "🚀 Development server'ı başlatmak için:"
echo "  npm run dev"
echo ""
echo "📖 Detaylı dokümantasyon için:"
echo "  cat ADMIN_PAGES_README.md"
echo ""
