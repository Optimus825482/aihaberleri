import { Metadata } from "next";
import ContactForm from "@/components/ContactForm";

export const dynamic = "force-dynamic";

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
    description:
      "Sorularınız, önerileriniz veya işbirliği teklifleriniz için bize ulaşın.",
    url: "https://aihaberleri.org/contact",
    siteName: "AI Haberleri",
    locale: "tr_TR",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "İletişim | AI Haberleri",
    description:
      "Sorularınız, önerileriniz veya işbirliği teklifleriniz için bize ulaşın.",
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
        {/* Hero Section */}
        <div className="relative overflow-hidden py-12 md:py-20">
          <div className="container mx-auto px-4 max-w-6xl">
            <h1 className="text-4xl md:text-5xl font-black mb-4 text-white tracking-tight">
              Bize Ulaşın
            </h1>
            <p className="text-lg text-ai-text-secondary max-w-2xl leading-relaxed">
              AI Haberleri hakkında sorularınız, iş birlikleri veya geri
              bildirimleriniz için buradayız. Teknoloji dünyasındaki en son
              gelişmeleri birlikte şekillendirelim.
            </p>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="container mx-auto px-4 pb-16 max-w-6xl">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
            {/* Left Column: Contact Form */}
            <div className="lg:col-span-7">
              <div className="bg-ai-surface-card border border-ai-surface-border rounded-xl p-6 md:p-8">
                <h3 className="text-xl font-bold mb-6 flex items-center gap-2 text-white">
                  <span className="material-symbols-outlined text-ai-primary">
                    mail
                  </span>
                  Mesaj Gönderin
                </h3>
                <ContactForm />
              </div>
            </div>

            {/* Right Column: Info & Map */}
            <div className="lg:col-span-5 flex flex-col gap-6">
              {/* Contact Info Card */}
              <div className="bg-ai-surface-card border border-ai-surface-border rounded-xl p-6 md:p-8 flex flex-col gap-6">
                <div>
                  <h3 className="text-xl font-bold mb-1 text-white">
                    İletişim Bilgileri
                  </h3>
                  <p className="text-sm text-ai-text-secondary">
                    Doğrudan bize ulaşabileceğiniz kanallar.
                  </p>
                </div>

                <div className="space-y-5">
                  <div className="flex items-start gap-4">
                    <div className="bg-ai-surface-border p-2.5 rounded-lg text-ai-primary shrink-0">
                      <span className="material-symbols-outlined">
                        location_on
                      </span>
                    </div>
                    <div>
                      <p className="text-white font-medium mb-0.5">Adres</p>
                      <p className="text-sm text-ai-text-secondary leading-relaxed">
                        AI Haberleri Ltd. Şti.
                        <br />
                        Teknopark İstanbul, 34906 Pendik/İstanbul, Türkiye
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="bg-ai-surface-border p-2.5 rounded-lg text-ai-primary shrink-0">
                      <span className="material-symbols-outlined">mail</span>
                    </div>
                    <div>
                      <p className="text-white font-medium mb-0.5">E-posta</p>
                      <a
                        href="mailto:iletisim@aihaberleri.org"
                        className="text-sm text-ai-text-secondary hover:text-white transition-colors"
                      >
                        iletisim@aihaberleri.org
                      </a>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="bg-ai-surface-border p-2.5 rounded-lg text-ai-primary shrink-0">
                      <span className="material-symbols-outlined">call</span>
                    </div>
                    <div>
                      <p className="text-white font-medium mb-0.5">Telefon</p>
                      <a
                        href="tel:+902125550102"
                        className="text-sm text-ai-text-secondary hover:text-white transition-colors"
                      >
                        +90 212 555 01 02
                      </a>
                    </div>
                  </div>
                </div>

                {/* Map Placeholder */}
                <div className="w-full h-48 rounded-lg overflow-hidden relative border border-ai-surface-border mt-2">
                  <div className="absolute inset-0 bg-gray-800 flex items-center justify-center">
                    <div className="text-center">
                      <span className="material-symbols-outlined text-4xl text-ai-primary mb-2 block">
                        map
                      </span>
                      <p className="text-sm text-ai-text-secondary">
                        İstanbul, Türkiye
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Volunteer CTA Card */}
              <div className="relative overflow-hidden bg-gradient-to-br from-ai-primary to-blue-700 rounded-xl p-6 md:p-8 text-white">
                <div className="absolute top-0 right-0 -mt-4 -mr-4 opacity-10">
                  <span className="material-symbols-outlined text-[120px]">
                    volunteer_activism
                  </span>
                </div>
                <div className="relative z-10">
                  <h3 className="text-xl font-bold mb-2">
                    Gönüllü Ekibimize Katılın
                  </h3>
                  <p className="text-blue-100 text-sm mb-6 leading-relaxed">
                    Yapay zeka tutkunu gönüllü yazar, editör ve araştırmacılar
                    arıyoruz. Geleceği birlikte inşa edelim.
                  </p>
                  <a
                    href="mailto:gonullu@aihaberleri.org"
                    className="bg-white text-ai-primary hover:bg-blue-50 w-full py-2.5 rounded-lg text-sm font-bold transition-colors shadow-md flex items-center justify-center gap-2"
                  >
                    <span>Başvuru Formu</span>
                    <span className="material-symbols-outlined text-sm">
                      arrow_forward
                    </span>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
