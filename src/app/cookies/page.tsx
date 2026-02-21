import { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Çerez Politikası | AI Haberleri",
  description:
    "AI Haberleri çerez politikası. Zorunlu, analitik ve reklam çerezlerinin (Google AdSense dahil) nasıl kullanıldığını öğrenin.",
  robots: {
    index: true,
    follow: true,
  },
};

export default function CookiesPage() {
  return (
    <div className="min-h-screen bg-ai-background-dark">
      <main className="container mx-auto px-4 py-12 max-w-4xl">
        <h1 className="text-4xl font-bold text-white mb-6">Çerez Politikası</h1>
        <p className="text-ai-text-secondary mb-8">
          Son güncelleme: 22 Şubat 2026
        </p>

        <div className="space-y-8 text-ai-text-secondary leading-relaxed">
          <section>
            <h2 className="text-2xl font-bold text-white mb-3">1. Çerezleri neden kullanıyoruz?</h2>
            <p>
              Çerezleri sitenin temel fonksiyonları, trafik analizi ve reklam tercih yönetimi için kullanıyoruz.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-3">2. Çerez kategorileri</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong className="text-white">Zorunlu Çerezler:</strong> Güvenlik ve temel site işlevleri için gereklidir.
              </li>
              <li>
                <strong className="text-white">Analitik Çerezler:</strong> Ziyaret ve kullanım analizinde kullanılır.
              </li>
              <li>
                <strong className="text-white">Reklam Çerezleri:</strong> Reklam gösterimi ve kişiselleştirme için kullanılır; etkinse Google AdSense dahil olabilir.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-3">3. Tercihlerinizi yönetme</h2>
            <p>
              Çerez tercihlerinizi onay ekranından yönetebilirsiniz. Reklam çerezlerini reddetmeniz durumunda gösterilen reklamların kişiselleştirilmesi azalabilir.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
