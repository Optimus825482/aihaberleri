import xml.etree.ElementTree as ET

tree = ET.parse(r'D:\bag - Kopya\sitemap.xml')
root = tree.getroot()
ns = {
    'sm': 'http://www.sitemaps.org/schemas/sitemap/0.9',
    'xhtml': 'http://www.w3.org/1999/xhtml'
}

base = 'https://aihaberleri.org'
urls = root.findall('sm:url', ns)

# Build hreflang map: url -> {lang: href}
hreflang_map = {}
for url in urls:
    loc = url.find('sm:loc', ns).text
    links = url.findall('xhtml:link', ns)
    hreflangs = {}
    for link in links:
        lang = link.get('hreflang')
        href = link.get('href')
        hreflangs[lang] = href
    hreflang_map[loc] = hreflangs

# Check bidirectional hreflang consistency
issues = []
checked = 0
for loc, hreflangs in hreflang_map.items():
    path = loc.replace(base, '')
    if '/news/' not in path:
        continue
    checked += 1
    
    for lang, href in hreflangs.items():
        if href == loc:
            continue  # self-reference, skip
        # The target should point back to us
        if href in hreflang_map:
            target_hreflangs = hreflang_map[href]
            # Determine our language
            if '/en/' in path:
                our_lang = 'en'
            else:
                our_lang = 'tr'
            
            if our_lang not in target_hreflangs:
                issues.append(f"NO_BACKLINK: {loc} -> {href} (missing {our_lang} backlink)")
            elif target_hreflangs[our_lang] != loc:
                issues.append(f"MISMATCH: {loc} expects backlink from {href}, but got {target_hreflangs[our_lang]}")
        else:
            issues.append(f"ORPHAN_TARGET: {loc} points to {href} which is NOT in sitemap")

print(f"Checked {checked} news URLs")
print(f"Bidirectional issues: {len(issues)}")

if issues:
    print("\n--- Issues (first 30) ---")
    for issue in issues[:30]:
        print(f"  {issue}")
else:
    print("All hreflang pairs are bidirectionally consistent!")

# Check category hreflang pairs
print("\n=== CATEGORY HREFLANG ===")
cat_issues = []
for loc, hreflangs in hreflang_map.items():
    path = loc.replace(base, '')
    if '/category/' not in path:
        continue
    for lang, href in hreflangs.items():
        if href == loc:
            continue
        if href not in hreflang_map:
            cat_issues.append(f"ORPHAN: {loc} -> {href}")
        else:
            target = hreflang_map[href]
            if '/en/' in path:
                our_lang = 'en'
            else:
                our_lang = 'tr'
            if our_lang not in target or target[our_lang] != loc:
                cat_issues.append(f"MISMATCH: {loc} <-> {href}")

print(f"Category issues: {len(cat_issues)}")
for ci in cat_issues:
    print(f"  {ci}")
