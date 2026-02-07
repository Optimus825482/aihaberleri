import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Gizlilik Politikası | AI Haberleri",
  description:
    "AI Haberleri gizlilik politikası. Kişisel verilerinizin nasıl toplandığını, kullanıldığını ve korunduğunu öğrenin.",
  keywords: ["gizlilik politikası", "KVKK", "kişisel veri", "çerez politikası", "AI Haberleri"],
  alternates: {
    canonical: "https://aihaberleri.org/privacy",
    languages: {
      "tr-TR": "https://aihaberleri.org/privacy",
      "en-US": "https://aihaberleri.org/en/privacy",
    },
  },
  openGraph: {
    title: "Gizlilik Politikası | AI Haberleri",
    description: "AI Haberleri gizlilik politikası ve kişisel veri koruma uygulamaları.",
    url: "https://aihaberleri.org/privacy",
    siteName: "AI Haberleri",
    locale: "tr_TR",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Gizlilik Politikası | AI Haberleri",
    description: "AI Haberleri gizlilik politikası ve kişisel veri koruma uygulamaları.",
    site: "@AiHaberleri",
  },
  robots: {
    index: true,
    follow: true,
  },
};

// Force dynamic rendering to avoid SSR issues
export const dynamic = "force-dynamic";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen flex flex-col bg-ai-background-dark">
      <main className="flex-1 py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-4xl font-bold mb-8 text-white">Gizlilik Politikası</h1>

            <div className="prose prose-lg max-w-none prose-invert">
              <p className="text-ai-text-secondary mb-6">
                Son güncelleme:{" "}
                {new Date().toLocaleDateString("tr-TR", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>

              <section className="mb-8">
                <h2 className="text-2xl font-bold mb-4 text-white">1. Giriş</h2>
                <p className="text-ai-text-secondary leading-relaxed">
                  AI Haberleri olarak, kullanıcılarımızın gizliliğine saygı
                  duyuyoruz. Bu gizlilik politikası, web sitemizi ziyaret
                  ettiğinizde hangi bilgilerin toplandığını, nasıl
                  kullanıldığını ve korunduğunu açıklamaktadır.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-bold mb-4 text-white">
                  2. Toplanan Bilgiler
                </h2>

                <h3 className="text-xl font-semibold mb-3 mt-6 text-white">
                  2.1. Otomatik Olarak Toplanan Bilgiler
                </h3>
                <p className="text-ai-text-secondary leading-relaxed mb-4">
                  Web sitemizi ziyaret ettiğinizde, tarayıcınız otomatik olarak
                  bazı bilgileri paylaşır:
                </p>
                <ul className="list-disc pl-6 text-ai-text-secondary space-y-2">
                  <li>IP adresi</li>
                  <li>Tarayıcı türü ve versiyonu</li>
                  <li>İşletim sistemi</li>
                  <li>Ziyaret edilen sayfalar ve ziyaret süresi</li>
                  <li>Referans URL (sitemize nereden geldiğiniz)</li>
                </ul>

                <h3 className="text-xl font-semibold mb-3 mt-6 text-white">
                  2.2. Bülten Aboneliği
                </h3>
                <p className="text-ai-text-secondary leading-relaxed">
                  Bültenimize abone olduğunuzda, e-posta adresinizi topluyoruz.
                  Bu bilgi sadece size haber bülteni göndermek için kullanılır.
                </p>

                <h3 className="text-xl font-semibold mb-3 mt-6 text-white">
                  2.3. Bildirim İzinleri
                </h3>
                <p className="text-ai-text-secondary leading-relaxed">
                  Push bildirimlerine izin verdiğinizde, cihazınıza bildirim
                  göndermek için gerekli token bilgisi saklanır. Bu bilgi üçüncü
                  taraflarla paylaşılmaz.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-bold mb-4 text-white">
                  3. Bilgilerin Kullanımı
                </h2>
                <p className="text-ai-text-secondary leading-relaxed mb-4">
                  Topladığımız bilgileri şu amaçlarla kullanıyoruz:
                </p>
                <ul className="list-disc pl-6 text-ai-text-secondary space-y-2">
                  <li>Web sitesinin işlevselliğini sağlamak ve iyileştirmek</li>
                  <li>Kullanıcı deneyimini kişiselleştirmek</li>
                  <li>Bülten abonelerine haber göndermek</li>
                  <li>Push bildirimleri göndermek (izin verildiğinde)</li>
                  <li>
                    Site trafiğini analiz etmek ve istatistikler oluşturmak
                  </li>
                  <li>Teknik sorunları tespit etmek ve çözmek</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-bold mb-4 text-white">
                  4. Çerezler (Cookies)
                </h2>
                <p className="text-ai-text-secondary leading-relaxed mb-4">
                  Web sitemiz, kullanıcı deneyimini iyileştirmek için çerezler
                  kullanır:
                </p>

                <h3 className="text-xl font-semibold mb-3 mt-6 text-white">
                  4.1. Zorunlu Çerezler
                </h3>
                <p className="text-ai-text-secondary leading-relaxed">
                  Web sitesinin temel işlevlerini sağlamak için gereklidir. Bu
                  çerezler olmadan site düzgün çalışmaz.
                </p>

                <h3 className="text-xl font-semibold mb-3 mt-6 text-white">
                  4.2. Tercih Çerezleri
                </h3>
                <p className="text-ai-text-secondary leading-relaxed">
                  Dil tercihi, tema (açık/koyu mod) gibi ayarlarınızı hatırlar.
                </p>

                <h3 className="text-xl font-semibold mb-3 mt-6 text-white">
                  4.3. Analitik Çerezler
                </h3>
                <p className="text-ai-text-secondary leading-relaxed">
                  Site kullanımını analiz etmek ve iyileştirmeler yapmak için
                  kullanılır.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-bold mb-4 text-white">5. Bilgi Güvenliği</h2>
                <p className="text-ai-text-secondary leading-relaxed mb-4">
                  Kişisel bilgilerinizi korumak için endüstri standardı güvenlik
                  önlemleri alıyoruz:
                </p>
                <ul className="list-disc pl-6 text-ai-text-secondary space-y-2">
                  <li>SSL/TLS şifreleme ile güvenli veri iletimi</li>
                  <li>Güvenli sunucu altyapısı</li>
                  <li>Düzenli güvenlik güncellemeleri</li>
                  <li>Sınırlı erişim kontrolleri</li>
                  <li>Veri yedekleme sistemleri</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-bold mb-4 text-white">
                  6. Üçüncü Taraf Hizmetler
                </h2>
                <p className="text-ai-text-secondary leading-relaxed mb-4">
                  Web sitemiz aşağıdaki üçüncü taraf hizmetleri kullanabilir:
                </p>
                <ul className="list-disc pl-6 text-ai-text-secondary space-y-2">
                  <li>
                    <strong className="text-white">Firebase Cloud Messaging:</strong> Push bildirimleri
                    için
                  </li>
                  <li>
                    <strong>Vercel Analytics:</strong> Site performansı ve
                    kullanım istatistikleri için
                  </li>
                </ul>
                <p className="text-ai-text-secondary leading-relaxed mt-4">
                  Bu hizmetlerin kendi gizlilik politikaları vardır ve bu
                  politikalar tarafından yönetilirler.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-bold mb-4 text-white">
                  7. Kullanıcı Hakları
                </h2>
                <p className="text-ai-text-secondary leading-relaxed mb-4">
                  KVKK (Kişisel Verilerin Korunması Kanunu) kapsamında aşağıdaki
                  haklara sahipsiniz:
                </p>
                <ul className="list-disc pl-6 text-ai-text-secondary space-y-2">
                  <li>Kişisel verilerinizin işlenip işlenmediğini öğrenme</li>
                  <li>İşlenmişse buna ilişkin bilgi talep etme</li>
                  <li>
                    İşlenme amacını ve amacına uygun kullanılıp kullanılmadığını
                    öğrenme
                  </li>
                  <li>
                    Yurt içinde veya yurt dışında aktarıldığı üçüncü kişileri
                    bilme
                  </li>
                  <li>Eksik veya yanlış işlenmişse düzeltilmesini isteme</li>
                  <li>Verilerin silinmesini veya yok edilmesini isteme</li>
                  <li>Bülten aboneliğinden çıkma</li>
                  <li>Push bildirimlerini devre dışı bırakma</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-bold mb-4 text-white">
                  8. Çocukların Gizliliği
                </h2>
                <p className="text-ai-text-secondary leading-relaxed">
                  Web sitemiz 13 yaşın altındaki çocuklardan bilerek kişisel
                  bilgi toplamaz. Eğer 13 yaşından küçükseniz, lütfen ebeveyn
                  veya vasinizin izni olmadan kişisel bilgi paylaşmayın.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-bold mb-4 text-white">
                  9. Veri Saklama Süresi
                </h2>
                <p className="text-ai-text-secondary leading-relaxed">
                  Kişisel verileriniz, toplama amacı için gerekli olan süre
                  boyunca saklanır:
                </p>
                <ul className="list-disc pl-6 text-ai-text-secondary space-y-2 mt-4">
                  <li>
                    <strong className="text-white">Bülten e-postaları:</strong> Abonelikten çıkana
                    kadar
                  </li>
                  <li>
                    <strong className="text-white">Push bildirim token'ları:</strong> İzin iptal
                    edilene kadar
                  </li>
                  <li>
                    <strong className="text-white">Log kayıtları:</strong> Maksimum 90 gün
                  </li>
                  <li>
                    <strong className="text-white">Analitik veriler:</strong> Anonim hale getirilerek 2
                    yıl
                  </li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-bold mb-4 text-white">
                  10. Politika Değişiklikleri
                </h2>
                <p className="text-ai-text-secondary leading-relaxed">
                  Bu gizlilik politikasını zaman zaman güncelleyebiliriz. Önemli
                  değişiklikler olduğunda, web sitemizde duyuru yapacağız.
                  Politikayı düzenli olarak gözden geçirmenizi öneririz.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-bold mb-4 text-white">11. İletişim</h2>
                <p className="text-ai-text-secondary leading-relaxed mb-4">
                  Gizlilik politikamız hakkında sorularınız veya talepleriniz
                  için bizimle iletişime geçebilirsiniz:
                </p>
                <div className="bg-ai-surface-card border border-ai-surface-border rounded-xl p-6">
                  <p className="text-ai-text-secondary mb-2">
                    <strong className="text-white">E-posta:</strong>{" "}
                    <a
                      href="mailto:privacy@aihaberleri.org"
                      className="text-ai-primary hover:underline"
                    >
                      privacy@aihaberleri.org
                    </a>
                  </p>
                  <p className="text-ai-text-secondary">
                    <strong className="text-white">Genel İletişim:</strong>{" "}
                    <a
                      href="mailto:info@aihaberleri.org"
                      className="text-ai-primary hover:underline"
                    >
                      info@aihaberleri.org
                    </a>
                  </p>
                </div>
              </section>

              <div className="bg-ai-surface-card border-l-4 border-ai-primary p-6 rounded-r-xl mt-8">
                <p className="text-sm text-ai-text-secondary">
                  Bu gizlilik politikası, Türkiye Cumhuriyeti Kişisel Verilerin
                  Korunması Kanunu (KVKK) ve Avrupa Birliği Genel Veri Koruma
                  Yönetmeliği (GDPR) ile uyumlu olarak hazırlanmıştır.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
