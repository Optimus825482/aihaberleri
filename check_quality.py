import json

with open('redirect_mapping.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

# Ratio dağılımı
ranges = {'1.0': 0, '0.90-0.99': 0, '0.80-0.89': 0, '0.70-0.79': 0, '0.60-0.69': 0, '0.55-0.59': 0, '<0.55': 0}
for r in data:
    ratio = r['ratio']
    if ratio == 1.0: ranges['1.0'] += 1
    elif ratio >= 0.90: ranges['0.90-0.99'] += 1
    elif ratio >= 0.80: ranges['0.80-0.89'] += 1
    elif ratio >= 0.70: ranges['0.70-0.79'] += 1
    elif ratio >= 0.60: ranges['0.60-0.69'] += 1
    elif ratio >= 0.55: ranges['0.55-0.59'] += 1
    else: ranges['<0.55'] += 1

print('Ratio dagilimi:')
for k, v in ranges.items():
    print(f'  {k}: {v}')

# 0.55-0.65 arası örnekler
print('\nEn dusuk guvenilirlikli ornekler (0.55-0.65):')
low = [r for r in data if 0.55 <= r['ratio'] < 0.65 and r['type'] not in ('static', 'double_prefix_fix')]
for r in sorted(low, key=lambda x: x['ratio'])[:8]:
    src = r['source'][:65]
    dst = r['destination'][:65]
    print(f"  [{r['ratio']:.2f}] {src}")
    print(f"       -> {dst}")

# 0.65-0.75 arası örnekler
print('\nOrta guvenilirlikli ornekler (0.65-0.75):')
mid = [r for r in data if 0.65 <= r['ratio'] < 0.75 and r['type'] not in ('static', 'double_prefix_fix')]
for r in sorted(mid, key=lambda x: x['ratio'])[:8]:
    src = r['source'][:65]
    dst = r['destination'][:65]
    print(f"  [{r['ratio']:.2f}] {src}")
    print(f"       -> {dst}")

# 0.75+ örnekler (güvenilir)
print(f'\nYuksek guvenilirlikli (>=0.75): {len([r for r in data if r["ratio"] >= 0.75])}')
print(f'Orta (0.60-0.75): {len([r for r in data if 0.60 <= r["ratio"] < 0.75])}')
print(f'Dusuk (<0.60): {len([r for r in data if r["ratio"] < 0.60])}')
