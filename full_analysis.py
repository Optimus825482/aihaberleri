import psycopg2
import xml.etree.ElementTree as ET

conn = psycopg2.connect(
    host='localhost', port=5432,
    dbname='postgresainewsdb',
    user='postgres', password='518518Erkan'
)
cur = conn.cursor()

# 1. Slug sorunları
print("=" * 60)
print("1. SLUG SORUNLARI")
print("=" * 60)

# Tire ile başlayan sluglar
cur.execute("""SELECT id, slug FROM "Article" WHERE status = 'PUBLISHED' AND slug LIKE '-%'""")
dash_slugs = cur.fetchall()
print(f"\nTire ile baslayan sluglar: {len(dash_slugs)}")
for aid, slug in dash_slugs:
    print(f"  ID={aid}: {slug}")

# Çok uzun sluglar (>100 karakter)
cur.execute("""SELECT id, slug, LENGTH(slug) as len FROM "Article" 
WHERE status = 'PUBLISHED' AND LENGTH(slug) > 100 ORDER BY LENGTH(slug) DESC""")
long_slugs = cur.fetchall()
print(f"\n100+ karakter slug: {len(long_slugs)}")
for aid, slug, slen in long_slugs[:10]:
    print(f"  ID={aid} ({slen} chr): {slug[:80]}...")

# Kesilmiş sluglar (sonu tire veya eksik görünen)
cur.execute("""SELECT id, slug FROM "Article" 
WHERE status = 'PUBLISHED' AND (slug LIKE '%-' OR LENGTH(slug) < 10)
ORDER BY slug""")
truncated = cur.fetchall()
print(f"\nKesilmis/kisa sluglar: {len(truncated)}")
for aid, slug in truncated[:20]:
    print(f"  ID={aid}: {slug}")

# 2. Google Index durumu özeti
print("\n" + "=" * 60)
print("2. GOOGLE INDEX DURUMU")
print("=" * 60)

cur.execute("""
SELECT "googleIndexStatus", COUNT(*) as cnt 
FROM "Article" WHERE status = 'PUBLISHED' 
GROUP BY "googleIndexStatus" ORDER BY cnt DESC
""")
print("\nTR Google Index:")
for status, cnt in cur.fetchall():
    print(f"  {status}: {cnt}")

cur.execute("""
SELECT "googleIndexStatusEn", COUNT(*) as cnt 
FROM "Article" WHERE status = 'PUBLISHED' 
GROUP BY "googleIndexStatusEn" ORDER BY cnt DESC
""")
print("\nEN Google Index:")
for status, cnt in cur.fetchall():
    print(f"  {status}: {cnt}")

cur.execute("""
SELECT "indexNowStatus", COUNT(*) as cnt 
FROM "Article" WHERE status = 'PUBLISHED' 
GROUP BY "indexNowStatus" ORDER BY cnt DESC
""")
print("\nTR IndexNow:")
for status, cnt in cur.fetchall():
    print(f"  {status}: {cnt}")

# 3. PENDING makalelerin tarih dağılımı
print("\n" + "=" * 60)
print("3. PENDING MAKALELERIN TARIH DAGILIMI")
print("=" * 60)

cur.execute("""
SELECT DATE_TRUNC('week', "publishedAt")::date as week, COUNT(*) as cnt
FROM "Article" 
WHERE status = 'PUBLISHED' AND "googleIndexStatus" = 'PENDING'
GROUP BY week ORDER BY week
""")
print("\nTR PENDING haftalik:")
for week, cnt in cur.fetchall():
    print(f"  {week}: {cnt}")

# 4. FAILED makalelerin detayı
print("\n" + "=" * 60)
print("4. FAILED MAKALELER (TR)")
print("=" * 60)

cur.execute("""
SELECT id, slug, "publishedAt"::date as pub
FROM "Article" 
WHERE status = 'PUBLISHED' AND "googleIndexStatus" = 'FAILED'
ORDER BY "publishedAt" DESC
""")
failed_tr = cur.fetchall()
print(f"\nToplam FAILED (TR): {len(failed_tr)}")
for aid, slug, pub in failed_tr:
    print(f"  [{pub}] ID={aid}: {slug}")

# 5. Sitemap URL uzunluk kontrolü
print("\n" + "=" * 60)
print("5. SITEMAP URL UZUNLUK KONTROLU")
print("=" * 60)

tree = ET.parse(r'D:\bag - Kopya\sitemap.xml')
root = tree.getroot()
ns = {'sm': 'http://www.sitemaps.org/schemas/sitemap/0.9'}
urls = [url.find('sm:loc', ns).text for url in root.findall('sm:url', ns)]

long_urls = [(u, len(u)) for u in urls if len(u) > 200]
print(f"\n200+ karakter URL: {len(long_urls)}")
for u, l in sorted(long_urls, key=lambda x: -x[1])[:10]:
    print(f"  ({l} chr): {u[:100]}...")

# 6. Duplicate content kontrolü (aynı başlıkla birden fazla makale)
print("\n" + "=" * 60)
print("6. DUPLICATE SLUG PATTERN KONTROLU")
print("=" * 60)

cur.execute("""
SELECT slug, COUNT(*) as cnt FROM "Article" 
WHERE status = 'PUBLISHED' 
GROUP BY slug HAVING COUNT(*) > 1
ORDER BY cnt DESC
""")
dupes = cur.fetchall()
print(f"\nDuplicate TR sluglar: {len(dupes)}")
for slug, cnt in dupes[:10]:
    print(f"  ({cnt}x): {slug}")

# 7. Özel karakter kontrolü
print("\n" + "=" * 60)
print("7. OZEL KARAKTER KONTROLU")
print("=" * 60)

cur.execute("""
SELECT id, slug FROM "Article" 
WHERE status = 'PUBLISHED' 
AND (slug ~ '[^a-z0-9-]' OR slug ~ '--' OR slug LIKE '%---%')
ORDER BY slug LIMIT 20
""")
special = cur.fetchall()
print(f"\nOzel karakter/cift tire iceren sluglar: {len(special)}")
for aid, slug in special:
    print(f"  ID={aid}: {slug}")

# 8. EN çeviri eksikleri
print("\n" + "=" * 60)
print("8. EN CEVIRI EKSIKLERI")
print("=" * 60)

cur.execute("""
SELECT a.id, a.slug FROM "Article" a
LEFT JOIN "ArticleTranslation" at ON at."articleId" = a.id AND at.locale = 'en'
WHERE a.status = 'PUBLISHED' AND at.id IS NULL
""")
no_en = cur.fetchall()
print(f"\nEN cevirisi olmayan makaleler: {len(no_en)}")
for aid, slug in no_en[:10]:
    print(f"  ID={aid}: {slug}")

conn.close()

print("\n" + "=" * 60)
print("ANALIZ TAMAMLANDI")
print("=" * 60)
