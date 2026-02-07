import { Metadata } from "next";
import ContactForm from "@/components/ContactForm";

export const metadata: Metadata = {
  title: "İletişim | AI Haberleri - Bize Ulaşın",
  description:
    "AI Haberleri ile iletişime geçin. Sorularınız, önerileriniz veya işbirliği teklifleriniz için 24 saat içinde yanıt alın.",
  keywords: ["iletişim", "AI Haberleri", "bize ulaşın", "destek", "işbirliği"],
  alternates: {
    canonical: "https://aihaberleri.org/contact",
    languages: {
      "tr-TR": "https://aihaberleri.org/contact",
      "en-US": "https://aihaberleri.org/en/contact",
    },
  },
  openGraph: {
    title: "İletişim | AI Haberleri",
    description: "Sorularınız, önerileriniz veya işbirliği teklifleriniz için bize ulaşın.",
    url: "https://aihaberleri.org/contact",
    siteName: "AI Haberleri",
    locale: "tr_TR",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "İletişim | AI Haberleri",
    description: "Sorularınız, önerileriniz veya işbirliği teklifleriniz için bize ulaşın.",
    site: "@AiHaberleri",
  },
};

// ContactPage Schema JSON-LD
const contactPageSchema = {
  "@context": "https://schema.org",
  "@type": "ContactPage",
  name: "AI Haberleri İletişim",
  description: "AI Haberleri ile iletişime geçin",
  url: "https://aihaberleri.org/contact",
  mainEntity: {
    "@type": "Organization",
    name: "AI Haberleri",
    url: "https://aihaberleri.org",
    email: "iletisim@aihaberleri.org",
    contactPoint: {
      "@type": "ContactPoint",
      email: "iletisim@aihaberleri.org",
      contactType: "customer service",
      availableLanguage: ["Turkish", "English"],
    },
  },
};

export default function ContactPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(contactPageSchema) }}
      />
      <div className="min-h-screen bg-ai-background-dark">
        <div className="container mx-auto px-4 py-12 max-w-4xl">
          <h1 className="text-4xl font-bold mb-4 text-white">İletişim</h1>
          <p className="text-lg text-ai-text-secondary mb-8">
            Sorularınız, önerileriniz veya işbirliği teklifleriniz için aşağıdaki
            formu kullanarak bize ulaşabilirsiniz.
          </p>

          <div className="grid md:grid-cols-2 gap-12">
            {/* Contact Form */}
            <div>
              <h2 className="text-2xl font-semibold mb-6 text-white">Mesaj Gönderin</h2>
              <ContactForm />
            </div>

            {/* Contact Info */}
            <div>
              <h2 className="text-2xl font-semibold mb-6 text-white">İletişim Bilgileri</h2>

              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-ai-surface-card border border-ai-surface-border rounded-xl flex items-center justify-center flex-shrink-0">
                    <span className="material-symbols-outlined text-[24px] text-ai-primary">mail</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg text-white">E-posta</h3>
                    <a
                      href="mailto:iletisim@aihaberleri.org"
                      className="text-ai-primary hover:text-ai-primary-hover transition-colors"
                    >
                      iletisim@aihaberleri.org
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-ai-surface-card border border-ai-surface-border rounded-xl flex items-center justify-center flex-shrink-0">
                    <span className="material-symbols-outlined text-[24px] text-ai-primary">schedule</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg text-white">Yanıt Süresi</h3>
                    <p className="text-ai-text-secondary">
                      Genellikle 24 saat içinde yanıtlıyoruz
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-ai-surface-card border border-ai-surface-border rounded-xl flex items-center justify-center flex-shrink-0">
                    <span className="material-symbols-outlined text-[24px] text-ai-primary">share</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg text-white">Sosyal Medya</h3>
                    <div className="flex flex-wrap gap-3 mt-2">
                      <a
                        href="https://twitter.com/aihaberleri"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-ai-text-secondary hover:text-ai-primary transition-colors"
                      >
                        Twitter/X
                      </a>
                      <a
                        href="https://bsky.app/profile/aihaberleri.bsky.social"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-ai-text-secondary hover:text-ai-primary transition-colors"
                      >
                        Bluesky
                      </a>
                      <a
                        href="https://mastodon.social/@aihaberleri"
                        target="_blank"
                        rel="noopener noreferrer me"
                        className="text-ai-text-secondary hover:text-ai-primary transition-colors"
                      >
                        Mastodon
                      </a>
                      <a
                        href="https://aihaberleri-org.tumblr.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-ai-text-secondary hover:text-ai-primary transition-colors"
                      >
                        Tumblr
                      </a>
                      <a
                        href="https://linkedin.com/company/aihaberleri"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-ai-text-secondary hover:text-ai-primary transition-colors"
                      >
                        LinkedIn
                      </a>
                    </div>
                  </div>
                </div>
              </div>

              {/* FAQ Section */}
              <div className="mt-10 p-6 bg-ai-surface-card border border-ai-surface-border rounded-xl">
                <h3 className="font-semibold text-lg mb-4 text-white">Sık Sorulan Sorular</h3>
                <div className="space-y-4 text-sm">
                  <div>
                    <strong className="text-white">
                      Reklam vermek istiyorum, nasıl iletişime geçebilirim?
                    </strong>
                    <p className="text-ai-text-secondary mt-1">
                      Lütfen konu alanına &quot;Reklam&quot; yazarak formu doldurun
                      veya doğrudan e-posta gönderin.
                    </p>
                  </div>
                  <div>
                    <strong className="text-white">Haber önerim var, paylaşabilir miyim?</strong>
                    <p className="text-ai-text-secondary mt-1">
                      Elbette! &quot;Haber Önerisi&quot; konusuyla bize
                      yazabilirsiniz.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
