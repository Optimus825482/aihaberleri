#!/bin/bash

# Google Indexing API Kurulum Script'i

echo "🚀 Google Indexing API Kurulum Başlıyor..."
echo ""

# 1. Paket kurulumu
echo "📦 1. googleapis paketi yükleniyor..."
npm install googleapis
echo "✅ googleapis yüklendi"
echo ""

# 2. JSON key dosyası kontrolü
echo "🔑 2. Service Account JSON key dosyası kontrol ediliyor..."
if [ -f "aihaberleri-46042-861df20fa232.json" ]; then
    echo "✅ JSON key dosyası bulundu"
else
    echo "❌ JSON key dosyası bulunamadı!"
    echo "   Lütfen 'aihaberleri-46042-861df20fa232.json' dosyasını proje root'una kopyalayın"
    exit 1
fi
echo ""

# 3. Environment variables kontrolü
echo "🌍 3. Environment variables kontrol ediliyor..."
if grep -q "NEXT_PUBLIC_BASE_URL" .env 2>/dev/null; then
    echo "✅ NEXT_PUBLIC_BASE_URL tanımlı"
else
    echo "⚠️  NEXT_PUBLIC_BASE_URL tanımlı değil"
    echo "   .env dosyanıza ekleyin: NEXT_PUBLIC_BASE_URL=https://aihaberleri.com.tr"
fi
echo ""

# 4. Test
echo "🧪 4. API testi yapılıyor..."
echo "   Test komutu: npx tsx scripts/test-google-indexing.ts"
echo ""

echo "✅ Kurulum tamamlandı!"
echo ""
echo "📚 Dokümantasyon: docs/GOOGLE-INDEXING-API-SETUP.md"
echo ""
echo "🎯 Sonraki adımlar:"
echo "   1. npm install googleapis (eğer çalışmadıysa)"
echo "   2. npx tsx scripts/test-google-indexing.ts (test için)"
echo "   3. Haber oluşturma/güncelleme endpoint'lerine entegre edin"
echo ""
