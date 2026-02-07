export const metadata = {
  title: "Hizmet Şartları | AI Haberleri",
  description:
    "AI Haberleri kullanım koşulları ve hizmet şartları. Web sitemizi kullanarak bu şartları kabul etmiş olursunuz.",
};

// Force dynamic rendering to avoid SSR issues
export const dynamic = "force-dynamic";

export default function TermsPage() {
  return (
    <div className="min-h-screen flex flex-col bg-ai-background-dark">
      <main className="flex-1 py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-4xl font-bold mb-8 text-white">Hizmet Şartları</h1>

            <div className="prose prose-lg prose-invert max-w-none">
              <p className="text-ai-text-secondary mb-6">
                Son güncelleme:{" "}
                {new Date().toLocaleDateString("tr-TR", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>

              <section className="mb-8">
                <h2 className="text-2xl font-bold mb-4 text-white">1. Genel Koşullar</h2>
                <p className="text-ai-text-secondary leading-relaxed mb-4">
                  AI Haberleri web sitesini ("Site") kullanarak, aşağıdaki
                  hizmet şartlarını ("Şartlar") kabul etmiş olursunuz. Bu
                  şartları kabul etmiyorsanız, lütfen sitemizi kullanmayın.
                </p>
                <p className="text-ai-text-secondary leading-relaxed">
                  Bu şartlar, sitemizin tüm kullanıcıları için geçerlidir ve
                  herhangi bir zamanda önceden bildirimde bulunmaksızın
                  değiştirilebilir. Değişiklikler yayınlandığı anda yürürlüğe
                  girer.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-bold mb-4 text-white">2. Hizmet Tanımı</h2>
                <p className="text-ai-text-secondary leading-relaxed mb-4">
                  AI Haberleri, yapay zeka ve teknoloji alanındaki güncel
                  haberleri, makaleleri ve içerikleri kullanıcılara sunan bir
                  haber platformudur. Hizmetlerimiz şunları içerir:
                </p>
                <ul className="list-disc pl-6 text-ai-text-secondary space-y-2">
                  <li>Güncel yapay zeka haberleri ve makaleleri</li>
                  <li>Kategori bazlı içerik organizasyonu</li>
                  <li>E-posta bülteni hizmeti</li>
                  <li>Push bildirim hizmeti</li>
                  <li>Sosyal medya paylaşım özellikleri</li>
                  <li>Yorum ve etkileşim özellikleri (gelecekte)</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-bold mb-4 text-white">
                  3. Kullanıcı Sorumlulukları
                </h2>

                <h3 className="text-xl font-semibold mb-3 mt-6 text-white">
                  3.1. Kabul Edilebilir Kullanım
                </h3>
                <p className="text-ai-text-secondary leading-relaxed mb-4">
                  Sitemizi kullanırken aşağıdaki kurallara uymanız
                  gerekmektedir:
                </p>
                <ul className="list-disc pl-6 text-ai-text-secondary space-y-2">
                  <li>Yasalara ve düzenlemelere uygun davranmak</li>
                  <li>Başkalarının haklarına saygı göstermek</li>
                  <li>Yanıltıcı veya yanlış bilgi paylaşmamak</li>
                  <li>Spam veya istenmeyen içerik göndermemek</li>
                  <li>Sitenin güvenliğini tehlikeye atmamak</li>
                  <li>Otomatik sistemler veya botlar kullanmamak</li>
                  <li>Telif haklarını ihlal etmemek</li>
                </ul>

                <h3 className="text-xl font-semibold mb-3 mt-6 text-white">
                  3.2. Yasaklanan Faaliyetler
                </h3>
                <p className="text-ai-text-secondary leading-relaxed mb-4">
                  Aşağıdaki faaliyetler kesinlikle yasaktır:
                </p>
                <ul className="list-disc pl-6 text-ai-text-secondary space-y-2">
                  <li>
                    Siteyi hack'leme veya güvenlik açıklarını istismar etme
                  </li>
                  <li>Zararlı yazılım, virüs veya kötü amaçlı kod yükleme</li>
                  <li>Diğer kullanıcıların hesaplarına yetkisiz erişim</li>
                  <li>Site içeriğini izinsiz kopyalama veya çalma</li>
                  <li>Ticari amaçlarla izinsiz veri toplama (scraping)</li>
                  <li>Nefret söylemi, taciz veya tehdit içeren davranışlar</li>
                  <li>Yasa dışı faaliyetleri teşvik etme</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-bold mb-4 text-white">
                  4. İçerik ve Telif Hakları
                </h2>

                <h3 className="text-xl font-semibold mb-3 mt-6 text-white">
                  4.1. Site İçeriği
                </h3>
                <p className="text-ai-text-secondary leading-relaxed mb-4">
                  AI Haberleri'nde yayınlanan tüm içerikler (metinler,
                  görseller, logolar, tasarımlar) telif hakkı yasaları ile
                  korunmaktadır. İçeriklerimiz:
                </p>
                <ul className="list-disc pl-6 text-ai-text-secondary space-y-2">
                  <li>Çeşitli kaynaklardan derlenmiş haberlerdir</li>
                  <li>Yapay zeka destekli içerik üretimi kullanılabilir</li>
                  <li>Kaynak gösterilerek alıntı yapılabilir</li>
                  <li>Ticari amaçla izinsiz kullanılamaz</li>
                </ul>

                <h3 className="text-xl font-semibold mb-3 mt-6 text-white">
                  4.2. Kullanıcı İçeriği
                </h3>
                <p className="text-ai-text-secondary leading-relaxed">
                  Gelecekte eklenecek yorum ve kullanıcı içeriği özellikleri
                  için: Paylaştığınız içeriğin sorumluluğu size aittir.
                  İçeriğiniz üzerindeki haklarınızı korursunuz, ancak sitemizde
                  yayınlanması için bize sınırlı bir lisans vermiş olursunuz.
                </p>

                <h3 className="text-xl font-semibold mb-3 mt-6 text-white">
                  4.3. Telif Hakkı İhlali Bildirimi
                </h3>
                <p className="text-ai-text-secondary leading-relaxed">
                  Telif hakkınızın ihlal edildiğini düşünüyorsanız, lütfen
                  info@aihaberleri.org adresinden bizimle iletişime geçin. İhlal
                  bildirimleri 48 saat içinde değerlendirilir.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-bold mb-4 text-white">
                  5. Hizmet Kullanılabilirliği
                </h2>

                <h3 className="text-xl font-semibold mb-3 mt-6 text-white">
                  5.1. Hizmet Garantisi
                </h3>
                <p className="text-ai-text-secondary leading-relaxed mb-4">
                  Sitemizi "olduğu gibi" sunuyoruz. Aşağıdaki durumlar için
                  garanti vermiyoruz:
                </p>
                <ul className="list-disc pl-6 text-ai-text-secondary space-y-2">
                  <li>Hizmetin kesintisiz olacağı</li>
                  <li>Hataların düzeltileceği</li>
                  <li>İçeriklerin %100 doğru olacağı</li>
                  <li>Belirli sonuçlar elde edileceği</li>
                </ul>

                <h3 className="text-xl font-semibold mb-3 mt-6 text-white">
                  5.2. Bakım ve Kesintiler
                </h3>
                <p className="text-ai-text-secondary leading-relaxed">
                  Planlı bakım çalışmaları için önceden bildirimde bulunmaya
                  çalışırız. Ancak acil durumlarda hizmeti geçici olarak
                  durdurma hakkımız saklıdır.
                </p>

                <h3 className="text-xl font-semibold mb-3 mt-6 text-white">
                  5.3. Hizmet Değişiklikleri
                </h3>
                <p className="text-ai-text-secondary leading-relaxed">
                  Herhangi bir zamanda, önceden bildirimde bulunmaksızın:
                </p>
                <ul className="list-disc pl-6 text-ai-text-secondary space-y-2 mt-4">
                  <li>Hizmetleri değiştirebilir veya sonlandırabiliriz</li>
                  <li>Yeni özellikler ekleyebilir veya kaldırabiliriz</li>
                  <li>Fiyatlandırma politikalarını değiştirebiliriz</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-bold mb-4 text-white">
                  6. Gizlilik ve Veri Koruma
                </h2>
                <p className="text-ai-text-secondary leading-relaxed mb-4">
                  Kişisel verilerinizin işlenmesi{" "}
                  <a
                    href="/privacy"
                    className="text-ai-primary hover:underline font-semibold"
                  >
                    Gizlilik Politikamız
                  </a>{" "}
                  kapsamında yapılır. Sitemizi kullanarak, gizlilik politikamızı
                  okuduğunuzu ve kabul ettiğinizi beyan edersiniz.
                </p>
                <p className="text-ai-text-secondary leading-relaxed">
                  KVKK (Kişisel Verilerin Korunması Kanunu) ve GDPR (Genel Veri
                  Koruma Yönetmeliği) uyarınca haklarınız korunmaktadır.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-bold mb-4 text-white">7. Sorumluluk Reddi</h2>

                <h3 className="text-xl font-semibold mb-3 mt-6 text-white">
                  7.1. İçerik Doğruluğu
                </h3>
                <p className="text-ai-text-secondary leading-relaxed">
                  Haberlerimiz çeşitli kaynaklardan derlenir ve yapay zeka
                  destekli sistemler kullanılabilir. İçeriklerin doğruluğunu
                  garanti edemeyiz. Kullanıcılar, önemli kararlar almadan önce
                  bilgileri doğrulamalıdır.
                </p>

                <h3 className="text-xl font-semibold mb-3 mt-6 text-white">
                  7.2. Üçüncü Taraf Bağlantıları
                </h3>
                <p className="text-ai-text-secondary leading-relaxed">
                  Sitemizde üçüncü taraf web sitelerine bağlantılar bulunabilir.
                  Bu sitelerin içeriğinden veya gizlilik uygulamalarından
                  sorumlu değiliz.
                </p>

                <h3 className="text-xl font-semibold mb-3 mt-6 text-white">
                  7.3. Zarar Sorumluluğu
                </h3>
                <p className="text-ai-text-secondary leading-relaxed mb-4">
                  Yasaların izin verdiği ölçüde, aşağıdaki durumlardan sorumlu
                  değiliz:
                </p>
                <ul className="list-disc pl-6 text-ai-text-secondary space-y-2">
                  <li>Doğrudan veya dolaylı zararlar</li>
                  <li>Veri kaybı veya iş kaybı</li>
                  <li>Kar kaybı</li>
                  <li>Üçüncü tarafların neden olduğu zararlar</li>
                  <li>Hizmet kesintilerinden kaynaklanan zararlar</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-bold mb-4 text-white">
                  8. Hesap Askıya Alma ve Sonlandırma
                </h2>
                <p className="text-ai-text-secondary leading-relaxed mb-4">
                  Aşağıdaki durumlarda, önceden bildirimde bulunmaksızın
                  hesabınızı askıya alabilir veya sonlandırabiliriz:
                </p>
                <ul className="list-disc pl-6 text-ai-text-secondary space-y-2">
                  <li>Hizmet şartlarının ihlali</li>
                  <li>Yasadışı faaliyetler</li>
                  <li>Diğer kullanıcılara zarar verme</li>
                  <li>Spam veya kötüye kullanım</li>
                  <li>Sahte bilgi paylaşımı</li>
                </ul>
                <p className="text-ai-text-secondary leading-relaxed mt-4">
                  Hesabınız sonlandırıldığında, tüm verileriniz silinebilir ve
                  hizmetlere erişiminiz kalıcı olarak engellenebilir.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-bold mb-4 text-white">
                  9. Uygulanacak Hukuk ve Yargı Yetkisi
                </h2>
                <p className="text-ai-text-secondary leading-relaxed mb-4">
                  Bu hizmet şartları, Türkiye Cumhuriyeti yasalarına tabidir. Bu
                  şartlardan kaynaklanan tüm uyuşmazlıklar, İstanbul
                  mahkemelerinin ve icra dairelerinin münhasır yetkisindedir.
                </p>
                <p className="text-ai-text-secondary leading-relaxed">
                  Uluslararası kullanıcılar için, yerel yasalar da geçerli
                  olabilir.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-bold mb-4 text-white">10. Tazminat</h2>
                <p className="text-ai-text-secondary leading-relaxed">
                  Sitemizi kullanarak, AI Haberleri'ni, çalışanlarını,
                  yöneticilerini ve ortaklarını, sizin hizmet şartlarını ihlal
                  etmenizden kaynaklanan tüm iddialar, zararlar, yükümlülükler
                  ve masraflara karşı tazmin etmeyi kabul edersiniz.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-bold mb-4 text-white">
                  11. Çeşitli Hükümler
                </h2>

                <h3 className="text-xl font-semibold mb-3 mt-6 text-white">
                  11.1. Bölünebilirlik
                </h3>
                <p className="text-ai-text-secondary leading-relaxed">
                  Bu şartların herhangi bir hükmü geçersiz sayılırsa, diğer
                  hükümler geçerliliğini korur.
                </p>

                <h3 className="text-xl font-semibold mb-3 mt-6 text-white">
                  11.2. Feragat
                </h3>
                <p className="text-ai-text-secondary leading-relaxed">
                  Herhangi bir hakkımızdan feragat etmememiz, gelecekte o haktan
                  feragat ettiğimiz anlamına gelmez.
                </p>

                <h3 className="text-xl font-semibold mb-3 mt-6 text-white">11.3. Devir</h3>
                <p className="text-ai-text-secondary leading-relaxed">
                  Bu şartlar altındaki haklarınızı başkasına devredemezsiniz.
                  Biz ise haklarımızı herhangi bir üçüncü tarafa devredebiliriz.
                </p>

                <h3 className="text-xl font-semibold mb-3 mt-6 text-white">
                  11.4. Tam Anlaşma
                </h3>
                <p className="text-ai-text-secondary leading-relaxed">
                  Bu hizmet şartları, sitemizin kullanımına ilişkin sizinle
                  aramızdaki tam anlaşmayı oluşturur.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-bold mb-4 text-white">12. İletişim</h2>
                <p className="text-ai-text-secondary leading-relaxed mb-4">
                  Hizmet şartlarımız hakkında sorularınız veya endişeleriniz
                  için bizimle iletişime geçebilirsiniz:
                </p>
                <div className="bg-ai-surface-card border border-ai-surface-border rounded-xl p-6">
                  <p className="text-ai-text-secondary mb-2">
                    <strong className="text-white">E-posta:</strong>{" "}
                    <a
                      href="mailto:legal@aihaberleri.org"
                      className="text-ai-primary hover:underline"
                    >
                      legal@aihaberleri.org
                    </a>
                  </p>
                  <p className="text-ai-text-secondary mb-2">
                    <strong className="text-white">Genel İletişim:</strong>{" "}
                    <a
                      href="mailto:info@aihaberleri.org"
                      className="text-ai-primary hover:underline"
                    >
                      info@aihaberleri.org
                    </a>
                  </p>
                  <p className="text-ai-text-secondary">
                    <strong className="text-white">Web:</strong>{" "}
                    <a
                      href="https://aihaberleri.org"
                      className="text-ai-primary hover:underline"
                    >
                      https://aihaberleri.org
                    </a>
                  </p>
                </div>
              </section>

              <div className="bg-amber-900/30 border-l-4 border-amber-500 p-6 rounded-r-xl mt-8">
                <p className="text-sm text-ai-text-secondary mb-2">
                  <strong className="text-white">Önemli Not:</strong>
                </p>
                <p className="text-sm text-ai-text-secondary">
                  Bu hizmet şartlarını düzenli olarak gözden geçirmenizi
                  öneririz. Sitemizi kullanmaya devam ederek, güncel şartları
                  kabul etmiş olursunuz. Son güncelleme tarihi sayfanın başında
                  belirtilmiştir.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
