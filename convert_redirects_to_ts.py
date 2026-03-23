"""redirect-map.json'u TypeScript Map olarak export eden dosya oluştur"""
import json

with open('src/data/redirect-map.json', 'r', encoding='utf-8') as f:
    redirects = json.load(f)

lines = ['// Auto-generated redirect map from GSC 404 analysis',
         '// Do not edit manually — regenerate with build_redirects.py',
         f'// Total: {len(redirects)} redirects',
         '',
         'export const REDIRECT_MAP = new Map<string, string>([']

for src, dst in redirects.items():
    # Escape any quotes in the strings
    src_safe = src.replace("'", "\\'")
    dst_safe = dst.replace("'", "\\'")
    lines.append(f"  ['{src_safe}', '{dst_safe}'],")

lines.append(']);')
lines.append('')

with open('src/data/redirect-map.ts', 'w', encoding='utf-8') as f:
    f.write('\n'.join(lines))

print(f"src/data/redirect-map.ts olusturuldu ({len(redirects)} redirect)")
