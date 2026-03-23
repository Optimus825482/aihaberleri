import xml.etree.ElementTree as ET

tree = ET.parse(r'D:\bag - Kopya\sitemap.xml')
root = tree.getroot()
ns = {
    'sm': 'http://www.sitemaps.org/schemas/sitemap/0.9',
    'xhtml': 'http://www.w3.org/1999/xhtml'
}

urls = root.findall('sm:url', ns)
print(f"Total URL entries: {len(urls)}")

# Check hreflang structure on news URLs
has_hreflang = 0
no_hreflang = 0
broken_hreflang = 0
hreflang_issues = []

base = 'https://aihaberleri.org'

for url in urls:
    loc = url.find('sm:loc', ns).text
    links = url.findall('xhtml:link', ns)
    
    if links:
        has_hreflang += 1
        hreflangs = {}
        for link in links:
            lang = link.get('hreflang')
            href = link.get('href')
            hreflangs[lang] = href
        
        # Check: should have both tr and en
        if 'tr' not in hreflangs or 'en' not in hreflangs:
            broken_hreflang += 1
            hreflang_issues.append(f"MISSING_LANG: {loc} -> {hreflangs}")
        
        # Check: self-referencing
        path = loc.replace(base, '')
        if '/en/' in path:
            if hreflangs.get('en') != loc:
                broken_hreflang += 1
                hreflang_issues.append(f"SELF_REF_EN: {loc}")
        else:
            if hreflangs.get('tr') != loc:
                broken_hreflang += 1
                hreflang_issues.append(f"SELF_REF_TR: {loc}")
    else:
        no_hreflang += 1

print(f"With hreflang: {has_hreflang}")
print(f"Without hreflang: {no_hreflang}")
print(f"Broken hreflang: {broken_hreflang}")

if hreflang_issues:
    print(f"\n--- Hreflang Issues (first 20) ---")
    for issue in hreflang_issues[:20]:
        print(f"  {issue}")

# Show sample hreflang
print("\n--- Sample hreflang entries ---")
count = 0
for url in urls:
    loc = url.find('sm:loc', ns).text
    links = url.findall('xhtml:link', ns)
    if links and '/news/' in loc:
        print(f"\nURL: {loc}")
        for link in links:
            lang = link.get('hreflang')
            href = link.get('href')
            print(f"  {lang}: {href}")
        count += 1
        if count >= 3:
            break
