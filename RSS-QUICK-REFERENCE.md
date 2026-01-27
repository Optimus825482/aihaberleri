# RSS Feed Quick Reference

**Last Updated:** 2025-01-XX  
**Total Feeds:** 98  
**English Feeds:** 69  
**Turkish Feeds:** 28  
**Success Rate:** 95.1%

---

## 📊 Feed Statistics

| Category                 | Count  | Success Rate |
| ------------------------ | ------ | ------------ |
| Major Global News        | 17     | 100%         |
| Tech News & Publications | 18     | 100%         |
| AI Focused Publications  | 4      | 100%         |
| Research & Engineering   | 9      | 100%         |
| Business & Finance       | 6      | 100%         |
| Science & Technology     | 10     | 100%         |
| AI & Machine Learning    | 5      | 100%         |
| Turkish General News     | 21     | 100%         |
| Turkish Tech News        | 4      | 100%         |
| Turkish Economy News     | 3      | 100%         |
| **TOTAL**                | **98** | **95.1%**    |

---

## 🌍 English Feeds (69 feeds)

### Major Global News Outlets (17 feeds)

- BBC News - World
- BBC News - Technology
- CNN - Top Stories
- CNN - Technology
- Al Jazeera - News
- Bloomberg - Technology
- The Wall Street Journal - Technology
- Financial Times - Technology
- NBC News - Technology
- ABC News - Technology
- Sky News - Technology
- Deutsche Welle - News
- Euronews - Technology
- The Guardian - World
- The Guardian - Technology
- The New York Times - World
- The New York Times - Technology

### Tech News & Publications (18 feeds)

- MIT Technology Review - AI
- VentureBeat - AI
- The Verge - AI
- TechCrunch - AI
- Ars Technica - AI
- Wired - AI
- ZDNet - Artificial Intelligence
- Engadget - Technology
- The Next Web
- TechRadar - News
- CNET - News
- Mashable - Tech
- Gizmodo
- Lifehacker
- Digital Trends
- Tom's Hardware
- 9to5Mac
- 9to5Google

### Mobile & Developer News (5 feeds)

- Android Authority
- Android Police
- XDA Developers
- Hacker News (YCombinator)
- Product Hunt - Tech

### AI Focused Publications (4 feeds)

- AI News
- MarkTechPost
- The AI Edge (Substack)
- Last Week in AI

### Research & Engineering Blogs (9 feeds)

- Machine Learning Mastery
- OpenAI Blog
- Google AI Blog
- DeepMind Blog
- NVIDIA Blog - AI
- Microsoft Azure AI Blog
- AWS Machine Learning Blog
- Hugging Face Blog
- Berkeley AI Research (BAIR)

### Business & Finance (6 feeds)

- Forbes - Innovation
- CNBC - Technology
- The Economist - Technology
- Fast Company - Technology
- MIT Sloan Management Review
- Seeking Alpha - Technology

### Science & Technology (10 feeds)

- New Scientist - Technology
- Popular Science
- Popular Mechanics
- Space.com
- Phys.org - Technology
- ScienceDaily - Technology
- Futurism
- Singularity Hub
- IEEE Spectrum - Technology
- Towards Data Science

### AI & Machine Learning (5 feeds)

- Analytics Vidhya
- KDnuggets
- Machine Learning Reddit
- AI Trends
- (Plus existing AI-focused feeds above)

---

## 🇹🇷 Turkish Feeds (28 feeds)

### Turkish General News Sources (21 feeds)

- Hürriyet - Anasayfa
- Hürriyet - Teknoloji
- Hürriyet - Gündem
- Milliyet - Anasayfa
- Milliyet - Teknoloji
- Sabah - Anasayfa
- Habertürk - Anasayfa
- Habertürk - Teknoloji
- NTV - Anasayfa
- NTV - Teknoloji
- CNN Türk - Anasayfa
- CNN Türk - Teknoloji
- TRT Haber - Manşet
- TRT Haber - Teknoloji
- TRT Haber - Gündem
- Anadolu Ajansı - Gündem
- Anadolu Ajansı - Teknoloji
- Cumhuriyet - Anasayfa
- Cumhuriyet - Teknoloji
- T24 - Anasayfa
- BBC Türkçe

### Turkish Tech News Sources (4 feeds)

- Webrazzi - Yapay Zeka
- Webrazzi - Teknoloji
- ShiftDelete.Net - Anasayfa
- Log - Teknoloji

### Turkish Economy News (3 feeds)

- Dünya Gazetesi - Ekonomi
- Para Analiz - Ekonomi
- Ekonomim - Ekonomi

---

## ⚡ Performance Metrics

### Response Time

- **Average:** 2,270ms
- **Fastest:** CNN Türk - Anasayfa (93ms)
- **Slowest:** Berkeley AI Research (20,695ms)

### Content Volume

- **Total Items:** 5,294 articles
- **Average per Feed:** 54 articles
- **Highest:** OpenAI Blog (818 items)

### Reliability

- **Success Rate:** 95.1%
- **Failed Feeds:** 5 (removed from list)
- **Timeout Rate:** 0%

---

## 🔧 Usage

### Fetch All Feeds

```typescript
import { fetchAllRSSFeeds } from "@/lib/rss";

const articles = await fetchAllRSSFeeds(10); // 10 concurrent requests
```

### Get Feed Statistics

```typescript
import { getFeedStatistics } from "@/lib/rss";

const stats = getFeedStatistics();
console.log(stats);
// {
//   total: 98,
//   byLanguage: { en: 69, tr: 28 },
//   byCategory: { english: 69, turkish: 28 }
// }
```

### Filter Recent Articles

```typescript
import { filterRecentArticles } from "@/lib/rss";

const recentArticles = filterRecentArticles(articles, 48); // Last 48 hours
```

---

## 📝 Testing

### Run Full Test Suite

```bash
npx tsx scripts/test-all-feeds.ts
```

### Test Output

- Console report with detailed statistics
- JSON report saved to `RSS-FEED-TEST-REPORT.json`
- Success rate, response times, and error details

---

## 🚀 Recent Updates

### 2025-01-XX - Major Expansion

- ✅ Added 47 new English feeds
- ✅ Removed 1 unreliable Turkish feed
- ✅ Achieved 95.1% success rate
- ✅ Comprehensive testing implemented
- ✅ Documentation updated

---

## 📚 Related Documentation

- **RSS-FEED-EXPANSION-REPORT.md** - Detailed expansion report
- **RSS-UPDATE-SUMMARY.md** - Update history
- **scripts/test-all-feeds.ts** - Testing script
- **RSS-FEED-TEST-REPORT.json** - Latest test results

---

**Maintained by:** AI News Aggregator Team  
**Last Test:** 2025-01-XX  
**Next Review:** Monthly
