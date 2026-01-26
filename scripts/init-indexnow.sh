#!/bin/bash

# IndexNow Initialization Script
# Sunucuda tsx olmadan çalıştırmak için API endpoint kullanır

echo "🚀 IndexNow initialization başlatılıyor..."
echo ""

# Next.js sunucusunun çalıştığından emin ol
PORT=${APP_PORT:-3001}
if ! curl -s http://localhost:$PORT/api/health > /dev/null 2>&1; then
    echo "❌ Hata: Next.js sunucusu çalışmıyor (Port: $PORT)!"
    echo "Önce 'npm start' ile sunucuyu başlatın."
    exit 1
fi

# API endpoint'i çağır
echo "📡 http://localhost:$PORT/api/seo/init-indexnow çağrılıyor..."
response=$(curl -s http://localhost:$PORT/api/seo/init-indexnow)

# Response'u parse et ve göster
echo "$response" | node -e "
const data = JSON.parse(require('fs').readFileSync(0, 'utf-8'));
if (data.success) {
    console.log('✅ Başarılı!');
    console.log('');
    data.steps.forEach(step => console.log(step));
    process.exit(0);
} else {
    console.log('❌ Hata:', data.message);
    if (data.error) console.log('Detay:', data.error);
    process.exit(1);
}
"

exit $?
