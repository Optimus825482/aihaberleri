"""
Güvenilir redirect'leri filtrele ve Next.js middleware için JSON oluştur.
Threshold: ratio >= 0.70 (yanlış redirect riski düşük)
"""
import json

with open('redirect_mapping.json', 'r', encoding='utf-8') as f:
    all_redirects = json.load(f)

# Ratio >= 0.70 olan fuzzy match'ler + tüm static/fix redirect'ler
safe_redirects = {}
skipped = []

for r in all_redirects:
    src = r['source']
    dst = r['destination']
    ratio = r['ratio']
    rtype = r['type']
    
    # Static ve double_prefix_fix her zaman dahil
    if rtype in ('static', 'double_prefix_fix'):
        safe_redirects[src] = dst
        continue
    
    # Fuzzy match: ratio >= 0.70
    if ratio >= 0.70:
        safe_redirects[src] = dst
    else:
        skipped.append(r)

# Ek statik redirect'ler (GSC sorunlarından)
extra_statics = {
    '/en/sss': '/en/faq',
    '/kategoriler': '/category',
    '/iletisim': '/contact',
    '/kvkk': '/privacy',
    '/en/kvkk': '/en/privacy',
    '/hakkimizda': '/about',
}
for src, dst in extra_statics.items():
    safe_redirects[src] = dst

print(f"Toplam guvenilir redirect: {len(safe_redirects)}")
print(f"Atlanan (ratio < 0.70): {len(skipped)}")

# Kaydet — middleware'in okuyacağı format
with open('src/data/redirect-map.json', 'w', encoding='utf-8') as f:
    json.dump(safe_redirects, f, ensure_ascii=False)
print(f"\nsrc/data/redirect-map.json kaydedildi ({len(safe_redirects)} redirect)")

# İstatistik
by_prefix = {'tr_news': 0, 'en_news': 0, 'news_en_news': 0, 'root': 0, 'static': 0}
for src in safe_redirects:
    if src.startswith('/news/en/news/'): by_prefix['news_en_news'] += 1
    elif src.startswith('/en/news/'): by_prefix['en_news'] += 1
    elif src.startswith('/news/'): by_prefix['tr_news'] += 1
    elif '/' not in src[1:]: by_prefix['static'] += 1
    else: by_prefix['root'] += 1

for k, v in by_prefix.items():
    print(f"  {k}: {v}")
