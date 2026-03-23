import psycopg2

conn = psycopg2.connect(
    host='localhost', port=5432,
    dbname='postgresainewsdb',
    user='postgres', password='518518Erkan'
)
cur = conn.cursor()

# TR slugs from DB
cur.execute("""SELECT slug FROM "Article" WHERE status = 'PUBLISHED' ORDER BY slug""")
db_tr_slugs = set(row[0] for row in cur.fetchall())

# EN slugs from DB
cur.execute("""
    SELECT at.slug FROM "ArticleTranslation" at
    JOIN "Article" a ON at."articleId" = a.id
    WHERE at.locale = 'en' AND a.status = 'PUBLISHED'
    ORDER BY at.slug
""")
db_en_slugs = set(row[0] for row in cur.fetchall())
conn.close()

# Sitemap slugs
with open('sitemap_tr_slugs.txt', 'r', encoding='utf-8') as f:
    sitemap_tr = set(line.strip() for line in f if line.strip())
with open('sitemap_en_slugs.txt', 'r', encoding='utf-8') as f:
    sitemap_en = set(line.strip() for line in f if line.strip())

print("=== TR KARSILASTIRMA ===")
print(f"DB: {len(db_tr_slugs)}, Sitemap: {len(sitemap_tr)}")
tr_only_db = db_tr_slugs - sitemap_tr
tr_only_sitemap = sitemap_tr - db_tr_slugs
print(f"Sadece DB'de: {len(tr_only_db)}")
print(f"Sadece Sitemap'te: {len(tr_only_sitemap)}")

if tr_only_db:
    print("\n--- DB'de var, Sitemap'te yok (TR) ---")
    for s in sorted(tr_only_db)[:30]:
        print(f"  {s}")

if tr_only_sitemap:
    print("\n--- Sitemap'te var, DB'de yok (TR) ---")
    for s in sorted(tr_only_sitemap)[:30]:
        print(f"  {s}")

print("\n=== EN KARSILASTIRMA ===")
print(f"DB: {len(db_en_slugs)}, Sitemap: {len(sitemap_en)}")
en_only_db = db_en_slugs - sitemap_en
en_only_sitemap = sitemap_en - db_en_slugs
print(f"Sadece DB'de: {len(en_only_db)}")
print(f"Sadece Sitemap'te: {len(en_only_sitemap)}")
