import { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Gizlilik ve Hizmet Şartları | AI Haberleri",
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
    title: "Gizlilik ve Hizmet Şartları | AI Haberleri",
    description: "AI Haberleri gizlilik politikası ve kişisel veri koruma uygulamaları.",
    url: "https://aihaberleri.org/privacy",
    siteName: "AI Haberleri",
    locale: "tr_TR",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Gizlilik ve Hizmet Şartları | AI Haberleri",
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
      <main className="flex-grow">
        <div className="max-w-6xl mx-auto px-4 py-12">
          {/* Page Header */}
          <div className="mb-12">
            <div className="flex items-center gap-2 text-ai-primary font-medium text-sm mb-4">
              <span className="material-symbols-outlined text-[18px]">verified_user</span>
              <span>Yasal Merkez</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-4 text-white">
              Gizlilik ve Hizmet Şartları
            </h1>
            <p className="text-lg text-ai-text-secondary leading-relaxed max-w-3xl">
              AI Haberleri platformunu kullanırken haklarınızı ve sorumluluklarınızı anlamanız bizim için önemlidir.
              Şeffaflık ilkemiz gereği tüm detayları aşağıda bulabilirsiniz.
            </p>
            <div className="mt-6 inline-flex items-center gap-2 text-sm text-ai-text-secondary bg-ai-surface-card px-4 py-2 rounded-full border border-ai-surface-border">
              <span className="material-symbols-outlined text-[16px]">schedule</span>
              Son Güncelleme: {new Date().toLocaleDateString("tr-TR", { year: "numeric", month: "long", day: "numeric" })}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
            {/* Sidebar Navigation */}
            <aside className="hidden lg:block lg:col-span-3">
              <nav className="sticky top-28 space-y-1">
                <p className="px-3 text-xs font-bold text-ai-text-muted uppercase tracking-wider mb-4">İçindekiler</p>
                {[
                  { id: "giris", title: "1. Giriş" },
                  { id: "veri", title: "2. Toplanan Veriler" },
                  { id: "ai", title: "3. AI ve Model Eğitimi" },
                  { id: "cerez", title: "4. Çerez Politikası" },
                  { id: "haklar", title: "5. Kullanıcı Hakları" },
                  { id: "iletisim", title: "6. İletişim" },
                ].map((item) => (
                  <a
                    key={item.id}
                    href={`#${item.id}`}
                    className="group flex items-center px-3 py-2 text-sm font-medium text-ai-text-secondary hover:text-white hover:bg-ai-surface-card rounded-lg transition-colors"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-transparent group-hover:bg-ai-primary mr-3 transition-colors"></span>
                    {item.title}
                  </a>
                ))}
              </nav>
            </aside>

            {/* Content Area */}
            <div className="col-span-1 lg:col-span-9 space-y-16">
              {/* Section 1: Introduction */}
              <section className="scroll-mt-28" id="giris">
                <div className="flex items-center gap-4 mb-6">
                  <span className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900 text-ai-primary font-bold text-lg">1</span>
                  <h2 className="text-2xl font-bold text-white m-0">Giriş</h2>
                </div>
                <div className="bg-ai-surface-card p-8 rounded-xl border border-ai-surface-border">
                  <p className="text-ai-text-secondary leading-relaxed mb-4">
                    AI Haberleri (&quot;Şirket&quot;, &quot;Biz&quot;), gizliliğinize büyük önem vermektedir. Bu Gizlilik Politikası, web sitemizi ziyaret ettiğinizde veya hizmetlerimizi kullandığınızda kişisel verilerinizin nasıl toplandığını, kullanıldığını ve korunduğunu açıklamaktadır.
                  </p>
                  <p className="text-ai-text-secondary leading-relaxed">
                    Hizmetlerimizi kullanarak, bu politikada belirtilen uygulamaları kabul etmiş sayılırsınız. Bu politika, 6698 sayılı Kişisel Verilerin Korunması Kanunu (KVKK) ve Avrupa Genel Veri Koruma Tüzüğü (GDPR) standartlarına uygun olarak hazırlanmıştır.
                  </p>
                </div>
              </section>

              {/* Section 2: Data Collection */}
              <section className="scroll-mt-28" id="veri">
                <div className="flex items-center gap-4 mb-6">
                  <span className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900 text-ai-primary font-bold text-lg">2</span>
                  <h2 className="text-2xl font-bold text-white m-0">Toplanan Veriler</h2>
                </div>
                <div className="grid md:grid-cols-2 gap-6 mb-8">
                  <div className="bg-ai-surface-card p-6 rounded-xl border border-ai-surface-border">
                    <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center text-green-400 mb-4">
                      <span className="material-symbols-outlined">person</span>
                    </div>
                    <h3 className="text-lg font-bold text-white mb-2">Kişisel Bilgiler</h3>
                    <p className="text-sm text-ai-text-secondary">
                      Ad, soyad, e-posta adresi ve hesap oluştururken sağladığınız diğer iletişim bilgileri.
                    </p>
                  </div>
                  <div className="bg-ai-surface-card p-6 rounded-xl border border-ai-surface-border">
                    <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-400 mb-4">
                      <span className="material-symbols-outlined">query_stats</span>
                    </div>
                    <h3 className="text-lg font-bold text-white mb-2">Kullanım Verileri</h3>
                    <p className="text-sm text-ai-text-secondary">
                      IP adresi, tarayıcı türü, ziyaret edilen sayfalar ve platform üzerindeki etkileşim süreleri.
                    </p>
                  </div>
                </div>
                <p className="text-ai-text-secondary leading-relaxed">
                  Topladığımız veriler, size kişiselleştirilmiş bir AI haber deneyimi sunmak, teknik sorunları gidermek ve platform güvenliğini sağlamak amacıyla işlenmektedir.
                </p>
              </section>

              {/* Section 3: AI Transparency */}
              <section className="scroll-mt-28" id="ai">
                <div className="flex items-center gap-4 mb-6">
                  <span className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900 text-ai-primary font-bold text-lg">3</span>
                  <h2 className="text-2xl font-bold text-white m-0">AI ve Model Eğitimi</h2>
                </div>
                <div className="bg-ai-primary/5 border border-ai-primary/20 rounded-xl p-6">
                  <div className="flex gap-4">
                    <div className="shrink-0">
                      <span className="material-symbols-outlined text-ai-primary text-3xl">psychology</span>
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white mb-2">AI Şeffaflık Beyanı</h3>
                      <p className="text-ai-text-secondary text-sm mb-4">
                        AI Haberleri olarak yapay zeka teknolojilerini içerik önerme ve özetleme amacıyla kullanmaktayız. Ancak, kişisel verileriniz (özel mesajlar, profil detayları) üçüncü taraf <strong className="text-white">Genel Yapay Zeka (LLM) modellerinin eğitimi için kullanılmaz veya satılmaz.</strong>
                      </p>
                      <ul className="space-y-2 text-sm text-ai-text-secondary">
                        <li className="flex items-start gap-2">
                          <span className="material-symbols-outlined text-green-400 text-[18px] mt-0.5">check_circle</span>
                          Okuma alışkanlıklarınız sadece size özel öneri algoritmamızda kullanılır.
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="material-symbols-outlined text-green-400 text-[18px] mt-0.5">check_circle</span>
                          Verileriniz anonimleştirilerek trend analizlerinde kullanılabilir.
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              </section>

              {/* Section 4: Cookies */}
              <section className="scroll-mt-28" id="cerez">
                <div className="flex items-center gap-4 mb-6">
                  <span className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900 text-ai-primary font-bold text-lg">4</span>
                  <h2 className="text-2xl font-bold text-white m-0">Çerez Politikası</h2>
                </div>
                <div className="bg-ai-surface-card rounded-xl border border-ai-surface-border overflow-hidden">
                  {[
                    {
                      title: "Zorunlu Çerezler",
                      icon: "cookie",
                      desc: "Web sitesinin düzgün çalışması için gereklidir. Oturum açma durumu, güvenlik tercihleri ve temel site fonksiyonlarını içerir. Bu çerezler kapatılamaz.",
                      open: true,
                    },
                    {
                      title: "Analitik Çerezler",
                      icon: "analytics",
                      desc: "Ziyaretçi sayısını ve trafik kaynaklarını saymamıza olanak tanır. Hangi sayfaların en popüler olduğunu görmemize yardımcı olur. Tüm bilgiler anonim olarak toplanır.",
                      open: false,
                    },
                    {
                      title: "Pazarlama Çerezler",
                      icon: "ads_click",
                      desc: "Reklam ortaklarımız tarafından ilgi alanlarınıza göre profil oluşturmak ve alakalı reklamlar göstermek için kullanılabilir. Bu kapsamda Google AdSense benzeri reklam sağlayıcıları devreye girebilir.",
                      open: false,
                    },
                  ].map((item, index) => (
                    <details key={index} className="group p-4 border-b border-ai-surface-border last:border-b-0" open={item.open}>
                      <summary className="flex cursor-pointer items-center justify-between font-medium text-white hover:text-ai-primary">
                        <div className="flex items-center gap-3">
                          <span className="material-symbols-outlined text-ai-text-muted">{item.icon}</span>
                          <span>{item.title}</span>
                        </div>
                        <span className="transition group-open:rotate-180">
                          <span className="material-symbols-outlined">expand_more</span>
                        </span>
                      </summary>
                      <div className="mt-4 text-sm text-ai-text-secondary pl-9">
                        {item.desc}
                      </div>
                    </details>
                  ))}
                </div>
                <p className="text-sm text-ai-text-secondary mt-4">
                  Reklam ve analitik çerezleri için onay tercihinizi çerez banner'ı üzerinden yönetebilirsiniz.
                  Zorunlu çerezler güvenlik ve temel işlevler için her zaman aktiftir.
                </p>
              </section>

              {/* Section 5: User Rights */}
              <section className="scroll-mt-28" id="haklar">
                <div className="flex items-center gap-4 mb-6">
                  <span className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900 text-ai-primary font-bold text-lg">5</span>
                  <h2 className="text-2xl font-bold text-white m-0">Kullanıcı Hakları</h2>
                </div>
                <p className="text-ai-text-secondary leading-relaxed mb-6">
                  KVKK ve GDPR kapsamında aşağıdaki haklara sahipsiniz:
                </p>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="flex gap-3 p-4 rounded-lg bg-ai-surface-card border border-ai-surface-border">
                    <span className="material-symbols-outlined text-ai-primary">visibility</span>
                    <div>
                      <h4 className="font-bold text-white text-sm">Erişim Hakkı</h4>
                      <p className="text-xs text-ai-text-muted mt-1">Verilerinizin bir kopyasını talep etme.</p>
                    </div>
                  </div>
                  <div className="flex gap-3 p-4 rounded-lg bg-ai-surface-card border border-ai-surface-border">
                    <span className="material-symbols-outlined text-ai-primary">edit</span>
                    <div>
                      <h4 className="font-bold text-white text-sm">Düzeltme Hakkı</h4>
                      <p className="text-xs text-ai-text-muted mt-1">Yanlış veya eksik bilgileri güncelleme.</p>
                    </div>
                  </div>
                  <div className="flex gap-3 p-4 rounded-lg bg-ai-surface-card border border-ai-surface-border">
                    <span className="material-symbols-outlined text-ai-primary">delete</span>
                    <div>
                      <h4 className="font-bold text-white text-sm">Silme Hakkı</h4>
                      <p className="text-xs text-ai-text-muted mt-1">Hesabınızı ve verilerinizi kalıcı olarak silme.</p>
                    </div>
                  </div>
                  <div className="flex gap-3 p-4 rounded-lg bg-ai-surface-card border border-ai-surface-border">
                    <span className="material-symbols-outlined text-ai-primary">output</span>
                    <div>
                      <h4 className="font-bold text-white text-sm">Taşınabilirlik</h4>
                      <p className="text-xs text-ai-text-muted mt-1">Verilerinizi başka bir servise aktarma.</p>
                    </div>
                  </div>
                </div>
              </section>

              {/* Section 6: Contact */}
              <section className="scroll-mt-28" id="iletisim">
                <div className="flex items-center gap-4 mb-6">
                  <span className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900 text-ai-primary font-bold text-lg">6</span>
                  <h2 className="text-2xl font-bold text-white m-0">İletişim</h2>
                </div>
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-ai-primary to-blue-700 p-8 md:p-10 text-white">
                  <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 rounded-full bg-white/10 blur-3xl"></div>
                  <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-40 h-40 rounded-full bg-white/10 blur-2xl"></div>
                  <div className="relative z-10">
                    <h3 className="text-xl md:text-2xl font-bold mb-4">Sorularınız mı var?</h3>
                    <p className="text-blue-100 mb-8 max-w-xl">
                      Gizlilik politikamız veya verilerinizin işlenmesi hakkında herhangi bir sorunuz varsa, Veri Koruma Görevlimiz (DPO) ile iletişime geçmekten çekinmeyin.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4">
                      <a
                        href="mailto:hukuk@aihaberleri.com"
                        className="flex items-center justify-center gap-2 bg-white hover:bg-blue-50 text-ai-primary font-bold py-3 px-6 rounded-lg transition-colors"
                      >
                        <span className="material-symbols-outlined text-[20px]">mail</span>
                        hukuk@aihaberleri.com
                      </a>
                      <Link
                        href="/contact"
                        className="flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 text-white font-medium py-3 px-6 rounded-lg backdrop-blur-sm transition-colors border border-white/10"
                      >
                        <span className="material-symbols-outlined text-[20px]">help</span>
                        Yardım Merkezi
                      </Link>
                    </div>
                    <div className="mt-8 pt-6 border-t border-white/10 flex flex-col sm:flex-row justify-between gap-4 text-sm text-blue-100">
                      <div>
                        <p className="font-medium text-white mb-1">Adres:</p>
                        <p>AI Haberleri Ltd. Şti.<br/>Teknopark İstanbul, 34906 Pendik/İstanbul</p>
                      </div>
                      <div className="sm:text-right">
                        <p className="font-medium text-white mb-1">Telefon:</p>
                        <p>+90 (216) 555 0123</p>
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
