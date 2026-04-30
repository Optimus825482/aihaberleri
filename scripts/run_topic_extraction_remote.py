#!/usr/bin/env python3
"""
Remote Topic Extraction - Direct Database Connection
=====================================================

Sunucudaki veritabanına doğrudan bağlanıp topic extraction yapar.

Kullanım:
    python3 scripts/run_topic_extraction_remote.py --test
    python3 scripts/run_topic_extraction_remote.py --limit 100
    python3 scripts/run_topic_extraction_remote.py --all
"""

import os
import sys
import time
import argparse
import psycopg2
import requests
import re
from datetime import datetime
from typing import List, Dict, Optional

# Remote Database Configuration
REMOTE_DATABASE_URL = (
    "postgresql://postgres:518518Erkan@77.42.68.4:5435/postgresainewsdb"
)

# DeepSeek API Configuration
DEEPSEEK_API_KEY = os.getenv("DEEPSEEK_API_KEY", "sk-2750fa1691164dd2940c2ec3cb37d2e6")
DEEPSEEK_API_URL = "https://api.deepseek.com/v1/chat/completions"


# Colors for terminal output
class Colors:
    HEADER = "\033[95m"
    OKBLUE = "\033[94m"
    OKCYAN = "\033[96m"
    OKGREEN = "\033[92m"
    WARNING = "\033[93m"
    FAIL = "\033[91m"
    ENDC = "\033[0m"
    BOLD = "\033[1m"


def print_header(text: str):
    """Print colored header"""
    print(f"\n{Colors.HEADER}{Colors.BOLD}{'=' * 60}{Colors.ENDC}")
    print(f"{Colors.HEADER}{Colors.BOLD}{text}{Colors.ENDC}")
    print(f"{Colors.HEADER}{Colors.BOLD}{'=' * 60}{Colors.ENDC}\n")


def print_success(text: str):
    """Print success message"""
    print(f"{Colors.OKGREEN}✅ {text}{Colors.ENDC}")


def print_error(text: str):
    """Print error message"""
    print(f"{Colors.FAIL}❌ {text}{Colors.ENDC}")


def print_warning(text: str):
    """Print warning message"""
    print(f"{Colors.WARNING}⚠️  {text}{Colors.ENDC}")


def print_info(text: str):
    """Print info message"""
    print(f"{Colors.OKCYAN}ℹ️  {text}{Colors.ENDC}")


def connect_database():
    """Connect to remote PostgreSQL database"""
    print_info("Connecting to REMOTE database...")
    print_info(f"Host: 77.42.68.4:5435")
    print_info(f"Database: postgresainewsdb")

    try:
        conn = psycopg2.connect(
            REMOTE_DATABASE_URL,
            connect_timeout=10,
            options="-c statement_timeout=30000",
        )
        print_success("Remote database connected!")
        return conn
    except Exception as e:
        print_error(f"Database connection failed: {e}")
        sys.exit(1)


def check_and_create_topic_column(conn):
    """Check if topic column exists, create if not"""
    print_info("Checking topic column...")

    cursor = conn.cursor()

    try:
        # Check if column exists
        cursor.execute("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name='Article' AND column_name='topic'
        """)

        if cursor.fetchone():
            print_success("Topic column already exists")
        else:
            print_warning("Topic column not found, creating...")

            # Create column
            cursor.execute('ALTER TABLE "Article" ADD COLUMN "topic" TEXT')

            # Create indexes
            cursor.execute(
                'CREATE INDEX IF NOT EXISTS "Article_topic_idx" ON "Article"("topic")'
            )
            cursor.execute(
                'CREATE INDEX IF NOT EXISTS "Article_topic_publishedAt_idx" ON "Article"("topic", "publishedAt" DESC)'
            )

            conn.commit()
            print_success("Topic column created with indexes")

        cursor.close()
    except Exception as e:
        print_error(f"Failed to check/create topic column: {e}")
        conn.rollback()
        sys.exit(1)


def get_articles_without_topic(conn, limit: Optional[int] = None) -> List[Dict]:
    """Get articles that don't have a topic yet"""
    cursor = conn.cursor()

    query = """
        SELECT id, title 
        FROM "Article" 
        WHERE topic IS NULL 
        AND status = 'PUBLISHED'
        ORDER BY "publishedAt" DESC
    """

    if limit:
        query += f" LIMIT {limit}"

    cursor.execute(query)
    articles = []

    for row in cursor.fetchall():
        articles.append({"id": row[0], "title": row[1]})

    cursor.close()
    return articles


def extract_topic_with_deepseek(title: str) -> str:
    """Extract topic from title using DeepSeek API"""

    prompt = f"""Sen bir haber kategorilendirme uzmanısın.

Görevin: Aşağıdaki haber başlığından KISA ve AÇIKLAYICI bir topic (konu) çıkar.

KURALLAR:
1. Topic 2-4 kelime olmalı (snake_case formatında)
2. Ana entity'leri içermeli (şirket, ürün, kişi)
3. Ana aksiyonu içermeli (investment, ban, release, partnership, launch, acquisition)
4. Türkçe karaktersiz, küçük harf, alt çizgi ile ayrılmış
5. Genel değil, SPESIFIK ol

ÖRNEKLER:
- "Nvidia CEO'su OpenAI'a 100 Milyar Dolar Yatırım Yapacak" → nvidia_openai_investment
- "Endonezya Grok Yapay Zekasına Yasağı Kaldırdı" → indonesia_grok_ban
- "Google Gemini 2.0 Tanıtıldı" → google_gemini_release
- "Tesla Autopilot Güvenlik Sorunları" → tesla_autopilot_safety
- "Microsoft Copilot Yeni Özellikler" → microsoft_copilot_features

BAŞLIK: "{title}"

SADECE TOPIC'İ YANIT VER (örnek: nvidia_openai_investment)"""

    try:
        response = requests.post(
            DEEPSEEK_API_URL,
            headers={
                "Authorization": f"Bearer {DEEPSEEK_API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "model": "deepseek-chat",
                "messages": [
                    {
                        "role": "system",
                        "content": "Sen bir haber kategorilendirme uzmanısın. Sadece topic yanıtı ver, başka hiçbir şey yazma.",
                    },
                    {"role": "user", "content": prompt},
                ],
                "max_tokens": 50,
                "temperature": 0.3,
            },
            timeout=30,
        )

        if response.status_code == 200:
            data = response.json()
            topic = data["choices"][0]["message"]["content"].strip()

            # Clean up topic
            topic = topic.lower()
            topic = re.sub(r"[^a-z0-9_]", "_", topic)
            topic = re.sub(r"_+", "_", topic)
            topic = topic.strip("_")

            # Validate topic length
            if len(topic) < 5 or len(topic) > 50:
                print_warning(f"Invalid topic length: {topic}, using fallback")
                return generate_fallback_topic(title)

            return topic
        else:
            print_error(f"DeepSeek API error: {response.status_code}")
            return generate_fallback_topic(title)

    except Exception as e:
        print_error(f"DeepSeek API exception: {e}")
        return generate_fallback_topic(title)


def generate_fallback_topic(title: str) -> str:
    """Generate fallback topic if DeepSeek fails"""
    # Extract first 3-4 meaningful words
    words = re.findall(r"\b\w{4,}\b", title.lower())
    topic = "_".join(words[:4]) if words else "unknown_topic"

    # Clean up
    topic = re.sub(r"[^a-z0-9_]", "_", topic)
    topic = re.sub(r"_+", "_", topic)
    topic = topic.strip("_")

    return topic[:50]  # Max 50 chars


def update_article_topic(conn, article_id: str, topic: str):
    """Update article with extracted topic"""
    cursor = conn.cursor()

    try:
        cursor.execute(
            'UPDATE "Article" SET topic = %s WHERE id = %s', (topic, article_id)
        )
        conn.commit()
        cursor.close()
    except Exception as e:
        print_error(f"Failed to update article {article_id}: {e}")
        conn.rollback()
        raise


def process_articles(conn, articles: List[Dict], batch_size: int = 4):
    """Process articles in batches"""
    total = len(articles)
    processed = 0
    failed = 0
    start_time = time.time()

    print_header(f"PROCESSING {total} ARTICLES")
    print_info(f"Batch size: {batch_size}")
    print_info(f"Rate limit protection: 500ms between batches\n")

    for i in range(0, total, batch_size):
        batch = articles[i : i + batch_size]
        batch_num = (i // batch_size) + 1
        total_batches = (total + batch_size - 1) // batch_size

        print(
            f"\n{Colors.OKBLUE}📦 Batch {batch_num}/{total_batches} ({len(batch)} articles){Colors.ENDC}"
        )

        for article in batch:
            try:
                # Extract topic
                topic = extract_topic_with_deepseek(article["title"])

                # Update database
                update_article_topic(conn, article["id"], topic)

                processed += 1

                # Print progress
                title_short = (
                    article["title"][:50] + "..."
                    if len(article["title"]) > 50
                    else article["title"]
                )
                print(
                    f"   {Colors.OKGREEN}✅ [{processed}/{total}]{Colors.ENDC} {title_short}"
                )
                print(f"      → {Colors.OKCYAN}{topic}{Colors.ENDC}")

            except Exception as e:
                failed += 1
                print_error(f"   [{processed + failed}/{total}] Failed: {e}")

        # Rate limit protection (500ms between batches)
        if i + batch_size < total:
            time.sleep(0.5)

    # Calculate stats
    duration = time.time() - start_time
    rate = processed / duration if duration > 0 else 0

    # Print summary
    print_header("PROCESSING COMPLETE")
    print(f"{Colors.OKGREEN}✅ Processed: {processed}{Colors.ENDC}")
    print(f"{Colors.FAIL}❌ Failed: {failed}{Colors.ENDC}")
    print(f"{Colors.OKCYAN}⏱️  Duration: {duration:.1f}s{Colors.ENDC}")
    print(f"{Colors.OKCYAN}📊 Rate: {rate:.1f} articles/sec{Colors.ENDC}")
    print(f"{Colors.HEADER}{'=' * 60}{Colors.ENDC}\n")


def test_connection(conn):
    """Test database connection and show stats"""
    print_header("DATABASE CONNECTION TEST")

    cursor = conn.cursor()

    # Test 1: Total articles
    cursor.execute('SELECT COUNT(*) FROM "Article"')
    total = cursor.fetchone()[0]
    print_info(f"Total articles: {total}")

    # Test 2: Articles without topic
    cursor.execute('SELECT COUNT(*) FROM "Article" WHERE topic IS NULL')
    without_topic = cursor.fetchone()[0]
    print_info(f"Articles without topic: {without_topic}")

    # Test 3: Articles with topic
    cursor.execute('SELECT COUNT(*) FROM "Article" WHERE topic IS NOT NULL')
    with_topic = cursor.fetchone()[0]
    print_info(f"Articles with topic: {with_topic}")

    # Test 4: Sample topics
    cursor.execute(
        'SELECT topic, COUNT(*) as count FROM "Article" WHERE topic IS NOT NULL GROUP BY topic ORDER BY count DESC LIMIT 5'
    )
    print_info("Top 5 topics:")
    for row in cursor.fetchall():
        print(f"   {Colors.OKCYAN}{row[0]}{Colors.ENDC}: {row[1]} articles")

    cursor.close()
    print_success("Connection test passed!")


def main():
    """Main function"""
    parser = argparse.ArgumentParser(
        description="Extract topics for existing articles (REMOTE DATABASE)"
    )
    parser.add_argument(
        "--test", action="store_true", help="Test database connection only"
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=100,
        help="Number of articles to process (default: 100)",
    )
    parser.add_argument(
        "--all", action="store_true", help="Process all articles without topic"
    )
    parser.add_argument(
        "--batch-size",
        type=int,
        default=4,
        help="Number of articles to process in parallel (default: 4)",
    )

    args = parser.parse_args()

    # Print banner
    print_header("🚀 REMOTE TOPIC EXTRACTION")
    print(
        f"{Colors.OKCYAN}Date: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}{Colors.ENDC}"
    )
    print(f"{Colors.OKCYAN}Target: REMOTE DATABASE (77.42.68.4:5435){Colors.ENDC}")
    print(
        f"{Colors.OKCYAN}Mode: {'TEST' if args.test else ('ALL' if args.all else f'LIMIT {args.limit}')}{Colors.ENDC}"
    )
    print(f"{Colors.OKCYAN}Batch Size: {args.batch_size}{Colors.ENDC}\n")

    # Connect to database
    conn = connect_database()

    # Test mode
    if args.test:
        test_connection(conn)
        conn.close()
        return

    # Check/create topic column
    check_and_create_topic_column(conn)

    # Get articles
    print_info("Fetching articles without topic...")

    if args.all:
        articles = get_articles_without_topic(conn, limit=None)
    else:
        articles = get_articles_without_topic(conn, limit=args.limit)

    if not articles:
        print_warning("No articles found without topic")
        conn.close()
        return

    print_success(f"Found {len(articles)} articles")

    # Process articles
    try:
        process_articles(conn, articles, batch_size=args.batch_size)
    except KeyboardInterrupt:
        print_warning("\n\nProcess interrupted by user")
    finally:
        conn.close()
        print_info("Database connection closed")


if __name__ == "__main__":
    main()
