import { db } from "@/lib/db";
import Link from "next/link";
import Image from "next/image";
import { formatDate } from "@/lib/utils";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Trend Haberler | AI Haberleri",
  description:
    "Bugün dünyada en çok konuşulan yapay zeka haberleri. Trend puanlarına göre sıralanmış güncel AI gelişmeleri.",
  openGraph: {
    title: "Trend Haberler | AI Haberleri",
    description: "Bugün dünyada en çok konuşulan yapay zeka haberleri.",
  },
};

function getTrendBadge(score: number) {
  if (score >= 80)
    return {
      label: "Viral",
      color: "bg-red-500/20 text-red-400 border-red-500/30",
    };
  if (score >= 60)
    return {
      label: "Trend",
      color: "bg-green-500/20 text-green-400 border-green-500/30",
    };
  if (score >= 40)
    return {
      label: "Popüler",
      color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    };
  return {
    label: "Yükselen",
    color: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  };
}

export default async function TrendingPage() {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const articles = await db.article.findMany({
    where: {
      status: "PUBLISHED",
      publishedAt: { gte: todayStart },
    },
    orderBy: [{ trendScore: "desc" }, { views: "desc" }],
    include: {
      category: { select: { name: true, slug: true } },
    },
  });

  return (
    <div className="min-h-screen bg-ai-background-dark">
      <div className="container mx-auto px-4 py-12">
        {/* Header */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-red-500/20 to-orange-500/20 border border-red-500/30">
              <span className="material-symbols-outlined text-red-400 text-[28px]">
                local_fire_department
              </span>
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight">
                Bugünün Trend Haberleri
              </h1>
              <p className="text-ai-text-secondary mt-1">
                {new Date().toLocaleDateString("tr-TR", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
                {" · "}
                {articles.length} haber
              </p>
            </div>
          </div>
        </div>

        {/* How Trend Score Works */}
        <div className="mb-10 bg-ai-surface-card border border-ai-surface-border rounded-xl p-6">
          <h2 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
            <span className="material-symbols-outlined text-ai-primary text-[20px]">
              info
            </span>
            Trend Puanı Nasıl Hesaplanır?
          </h2>
          <p className="text-sm text-ai-text-secondary leading-relaxed mb-4">
            AI Haberleri olarak temel amacımız, yapay zeka dünyasındaki
            gelişmeleri yakından takip eden kullanıcılarımızın onlarca kaynağı
            ayrı ayrı kontrol etmek zorunda kalmamasını sağlamaktır. Özel haber
            araştırma sistemimiz her 15 dakikada bir dünya genelindeki yüzlerce
            kaynağı tarayarak haber değeri taşıyan gelişmeleri tespit eder.
          </p>
          <p className="text-sm text-ai-text-secondary leading-relaxed mb-4">
            Tespit edilen haberler, 7 farklı sinyal üzerinden değerlendirilerek
            0-100 arası bir trend puanı alır:
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              {
                icon: "psychology",
                label: "AI İlgisi",
                desc: "Yapay zeka alanına ne kadar ilgili",
              },
              {
                icon: "schedule",
                label: "Güncellik",
                desc: "Ne kadar yeni ve taze",
              },
              {
                icon: "verified",
                label: "Kaynak Güvenilirliği",
                desc: "Kaynağın prestiji ve güvenilirliği",
              },
              {
                icon: "title",
                label: "Başlık Kalitesi",
                desc: "Haber değeri ve spesifiklik",
              },
              {
                icon: "article",
                label: "İçerik Derinliği",
                desc: "Detay ve analiz seviyesi",
              },
              {
                icon: "new_releases",
                label: "Yenilik",
                desc: "İlk kez duyurulan gelişmeler",
              },
              {
                icon: "trending_up",
                label: "Etkileşim Potansiyeli",
                desc: "Okuyucu ilgisi ve etki",
              },
              {
                icon: "visibility",
                label: "Okuma & Beğeni",
                desc: "Gerçek kullanıcı etkileşimi",
              },
            ].map((signal) => (
              <div
                key={signal.label}
                className="p-3 bg-ai-surface-dark rounded-lg border border-ai-surface-border"
              >
                <span className="material-symbols-outlined text-ai-primary text-[16px] mb-1 block">
                  {signal.icon}
                </span>
                <p className="text-xs font-semibold text-white">
                  {signal.label}
                </p>
                <p className="text-[11px] text-ai-text-muted mt-0.5">
                  {signal.desc}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Articles List */}
        {articles.length > 0 ? (
          <div className="space-y-4">
            {articles.map((article, index) => {
              const score = article.trendScore ?? 0;
              const badge = getTrendBadge(score);
              return (
                <Link
                  key={article.id}
                  href={`/news/${article.slug}`}
                  className="group flex gap-4 md:gap-6 p-4 md:p-5 bg-ai-surface-card border border-ai-surface-border rounded-xl hover:border-ai-primary/40 transition-all"
                >
                  {/* Rank */}
                  <div className="flex-shrink-0 flex flex-col items-center justify-center w-12">
                    <span
                      className={`text-2xl font-black ${index < 3 ? "text-ai-primary" : "text-ai-text-muted"}`}
                    >
                      {index + 1}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded border mt-1 ${badge.color}`}
                    >
                      {score}
                    </span>
                  </div>

                  {/* Image */}
                  {article.imageUrl && (
                    <div className="relative w-24 h-24 md:w-32 md:h-24 rounded-lg overflow-hidden flex-shrink-0 border border-ai-surface-border">
                      <Image
                        src={article.imageUrl}
                        alt={article.title}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform"
                        unoptimized={
                          article.imageUrl.includes("pollinations.ai") ||
                          article.imageUrl.includes("r2.dev") ||
                          article.imageUrl.includes("images.aihaberleri.org")
                        }
                      />
                    </div>
                  )}

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      {article.category && (
                        <span className="text-[11px] font-semibold text-ai-primary bg-ai-primary/10 px-2 py-0.5 rounded border border-ai-primary/20">
                          {article.category.name}
                        </span>
                      )}
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${badge.color}`}
                      >
                        {badge.label}
                      </span>
                    </div>
                    <h3 className="text-base md:text-lg font-bold text-white group-hover:text-ai-primary transition-colors line-clamp-2 mb-1.5">
                      {article.title}
                    </h3>
                    {article.excerpt && (
                      <p className="text-sm text-ai-text-secondary line-clamp-1 hidden md:block">
                        {article.excerpt}
                      </p>
                    )}
                    <div className="flex items-center gap-3 mt-2 text-xs text-ai-text-muted">
                      {article.publishedAt && (
                        <span className="flex items-center gap-1">
                          <span className="material-symbols-outlined text-[12px]">
                            schedule
                          </span>
                          {formatDate(article.publishedAt)}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-[12px]">
                          visibility
                        </span>
                        {article.views.toLocaleString("tr-TR")}
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-20 bg-ai-surface-card rounded-2xl border border-dashed border-ai-surface-border">
            <span className="material-symbols-outlined text-ai-text-muted text-5xl mb-3 block">
              local_fire_department
            </span>
            <h2 className="text-xl font-bold text-white mb-2">
              Henüz bugün trend haber yok
            </h2>
            <p className="text-ai-text-secondary mb-6">
              Otonom haber sistemimiz yeni haberleri taramaya devam ediyor.
            </p>
            <Link
              href="/news"
              className="inline-flex items-center gap-2 text-ai-primary hover:underline font-medium"
            >
              Tüm Haberlere Göz At
              <span className="material-symbols-outlined text-[16px]">
                arrow_forward
              </span>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
