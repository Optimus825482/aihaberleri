"""
Google Indexing API — PENDING makaleleri toplu gönderim.
Günlük 200 kota: 120 TR (%60) + 80 EN (%40).
Her çalıştırmada 200 URL gönderir, birkaç gün tekrarla.

Kullanım: python submit_pending_to_google.py
"""

import json
import time
import psycopg2
from google.oauth2 import service_account
from googleapiclient.discovery import build

# --- Config ---
DB_URL = "postgresql://postgres:518518Erkan@localhost:5432/postgresainewsdb"
KEY_FILE = "aihaberleri-46042-861df20fa232.json"
SITE_URL = "https://aihaberleri.org"
DAILY_QUOTA = 200
TR_LIMIT = 120
EN_LIMIT = 80

SCOPES = ["https://www.googleapis.com/auth/indexing"]


def get_indexing_service():
    creds = service_account.Credentials.from_service_account_file(KEY_FILE, scopes=SCOPES)
    return build("indexing", "v3", credentials=creds)


def get_pending_articles(conn, lang: str, limit: int):
    """DB'den PENDING makaleleri çek."""
    cur = conn.cursor()
    if lang == "tr":
        cur.execute("""
            SELECT id, slug FROM "Article"
            WHERE status = 'PUBLISHED'
              AND "googleIndexStatus" = 'PENDING'
              AND "publishedAt" IS NOT NULL
            ORDER BY "publishedAt" DESC
            LIMIT %s
        """, (limit,))
    else:
        cur.execute("""
            SELECT a.id, t.slug FROM "Article" a
            JOIN "ArticleTranslation" t ON t."articleId" = a.id AND t.locale = 'en'
            WHERE a.status = 'PUBLISHED'
              AND a."googleIndexStatusEn" = 'PENDING'
              AND a."publishedAt" IS NOT NULL
            ORDER BY a."publishedAt" DESC
            LIMIT %s
        """, (limit,))
    rows = cur.fetchall()
    cur.close()
    return rows


def notify_google(service, url: str) -> bool:
    """Tek URL'yi Google Indexing API'ye gönder."""
    try:
        body = {"url": url, "type": "URL_UPDATED"}
        response = service.urlNotifications().publish(body=body).execute()
        return True
    except Exception as e:
        error_msg = str(e)
        if "429" in error_msg or "RESOURCE_EXHAUSTED" in error_msg or "Quota" in error_msg:
            print(f"  ⛔ KOTA DOLDU — durduruluyor")
            return None  # Quota exhausted signal
        print(f"  ❌ Hata: {error_msg[:100]}")
        return False


def update_status(conn, article_id: str, lang: str, success: bool):
    """DB'de googleIndexStatus güncelle."""
    cur = conn.cursor()
    if lang == "tr":
        if success:
            cur.execute("""
                UPDATE "Article" SET "googleIndexStatus" = 'SUBMITTED', "googleIndexedAt" = NOW()
                WHERE id = %s
            """, (article_id,))
        else:
            cur.execute("""
                UPDATE "Article" SET "googleIndexStatus" = 'FAILED'
                WHERE id = %s
            """, (article_id,))
    else:
        if success:
            cur.execute("""
                UPDATE "Article" SET "googleIndexStatusEn" = 'SUBMITTED', "googleIndexedAtEn" = NOW()
                WHERE id = %s
            """, (article_id,))
        else:
            cur.execute("""
                UPDATE "Article" SET "googleIndexStatusEn" = 'FAILED'
                WHERE id = %s
            """, (article_id,))
    conn.commit()
    cur.close()


def main():
    conn = psycopg2.connect(DB_URL)
    service = get_indexing_service()

    # TR PENDING'ler
    tr_articles = get_pending_articles(conn, "tr", TR_LIMIT)
    print(f"\n🇹🇷 TR PENDING: {len(tr_articles)} makale (limit {TR_LIMIT})")

    tr_ok, tr_fail = 0, 0
    quota_hit = False
    for article_id, slug in tr_articles:
        url = f"{SITE_URL}/news/{slug}"
        result = notify_google(service, url)
        if result is None:
            quota_hit = True
            break
        if result:
            update_status(conn, article_id, "tr", True)
            tr_ok += 1
            print(f"  ✅ [{tr_ok}] {slug[:60]}")
        else:
            update_status(conn, article_id, "tr", False)
            tr_fail += 1
        time.sleep(0.3)

    print(f"  TR Sonuç: {tr_ok} başarılı, {tr_fail} başarısız")

    if quota_hit:
        print("\n⛔ Kota doldu, EN gönderimi atlanıyor.")
    else:
        # EN PENDING'ler
        en_articles = get_pending_articles(conn, "en", EN_LIMIT)
        print(f"\n🇬🇧 EN PENDING: {len(en_articles)} makale (limit {EN_LIMIT})")

        en_ok, en_fail = 0, 0
        for article_id, slug in en_articles:
            url = f"{SITE_URL}/en/news/{slug}"
            result = notify_google(service, url)
            if result is None:
                break
            if result:
                update_status(conn, article_id, "en", True)
                en_ok += 1
                print(f"  ✅ [{en_ok}] {slug[:60]}")
            else:
                update_status(conn, article_id, "en", False)
                en_fail += 1
            time.sleep(0.3)

        print(f"  EN Sonuç: {en_ok} başarılı, {en_fail} başarısız")

    # Final durum
    cur = conn.cursor()
    cur.execute("""
        SELECT 
            SUM(CASE WHEN "googleIndexStatus" = 'PENDING' THEN 1 ELSE 0 END) as tr_pending,
            SUM(CASE WHEN "googleIndexStatus" = 'SUBMITTED' THEN 1 ELSE 0 END) as tr_submitted,
            SUM(CASE WHEN "googleIndexStatusEn" = 'PENDING' THEN 1 ELSE 0 END) as en_pending,
            SUM(CASE WHEN "googleIndexStatusEn" = 'SUBMITTED' THEN 1 ELSE 0 END) as en_submitted
        FROM "Article" WHERE status = 'PUBLISHED'
    """)
    row = cur.fetchone()
    cur.close()
    conn.close()

    print(f"\n📊 Güncel Durum:")
    print(f"  TR: {row[1]} SUBMITTED, {row[0]} PENDING")
    print(f"  EN: {row[3]} SUBMITTED, {row[2]} PENDING")
    print(f"\n💡 Kalan PENDING varsa yarın tekrar çalıştır.")


if __name__ == "__main__":
    main()
