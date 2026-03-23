"""
Eski 404 slug'ları ile DB'deki mevcut slug'ları fuzzy matching ile eşleştir.
Amaç: 301 redirect mapping oluşturmak.
"""
import csv
import psycopg2
from urllib.parse import urlparse
from difflib import SequenceMatcher

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
cur.execute("""SELECT id, slug, title FROM "Article" WHERE status = 'PUBLISHED' ORDER BY slug""")
tr_articles = cur.fetchall()
tr_slug_map = {row[1]: (row[0], row[2]) for row in tr_articles}
tr_slugs = list(tr_slug_map.keys())

# Tüm EN slug'ları al
cur.execute("""SELECT at.slug, a.slug as tr_slug, at.title 
FROM "ArticleTranslation" at 
JOIN "Article" a ON at."articleId" = a.id 
WHERE at.locale = 'en' AND a.status = 'PUBLISHED'""")
en_articles = cur.fetchall()
en_slug_map = {row[0]: (row[1], row[2]) for row in en_articles}
en_slugs = list(en_slug_map.keys())

# 404 slug'larını ayır
tr_404 = []
en_404 = []
news_en_news_404 = []
root_404 = []
category_404 = []

for url in urls_404:
    parsed = urlparse(url)
    path = parsed.path.rstrip('/')
    host = parsed.hostname or ''
    
    if 'www.' in host:
        # www prefix — redirect gerekli
        continue
    elif path.startswith('/news/en/news/'):
        slug = path[14:]
        news_en_news_404.append(slug)
    elif path.startswith('/en/news/'):
        slug = path[9:]
        en_404.append(slug)
    elif path.startswith('/news/'):
        slug = path[6:]
        tr_404.append(slug)
    elif path.startswith('/category/') or path.startswith('/en/category/'):
        category_404.append(path)
    else:
        root_404.append(path.strip('/'))

def find_best_match(old_slug, slug_list, threshold=0.6):
    """Fuzzy match ile en yakın slug'ı bul"""
    best_match = None
    best_ratio = 0
    
    # Önce prefix match dene (daha hızlı)
    prefix = old_slug[:15]
    candidates = [s for s in slug_list if s.startswith(prefix)]
    
    if not candidates:
        prefix = old_slug[:10]
        candidates = [s for s in slug_list if s.startswith(prefix)]
    
    if not candidates:
        # Kelime bazlı arama
        words = old_slug.split('-')[:3]
        search_term = '-'.join(words)
        candidates = [s for s in slug_list if search_term in s]
    
    if not candidates:
        candidates = slug_list  # Son çare: hepsini tara
    
    for slug in candidates:
        ratio = SequenceMatcher(None, old_slug, slug).ratio()
        if ratio > best_ratio:
            best_ratio = ratio
            best_match = slug
    
    if best_ratio >= threshold:
        return best_match, best_ratio
    return None, 0

# TR eşleştirme
print("=" * 70)
print(f"TR 404 SLUG ESLESTIRME ({len(tr_404)} slug)")
print("=" * 70)

tr_matches = []
tr_no_match = []
for old_slug in tr_404:
    match, ratio = find_best_match(old_slug, tr_slugs)
    if match:
        tr_matches.append((old_slug, match, ratio))
    else:
        tr_no_match.append(old_slug)

print(f"Eşleşen: {len(tr_matches)}")
print(f"Eşleşmeyen: {len(tr_no_match)}")

print("\nÖrnek eşleşmeler (ilk 20):")
for old, new, ratio in sorted(tr_matches, key=lambda x: -x[2])[:20]:
    print(f"  [{ratio:.2f}] {old[:60]}")
    print(f"       → {new[:60]}")

if tr_no_match:
    print(f"\nEşleşmeyen örnekler (ilk 10):")
    for s in tr_no_match[:10]:
        print(f"  {s[:80]}")

# EN eşleştirme
print("\n" + "=" * 70)
print(f"EN 404 SLUG ESLESTIRME ({len(en_404)} slug)")
print("=" * 70)

en_matches = []
en_no_match = []
for old_slug in en_404:
    match, ratio = find_best_match(old_slug, en_slugs)
    if match:
        en_matches.append((old_slug, match, ratio))
    else:
        en_no_match.append(old_slug)

print(f"Eşleşen: {len(en_matches)}")
print(f"Eşleşmeyen: {len(en_no_match)}")

print("\nÖrnek eşleşmeler (ilk 20):")
for old, new, ratio in sorted(en_matches, key=lambda x: -x[2])[:20]:
    print(f"  [{ratio:.2f}] {old[:60]}")
    print(f"       → {new[:60]}")

if en_no_match:
    print(f"\nEşleşmeyen örnekler (ilk 10):")
    for s in en_no_match[:10]:
        print(f"  {s[:80]}")

# Redirect mapping dosyası oluştur
print("\n" + "=" * 70)
print("REDIRECT MAPPING DOSYASI OLUSTURULUYOR")
print("=" * 70)

redirects = []

# TR redirects
for old, new, ratio in tr_matches:
    if ratio >= 0.6 and old != new:
        redirects.append({
            'source': f'/news/{old}',
            'destination': f'/news/{new}',
            'permanent': True,
            'lang': 'tr',
            'ratio': ratio
        })

# EN redirects
for old, new, ratio in en_matches:
    if ratio >= 0.6 and old != new:
        redirects.append({
            'source': f'/en/news/{old}',
            'destination': f'/en/news/{new}',
            'permanent': True,
            'lang': 'en',
            'ratio': ratio
        })

# /news/en/news/ → /en/news/ redirects
for slug in news_en_news_404:
    redirects.append({
        'source': f'/news/en/news/{slug}',
        'destination': f'/en/news/{slug}',
        'permanent': True,
        'lang': 'fix',
        'ratio': 1.0
    })

print(f"Toplam redirect: {len(redirects)}")
print(f"  TR: {len([r for r in redirects if r['lang'] == 'tr'])}")
print(f"  EN: {len([r for r in redirects if r['lang'] == 'en'])}")
print(f"  Fix: {len([r for r in redirects if r['lang'] == 'fix'])}")

# Root slug'lar
print(f"\nRoot slug (prefix'siz) 404'ler: {len(root_404)}")
print(f"Category 404'ler: {len(category_404)}")

# Redirect'leri JSON dosyasına kaydet
import json
with open('redirect_mapping.json', 'w', encoding='utf-8') as f:
    json.dump(redirects, f, indent=2, ensure_ascii=False)
print("\n✅ redirect_mapping.json dosyası oluşturuldu")

# Düşük güvenilirlikli eşleşmeleri ayrı raporla
low_confidence = [r for r in redirects if r['ratio'] < 0.75 and r['lang'] != 'fix']
if low_confidence:
    print(f"\n⚠️ Düşük güvenilirlikli eşleşmeler ({len(low_confidence)}):")
    for r in low_confidence[:10]:
        print(f"  [{r['ratio']:.2f}] {r['source'][:50]} → {r['destination'][:50]}")

conn.close()
