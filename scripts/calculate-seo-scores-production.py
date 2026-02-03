#!/usr/bin/env python3
"""
Production SEO Skorlama Sistemi
================================

Bu script production PostgreSQL veritabanındaki tüm yayınlanmış makaleler için
SEO skorlarını hesaplar ve önerileri kaydeder.

Özellikler:
- Batch processing (50'şer makale)
- Progress bar ve detaylı logging
- Hata yönetimi ve retry mekanizması
- Türkçe SEO analizi
- Production DB bağlantısı

Kullanım:
    python scripts/calculate-seo-scores-production.py
"""

import os
import sys
import time
import re
from typing import List, Dict, Tuple, Optional
from datetime import datetime
from dataclasses import dataclass

import psycopg2
from psycopg2.extras import RealDictCursor
from dotenv import load_dotenv
from tqdm import tqdm

# .env dosyasını yükle
load_dotenv()


@dataclass
class SEORecommendation:
    """SEO önerisi veri yapısı"""
    type: str
    severity: str  # critical, high, medium, low
    message: str
    suggestion: str


@dataclass
class SEOAnalysisResult:
    """SEO analiz sonucu"""
    score: int  # 0-100
    reading_time: int  # dakika
    recommendations: List[SEORecommendation]


class ProductionSEOScorer:
    """Production PostgreSQL için SEO skorlama sistemi"""
    
    BATCH_SIZE = 50
    RETRY_ATTEMPTS = 3
    RETRY_DELAY = 2  # saniye
    
    def __init__(self, database_url: str):
        """
        Args:
            database_url: PostgreSQL bağlantı URL'i
        """
        self.database_url = database_url
        self.conn = None
        self.cursor = None
        
    def connect(self) -> None:
        """PostgreSQL'e bağlan"""
        try:
            print("🔌 Production veritabanına bağlanılıyor...")
            self.conn = psycopg2.connect(self.database_url)
            self.cursor = self.conn.cursor(cursor_factory=RealDictCursor)
            print("✅ Bağlantı başarılı!\n")
        except Exception as e:
            print(f"❌ Bağlantı hatası: {e}")
            sys.exit(1)
    
    def disconnect(self) -> None:
        """Bağlantıyı kapat"""
        if self.cursor:
            self.cursor.close()
        if self.conn:
            self.conn.close()
        print("\n🔌 Veritabanı bağlantısı kapatıldı")
    
    def get_published_articles(self) -> List[Dict]:
        """Tüm yayınlanmış makaleleri getir"""
        query = """
            SELECT id, title, slug, excerpt, content, "imageUrl"
            FROM "Article"
            WHERE status = 'PUBLISHED'
            ORDER BY "createdAt" DESC
        """
        
        try:
            self.cursor.execute(query)
            articles = self.cursor.fetchall()
            return [dict(article) for article in articles]
        except Exception as e:
            print(f"❌ Makale getirme hatası: {e}")
            return []
    
    def analyze_title(self, title: str) -> Tuple[int, List[SEORecommendation]]:
        """
        Başlık analizi
        
        Optimal: 50-60 karakter
        Minimum: 30 karakter
        Maximum: 70 karakter
        """
        recommendations = []
        score = 100
        title_length = len(title)
        
        if title_length < 30:
            recommendations.append(SEORecommendation(
                type="title",
                severity="high",
                message="Başlık çok kısa",
                suggestion=f"Başlık {30 - title_length} karakter daha uzun olmalı (optimal: 50-60)"
            ))
            score -= 15
        elif title_length > 70:
            recommendations.append(SEORecommendation(
                type="title",
                severity="medium",
                message="Başlık çok uzun",
                suggestion="Başlık 70 karakterden kısa olmalı (optimal: 50-60)"
            ))
            score -= 10
        
        return score, recommendations
    
    def analyze_meta_description(self, excerpt: Optional[str]) -> Tuple[int, List[SEORecommendation]]:
        """
        Meta açıklama analizi
        
        Optimal: 150-160 karakter
        Minimum: 120 karakter
        Maximum: 160 karakter
        """
        recommendations = []
        score = 100
        desc_length = len(excerpt) if excerpt else 0
        
        if desc_length < 120:
            recommendations.append(SEORecommendation(
                type="description",
                severity="high",
                message="Meta açıklama çok kısa",
                suggestion=f"Meta açıklama {120 - desc_length} karakter daha uzun olmalı (optimal: 150-160)"
            ))
            score -= 15
        elif desc_length > 160:
            recommendations.append(SEORecommendation(
                type="description",
                severity="medium",
                message="Meta açıklama çok uzun",
                suggestion="Meta açıklama 160 karakterden kısa olmalı"
            ))
            score -= 10
        
        return score, recommendations
    
    def analyze_content(self, content: str) -> Tuple[int, List[SEORecommendation]]:
        """
        İçerik analizi
        
        Optimal: 1000+ karakter
        Minimum: 300 karakter
        """
        recommendations = []
        score = 100
        content_length = len(content)
        
        if content_length < 300:
            recommendations.append(SEORecommendation(
                type="content",
                severity="critical",
                message="İçerik çok kısa",
                suggestion=f"En az {300 - content_length} karakter daha eklemelisiniz (optimal: 1000+)"
            ))
            score -= 25
        elif content_length < 1000:
            recommendations.append(SEORecommendation(
                type="content",
                severity="medium",
                message="İçerik uzatılabilir",
                suggestion="Daha detaylı içerik SEO için daha iyi (optimal: 1000+ karakter)"
            ))
            score -= 10
        
        return score, recommendations
    
    def analyze_keywords(self, title: str, content: str) -> Tuple[int, List[SEORecommendation]]:
        """
        Anahtar kelime analizi
        
        Başlıktaki önemli kelimelerin içerikte kullanılıp kullanılmadığını kontrol eder
        """
        recommendations = []
        score = 100
        
        # Başlıktaki kelimeleri al (3 karakterden uzun)
        title_words = [word.lower() for word in re.findall(r'\w+', title) if len(word) > 3]
        content_lower = content.lower()
        
        # Kaç tane başlık kelimesi içerikte var?
        keywords_in_content = sum(1 for word in title_words if word in content_lower)
        
        if keywords_in_content < 2:
            recommendations.append(SEORecommendation(
                type="keywords",
                severity="high",
                message="Başlıktaki anahtar kelimeler içerikte yok",
                suggestion="Başlıktaki önemli kelimeleri içerikte kullanın"
            ))
            score -= 15
        
        return score, recommendations
    
    def analyze_images(self, image_url: Optional[str]) -> Tuple[int, List[SEORecommendation]]:
        """Görsel kontrolü"""
        recommendations = []
        score = 100
        
        has_image = image_url is not None and image_url != ""
        
        if not has_image:
            recommendations.append(SEORecommendation(
                type="images",
                severity="high",
                message="Görsel eksik",
                suggestion="En az 1 görselli makale SEO için daha iyi"
            ))
            score -= 15
        
        return score, recommendations
    
    def analyze_slug(self, slug: str) -> Tuple[int, List[SEORecommendation]]:
        """URL slug kalite kontrolü"""
        recommendations = []
        score = 100
        
        slug_words = slug.split("-")
        
        if len(slug_words) < 3:
            recommendations.append(SEORecommendation(
                type="title",
                severity="low",
                message="URL çok kısa",
                suggestion="URL daha açıklayıcı olabilir"
            ))
            score -= 5
        
        return score, recommendations
    
    def calculate_reading_time(self, content: str) -> int:
        """
        Okuma süresini hesapla
        
        Ortalama okuma hızı: 200 kelime/dakika
        """
        words = re.findall(r'\w+', content)
        word_count = len(words)
        reading_time = max(1, word_count // 200)  # Minimum 1 dakika
        
        return reading_time
    
    def analyze_reading_time(self, reading_time: int) -> Tuple[int, List[SEORecommendation]]:
        """Okuma süresi analizi"""
        recommendations = []
        score = 100
        
        if reading_time < 2:
            recommendations.append(SEORecommendation(
                type="content",
                severity="medium",
                message="Okuma süresi çok kısa",
                suggestion="En az 2-3 dakikalık içerik daha iyi engagement sağlar"
            ))
            score -= 10
        
        return score, recommendations
    
    def analyze_article_seo(self, article: Dict) -> SEOAnalysisResult:
        """
        Makale için kapsamlı SEO analizi yap
        
        Args:
            article: Makale verisi (id, title, slug, excerpt, content, imageUrl)
        
        Returns:
            SEOAnalysisResult: Skor ve öneriler
        """
        all_recommendations = []
        total_score = 100
        
        # 1. Başlık analizi
        title_score, title_recs = self.analyze_title(article['title'])
        total_score = min(total_score, title_score)
        all_recommendations.extend(title_recs)
        
        # 2. Meta açıklama analizi
        desc_score, desc_recs = self.analyze_meta_description(article.get('excerpt'))
        total_score = min(total_score, desc_score)
        all_recommendations.extend(desc_recs)
        
        # 3. İçerik analizi
        content_score, content_recs = self.analyze_content(article['content'])
        total_score = min(total_score, content_score)
        all_recommendations.extend(content_recs)
        
        # 4. Anahtar kelime analizi
        keyword_score, keyword_recs = self.analyze_keywords(article['title'], article['content'])
        total_score = min(total_score, keyword_score)
        all_recommendations.extend(keyword_recs)
        
        # 5. Görsel kontrolü
        image_score, image_recs = self.analyze_images(article.get('imageUrl'))
        total_score = min(total_score, image_score)
        all_recommendations.extend(image_recs)
        
        # 6. Slug kalitesi
        slug_score, slug_recs = self.analyze_slug(article['slug'])
        total_score = min(total_score, slug_score)
        all_recommendations.extend(slug_recs)
        
        # 7. Okuma süresi
        reading_time = self.calculate_reading_time(article['content'])
        reading_score, reading_recs = self.analyze_reading_time(reading_time)
        total_score = min(total_score, reading_score)
        all_recommendations.extend(reading_recs)
        
        return SEOAnalysisResult(
            score=max(0, total_score),
            reading_time=reading_time,
            recommendations=all_recommendations
        )
    
    def update_article_seo_score(self, article_id: str, score: int, reading_time: int) -> None:
        """Makale SEO skorunu ve okuma süresini güncelle"""
        query = """
            UPDATE "Article"
            SET "seoScore" = %s, "readingTime" = %s
            WHERE id = %s
        """
        
        try:
            self.cursor.execute(query, (score, reading_time, article_id))
            self.conn.commit()
        except Exception as e:
            self.conn.rollback()
            raise Exception(f"SEO skoru güncelleme hatası: {e}")
    
    def save_seo_recommendations(self, article_id: str, recommendations: List[SEORecommendation]) -> None:
        """SEO önerilerini veritabanına kaydet"""
        # Önce eski önerileri sil
        delete_query = """
            DELETE FROM "SEORecommendation"
            WHERE "articleId" = %s
        """
        
        try:
            self.cursor.execute(delete_query, (article_id,))
            
            # Yeni önerileri ekle
            if recommendations:
                insert_query = """
                    INSERT INTO "SEORecommendation" 
                    ("articleId", type, severity, message, suggestion, "isResolved", "createdAt")
                    VALUES (%s, %s, %s, %s, %s, false, NOW())
                """
                
                for rec in recommendations:
                    self.cursor.execute(insert_query, (
                        article_id,
                        rec.type,
                        rec.severity,
                        rec.message,
                        rec.suggestion
                    ))
            
            self.conn.commit()
        except Exception as e:
            self.conn.rollback()
            raise Exception(f"Öneri kaydetme hatası: {e}")
    
    def process_article_with_retry(self, article: Dict, progress_info: str) -> bool:
        """
        Makaleyi retry mekanizması ile işle
        
        Returns:
            bool: Başarılı ise True
        """
        for attempt in range(self.RETRY_ATTEMPTS):
            try:
                # SEO analizi yap
                analysis = self.analyze_article_seo(article)
                
                # Skoru güncelle
                self.update_article_seo_score(
                    article['id'],
                    analysis.score,
                    analysis.reading_time
                )
                
                # Önerileri kaydet
                self.save_seo_recommendations(article['id'], analysis.recommendations)
                
                return True
                
            except Exception as e:
                if attempt < self.RETRY_ATTEMPTS - 1:
                    print(f"  ⚠️ Hata (deneme {attempt + 1}/{self.RETRY_ATTEMPTS}): {e}")
                    time.sleep(self.RETRY_DELAY)
                else:
                    print(f"  ❌ Başarısız: {e}")
                    return False
        
        return False
    
    def calculate_all_scores(self) -> None:
        """Tüm makaleler için SEO skorlarını hesapla"""
        print("🚀 Production SEO Skorlama Sistemi Başlatılıyor...\n")
        print("=" * 70)
        
        # Makaleleri getir
        articles = self.get_published_articles()
        total_articles = len(articles)
        
        if total_articles == 0:
            print("⚠️ Yayınlanmış makale bulunamadı!")
            return
        
        print(f"📊 Toplam {total_articles} makale bulundu")
        print(f"📦 Batch boyutu: {self.BATCH_SIZE}")
        print(f"🔄 Retry sayısı: {self.RETRY_ATTEMPTS}")
        print("=" * 70)
        print()
        
        success_count = 0
        error_count = 0
        
        # Progress bar ile işle
        with tqdm(total=total_articles, desc="📈 SEO Analizi", unit="makale") as pbar:
            for i, article in enumerate(articles):
                progress_info = f"[{i + 1}/{total_articles}]"
                
                # Makaleyi işle
                success = self.process_article_with_retry(article, progress_info)
                
                if success:
                    success_count += 1
                else:
                    error_count += 1
                
                pbar.update(1)
                
                # Rate limiting
                time.sleep(0.1)
        
        print("\n" + "=" * 70)
        print("📊 SEO SKORLAMA ÖZETİ")
        print("=" * 70)
        print(f"✅ Başarılı: {success_count}")
        print(f"❌ Hatalı: {error_count}")
        print(f"📈 Toplam: {total_articles}")
        print(f"📊 Başarı Oranı: {(success_count / total_articles * 100):.1f}%")
        
        # İstatistikler
        self.print_statistics()
    
    def print_statistics(self) -> None:
        """Detaylı istatistikleri yazdır"""
        print("\n" + "=" * 70)
        print("📊 DETAYLI İSTATİSTİKLER")
        print("=" * 70)
        
        # Ortalama SEO skoru
        avg_query = """
            SELECT AVG("seoScore") as avg_score
            FROM "Article"
            WHERE status = 'PUBLISHED'
        """
        self.cursor.execute(avg_query)
        avg_result = self.cursor.fetchone()
        avg_score = avg_result['avg_score'] if avg_result else 0
        print(f"\n📊 Ortalama SEO Skoru: {avg_score:.1f}/100")
        
        # Skor dağılımı
        dist_query = """
            SELECT 
                CASE 
                    WHEN "seoScore" >= 90 THEN '90-100 (Mükemmel)'
                    WHEN "seoScore" >= 80 THEN '80-89 (İyi)'
                    WHEN "seoScore" >= 70 THEN '70-79 (Orta)'
                    WHEN "seoScore" >= 60 THEN '60-69 (Zayıf)'
                    ELSE '0-59 (Kötü)'
                END as range,
                COUNT(*) as count
            FROM "Article"
            WHERE status = 'PUBLISHED'
            GROUP BY range
            ORDER BY range DESC
        """
        self.cursor.execute(dist_query)
        distributions = self.cursor.fetchall()
        
        print("\n📊 Skor Dağılımı:")
        for dist in distributions:
            print(f"  {dist['range']}: {dist['count']} makale")
        
        # En düşük skorlu makaleler
        lowest_query = """
            SELECT title, "seoScore", slug
            FROM "Article"
            WHERE status = 'PUBLISHED'
            ORDER BY "seoScore" ASC
            LIMIT 5
        """
        self.cursor.execute(lowest_query)
        lowest_articles = self.cursor.fetchall()
        
        print("\n⚠️ En Düşük SEO Skorlu Makaleler:")
        for i, article in enumerate(lowest_articles, 1):
            title_preview = article['title'][:50] + "..." if len(article['title']) > 50 else article['title']
            print(f"  {i}. {title_preview} ({article['seoScore']}/100)")
        
        # Toplam öneri sayısı
        rec_count_query = """
            SELECT COUNT(*) as count
            FROM "SEORecommendation"
            WHERE "isResolved" = false
        """
        self.cursor.execute(rec_count_query)
        rec_count = self.cursor.fetchone()['count']
        print(f"\n📝 Toplam Aktif Öneri: {rec_count}")
        
        # Öneri türlerine göre dağılım
        rec_type_query = """
            SELECT type, COUNT(*) as count
            FROM "SEORecommendation"
            WHERE "isResolved" = false
            GROUP BY type
            ORDER BY count DESC
        """
        self.cursor.execute(rec_type_query)
        rec_types = self.cursor.fetchall()
        
        print("\n📊 Öneri Türleri:")
        for rec_type in rec_types:
            print(f"  {rec_type['type']}: {rec_type['count']} öneri")
        
        print("\n✅ SEO skorlama sistemi başarıyla tamamlandı!")


def main():
    """Ana fonksiyon"""
    # DATABASE_URL'i al
    database_url = os.getenv("DATABASE_URL_COOLFY")
    
    if not database_url:
        print("❌ Hata: DATABASE_URL_COOLFY environment variable bulunamadı!")
        print("💡 .env dosyasında DATABASE_URL_COOLFY tanımlı olmalı")
        sys.exit(1)
    
    print("=" * 70)
    print("🎯 PRODUCTION SEO SKORLAMA SİSTEMİ")
    print("=" * 70)
    print(f"⏰ Başlangıç: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 70)
    print()
    
    # SEO scorer oluştur ve çalıştır
    scorer = ProductionSEOScorer(database_url)
    
    try:
        scorer.connect()
        scorer.calculate_all_scores()
    except KeyboardInterrupt:
        print("\n\n⚠️ İşlem kullanıcı tarafından iptal edildi")
    except Exception as e:
        print(f"\n❌ Kritik hata: {e}")
        sys.exit(1)
    finally:
        scorer.disconnect()
    
    print("\n" + "=" * 70)
    print(f"⏰ Bitiş: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 70)


if __name__ == "__main__":
    main()
