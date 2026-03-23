"""
Derin 404 Analizi — slug'ların neden DB'de bulunamadığını araştır
"""
import csv
import psycopg2
from urllib.parse import urlparse

csv_path = r"D:\bag - Kopya\aihaberleri.org-Coverage-Drilldown-2026-03-23\Tablo.csv"

urls_404 = []
with open(csv_path, 'r', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    for row in reader:
        urls_404.append(row['URL'].strip())

conn = psycopg2.connect(
    host='localhost', port=5432,
    dbname='postgresainewsdb',
    user='postgres', password='518518Erkan'
)
cur = conn.cursor()

# Tüm TR slug'ları al
cur.execute("""SELECT slug FROM "Article" WHERE status = 'PUBLISHED'""")
tr_slugs = set(row[0] for row in cur.fetchall())

# Tüm EN slug'ları al
cur.execute("""SELECT slug FROM "ArticleTranslation" WHERE locale = 'en'""")
en_slugs = set(row[0] for row in cur.fetchall())

print(f"DB'deki TR slug sayısı: {len(tr_slugs)}")
print(f"DB'deki EN slug sayısı: {len(en_slugs)}")

# 404 TR slug'larından ilk 5'ini DB'de benzer slug ara
tr_404_slugs = []
for url in urls_404:
    parsed = urlparse(url)
    path = parsed.path.rstrip('/')
    if path.startswith('/news/') and not path.startswith('/news/en/'):
        slug = path[6:]  # /news/ kısmını çıkar
        tr_404_slugs.append(slug)

en_404_slugs = []
for url in urls_404:
    parsed = urlparse(url)
    path = parsed.path.rstrip('/')
    if path.startswith('/en/news/'):
        slug = path[9:]  # /en/news/ kısmını çıkar
        en_404_slugs.append(slug)

print(f"\n404 TR slug sayısı: {len(tr_404_slugs)}")
print(f"404 EN slug sayısı: {len(en_404_slugs)}")

# Benzerlik kontrolü — LIKE ile ara
print("\n" + "=" * 70)
print("TR 404 SLUG'LARI — DB'DE BENZER ARAMA (ilk 10)")
print("=" * 70)

for slug_404 in tr_404_slugs[:10]:
    # Tam eşleşme
    cur.execute("""SELECT slug FROM "Article" WHERE slug = %s""", (slug_404,))
    exact = cur.fetchone()
    if exact:
        print(f"  EXACT MATCH: {slug_404}")
        continue
    
    # Slug'ın ilk 30 karakteriyle benzer ara
    prefix = slug_404[:30]
    cur.execute("""SELECT slug FROM "Article" WHERE slug LIKE %s AND status = 'PUBLISHED' LIMIT 3""", 
                (f"{prefix}%",))
    similar = cur.fetchall()
    
    if similar:
        print(f"\n  404: {slug_404}")
        for s in similar:
            print(f"  DB:  {s[0]}")
    else:
        # Daha kısa prefix dene
        prefix = slug_404[:20]
        cur.execute("""SELECT slug FROM "Article" WHERE slug LIKE %s AND status = 'PUBLISHED' LIMIT 3""", 
                    (f"{prefix}%",))
        similar = cur.fetchall()
        if similar:
            print(f"\n  404: {slug_404}")
            for s in similar:
                print(f"  DB:  {s[0]}")
        else:
            print(f"\n  404: {slug_404}")
            print(f"  DB:  BENZER YOK (ilk 20 karakter: '{prefix}')")

print("\n" + "=" * 70)
print("EN 404 SLUG'LARI — DB'DE BENZER ARAMA (ilk 10)")
print("=" * 70)

for slug_404 in en_404_slugs[:10]:
    cur.execute("""SELECT slug FROM "ArticleTranslation" WHERE slug = %s AND locale = 'en'""", (slug_404,))
    exact = cur.fetchone()
    if exact:
        print(f"  EXACT MATCH: {slug_404}")
        continue
    
    prefix = slug_404[:30]
    cur.execute("""SELECT slug FROM "ArticleTranslation" WHERE slug LIKE %s AND locale = 'en' LIMIT 3""", 
                (f"{prefix}%",))
    similar = cur.fetchall()
    
    if similar:
        print(f"\n  404: {slug_404}")
        for s in similar:
            print(f"  DB:  {s[0]}")
    else:
        prefix = slug_404[:20]
        cur.execute("""SELECT slug FROM "ArticleTranslation" WHERE slug LIKE %s AND locale = 'en' LIMIT 3""", 
                    (f"{prefix}%",))
        similar = cur.fetchall()
        if similar:
            print(f"\n  404: {slug_404}")
            for s in similar:
                print(f"  DB:  {s[0]}")
        else:
            print(f"\n  404: {slug_404}")
            print(f"  DB:  BENZER YOK")

# Eski redirect sorununu kontrol et
# next.config.js'de /en/news/ → /news/en/ redirect'i vardı
# Bu redirect Google'ın /en/news/ URL'lerini /news/en/ olarak görmesine neden olmuş olabilir
# Ama GSC'de /en/news/ formatında 404 görüyoruz — yani Google /en/news/ URL'lerini taramış
# ve 404 almış. Bu da redirect'in ÇALIŞTIĞINI ve /news/en/ route'unun olmadığını gösterir.

# Aslında bekle — redirect permanent (301) ise Google eski URL'yi de takip eder
# Ama /en/news/ → /news/en/ redirect'i varsa, Google /news/en/ URL'sini 404 olarak görmeli
# GSC'de /en/news/ URL'leri 404 olarak görünüyor — bu redirect'in ÇALIŞMADIĞINI gösterir
# VEYA Google henüz redirect'i görmemiş

# Asıl sorun: Bu URL'ler gerçekten var mı? Canlı sitede kontrol edelim
print("\n" + "=" * 70)
print("NEXT.CONFIG.JS REDIRECT ETKİSİ ANALİZİ")
print("=" * 70)

# /en/news/ redirect'i /news/en/'ye yönlendiriyordu (YANLIŞ)
# Bu redirect kaldırıldı/düzeltildi
# Ama Google hâlâ eski redirect'i cache'lemiş olabilir

# Asıl soru: Bu slug'lar DB'de var mı?
# Eğer 0 match ise, bu slug'lar hiç var olmamış veya silinmiş demektir

# Tüm 404 slug'larını DB'de LIKE ile toplu ara
print("\nTR 404 slug'larından kaçı DB'de herhangi bir şekilde var?")
found_count = 0
not_found_slugs = []
for slug_404 in tr_404_slugs:
    # Tam eşleşme (tüm status'ler dahil)
    cur.execute("""SELECT slug, status FROM "Article" WHERE slug = %s""", (slug_404,))
    result = cur.fetchone()
    if result:
        found_count += 1
    else:
        not_found_slugs.append(slug_404)

print(f"  Tam eşleşme (tüm status): {found_count}/{len(tr_404_slugs)}")
print(f"  Bulunamayan: {len(not_found_slugs)}")

# EN için aynısı
print("\nEN 404 slug'larından kaçı DB'de herhangi bir şekilde var?")
en_found = 0
en_not_found = []
for slug_404 in en_404_slugs:
    cur.execute("""SELECT slug FROM "ArticleTranslation" WHERE slug = %s AND locale = 'en'""", (slug_404,))
    result = cur.fetchone()
    if result:
        en_found += 1
    else:
        en_not_found.append(slug_404)

print(f"  Tam eşleşme: {en_found}/{len(en_404_slugs)}")
print(f"  Bulunamayan: {len(en_not_found)}")

# Sonuç: Eğer slug'lar DB'de yoksa, bunlar ya:
# 1. Eski slug'lar (fix_all_issues.py ile değiştirilmiş)
# 2. Silinmiş makaleler
# 3. Hiç var olmamış URL'ler (Google'ın yanlış keşfettiği)

conn.close()
