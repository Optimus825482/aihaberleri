@echo off
REM Admin Pages Setup Script (Windows)
REM Bu script yeni admin sayfaları için gerekli kurulumu yapar

echo.
echo 🚀 Admin Sayfaları Kurulum Başlatılıyor...
echo.

REM 1. Prisma Migration
echo 📦 Prisma migration oluşturuluyor...
call npx prisma migrate dev --name add_visitor_model

if %ERRORLEVEL% EQU 0 (
    echo ✅ Migration başarılı!
) else (
    echo ❌ Migration başarısız! Lütfen hataları kontrol edin.
    exit /b 1
)

echo.

REM 2. Prisma Client Generate
echo 🔧 Prisma Client güncelleniyor...
call npx prisma generate

if %ERRORLEVEL% EQU 0 (
    echo ✅ Prisma Client güncellendi!
) else (
    echo ❌ Prisma Client güncellenemedi!
    exit /b 1
)

echo.

REM 3. Database Push (opsiyonel, development için)
echo 🗄️ Veritabanı güncelleniyor...
call npx prisma db push

if %ERRORLEVEL% EQU 0 (
    echo ✅ Veritabanı güncellendi!
) else (
    echo ⚠️ Veritabanı güncellenemedi (bu normal olabilir)
)

echo.
echo ✨ Kurulum tamamlandı!
echo.
echo 📋 Eklenen Sayfalar:
echo   - 📨 Mesajlar: /admin/messages
echo   - ⚙️ Ayarlar: /admin/settings
echo   - 🏷️ Kategoriler: /admin/categories
echo   - 👥 Anlık Ziyaretçiler: /admin/visitors
echo.
echo 🚀 Development server'ı başlatmak için:
echo   npm run dev
echo.
echo 📖 Detaylı dokümantasyon için:
echo   type ADMIN_PAGES_README.md
echo.

pause
