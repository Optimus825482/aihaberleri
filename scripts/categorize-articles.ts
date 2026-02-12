/**
 * Tüm makaleleri keyword matching ile 7 kategoriye sınıflandırır.
 * Title + excerpt üzerinden regex tabanlı eşleştirme yapar.
 *
 * Usage: npx tsx scripts/categorize-articles.ts [--dry-run]
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const DRY_RUN = process.argv.includes("--dry-run");

// Kategori ID -> keyword patterns (case-insensitive)
// Sıralama önemli: Daha spesifik kategoriler önce kontrol edilir
const CATEGORY_RULES: {
  id: string;
  name: string;
  patterns: RegExp[];
  weight: number; // Eşleşme sayısı ile çarpılır
}[] = [
  {
    id: "cat-robotics",
    name: "Robotik ve Otonom Sistemler",
    weight: 3, // Spesifik, az makale bekleniyor
    patterns: [
      /\brobot\w*/i,
      /\brobotik/i,
      /\botonom\b/i,
      /\bautonomous\b/i,
      /\bdrone\b/i,
      /\bhumanoid\b/i,
      /\bself[- ]driving/i,
      /\bsürücüsüz/i,
      /\brobotics\b/i,
      /\bboston dynamics/i,
      /\bfigure\s*(ai|01|02)/i,
      /\btesla\s*bot/i,
      /\boptimus\b/i,
      /\bmanipulat/i,
      /\bexoskeleton/i,
      /\bwaymo\b/i,
      /\bcruise\b.*\b(autonomous|self)/i,
      /\blidar\b/i,
    ],
  },
  {
    id: "cat-ethics",
    name: "Etik, Güvenlik ve Regülasyon",
    weight: 2.5,
    patterns: [
      /\bregulat/i,
      /\bdüzenleme/i,
      /\byasa\b/i,
      /\blaw\b.*\bai\b/i,
      /\bai\b.*\blaw\b/i,
      /\bbias\b/i,
      /\bönyargı/i,
      /\betik\b/i,
      /\bethic/i,
      /\bgizlilik/i,
      /\bprivacy\b/i,
      /\bgdpr\b/i,
      /\bcopyright\b/i,
      /\btelif/i,
      /\bdeepfake/i,
      /\bfake\s*(news|content|image|video)/i,
      /\bmisinformation/i,
      /\bdisinformation/i,
      /\bban\b.*\bai\b/i,
      /\bai\b.*\bban\b/i,
      /\bsafety\b/i,
      /\balignment\b/i,
      /\bexistential\s*risk/i,
      /\beu\s*ai\s*act/i,
      /\bexecutive\s*order/i,
      /\bcompliance\b/i,
      /\bgovernance\b/i,
      /\baccountab/i,
      /\btransparency\b.*\bai/i,
      /\bai\b.*\btransparency/i,
      /\bwatermark/i,
      /\bcensorship/i,
      /\bsansür/i,
      /\bcyber\s*security/i,
      /\bsiber\s*güvenlik/i,
      /\bhack\b/i,
      /\bvulnerabilit/i,
      /\bmalware\b/i,
      /\bjailbreak/i,
    ],
  },
  {
    id: "cat-science",
    name: "Bilim ve Araştırma",
    weight: 2.5,
    patterns: [
      /\bresearch\w*/i,
      /\baraştırma/i,
      /\bscientif/i,
      /\bbilimsel/i,
      /\bacademi/i,
      /\buniversit/i,
      /\bpaper\b/i,
      /\bstudy\b/i,
      /\bstudies\b/i,
      /\bdiscover/i,
      /\bkeşif/i,
      /\bbreakthrough\b/i,
      /\bmedical\b/i,
      /\btıbbi?\b/i,
      /\bhealth\w*/i,
      /\bsağlık/i,
      /\bdrug\s*discover/i,
      /\bilaç/i,
      /\bprotein\b/i,
      /\bgenomi/i,
      /\bDNA\b/i,
      /\bneuroscien/i,
      /\bbrain\b/i,
      /\bbeyin\b/i,
      /\bclimate\b/i,
      /\biklim/i,
      /\bphysics\b/i,
      /\bfizik\b/i,
      /\bchemist/i,
      /\bkimya/i,
      /\bbiology\b/i,
      /\bbiyoloji/i,
      /\bastronom/i,
      /\bspace\b.*\bai/i,
      /\bai\b.*\bspace\b/i,
      /\bNASA\b/i,
      /\bmaterials?\s*science/i,
      /\bquantum\b/i,
      /\bkuantum/i,
      /\balphafold/i,
      /\bnovel\s*(approach|method|technique)/i,
    ],
  },
  {
    id: "cat-ai-models",
    name: "Yapay Zeka Modelleri",
    weight: 2,
    patterns: [
      /\bgpt[- ]?[3-5]\w*/i,
      /\bgpt\b/i,
      /\bclaude\b/i,
      /\bgemini\b/i,
      /\bllama\b/i,
      /\bmistral\b/i,
      /\bllm\b/i,
      /\blarge\s*language\s*model/i,
      /\bbüyük\s*dil\s*model/i,
      /\bfoundation\s*model/i,
      /\btemel\s*model/i,
      /\btransformer\b/i,
      /\bdiffusion\s*model/i,
      /\bopen\s*source\s*model/i,
      /\bfine[- ]?tun/i,
      /\bpre[- ]?train/i,
      /\bbenchmark/i,
      /\bparameter/i,
      /\bparametre/i,
      /\btoken\s*(limit|window|context)/i,
      /\bcontext\s*window/i,
      /\bmultimodal/i,
      /\bçok\s*modlu/i,
      /\breasoning\s*(model|capabilit|abilit)/i,
      /\bo[1-3]\b.*\bmodel/i,
      /\bmodel\b.*\bo[1-3]\b/i,
      /\bsora\b/i,
      /\bdalle?\b/i,
      /\bstable\s*diffusion/i,
      /\bmidjourney\b/i,
      /\bdeepseek\b/i,
      /\bqwen\b/i,
      /\bphi[- ]?[2-4]/i,
      /\bgrok\b/i,
      /\bcohere\b/i,
      /\banthrop/i,
      /\bopen\s*weights/i,
      /\bsmall\s*language\s*model/i,
      /\bslm\b/i,
      /\bvision\s*model/i,
      /\bimage\s*generat/i,
      /\bgörsel\s*üret/i,
      /\btext[- ]to[- ](image|video|speech|audio|3d)/i,
      /\bspeech[- ]to[- ]text/i,
      /\bvoice\s*(clone|cloning|synth)/i,
    ],
  },
  {
    id: "cat-ai-tools",
    name: "Yapay Zeka Araçları ve Ürünler",
    weight: 1.5,
    patterns: [
      /\bchatgpt\b/i,
      /\bcopilot\b/i,
      /\bai\s*assistant/i,
      /\byapay\s*zeka\s*asistan/i,
      /\bchatbot\b/i,
      /\bplugin\b/i,
      /\bextension\b/i,
      /\bapp\b.*\bai\b/i,
      /\bai\b.*\bapp\b/i,
      /\bfeature\b/i,
      /\bözellik\b/i,
      /\blaunch/i,
      /\brelease/i,
      /\bupdate\b/i,
      /\bgüncelleme/i,
      /\bproduct\b/i,
      /\bürün\b/i,
      /\btool\b/i,
      /\baraç\b/i,
      /\bplatform\b/i,
      /\bapi\b/i,
      /\bsdk\b/i,
      /\bintegrat/i,
      /\bentegrasyon/i,
      /\bsearch\b.*\bai/i,
      /\bai\b.*\bsearch/i,
      /\bcoding\s*assist/i,
      /\bcode\s*generat/i,
      /\bkod\s*üret/i,
      /\bno[- ]?code/i,
      /\blow[- ]?code/i,
      /\bautomation\b/i,
      /\botomasyon/i,
      /\bworkflow\b/i,
      /\bpersonaliz/i,
      /\brecommend/i,
      /\böneri\s*sistem/i,
      /\bsummar/i,
      /\bözetleme/i,
      /\btranslat/i,
      /\bçeviri/i,
      /\bwriting\s*assist/i,
      /\bnotebook\s*lm/i,
    ],
  },
  {
    id: "cat-industry",
    name: "Sektör ve İş Dünyası",
    weight: 1.5,
    patterns: [
      /\binvest/i,
      /\byatırım/i,
      /\bfunding\b/i,
      /\bvaluation\b/i,
      /\bdeğerleme/i,
      /\bIPO\b/i,
      /\bacquisition/i,
      /\bsatın\s*al/i,
      /\bmerger\b/i,
      /\bbirleşme/i,
      /\bpartnership/i,
      /\biş\s*birliği/i,
      /\bortaklık/i,
      /\bstartup\b/i,
      /\bgirişim/i,
      /\bventure\b/i,
      /\bseries\s*[a-f]/i,
      /\b(billion|million)\s*\$/i,
      /\b\$\d+\s*(billion|million|B|M)\b/i,
      /\bmilyar\b/i,
      /\bmilyon\b/i,
      /\brevenue\b/i,
      /\bgelir\b/i,
      /\bprofit\b/i,
      /\bkâr\b/i,
      /\bmarket\s*(share|cap|value)/i,
      /\bpazar\s*payı/i,
      /\bcompetit/i,
      /\brekabet/i,
      /\bNVIDIA\b/i,
      /\bGoogle\b/i,
      /\bMicrosoft\b/i,
      /\bApple\b/i,
      /\bMeta\b/i,
      /\bAmazon\b/i,
      /\bOpenAI\b/i,
      /\bSamsung\b/i,
      /\bIntel\b/i,
      /\bAMD\b/i,
      /\bTSMC\b/i,
      /\bchip\b/i,
      /\bsemiconductor/i,
      /\byarı\s*iletken/i,
      /\bGPU\b/i,
      /\bdata\s*center/i,
      /\bveri\s*merkez/i,
      /\bcloud\b/i,
      /\bbulut\b/i,
      /\benterprise\b/i,
      /\bkurumsal/i,
      /\bstrateg/i,
      /\bCEO\b/i,
      /\bCTO\b/i,
      /\bhire\b/i,
      /\blayoff/i,
      /\bişten\s*çıkar/i,
    ],
  },
  {
    id: "cat-society",
    name: "Yapay Zeka ve Toplum",
    weight: 1,
    patterns: [
      /\bjob\b/i,
      /\bwork\w*\b.*\bai/i,
      /\bai\b.*\bwork\w*/i,
      /\biş\s*gücü/i,
      /\bistihdam/i,
      /\bunemployment/i,
      /\bişsizlik/i,
      /\breplace\b.*\b(worker|job|human)/i,
      /\beducat/i,
      /\beğitim/i,
      /\bstudent/i,
      /\böğrenci/i,
      /\bschool\b/i,
      /\bokul\b/i,
      /\bteach/i,
      /\böğret/i,
      /\bart\b.*\bai/i,
      /\bai\b.*\bart\b/i,
      /\bsanat\b/i,
      /\bmusic\b/i,
      /\bmüzik/i,
      /\bcreativ/i,
      /\byaratıcı/i,
      /\bfilm\b/i,
      /\bsinema/i,
      /\bhollywood/i,
      /\bgaming\b/i,
      /\boyun\b/i,
      /\bsocial\s*media/i,
      /\bsosyal\s*medya/i,
      /\bcultur/i,
      /\bkültür/i,
      /\bsociet/i,
      /\btoplum/i,
      /\bhuman\s*(impact|effect|cost)/i,
      /\bdaily\s*life/i,
      /\bgunluk\s*hayat/i,
      /\bconsumer/i,
      /\btüketici/i,
      /\blifestyle/i,
      /\byaşam\s*tarzı/i,
      /\bmental\s*health/i,
      /\bruh\s*sağlığı/i,
      /\baddiction/i,
      /\bbağımlılık/i,
    ],
  },
];

function classifyArticle(title: string, excerpt: string): string {
  const text = `${title} ${excerpt}`.toLowerCase();
  const scores: { id: string; name: string; score: number }[] = [];

  for (const rule of CATEGORY_RULES) {
    let matchCount = 0;
    for (const pattern of rule.patterns) {
      if (pattern.test(text)) matchCount++;
    }
    scores.push({
      id: rule.id,
      name: rule.name,
      score: matchCount * rule.weight,
    });
  }

  // En yüksek skorlu kategoriyi seç
  scores.sort((a, b) => b.score - a.score);

  // Eğer hiçbir eşleşme yoksa veya skor çok düşükse -> Sektör ve İş Dünyası (default)
  if (scores[0].score < 1) {
    return "cat-industry";
  }

  return scores[0].id;
}

async function main() {
  console.log("🏷️  Makale Kategorilendirme");
  console.log(`⚙️  DryRun: ${DRY_RUN}`);
  console.log("=".repeat(60));

  const articles = await prisma.article.findMany({
    where: { language: "tr", status: "PUBLISHED" },
    select: { id: true, title: true, excerpt: true, categoryId: true },
  });

  console.log(`📰 ${articles.length} makale bulundu\n`);

  const distribution: Record<string, number> = {};
  const updates: { id: string; categoryId: string }[] = [];

  for (const article of articles) {
    const catId = classifyArticle(article.title, article.excerpt || "");
    distribution[catId] = (distribution[catId] || 0) + 1;
    updates.push({ id: article.id, categoryId: catId });
  }

  // Dağılımı göster
  console.log("📊 Kategori Dağılımı:");
  for (const rule of CATEGORY_RULES) {
    const count = distribution[rule.id] || 0;
    const pct = ((count / articles.length) * 100).toFixed(1);
    console.log(`  ${rule.name}: ${count} (${pct}%)`);
  }

  if (DRY_RUN) {
    console.log("\n⚠️  DRY RUN — güncelleme yapılmadı");
    await prisma.$disconnect();
    return;
  }

  // Batch update
  console.log("\n⏳ Güncelleniyor...");
  const BATCH = 100;
  for (let i = 0; i < updates.length; i += BATCH) {
    const batch = updates.slice(i, i + BATCH);
    await prisma.$transaction(
      batch.map((u) =>
        prisma.article.update({
          where: { id: u.id },
          data: { categoryId: u.categoryId },
        }),
      ),
    );
    process.stdout.write(
      `\r  ${Math.min(i + BATCH, updates.length)}/${updates.length}`,
    );
  }

  console.log("\n\n✅ Tamamlandı!");

  // Eski kategorileri sil (makale bağlı olmayanlar)
  const oldCats = await prisma.category.findMany({
    where: {
      id: { notIn: CATEGORY_RULES.map((r) => r.id) },
    },
    select: { id: true, name: true },
  });

  if (oldCats.length > 0) {
    // Eski kategorilere bağlı makale var mı kontrol
    const oldWithArticles = await prisma.article.count({
      where: { categoryId: { in: oldCats.map((c) => c.id) } },
    });

    if (oldWithArticles === 0) {
      await prisma.category.deleteMany({
        where: { id: { in: oldCats.map((c) => c.id) } },
      });
      console.log(`🗑️  ${oldCats.length} eski kategori silindi`);
    } else {
      console.log(
        `⚠️  ${oldWithArticles} makale hala eski kategorilerde — silme atlandı`,
      );
    }
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("💥 Fatal:", e.message);
  prisma.$disconnect();
  process.exit(1);
});
