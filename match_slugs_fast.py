"""
Hızlı 404 Slug Eşleştirme — DB-side prefix search + Python-side scoring
Strateji:
1. Tüm slug'ları DB'den çek (tek sorgu)
2. Kelime bazlı inverted index oluştur (O(1) lookup)
3. Her 404 slug için: kelime overlap ile aday bul → SequenceMatcher ile skorla
"""
import csv
import json
import psycopg2
from urllib.parse import urlparse
from difflib import SequenceMatcher
from collections import defaultdict
import time

start = time.time()

csv_path = r"D:\bag - Kopya\aihaberleri.org-Coverage-Drilldown-2026-03-23\Tablo.csv"

# 1. CSV'den 404 URL'leri oku
urls_404 = []
with open(csv_path, 'r', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    for row in reader:
        urls_404.append(row['URL'].strip())

print(f"Toplam 404 URL: {len(urls_404)}")

# 2. DB'den tüm slug'ları tek seferde çek
conn = psycopg2.connect(
    host='localhost', port=5432,
    dbname='postgresainewsdb',
    user='postgres', password='518518Erkan'
)
cur = conn.cursor()

cur.execute("""SELECT id, slug, title FROM "Article" WHERE status = 'PUBLISHED'""")
tr_articles = cur.fetchall()
tr_slug_set = {row[1] for row in tr_articles}
tr_slug_titles = {row[1]: row[2] for row in tr_articles}

cur.execute("""
    SELECT at.slug, a.slug as tr_slug, at.title 
    FROM "ArticleTranslation" at 
    JOIN "Article" a ON at."articleId" = a.id 
    WHERE at.locale = 'en' AND a.status = 'PUBLISHED'
""")
en_articles = cur.fetchall()
en_slug_set = {row[0] for row in en_articles}
en_slug_titles = {row[0]: row[2] for row in en_articles}
conn.close()

print(f"DB TR slug: {len(tr_slug_set)}, EN slug: {len(en_slug_set)}")

# 3. Kelime bazlı inverted index oluştur
def build_word_index(slugs):
    """Her kelime için hangi slug'larda geçtiğini indexle"""
    idx = defaultdict(set)
    for slug in slugs:
        words = slug.split('-')
        for w in words:
            if len(w) >= 3:  # 3+ karakter kelimeler
                idx[w].add(slug)
    return idx

tr_word_idx = build_word_index(tr_slug_set)
en_word_idx = build_word_index(en_slug_set)

print(f"TR word index: {len(tr_word_idx)} kelime")
print(f"EN word index: {len(en_word_idx)} kelime")

# 4. 404 URL'leri kategorize et
tr_404 = []
en_404 = []
news_en_news_404 = []
root_404 = []
category_404 = []
search_404 = []
www_404 = []
special_404 = []

for url in urls_404:
    parsed = urlparse(url)
    path = parsed.path.rstrip('/')
    host = parsed.hostname or ''
    query = parsed.query
    
    if 'www.' in host:
        www_404.append(url)
    elif '/search' in path:
        search_404.append(url)
    elif path.startswith('/news/en/news/'):
        slug = path[14:]
        news_en_news_404.append(slug)
    elif path.startswith('/en/news/'):
        slug = path[9:]
        if slug:
            en_404.append(slug)
    elif path.startswith('/news/'):
        slug = path[6:]
        if slug:
            tr_404.append(slug)
    elif path.startswith('/category/') or path.startswith('/en/category/'):
        category_404.append(path)
    elif path in ('/en/sss', '/kategoriler', '/iletisim', '/kvkk', '/en', '/privacy'):
        special_404.append(path)
    elif path.strip('/'):
        root_404.append(path.strip('/'))

print(f"\nKategoriler:")
print(f"  TR news 404: {len(tr_404)}")
print(f"  EN news 404: {len(en_404)}")
print(f"  /news/en/news/: {len(news_en_news_404)}")
print(f"  Root slug: {len(root_404)}")
print(f"  Search: {len(search_404)}")
print(f"  www: {len(www_404)}")
print(f"  Category: {len(category_404)}")
print(f"  Special: {len(special_404)}")

# 5. Hızlı fuzzy matching
def find_match_fast(old_slug, slug_set, word_idx, threshold=0.55):
    """Kelime overlap ile aday bul, sonra SequenceMatcher ile skorla"""
    # Tam eşleşme
    if old_slug in slug_set:
        return old_slug, 1.0
    
    # Kelime bazlı aday bulma
    words = old_slug.split('-')
    significant_words = [w for w in words if len(w) >= 3]
    
    # Her kelimenin geçtiği slug'ları topla, frekansa göre sırala
    candidate_scores = defaultdict(int)
    for w in significant_words:
        for slug in word_idx.get(w, set()):
            candidate_scores[slug] += 1
    
    if not candidate_scores:
        return None, 0
    
    # En çok kelime overlap olan ilk 20 adayı al
    top_candidates = sorted(candidate_scores.items(), key=lambda x: -x[1])[:20]
    
    # Minimum 2 kelime overlap gerekli (çok kısa slug'lar hariç)
    min_overlap = 2 if len(significant_words) > 3 else 1
    top_candidates = [(s, c) for s, c in top_candidates if c >= min_overlap]
    
    if not top_candidates:
        return None, 0
    
    # SequenceMatcher ile en iyi eşleşmeyi bul
    best_match = None
    best_ratio = 0
    for slug, _ in top_candidates:
        ratio = SequenceMatcher(None, old_slug, slug).ratio()
        if ratio > best_ratio:
            best_ratio = ratio
            best_match = slug
    
    if best_ratio >= threshold:
        return best_match, best_ratio
    return None, 0

# 6. TR eşleştirme
print("\n" + "=" * 70)
print(f"TR 404 ESLESTIRME ({len(tr_404)} slug)")
print("=" * 70)

tr_matches = []
tr_no_match = []
for slug in tr_404:
    match, ratio = find_match_fast(slug, tr_slug_set, tr_word_idx)
    if match and match != slug:
        tr_matches.append((slug, match, ratio))
    elif match == slug:
        tr_matches.append((slug, match, 1.0))
    else:
        tr_no_match.append(slug)

print(f"Eslesen: {len(tr_matches)} (exact: {sum(1 for _,_,r in tr_matches if r==1.0)})")
print(f"Eslesmeyen: {len(tr_no_match)}")

# 7. EN eşleştirme
print(f"\nEN 404 ESLESTIRME ({len(en_404)} slug)")
print("=" * 70)

en_matches = []
en_no_match = []
for slug in en_404:
    match, ratio = find_match_fast(slug, en_slug_set, en_word_idx)
    if match and match != slug:
        en_matches.append((slug, match, ratio))
    elif match == slug:
        en_matches.append((slug, match, 1.0))
    else:
        en_no_match.append(slug)

print(f"Eslesen: {len(en_matches)} (exact: {sum(1 for _,_,r in en_matches if r==1.0)})")
print(f"Eslesmeyen: {len(en_no_match)}")

# 8. Root slug eşleştirme (hem TR hem EN'de ara)
print(f"\nROOT SLUG ESLESTIRME ({len(root_404)} slug)")
print("=" * 70)

root_matches = []
root_no_match = []
for slug in root_404:
    # Önce TR'de ara
    match, ratio = find_match_fast(slug, tr_slug_set, tr_word_idx, threshold=0.5)
    if match:
        root_matches.append((slug, f'/news/{match}', ratio, 'tr'))
        continue
    # Sonra EN'de ara
    match, ratio = find_match_fast(slug, en_slug_set, en_word_idx, threshold=0.5)
    if match:
        root_matches.append((slug, f'/en/news/{match}', ratio, 'en'))
    else:
        root_no_match.append(slug)

print(f"Eslesen: {len(root_matches)}")
print(f"Eslesmeyen: {len(root_no_match)}")

# 9. Sonuçları göster
print("\n" + "=" * 70)
print("ORNEK ESLESMELERI")
print("=" * 70)

print("\n--- TR (en iyi 15) ---")
for old, new, ratio in sorted(tr_matches, key=lambda x: -x[2])[:15]:
    marker = "EXACT" if ratio == 1.0 else f"{ratio:.2f}"
    print(f"  [{marker}] {old[:65]}")
    if old != new:
        print(f"       -> {new[:65]}")

print("\n--- EN (en iyi 15) ---")
for old, new, ratio in sorted(en_matches, key=lambda x: -x[2])[:15]:
    marker = "EXACT" if ratio == 1.0 else f"{ratio:.2f}"
    print(f"  [{marker}] {old[:65]}")
    if old != new:
        print(f"       -> {new[:65]}")

if root_matches:
    print("\n--- ROOT (tumu) ---")
    for old, dest, ratio, lang in sorted(root_matches, key=lambda x: -x[2]):
        print(f"  [{ratio:.2f}] /{old[:55]} -> {dest[:55]}")

# 10. Eşleşmeyen slug'ları göster
if tr_no_match:
    print(f"\n--- TR ESLESMEYEN ({len(tr_no_match)}) ---")
    for s in tr_no_match[:15]:
        print(f"  /news/{s[:70]}")

if en_no_match:
    print(f"\n--- EN ESLESMEYEN ({len(en_no_match)}) ---")
    for s in en_no_match[:15]:
        print(f"  /en/news/{s[:70]}")

if root_no_match:
    print(f"\n--- ROOT ESLESMEYEN ({len(root_no_match)}) ---")
    for s in root_no_match:
        print(f"  /{s}")

# 11. Redirect mapping oluştur
print("\n" + "=" * 70)
print("REDIRECT MAPPING OLUSTURULUYOR")
print("=" * 70)

redirects = []

# TR redirects (exact match hariç — zaten çalışıyor)
for old, new, ratio in tr_matches:
    if old != new:
        redirects.append({
            'source': f'/news/{old}',
            'destination': f'/news/{new}',
            'permanent': True,
            'type': 'tr_fuzzy',
            'ratio': round(ratio, 3)
        })

# EN redirects
for old, new, ratio in en_matches:
    if old != new:
        redirects.append({
            'source': f'/en/news/{old}',
            'destination': f'/en/news/{new}',
            'permanent': True,
            'type': 'en_fuzzy',
            'ratio': round(ratio, 3)
        })

# /news/en/news/ → /en/news/ fix
for slug in news_en_news_404:
    redirects.append({
        'source': f'/news/en/news/{slug}',
        'destination': f'/en/news/{slug}',
        'permanent': True,
        'type': 'double_prefix_fix',
        'ratio': 1.0
    })

# Root slug redirects
for old, dest, ratio, lang in root_matches:
    redirects.append({
        'source': f'/{old}',
        'destination': dest,
        'permanent': True,
        'type': f'root_to_{lang}',
        'ratio': round(ratio, 3)
    })

# Statik redirect'ler
static_redirects = [
    {'source': '/en/sss', 'destination': '/en/faq', 'permanent': True, 'type': 'static', 'ratio': 1.0},
    {'source': '/kategoriler', 'destination': '/category', 'permanent': True, 'type': 'static', 'ratio': 1.0},
    {'source': '/iletisim', 'destination': '/contact', 'permanent': True, 'type': 'static', 'ratio': 1.0},
]
redirects.extend(static_redirects)

# Güvenilirlik grupları
high_conf = [r for r in redirects if r['ratio'] >= 0.75]
med_conf = [r for r in redirects if 0.55 <= r['ratio'] < 0.75]
low_conf = [r for r in redirects if r['ratio'] < 0.55]

print(f"\nToplam redirect: {len(redirects)}")
print(f"  Yuksek guven (>=0.75): {len(high_conf)}")
print(f"  Orta guven (0.55-0.75): {len(med_conf)}")
print(f"  Dusuk guven (<0.55): {len(low_conf)}")

by_type = defaultdict(int)
for r in redirects:
    by_type[r['type']] += 1
for t, c in sorted(by_type.items()):
    print(f"  {t}: {c}")

# JSON kaydet
with open('redirect_mapping.json', 'w', encoding='utf-8') as f:
    json.dump(redirects, f, indent=2, ensure_ascii=False)
print("\nredirect_mapping.json kaydedildi")

# Düşük güvenilirlikli eşleşmeleri ayrı dosyaya kaydet (manuel kontrol için)
if med_conf or low_conf:
    review = med_conf + low_conf
    with open('redirect_review.json', 'w', encoding='utf-8') as f:
        json.dump(review, f, indent=2, ensure_ascii=False)
    print(f"redirect_review.json kaydedildi ({len(review)} adet manuel kontrol)")

# Eşleşmeyen slug'ları kaydet
unmatched = {
    'tr': tr_no_match,
    'en': en_no_match,
    'root': root_no_match,
    'search': search_404,
    'www': www_404,
    'category': category_404,
    'special': special_404
}
with open('unmatched_404s.json', 'w', encoding='utf-8') as f:
    json.dump(unmatched, f, indent=2, ensure_ascii=False)
print(f"unmatched_404s.json kaydedildi")

elapsed = time.time() - start
print(f"\nSure: {elapsed:.1f}s")
