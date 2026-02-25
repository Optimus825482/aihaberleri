"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState, Suspense } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

interface SearchResult {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  imageUrl: string | null;
  publishedAt: string | null;
  views: number;
  category: {
    name: string;
    slug: string;
  } | null;
}

function SearchContent() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isEnglish = pathname?.startsWith("/en");
  const locale = isEnglish ? "en" : "tr";
  const searchPath = isEnglish ? "/en/search" : "/search";
  const newsPath = isEnglish ? "/en/news" : "/news";

  const ui = isEnglish
    ? {
      title: "Search News",
      inputPlaceholder: "Search keyword, title or topic...",
      buttonSearch: "Search",
      buttonSearching: "Searching...",
      searchError: "An error occurred during search",
      resultText: (q: string, n: number, loadingState: boolean) =>
        `For \"${q}\" ${loadingState ? "searching..." : `${n} results found`}`,
      noResultTitle: "No Results",
      noResultDesc: (q: string) =>
        `No news found for \"${q}\". Try different keywords.`,
      companyMode: "Company mode active: results prioritize title/excerpt/keyword relevance",
    }
    : {
      title: "Haber Ara",
      inputPlaceholder: "Anahtar kelime, başlık veya konu ara...",
      buttonSearch: "Ara",
      buttonSearching: "Aranıyor...",
      searchError: "Arama sırasında bir hata oluştu",
      resultText: (q: string, n: number, loadingState: boolean) =>
        `\"${q}\" için ${loadingState ? "aranıyor..." : `${n} sonuç bulundu`}`,
      noResultTitle: "Sonuç Bulunamadı",
      noResultDesc: (q: string) =>
        `\"${q}\" için herhangi bir haber bulunamadı. Farklı anahtar kelimeler deneyin.`,
      companyMode: "Şirket modu aktif: sonuçlar başlık/özet/etiket odaklı filtrelenir",
    };
  const query = searchParams?.get("q") || "";
  const mode = searchParams?.get("mode") || "";
  const topic = searchParams?.get("topic") || "";
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState(query);

  // Search when query changes
  const performSearch = async (searchQuery: string) => {
    if (!searchQuery.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/search?q=${encodeURIComponent(searchQuery.trim())}${mode ? `&mode=${encodeURIComponent(mode)}` : ""}${mode === "topic" && topic ? `&topic=${encodeURIComponent(topic)}` : ""}&locale=${locale}`,
      );
      const data = await response.json();

      if (data.error) {
        setError(data.error);
        setResults([]);
      } else {
        setResults(data.articles || []);
      }
    } catch (err) {
      console.error("Search error:", err);
      setError(ui.searchError);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  // Trigger search when query param changes
  useEffect(() => {
    if (query) {
      performSearch(query);
      setSearchInput(query);
    } else {
      setResults([]);
    }
  }, [query, mode, topic]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput.trim()) {
      // Update URL with new search query
      window.history.pushState(
        {},
        "",
        `${searchPath}?q=${encodeURIComponent(searchInput.trim())}${mode ? `&mode=${encodeURIComponent(mode)}` : ""}${mode === "topic" && topic ? `&topic=${encodeURIComponent(topic)}` : ""}`,
      );
      performSearch(searchInput.trim());
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "";
    return new Date(dateString).toLocaleDateString(
      isEnglish ? "en-US" : "tr-TR",
      {
      day: "numeric",
      month: "long",
      year: "numeric",
      },
    );
  };

  return (
    <div className="min-h-screen flex flex-col bg-ai-background-dark">
      <main className="flex-1 container mx-auto px-4 py-8 max-w-7xl">
        {/* Search Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-4">{ui.title}</h1>

          {/* Search Form */}
          <form onSubmit={handleSubmit} className="max-w-2xl">
            <div className="relative flex gap-3">
              <div className="relative flex-1">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-ai-text-muted text-[22px]">
                  search
                </span>
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder={ui.inputPlaceholder}
                  className="w-full h-14 pl-12 pr-4 rounded-xl bg-ai-surface-card border border-ai-surface-border text-white placeholder:text-ai-text-muted focus:border-ai-primary focus:ring-2 focus:ring-ai-primary/20 transition-all text-lg"
                  autoFocus
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="h-14 px-8 rounded-xl bg-ai-primary hover:bg-ai-primary-hover text-white font-semibold transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <span className="material-symbols-outlined animate-spin text-[20px]">
                      progress_activity
                    </span>
                    {ui.buttonSearching}
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[20px]">
                      search
                    </span>
                      {ui.buttonSearch}
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Search Results */}
        {query && (
          <div className="mb-4">
            <p className="text-ai-text-secondary">{ui.resultText(query, results.length, loading)}</p>
            {mode === "company" && (
              <p className="text-xs text-ai-primary mt-1">
                {ui.companyMode}
              </p>
            )}
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6 text-center">
            <span className="material-symbols-outlined text-red-400 text-4xl mb-2">
              error
            </span>
            <p className="text-red-400">{error}</p>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="bg-ai-surface-card rounded-xl overflow-hidden animate-pulse"
              >
                <div className="aspect-video bg-ai-surface-border" />
                <div className="p-4">
                  <div className="h-4 bg-ai-surface-border rounded mb-2" />
                  <div className="h-4 bg-ai-surface-border rounded w-3/4" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Results Grid */}
        {!loading && results.length > 0 && (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {results.map((article) => (
              <Link
                key={article.id}
                href={`${newsPath}/${article.slug}`}
                className="group bg-ai-surface-card rounded-xl overflow-hidden border border-ai-surface-border hover:border-ai-primary/50 transition-all hover:shadow-xl hover:shadow-ai-primary/10 hover:-translate-y-1"
              >
                {/* Image */}
                <div className="relative aspect-video bg-ai-surface-border">
                  {article.imageUrl ? (
                    <Image
                      src={article.imageUrl}
                      alt={article.title}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                      unoptimized={
                        article.imageUrl.includes("pollinations.ai") ||
                        article.imageUrl.includes("r2.dev") ||
                        article.imageUrl.includes("images.aihaberleri.org")
                      }
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="material-symbols-outlined text-ai-text-muted text-4xl">
                        article
                      </span>
                    </div>
                  )}
                  {/* Category Badge */}
                  {article.category && (
                    <span className="absolute top-3 left-3 px-3 py-1 text-xs font-semibold rounded-full bg-ai-primary/90 text-white">
                      {article.category.name}
                    </span>
                  )}
                </div>

                {/* Content */}
                <div className="p-4">
                  <h3 className="font-bold text-white text-lg mb-2 line-clamp-2 group-hover:text-ai-primary transition-colors">
                    {article.title}
                  </h3>
                  {article.excerpt && (
                    <p className="text-ai-text-secondary text-sm line-clamp-2 mb-3">
                      {article.excerpt}
                    </p>
                  )}
                  <div className="flex items-center justify-between text-xs text-ai-text-muted">
                    <span>{formatDate(article.publishedAt)}</span>
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">
                        visibility
                      </span>
                      {article.views.toLocaleString("tr-TR")}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* No Results */}
        {!loading && query && results.length === 0 && !error && (
          <div className="text-center py-16">
            <span className="material-symbols-outlined text-ai-text-muted text-6xl mb-4">
              search_off
            </span>
            <h3 className="text-xl font-bold text-white mb-2">{ui.noResultTitle}</h3>
            <p className="text-ai-text-secondary mb-6">{ui.noResultDesc(query)}</p>
            <div className="flex flex-wrap gap-2 justify-center">
              {["ChatGPT", "Yapay Zeka", "OpenAI", "Google AI", "Gemini"].map(
                (suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => {
                      setSearchInput(suggestion);
                      window.history.pushState(
                        {},
                        "",
                        `/search?q=${encodeURIComponent(suggestion)}`,
                      );
                      performSearch(suggestion);
                    }}
                    className="px-4 py-2 rounded-full bg-ai-surface-card border border-ai-surface-border text-ai-text-secondary hover:text-white hover:border-ai-primary/50 transition-colors"
                  >
                    {suggestion}
                  </button>
                ),
              )}
            </div>
          </div>
        )}

        {/* Empty State (No Query) */}
        {!query && (
          <div className="text-center py-16">
            <span className="material-symbols-outlined text-ai-primary text-6xl mb-4">
              search
            </span>
            <h3 className="text-xl font-bold text-white mb-2">
              Yapay Zeka Haberlerini Arayın
            </h3>
            <p className="text-ai-text-secondary mb-6">
              Binlerce yapay zeka haberini arayın.
              <br />
              Şirket adı, teknoloji veya konu yazarak başlayın.
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              {[
                "ChatGPT",
                "Yapay Zeka",
                "OpenAI",
                "Gemini",
                "Claude",
                "Sora",
              ].map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => {
                    setSearchInput(suggestion);
                    window.history.pushState(
                      {},
                      "",
                      `/search?q=${encodeURIComponent(suggestion)}`,
                    );
                    performSearch(suggestion);
                  }}
                  className="px-4 py-2 rounded-full bg-ai-surface-card border border-ai-surface-border text-ai-text-secondary hover:text-white hover:border-ai-primary/50 transition-colors"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-ai-background-dark">
          <div className="animate-spin">
            <span className="material-symbols-outlined text-ai-primary text-4xl">
              progress_activity
            </span>
          </div>
        </div>
      }
    >
      <SearchContent />
    </Suspense>
  );
}
