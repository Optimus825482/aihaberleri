"""
aihaberleri.org — Tüm SEO Sorunlarını Düzeltme Script'i
========================================================
Sorun 1: Tire ile başlayan 6 slug
Sorun 2: Kesilmiş (sonu tire) 39 slug  
Sorun 3: 215 karakterlik ultra-uzun slug
Sorun 4: 18 TR FAILED makale → PENDING'e çevir (yeniden gönderim için)
Sorun 5: 3 EN FAILED makale → PENDING'e çevir
Sorun 6: /en sayfası hreflang self-ref sorunu (sitemap tarafında)
"""

import psycopg2
import re

conn = psycopg2.connect(
    host='localhost', port=5432,
    dbname='postgresainewsdb',
    user='postgres', password='518518Erkan'
)
conn.autocommit = False
cur = conn.cursor()

changes = []

print("=" * 70)
print("SORUN 1: Tire ile baslayan sluglar")
print("=" * 70)

cur.execute("""SELECT id, slug FROM "Article" WHERE status = 'PUBLISHED' AND slug LIKE '-%'""")
dash_slugs = cur.fetchall()
print(f"Bulunan: {len(dash_slugs)}")

for aid, slug in dash_slugs:
    new_slug = slug.lstrip('-')
    if new_slug.endswith('-'):
        new_slug = new_slug.rstrip('-')
    # Bos kalmasin
    if not new_slug:
        print(f"  SKIP ID={aid}: slug bos kalir")
        continue
    # Duplicate kontrolu
    cur.execute("""SELECT id FROM "Article" WHERE slug = %s AND id != %s""", (new_slug, aid))
    if cur.fetchone():
        print(f"  SKIP ID={aid}: '{new_slug}' zaten var (duplicate)")
        continue
    print(f"  FIX: '{slug}' -> '{new_slug}'")
    cur.execute("""UPDATE "Article" SET slug = %s WHERE id = %s""", (new_slug, aid))
    changes.append(('dash_slug', aid, slug, new_slug))

print(f"Duzeltilen: {len([c for c in changes if c[0] == 'dash_slug'])}")

print("\n" + "=" * 70)
print("SORUN 2: Sonu tire ile biten (kesilmis) sluglar")
print("=" * 70)

cur.execute("""SELECT id, slug FROM "Article" WHERE status = 'PUBLISHED' AND slug LIKE '%-'""")
trailing_dash = cur.fetchall()
print(f"Bulunan: {len(trailing_dash)}")

trailing_fixed = 0
for aid, slug in trailing_dash:
    new_slug = slug.rstrip('-')
    if not new_slug:
        print(f"  SKIP ID={aid}: slug bos kalir")
        continue
    cur.execute("""SELECT id FROM "Article" WHERE slug = %s AND id != %s""", (new_slug, aid))
    if cur.fetchone():
        print(f"  SKIP ID={aid}: '{new_slug}' zaten var")
        continue
    print(f"  FIX: '{slug[:60]}...' -> '{new_slug[:60]}...'")
    cur.execute("""UPDATE "Article" SET slug = %s WHERE id = %s""", (new_slug, aid))
    changes.append(('trailing_dash', aid, slug, new_slug))
    trailing_fixed += 1

print(f"Duzeltilen: {trailing_fixed}")

print("\n" + "=" * 70)
print("SORUN 3: 100+ karakter sluglar (kisaltma)")
print("=" * 70)

cur.execute("""SELECT id, slug, LENGTH(slug) as len FROM "Article" 
WHERE status = 'PUBLISHED' AND LENGTH(slug) > 100 ORDER BY LENGTH(slug) DESC""")
long_slugs = cur.fetchall()
print(f"Bulunan: {len(long_slugs)}")

for aid, slug, slen in long_slugs:
    # Son tire'den once kes, max 90 karakter
    truncated = slug[:90]
    last_dash = truncated.rfind('-')
    if last_dash > 50:
        new_slug = truncated[:last_dash]
    else:
        new_slug = truncated
    new_slug = new_slug.rstrip('-')
    
    cur.execute("""SELECT id FROM "Article" WHERE slug = %s AND id != %s""", (new_slug, aid))
    if cur.fetchone():
        print(f"  SKIP ID={aid}: kisaltilmis slug zaten var")
        continue
    print(f"  FIX ({slen}->{len(new_slug)}): '{slug[:50]}...' -> '{new_slug[:50]}...'")
    cur.execute("""UPDATE "Article" SET slug = %s WHERE id = %s""", (new_slug, aid))
    changes.append(('long_slug', aid, slug, new_slug))

print(f"Duzeltilen: {len([c for c in changes if c[0] == 'long_slug'])}")

print("\n" + "=" * 70)
print("SORUN 4: FAILED TR makaleleri PENDING'e cevir")
print("=" * 70)

cur.execute("""UPDATE "Article" SET "googleIndexStatus" = 'PENDING' 
WHERE status = 'PUBLISHED' AND "googleIndexStatus" = 'FAILED'""")
failed_tr_count = cur.rowcount
print(f"FAILED -> PENDING (TR): {failed_tr_count}")

print("\n" + "=" * 70)
print("SORUN 5: FAILED EN makaleleri PENDING'e cevir")
print("=" * 70)

cur.execute("""UPDATE "Article" SET "googleIndexStatusEn" = 'PENDING' 
WHERE status = 'PUBLISHED' AND "googleIndexStatusEn" = 'FAILED'""")
failed_en_count = cur.rowcount
print(f"FAILED -> PENDING (EN): {failed_en_count}")

print("\n" + "=" * 70)
print("SORUN 6: Ingilizce olmayan EN sluglar (Almanca, vb.)")
print("=" * 70)

# Almanca/diger dil kalintisi slug kontrolu
cur.execute("""
SELECT at.id, at.slug, at."articleId" 
FROM "ArticleTranslation" at
JOIN "Article" a ON at."articleId" = a.id
WHERE at.locale = 'en' AND a.status = 'PUBLISHED'
AND (at.slug LIKE '%bericht-%' OR at.slug LIKE '%milliarden-%' OR at.slug LIKE '%fruhere-%')
""")
non_en = cur.fetchall()
print(f"Ingilizce olmayan EN sluglar: {len(non_en)}")
for tid, slug, aid in non_en:
    print(f"  TranslationID={tid}, ArticleID={aid}: {slug[:80]}")

# OZET
print("\n" + "=" * 70)
print("OZET")
print("=" * 70)
print(f"Tire ile baslayan slug fix: {len([c for c in changes if c[0] == 'dash_slug'])}")
print(f"Sonu tire slug fix: {len([c for c in changes if c[0] == 'trailing_dash'])}")
print(f"Uzun slug fix: {len([c for c in changes if c[0] == 'long_slug'])}")
print(f"FAILED->PENDING (TR): {failed_tr_count}")
print(f"FAILED->PENDING (EN): {failed_en_count}")
print(f"Toplam degisiklik: {len(changes) + failed_tr_count + failed_en_count}")

# Dry-run modunda rollback, --commit ile gercek kayit
import sys
if '--commit' in sys.argv:
    conn.commit()
    print("\nCOMMIT YAPILDI - Tum degisiklikler kaydedildi!")
else:
    conn.rollback()
    print("\nDRY-RUN - Degisiklikler kaydedilmedi. Gercek kayit icin: python fix_all_issues.py --commit")

conn.close()
