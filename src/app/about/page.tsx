import { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Hakkımızda | AI Haberleri - Yapay Zeka Haber Platformu",
  description:
    "aihaberleri.org, yapay zeka dünyasındaki en güncel gelişmeleri, derinlemesine analizleri ve teknik incelemeleri anlaşılır bir dille sunan bağımsız haber platformudur.",
  keywords: ["yapay zeka", "AI haberleri", "hakkımızda", "Erkan ERDEM", "teknoloji haberleri"],
  alternates: {
    canonical: "https://aihaberleri.org/about",
    languages: {
      "tr-TR": "https://aihaberleri.org/about",
      "en-US": "https://aihaberleri.org/en/about",
    },
  },
  openGraph: {
    title: "Hakkımızda | AI Haberleri",
    description: "Yapay zeka dünyasındaki gelişmeleri yakından takip edenler için oluşturulmuş, özgün ve güncel haber platformu.",
    url: "https://aihaberleri.org/about",
    siteName: "AI Haberleri",
    locale: "tr_TR",
    type: "website",
    images: [
      {
        url: "https://aihaberleri.org/logos/brand/ai-logo-dark.png",
        width: 1200,
        height: 630,
        alt: "AI Haberleri Logo",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Hakkımızda | AI Haberleri",
    description: "Yapay zeka dünyasındaki gelişmeleri yakından takip edenler için oluşturulmuş, özgün ve güncel haber platformu.",
    site: "@AiHaberleri",
    images: ["https://aihaberleri.org/logos/brand/ai-logo-dark.png"],
  },
};

// Organization Schema JSON-LD
const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "AI Haberleri",
  url: "https://aihaberleri.org",
  logo: "https://aihaberleri.org/logos/brand/ai-logo-dark.png",
  description: "Yapay zeka dünyasındaki güncel gelişmeleri, analizleri ve teknik incelemeleri erişilebilir biçimde sunan bağımsız haber platformu.",
  sameAs: [
    "https://twitter.com/AiHaberleri",
    "https://facebook.com/aihaberleri",
    "https://linkedin.com/company/aihaberleri",
  ],
  founder: {
    "@type": "Person",
    name: "Erkan ERDEM",
    url: "https://erkanerdem.net",
  },
  foundingDate: "2024",
  contactPoint: {
    "@type": "ContactPoint",
    email: "info@aihaberleri.org",
    contactType: "customer service",
    availableLanguage: ["Turkish", "English"],
  },
};

// Force dynamic rendering to avoid SSR issues
export const dynamic = "force-dynamic";

export default function AboutPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
      />
      <div className="min-h-screen flex flex-col bg-ai-background-dark">
        <main className="flex-1">
          {/* Hero Section - Stitch Design */}
          <section className="relative overflow-hidden bg-gradient-to-br from-ai-primary via-blue-600 to-purple-600 py-20 md:py-32">
            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.15)_1px,transparent_0)] [background-size:16px_16px]"></div>
            </div>

            <div className="container mx-auto px-4 relative z-10">
              <div className="max-w-4xl mx-auto text-center">
                <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full text-sm font-medium text-white mb-6">
                  <span className="material-symbols-outlined text-[18px]">verified</span>
                  2026 Teknoloji Ekosistemine Odaklı Bağımsız Platform
                </div>
                <h1 className="text-4xl md:text-6xl font-black mb-6 text-white leading-tight tracking-tight">
                  Yapay Zeka Dünyasının Nabzını Tutuyoruz
                </h1>
                <p className="text-xl text-white/90 leading-relaxed max-w-2xl mx-auto">
                  aihaberleri.org, hızla değişen AI ekosistemindeki gelişmeleri, analizleri ve teknik incelemeleri okuyucularıyla buluşturur.
                </p>
              </div>
            </div>

            {/* Decorative Elements */}
            <div className="absolute top-1/2 left-0 -translate-y-1/2 w-64 h-64 bg-white/5 rounded-full blur-3xl"></div>
            <div className="absolute top-1/2 right-0 -translate-y-1/2 w-64 h-64 bg-white/5 rounded-full blur-3xl"></div>
          </section>

          {/* Main Content */}
          <section className="py-16">
            <div className="container mx-auto px-4">
              <div className="max-w-5xl mx-auto">
                {/* Story Section */}
                <div className="mb-16">
                  <div className="flex items-center gap-3 mb-8">
                    <div className="w-12 h-12 rounded-xl bg-ai-primary/10 flex items-center justify-center">
                      <span className="material-symbols-outlined text-ai-primary text-[24px]">auto_stories</span>
                    </div>
                    <h2 className="text-3xl font-bold text-white">Misyonumuz</h2>
                  </div>

                  <p className="text-lg text-ai-text-secondary leading-relaxed mb-6">
                    Sadece yüzeysel haberler sunmuyoruz. Büyük dil modellerinden robotik sistemlere, etik regülasyonlardan geliştirici araçlarına kadar geniş bir yelpazede, karmaşık teknolojileri anlaşılır ve erişilebilir kılmayı hedefliyoruz.
                  </p>

                  <p className="text-lg text-ai-text-secondary leading-relaxed mb-8">
                    Veriye dayalı habercilik yaklaşımımızla, okuyucularımızın AI devrimini yalnızca takip etmesini değil, gerçekten anlamasını sağlıyoruz. Bu yaklaşım, <strong className="text-white">
                      <a
                        href="https://erkanerdem.net"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-ai-primary hover:text-ai-primary-hover transition-colors"
                      >
                        Erkan ERDEM
                      </a>
                    </strong> tarafından kurulan AI Haberleri'nin yayın çizgisinin temelini oluşturur.
                  </p>

                  {/* Quote Card */}
                  <div className="bg-gradient-to-br from-ai-primary/10 to-transparent border border-ai-primary/20 rounded-2xl p-8 my-12 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                      <span className="material-symbols-outlined text-[100px] text-ai-primary">format_quote</span>
                    </div>
                    <p className="text-xl italic text-white relative z-10 mb-4">
                      "Yapay zeka artık bir trend değil; geleceği belirleyen temel güç. Biz bu dönüşümü anlaşılır, şeffaf ve tarafsız bir dille aktarıyoruz."
                    </p>
                    <p className="text-sm text-ai-text-secondary flex items-center gap-2 relative z-10">
                      <span className="w-8 h-px bg-ai-primary"></span>
                      AI Haberleri Editoryal Yaklaşımı
                    </p>
                  </div>
                </div>

                {/* Why AI Haberleri Section */}
                <div className="mb-16">
                  <div className="flex items-center gap-3 mb-8">
                    <div className="w-12 h-12 rounded-xl bg-ai-primary/10 flex items-center justify-center">
                      <span className="material-symbols-outlined text-ai-primary text-[24px]">star</span>
                    </div>
                    <h2 className="text-3xl font-bold text-white">Neden Biz?</h2>
                  </div>

                  <p className="text-lg text-ai-text-secondary leading-relaxed mb-10">
                    Türkiye merkezli bir platform olmamıza rağmen bugün Amerika Birleşik Devletleri'nden Hindistan'a, İngiltere'den Avustralya'ya kadar dünyanın dört bir yanından teknoloji meraklıları, yazılımcılar ve araştırmacılar tarafından takip ediliyoruz.
                  </p>

                  {/* Feature Cards Grid */}
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="bg-ai-surface-card border border-ai-surface-border rounded-xl p-6 hover:border-ai-primary/50 transition-colors group">
                      <div className="w-12 h-12 rounded-lg bg-blue-500/10 flex items-center justify-center mb-4 group-hover:bg-blue-500/20 transition-colors">
                        <span className="material-symbols-outlined text-blue-400 text-[24px]">public</span>
                      </div>
                      <h3 className="text-xl font-bold mb-2 text-white">Küresel Bakış Açısı</h3>
                      <p className="text-ai-text-secondary text-sm">
                        Yerel bir bakış açısını küresel veriyle birleştiriyor; içeriklerimizi evrensel standartlarda ve tarafsız bir editoryal çizgide hazırlıyoruz.
                      </p>
                    </div>

                    <div className="bg-ai-surface-card border border-ai-surface-border rounded-xl p-6 hover:border-ai-primary/50 transition-colors group">
                      <div className="w-12 h-12 rounded-lg bg-purple-500/10 flex items-center justify-center mb-4 group-hover:bg-purple-500/20 transition-colors">
                        <span className="material-symbols-outlined text-purple-400 text-[24px]">verified</span>
                      </div>
                      <h3 className="text-xl font-bold mb-2 text-white">Teknik Derinlik</h3>
                      <p className="text-ai-text-secondary text-sm">
                        LLM ekosisteminden robotik sistemlere, yeni model karşılaştırmalarından geliştirici araçlarına kadar karmaşık konuları uzman bakış açısıyla inceliyoruz.
                      </p>
                    </div>

                    <div className="bg-ai-surface-card border border-ai-surface-border rounded-xl p-6 hover:border-ai-primary/50 transition-colors group">
                      <div className="w-12 h-12 rounded-lg bg-red-500/10 flex items-center justify-center mb-4 group-hover:bg-red-500/20 transition-colors">
                        <span className="material-symbols-outlined text-red-400 text-[24px]">translate</span>
                      </div>
                      <h3 className="text-xl font-bold mb-2 text-white">Güncellik</h3>
                      <p className="text-ai-text-secondary text-sm">
                        AI dünyasında dakikaların bile değerli olduğunun farkındayız; kritik model duyurularını, stratejik iş birliklerini ve sektörü dönüştüren gelişmeleri hızlıca aktarıyoruz.
                      </p>
                    </div>

                    <div className="bg-ai-surface-card border border-ai-surface-border rounded-xl p-6 hover:border-ai-primary/50 transition-colors group">
                      <div className="w-12 h-12 rounded-lg bg-yellow-500/10 flex items-center justify-center mb-4 group-hover:bg-yellow-500/20 transition-colors">
                        <span className="material-symbols-outlined text-yellow-400 text-[24px]">bolt</span>
                      </div>
                      <h3 className="text-xl font-bold mb-2 text-white">Bağımsızlık</h3>
                      <p className="text-ai-text-secondary text-sm">
                        Herhangi bir teknoloji devine bağlı kalmadan, araçların ve modellerin performansını şeffaf biçimde değerlendiriyor; övgü ve eleştiriyi aynı editoryal disiplinle sunuyoruz.
                      </p>
                    </div>
                  </div>
                </div>

                {/* How Content Works Section */}
                <div className="mb-16">
                  <div className="flex items-center gap-3 mb-8">
                    <div className="w-12 h-12 rounded-xl bg-ai-primary/10 flex items-center justify-center">
                      <span className="material-symbols-outlined text-ai-primary text-[24px]">sync</span>
                    </div>
                    <h2 className="text-3xl font-bold text-white">Haberler Size Nasıl Ulaşıyor?</h2>
                  </div>

                  <div className="bg-ai-surface-card border border-ai-surface-border rounded-xl p-8">
                    <p className="text-lg text-ai-text-secondary leading-relaxed mb-6">
                      Editoryal süreçlerimizi hız, doğruluk ve bağlam ilkeleri üzerine kuruyoruz. Küresel kaynaklardan gelen gelişmeleri yalnızca aktarmıyor; teknik arka planı, sektörel etkileri ve uzun vadeli sonuçlarıyla birlikte değerlendiriyoruz.
                    </p>
                    <p className="text-lg text-ai-text-secondary leading-relaxed mb-6">
                      İçeriklerimiz, teknolojiye uzak okurların da anlayabileceği kadar sade; uzmanların da değer bulacağı kadar derin bir dengede hazırlanır. Böylece haber değil, gerçek içgörü sunarız.
                    </p>
                    <div className="bg-ai-surface-dark rounded-lg p-4 mt-6">
                      <p className="text-sm text-ai-text-secondary">
                        <span className="text-ai-primary font-semibold">Editoryal Not:</span> İçeriklerimizde temel öncelik; şeffaflık, kaynak güvenilirliği ve teknik doğruluktur.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Who We Serve Section */}
                <div className="mb-16">
                  <div className="flex items-center gap-3 mb-8">
                    <div className="w-12 h-12 rounded-xl bg-ai-primary/10 flex items-center justify-center">
                      <span className="material-symbols-outlined text-ai-primary text-[24px]">group</span>
                    </div>
                    <h2 className="text-3xl font-bold text-white">Kime Hitap Ediyoruz?</h2>
                  </div>

                  <p className="text-lg text-ai-text-secondary leading-relaxed mb-8">
                    Eğer siz de yapay zekanın iş, teknoloji ve toplum üzerindeki etkilerini daha iyi anlamak istiyorsanız, doğru yerdesiniz.
                  </p>

                  <div className="space-y-4">
                    {[
                      "AI gündemini düzenli takip eden bir teknoloji meraklısıysanız,",
                      "Ürün veya iş süreçlerinde yapay zekayı konumlandıran bir profesyonelseniz,",
                      "Model, araç ve regülasyon değişimlerini yakından izleyen bir geliştirici ya da araştırmacıysanız,",
                      "Küresel AI dönüşümünü doğru bağlamla anlamak isteyen bir karar vericiyseniz,",
                    ].map((item, index) => (
                      <div key={index} className="flex items-start gap-4 p-4 bg-ai-surface-card rounded-xl border border-ai-surface-border">
                        <div className="w-8 h-8 rounded-full bg-ai-primary/20 flex items-center justify-center flex-shrink-0 mt-1">
                          <span className="material-symbols-outlined text-ai-primary text-[16px]">check</span>
                        </div>
                        <p className="text-ai-text-secondary">{item}</p>
                      </div>
                    ))}
                  </div>

                  <div className="mt-8 p-6 bg-gradient-to-r from-ai-primary/10 to-transparent rounded-xl border border-ai-primary/20">
                    <p className="text-xl font-semibold text-white">
                      Burada sadece gündemi değil, geleceği de birlikte okuyoruz.
                    </p>
                  </div>
                </div>

                {/* Future Plans Section */}
                <div className="mb-16">
                  <div className="flex items-center gap-3 mb-8">
                    <div className="w-12 h-12 rounded-xl bg-ai-primary/10 flex items-center justify-center">
                      <span className="material-symbols-outlined text-ai-primary text-[24px]">rocket_launch</span>
                    </div>
                    <h2 className="text-3xl font-bold text-white">Geleceği Birlikte İnşa Ediyoruz</h2>
                  </div>

                  <p className="text-lg text-ai-text-secondary leading-relaxed mb-8">
                    Yapay zeka sadece bir teknoloji değil, insanlığın yeni bir evresi. AI Haberleri olarak bu yolculukta güvenilir bir bilgi ortağı olmaya ve topluluğumuzla birlikte büyümeye devam ediyoruz.
                  </p>

                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="flex gap-4 p-5 bg-ai-surface-card rounded-xl border border-ai-surface-border">
                      <div className="w-12 h-12 rounded-lg bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                        <span className="material-symbols-outlined text-blue-400 text-[24px]">phone_iphone</span>
                      </div>
                      <div>
                        <h3 className="font-bold text-white mb-1">Daha Derin Teknik İçerikler</h3>
                        <p className="text-sm text-ai-text-secondary">Model kıyaslamaları, mühendislik analizleri ve pratik rehberler</p>
                      </div>
                    </div>

                    <div className="flex gap-4 p-5 bg-ai-surface-card rounded-xl border border-ai-surface-border">
                      <div className="w-12 h-12 rounded-lg bg-purple-500/10 flex items-center justify-center flex-shrink-0">
                        <span className="material-symbols-outlined text-purple-400 text-[24px]">notifications</span>
                      </div>
                      <div>
                        <h3 className="font-bold text-white mb-1">Küresel İçerik Kapsamı</h3>
                        <p className="text-sm text-ai-text-secondary">Farklı pazarlardan gelişmeleri daha geniş bir perspektifle sunma</p>
                      </div>
                    </div>

                    <div className="flex gap-4 p-5 bg-ai-surface-card rounded-xl border border-ai-surface-border">
                      <div className="w-12 h-12 rounded-lg bg-green-500/10 flex items-center justify-center flex-shrink-0">
                        <span className="material-symbols-outlined text-green-400 text-[24px]">podcasts</span>
                      </div>
                      <div>
                        <h3 className="font-bold text-white mb-1">Editoryal Kalite İyileştirmeleri</h3>
                        <p className="text-sm text-ai-text-secondary">Daha güçlü kaynak doğrulama ve içerik standardizasyonu</p>
                      </div>
                    </div>

                    <div className="flex gap-4 p-5 bg-ai-surface-card rounded-xl border border-ai-surface-border">
                      <div className="w-12 h-12 rounded-lg bg-yellow-500/10 flex items-center justify-center flex-shrink-0">
                        <span className="material-symbols-outlined text-yellow-400 text-[24px]">forum</span>
                      </div>
                      <div>
                        <h3 className="font-bold text-white mb-1">Topluluk Etkileşimi</h3>
                        <p className="text-sm text-ai-text-secondary">Geri bildirim ve katkılarla birlikte gelişen bağımsız yayıncılık</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Contact CTA */}
                <div className="bg-gradient-to-br from-ai-primary to-blue-700 rounded-2xl p-8 md:p-12 text-center relative overflow-hidden">
                  <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
                  <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-40 h-40 bg-white/10 rounded-full blur-2xl"></div>
                  <div className="relative z-10">
                    <h2 className="text-3xl font-bold text-white mb-4">İletişime Geçin</h2>
                    <p className="text-lg text-white/90 mb-8 max-w-xl mx-auto">
                      Görüş, öneri ve iş birlikleri için bize ulaşabilirsiniz. Topluluğumuzun her katkısı yayın kalitemizi güçlendiriyor.
                    </p>
                    <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 max-w-md mx-auto">
                      <p className="text-white mb-4">Bizimle iletişime geçmek için:</p>
                      <a
                        href="mailto:info@aihaberleri.org"
                        className="text-xl font-bold text-white hover:text-blue-200 transition-colors"
                      >
                        info@aihaberleri.org
                      </a>
                      <p className="text-sm text-white/70 mt-4">Sosyal medya kanallarımızdan da topluluğumuza katılabilirsiniz.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* CTA Section */}
          <section className="bg-gradient-to-r from-ai-primary via-blue-700 to-purple-700 text-white py-16">
            <div className="container mx-auto px-4 text-center">
              <h2 className="text-3xl font-bold mb-4">
                Geleceği Birlikte Takip Edelim
              </h2>
              <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
                Her gün güncel gelişmeler, her hafta daha derin analizler. AI dünyasını birlikte anlamlandıralım.
              </p>
              <Link
                href="/"
                className="inline-flex items-center gap-2 bg-white text-ai-primary px-8 py-4 rounded-full font-semibold text-lg hover:bg-white/90 transition-all hover:scale-105 shadow-xl"
              >
                Son Haberleri Keşfet
                <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
              </Link>
            </div>
          </section>
        </main>
      </div>
    </>
  );
}
