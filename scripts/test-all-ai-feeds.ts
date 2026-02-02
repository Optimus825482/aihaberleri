/**
 * Test ALL AI RSS feeds from GitHub allainews_sources
 * Tests all feeds and reports which ones work
 */

import axios from "axios";
import { parseStringPromise } from "xml2js";

interface FeedTest {
  name: string;
  url: string;
  status: "success" | "failed" | "empty" | "timeout";
  itemCount?: number;
  error?: string;
  responseTime?: number;
}

// Tüm AI RSS feedleri (GitHub allainews_sources'tan - sadece News bölümü)
const ALL_AI_FEEDS = [
  { name: "404 Media", url: "https://www.404media.co/rss" },
  { name: "Ahead of AI", url: "https://magazine.sebastianraschka.com/feed" },
  {
    name: "AI Accelerator Institute",
    url: "https://aiacceleratorinstitute.com/rss/",
  },
  {
    name: "AI - AI-TechPark",
    url: "https://ai-techpark.com/category/ai/feed/",
  },
  {
    name: "AI Archives | KnowTechie",
    url: "https://knowtechie.com/category/ai/feed/",
  },
  { name: "AI Business", url: "https://aibusiness.com/rss.xml" },
  { name: "AIModels.fyi", url: "https://aimodels.substack.com/feed" },
  {
    name: "AI News",
    url: "https://www.artificialintelligence-news.com/feed/rss/",
  },
  {
    name: "AI News | VentureBeat",
    url: "https://venturebeat.com/category/ai/feed/",
  },
  {
    name: "AI Now Institute",
    url: "https://ainowinstitute.org/category/news/feed",
  },
  {
    name: "Ai Prompt Programming",
    url: "https://www.reddit.com/r/aipromptprogramming",
  },
  {
    name: "AI – SiliconANGLE",
    url: "https://siliconangle.com/category/ai/feed",
  },
  { name: "AI Snake Oil", url: "https://aisnakeoil.substack.com/feed" },
  {
    name: "AI – Uber Engineering Blog",
    url: "https://eng.uber.com/category/articles/ai/feed",
  },
  { name: "Anaconda Blog", url: "https://www.anaconda.com/blog/feed" },
  {
    name: "Analytics India Magazine",
    url: "https://analyticsindiamag.com/feed/",
  },
  {
    name: "Announcements - Stability AI",
    url: "https://stability.ai/blog?format=rss",
  },
  {
    name: "Ars Technica - All content",
    url: "https://feeds.arstechnica.com/arstechnica/index",
  },
  {
    name: "Artificial Intelligence - Reddit",
    url: "https://www.reddit.com/r/artificial/.rss",
  },
  {
    name: "Artificial intelligence (AI) – The Conversation",
    url: "https://theconversation.com/europe/topics/artificial-intelligence-ai-90/articles.atom",
  },
  {
    name: "Artificial intelligence (AI) | The Guardian",
    url: "https://www.theguardian.com/technology/artificialintelligenceai/rss",
  },
  {
    name: "artificial intelligence Archives - SpaceNews",
    url: "https://spacenews.com/tag/artificial-intelligence/feed/",
  },
  {
    name: "Artificial Intelligence – Futurism",
    url: "https://futurism.com/categories/ai-artificial-intelligence/feed",
  },
  {
    name: "Artificial Intelligence Latest - Wired",
    url: "https://www.wired.com/feed/tag/ai/latest/rss",
  },
  {
    name: "Artificial Intelligence News -- ScienceDaily",
    url: "https://www.sciencedaily.com/rss/computers_math/artificial_intelligence.xml",
  },
  {
    name: "Artificial Intelligence | TechRepublic",
    url: "https://www.techrepublic.com/rssfeeds/topic/artificial-intelligence/",
  },
  {
    name: "Artificialis - Medium",
    url: "https://medium.com/feed/artificialis",
  },
  {
    name: "Big Data – SiliconANGLE",
    url: "https://siliconangle.com/category/big-data/feed",
  },
  {
    name: "Blog - Machine Learning Mastery",
    url: "https://machinelearningmastery.com/blog/feed",
  },
  {
    name: "Blog Archives • David Stutz",
    url: "https://davidstutz.de/category/blog/feed",
  },
  {
    name: "Blog Content - TOGETHER",
    url: "https://www.together.xyz/blog?format=rss",
  },
  { name: "Blog - neptune.ai", url: "https://neptune.ai/blog/feed" },
  { name: "Blog on EleutherAI", url: "https://blog.eleuther.ai/index.xml" },
  { name: "Blog - PyImageSearch", url: "https://pyimagesearch.com/blog/feed" },
  {
    name: "Bloomberg Technology",
    url: "https://feeds.bloomberg.com/technology/news.rss",
  },
  {
    name: "Business Insider",
    url: "https://feeds.businessinsider.com/custom/all",
  },
  {
    name: "Business Latest - Wired",
    url: "https://www.wired.com/feed/category/business/latest/rss",
  },
  {
    name: "Chain of Thought",
    url: "https://every.to/chain-of-thought/feed.xml",
  },
  { name: "Chip Huyen", url: "https://huyenchip.com/feed" },
  {
    name: "Computer Vision - Reddit",
    url: "https://www.reddit.com/r/computervision",
  },
  { name: "Computerworld", url: "http://www.computerworld.com/index.rss" },
  { name: "Context by Cohere", url: "https://txt.cohere.ai/rss/" },
  { name: "Crunchbase News", url: "https://news.crunchbase.com/feed" },
  { name: "cs.CL updates on arXiv.org", url: "https://arxiv.org/rss/cs.CL" },
  { name: "cs.CV updates on arXiv.org", url: "https://arxiv.org/rss/cs.CV" },
  { name: "cs.LG updates on arXiv.org", url: "https://arxiv.org/rss/cs.LG" },
  { name: "DagsHub Blog", url: "https://dagshub.com/blog/rss/" },
  { name: "Dark Reading", url: "https://www.darkreading.com/rss_simple.asp" },
  { name: "Databricks", url: "https://www.databricks.com/feed" },
  { name: "Datafloq", url: "https://datafloq.com/feed/?post_type=post" },
  { name: "Data Machina", url: "https://datamachina.substack.com/feed" },
  { name: "Datanami", url: "https://www.datanami.com/feed/" },
  {
    name: "Data Science - Reddit",
    url: "https://www.reddit.com/r/datascience",
  },
  { name: "DebuggerCafe", url: "https://debuggercafe.com/feed/" },
  { name: "Deephaven Blog", url: "https://deephaven.io/blog/rss.xml" },
  {
    name: "Deep Learning - Reddit",
    url: "https://www.reddit.com/r/deeplearning",
  },
  { name: "DeepMind Blog", url: "https://deepmind.com/blog/feed/basic/" },
  {
    name: "Deep Tech - Tech.eu",
    url: "https://tech.eu/category/deep-tech/feed",
  },
  {
    name: "Department of Product",
    url: "https://departmentofproduct.substack.com/feed",
  },
  { name: "DEV Community", url: "https://dev.to/feed" },
  { name: "EE Times", url: "https://www.eetimes.com/feed" },
  { name: "Engadget", url: "https://www.engadget.com/rss.xml" },
  { name: "Eugene Yan", url: "https://eugeneyan.com/rss/" },
  { name: "Explosion", url: "https://explosion.ai/feed" },
  { name: "Freethink", url: "https://www.freethink.com/feed/all" },
  { name: "Generational", url: "https://www.generational.pub/feed" },
  {
    name: "Get AI Insights For Your Organization From Forrester",
    url: "https://www.forrester.com/blogs/category/artificial-intelligence-ai/feed",
  },
  { name: "gHacks Technology News", url: "https://www.ghacks.net/feed/" },
  { name: "Gizmodo", url: "https://gizmodo.com/rss" },
  {
    name: "Global News",
    url: "https://globalnews.ca/tag/artificial-intelligence/feed",
  },
  { name: "Google AI Blog", url: "http://googleaiblog.blogspot.com/atom.xml" },
  { name: "Gradient Flow", url: "https://gradientflow.com/feed/" },
  { name: "Hacker Noon - ai", url: "https://hackernoon.com/tagged/ai/feed" },
  {
    name: "HealthTech Magazine",
    url: "https://feeds.feedburner.com/HealthTechMagazine",
  },
  { name: "Hugging Face - Blog", url: "https://huggingface.co/blog/feed.xml" },
  {
    name: "IEEE Spectrum",
    url: "https://spectrum.ieee.org/feeds/topic/artificial-intelligence.rss",
  },
  {
    name: "InfoQ - AI, ML & Data Engineering",
    url: "https://feed.infoq.com/ai-ml-data-eng/",
  },
  {
    name: "InfoWorld Analytics",
    url: "https://www.infoworld.com/category/analytics/index.rss",
  },
  {
    name: "InfoWorld Machine Learning",
    url: "https://www.infoworld.com/category/machine-learning/index.rss",
  },
  { name: "insideBIGDATA", url: "https://insidebigdata.com/feed" },
  { name: "Interconnects", url: "https://www.interconnects.ai/feed" },
  {
    name: "International Business Times",
    url: "https://www.ibtimes.com/rss",
  },
  { name: "JMLR", url: "https://www.jmlr.org/jmlr.xml" },
  { name: "KDnuggets", url: "https://www.kdnuggets.com/feed" },
  { name: "LangChain", url: "https://blog.langchain.dev/rss/" },
  { name: "Last Week in AI", url: "https://lastweekin.ai/feed" },
  { name: "Latent Space", url: "https://www.latent.space/feed" },
  {
    name: "Latest from Sifted",
    url: "https://sifted.eu/feed/?post_type=article",
  },
  {
    name: "Latest stories for ZDNET in Artificial-Intelligence",
    url: "https://www.zdnet.com/topic/artificial-intelligence/rss.xml",
  },
  {
    name: "Latest stories for ZDNET in Big-Data",
    url: "https://www.zdnet.com/topic/big-data/rss.xml",
  },
  { name: "Lightning AI", url: "https://lightning.ai/pages/feed/" },
  {
    name: "Machine Learning - Reddit",
    url: "https://www.reddit.com/r/MachineLearning",
  },
  {
    name: "Machine Learning & Big Data Blog – BMC Software",
    url: "https://www.bmc.com/blogs/categories/machine-learning-big-data/feed",
  },
  {
    name: "Machine Learning Blog | ML@CMU",
    url: "https://blog.ml.cmu.edu/feed",
  },
  {
    name: "Machine learning : nature.com subject feeds",
    url: "https://www.nature.com/subjects/machine-learning.rss",
  },
  {
    name: "machinelearningnews - Reddit",
    url: "https://www.reddit.com/r/machinelearningnews",
  },
  { name: "MarkTechPost", url: "https://www.marktechpost.com/feed" },
  {
    name: "Microsoft Research",
    url: "https://www.microsoft.com/en-us/research/feed/",
  },
  { name: "Mila", url: "https://mila.quebec/en/feed/" },
  {
    name: "MIT News - Machine learning",
    url: "https://news.mit.edu/topic/mitmachine-learning-rss.xml",
  },
  {
    name: "MIT Technology Review",
    url: "https://www.technologyreview.com/feed/",
  },
  {
    name: "Mozilla Foundation Blog",
    url: "https://foundation.mozilla.org/en/blog/rss/",
  },
  {
    name: "Natural Language Processing - Reddit",
    url: "https://www.reddit.com/r/LanguageTechnology",
  },
  {
    name: "Neural Interfaces News -- ScienceDaily",
    url: "https://www.sciencedaily.com/rss/computers_math/neural_interfaces.xml",
  },
  {
    name: "Neural Networks, Deep Learning and Machine Learning - Reddit",
    url: "https://www.reddit.com/r/neuralnetworks",
  },
  {
    name: "New Scientist - Technology",
    url: "https://www.newscientist.com/subject/technology/feed/",
  },
  {
    name: "News on Artificial Intelligence and Machine Learning - Phys.org",
    url: "https://phys.org/rss-feed/technology-news/machine-learning-ai/",
  },
  {
    name: "News on Artificial Intelligence and Machine Learning - TechXplore",
    url: "https://techxplore.com/rss-feed/machine-learning-ai-news/",
  },
  {
    name: "News, Tutorials, AI Research - AssemblyAI",
    url: "https://www.assemblyai.com/blog/rss/",
  },
  {
    name: "Nicholas Carlini",
    url: "https://nicholas.carlini.com/writing/feed.xml",
  },
  {
    name: "NVIDIA Technical Blog",
    url: "https://developer.nvidia.com/blog/feed",
  },
  {
    name: "NYT > Technology",
    url: "https://rss.nytimes.com/services/xml/rss/nyt/Technology.xml",
  },
  { name: "One Useful Thing", url: "https://www.oneusefulthing.org/feed" },
  { name: "OpenAI Blog", url: "https://openai.com/blog/rss/" },
  { name: "Paperspace Blog", url: "https://blog.paperspace.com/rss/" },
  { name: "PetaPixel", url: "https://petapixel.com/feed" },
  { name: "philschmid blog", url: "https://www.philschmid.de/feed.xml" },
  { name: "Playing with AI", url: "https://erichartford.com/rss.xml" },
  {
    name: "Posts on Max Woolf's Blog",
    url: "https://minimaxir.com/post/index.xml",
  },
  { name: "Product Hunt", url: "https://www.producthunt.com/feed" },
  {
    name: "Python Insider",
    url: "https://feeds.feedburner.com/PythonInsider",
  },
  { name: "Quanta Magazine", url: "https://api.quantamagazine.org/feed" },
  { name: "Radix - Medium", url: "https://medium.com/feed/radix-ai-blog" },
  { name: "R-bloggers", url: "https://feeds.feedburner.com/RBloggers" },
  { name: "Replicate Blog", url: "https://replicate.com/blog/rss" },
  { name: "Replicate Codex", url: "https://notes.replicatecodex.com/rss/" },
  {
    name: "Rest of World - Latest Stories",
    url: "https://restofworld.org/feed/latest",
  },
  {
    name: "Robotics Research News -- ScienceDaily",
    url: "https://www.sciencedaily.com/rss/computers_math/robotics.xml",
  },
  {
    name: "Robotics - Tech.eu",
    url: "https://tech.eu/category/robotics/feed",
  },
  {
    name: "Scientific American Content: Global",
    url: "http://rss.sciam.com/ScientificAmerican-Global",
  },
  { name: "SemiAnalysis", url: "https://www.semianalysis.com/feed" },
  {
    name: "Silicon Republic",
    url: "https://www.siliconrepublic.com/feed",
  },
  {
    name: "Simon Willison's Weblog",
    url: "https://simonwillison.net/atom/everything/",
  },
  { name: "Stack Overflow Blog", url: "https://stackoverflow.blog/feed/" },
  { name: "stanford-crfm-website", url: "https://crfm.stanford.edu/feed" },
  {
    name: "stat.ML updates on arXiv.org",
    url: "https://arxiv.org/rss/stat.ML",
  },
  {
    name: "Stories by Netflix Technology Blog on Medium",
    url: "https://medium.com/feed/@netflixtechblog",
  },
  {
    name: "Stories by ODSC - Open Data Science on Medium",
    url: "https://medium.com/feed/@odsc",
  },
  { name: "Synced", url: "https://syncedreview.com/feed" },
  { name: "Synthedia", url: "https://synthedia.substack.com/feed" },
  { name: "TechCrunch", url: "https://techcrunch.com/feed/" },
  { name: "Techmeme", url: "https://www.techmeme.com/feed.xml" },
  { name: "Tech Monitor", url: "https://techmonitor.ai/feed" },
  {
    name: "Technology Archives - Reuters News Agency",
    url: "https://www.reutersagency.com/feed/?best-topics=tech",
  },
  { name: "TechSpot", url: "https://www.techspot.com/backend.xml" },
  { name: "TechTalks", url: "https://bdtechtalks.com/feed/" },
  {
    name: "The Algorithmic Bridge",
    url: "https://thealgorithmicbridge.substack.com/feed",
  },
  {
    name: "The Berkeley Artificial Intelligence Research Blog",
    url: "https://bair.berkeley.edu/blog/feed.xml",
  },
  { name: "THE DECODER", url: "https://the-decoder.com/feed/" },
  { name: "The Gradient", url: "https://thegradient.pub/rss/" },
  { name: "The Information", url: "https://www.theinformation.com/feed" },
  {
    name: "The Intrinsic Perspective",
    url: "https://www.theintrinsicperspective.com/feed/",
  },
  { name: "The New Stack", url: "https://thenewstack.io/feed" },
  { name: "The Next Web", url: "https://thenextweb.com/neural/feed" },
  {
    name: "The Register - Software: AI + ML",
    url: "https://www.theregister.com/software/ai_ml/headlines.atom",
  },
  {
    name: "The Rundown AI",
    url: "https://rss.beehiiv.com/feeds/2R3C6Bt5wj.xml",
  },
  { name: "TheSequence", url: "https://thesequence.substack.com/feed" },
  { name: "The Stack", url: "https://www.thestack.technology/latest/rss/" },
  {
    name: "The TensorFlow Blog",
    url: "https://blog.tensorflow.org/feeds/posts/default?alt=rss",
  },
  { name: "The TRADE", url: "https://www.thetradenews.com/feed/" },
  {
    name: "The Verge - All Posts",
    url: "https://www.theverge.com/rss/index.xml",
  },
  {
    name: "The Voicebot Podcast",
    url: "http://feeds.libsyn.com/102459/rss",
  },
  { name: "Towards AI - Medium", url: "https://pub.towardsai.net/feed" },
  {
    name: "Towards Data Science - Medium",
    url: "https://towardsdatascience.com/feed",
  },
  { name: "Unite.AI", url: "https://www.unite.ai/feed/" },
  { name: "Unwind AI", url: "https://unwindai.substack.com/feed" },
  { name: "VICE US - AI", url: "https://www.vice.com/en/rss/topic/ai" },
  {
    name: "Visual Studio Magazine",
    url: "https://visualstudiomagazine.com/rss-feeds/news.aspx",
  },
  { name: "Voicebot.ai", url: "https://voicebot.ai/feed/" },
  {
    name: "Weights & Biases: Fully Connected",
    url: "https://wandb.ai/fully-connected/rss.xml",
  },
  { name: "Windows Blog", url: "https://blogs.windows.com/feed" },
  { name: "Wolfram Blog", url: "https://blog.wolfram.com/feed/" },
  { name: "ΑΙhub", url: "https://aihub.org/feed?cat=-473" },
];

async function testFeed(feed: {
  name: string;
  url: string;
}): Promise<FeedTest> {
  const startTime = Date.now();

  try {
    const response = await axios.get(feed.url, {
      timeout: 10000,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; AINewsBot/1.0)",
        Accept: "application/rss+xml, application/xml, text/xml, */*",
      },
      validateStatus: (status) => status === 200,
    });

    const xml = response.data;
    const parsed = await parseStringPromise(xml, {
      trim: true,
      normalize: true,
      explicitArray: false,
    });

    let items: any[] = [];

    if (parsed.rss?.channel?.item) {
      items = Array.isArray(parsed.rss.channel.item)
        ? parsed.rss.channel.item
        : [parsed.rss.channel.item];
    } else if (parsed.feed?.entry) {
      items = Array.isArray(parsed.feed.entry)
        ? parsed.feed.entry
        : [parsed.feed.entry];
    }

    const responseTime = Date.now() - startTime;

    if (items.length === 0) {
      return {
        name: feed.name,
        url: feed.url,
        status: "empty",
        itemCount: 0,
        responseTime,
      };
    }

    return {
      name: feed.name,
      url: feed.url,
      status: "success",
      itemCount: items.length,
      responseTime,
    };
  } catch (error: any) {
    const responseTime = Date.now() - startTime;

    if (error.code === "ECONNABORTED" || responseTime >= 10000) {
      return {
        name: feed.name,
        url: feed.url,
        status: "timeout",
        error: "Timeout",
        responseTime,
      };
    }

    return {
      name: feed.name,
      url: feed.url,
      status: "failed",
      error: error.message,
      responseTime,
    };
  }
}

async function testAllFeeds() {
  console.log("🧪 TÜM AI RSS FEEDLER TEST EDİLİYOR...\n");
  console.log("=".repeat(80));
  console.log(`📊 Toplam feed sayısı: ${ALL_AI_FEEDS.length}\n`);

  const results: FeedTest[] = [];
  const batchSize = 10; // 10'ar 10'ar test et

  for (let i = 0; i < ALL_AI_FEEDS.length; i += batchSize) {
    const batch = ALL_AI_FEEDS.slice(i, i + batchSize);
    console.log(
      `\n📦 Batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(ALL_AI_FEEDS.length / batchSize)} (${i + 1}-${Math.min(i + batchSize, ALL_AI_FEEDS.length)})`,
    );

    const batchPromises = batch.map((feed) => testFeed(feed));
    const batchResults = await Promise.all(batchPromises);

    results.push(...batchResults);

    // Her batch'ten sonra kısa bekleme
    if (i + batchSize < ALL_AI_FEEDS.length) {
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }

  // Sonuçları kategorize et
  const success = results.filter((r) => r.status === "success");
  const failed = results.filter((r) => r.status === "failed");
  const empty = results.filter((r) => r.status === "empty");
  const timeout = results.filter((r) => r.status === "timeout");

  // Özet rapor
  console.log("\n" + "=".repeat(80));
  console.log("\n📊 TEST SONUÇLARI:\n");
  console.log(`✅ Başarılı: ${success.length}/${ALL_AI_FEEDS.length}`);
  console.log(`❌ Başarısız: ${failed.length}/${ALL_AI_FEEDS.length}`);
  console.log(`⚠️  Boş: ${empty.length}/${ALL_AI_FEEDS.length}`);
  console.log(`⏱️  Timeout: ${timeout.length}/${ALL_AI_FEEDS.length}`);

  const successRate = (success.length / ALL_AI_FEEDS.length) * 100;
  console.log(`\n🎯 BAŞARI ORANI: ${successRate.toFixed(1)}%`);

  // Başarılı feedleri dosyaya yaz
  if (success.length > 0) {
    console.log("\n✅ BAŞARILI FEEDLER (RSS formatında):\n");

    const successfulFeeds = success
      .map(
        (r) =>
          `  {
    name: "${r.name}",
    url: "${r.url}",
    language: "en",
  },`,
      )
      .join("\n");

    console.log(successfulFeeds);

    // Dosyaya kaydet
    const fs = require("fs");
    fs.writeFileSync(
      "scripts/successful-ai-feeds.txt",
      `// ${success.length} BAŞARILI AI RSS FEED\n// Test tarihi: ${new Date().toISOString()}\n// Başarı oranı: ${successRate.toFixed(1)}%\n\n${successfulFeeds}`,
    );

    console.log(
      `\n💾 Başarılı feedler 'scripts/successful-ai-feeds.txt' dosyasına kaydedildi`,
    );
  }

  // Başarısız feedleri listele
  if (failed.length > 0) {
    console.log("\n❌ BAŞARISIZ FEEDLER:\n");
    failed.forEach((r) => {
      console.log(`   - ${r.name}`);
      console.log(`     URL: ${r.url}`);
      console.log(`     Hata: ${r.error}`);
    });
  }

  console.log("\n" + "=".repeat(80));
}

// Script'i çalıştır
testAllFeeds()
  .then(() => {
    console.log("\n✅ Test tamamlandı");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Test hatası:", error);
    process.exit(1);
  });
