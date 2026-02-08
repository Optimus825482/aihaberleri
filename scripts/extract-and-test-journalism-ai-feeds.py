#!/usr/bin/env python3
"""
RSS Feed Extractor & Tester for Journalism AI Sources
Extracts domains from resources.rss and tests for RSS feeds
"""

import xml.etree.ElementTree as ET
import requests
import time
from urllib.parse import urlparse
from typing import List, Dict, Set
import feedparser
from collections import defaultdict

# Timeout settings
REQUEST_TIMEOUT = 15
MAX_RETRIES = 2

# Common RSS feed patterns to test
RSS_PATTERNS = [
    "/feed",
    "/feed/",
    "/rss",
    "/rss/",
    "/rss.xml",
    "/feed.xml",
    "/atom.xml",
    "/index.xml",
    "/blog/feed",
    "/blog/rss",
    "/news/feed",
    "/news/rss",
]

def extract_domains_from_rss(rss_file: str) -> Dict[str, List[str]]:
    """Extract unique domains and their article URLs from resources.rss"""
    print(f"📖 Reading {rss_file}...")
    
    tree = ET.parse(rss_file)
    root = tree.getroot()
    
    # Handle RSS namespace
    ns = {'': 'http://www.w3.org/2005/Atom'} if root.tag.endswith('feed') else {}
    
    domain_urls = defaultdict(list)
    
    # Find all item links
    for item in root.findall('.//item'):
        link_elem = item.find('link')
        if link_elem is not None and link_elem.text:
            url = link_elem.text.strip()
            parsed = urlparse(url)
            domain = f"{parsed.scheme}://{parsed.netloc}"
            domain_urls[domain].append(url)
    
    print(f"✅ Found {len(domain_urls)} unique domains")
    return dict(domain_urls)

def test_rss_feed(url: str) -> Dict:
    """Test if a URL is a valid RSS feed"""
    try:
        print(f"   Testing: {url}")
        
        response = requests.get(
            url,
            timeout=REQUEST_TIMEOUT,
            headers={
                'User-Agent': 'Mozilla/5.0 (compatible; AINewsBot/1.0)',
                'Accept': 'application/rss+xml, application/xml, text/xml, */*'
            },
            allow_redirects=True
        )
        
        if response.status_code != 200:
            return {'success': False, 'error': f'HTTP {response.status_code}'}
        
        # Parse with feedparser
        feed = feedparser.parse(response.content)
        
        if feed.bozo and not feed.entries:
            return {'success': False, 'error': 'Invalid feed format'}
        
        if len(feed.entries) == 0:
            return {'success': False, 'error': 'No entries found'}
        
        # Extract feed info
        return {
            'success': True,
            'title': feed.feed.get('title', 'Unknown'),
            'entries': len(feed.entries),
            'language': feed.feed.get('language', 'en'),
            'final_url': response.url  # In case of redirects
        }
        
    except requests.Timeout:
        return {'success': False, 'error': 'Timeout'}
    except requests.RequestException as e:
        return {'success': False, 'error': str(e)[:50]}
    except Exception as e:
        return {'success': False, 'error': f'Parse error: {str(e)[:50]}'}

def find_rss_feeds(domain: str, sample_urls: List[str]) -> List[Dict]:
    """Try to find RSS feeds for a domain"""
    found_feeds = []
    
    print(f"\n🔍 Testing domain: {domain}")
    print(f"   Sample articles: {len(sample_urls)}")
    
    # Test common RSS patterns
    for pattern in RSS_PATTERNS:
        test_url = domain + pattern
        result = test_rss_feed(test_url)
        
        if result['success']:
            print(f"   ✅ FOUND: {test_url}")
            found_feeds.append({
                'url': result.get('final_url', test_url),
                'title': result['title'],
                'entries': result['entries'],
                'language': result['language']
            })
            break  # Stop after first working feed
        
        time.sleep(0.5)  # Rate limiting
    
    if not found_feeds:
        print(f"   ❌ No RSS feed found")
    
    return found_feeds

def categorize_domain(domain: str, sample_urls: List[str]) -> str:
    """Categorize domain based on URL patterns"""
    domain_lower = domain.lower()
    
    # Journalism AI specific
    if any(keyword in domain_lower for keyword in ['journalism', 'newsroom', 'news', 'media']):
        return 'JOURNALISM AI & NEWSROOM TOOLS'
    
    # Research institutions
    if any(keyword in domain_lower for keyword in ['research', 'institute', 'university', 'edu', 'oxford', 'mit']):
        return 'AI RESEARCH & ACADEMIA'
    
    # Tech companies
    if any(keyword in domain_lower for keyword in ['google', 'openai', 'microsoft', 'huggingface']):
        return 'TECH COMPANIES & AI LABS'
    
    # General AI news
    return 'AI NEWS & ANALYSIS'

def main():
    print("=" * 60)
    print("RSS Feed Extractor & Tester for Journalism AI Sources")
    print("=" * 60)
    
    # Extract domains from resources.rss
    domain_urls = extract_domains_from_rss('resources.rss')
    
    # Find RSS feeds
    all_feeds = []
    categories = defaultdict(list)
    
    for domain, sample_urls in domain_urls.items():
        feeds = find_rss_feeds(domain, sample_urls)
        
        if feeds:
            category = categorize_domain(domain, sample_urls)
            for feed in feeds:
                feed['category'] = category
                feed['domain'] = domain
                all_feeds.append(feed)
                categories[category].append(feed)
        
        time.sleep(1)  # Rate limiting between domains
    
    # Print summary
    print("\n" + "=" * 60)
    print("📊 SUMMARY")
    print("=" * 60)
    print(f"Total domains tested: {len(domain_urls)}")
    print(f"RSS feeds found: {len(all_feeds)}")
    print(f"\nBy category:")
    for category, feeds in categories.items():
        print(f"  {category}: {len(feeds)} feeds")
    
    # Print TypeScript format
    print("\n" + "=" * 60)
    print("📝 TypeScript Format (for src/lib/rss.ts)")
    print("=" * 60)
    
    for category, feeds in categories.items():
        print(f"\n  // ========================================")
        print(f"  // {category} ({len(feeds)} feeds)")
        print(f"  // ========================================")
        
        for feed in feeds:
            print(f"  {{")
            print(f"    name: \"{feed['title']}\",")
            print(f"    url: \"{feed['url']}\",")
            print(f"    language: \"{feed['language']}\",")
            print(f"  }},")
    
    # Save detailed report
    with open('scripts/journalism-ai-feeds-report.txt', 'w', encoding='utf-8') as f:
        f.write("RSS Feed Discovery Report\n")
        f.write("=" * 60 + "\n\n")
        f.write(f"Total domains tested: {len(domain_urls)}\n")
        f.write(f"RSS feeds found: {len(all_feeds)}\n\n")
        
        for category, feeds in categories.items():
            f.write(f"\n{category}\n")
            f.write("-" * 60 + "\n")
            for feed in feeds:
                f.write(f"Name: {feed['title']}\n")
                f.write(f"URL: {feed['url']}\n")
                f.write(f"Entries: {feed['entries']}\n")
                f.write(f"Language: {feed['language']}\n")
                f.write(f"Domain: {feed['domain']}\n")
                f.write("\n")
    
    print(f"\n✅ Detailed report saved to: scripts/journalism-ai-feeds-report.txt")
    print(f"\n🎯 Next steps:")
    print(f"   1. Review the TypeScript output above")
    print(f"   2. Copy relevant feeds to src/lib/rss.ts")
    print(f"   3. Run: python scripts/test-new-rss-feeds.py")

if __name__ == "__main__":
    main()
