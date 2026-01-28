import { Metadata } from "next";
import ContactForm from "@/components/ContactForm";

export const metadata: Metadata = {
  title: "İletişim - AI Haberleri",
  description:
    "Bizimle iletişime geçin. Sorularınız, önerileriniz veya işbirliği teklifleriniz için bize ulaşın.",
  alternates: {
    canonical: "/contact",
    languages: {
      tr: "/contact",
      en: "/en/contact",
    },
  },
};

export default function ContactPage() {
  return (
    <div className="container mx-auto px-4 py-12 max-w-4xl">
      <h1 className="text-4xl font-bold mb-4">İletişim</h1>
      <p className="text-lg text-gray-600 dark:text-gray-400 mb-8">
        Sorularınız, önerileriniz veya işbirliği teklifleriniz için aşağıdaki
        formu kullanarak bize ulaşabilirsiniz.
      </p>

      <div className="grid md:grid-cols-2 gap-12">
        {/* Contact Form */}
        <div>
          <h2 className="text-2xl font-semibold mb-6">Mesaj Gönderin</h2>
          <ContactForm />
        </div>

        {/* Contact Info */}
        <div>
          <h2 className="text-2xl font-semibold mb-6">İletişim Bilgileri</h2>

          <div className="space-y-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg
                  className="w-6 h-6 text-blue-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-lg">E-posta</h3>
                <a
                  href="mailto:iletisim@aihaberleri.org"
                  className="text-blue-600 hover:underline"
                >
                  iletisim@aihaberleri.org
                </a>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg
                  className="w-6 h-6 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-lg">Yanıt Süresi</h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Genellikle 24 saat içinde yanıtlıyoruz
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg
                  className="w-6 h-6 text-purple-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z"
                  />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-lg">Sosyal Medya</h3>
                <div className="flex gap-3 mt-2">
                  <a
                    href="https://twitter.com/aihaberleri"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-600 hover:text-blue-500"
                  >
                    Twitter/X
                  </a>
                  <a
                    href="https://linkedin.com/company/aihaberleri"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-600 hover:text-blue-700"
                  >
                    LinkedIn
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* FAQ Section */}
          <div className="mt-10 p-6 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
            <h3 className="font-semibold text-lg mb-4">Sık Sorulan Sorular</h3>
            <div className="space-y-4 text-sm">
              <div>
                <strong>
                  Reklam vermek istiyorum, nasıl iletişime geçebilirim?
                </strong>
                <p className="text-gray-600 dark:text-gray-400 mt-1">
                  Lütfen konu alanına &quot;Reklam&quot; yazarak formu doldurun
                  veya doğrudan e-posta gönderin.
                </p>
              </div>
              <div>
                <strong>Haber önerim var, paylaşabilir miyim?</strong>
                <p className="text-gray-600 dark:text-gray-400 mt-1">
                  Elbette! &quot;Haber Önerisi&quot; konusuyla bize
                  yazabilirsiniz.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
