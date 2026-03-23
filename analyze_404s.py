"""
Google Search Console 404 URL Analizi
=====================================
Tablo.csv'deki 404 URL'lerini kategorize edip DB ile karşılaştırır.
"""
import csv
import psycopg2
from collections import Counter
from urllib.parse import urlparse

# CSV'yi oku
urls_404 = []
csv_path = r"D:\bag - Kopya\aihaberleri.org-Coverage-Drilldown-2026-03-23\Tablo.csv"

with open(csv_path, 'r', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    for row in reader:
        urls_404.append(row['URL'].strip())

print(f"Toplam 404 URL: {len(urls_404)}")
print("=" * 70)

# URL pattern kategorileri
categories = {
    'news_en_news': [],      # /news/en/news/ — çift prefix hatası
    'en_news': [],            # /en/news/ — İngilizce haberler
    'tr_news': [],            # /news/ — Türkçe haberler
    'category': [],           # /category/ — kategori sayfaları
    'en_category': [],        # /en/category/ — EN kategori
    'root_slug': [],          # / — kök seviye slug (eski blog yazıları?)
    'en_sss': [],             # /en/sss — yanlış URL
    'www_prefix': [],         # www. prefix
    'kategoriler': [],        # /kategoriler
    'iletisim': [],           # /iletisim
    'other': [],              # diğer
}

for url in urls_404:
    parsed = urlparse(url)
    path = parsed.path.rstrip('/')
    
    if 'www.aihaberleri.org' in url:
        categories['www_prefix'].append(url)
    elif path.startswith('/news/en/news/'):
        categories['news_en_news'].append(url)
    elif path.startswith('/en/news/'):
        categories['en_news'].append(url)
    elif path.startswith('/news/'):
        categories['tr_news'].append(url)
    elif path.startswith('/en/category/'):
        categories['en_category'].append(url)
    elif path.startswith('/category/'):
        categories['category'].append(url)
    elif path == '/en/sss':
        categories['en_sss'].append(url)
    elif path == '/kategoriler':
        categories['kategoriler'].append(url)
    elif path == '/iletisim':
        categories['iletisim'].append(url)
    elif '/' in path[1:]:  # has subdirectory
        categories['other'].append(url)
    else:
        categories['root_slug'].append(url)

print("\n--- KATEGORI DAGILIMI ---")
for cat, urls in sorted(categories.items(), key=lambda x: -len(x[1])):
    if urls:
        print(f"\n{cat}: {len(urls)} URL")
        for u in urls[:5]:
            print(f"  {u}")
        if len(urls) > 5:
            print(f"  ... ve {len(urls)-5} daha")

# DB bağlantısı — slug'ları kontrol et
print("\n" + "=" * 70)
print("DB KARSILASTIRMASI")
print("=" * 70)

conn = psycopg2.connect(
    host='localhost', port=5432,
    dbname='postgresainewsdb',
    user='postgres', password='518518Erkan'
)
cur = conn.cursor()

# TR slug'ları al
cur.execute("""SELECT slug FROM "Article" WHERE status = 'PUBLISHED'""")
tr_slugs = set(row[0] for row in cur.fetchall())

# EN slug'ları al
cur.execute("""SELECT slug FROM "ArticleTranslation" WHERE locale = 'en'""")
en_slugs = set(row[0] for row in cur.fetchall())

# TR news 404'leri kontrol et
print(f"\n--- TR NEWS 404 ({len(categories['tr_news'])}) ---")
tr_found = 0
tr_missing = []
for url in categories['tr_news']:
    slug = url.split('/news/')[-1].rstrip('/')
    if slug in tr_slugs:
        tr_found += 1
    else:
        tr_missing.append(slug)

print(f"DB'de BULUNAN (yani aslında 404 olmamalı): {tr_found}")
print(f"DB'de BULUNMAYAN (gerçek 404): {len(tr_missing)}")
if tr_missing:
    print("Örnekler:")
    for s in tr_missing[:10]:
        print(f"  /news/{s}")

# EN news 404'leri kontrol et
print(f"\n--- EN NEWS 404 ({len(categories['en_news'])}) ---")
en_found = 0
en_missing = []
for url in categories['en_news']:
    slug = url.split('/en/news/')[-1].rstrip('/')
    if slug in en_slugs:
        en_found += 1
    else:
        en_missing.append(slug)

print(f"DB'de BULUNAN (yani aslında 404 olmamalı): {en_found}")
print(f"DB'de BULUNMAYAN (gerçek 404): {len(en_missing)}")
if en_missing:
    print("Örnekler:")
    for s in en_missing[:10]:
        print(f"  /en/news/{s}")

# /news/en/news/ çift prefix — bunlar redirect ile çözülmeli
print(f"\n--- NEWS/EN/NEWS CIFT PREFIX ({len(categories['news_en_news'])}) ---")
for url in categories['news_en_news']:
    slug = url.split('/news/en/news/')[-1].rstrip('/')
    status = "EN'de VAR" if slug in en_slugs else "EN'de YOK"
    print(f"  {slug} → {status}")

# Root slug'lar — bunlar /news/ prefix'i olmayan URL'ler
print(f"\n--- ROOT SLUG (prefix'siz) ({len(categories['root_slug'])}) ---")
root_in_tr = 0
root_in_en = 0
root_nowhere = []
for url in categories['root_slug']:
    slug = urlparse(url).path.strip('/')
    if slug in tr_slugs:
        root_in_tr += 1
    elif slug in en_slugs:
        root_in_en += 1
    else:
        root_nowhere.append(slug)

print(f"TR Article tablosunda bulunan: {root_in_tr}")
print(f"EN Translation tablosunda bulunan: {root_in_en}")
print(f"Hiçbir yerde bulunmayan: {len(root_nowhere)}")
if root_nowhere:
    print("Örnekler:")
    for s in root_nowhere[:20]:
        print(f"  /{s}")

conn.close()
print("\n✅ Analiz tamamlandı")
