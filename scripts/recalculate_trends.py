#!/usr/bin/env python3
"""
AI Haberleri - Trend Skoru Yeniden Hesaplama Scripti
=====================================================

Bu script, veritabanındaki tüm yayınlanmış haberlerin trend skorlarını
en son yayınlanan haberden ilk habere kadar yeniden hesaplar.

Kullanım:
    python recalculate_trends.py

Gerekli kütüphaneler:
    pip install psycopg2-binary colorama tqdm
"""

import os
import sys
import math
from datetime import datetime, timedelta
from typing import Optional, Tuple

try:
    import psycopg2
    from psycopg2.extras import RealDictCursor
except ImportError:
    print("❌ psycopg2 yüklü değil. Kurulum: pip install psycopg2-binary")
    sys.exit(1)

try:
    from colorama import init, Fore, Back, Style
    init(autoreset=True)
except ImportError:
    print("❌ colorama yüklü değil. Kurulum: pip install colorama")
    sys.exit(1)

try:
    from tqdm import tqdm
except ImportError:
    print("❌ tqdm yüklü değil. Kurulum: pip install tqdm")
    sys.exit(1)


# ============================================================
# VERITABANI BAĞLANTISI
# ============================================================
DATABASE_URL = "postgres://postgres:518518Erkan@77.42.68.4:5435/postgresainewsdb"


def parse_database_url(url: str) -> dict:
    """PostgreSQL URL'sini parse eder."""
    # postgres://user:pass@host:port/dbname
    url = url.replace("postgres://", "").replace("postgresql://", "")
    
    # user:pass@host:port/dbname
    auth_part, rest = url.split("@")
    user, password = auth_part.split(":")
    
    host_port, dbname = rest.split("/")
    host, port = host_port.split(":")
    
    return {
        "host": host,
        "port": int(port),
        "user": user,
        "password": password,
        "dbname": dbname.split("?")[0]  # Remove query params
    }


def get_connection():
    """Veritabanı bağlantısı oluşturur."""
    config = parse_database_url(DATABASE_URL)
    return psycopg2.connect(
        host=config["host"],
        port=config["port"],
        user=config["user"],
        password=config["password"],
        dbname=config["dbname"],
        cursor_factory=RealDictCursor
    )


# ============================================================
# TREND SKORU HESAPLAMA ALGORİTMASI
# ============================================================

def calculate_trend_score(
    total_views: int,
    likes: int,
    rating: float,
    rating_count: int,
    recent_views: int,
    published_at: datetime
) -> Tuple[int, dict]:
    """
    Trend skoru hesaplar.
    
    Formula: TrendScore = (ViewScore + EngagementScore + VelocityScore) * FreshnessMultiplier
    
    Bileşenler:
    1. ViewScore (40%): Logaritmik ölçekleme ile toplam görüntüleme
    2. EngagementScore (20%): Beğeniler, derecelendirmeler
    3. VelocityScore (30%): Son 24 saatteki aktivite
    4. FreshnessMultiplier: Zaman azalması (48 saat yarı ömür)
    
    Returns:
        Tuple[int, dict]: (final_score, breakdown_dict)
    """
    # === Zaman Hesaplamaları ===
    now = datetime.utcnow()
    hours_since_published = max(1, (now - published_at).total_seconds() / 3600)
    
    # === 1. VIEW SCORE (40%) ===
    # Logaritmik ölçekleme
    if total_views > 0:
        view_score = min(40, math.log10(total_views + 1) * 13.3)
    else:
        view_score = 0
    
    # === 2. ENGAGEMENT SCORE (20%) ===
    like_score = min(10, likes * 2)
    rating_score = (rating / 5) * 10 if rating_count > 0 else 0
    engagement_score = min(20, like_score + rating_score)
    
    # === 3. VELOCITY SCORE (30%) ===
    velocity_ratio = recent_views / max(total_views, 1) if total_views > 0 else 0
    velocity_bonus = recent_views * 0.5
    velocity_score = min(30, (velocity_ratio * 20) + min(10, velocity_bonus))
    
    # === 4. FRESHNESS MULTIPLIER ===
    half_life = 48  # saat
    freshness_multiplier = pow(0.5, hours_since_published / half_life)
    adjusted_freshness = max(0.1, freshness_multiplier)
    
    # === FINAL HESAPLAMA ===
    raw_score = view_score + engagement_score + velocity_score
    trend_score = round(raw_score * adjusted_freshness * 1.1)  # 1.1 boost factor
    final_score = min(100, max(0, trend_score))
    
    breakdown = {
        "view_score": round(view_score, 2),
        "engagement_score": round(engagement_score, 2),
        "velocity_score": round(velocity_score, 2),
        "raw_score": round(raw_score, 2),
        "freshness": round(adjusted_freshness, 4),
        "hours_old": round(hours_since_published, 1)
    }
    
    return final_score, breakdown


def get_score_color(score: int) -> str:
    """Skor rengini döndürür."""
    if score >= 80:
        return Fore.MAGENTA + Style.BRIGHT  # Viral
    elif score >= 60:
        return Fore.RED + Style.BRIGHT      # Trending
    elif score >= 40:
        return Fore.YELLOW                   # Popular
    elif score >= 20:
        return Fore.CYAN                     # Moderate
    else:
        return Fore.WHITE                    # Low


def get_score_label(score: int) -> str:
    """Skor etiketini döndürür."""
    if score >= 80:
        return "🔥 VİRAL"
    elif score >= 60:
        return "📈 TRENDING"
    elif score >= 40:
        return "⭐ POPÜLER"
    elif score >= 20:
        return "📊 ORTA"
    else:
        return "📉 DÜŞÜK"


# ============================================================
# ANA FONKSİYON
# ============================================================

def main():
    print()
    print(Fore.CYAN + Style.BRIGHT + "=" * 70)
    print(Fore.CYAN + Style.BRIGHT + "  🤖 AI HABERLERİ - TREND SKORU YENİDEN HESAPLAMA")
    print(Fore.CYAN + Style.BRIGHT + "=" * 70)
    print()
    
    # Veritabanı bağlantısı
    print(Fore.YELLOW + "📡 Veritabanına bağlanılıyor...")
    try:
        conn = get_connection()
        cursor = conn.cursor()
        print(Fore.GREEN + "✅ Bağlantı başarılı!")
    except Exception as e:
        print(Fore.RED + f"❌ Bağlantı hatası: {e}")
        sys.exit(1)
    
    print()
    
    # Yayınlanmış makaleleri al (en son yayınlanandan ilk yayınlanan)
    print(Fore.YELLOW + "📚 Yayınlanmış haberler alınıyor...")
    cursor.execute("""
        SELECT 
            a.id,
            a.title,
            a.views,
            a.likes,
            a."trendScore",
            a."publishedAt",
            a."createdAt",
            COALESCE(a.rating, 0) as rating,
            COALESCE(a."ratingCount", 0) as "ratingCount"
        FROM "Article" a
        WHERE a.status = 'PUBLISHED'
        ORDER BY COALESCE(a."publishedAt", a."createdAt") DESC
    """)
    
    articles = cursor.fetchall()
    total_articles = len(articles)
    
    print(Fore.GREEN + f"✅ {total_articles} haber bulundu!")
    print()
    
    if total_articles == 0:
        print(Fore.YELLOW + "⚠️ Yayınlanmış haber bulunamadı.")
        conn.close()
        return
    
    # İstatistikler
    stats = {
        "total": total_articles,
        "processed": 0,
        "updated": 0,
        "errors": 0,
        "viral": 0,      # 80+
        "trending": 0,   # 60-79
        "popular": 0,    # 40-59
        "moderate": 0,   # 20-39
        "low": 0         # 0-19
    }
    
    # İlerleme çubuğu ile işle
    print(Fore.CYAN + Style.BRIGHT + "-" * 70)
    print(Fore.CYAN + "  TREND SKORLARI HESAPLANIYOR")
    print(Fore.CYAN + Style.BRIGHT + "-" * 70)
    print()
    
    for article in tqdm(articles, desc="İşleniyor", ncols=80, 
                        bar_format='{l_bar}{bar}| {n_fmt}/{total_fmt} [{elapsed}<{remaining}]'):
        try:
            article_id = article["id"]
            title = article["title"][:50] + "..." if len(article["title"]) > 50 else article["title"]
            views = article["views"] or 0
            likes = article["likes"] or 0
            old_score = article["trendScore"] or 0
            published_at = article["publishedAt"] or article["createdAt"]
            rating = float(article["rating"] or 0)
            rating_count = int(article["ratingCount"] or 0)
            
            # Son 24 saatteki görüntülenmeleri al
            cursor.execute("""
                SELECT COUNT(*) as count
                FROM "ArticleAnalytics" 
                WHERE "articleId" = %s 
                AND "createdAt" >= NOW() - INTERVAL '24 hours'
            """, (article_id,))
            
            recent_result = cursor.fetchone()
            recent_views = recent_result["count"] if recent_result else 0
            
            # Trend skorunu hesapla
            new_score, breakdown = calculate_trend_score(
                total_views=views,
                likes=likes,
                rating=rating,
                rating_count=rating_count,
                recent_views=recent_views,
                published_at=published_at
            )
            
            # Veritabanını güncelle
            is_trending = new_score > 40
            cursor.execute("""
                UPDATE "Article"
                SET "trendScore" = %s, "isTrending" = %s, "updatedAt" = NOW()
                WHERE id = %s
            """, (new_score, is_trending, article_id))
            
            stats["processed"] += 1
            
            if old_score != new_score:
                stats["updated"] += 1
            
            # Skor kategorisi
            if new_score >= 80:
                stats["viral"] += 1
            elif new_score >= 60:
                stats["trending"] += 1
            elif new_score >= 40:
                stats["popular"] += 1
            elif new_score >= 20:
                stats["moderate"] += 1
            else:
                stats["low"] += 1
                
        except Exception as e:
            stats["errors"] += 1
            tqdm.write(Fore.RED + f"  ❌ Hata ({article_id[:8]}): {e}")
    
    # Değişiklikleri kaydet
    conn.commit()
    
    print()
    print(Fore.CYAN + Style.BRIGHT + "=" * 70)
    print(Fore.CYAN + Style.BRIGHT + "  📊 SONUÇ RAPORU")
    print(Fore.CYAN + Style.BRIGHT + "=" * 70)
    print()
    
    # İstatistikler
    print(Fore.WHITE + f"  📰 Toplam Haber:     {Fore.CYAN + Style.BRIGHT}{stats['total']}")
    print(Fore.WHITE + f"  ✅ İşlenen:          {Fore.GREEN + Style.BRIGHT}{stats['processed']}")
    print(Fore.WHITE + f"  📝 Güncellenen:      {Fore.YELLOW + Style.BRIGHT}{stats['updated']}")
    print(Fore.WHITE + f"  ❌ Hata:             {Fore.RED + Style.BRIGHT}{stats['errors']}")
    print()
    
    print(Fore.WHITE + "  " + "-" * 40)
    print(Fore.WHITE + "  SKOR DAĞILIMI:")
    print(Fore.WHITE + "  " + "-" * 40)
    
    print(Fore.MAGENTA + Style.BRIGHT + f"  🔥 Viral (80+):      {stats['viral']:>5}  " + 
          Fore.WHITE + "█" * min(50, stats['viral']))
    
    print(Fore.RED + Style.BRIGHT + f"  📈 Trending (60-79): {stats['trending']:>5}  " + 
          Fore.WHITE + "█" * min(50, stats['trending']))
    
    print(Fore.YELLOW + f"  ⭐ Popüler (40-59):  {stats['popular']:>5}  " + 
          Fore.WHITE + "█" * min(50, stats['popular']))
    
    print(Fore.CYAN + f"  📊 Orta (20-39):     {stats['moderate']:>5}  " + 
          Fore.WHITE + "█" * min(50, stats['moderate']))
    
    print(Fore.WHITE + f"  📉 Düşük (0-19):     {stats['low']:>5}  " + 
          Fore.WHITE + "█" * min(50, stats['low']))
    
    print()
    
    # En yüksek skorlu 10 haber
    print(Fore.CYAN + Style.BRIGHT + "-" * 70)
    print(Fore.CYAN + Style.BRIGHT + "  🏆 EN YÜKSEK SKORLU 10 HABER")
    print(Fore.CYAN + Style.BRIGHT + "-" * 70)
    print()
    
    cursor.execute("""
        SELECT id, title, "trendScore", views, likes
        FROM "Article"
        WHERE status = 'PUBLISHED'
        ORDER BY "trendScore" DESC
        LIMIT 10
    """)
    
    top_articles = cursor.fetchall()
    
    for i, art in enumerate(top_articles, 1):
        score = art["trendScore"] or 0
        color = get_score_color(score)
        label = get_score_label(score)
        title = art["title"][:45] + "..." if len(art["title"]) > 45 else art["title"]
        
        print(f"  {Fore.WHITE}{i:2}. {color}[{score:3}] {label:12} {Fore.WHITE}| {title}")
        print(f"      {Fore.WHITE + Style.DIM}👁 {art['views'] or 0} görüntüleme | ❤ {art['likes'] or 0} beğeni")
        print()
    
    # Bağlantıyı kapat
    cursor.close()
    conn.close()
    
    print(Fore.GREEN + Style.BRIGHT + "=" * 70)
    print(Fore.GREEN + Style.BRIGHT + "  ✅ TREND SKORLARI BAŞARIYLA GÜNCELLENDİ!")
    print(Fore.GREEN + Style.BRIGHT + "=" * 70)
    print()


if __name__ == "__main__":
    main()
