import { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Hakkımızda | AI Haberleri - Yapay Zeka Haber Platformu",
  description:
    "AI Haberleri, Erkan ERDEM tarafından kurulan, yapay zeka dünyasındaki gelişmeleri Türkçe olarak sunan özgün ve güncel haber platformudur.",
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
  description: "Yapay zeka dünyasındaki gelişmeleri Türkçe olarak sunan özgün ve güncel haber platformu.",
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
    email: "iletisim@aihaberleri.org",
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
                  2024'ten Beri Hizmetinizdeyiz
                </div>
                <h1 className="text-4xl md:text-6xl font-black mb-6 text-white leading-tight tracking-tight">
                  Yapay Zeka Dünyasına Açılan Pencereniz
                </h1>
                <p className="text-xl text-white/90 leading-relaxed max-w-2xl mx-auto">
                  Teknolojinin en heyecan verici alanındaki gelişmeleri, sizin için özenle seçiyor ve Türkçe'ye kazandırıyoruz.
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
                    <h2 className="text-3xl font-bold text-white">Hikayemiz</h2>
                  </div>

                  <p className="text-lg text-ai-text-secondary leading-relaxed mb-6">
                    Yapay zeka, artık sadece bilim kurgu filmlerinin konusu değil. Her gün yeni bir gelişme, her hafta yeni bir atılım... Peki bunları takip etmek için onlarca farklı kaynağı mı kontrol etmeniz gerekiyor?
                  </p>

                  <p className="text-lg text-ai-text-secondary leading-relaxed mb-8">
                    İşte tam bu noktada devreye giriyoruz. <strong className="text-white">
                      <a
                        href="https://erkanerdem.net"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-ai-primary hover:text-ai-primary-hover transition-colors"
                      >
                        Erkan ERDEM
                      </a>
                    </strong> tarafından kurulan AI Haberleri, yapay zekanın ilk gündeme geldiği günlerden bu yana bu alandaki gelişmeleri yakından takip eden bir meraklının, "keşke böyle bir platform olsa" hayalinden doğdu.
                  </p>

                  {/* Quote Card */}
                  <div className="bg-gradient-to-br from-ai-primary/10 to-transparent border border-ai-primary/20 rounded-2xl p-8 my-12 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                      <span className="material-symbols-outlined text-[100px] text-ai-primary">format_quote</span>
                    </div>
                    <p className="text-xl italic text-white relative z-10 mb-4">
                      "Yapay zeka haberlerini takip etmek, bazen bir labirentte yol bulmaya benziyor. Bizim amacımız, bu labirenti sizin için aydınlatmak."
                    </p>
                    <p className="text-sm text-ai-text-secondary flex items-center gap-2 relative z-10">
                      <span className="w-8 h-px bg-ai-primary"></span>
                      Erkan ERDEM, Kurucu
                    </p>
                  </div>
                </div>

                {/* Why AI Haberleri Section */}
                <div className="mb-16">
                  <div className="flex items-center gap-3 mb-8">
                    <div className="w-12 h-12 rounded-xl bg-ai-primary/10 flex items-center justify-center">
                      <span className="material-symbols-outlined text-ai-primary text-[24px]">star</span>
                    </div>
                    <h2 className="text-3xl font-bold text-white">Neden AI Haberleri?</h2>
                  </div>

                  <p className="text-lg text-ai-text-secondary leading-relaxed mb-10">
                    Açıkçası, yapay zeka haberleri sunan onlarca site var. Ama çoğu ya tamamen İngilizce, ya çok teknik, ya da güncelliği tartışılır. Biz farklı bir yaklaşım benimsedik:
                  </p>

                  {/* Feature Cards Grid */}
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="bg-ai-surface-card border border-ai-surface-border rounded-xl p-6 hover:border-ai-primary/50 transition-colors group">
                      <div className="w-12 h-12 rounded-lg bg-blue-500/10 flex items-center justify-center mb-4 group-hover:bg-blue-500/20 transition-colors">
                        <span className="material-symbols-outlined text-blue-400 text-[24px]">public</span>
                      </div>
                      <h3 className="text-xl font-bold mb-2 text-white">Küresel Bakış Açısı</h3>
                      <p className="text-ai-text-secondary text-sm">
                        MIT Technology Review'dan TechCrunch'a, OpenAI Blog'undan DeepMind'a kadar dünya çapında 10'dan fazla prestijli kaynağı takip ediyoruz.
                      </p>
                    </div>

                    <div className="bg-ai-surface-card border border-ai-surface-border rounded-xl p-6 hover:border-ai-primary/50 transition-colors group">
                      <div className="w-12 h-12 rounded-lg bg-purple-500/10 flex items-center justify-center mb-4 group-hover:bg-purple-500/20 transition-colors">
                        <span className="material-symbols-outlined text-purple-400 text-[24px]">verified</span>
                      </div>
                      <h3 className="text-xl font-bold mb-2 text-white">Özenli Seçim</h3>
                      <p className="text-ai-text-secondary text-sm">
                        Yüzlerce haber arasından, gerçekten önemli ve dünya tarafından takip edilenleri derliyoruz. Spam yok, clickbait yok, sadece kaliteli içerik.
                      </p>
                    </div>

                    <div className="bg-ai-surface-card border border-ai-surface-border rounded-xl p-6 hover:border-ai-primary/50 transition-colors group">
                      <div className="w-12 h-12 rounded-lg bg-red-500/10 flex items-center justify-center mb-4 group-hover:bg-red-500/20 transition-colors">
                        <span className="material-symbols-outlined text-red-400 text-[24px]">translate</span>
                      </div>
                      <h3 className="text-xl font-bold mb-2 text-white">Türkçe ve Anlaşılır</h3>
                      <p className="text-ai-text-secondary text-sm">
                        Teknik terimleri, herkesin anlayabileceği bir dile çeviriyoruz. Çünkü yapay zeka, sadece mühendislerin değil, herkesin konusu.
                      </p>
                    </div>

                    <div className="bg-ai-surface-card border border-ai-surface-border rounded-xl p-6 hover:border-ai-primary/50 transition-colors group">
                      <div className="w-12 h-12 rounded-lg bg-yellow-500/10 flex items-center justify-center mb-4 group-hover:bg-yellow-500/20 transition-colors">
                        <span className="material-symbols-outlined text-yellow-400 text-[24px]">bolt</span>
                      </div>
                      <h3 className="text-xl font-bold mb-2 text-white">Hızlı ve Güncel</h3>
                      <p className="text-ai-text-secondary text-sm">
                        Yapay zeka dünyasındaki gelişmeleri en hızlı şekilde sizlere ulaştırıyoruz. Hiçbir önemli haberi kaçırmayın.
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
                      Her gün onlarca farklı ve prestijli kaynağı takip ediyoruz. MIT Technology Review, TechCrunch, The Verge, OpenAI Blog, DeepMind gibi dünya çapında tanınan platformlardan gelen yüzlerce haber arasından, gerçekten önemli olanları ve dünya tarafından takip edilenleri özenle derliyoruz.
                    </p>
                    <p className="text-lg text-ai-text-secondary leading-relaxed mb-6">
                      Seçtiğimiz haberleri, teknik terimlerden bağımsız, herkesin anlayabileceği bir dille yeniden yazıyoruz. Amacımız sadece çeviri yapmak değil, içeriği Türk okuyucular için anlaşılır ve akıcı hale getirmek.
                    </p>
                    <div className="bg-ai-surface-dark rounded-lg p-4 mt-6">
                      <p className="text-sm text-ai-text-secondary">
                        <span className="text-ai-primary font-semibold">Not:</span> Bu sürecin tamamı, kurucumuz <strong className="text-white">Erkan ERDEM</strong> ve AIHaberleri.org gönüllüleri tarafından titizlikle yürütülüyor.
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
                    Aslında bu sorunun cevabı oldukça geniş. Eğer siz de:
                  </p>

                  <div className="space-y-4">
                    {[
                      "Yapay zekanın geleceğini merak eden bir teknoloji meraklısıysanız,",
                      "İşinizde AI'ı kullanmayı düşünen bir profesyonelseniz,",
                      "Sektördeki gelişmeleri takip etmesi gereken bir girişimciyseniz,",
                      "Ya da sadece 'bu AI işi nereye gidiyor?' diye merak eden biriyseniz,",
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
                      Doğru yerdesiniz. Burada herkes için bir şeyler var.
                    </p>
                  </div>
                </div>

                {/* Future Plans Section */}
                <div className="mb-16">
                  <div className="flex items-center gap-3 mb-8">
                    <div className="w-12 h-12 rounded-xl bg-ai-primary/10 flex items-center justify-center">
                      <span className="material-symbols-outlined text-ai-primary text-[24px]">rocket_launch</span>
                    </div>
                    <h2 className="text-3xl font-bold text-white">Geleceğe Dair Planlarımız</h2>
                  </div>

                  <p className="text-lg text-ai-text-secondary leading-relaxed mb-8">
                    AI Haberleri, sürekli gelişen bir platform. Şu anda üzerinde çalıştığımız bazı özellikler:
                  </p>

                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="flex gap-4 p-5 bg-ai-surface-card rounded-xl border border-ai-surface-border">
                      <div className="w-12 h-12 rounded-lg bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                        <span className="material-symbols-outlined text-blue-400 text-[24px]">phone_iphone</span>
                      </div>
                      <div>
                        <h3 className="font-bold text-white mb-1">Mobil Uygulama</h3>
                        <p className="text-sm text-ai-text-secondary">Haberleri her yerden takip edebilmeniz için</p>
                      </div>
                    </div>

                    <div className="flex gap-4 p-5 bg-ai-surface-card rounded-xl border border-ai-surface-border">
                      <div className="w-12 h-12 rounded-lg bg-purple-500/10 flex items-center justify-center flex-shrink-0">
                        <span className="material-symbols-outlined text-purple-400 text-[24px]">notifications</span>
                      </div>
                      <div>
                        <h3 className="font-bold text-white mb-1">Kişiselleştirilmiş Bildirimler</h3>
                        <p className="text-sm text-ai-text-secondary">Sadece ilgilendiğiniz konularda haberdar olun</p>
                      </div>
                    </div>

                    <div className="flex gap-4 p-5 bg-ai-surface-card rounded-xl border border-ai-surface-border">
                      <div className="w-12 h-12 rounded-lg bg-green-500/10 flex items-center justify-center flex-shrink-0">
                        <span className="material-symbols-outlined text-green-400 text-[24px]">podcasts</span>
                      </div>
                      <div>
                        <h3 className="font-bold text-white mb-1">Podcast Serisi</h3>
                        <p className="text-sm text-ai-text-secondary">Haftanın öne çıkan haberlerini dinleyin</p>
                      </div>
                    </div>

                    <div className="flex gap-4 p-5 bg-ai-surface-card rounded-xl border border-ai-surface-border">
                      <div className="w-12 h-12 rounded-lg bg-yellow-500/10 flex items-center justify-center flex-shrink-0">
                        <span className="material-symbols-outlined text-yellow-400 text-[24px]">forum</span>
                      </div>
                      <div>
                        <h3 className="font-bold text-white mb-1">Topluluk Forumu</h3>
                        <p className="text-sm text-ai-text-secondary">Diğer AI meraklılarıyla tartışın</p>
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
                      Geri bildirimleriniz bizim için çok değerli. Bir öneriniz, eleştiriniz veya sadece merhaba demek istiyorsanız, kapımız her zaman açık.
                    </p>
                    <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 max-w-md mx-auto">
                      <p className="text-white mb-4">Bizimle iletişime geçmek için:</p>
                      <a
                        href="mailto:info@aihaberleri.org"
                        className="text-xl font-bold text-white hover:text-blue-200 transition-colors"
                      >
                        info@aihaberleri.org
                      </a>
                      <p className="text-sm text-white/70 mt-4">Genellikle 24 saat içinde yanıt veriyoruz.</p>
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
                Yapay Zeka Yolculuğuna Başlayın
              </h2>
              <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
                Her gün yeni haberler, her hafta yeni keşifler. Geleceği birlikte takip edelim.
              </p>
              <Link
                href="/"
                className="inline-flex items-center gap-2 bg-white text-ai-primary px-8 py-4 rounded-full font-semibold text-lg hover:bg-white/90 transition-all hover:scale-105 shadow-xl"
              >
                Haberleri Keşfet
                <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
              </Link>
            </div>
          </section>
        </main>
      </div>
    </>
  );
}
