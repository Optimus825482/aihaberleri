export const metadata = {
  title: "Hakkımızda | AI Haberleri",
  description:
    "Yapay zeka dünyasındaki gelişmeleri yakından takip edenler için oluşturulmuş, özgün ve güncel haber platformu.",
};

// Force dynamic rendering to avoid SSR issues
export const dynamic = "force-dynamic";

export default function AboutPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-1">
        {/* Hero Section */}
        <section className="bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 text-white py-20">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto text-center">
              <h1 className="text-4xl md:text-5xl font-bold mb-6">
                Yapay Zeka Dünyasına Açılan Pencereniz
              </h1>
              <p className="text-xl text-white/90 leading-relaxed">
                Teknolojinin en heyecan verici alanındaki gelişmeleri, sizin
                için özenle seçiyor ve Türkçe'ye kazandırıyoruz.
              </p>
            </div>
          </div>
        </section>

        {/* Main Content */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              {/* Story Section */}
              <div className="prose prose-lg max-w-none mb-12">
                <h2 className="text-3xl font-bold mb-6">Hikayemiz</h2>

                <p className="text-lg text-muted-foreground leading-relaxed mb-6">
                  Yapay zeka, artık sadece bilim kurgu filmlerinin konusu değil.
                  Her gün yeni bir gelişme, her hafta yeni bir atılım... Peki
                  bunları takip etmek için onlarca farklı kaynağı mı kontrol
                  etmeniz gerekiyor?
                </p>

                <p className="text-lg text-muted-foreground leading-relaxed mb-6">
                  İşte tam bu noktada devreye giriyoruz.{" "}
                  <strong>
                    <a
                      href="https://erkanerdem.net"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      Erkan ERDEM
                    </a>
                  </strong>{" "}
                  tarafından kurulan AI Haberleri, yapay zekanın ilk gündeme
                  geldiği günlerden bu yana bu alandaki gelişmeleri yakından
                  takip eden bir meraklının, "keşke böyle bir platform olsa"
                  hayalinden doğdu.
                </p>

                <div className="bg-blue-50 dark:bg-blue-950 border-l-4 border-blue-600 p-6 my-8 rounded-r-lg">
                  <p className="text-lg italic">
                    "Yapay zeka haberlerini takip etmek, bazen bir labirentte
                    yol bulmaya benziyor. Bizim amacımız, bu labirenti sizin
                    için aydınlatmak."
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    — Erkan ERDEM, Kurucu
                  </p>
                </div>

                <h2 className="text-3xl font-bold mb-6 mt-12">
                  Neden AI Haberleri?
                </h2>

                <p className="text-lg text-muted-foreground leading-relaxed mb-6">
                  Açıkçası, yapay zeka haberleri sunan onlarca site var. Ama
                  çoğu ya tamamen İngilizce, ya çok teknik, ya da güncelliği
                  tartışılır. Biz farklı bir yaklaşım benimsedik:
                </p>

                <div className="grid md:grid-cols-2 gap-6 my-8">
                  <div className="bg-card border rounded-lg p-6">
                    <div className="text-3xl mb-3">🌍</div>
                    <h3 className="text-xl font-bold mb-2">
                      Küresel Bakış Açısı
                    </h3>
                    <p className="text-muted-foreground">
                      MIT Technology Review'dan TechCrunch'a, OpenAI Blog'undan
                      DeepMind'a kadar dünya çapında 10'dan fazla prestijli
                      kaynağı takip ediyoruz.
                    </p>
                  </div>

                  <div className="bg-card border rounded-lg p-6">
                    <div className="text-3xl mb-3">🎯</div>
                    <h3 className="text-xl font-bold mb-2">Özenli Seçim</h3>
                    <p className="text-muted-foreground">
                      Yüzlerce haber arasından, gerçekten önemli ve dünya
                      tarafından takip edilenleri derliyoruz. Spam yok,
                      clickbait yok, sadece kaliteli içerik.
                    </p>
                  </div>

                  <div className="bg-card border rounded-lg p-6">
                    <div className="text-3xl mb-3">🇹🇷</div>
                    <h3 className="text-xl font-bold mb-2">
                      Türkçe ve Anlaşılır
                    </h3>
                    <p className="text-muted-foreground">
                      Teknik terimleri, herkesin anlayabileceği bir dile
                      çeviriyoruz. Çünkü yapay zeka, sadece mühendislerin değil,
                      herkesin konusu.
                    </p>
                  </div>

                  <div className="bg-card border rounded-lg p-6">
                    <div className="text-3xl mb-3">⚡</div>
                    <h3 className="text-xl font-bold mb-2">Hızlı ve Güncel</h3>
                    <p className="text-muted-foreground">
                      Yapay zeka dünyasındaki gelişmeleri en hızlı şekilde
                      sizlere ulaştırıyoruz. Hiçbir önemli haberi kaçırmayın.
                    </p>
                  </div>
                </div>

                <h2 className="text-3xl font-bold mb-6 mt-12">
                  Haberler Size Nasıl Ulaşıyor?
                </h2>

                <p className="text-lg text-muted-foreground leading-relaxed mb-6">
                  Her gün onlarca farklı ve prestijli kaynağı takip ediyoruz.
                  MIT Technology Review, TechCrunch, The Verge, OpenAI Blog,
                  DeepMind gibi dünya çapında tanınan platformlardan gelen
                  yüzlerce haber arasından, gerçekten önemli olanları ve dünya
                  tarafından takip edilenleri özenle derliyoruz.
                </p>

                <p className="text-lg text-muted-foreground leading-relaxed mb-6">
                  Seçtiğimiz haberleri, teknik terimlerden bağımsız, herkesin
                  anlayabileceği bir dille yeniden yazıyoruz. Amacımız sadece
                  çeviri yapmak değil, içeriği Türk okuyucular için anlaşılır ve
                  akıcı hale getirmek. Her haber, yayınlanmadan önce son bir kez
                  kontrol ediliyor ve ancak o zaman sizlerle buluşuyor.
                </p>

                <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950 rounded-lg p-6 my-8">
                  <p className="text-lg font-semibold mb-3">
                    Bu sürecin tamamı, kurucumuz <strong>Erkan ERDEM</strong> ve
                    AIHaberleri.org gönüllüleri tarafından titizlikle
                    yürütülüyor.
                  </p>
                  <p className="text-muted-foreground">
                    Güncelleme sıklığımız tamamen o günkü haber trafiğine bağlı.
                    Bazen günde birkaç kez, bazen daha seyrek... Önemli olan,
                    kaliteli ve değerli içeriği sizlere ulaştırmak.
                  </p>
                </div>

                <h2 className="text-3xl font-bold mb-6 mt-12">
                  Kime Hitap Ediyoruz?
                </h2>

                <p className="text-lg text-muted-foreground leading-relaxed mb-6">
                  Aslında bu sorunun cevabı oldukça geniş. Eğer siz de:
                </p>

                <ul className="space-y-3 text-lg text-muted-foreground mb-6">
                  <li className="flex items-start gap-3">
                    <span className="text-blue-600 mt-1">✓</span>
                    <span>
                      Yapay zekanın geleceğini merak eden bir teknoloji
                      meraklısıysanız,
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-blue-600 mt-1">✓</span>
                    <span>
                      İşinizde AI'ı kullanmayı düşünen bir profesyonelseniz,
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-blue-600 mt-1">✓</span>
                    <span>
                      Sektördeki gelişmeleri takip etmesi gereken bir
                      girişimciyseniz,
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-blue-600 mt-1">✓</span>
                    <span>
                      Ya da sadece "bu AI işi nereye gidiyor?" diye merak eden
                      biriyseniz,
                    </span>
                  </li>
                </ul>

                <p className="text-lg text-muted-foreground leading-relaxed mb-6">
                  Doğru yerdesiniz. Burada herkes için bir şeyler var.
                </p>

                <h2 className="text-3xl font-bold mb-6 mt-12">
                  Geleceğe Dair Planlarımız
                </h2>

                <p className="text-lg text-muted-foreground leading-relaxed mb-6">
                  AI Haberleri, sürekli gelişen bir platform. Şu anda üzerinde
                  çalıştığımız bazı özellikler:
                </p>

                <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950 rounded-lg p-6 my-8">
                  <ul className="space-y-3 text-muted-foreground">
                    <li className="flex items-start gap-3">
                      <span className="text-2xl">📱</span>
                      <span>
                        <strong>Mobil Uygulama:</strong> Haberleri her yerden
                        takip edebilmeniz için
                      </span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="text-2xl">🔔</span>
                      <span>
                        <strong>Kişiselleştirilmiş Bildirimler:</strong> Sadece
                        ilgilendiğiniz konularda haberdar olun
                      </span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="text-2xl">🎙️</span>
                      <span>
                        <strong>Podcast Serisi:</strong> Haftanın öne çıkan
                        haberlerini dinleyin
                      </span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="text-2xl">💬</span>
                      <span>
                        <strong>Topluluk Forumu:</strong> Diğer AI
                        meraklılarıyla tartışın
                      </span>
                    </li>
                  </ul>
                </div>

                <h2 className="text-3xl font-bold mb-6 mt-12">
                  İletişime Geçin
                </h2>

                <p className="text-lg text-muted-foreground leading-relaxed mb-6">
                  Geri bildirimleriniz bizim için çok değerli. Bir öneriniz,
                  eleştiriniz veya sadece merhaba demek istiyorsanız, kapımız
                  her zaman açık.
                </p>

                <div className="bg-card border rounded-lg p-8 text-center">
                  <p className="text-xl font-semibold mb-4">
                    Bizimle iletişime geçmek için:
                  </p>
                  <p className="text-muted-foreground mb-6">
                    E-posta:{" "}
                    <a
                      href="mailto:info@aihaberleri.org"
                      className="text-blue-600 hover:underline"
                    >
                      info@aihaberleri.org
                    </a>
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Genellikle 24 saat içinde yanıt veriyoruz.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="bg-gradient-to-r from-blue-600 to-purple-600 text-white py-16">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl font-bold mb-4">
              Yapay Zeka Yolculuğuna Başlayın
            </h2>
            <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
              Her gün yeni haberler, her hafta yeni keşifler. Geleceği birlikte
              takip edelim.
            </p>
            <a
              href="/"
              className="inline-flex items-center gap-2 bg-white text-blue-600 px-8 py-4 rounded-full font-semibold text-lg hover:bg-white/90 transition-all hover:scale-105 shadow-xl"
            >
              Haberleri Keşfet
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </a>
          </div>
        </section>
      </main>
    </div>
  );
}
