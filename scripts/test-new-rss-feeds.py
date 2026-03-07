#!/usr/bin/env python3
"""
RSS Feed Validator - Test all feeds before deployment
Tests HTTP status, XML parsing, entry count, and response time
"""

import requests
import feedparser
import time
from typing import Any, Dict, List, Mapping, cast
from datetime import datetime
import sys

# Configuration
REQUEST_TIMEOUT = 15
MAX_RETRIES = 2
MIN_ENTRIES = 1  # Minimum entries required

# ANSI color codes
GREEN = '\033[92m'
RED = '\033[91m'
YELLOW = '\033[93m'
BLUE = '\033[94m'
RESET = '\033[0m'

def test_rss_feed(url: str, name: str, retry: int = 0) -> Dict:
    """Test a single RSS feed"""
    start_time = time.time()
    
    try:
        response = requests.get(
            url,
            timeout=REQUEST_TIMEOUT,
            headers={
                'User-Agent': 'Mozilla/5.0 (compatible; AINewsBot/1.0)',
                'Accept': 'application/rss+xml, application/xml, text/xml, */*'
            },
            allow_redirects=True
        )
        
        response_time = time.time() - start_time
        
        # Check HTTP status
        if response.status_code != 200:
            return {
                'success': False,
                'name': name,
                'url': url,
                'error': f'HTTP {response.status_code}',
                'response_time': response_time
            }
        
        # Parse feed
        feed = feedparser.parse(response.content)
        
        # Check for parsing errors
        if feed.bozo and not feed.entries:
            error_msg = str(feed.bozo_exception)[:100] if hasattr(feed, 'bozo_exception') else 'Parse error'
            return {
                'success': False,
                'name': name,
                'url': url,
                'error': f'Invalid XML: {error_msg}',
                'response_time': response_time
            }
        
        # Check entry count
        entry_count = len(feed.entries)
        if entry_count < MIN_ENTRIES:
            return {
                'success': False,
                'name': name,
                'url': url,
                'error': f'No entries found (expected >= {MIN_ENTRIES})',
                'response_time': response_time
            }
        
        # Extract feed metadata
        feed_metadata = cast(Mapping[str, Any], feed.feed)
        feed_title = str(feed_metadata.get("title", "Unknown"))
        feed_language = str(feed_metadata.get("language", "en"))
        
        # Check if entries have required fields
        sample_entry = feed.entries[0] if feed.entries else {}
        has_title = bool(sample_entry.get('title'))
        has_link = bool(sample_entry.get('link'))
        has_date = bool(sample_entry.get('published') or sample_entry.get('updated'))
        
        return {
            'success': True,
            'name': name,
            'url': url,
            'feed_title': feed_title,
            'language': feed_language,
            'entries': entry_count,
            'response_time': response_time,
            'has_title': has_title,
            'has_link': has_link,
            'has_date': has_date,
            'final_url': response.url
        }
        
    except requests.Timeout:
        if retry < MAX_RETRIES:
            print(f"   {YELLOW}⏱️  Timeout, retrying...{RESET}")
            time.sleep(2)
            return test_rss_feed(url, name, retry + 1)
        return {
            'success': False,
            'name': name,
            'url': url,
            'error': 'Timeout (15s)',
            'response_time': REQUEST_TIMEOUT
        }
    
    except requests.RequestException as e:
        return {
            'success': False,
            'name': name,
            'url': url,
            'error': f'Network error: {str(e)[:50]}',
            'response_time': time.time() - start_time
        }
    
    except Exception as e:
        return {
            'success': False,
            'name': name,
            'url': url,
            'error': f'Unexpected error: {str(e)[:50]}',
            'response_time': time.time() - start_time
        }

def print_result(result: Dict, index: int, total: int):
    """Print test result with colors"""
    prefix = f"[{index}/{total}]"
    
    if result['success']:
        print(f"{GREEN}✅ {prefix} {result['name']}{RESET}")
        print(f"   URL: {result['url']}")
        print(f"   Entries: {result['entries']} | Response: {result['response_time']:.2f}s")
        print(f"   Feed Title: {result['feed_title']}")
        print(f"   Language: {result['language']}")
        
        # Warnings for missing fields
        if not result['has_title']:
            print(f"   {YELLOW}⚠️  Warning: Entries missing titles{RESET}")
        if not result['has_link']:
            print(f"   {YELLOW}⚠️  Warning: Entries missing links{RESET}")
        if not result['has_date']:
            print(f"   {YELLOW}⚠️  Warning: Entries missing dates{RESET}")
    else:
        print(f"{RED}❌ {prefix} {result['name']}{RESET}")
        print(f"   URL: {result['url']}")
        print(f"   Error: {result['error']}")
        print(f"   Response time: {result['response_time']:.2f}s")
    
    print()

def main():
    print("=" * 70)
    print(f"{BLUE}RSS Feed Validator - Pre-Deployment Test{RESET}")
    print("=" * 70)
    print()
    
    # ALL 38 NEW FEEDS FROM resources.rss EXTRACTION (2026-02-08)
    test_feeds = [
        # JOURNALISM AI & NEWSROOM TOOLS (20 feeds)
        {"name": "Generative AI in the Newsroom", "url": "https://generative-ai-newsroom.com/feed"},
        {"name": "Center for Cooperative Media", "url": "https://centerforcooperativemedia.org/feed/"},
        {"name": "Local Media Association", "url": "https://localmedia.org/feed/"},
        {"name": "Online Journalism Blog", "url": "https://onlinejournalismblog.com/feed/"},
        {"name": "Trusting News", "url": "https://trustingnews.org/feed/"},
        {"name": "AI for Media Network", "url": "https://aiformedia.network/feed/"},
        {"name": "Méta-media", "url": "https://www.meta-media.fr/feed"},
        {"name": "Newsroom Robots", "url": "https://www.newsroomrobots.com/feed"},
        {"name": "C21Media", "url": "https://www.c21media.net/feed/"},
        {"name": "Journalism UK", "url": "https://www.journalism.co.uk/rss/"},
        {"name": "Digital Digging", "url": "https://www.digitaldigging.org/feed"},
        {"name": "J-Source", "url": "https://j-source.ca/feed/"},
        {"name": "CNTI", "url": "https://cnti.org/feed/"},
        {"name": "Column Content", "url": "https://columncontent.com/feed/"},
        {"name": "American Journalism Project", "url": "https://www.theajp.org/feed/"},
        {"name": "WonderTools", "url": "https://wondertools.substack.com/feed"},
        {"name": "AI Accountability Review", "url": "https://www.ai-accountability-review.com/feed"},
        {"name": "Nieman Lab", "url": "https://www.niemanlab.org/feed/"},
        {"name": "BeyondWords", "url": "https://beyondwords.io/blog/rss/"},
        {"name": "Tow Center", "url": "https://www.cjr.org/tow_center/feed"},
        
        # AI RESEARCH & ACADEMIA (4 feeds)
        {"name": "Google Research", "url": "https://research.google/blog/rss/"},
        {"name": "Reuters Institute", "url": "https://reutersinstitute.politics.ox.ac.uk/rss"},
        {"name": "Pew Research Center", "url": "https://www.pewresearch.org/feed/"},
        {"name": "Apple Machine Learning Research", "url": "https://machinelearning.apple.com/rss.xml"},
        
        # AI NEWS & ANALYSIS (12 feeds)
        {"name": "Poynter", "url": "https://www.poynter.org/feed/"},
        {"name": "SE Ranking Blog", "url": "https://seranking.com/blog/feed/"},
        {"name": "AlixPartners", "url": "https://www.alixpartners.com/rss"},
        {"name": "Semrush Blog", "url": "https://www.semrush.com/blog/feed/"},
        {"name": "WAN-IFRA", "url": "https://wan-ifra.org/feed/"},
        {"name": "Thomson Reuters Foundation", "url": "https://www.trust.org/feed/"},
        {"name": "METR", "url": "https://metr.org/feed.xml"},
        {"name": "Similarweb", "url": "https://www.similarweb.com/blog/feed/"},
        {"name": "Excitech", "url": "https://excitech.media/feed"},
        {"name": "FIPP", "url": "https://www.fipp.com/feed/"},
        {"name": "Journalisten", "url": "https://journalisten.dk/feed/"},
        {"name": "The Verge", "url": "https://www.theverge.com/rss/index.xml"},
        
        # TECH COMPANIES & AI LABS (2 feeds)
        {"name": "Microsoft AI", "url": "https://microsoft.ai/feed/"},
        {"name": "Google Keyword Blog", "url": "https://blog.google/rss/"},
    ]
    
    print(f"Testing {len(test_feeds)} RSS feeds...\n")
    
    results = []
    for i, feed in enumerate(test_feeds, 1):
        result = test_rss_feed(feed['url'], feed['name'])
        results.append(result)
        print_result(result, i, len(test_feeds))
        
        # Rate limiting
        if i < len(test_feeds):
            time.sleep(1)
    
    # Summary
    print("=" * 70)
    print(f"{BLUE}📊 TEST SUMMARY{RESET}")
    print("=" * 70)
    
    successful = [r for r in results if r['success']]
    failed = [r for r in results if not r['success']]
    
    print(f"\n{GREEN}✅ Successful: {len(successful)}/{len(results)}{RESET}")
    print(f"{RED}❌ Failed: {len(failed)}/{len(results)}{RESET}")
    
    if successful:
        avg_response = sum(r['response_time'] for r in successful) / len(successful)
        total_entries = sum(r['entries'] for r in successful)
        print(f"\n{BLUE}Performance:{RESET}")
        print(f"   Average response time: {avg_response:.2f}s")
        print(f"   Total entries: {total_entries}")
    
    if failed:
        print(f"\n{RED}Failed Feeds:{RESET}")
        for r in failed:
            print(f"   • {r['name']}: {r['error']}")
    
    # Save report
    timestamp = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
    report_file = f"scripts/rss-test-report_{timestamp}.txt"
    
    with open(report_file, 'w', encoding='utf-8') as f:
        f.write("RSS Feed Test Report\n")
        f.write("=" * 70 + "\n\n")
        f.write(f"Test Date: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
        f.write(f"Total Feeds: {len(results)}\n")
        f.write(f"Successful: {len(successful)}\n")
        f.write(f"Failed: {len(failed)}\n\n")
        
        f.write("SUCCESSFUL FEEDS\n")
        f.write("-" * 70 + "\n")
        for r in successful:
            f.write(f"Name: {r['name']}\n")
            f.write(f"URL: {r['url']}\n")
            f.write(f"Entries: {r['entries']}\n")
            f.write(f"Response Time: {r['response_time']:.2f}s\n")
            f.write(f"Language: {r['language']}\n\n")
        
        if failed:
            f.write("\nFAILED FEEDS\n")
            f.write("-" * 70 + "\n")
            for r in failed:
                f.write(f"Name: {r['name']}\n")
                f.write(f"URL: {r['url']}\n")
                f.write(f"Error: {r['error']}\n\n")
    
    print(f"\n📄 Detailed report saved: {report_file}")
    
    # Exit code
    if failed:
        print(f"\n{YELLOW}⚠️  Some feeds failed. Review before deployment.{RESET}")
        sys.exit(1)
    else:
        print(f"\n{GREEN}✅ All feeds passed! Ready for deployment.{RESET}")
        sys.exit(0)

if __name__ == "__main__":
    main()
