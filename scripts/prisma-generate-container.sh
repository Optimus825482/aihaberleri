#!/bin/bash

# Prisma Generate in Container
# Bu script container içinde Prisma client'ı yeniden generate eder

echo "🔍 Container ID'sini buluyorum..."
CONTAINER_ID=$(docker ps | grep "app-i8ggkoowk4s8okc4gso8kg4w" | awk '{print $1}')

if [ -z "$CONTAINER_ID" ]; then
  echo "❌ Container bulunamadı!"
  exit 1
fi

echo "✅ Container bulundu: $CONTAINER_ID"
echo ""
echo "🔄 Prisma client generate ediliyor..."
docker exec -it $CONTAINER_ID npx prisma generate

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
