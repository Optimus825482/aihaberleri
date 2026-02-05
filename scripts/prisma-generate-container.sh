 28f19417ef06#!/bin/bash

# Prisma Generate in Container
# Bu script container içinde Prisma client'ı yeniden generate eder

CONTAINER_ID="28f19417ef06"

echo "✅ Container ID: $CONTAINER_ID"
echo ""
echo "🔄 Prisma client generate ediliyor..."
docker exec $CONTAINER_ID npx prisma generate

echo ""
echo "✅ Prisma client başarıyla generate edildi!"
echo ""
echo "🔄 Container'ı yeniden başlatıyorum..."
docker restart $CONTAINER_ID

echo ""
echo "✅ Tamamlandı! Container yeniden başlatıldı."
echo ""
echo "📝 Test için:"
echo "   https://aihaberleri.org/admin/seo-notifications"
echo ""
echo "🎯 Beklenen Sonuç:"
echo "   - ✅ Prisma client googleIndexStatus kolonunu tanıyacak"
echo "   - ✅ TypeScript hataları kaybolacak"
echo "   - ✅ 'Hepsini Google'a Gönder' butonu çalışacak"
echo "   - ✅ Batch processing (100 URL/batch) aktif olacak"
