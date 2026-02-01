# ne çıkan snippet'ler ve web siteniz



Öne çıkan snippet'ler, normal bir arama sonucunun biçiminin tersine çevrildiği ve açıklayıcı [snippet](https://developers.google.com/search/docs/appearance/snippet?hl=tr)'i gösteren özel kutulardır. Ayrıca, [ilgili sorular grubunda](https://developers.google.com/search/docs/appearance/visual-elements-gallery?hl=tr#related-questions-group) ("Kullanıcılar bunları da sordu" olarak da bilinir) gösterilebilir. [Google'ın Öne Çıkan Snippet'lerinin işleyiş şekli hakkında daha fazla bilgi edinin.](https://support.google.com/websearch/answer/9351707?hl=tr)

<svg aria-labelledby="svg-featured-snippet" class="attempt-right" direction="ltr" viewBox="0 0 800 400" xlink="http://www.w3.org/1999/xlink" xmlns="http://www.w3.org/2000/svg" style="color: rgb(32, 33, 36); font-family: Roboto, &quot;Noto Sans&quot;, &quot;Noto Sans JP&quot;, &quot;Noto Sans KR&quot;, &quot;Noto Naskh Arabic&quot;, &quot;Noto Sans Thai&quot;, &quot;Noto Sans Hebrew&quot;, &quot;Noto Sans Bengali&quot;, sans-serif; font-size: 16px; font-style: normal; font-variant-ligatures: normal; font-variant-caps: normal; font-weight: 400; letter-spacing: normal; orphans: 2; text-align: start; text-indent: 0px; text-transform: none; widows: 2; word-spacing: 0px; -webkit-text-stroke-width: 0px; white-space: normal; background-color: rgb(255, 255, 255); text-decoration-thickness: initial; text-decoration-style: initial; text-decoration-color: initial;"><image width="100%" y="10%" href="https://developers.google.com/search/docs/images/blank-featured-snippet.png?hl=tr"></image><foreignObject height="80" width="680" x="50" y="70"><p xmlns="http://www.w3.org/1999/xhtml" style="box-sizing: inherit; margin: 0px; padding: 1rem 0px; font: 400 24px / 32px &quot;Google Sans&quot;, &quot;Noto Sans&quot;, &quot;Noto Sans JP&quot;, &quot;Noto Sans KR&quot;, &quot;Noto Naskh Arabic&quot;, &quot;Noto Sans Thai&quot;, &quot;Noto Sans Hebrew&quot;, &quot;Noto Sans Bengali&quot;, sans-serif;">7-10 dakika</p></foreignObject><foreignObject height="80" width="680" x="50" y="270"><p xmlns="http://www.w3.org/1999/xhtml" style="box-sizing: inherit; margin: 0px; padding: 1rem 0px; font: 400 24px / 32px &quot;Google Sans&quot;, &quot;Noto Sans&quot;, &quot;Noto Sans JP&quot;, &quot;Noto Sans KR&quot;, &quot;Noto Naskh Arabic&quot;, &quot;Noto Sans Thai&quot;, &quot;Noto Sans Hebrew&quot;, &quot;Noto Sans Bengali&quot;, sans-serif;"><a class="external-link" href="https://wikipedia.org/wiki/Boiled_egg" style="box-sizing: inherit; color: rgb(26, 115, 232); outline: 0px; text-decoration: rgb(26, 115, 232); word-break: break-word;">Katı yumurta nasıl yapılır?</a></p></foreignObject></svg>

## Öne çıkan snippet'leri nasıl devre dışı bırakabilirim?

Öne çıkan snippet'leri devre dışı bırakmanın iki yolu vardır:

- [Hem öne çıkan hem de normal arama snippet'lerini engelleme](https://developers.google.com/search/docs/appearance/featured-snippets?hl=tr#block-both)
- [Yalnızca öne çıkan snippet'leri engelleme](https://developers.google.com/search/docs/appearance/featured-snippets?hl=tr#block-fs)

### Tüm snippet'leri engelleme

Belirli bir sayfada tüm snippet'lerin (öne çıkan snippet'ler ve normal snippet'ler dahil) görünmesini engellemek için bu sayfaya [`nosnippet` kuralını](https://developers.google.com/search/docs/crawling-indexing/robots-meta-tag?hl=tr#nosnippet) ekleyin.

- [`data-nosnippet` HTML özelliği](https://developers.google.com/search/docs/crawling-indexing/robots-meta-tag?hl=tr#data-nosnippet-attr) ile işaretlenen metinler de öne çıkan snippet'lerde veya normal snippet'lerde görünmez.
- Bir sayfada hem `nosnippet` hem de `data-nosnippet` kuralı görünürse `nosnippet` öncelikli olur ve sayfa için snippet'ler gösterilmez.

### Yalnızca öne çıkan snippet'leri engelleme

Snippet'lerin normal biçimlendirilmiş arama sonuçlarında kalıp öne çıkan snippet'lerde görünmemesini istiyorsanız [`max-snippet` kuralını](https://developers.google.com/search/docs/crawling-indexing/robots-meta-tag?hl=tr#max-snippet) daha kısa ayarlamayı deneyin. Öne çıkan snippet'ler, yalnızca yararlı bir öne çıkan snippet oluşturmak için yeterli metin gösterilebiliyorsa görünür.

Öne çıkan snippet'ler için sayfalar gösterilmeye devam ediyorsa değeri azaltmaya devam edin. Genel olarak, `max-snippet` kuralı ayarınız ne kadar kısa olursa sayfanın öne çıkan snippet olarak görünme olasılığı o kadar azalır.

Google, öne çıkan snippet olarak görünmek için gereken tam minimum uzunluk değerini sağlamaz. Bunun nedeni, minimum uzunluğun snippet'teki bilgiler, dil, platform (mobil cihaz, uygulama veya masaüstü) ve diğer çeşitli faktörlere bağlı olarak değişken olmasıdır.

Düşük bir `max-snippet` ayarı kullanmak, Google'ın sayfanız için öne çıkan snippet'leri göstermeyi durdurmayacağını garanti etmez. Kesin bir çözüme ihtiyacınız varsa `nosnippet` kuralını kullanın.

## Sayfamı öne çıkan snippet olarak nasıl işaretleyebilirim?

Bunu siz yapamazsınız. Kullanıcıların arama isteklerinde belirli bir sayfanın iyi bir öne çıkan snippet olup olmayacağını Google sistemleri belirler ve bu durumda sayfayı öne çıkan snippet olarak sunar.

## Kullanıcı öne çıkan snippet'i tıkladığında ne olur?

Öne çıkan snippet'i tıklamak kullanıcıyı, doğrudan sayfanın öne çıkan snippet'te görünen bölümüne yönlendirir. Snippet'te görünen konuma gitme, sitenin ek açıklaması olmadan otomatik olarak gerçekleşir. Tarayıcı gerekli teknolojiyi desteklemiyorsa veya sistemlerimiz tıklamayı sayfada tam olarak nereye yönlendireceğini güvenilir şekilde belirleyemiyorsa öne çıkan snippet'i tıklamak kullanıcıyı, kaynak web sayfasının en üst kısmına yönlendirir.





# Esnek Örnekleme ile ilgili genel yönergeler

Örnekleme değişikliklerinin Google kullanıcılarının ve yayıncıların abonelik modelleri üzerindeki olası etkisini daha iyi anlamak için yayıncı iş ortaklarımızla işbirliği içinde bir dizi deneme geliştirdik. Bu denemelerden, geçerli örnekleme düzeylerinde yapılacak küçük değişikliklerin bile kullanıcı deneyimini kötüleştirebildiğini ve kullanıcı erişiminin kısıtlanmasının Google Arama'daki makale sıralamasını istemeden de olsa etkileyebildiğini öğrendik.

Örnekleme ile ilgili iki yöntem öneriyoruz: **Ölçme** yöntemi, kullanıcıların abone olmalarını veya giriş yapmalarını gerektirmeden okuyabilecekleri makaleler için bir kota koyar, ödeme duvarları bu kota dolduktan sonra görünmeye başlar. **Tanıtım girişi** yöntemi ise, bir makalenin içeriğini tam olarak göstermeden bir kısmını kullanıcıya sunar.

Yayıncıların, örnekleme için farklı miktarları dikkatli bir şekilde denemelerini öneririz. Esnek örnekleme uygulamasıyla ilgili bazı genel yönergeleri burada bulabilirsiniz.

## Ölçme

Genel olarak, günlükten ziyade aylık ölçmenin daha fazla esneklik ve test için daha güvenli bir ortam sağlayacağına inanıyoruz. 10 tane aylık örnekte bir tam sayı değerinden diğerine geçişin kullanıcı açısından etkisi, 3 tane günlük örnekte olduğundan daha azdır. Aylık ölçme, abone olma olasılığı en yüksek olan en ilgili kullanıcıların ödeme duvarı görüntülemelerine odaklanma avantajı sağlarken diğer yandan, daha yeni ve daha az ilgili kullanıcıların, bir ödeme duvarıyla karşılaşmadan önce içeriğinizin değeri hakkında bilgi edinmesine olanak tanır. ("Ödeme duvarı", bu bağlamda, içerik erişimi için abonelik veya yalnızca kayıt gerektiren engeller açısından kullanılmaktadır.)

### Ne kadar içerikten bahsediyoruz?

Örnekleme açısından tüm işletmelere uyan tek bir değer yoktur. Bununla birlikte, çoğu günlük haber yayıncısı için bu değerin, kullanıcı başına aylık 6 ila 10 makaleye denk gelmesini bekleriz. Çoğu yayıncının, en çok ilgi gösteren kullanıcılar arasında dönüşüm fırsatlarını artırırken yeni potansiyel aboneler için iyi bir kullanıcı deneyimini koruyan bir değeri bu aralıkta bulacağını düşünüyoruz.

Araştırmalarınızda başlangıç olarak Google arama kullanıcılarına her ay 10 makale sağlamanızı ve bu noktadan sonra ardışık değişiklikler uygulamanızı öneririz. Kesin sayıyı, işletmelerinin özel taleplerini en iyi şekilde anlayacak olan yayıncıların kendilerine bırakıyoruz. Yayıncılara, ödeme duvarlarına ulaşan arama kullanıcılarının geçerli yüzdesini analiz etmelerini ve benzer sonuç sağlayacak bir aylık sayı seçmelerini öneririz. Seçtiğiniz değeri, istikrarlı bir temel oluşturduğunuza inandıktan sonra istediğiniz zaman düşürebilirsiniz.

## Tanıtım girişi

Ölçmeye ek olarak bazı yayıncılar, ölçüm bittikten sonra makalenin ilk birkaç cümlesini ödeme duvarlarına ait "ekranın üst kısmında" gösterirler. Bunun iyi bir uygulama olduğunu düşünüyoruz. Yayıncılar, makalenin girişini göstererek kullanıcıların, içeriğin değerini görebilmelerini sağlayabilir ve böylece, kullanıcıya içeriğin tamamıyla engellendiği bir sayfadan daha fazla değer sağlayabilir. Tanıtım girişi, kullanıcının makalenin nasıl devam ettiği konusunda merak duymasını da sağlar ve bu, dönüşüme yardımcı olabilir.

## Değişiklik Yapma

Yayıncılar, yönlendirme trafiği ve dönüşüm üzerindeki etkisini belirlemek için farklı örnekleme değerleriyle denemeler yapmak isteyecektir.

Kullanıcı çalışmalarımızda, az miktarda içerik gören kullanıcılar abone olmaya zorlandığında, ürüne olan ilgilerinin büyük ölçüde kaybolduğunu gördük. Analizlerimiz, ziyaretin %10'undan fazla gösterilen ödeme duvarlarının genel kullanıcı memnuniyetini önemli ölçüde düşürmeye başladığını göstermektedir (bu genellikle kitlenin yaklaşık %3'ünün ödeme duvarıyla karşılaştığı anlamına gelir). Bu sınıra yaklaşırken dikkatli olunmasını öneririz; aksi halde, içeriğinizin değeri konusunda henüz ikna olmamış kullanıcıları uzaklaştırmaya başlayabilirsiniz.

Daha gelişmiş teknik kaynaklara sahip yayıncılar, çalışmalarını, katılımda bulunanlar segmentindeki belirli kullanıcıları kapsamak üzere daha dar bir şekilde odaklamak isteyebilir. Verilen aylık hakkı tutarlı bir şekilde sonuna kadar kullanan kullanıcıların tanımlanmasıyla, yayıncılar özel olarak o kitleye ayrılan örnek sayısını azaltıp bu kullanıcıları hedefleyebilir ve diğer kullanıcıların daha serbest tüketmelerine izin vererek genel kullanıcı davranışının ve memnuniyetinin düşme riskini azaltabilir.

## Ödeme duvarlı içerik nasıl belirtilir?

Google'ın ödeme duvarlı içeriklerle, [gizleme yapan](https://developers.google.com/search/docs/advanced/guidelines/cloaking?hl=tr) (Googlebot'a farklı kullanıcıya farklı sunulan) içeriği ayrımanıza yardımcı olmak için ödeme duvarlı içerikleri yapılandırılmış veri içinde sunun. İçeriğin sunulması sırasında tarayıcıda görünmesini istemiyorsanız ödeme duvarlı içeriği tarayıcıya hiç göndermeyen bir ödeme duvarı uygulaması seçin.

[Ödeme duvarlı içeriği yapılandırılmış veri ile belirtme](https://developers.google.com/search/docs/appearance/structured-data/paywalled-content?hl=tr) hakkında daha fazla bilgi edinin ve [ödeme duvarlı içeriği JavaScript kullanarak uygulama ile ilgili kılavuzumuza](https://developers.google.com/search/docs/crawling-indexing/javascript/fix-search-javascript?hl=tr#paywall) göz atın.



# Keşfet ve web siteniz



Google Arama'nın bir parçası olan [Keşfet](https://support.google.com/websearch/answer/2819496?hl=tr), [Web ve Uygulama Etkinliği](https://support.google.com/websearch/answer/54068?hl=tr)'ne göre kullanıcılara ilgi alanlarıyla ilgili içerik gösterir. Bu sayfada, içeriklerin Keşfet'te nasıl görünebileceği ve site sahiplerinin göz önünde bulundurması gereken en iyi uygulamalar hakkında daha fazla bilgi verilmektedir.

![Keşfet&#39;in telefonda görünüşü](https://developers.google.com/static/search/docs/images/google-discover.png?hl=tr)

## Keşfet'te içerik nasıl görünür?

İçerik, [Google tarafından dizine eklenmiş](https://developers.google.com/search/docs/essentials/technical?hl=tr) ve Keşfet'in [içerik politikalarına](https://support.google.com/websearch/answer/9982767?hl=tr) uyuyorsa Keşfet'te görünmeye otomatik olarak uygundur. Özel bir etiket veya yapılandırılmış veri gerekmez. Keşfet'te görünmeye uygun olmanın, görüntülenmeyi garanti etmediğini unutmayın.

Keşfet'te görünebilecek içerikler arasında kullanıcının ilgi alanlarına uygun çok çeşitli konular yer alır. Eski içerikler, faydalıysa ve kullanıcıların ilgi alanlarıyla alakalıysa gösterilebilir.

Siteniz bir veya daha fazla Keşfet içerik politikasını ihlal ettiğinde Search Console'unuzdaki Güvenlik ve Manuel işlemler altında Keşfet manuel işlemleri görünebilir. [İhlal türleri ve bu ihlallerin nasıl düzeltileceği](https://support.google.com/webmasters/answer/9044175?hl=tr#news_discover&zippy=,news-and-discover-policy-violations) hakkında daha fazla bilgi edinin.

Google Arama'nın bir parçası olan Keşfet, hangi içeriklerin faydalı ve kullanıcı odaklı olduğunu belirlemek için Arama tarafından kullanılan birçok sinyal ve [sistemden](https://developers.google.com/search/docs/appearance/ranking-systems-guide?hl=tr) yararlanır. Bu nedenle, Keşfet ile başarılı olmak isteyenler [yararlı, güvenilir, kullanıcı odaklı içerikler oluşturma](https://developers.google.com/search/docs/fundamentals/creating-helpful-content?hl=tr) konusundaki önerimizi incelemelidir.

İçeriğinizin Keşfet'te görünme olasılığını artırmak için şunları öneririz:

- İçeriğin özünü yakalayan ama tıklama tuzağı içermeyen sayfa başlıkları kullanın.
- İçeriğinize ilgi çekici, yüksek kaliteli görseller, özellikle de Keşfet'ten ziyaretçi çekme olasılığı daha yüksek olan büyük resimler ekleyin. Büyük resimlerin en az 1.200 piksel eninde olması ve [`max-image-preview:large` ayarıyla](https://developers.google.com/search/docs/crawling-indexing/robots-meta-tag?hl=tr#max-image-preview) veya [AMP](https://www.ampproject.org/) kullanılarak etkinleştirilmesi gerekir.
- Çekiciliği artırmak için önizleme içeriğinde (başlık, snippet'ler, görseller) yanıltıcı veya abartılı ayrıntılar kullanarak ya da içerik hakkında bilgi edinebilmek için gereken önemli bilgileri saklayarak etkileşimi yapay bir şekilde artırma taktiklerinden kaçının.
- Sağlıklı olmayan bir merak, erotik duygular veya öfke uyandırarak ilgiyi manipüle etmeye yönelik taktiklerden kaçının.
- Mevcut ilgi alanlarına dair güncel, bir hikayeyi iyi anlatan veya benzersiz bilgiler sağlayan içerikler sunun.

İyi bir kullanıcı deneyimi sunmak için Keşfet hem makaleler ve videolar gibi ilgi alanına dayalı feed'lere uygun içerik sunmaya hem de istenmeyen veya okuyucuların kafasını karıştırabilecek içeriği filtrelemeye çalışır. Örneğin, Keşfet, herhangi bir bağlam olmadan iş başvurusu, imza toplama isteği, form, kod deposu veya hiciv barındıran içerik önermeyebilir. Keşfet, [SafeSearch](https://developers.google.com/search/docs/crawling-indexing/safesearch?hl=tr)'dan yararlanır. Ayrıca bunun da ötesinde şok edici veya beklenmedik olarak görülebilecek içerikleri filtreler.

## Keşfet trafiğinin zaman içinde değişebilmesinin nedenleri

Keşfet'ten gelen trafik, anahtar kelimeye dayalı arama ziyaretlerine kıyasla daha az tahmin edilebilir veya güvenilirdir. Tesadüfi yapısı sebebiyle Keşfet'ten gelen trafiği, anahtar kelimeye dayalı arama trafiğinize ek olarak düşünmelisiniz. Keşfet trafiğindeki dalgalanmaların olası nedenlerinden bazıları şunlardır:

- **İlgi alanlarının değiştirilmesi**: Keşfet, kullanıcıların ilgilendiği konularla alakalı içerikleri (kısmen arama etkinliğine bağlı olabilir) göstermek için tasarlanmış ve bu doğrultuda sürekli olarak iyileştirilmektedir. Bir kullanıcı artık belirli bir konuyla eskisi kadar ilgilenmiyorsa (örneğin, konuyla ilgili arama sayısı azalırsa) Keşfet feed'i, daha çok ilgilendiği diğer içerikleri gösterebilir. Bu da yayıncıların trafiğinde değişikliklere neden olabilir.
- **İçerik türleri**: Keşfet, kullanıcıların aradıklarıyla daha uyumlu hale getirmek için feed'de görünebilecek içerik türlerini düzenlemiştir ve düzenlemeye devam etmektedir. Keşfet, açık web'den spor, sağlık, eğlence ve yaşam tarzı içerikleri dahil ancak bunlarla sınırlı olmamak üzere düzenli olarak içerik gösterir.
- **Google Arama ile ilgili güncellemeler**: Ayrıca, kullanıcılara faydalı içeriklerin bağlantılarını daha iyi sunmak için düzenli olarak [Arama ile ilgili güncellemeler](https://status.search.google.com/products/rGHU1u87FJnkP6W2GwMi/history?hl=tr) de yapıyoruz. Keşfet, Arama'nın bir uzantısı olduğundan güncellemeler bazen trafik değişikliklerine neden olabilir. Bir güncellemeden sonra web sitenizin performansında değişiklik olduğunu fark ederseniz [Google Arama'nın temel güncellemeleri ve web siteniz](https://developers.google.com/search/docs/appearance/core-updates?hl=tr) ile ilgili belgelerimizi incelemeniz faydalı olabilir.Ancak, güncelleme sonrasında herhangi bir işlem yapmanız gerekmeyebilir. Keşfet'in kullanıcı deneyimini iyileştirmek için sürdürdüğümüz çalışmalar nedeniyle siteler, trafiklerinde içeriklerinin kalitesi veya yayınlanma sıklığıyla ilgisi olmayan değişiklikler görebilir.

## Keşfet'teki performansınızı izleme

Keşfet'te içeriğiniz varsa performansınızı [Keşfet için Performans raporunu](https://support.google.com/webmasters/answer/9216516?hl=tr) kullanarak izleyebilirsiniz. Verileriniz minimum gösterim eşiğine ulaştığı sürece, bu raporda son 16 ay içinde Keşfet'te görünen içeriğinizin gösterim ve tıklanma sayısı ile TO'ları gösterilir. Keşfet performans raporu, [Chrome'dan gelen trafiği içerir](https://developers.google.com/search/blog/2021/02/search-console-performance-discover-chrome?hl=tr) ve kullanıcıların Keşfet ile etkileşimde bulunduğu tüm yüzeylerde sitelerin Keşfet trafiğini tam olarak izler.Yerel arama sonuçlarında ve diğer Google mülklerinde görüntülenmeyi devre dışı bırakma

Google'ın sitenizden taradığı içeriklerin çeşitli Google mülklerinde görüntülenmesini devre dışı bırakabilirsiniz:

- [Google Alışveriş](http://www.google.com/shopping)
- [Google Uçuş Arama](http://www.google.com/flights)
- [Google Hotels](https://www.google.com/travel/hotels) ve kiralık yerler
- Yerel arama sonuçları (yerel arama için kullanılan sorgulara karşılık döndürülen özel arama sonuçları sayfası)

Devre dışı bırakma seçeneğini belirlerseniz Googlebot tarafından taranan site içeriğiniz yukarıda listelenen mülklerin hiçbirinde görüntülenmez. Bu mülklerden herhangi birinde halihazırda görüntülenmekte olan içerik, devre dışı bırakıldıktan 30 gün sonra kaldırılır.

Devre dışı bırakma seçeneği alan adı temelinde uygulanır. Örneğin, `example.com` adresini, tüm alt alanları da dahil olmak üzere (ör. `sub.example.com`) tüm içeriği devre dışı bırakmak için belirtebilirsiniz. Başka alanlara sahipseniz (`example.org` veya `example2.com` gibi) ve bu alanlar devre dışı bırakılmış bir alana içerik yayınlayabiliyorsa, devre dışı bırakma seçeneğinin bu ayrı alanların her birindeki içeriğe uygulanması için bunları ayrı ayrı devre dışı bırakmanız gerekir. Salt bağımsız alt alanları (ör. `sub.example.com`) veya bir alan içindeki bağımsız dizinleri (ör. `example.com/sub`) belirtemezsiniz.

Yerel arama sonuçları için bu devre dışı bırakma seçeneğinin genel olarak geçerli olduğunu unutmayın. Kapsam içindeki diğer mülklerde bu devre dışı bırakma seçeneği yalnızca google.com alanında üzerinde barındırılan hizmet için geçerli olur.

[Search Console'daki devre dışı bırakma ayarınızı görüntüleyin ya da değiştirin](https://search.google.com/search-console/opt-out)







# Google Arama sonuçlarında sayfa deneyimini anlama



Google'ın temel sıralama sistemleri, iyi bir sayfa deneyimi sunan içerikleri ödüllendirmeyi amaçlar. Sistemlerimizle başarıya ulaşmak isteyen site sahipleri, sayfa deneyiminin yalnızca bir veya iki unsuruna odaklanmamalıdır. Bunun yerine, birçok açıdan genel olarak iyi bir sayfa deneyimi sunup sunmadığınızı kontrol edin.

## İçeriğinizin sayfa deneyimini kendi kendinize değerlendirin 

Aşağıdaki sorulara evet yanıtı verirseniz iyi bir sayfa deneyimi sağlama konusunda muhtemelen doğru yoldasınızdır:

- Sayfalarınızın Core Web Vitals durumu hızlı mı?
- Sayfalarınız güvenli bir şekilde sunuluyor mu?
- İçeriğiniz mobil cihazlarda iyi görünüyor mu?
- İçeriğinizde dikkati asıl içerikten başka yöne çeken veya asıl içerikle karışan aşırı miktarda reklam kullanmaktan kaçınıyor musunuz?
- Sayfalarınızda araya giren geçiş reklamları kullanmaktan kaçınıyor musunuz?
- Sayfanız, ziyaretçilerin ana içeriği sayfanızdaki diğer içeriklerden kolayca ayırt edebileceği şekilde tasarlanmış mı?

Bu sorular, sayfa deneyimi ile ilgili olarak dikkate alınması gereken tüm unsurları kapsamaz. Ancak, bu tür soruları sormak ve aşağıdaki kaynaklara danışmak genel olarak iyi bir sayfa deneyimi sunmanıza yardımcı olabilir.

## Sayfa deneyimi kaynakları

Sayfa deneyiminizi ölçmenize, izlemenize ve optimize etmenize yardımcı olabilecek bazı kaynakları burada bulabilirsiniz:

- [Core Web Vitals ve Google Arama sonuçlarını anlama](https://developers.google.com/search/docs/appearance/core-web-vitals?hl=tr): Core Web Vitals ve Google Arama sonuçlarında çalışma şekli hakkında daha fazla bilgi edin
- [Search Console'un HTTPS raporu](https://support.google.com/webmasters/answer/11396518?hl=tr): Güvenli HTTPS sayfaları sunup sunmadığınızı ve sunmuyorsanız neleri düzeltmeniz gerektiğini kontrol edin.
- [Site bağlantılarının güvenli olup olmadığını kontrol etme](https://support.google.com/chrome/answer/95617?hl=tr): Chrome tarafından bildirilen şekilde, site bağlantınızın güvenli olup olmadığını nasıl kontrol edeceğinizi öğrenin. Sayfa HTTPS üzerinden sunulmuyorsa [sitenizi HTTPS ile nasıl güvenli hale getireceğinizi](https://web.dev/articles/enable-https?hl=tr) öğrenin.
- [Araya giren geçiş reklamları ve iletişim kutularından kaçınma](https://developers.google.com/search/docs/appearance/avoid-intrusive-interstitials?hl=tr): İçeriklere erişimi zorlaştıran geçiş reklamlarından nasıl kaçınacağınızı öğrenin.
- [Chrome Lighthouse:](https://developer.chrome.com/docs/lighthouse/overview?hl=tr) Chrome'un bu araç seti, mobil kullanılabilirlik de dahil olmak üzere sayfa deneyimiyle ilgili çeşitli iyileştirmeleri belirlemenize yardımcı olabilir.

## SSS

### Google Arama'nın sıralama için kullandığı tek bir "sayfa deneyimi sinyali" mi var? 

Hayır, tek bir sinyal yok. Temel sıralama sistemlerimiz, genel sayfa deneyimiyle uyumlu olan çeşitli sinyalleri inceler.

### Sıralamada sayfa deneyimiyle ilgili hangi unsurlar kullanılır? 

Core Web Vitals, sıralama sistemlerimiz tarafından kullanılır. Site sahiplerinin Arama'da başarıya ulaşmak ve genel olarak iyi bir kullanıcı deneyimi sağlamak için doğru Core Web Vitals verilerine sahip olmasını öneririz. Search Console'un [Core Web Vitals raporu](https://support.google.com/webmasters/answer/9205520?hl=tr) gibi raporlarda veya üçüncü taraf araçlarda iyi sonuçlar elde etmenin, sayfalarınızın Google Arama sonuçlarının üstünde sıralanacağının garantisi olmadığını unutmayın. Mükemmel sayfa deneyimi, sadece Core Web Vitals puanlarından ibaret değildir. Bu puanlar, sitenizi genel olarak kullanıcılarınız için iyileştirmenize yardımcı olmak için tasarlanmıştır. Yalnızca SEO nedeniyle mükemmel bir puan almaya çalışarak zamanınızı boşa harcıyor olabilirsiniz.

Core Web Vitals dışındaki diğer sayfa deneyimi özellikleri, web sitenizin arama sonuçlarında daha üst sıralarda yer almasına doğrudan yardımcı olmaz. Ancak bunlar, web sitenizin kullanımını daha keyifli hale getirebilir. Bu durum da genellikle sıralama sistemlerimizin ödüllendirmek istediği noktalarla uyumludur. Dolayısıyla, genel sayfa deneyimini iyileştirmek için çalışmaya devam etmeniz faydalı olacaktır.

### Sayfa deneyimi site genelinde mi yoksa sayfaya özgü olarak mı değerlendirilir? 

Temel sıralama sistemlerimiz, sayfa deneyimiyle ilgili unsurları anlamak da dahil olmak üzere içerikleri genellikle sayfaya özgü olarak değerlendirir. Bununla birlikte, site genelinde de bazı değerlendirmelerimiz vardır.

### Sayfa deneyimi, sıralamada başarı için ne kadar önemli? 

Google Arama, sayfa deneyimi yetersiz olsa bile her zaman en alakalı içeriği göstermeye çalışır. Ancak birçok sorgu için çok sayıda faydalı içerik sunulmaktadır. Bu tür durumlarda, iyi bir sayfa deneyimi Arama'da başarılı olmanıza yardımcı olabilir.

[![img](https://i.ytimg.com/vi/Z6WiGWDU0nU/maxresdefault.jpg)](https://www.youtube.com/watch?v=Z6WiGWDU0nU&hl=tr)

YouTube

How to improve Cumulative Layout Shift for a better page experience

Updated 19 Ekim 2021

Learn how to reduce your website's Cumulative Layout Shift. This video covers what a Cumulative Layout Shift is, its common issues and solutions, how to measure it, and what's a good score. Chapters 0:00 Introduction 0:31 What is Cumulative Layout

[![img](https://i.ytimg.com/vi/480m72yjZv8/maxresdefault.jpg)](https://www.youtube.com/watch?v=480m72yjZv8&hl=tr)

YouTube

How to improve Largest Contentful Paint for a better page experience

Updated 5 Ekim 2021

Largest Contentful Paint is a metric that measures how quickly a page’s main content loads and renders (or paints) most of its visual elements to the screen. Learn more about what a good Largest Contentful Paint score is, how to measure your website

[![img](https://i.ytimg.com/vi/1vs-R-lc-qo/maxresdefault.jpg)](https://www.youtube.com/watch?v=1vs-R-lc-qo&hl=tr)

YouTube

First steps to getting a great Page Experience

Updated 10 Ağustos 2021

Learn about how mobile friendliness, HTTPS usage, safe browsing, and a lack of intrusive interstitials contribute to a great page experience. 00:00 Introduction 1:21 HTTPS 2:35 Mobile friendliness 4:19 Intrusive interstitials 5:46 Search Console 6:25

Daha fazlaexpand_more

## Blogumuza son eklenenler 

[Google Arama Merkezi blogunda](https://developers.google.com/search/blog?hl=tr) sayfa deneyimi hakkında duyurduğumuz tüm bilgileri aşağıda bulabilirsiniz:

[![img](https://developers.google.com/static/search/blog/images/introducing-inp/inp-timeline.png?hl=tr)](https://developers.google.com/search/blog/2023/05/introducing-inp?hl=tr)

Core Web Vitals'ta INP'nin kullanıma sunulması

10 Mayıs 2019, Çarşamba Google'ın Chrome Ekibi, 2020'nin başlarında web sayfalarına yönelik bir kalite sinyalleri paketi sağlamak için Core Web Vitals 'ı kullanıma sunmuştu. Bugün Google Chrome Ekibi, web sayfasındaki kullanıcı deneyiminin kalitesini

10 Mayıs 2023

[![img](https://developers.google.com/static/search/blog/images/social-share-blog.png?hl=tr)](https://developers.google.com/search/blog/2023/04/page-experience-in-search?hl=tr)

Sayfa deneyiminin faydalı içerik oluşturmadaki rolü

19 Nisan 2023, Çarşamba Faydalı içerikler genellikle iyi bir sayfa deneyimi sunar. Bu nedenle bugün, faydalı içerik oluşturma kılavuzumuza sayfa deneyimiyle ilgili bir bölüm ekledik ve sayfa deneyimi hakkındaki yardım sayfamızı düzenledik. Tüm bunlar

19 Nisan 2023

[![img](https://developers.google.com/static/search/blog/images/social-share-blog.png?hl=tr)](https://developers.google.com/search/blog/2021/11/bringing-page-experience-to-desktop?hl=tr)

Sayfa deneyimi sıralamasının masaüstünde kullanılmaya başlanması ile ilgili zaman çizelgesi

4 Kasım 2021, Perşembe I/O 2021'de, sayfa deneyimi sıralamasının masaüstünde de kullanılmasını sağlama planlarımızın önizlemesini gerçekleştirdik. Bugün, değişikliklerin zaman çizelgesi de dahil olmak üzere konuyla ilgili daha fazla ayrıntı

4 Kasım 2021

Daha fazlaexpand_moreAraya giren geçiş reklamları ve iletişim kutularından kaçının

![Araya giren geçiş reklamı örneği](https://developers.google.com/static/search/docs/images/interstitials.png?hl=tr)

Araya giren [geçiş reklamları](https://en.wikipedia.org/wiki/Interstitial_webpage) ve iletişim kutuları, genellikle tanıtım amaçlı olan ancak kullanıcıların içeriği görmesini engelleyen sayfa öğeleridir. Geçiş reklamları, sayfanın tamamında yer paylaşımlı olarak bulunurken iletişim kutuları sayfanın yalnızca bir kısmında yer paylaşımlı olarak gösterilir ve bazen temel içeriğin de görünmesini engeller.

Web sitelerinin genellikle çeşitli nedenlerle iletişim kutuları göstermesi gerekir. Ancak, araya giren geçiş reklamları kullanarak deneyimlerini kesintiye uğratmanız kullanıcıları rahatsız edebilir ve bu kişilerin web sitenize duydukları güven sarsılabilir.

Araya giren iletişim kutuları ve geçiş reklamları, Google'ın ve diğer arama motorlarının içeriğinizi anlamasını zorlaştırır. Bu da arama performansının düşmesine neden olabilir. Aynı şekilde, kullanıcılar sitenizi kullanmakta zorlanırsa arama motorları da dahil olmak üzere bu web sitelerini tekrar ziyaret etmek istemeyebilirler.

## Araya girmeyen iletişim kutuları oluşturun

Araya girmeyen iletişim kutuları oluşturduğunuzda kullanıcılar bir iletişim kutusu nedeniyle kesintiye uğramadan içeriğinize erişebilir. Bu durum uygulama yükleme istemleri de dahil tüm tanıtım amaçlı iletişim kutuları için geçerlidir. Buradaki en iyi uygulamaları hayata geçirerek kullanıcılarınızın sitenizde iyi bir deneyim yaşamalarını sağlayabilir, ayrıca Google Arama'nın site içeriğinizi ve yapısını anlamasına yardımcı olabilirsiniz.

### Geçiş reklamları yerine banner'lar kullanın

![Daha iyi bir kullanıcı deneyimi sunan banner örnekleri](https://developers.google.com/static/search/docs/images/banners-examples.png?hl=tr)

Kullanıcılarınızın dikkatini çekmek için tam sayfa geçiş reklamları yerine ekranın yalnızca küçük bir kısmını kaplayan banner'lar kullanın. Banner'lar, kullanıcıların ve arama motorlarının sayfaya ulaştıklarında içeriğe erişebilmelerini sağlar.

Bu banner'lar çeşitli şekillerde uygulanabilir. Örneğin, uygulama yükleme banner'larında tarayıcı tarafından desteklenen bir banner (Safari'de [Akıllı Uygulama Banner'ları](https://developer.apple.com/library/ios/#documentation/AppleApplications/Reference/SafariWebContent/PromotingAppswithAppBanners/PromotingAppswithAppBanners.html) veya Chrome'da [uygulama içi yükleme deneyimi](https://developers.google.com/web/fundamentals/app-install-banners/native?hl=tr) gibi) kullanabilirsiniz. Diğer bir seçenek de tipik bir küçük reklama benzeyen ve indirme için doğru uygulama mağazasına bağlanan basit bir HTML banner'ı oluşturmaktır. Bu küçük kapsayıcıları, bültene kaydolma istemleri gibi diğer bildirim türleri için yeniden kullanabilirsiniz.

### Ortak kitaplık kullanın

Çoğu içerik yönetim sistemi, en yaygın kullanım alanları (ör. bültene kaydolma istemleri) için standart iletişim kutuları ve geçiş reklamları oluşturan eklentilere sahiptir. Örneğin, WordPress kullanıyorsanız "bültene kaydolma wordpress" şeklinde arama yapın. Eklenti geliştiricileri iyileştirmeleri çok sayıda kullanıcıya aynı anda sunabileceğinden bu tür eklentilerin kullanılması Google, diğer arama motorları ve genel anlamda internet için faydalı olabilir.

### Yaygın hatalardan kaçının

Google Arama'nın içeriğinizi tarayıp anlamasına yardımcı olacak iletişim kutusu veya geçiş reklamı tasarlarken yasal olarak zorunlu olmadığı sürece aşağıdaki gibi sık yapılan hatalardan kaçının:

- Tüm sayfayı geçiş reklamlarıyla kapatmayın.
- Kullanıcı rızasını veya giriş bilgilerini almak için kullanıcıları ayrı bir sayfaya yönlendirmeyin.

## Zorunlu geçiş reklamları

Bazı sitelerin, yayınladıkları içerik türü nedeniyle geçiş reklamı göstermesi gerekir. Örneğin, kumarhane sitelerinde bir geçiş reklamı türü olan yaş sınırlamasının gösterilmesi gerekebilir. Burada kullanıcının içeriğe erişmeden önce yaşını belirtmesi gerekir.

Zorunlu geçiş reklamları bu dokümanda açıklanan yönergelerden muaf olsa da sitelerin mümkün olan durumlarda aşağıdaki en iyi uygulamaları kullanmasını öneririz:

- İçeriğin, geçiş reklamıyla yer paylaştığından emin olun. Böylece Google, içeriğin en azından bir kısmını dizine ekleyip arama sonuçlarında gösterebilecektir.
- Gelen HTTP isteklerini, kullanıcı rızası almak veya veri sağlamak için farklı bir sayfaya yönlendirmeyin. Tüm URL'ler tek bir sayfaya yönlendirildiğinde Googlebot yalnızca bu sayfayı getirebileceğinden ilgili sayfa dışındaki tüm sayfalar arama sonuçlarından kaldırılır.

Yetişkin kullanıcılar için zorunlu bir yaş denetleme kapsamındaki içeriklerde, Googlebot'un içeriğinizi yaş denetlemeyi tetiklemeden taramasına izin vermenizi öneririz. Bunu yapmak için [Googlebot isteklerini doğrulayıp](https://developers.google.com/search/docs/crawling-indexing/verifying-googlebot?hl=tr) içeriği yaş denetleme olmadan yayınlayabilirsiniz.



Bu size yardımcı oldu mu?Google Arama'da imzalı takasları kullanmaya başlama



[İmzalı takaslar](https://web.dev/articles/signed-exchanges?hl=tr) (SXG), kullanıcının gizliliğini korurken Google Arama'nın içeriğinizi önceden getirmesine olanak tanır. Uygulamada bu durum, ilişkili web sitesinin SXG'yi desteklemesi halinde, Google Arama'da gösterilen hem AMP hem de AMP olmayan sonuçların gizliliği koruyacak şekilde birkaç temel kaynağı (ör. HTML, JavaScript, CSS, resimler veya yazı tipleri) önceden getirebileceği anlamına gelir.

Temel kaynaklar zaten kullanılabilir durumda olduğundan, kullanıcı nihayetinde sonucu tıkladığında web sayfası çok daha erken oluşturulmaya başlar. Bu da daha iyi bir kullanıcı deneyimi sağlar. Bu, içeriğinizin daha düşük [Largest Contentful Paint (LCP)](https://web.dev/articles/lcp?hl=tr) puanı almasına neden olabilir. Bu sayede genel [sayfa deneyimini](https://developers.google.com/search/docs/appearance/page-experience?hl=tr) iyileştirebilir.

## SXG'yi uygulama

SXG'yi uygulamak için [web.dev'in ayrıntılı kılavuzundaki](https://web.dev/articles/signed-exchanges?hl=tr#tooling) adımları izleyin. Uygulamadan sonra [Chrome'un İmzalı Takasları kullanarak LCP'yi optimize etme kılavuzundaki](https://developer.chrome.com/blog/optimizing-lcp-using-signed-exchanges?hl=tr) adımları izleyin.

AMP sayfaları için [amp.dev'in ayrıntılı kılavuzundaki](https://amp.dev/documentation/guides-and-tutorials/optimize-and-measure/signed-exchange/) adımları izleyin.

### Google Arama için ek şartlar

Google, içeriğinizi önceden getirmek için SXG önbelleğini kullanır. Google, bu önbelleğe alınan SXG'yi birden çok kez sunabilir.

Google Arama'da güncel içeriklerin gösterildiğinden emin olmak için SXG'nin geçerlilik bitiş değerlerini uygun şekilde ayarlayın. Genel bir kural olarak, geçerlilik bitiş tarihinin aşağıdaki tarihlerden önce bir tarih olduğundan emin olun:

- HTTP üst bilgileriniz tarafından belirlenen önbellek geçerlilik bitiş tarihi
- İçerik, JavaScript veya satır içi JavaScript ise sonraki 1 gün; aksi takdirde sonraki 7 gün

İçeriğin birden fazla cihazda sunulduğunda düzgün görüntülendiğinden emin olmak için aşağıdaki işlemleri yapın:

1. Alışveriş sepetleri gibi kişiselleştirilmiş içeriği, SXG'nin dışındaki geç yüklenen öğelere taşıyın. Alternatif olarak, `Vary: Cookie` imzalı üstbilgi ekleyin. Bu üstbilgiye sahip SXG'ler yalnızca siteniz için çerez barındırmayan ziyaretçilere gösterilir.

2. Sayfaları

    

   duyarlı web tasarımıyla

    

   oluşturun. Alternatif olarak, masaüstü ve mobil sayfaları

    

   ayrı URL'lerde

    

   sunun veya sayfaların duyarlı olmadığını belirtmek amacıyla

    

   `supported-media` `meta` etiketi

    

   kullanarak not ekleyin. Örneğin, sayfanın

    

   ```
   <head>
   ```

    

   öğesine aşağıdaki etiketi ekleyin:

   

   ```
   <meta name=supported-media content="only screen and (max-width: 640px)">
   ```

## SXG'yi izleme ve hata ayıklama

SXG'de hata ayıklamak için kullanabileceğiniz araçların listesini [web.dev'in SXG araçları kılavuzunda](https://web.dev/articles/signed-exchanges?hl=tr#tooling) bulabilirsiniz.

Googlebot bir SXG'yi ayrıştıramadığında, `text/html` değişkenini almak için URL'yi `Accept` başlığında `application/signed-exchange;v=b3` olmadan yeniden tarayabilir. SXG dizine ekleme hatası olması durumunda, Google Arama SXG olmadan orijinal URL'ye bağlantı verir.

AMP sayfalarında [SXG hatalarını](https://support.google.com/webmasters/answer/7450883?hl=tr) izlemek için Search Console'daki [AMP durum raporunu](https://support.google.com/webmasters/answer/7450883?hl=tr#sgx_warning_list) kullanabilirsiniz.

## Google SXG önbelleğinde hata ayıklama

SXG'nin, önbellek şartlarını karşılayıp karşılamadığını belirlemek için [SXG Validator Chrome uzantısını](https://chrome.google.com/webstore/detail/sxg-validator/hiijcdgcphjeljafieaejfhodfbpmgoe?hl=tr) kullanın.

Alternatif olarak, Google SXG önbelleğini doğrudan sorgulayabilirsiniz. Örneğin, SXG URL'si `https://signed-exchange-testing.dev/sxgs/valid.html` ise ilgili önbellek URL'sini şu şekilde oluşturun:

```
https://signed--exchange--testing-dev.webpkgcache.com/doc/-/s/signed-exchange-testing.dev/sxgs/valid.html
```

Alt alan adı ve URL yolu son ekini hesaplama algoritması, [AMP Cache'in algoritmasıyla aynıdır](https://amp.dev/documentation/guides-and-tutorials/learn/amp-caches-and-cors/amp-cache-urls/), ancak iç ek dizesindeki `/doc/-/` farklıdır.

Yanıt bir SXG ise bu, kaynak sunucudan gelen yanıtın Google SXG [önbellek şartlarını](https://github.com/google/webpackager/blob/main/docs/cache_requirements.md) karşıladığı anlamına gelir. Aksi takdirde yanıt, nedeni belirten bir HTTP üst bilgisi içerir.

- Bir `Warning` üst bilgisinin olması, SXG'nin önbellek şartlarını karşılamasını engelleyen bir hata olduğunu gösterir.
- Bir `Location` üst bilgisi varsa henüz önbellek tarafından getirilmemiştir. Bu, SXG'nizde bir hata olduğu anlamına gelmez.

Önbellek, yanıttan bağımsız olarak, güncellenmiş bir kopya için orijinal URL'ye istek gönderir. Bu isteğin ne zaman gerçekleşeceği ve gerçekleşip gerçekleşmeyeceğini belirleyen çeşitli faktörler vardır. Örneğin, Googlebot'un sitenizi ne kadar hızlı tarayabileceği bu faktörlerden biridir.

Google, SXG'leri SXG imzasının `expires` değerinden veya SXG yanıtının imzalanmamış üst bilgilerinin [güncel kalma ömründen](https://datatracker.ietf.org/doc/html/rfc7234#section-4.2.1) daha uzun süre önbellekte tutmaz.

AMP sayfalarında önbelleğe alma hatalarını ayıklamak için [URL Denetleme Aracı](https://support.google.com/webmasters/answer/9012289?hl=tr)'nı kullanabilirsiniz.

## Haberdar olun

Aşağıdaki değişikliklerden haberdar olmak için [webpackaging-announce](https://groups.google.com/g/webpackaging-announce?hl=tr) posta listesine abone olun:

- Google SXG önbelleğinde yeni özellikleri etkinleştiren veya diğer özellikleri kullanımdan kaldıran değişiklikler.
- SXG araçları Web Paketleyici, NGINX SXG modülü ve libsxg'deki önemli değişiklikler.

Google Arama'da SXG hakkında sorularınız varsa [Arama Merkezi Yardım Topluluğu](https://support.google.com/webmasters/community?hl=tr)'nu ziyaret edin.Google Arama sıralama sistemleri kılavuzu



Google, en alakalı ve faydalı sonuçları saliseler içinde sunmak için Arama dizinimizdeki yüz milyarlarca web sayfasına ve diğer içeriklere dair [birçok faktörü ve sinyali dikkate alan](https://www.google.com/search/howsearchworks/how-search-works/ranking-results/?hl=tr) otomatik sıralama sistemleri kullanır. Bu sayfa, önemli sıralama sistemlerimizden bazılarını anlamanıza yardımcı olan bir kılavuzdur. Sorgulara yanıt olarak arama sonuçları oluşturan temel teknolojilerimiz olarak ana sıralama sistemlerimizden bazıları bu kılavuzda açıklanmıştır. Bu kılavuz ayrıca, belirli sıralama gereksinimleriyle ilişkili bazı sistemleri de kapsar.

Sıralama sistemlerimiz, her bir sayfanın nasıl sıralanacağını anlamak için çeşitli sinyalleri ve sistemleri kullanarak sayfa düzeyinde çalışacak şekilde tasarlanmıştır. Site genelindeki sinyaller ve sınıflandırıcılar da kullanılır ve sayfaları anlamamıza katkıda bulunur. Site genelinde iyi sinyallerin olması, sitedeki tüm içeriklerin her zaman üst sıralarda yer alacağı anlamına gelmez. Site genelinde kötü sinyallerin olması da sitedeki tüm içeriklerin her zaman alt sıralarda yer alacağı anlamına gelmez.

[Titiz testler ve değerlendirmelerle](https://www.google.com/search/howsearchworks/how-search-works/rigorous-testing/?hl=tr) bu sistemleri düzenli olarak iyileştirir, içerik üreticiler ve diğerleri için faydalı olabileceği durumlarda [sıralama sistemlerimizde yapılan güncellemeler](https://status.search.google.com/products/rGHU1u87FJnkP6W2GwMi/history?hl=tr) hakkında bilgilendirme yaparız.

Google Arama, dünyadaki bilgileri düzenleyerek herkesin erişebileceği ve faydalanabileceği hale getirme misyonumuzu gerçekleştirmemizi sağlar. Bunun için [sıralama sistemlerimizin](https://www.google.com/search/howsearchworks/how-search-works/ranking-results/?hl=tr) diğer işlemlerle birlikte nasıl çalıştığını anlamak isterseniz [Arama Nasıl Çalışır sitemizi](https://www.google.com/search/howsearchworks/?hl=tr) ziyaret edebilirsiniz.

## BERT

Google'ın kullandığı bir AI sistemi olan Bidirectional Encoder Representations from Transformers ([BERT](https://blog.google/products/search/how-ai-powers-great-search-results/?hl=tr)), kelime kombinasyonlarının nasıl farklı anlamları ve niyetleri ifade edebildiğini anlamamızı sağlıyor.

## Kriz bilgi sistemleri

Kişisel kriz durumları, doğal afetler veya diğer geniş çaplı krizler gibi kriz zamanları için Google, faydalı ve zamanında bilgi sağlayacak sistemler geliştirmiştir:

- **Kişisel kriz:** Sistemlerimiz, kullanıcıların intihar, cinsel saldırı, zehirlenme, toplumsal cinsiyete dayalı şiddet veya uyuşturucu bağımlılığı gibi kişisel kriz durumlarıyla ilgili yaptığı belirli sorguları anlayıp güvenilir kuluşların yardım hatlarını ve paylaştıkları içerikleri gösterir. [Kişisel kriz bilgilerinin Google Arama'da nasıl gösterildiği](https://support.google.com/websearch/answer/9988513?hl=tr) hakkında daha fazla bilgi edinin.
- **Acil Yardım Uyarıları:** Doğal afetler veya geniş çaplı kriz durumları sırasında Acil Yardım Uyarıları sistemimiz yerel, ulusal veya uluslararası makamlardan gelen güncellemeleri gösterir. Bu güncellemeler arasında acil durum telefon numaraları ve web siteleri, haritalar, faydalı olabilecek ifadelerin çevirileri, bağış imkanları ve diğer konular yer alabilir. [Acil Yardım Uyarılarının işleyiş şekli](https://support.google.com/sosalerts/?hl=tr) ile bu uyarıların sel, orman yangını, deprem, kasırga ve diğer felaket zamanlarında yardımcı olan Google [kriz uyarıları](https://crisisresponse.google/forecasting-and-alerts/?hl=tr) kapsamında olması hakkında daha fazla bilgi edinin.

## Tekilleştirme sistemleri

Google'daki aramalarda karşınıza binlerce, hatta milyonlarca eşleşen web sayfası çıkabilir. Bu sayfalardan bazıları birbirine çok benzer olabilir. Böyle durumlarda sistemlerimiz, faydalı olmayan kopya sayfalardan kaçınmak için yalnızca en alakalı sonuçları gösterir. [Tekilleştirmenin nasıl çalıştığı ve tekilleştirme gerçekleştiğinde atlanan sonuçları istediğiniz zaman nasıl görebileceğiniz](https://support.google.com/websearch/answer/9603785?hl=tr) hakkında daha fazla bilgi edinin.

Tekilleştirme, [öne çıkan snippet'lerde](https://support.google.com/websearch/answer/9351707?hl=tr) de gerçekleşir. Bir web sayfası girişi, öne çıkan snippet olacak şekilde yükseltilmişse bu girişi, ilk sonuç sayfasında tekrar göstermeyiz. Bu şekilde sonuçlar daha düzenli hale gelir ve kullanıcılar, alakalı bilgileri daha kolay bulabilir.

## Tam eşleme alan adı sistemi

Sıralama sistemlerimiz, alan adlarındaki kelimeleri, içeriğin bir aramayla alakalı olup olmadığını belirleme kapsamındaki pek çok faktörden biri olarak kabul eder. Bununla birlikte, tam eşleme alan adı sistemimiz, belirli sorgularla tam olarak eşleşmesi için tasarlanmış alan adlarında barındırılan içeriğe gereğinden fazla kredi vermememizi sağlar. Örneğin, birisi "en-iyi-ogle-yemegi-mekanlari" kelimelerini içeren bir alan adı oluşturup alan adındaki tüm bu kelimelerin, sıralamalarda içeriği yukarı çıkaracağını umabilir. Sistemimiz ise buna göre düzenlemeler yapar.

## Güncellik sistemleri

Sorgulara yönelik daha güncel içerikler gösterilmesi beklenen durumlar için tasarlanmış çeşitli "sorgular güncelliği hak eder" konulu sistemimiz vardır. Örneğin, yeni çıkan bir filmle ilgili arama yapan kişi, muhtemelen prodüksiyonun başladığı tarihteki eski haberler yerine son yorumları görmek ister. Bir başka örnek de "deprem" aramasıdır. Bu arama normal zamanda yapıldığında deprem hazırlığı ve kaynaklarla ilgili materyaller gösterilir. Ancak, yakın zamanda bir deprem olduysa haber makaleleri ve daha güncel içerikler gösterilebilir.

## Bağlantı analizi sistemleri ve PageRank

Sayfalar arasındaki bağlantıyı anlayarak bu sayfaların neyle ilgili olduğunu ve bir sorguya yanıt verirken en çok hangi sayfaların yardımcı olabileceğini belirleyen çeşitli sistemlerimiz vardır. Bunlardan biri, Google ilk kullanıma sunulduğunda kullandığımız temel sıralama sistemlerimizden biri olan PageRank'tir. Merak edenler orijinal [PageRank araştırma makalesini](http://infolab.stanford.edu/~backrub/google.html) ve [patentini](https://patents.google.com/patent/US6285999?hl=tr) okuyarak daha fazla bilgi edinebilirler. İlk günden bu yana işleyiş şekli önemli ölçüde değişen PageRank, temel sıralama sistemlerimizin bir parçası olmaya devam etmektedir.

## Yerel haber sistemleri

Alakalı olduğunda yerel haber kaynaklarını tanımlayıp "Başlıca haberler" ve "Yerel haberler" gibi özelliklerimiz [üzerinden gösteren](https://blog.google/products/news/local-news-update-census-mapper/?hl=tr) sistemlerimiz mevcuttur.

## MUM

Multitask Unified Model ([MUM](https://blog.google/products/search/how-ai-powers-great-search-results/?hl=tr)), hem dili anlayabilen hem de dil oluşturabilen bir yapay zeka sistemidir. Şu anda Arama'da genel sıralama için olmasa da [COVID-19 aşı bilgileriyle ilgili aramaları iyileştirmek](https://blog.google/products/search/how-mum-improved-google-searches-vaccine-information/?hl=tr) ve [gösterdiğimiz öne çıkan snippet metinlerini iyileştirmek](https://blog.google/products/search/information-literacy/?hl=tr) gibi özel amaçlarla kullanılıyor.

## Nöral eşleşme

[Nöral eşleşme](https://blog.google/products/search/how-ai-powers-great-search-results/?hl=tr), Google'ın sorgulardaki ve sayfalardaki kavramların temsillerini anlayıp bunları birbiriyle eşleştirmek için kullandığı bir yapay zeka sistemidir.

## Orijinal içerik sistemleri

Yalnızca orijinal içerikten alıntı yapanlardan önce [orijinal haberlerin](https://blog.google/products/search/original-reporting/?hl=tr) gösterilmesi dahil olmak üzere, arama sonuçlarında orijinal içerikleri belirgin bir şekilde göstermemize yardımcı olan sistemlerimiz vardır. İçerik üreticilerin, bir sayfanın birden fazla yerde yinelenmesi halinde asıl sayfanın hangisi olduğunu daha iyi anlamamıza yardımcı olmak için kullanabileceği [standart işaretleme](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls?hl=tr) desteği de bu kapsamdadır.

## Kaldırmaya dayalı sıralama düşürme sistemleri

Google, belirli içerik türlerinin kaldırılmasına izin veren politikalara sahiptir. Belirli bir siteyle ilgili olarak bu türde çok sayıda kaldırma işlemi yaparsak bu durumu sonuçlarımızı iyileştirmek için bir sinyal olarak kullanırız. Özellikle:

- **Yasal nedenlerle kaldırma:** Belirli bir siteyle ilgili olarak [telif hakkı nedeniyle yayından kaldırmaya](https://support.google.com/transparencyreport/answer/7347743?hl=tr) dair çok sayıda geçerli talep aldığımızda, bu siteden diğer içeriklerin sonuçlarımızdaki sıralamasını düşürmek için [bunu kullanabiliriz](https://search.googleblog.com/2012/08/an-update-to-our-search-algorithms.html). Bu sayede, hak ihlalinde bulunan başka bir içerik varsa kullanıcıların bununla karşılaşma olasılığı orijinal içeriğe kıyasla daha düşük olur. İftira, taklit ürünler ve mahkeme kararıyla kaldırma gibi şikayetlere de benzer sıralama düşürme sinyalleri uygularız. Çocukların cinsel istismarı nitelikli materyal (CSAM) söz konusu olduğunda, bu tür içerikleri tespit ettiğimizde her zaman kaldırırız. Ayrıca, çok sayıda CSAM içeriği bulunan sitelerdeki tüm içeriklerin sıralaması düşürülür.
- **Kişisel bilgileri kaldırılma:** [Çıkar amaçlı içerik kaldırma uygulamalarına](https://support.google.com/websearch/answer/9172218?hl=tr) sahip bir siteyle ilgili olarak çok sayıda kişisel bilgi kaldırma işlemi yaparsak bu sitedeki diğer içeriklerin sonuçlarımızdaki sıralamasını düşürürüz. Ayrıca, diğer sitelerde de aynı davranış kalıbının görülüp görülmediğini [araştırırız](https://blog.google/products/search/improving-search-better-protect-people-harassment/?hl=tr). Görülüyorsa bu sitelerdeki içeriklerin de sıralamasını düşürürüz. [Kişisel bilgi toplama içeriği](https://support.google.com/websearch/answer/9673730?hl=tr), [izinsiz oluşturulan veya paylaşılan uygunsuz kişisel görüntüler](https://support.google.com/websearch/answer/6302812?hl=tr) ya da [izinsiz oluşturulan/yayınlanan uygunsuz sahte içerikler](https://support.google.com/websearch/answer/9116649?hl=tr) barındıran çok sayıda içerik için kaldırma talebinin gönderildiği sitelerde de benzer şekilde sıralamayı düşürebiliriz.

## Pasaj sıralaması sistemi

[Pasaj sıralaması](https://www.blog.google/products/search/search-on/?hl=tr), bir web sayfasının aramayla ne kadar alakalı olduğunu daha iyi anlamak için sayfanın bölümlerini veya "pasajlarını" tanımlamak üzere kullandığımız bir yapay zeka sistemidir.

## RankBrain

[RankBrain](https://blog.google/products/search/how-ai-powers-great-search-results/?hl=tr), kelimelerin kavramlarla ilişkisini anlamamıza yardımcı olan bir yapay zeka sistemidir. Diğer bir deyişle, içeriğin diğer kelimeler ve kavramlarla ilgisini anlayarak, aramada kullanılan tüm kelimeleri tam olarak içermese bile alakalı içerikleri döndürmemize katkı sağlar.

## Güvenilir bilgi sistemleri

Birden çok sistem, mümkün olan en güvenilir bilgileri göstermek için çeşitli şekillerde çalışır. Örneğin, [yetkili sayfaların gösterilmesini sağlayıp düşük kaliteli içeriklerin sıralamasını düşürür](https://blog.google/products/search/our-latest-quality-improvements-search/?hl=tr) ve [kaliteli haberciliğin sıralamasını yükseltir](https://blog.google/outreach-initiatives/google-news-initiative/elevating-quality-journalism/?hl=tr). Güvenilir bilgilerin olmadığı durumlarda sistemlerimiz, hızla değişen konularla ilgili veya sistemlerimizin arama için gösterilen sonuçlardaki genel kaliteye yeterince güvenmediği durumlarda otomatik olarak [içerik önerileri](https://blog.google/products/search/information-literacy/?hl=tr) gösterir. Bunlar, daha faydalı sonuçlara ulaşacak şekilde nasıl arama yapacağınıza dair ipuçları sağlar. [Arama'da yüksek kaliteli bilgi sağlama yaklaşımımız](https://blog.google/products/search/how-google-delivers-reliable-information-search/?hl=tr) hakkında daha fazla bilgi edinin.

## Yorum sistemi

[Yorum sistemi](https://developers.google.com/search/updates/reviews-update?hl=tr), detaylı analiz ve özgün araştırma sunan, konuyu iyi bilen uzmanlar ya da meraklılar tarafından yazılmış yüksek kaliteli yorumlara sahip içeriği daha iyi ödüllendirmeyi amaçlar.

## Site çeşitliliği sistemi

Site çeşitliliği sistemimiz, en iyi sonuçlarımızda genellikle aynı sitenin ikiden fazla web sayfası girişini göstermememizi sağlar. Bu nedenle, en iyi sonuçların tamamına tek bir site hakim olmaz. Ancak, sistemlerimizin belirli bir arama için özellikle alakalı olduğunu belirlediği durumlarda yine de ikiden fazla giriş gösterebiliriz. Site çeşitliliği genellikle alt alan adlarını, bir kök alanın parçası olarak görür. Yani, bir alt alan adından (subdomain.example.com) ve kök alandan (example.com) gelen tüm girişlerin, aynı siteye ait olduğu kabul edilir. Bununla birlikte, bazen alt alan adları alakalı olduğu düşünüldüğünde çeşitlilik amacıyla ayrı siteler olarak değerlendirilir.

## Spam algılama sistemleri

Hiç kimse e-posta gelen kutusunun spam dolu olmasını istemez. Bu nedenle spam filtreleri çok yararlıdır. İnternette yüksek oranda spam olması nedeniyle Arama da benzer bir güçlükle karşı karşıyadır. Bu spam içeriklerle mücadele edilmediğinde, en yararlı ve alakalı sonuçları göstermemiz mümkün olmaz. [Spam politikalarımızı](https://developers.google.com/search/docs/essentials/spam-policies?hl=tr) ihlal eden içeriklerle ve davranışlarla mücadele etmek için [SpamBrain](https://developers.google.com/search/blog/2022/04/webspam-report-2021?hl=tr) dahil olmak üzere çeşitli [spam algılama sistemleri](https://www.google.com/search/howsearchworks/how-search-works/detecting-spam/?hl=tr) kullanıyoruz. Bu sistemler, spam tehdidinin en yeni biçimleriyle başa çıkabilmek için düzenli olarak [güncellenir](https://developers.google.com/search/updates/spam-updates?hl=tr).

## Kullanımdan kaldırılan sistemler

Aşağıdaki sistemler, geçmişe dönük bilgi amacıyla belirtilmiştir. Bunlar, ardından gelen sistemlere dahil edilmiş veya temel sıralama sistemlerimizin bir parçası haline getirilmişlerdir.

### Faydalı içerik sistemi

[2022'de duyuruldu](https://developers.google.com/search/blog/2022/08/helpful-content-update?hl=tr): "Faydalı İçerik Güncellemesi"nde olduğu gibi bu da sistem tarafından tasarlanmış olup kişiler tarafından yazılan orijinal, faydalı içeriğin daha iyi görülebilmesini sağlar. Bu şekilde kullanıcılar, arama sonuçlarında gösterilen ve öncelikli amacı arama motoru trafiğini artırmak olan içerikten ziyade diğer kullanıcıların oluşturdukları içerikleri görebilirler. Bu sistem zamanla gelişti ve kullanıcılara faydalı sonuçlar sunmak için sistemlerimiz çeşitli sinyal ve sistemler kullandığından, Mart 2024'te temel sıralama sistemlerimizin [bir parçası haline geldi](https://developers.google.com/search/blog/2024/03/core-update-spam-policies?hl=tr).

### Hummingbird

Bu, Ağustos 2013'te genel sıralama sistemlerimizde yapılan önemli bir iyileştirmeydi. Bunun ardından sıralama sistemlerimiz, öncesinde olduğu gibi gelişmeye devam etti.

### Panda sistemi

Bu, arama sonuçlarımızda yüksek kaliteli ve orijinal içeriklerin görünmesini sağlamak üzere tasarlanmış bir sistemdi. "Panda" takma adıyla [2011'de duyurulan](https://googleblog.blogspot.com/2011/02/finding-more-high-quality-sites-in.html) bu sistem zaman içinde gelişerek 2015 yılında temel sıralama sistemlerimizin bir parçası haline geldi.

### Penguen sistemi

Bu, bağlantı spam'i ile mücadele etmek için tasarlanmış bir sistemdi. "Penguen Güncellemesi" takma adıyla [2012'de duyurulan](https://developers.google.com/search/blog/2012/04/another-step-to-reward-high-quality?hl=tr) bu sistem 2016'da temel sıralama sistemlerimize [entegre edilmiştir](https://developers.google.com/search/blog/2016/09/penguin-is-now-part-of-our-core?hl=tr).oogle Arama'da yorumlar güncellemesi ve web siteniz



*Yorum sistemi*, detaylı analiz ve özgün araştırma sunan, konuyu iyi bilen uzmanlar ya da meraklılar tarafından yazılmış yüksek kaliteli yorumları daha iyi ödüllendirmeyi amaçlar. Bu sayfada, yorumlar sisteminin nasıl çalıştığı ve içeriğinizi değerlendirip iyileştirmek için neler yapabileceğiniz hakkında daha fazla bilgi verilmektedir.

## Yorum sisteminin işleyiş şekli

Yorum sistemi, kullanıcıların çok sayıda ürünü, hizmeti veya diğer konuları özetleyen düşük kaliteli veya yüzeysel içerikler yerine ayrıntılı araştırmalar paylaşan yorumlar görmesini sağlar. Yorum sistemi düzenli olarak ve devamlı bir şekilde iyileştirilir.

Yorum sistemi; öneri sunmak, görüş belirtmek veya analiz sağlamak amacıyla yazılan makaleleri, blog yayınlarını, sayfaları ya da birinci taraf bağımsız içerikleri değerlendirmek için tasarlanmıştır. Ürün veya hizmet sayfasının yorumlar bölümünde kullanıcılar tarafından yayınlananlar gibi üçüncü taraf yorumları değerlendirmez.

Yorumlar tek bir konuyu, bire bir karşılaştırmaları ya da önerilerin sıralanmış listelerini içerebilir. Yorumlar herhangi bir konu hakkında yazılabilir. Dizüstü bilgisayar veya kışlık ceket gibi ürünlerin yanı sıra medya içerikleri (ör. film veya video oyunu) ya da hizmetler veya işletmeler (ör. restoran veya moda markası) hakkında yorum yazılabilir.

Yorum sistemi, yorum içeriğini öncelikle sayfa düzeyinde değerlendirir. Bununla birlikte, önemli miktarda yorum içeriğine sahip siteler söz konusu olduğunda bu sistem, sitedeki tüm içeriği değerlendirebilir. Çok sayıda yorumunuz yoksa büyük olasılıkla site genelinde bir değerlendirme yapılmaz.

Bu sistem dünya genelinde şu diller için geçerlidir: İngilizce, İspanyolca, Almanca, Fransızca, İtalyanca, Vietnamca, Endonezce, Rusça, Felemenkçe, Portekizce, Lehçe.

Ürünler söz konusu olduğunda [ürün yapılandırılmış verileri](https://developers.google.com/search/docs/appearance/structured-data/product?hl=tr) bir yorumun ürün yorumu olup olmadığını daha iyi tanımlamamıza yardımcı olabilir, ancak sadece bu verilere bağlı kalmayız.

## Bu sistem, sitem için ne anlama geliyor?

Yorumlar sisteminde başarılı olan içerikler oluşturma hakkında daha fazla bilgi edinmek için [yüksek kaliteli yorumlar yazmayla ilgili yardım sayfamıza](https://developers.google.com/search/docs/specialty/ecommerce/write-high-quality-reviews?hl=tr) bakın.

Yorum sisteminden etkilenen içerikler, iyileştirmeler yapmanız durumunda zamanla kurtarılabilir. Ancak otomatik olarak gerçekleştirilen yorum içeriği değerlendirmemizin, içerik sıralamasında kullanılan birçok faktörden sadece biri olduğunu, dolayısıyla her an farklı nedenlerle değişiklik yapılabileceğini unutmayın.Google Search Status Dashboard

This page provides status information on the services that are part of Google Search. Check back here to view the current status of the services listed below. If you are experiencing an issue not listed here, please [contact Support](https://developers.google.com/search/help). Learn more about what's posted on the dashboard in [this FAQ](https://developers.google.com/search/help/status-dashboard). For additional information on these services, please visit https://developers.google.com/search/help/status-dashboard.

- Available
- Service information
- Service disruption
- Service outage

## All incidents reported for Ranking

## 2025

| Summary                                                      | Date        | Duration          |
| :----------------------------------------------------------- | :---------- | :---------------- |
| [December 2025 core update](https://status.search.google.com/incidents/DsirqJ1gpPRgVQeccPRv) | 11 Dec 2025 | 18 days, 2 hours  |
| [August 2025 spam update](https://status.search.google.com/incidents/a7Aainy6E9rZsmfq82xt) | 26 Aug 2025 | 26 days, 15 hours |
| [June 2025 core update](https://status.search.google.com/incidents/riq1AuqETW46NfBCe5NT) | 30 Jun 2025 | 16 days, 18 hours |
| [March 2025 core update](https://status.search.google.com/incidents/zpmwuSwifjDjfrVdaZUx) | 13 Mar 2025 | 13 days, 21 hours |



## 2024

| Summary                                                      | Date        | Duration          |
| :----------------------------------------------------------- | :---------- | :---------------- |
| [December 2024 spam update](https://status.search.google.com/incidents/UUq2WSouY7PhSm8zvtD1) | 19 Dec 2024 | 7 days, 2 hours   |
| [December 2024 core update](https://status.search.google.com/incidents/V9nDKuo6nWKh2ThBALgA) | 12 Dec 2024 | 6 days, 4 hours   |
| [November 2024 core update](https://status.search.google.com/incidents/G7rp11wqTaTGn6JjiPF3) | 11 Nov 2024 | 23 days, 13 hours |
| [Ranking is experiencing an ongoing issue.](https://status.search.google.com/incidents/42XCLGtpuCZkzqe4dc6S) | 15 Aug 2024 | 4 days, 11 hours  |
| [August 2024 core update](https://status.search.google.com/incidents/gVx6b2o78zke7GrMidGy) | 15 Aug 2024 | 19 days, 4 hours  |
| [June 2024 spam update](https://status.search.google.com/incidents/QdUeCQx3LRVbzQ3E7FiD) | 20 Jun 2024 | 7 days, 1 hour    |
| [March 2024 spam update](https://status.search.google.com/incidents/iXz2PJfodvyjaVUeqxZE) | 5 Mar 2024  | 14 days, 21 hours |
| [March 2024 core update](https://status.search.google.com/incidents/1jW2F89qC2NxJBWGiKxE) | 5 Mar 2024  | 45 days           |



## 2023

| Summary                                                      | Date        | Duration          |
| :----------------------------------------------------------- | :---------- | :---------------- |
| [November 2023 reviews update](https://status.search.google.com/incidents/VqRTcmyQCwfpuYeaVNfn) | 8 Nov 2023  | 29 days           |
| [November 2023 core update](https://status.search.google.com/incidents/WtY1CQgfqrr2cjxKbyUk) | 2 Nov 2023  | 25 days, 21 hours |
| [October 2023 core update](https://status.search.google.com/incidents/VKyoS53ULWzSp8BoDxqk) | 5 Oct 2023  | 13 days, 23 hours |
| [Ranking is experiencing an ongoing issue](https://status.search.google.com/incidents/fCUAy6TvbDMkkLAGcwkj) | 5 Oct 2023  | 26 days           |
| [October 2023 spam update](https://status.search.google.com/incidents/NzcEhGMDhbQEdXCS35xL) | 4 Oct 2023  | 15 days, 12 hours |
| [September 2023 helpful content update](https://status.search.google.com/incidents/53diuQvcEsgzqXTPBb8p) | 14 Sep 2023 | 13 days, 11 hours |
| [August 2023 core update](https://status.search.google.com/incidents/nBtYtBeex4GYBbdDS2LX) | 22 Aug 2023 | 16 days, 3 hours  |
| [April 2023 reviews update](https://status.search.google.com/incidents/5XRfC46rorevFt8yN8iR) | 12 Apr 2023 | 13 days, 2 hours  |
| [March 2023 core update](https://status.search.google.com/incidents/Cou8Tr74r7EXNthuEsaG) | 15 Mar 2023 | 13 days, 7 hours  |
| [February 2023 product reviews update](https://status.search.google.com/incidents/NDjZ11MEUJb5i62hy5aN) | 21 Feb 2023 | 14 days           |



## 2022

| Summary                                                      | Date        | Duration |
| :----------------------------------------------------------- | :---------- | :------- |
| [December 2022 link spam update](https://status.search.google.com/incidents/CxXUEK28vCKqkNocPhKR) | 14 Dec 2022 | 29 days  |
| [December 2022 helpful content update](https://status.search.google.com/incidents/XMdX5PmbMvKW4fv3CRvn) | 5 Dec 2022  | 38 days  |
| [October 2022 spam update](https://status.search.google.com/incidents/SAeYuxVSo39HHotQNXHr) | 19 Oct 2022 | 2 days   |
| [September 2022 product reviews update](https://status.search.google.com/incidents/ZYwuBXDhkwaoop2V5epM) | 20 Sep 2022 | 6 days   |
| [September 2022 core update](https://status.search.google.com/incidents/Y2Cg5k2xLJvfNqR58kEt) | 12 Sep 2022 | 14 days  |
| [August 2022 helpful content update](https://status.search.google.com/incidents/sbKc4YSptrSxcUZFDKwU) | 25 Aug 2022 | 15 days  |
| [July 2022 product reviews update](https://status.search.google.com/incidents/Xiid524od7fpCak86sNS) | 27 Jul 2022 | 6 days   |
| [May 2022 core update](https://status.search.google.com/incidents/GHwLLtDS64a7nDng8xhD) | 25 May 2022 | 15 days  |
| [March 2022 product reviews update](https://status.search.google.com/incidents/iYWoNu4QXRsQUrzxrbLv) | 23 Mar 2022 | 14 days  |
| [Page experience update for desktop](https://status.search.google.com/incidents/zDCQR5mxLU3ZrQeQvwqN) | 22 Feb 2022 | 9 days   |



## 2021

| Summary                                                      | Date        | Duration                                                     |
| :----------------------------------------------------------- | :---------- | :----------------------------------------------------------- |
| [December 2021 product reviews update](https://status.search.google.com/incidents/hgwP7ei5H1uKbYSeZrBZ) | 1 Dec 2021  | 20 days                                                      |
| [November 2021 core update](https://status.search.google.com/incidents/FncPfR7zRSZ3diemah4o) | 17 Nov 2021 | 13 days                                                      |
| [November 2021 spam update](https://status.search.google.com/incidents/AFdXceQVsh1GEfKFvHyD) | 3 Nov 2021  | 8 days, 1 hour                                               |
| [July 2021 link spam update](https://status.search.google.com/incidents/Gdx4pqurY2txYSQHD3Qp) | 26 Jul 2021 | 29 days                                                      |
| [July 2021 core update](https://status.search.google.com/incidents/m5jTNRjtTpWPjmkWDKP6) | 1 Jul 2021  | 11 days                                                      |
| [June 2021 spam update](https://status.search.google.com/incidents/hPHsygfNsCazcqZWPzBX) | 28 Jun 2021 | 23 hours, 59 minutes                                         |
| [June 2021 spam update](https://status.search.google.com/incidents/ksdhue6JuzLVA7ECzhKs) | 23 Jun 2021 | 23 hours, 59 minutes                                         |
| [Page experience update for mobile](https://status.search.google.com/incidents/wuEeJr1LcKBjYYuGmLar) | 15 Jun 2021 | 79 days                                                      |
| [June 2021 core update](https://status.search.google.com/incidents/VHYebUFaMwLuCKC2ecD1) | 2 Jun 2021  | 10 days                                                      |
| [April 2021 product reviews update](https://status.search.google.com/incidents/XpAy5zGc6VS78tDGbMaP) | 8 Apr 2021  | 14 daysoogle Arama'daki temel güncellemeler ve web sitenizGoogle Arama'ya site adı sağlama |

# Google Arama'ya site adı sağlama



Google bir sayfayı arama sonuçlarında listelediğinde, sayfanın alındığı sitenin adını gösterir. Buna site adı denir. Site adının, her sayfada yer alan [başlık bağlantılarından](https://developers.google.com/search/docs/appearance/title-link?hl=tr) farklı olduğunu unutmayın (başlık bağlantıları her web sayfasına özeldir, site adı ise sitenin tamamı için geçerlidir).

<svg aria-labelledby="svg-site-name" direction="ltr" viewBox="0 0 800 250" xlink="https://www.w3.org/1999/xlink" xmlns="https://www.w3.org/2000/svg" style="color: rgb(32, 33, 36); font-family: Roboto, &quot;Noto Sans&quot;, &quot;Noto Sans JP&quot;, &quot;Noto Sans KR&quot;, &quot;Noto Naskh Arabic&quot;, &quot;Noto Sans Thai&quot;, &quot;Noto Sans Hebrew&quot;, &quot;Noto Sans Bengali&quot;, sans-serif; font-size: 16px; font-style: normal; font-variant-ligatures: normal; font-variant-caps: normal; font-weight: 400; letter-spacing: normal; orphans: 2; text-align: start; text-indent: 0px; text-transform: none; widows: 2; word-spacing: 0px; -webkit-text-stroke-width: 0px; white-space: normal; background-color: rgb(255, 255, 255); text-decoration-thickness: initial; text-decoration-style: initial; text-decoration-color: initial;"><image width="100%" y="0%" href="https://developers.google.com/search/docs/images/blank-site-name.png?hl=tr"></image><foreignObject height="80" width="600" x="130" y="30"><p class="hide-from-toc no-link" xmlns="https://www.w3.org/1999/xhtml" style="box-sizing: inherit; margin: 0px; padding: 1rem 0px; font: 400 24px / 32px &quot;Google Sans&quot;, &quot;Noto Sans&quot;, &quot;Noto Sans JP&quot;, &quot;Noto Sans KR&quot;, &quot;Noto Naskh Arabic&quot;, &quot;Noto Sans Thai&quot;, &quot;Noto Sans Hebrew&quot;, &quot;Noto Sans Bengali&quot;, sans-serif;">Yanmış Tost</p></foreignObject><foreignObject height="80" width="600" x="50" y="100"><p class="hide-from-toc no-link" xmlns="https://www.w3.org/1999/xhtml" style="box-sizing: inherit; margin: 0px; padding: 1rem 0px; font: 400 20px / 28px &quot;Google Sans&quot;, &quot;Noto Sans&quot;, &quot;Noto Sans JP&quot;, &quot;Noto Sans KR&quot;, &quot;Noto Naskh Arabic&quot;, &quot;Noto Sans Thai&quot;, &quot;Noto Sans Hebrew&quot;, &quot;Noto Sans Bengali&quot;, sans-serif;"><a class="external-link" href="https://wikipedia.org/wiki/Toast_(food)" style="box-sizing: inherit; color: rgb(26, 115, 232); outline: 0px; text-decoration: rgb(26, 115, 232); word-break: break-word;">Tavada nasıl tost yapılır?</a></p></foreignObject></svg>



## Özelliğin kullanılabilirliği

Site adları, hem mobil cihazlar hem de masaüstü için Google Arama'nın kullanılabildiği tüm dillerde kullanılabilir. Site adları; alan adı ve alt alan adı düzeyindeki sitelerde görünebilir ([teknik yönergelere](https://developers.google.com/search/docs/appearance/site-names?hl=tr#technical-guidelines) göz atarak daha fazla bilgi edinebilirsiniz).

## Google Arama'daki site adları nasıl oluşturulur?

Google Arama sonuçları sayfasındaki site adları tamamen otomatik olarak oluşturulur. Bu bağlantılar oluşturulurken sitenin ana sayfasındaki içerikler ve o sayfa için web’de görünen referanslar göz önünde bulundurulur. Google Arama'daki site adının amacı, her sonucun kaynağını en iyi şekilde temsil edip açıklamaktır.

Site adı tercihinizi belirtmek için ana sayfanıza [`WebSite` yapılandırılmış verileri](https://developers.google.com/search/docs/appearance/site-names?hl=tr#website) ekleyin. Site adı sistemimizde `og:site_name`, `<title>`, başlık öğeleri ve ana sayfadaki diğer metinlerde yer alan içerikler de dikkate alınır. Ancak bir tercih belirtmek istiyorsanız `WebSite` yapılandırılmış verileri en önemlisidir.

Otomatik olarak seçilen site adlarını manuel olarak değiştiremesek de birincil tercihiniz seçili olmadığında otomatik sistemimizin göz önünde bulunduracağı [alternatifler belirtebilirsiniz](https://developers.google.com/search/docs/appearance/site-names?hl=tr#alternative).

## Site adınızı seçme

- Sitenizin kimliğini doğru şekilde yansıtan ve kullanıcıları yanıltmayan **benzersiz bir ad seçin**. Seçtiğiniz ad [Arama içerik politikalarına](https://support.google.com/websearch/answer/10622781?hl=tr) uygun olmalıdır.
- Siteniz için **kısa ve yaygın olarak bilinen bir ad kullanın** (örneğin, "Google, Inc" yerine "Google"). Site adının uzunluğuyla ilgili herhangi bir sınır olmasa da bazı cihazlarda uzun site adları kesilebilir.
- **Genel bir ad kullanmaktan kaçının**. Sistemimiz, "İzmir'deki En İyi Diş Hekimleri" gibi genel bir adı, çok iyi bilinen bir marka adı olmadığı sürece site adı olarak seçmez.
- **Sitenizin adını ana sayfanızda tutarlı bir şekilde kullanın**. Yapılandırılmış verilerde kullandığınız site adı, sistemimizin dikkate aldığı ana sayfanızdaki [diğer kaynaklarda](https://developers.google.com/search/docs/appearance/site-names?hl=tr#sources) belirttiğiniz site adıyla tutarlı olmalıdır.
- **Alternatif bir ad girin**. Site adı sistemimiz, tercih ettiğiniz site adını kullanmaya çalışsa da bazı durumlarda bu ad kullanılamaz. Örneğin, sistemimiz genellikle doğası gereği küresel olan iki farklı site için aynı site adını kullanmaz. Diğer durumlarda sistemimiz, bir sitenin tam adından ziyade kısaltmasıyla tanındığını belirleyebilir. Tercih ettiğiniz seçenek belirtilmezse `alternateName` özelliğini kullanarak alternatif bir ad belirtilmesi, Google'ın diğer seçenekleri dikkate almasına olanak tanır.

## Yapılandırılmış verileri kullanarak site adı ekleme



Yapılandırılmış veri, bir sayfa hakkında bilgi sağlamak ve sayfa içeriğini sınıflandırmak için kullanılan standart bir biçimdir. Yapılandırılmış veri konusunda yeniyseniz [yapılandırılmış verinin nasıl çalıştığı](https://developers.google.com/search/docs/appearance/structured-data/intro-structured-data?hl=tr) hakkında daha fazla bilgi edinebilirsiniz.

Bu bölümde teknik yönergeler ve zorunlu özelliklerinden bahsedilmekte, ayrıca site adı yapılandırılmış verilerinin nasıl ekleneceği ve test edileceği ele alınmaktadır.

**İYS'mi kullanıyorsunuz?** İYS'nize entegre edilmiş bir eklenti kullanmak daha kolay olabilir.
**JavaScript mi kullanıyorsunuz?** [JavaScript ile yapılandırılmış verilerin nasıl oluşturulacağını](https://developers.google.com/search/docs/appearance/structured-data/generate-structured-data-with-javascript?hl=tr) öğrenin.

### Yönergeleri uygulayın

Google'ın site adınızı daha iyi anlamasına yardımcı olmak için [Arama Yönergeleri](https://developers.google.com/search/docs/essentials?hl=tr), [yapılandırılmış verilerle ilgili genel yönergeler](https://developers.google.com/search/docs/appearance/structured-data/sd-policies?hl=tr), [site adınızı seçme](https://developers.google.com/search/docs/appearance/site-names?hl=tr#choosing-site-name) ile ilgili yönergeler ve aşağıdaki teknik yönergeleri uygulayın:

#### Teknik yönergeler

- **Site başına yalnızca bir ad:** Google Arama şu anda site başına yalnızca bir site adını desteklemektedir. Buradaki *site*, alan adıyla veya alt alan adıyla tanımlanmaktadır. Google Arama, site adlarını alt dizin düzeyinde desteklemez. `www` veya `m` ile başlayan alt alan adlarının genellikle eşdeğer kabul edildiğini unutmayın.
  **Desteklenir**: `https://example.com` (bu, alan adı düzeyinde bir ana sayfadır)
  **Desteklenir**: `https://www.example.com` (bu, ayrıca alan adı düzeyinde ana sayfa olarak değerlendirilir)
  **Desteklenir**: `https://m.example.com` (bu, ayrıca alan adı düzeyinde ana sayfa olarak değerlendirilir)
   **Desteklenir**: `https://news.example.com` (bu, alan adı düzeyinde bir ana sayfadır)
  **Desteklenmez**: `https://example.com/news` (bu, alt dizin düzeyinde bir ana sayfadır)
- **Yapılandırılmış veriler, bir sitenin ana sayfasında olmalıdır:** [`WebSite` yapılandırılmış verileri](https://developers.google.com/search/docs/appearance/site-names?hl=tr#website), sitenin ana sayfasında olmalıdır. Ana sayfa, alan adı veya alt alan adı düzeyindeki kök URI'sını ifade eder. Örneğin, `https://example.com` alan adının ana sayfası iken `https://example.com/de/index.html` ana sayfa değildir.**Not**: Alt alan adının ana sayfasında yapılandırılmış veri yoksa alan adı düzeyindeki site adı, alt alan adıiçin yedek olarak kullanılabilir.
- **Ana sayfa Google tarafından taranabilir olmalıdır:** Ana sayfanızdaki içeriğe [engellendiği](https://developers.google.com/search/docs/crawling-indexing/control-what-you-share?hl=tr) için erişimimiz yoksa site adı oluşturamayabiliriz.
- **Kopya ana sayfaları olan siteler:** Aynı içerik için kopya ana sayfalarınız varsa (örneğin, ana sayfanızın HTTP ve HTTPS sürümleri ya da www ve www olmayan sürümleri) yalnızca standart sayfada değil, tüm sayfa kopyalarında aynı yapılandırılmış verileri kullandığınızdan emin olun.
- **`WebSite` yapılandırılmış verileri sitenizde mevcutsa** site adı özelliklerini aynı düğüme yerleştirdiğinizden emin olun. Başka bir deyişle, mümkünse ana sayfanızda fazladan bir `WebSite` yapılandırılmış veri bloğu oluşturmaktan kaçının.

### Zorunlu site adı özelliklerini ekleme

Zorunlu özellikleri, web sitenizin ana sayfasına JSON-LD, RDFa veya mikro veri biçiminde ekleyin. Bu işaretlemeyi sitenizin her sayfasına değil, yalnızca ana sayfasına eklemeniz gerekir.

| Zorunlu özellikler |                                                              |
| :----------------- | ------------------------------------------------------------ |
| `name`             | `Text`Web sitesinin adı. Adın, [site adınızı seçme ile ilgili yönergelere](https://developers.google.com/search/docs/appearance/site-names?hl=tr#choosing-site-name) uyduğundan emin olun. |
| `url`              | `URL`Site ana sayfasının URL'si. Bu URL'yi, sitenizin alan adının veya alt alan adının [standart](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls?hl=tr) ana sayfasına ayarlayın. Örneğin, `https://example.com/` veya `https://news.example.com/` |

Aşağıda, zorunlu alanları içeren `WebSite` yapılandırılmış verilerinin bir örneği verilmiştir:

[JSON-LD](https://developers.google.com/search/docs/appearance/site-names?hl=tr#json-ld)[Mikro veri](https://developers.google.com/search/docs/appearance/site-names?hl=tr#mikro-veri)

```
<html>
  <head>
    <title>Example: A Site about Examples</title>
    <script type="application/ld+json">
    {
      "@context" : "https://schema.org",
      "@type" : "WebSite",
      "name" : "Example",
      "url" : "https://example.com/"
    }
  </script>
  </head>
  <body>
  </body>
</html>
```

### Alternatif bir site adı ekleme

Site adınızın alternatif bir sürümünü (örneğini kısaltma veya daha kısa bir ad) sağlamak isterseniz bunu `alternateName` özelliğini ekleyerek yapabilirsiniz. Bu işlem isteğe bağlıdır.

| Önerilen özellikler |                                                              |
| :------------------ | ------------------------------------------------------------ |
| `alternateName`     | `Text`Varsa web sitesinin alternatif adı (örneğin, sitenizle ilgili yaygın olarak bilinen bir kısaltma veya daha kısa bir ad varsa). Adın, [site adınızı seçme ile ilgili yönergelere](https://developers.google.com/search/docs/appearance/site-names?hl=tr#choosing-site-name) uyduğundan emin olun.Birden fazla alternatif ad belirtebilirsiniz. Bu adları, en önemli olan ilk sırada olacak şekilde tercihinize göre belirtin. Örneğin:`<script type="application/ld+json">  {    "@context": "https://schema.org",    "@type": "WebSite",    "name": "Burnt Toast",    **"alternateName": ["BT", "B-T", "Burnt Toast Shop"],**    "url": "https://www.example.com/"  } </script>` |

Aşağıda, tüm zorunlu ve önerilen alanları içeren `WebSite` yapılandırılmış verilerine ait bir örnek verilmiştir:

[JSON-LD](https://developers.google.com/search/docs/appearance/site-names?hl=tr#json-ld)[Mikro veri](https://developers.google.com/search/docs/appearance/site-names?hl=tr#mikro-veri)

```
<html>
  <head>
    <title>Example: A Site about Examples</title>
    <script type="application/ld+json">
    {
      "@context" : "https://schema.org",
      "@type" : "WebSite",
      "name" : "Example Company",
      "alternateName" : "EC",
      "url" : "https://example.com/"
    }
  </script>
  </head>
  <body>
  </body>
</html>
```

### Yapılandırılmış verileri test etme

1. Söz dizimi hatası olmadığından emin olmak için işaretlemenizi bir şema test aracıyla doğrulayın. Bunun için örneğin [Şema İşaretleme Doğrulayıcı](https://validator.schema.org/)'yı kullanabilirsiniz. Site adları, Zengin Sonuçlar Testi'nde desteklenmez.
2. Google'ın sayfayı nasıl gördüğünü test etmek için [URL Denetleme aracını](https://support.google.com/webmasters/answer/9012289?hl=tr) kullanın. Google'ın ana sayfanıza erişebildiğinden ve bir robots.txt dosyası, `noindex` veya giriş yapma zorunluluğu tarafından engellenmediğinden emin olun.
3. Sayfa düzgün görünüyorsa [Google'dan URL'lerinizi yeniden taramasını isteyebilirsiniz](https://developers.google.com/search/docs/crawling-indexing/ask-google-to-recrawl?hl=tr).Yeniden tarama ve yeniden dizine ekleme için zaman tanıyın. Google’ın, bir sayfayı yayınlandıktan sonra bulmasının ve taramasının birkaç gün ile birkaç hafta arasında sürebileceğini unutmayın.

## Tercih ettiğiniz site adı seçili değilse yapmanız gerekenler 

Sistemimiz genellikle, belirtildiğinde `WebSite` yapılandırılmış verilerindeki tercih edilen bir site adını kullanmaya çalışır. Ancak, sistemimiz sağladığınız ada daha az güvenirse bazen [diğer kaynakları](https://developers.google.com/search/docs/appearance/site-names?hl=tr#sources) kullanarak site adları oluşturabilir veya bir alan adını ya da alt alan adını gösterebilir.

Tercih ettiğiniz site adı otomatik sistemimiz tarafından seçilmezse aşağıdaki adımları deneyin:

1. Aşağıdakileri doğrulayın:
   - Ana sayfanızdaki [`WebSite` yapılandırılmış verileri](https://developers.google.com/search/docs/appearance/site-names?hl=tr#website) içinde yer alan site adı, siteniz için tercih edilen addır.
   - `WebSite` yapılandırılmış verilerinizde [yapılandırılmış veri hataları](https://support.google.com/webmasters/answer/13300873?hl=tr) yoktur. Söz dizimi hatası olmadığından (Zengin Sonuçlar Testi site adlarını desteklemez) emin olmak için bir şema test aracı kullanın. Bunun için örneğin [Şema İşaretleme Doğrulayıcı](https://validator.schema.org/)'yı kullanabilirsiniz.
   - Yapılandırılmış verileriniz [yönergelerimize uygundur](https://developers.google.com/search/docs/appearance/site-names?hl=tr#guidelines).
   - Ana sayfanızdaki [başka kaynaklarda](https://developers.google.com/search/docs/appearance/site-names?hl=tr#sources) da siteniz için tercih edilen adın kullanıldığından emin olun.
   - Bir alt dizin için site adı oluşturmaya çalışmadığınızı onaylayın. Site adları, alt dizinlerde desteklenmez (örneğin `https://example.com/news`, alt dizin düzeyinde bir ana sayfadır ve kendi site adı olamaz). Daha fazla bilgi için [teknik yönergelerimizi](https://developers.google.com/search/docs/appearance/site-names?hl=tr#technical-guidelines) inceleyin.
2. Yönlendirmelerinizin istenen şekilde çalıştığından ve Googlebot'un, yönlendirme hedefine erişebildiğinden emin olun. Ardından [bu sayfanın yeniden taranmasını isteyin](https://developers.google.com/search/docs/crawling-indexing/ask-google-to-recrawl?hl=tr). Sayfanız Googlebot’un görebildiği bir sayfaya yönlendiriyorsa site adı, yönlendirme hedefini yansıtır.
3. Sitenizin HTTP ve HTTPS gibi birden fazla sürümü varsa tutarlı bir şekilde aynı site adını kullandığınızdan emin olun.
4. Site adı yapılandırılmış verilerinizi güncellediyseniz Google'ın yeni bilgileri yeniden taraması ve işlemesi için zaman tanıyın. Taramanın, sistemlerimizin içeriklerin ne sıklıkta yenilenmesi gerektiğini belirlediğine bağlı olarak birkaç gün ila birkaç hafta sürebileceğini unutmayın. [URL Denetleme aracını](https://support.google.com/webmasters/answer/9012289?hl=tr#request_indexing) kullanarak sayfanın yeniden taranmasını talep edebilirsiniz.**Dahili sayfalar için tercih ettiğiniz site adını görmüyor musunuz?** Ana sayfanızda tercih ettiğiniz site adı zaten görünüyorsa Google'a dahili sayfalarınızı yeniden taraması ve işlemesi için zaman tanıdığınızdan emin olun.

Yönergeye uymanıza rağmen tercih ettiğiniz site adı hâlâ seçili değilse aşağıdaki seçeneklerden birini kullanın:

1. **Öncelikle, `alternateName` özelliğini kullanarak alternatif bir ad girmeyi deneyin**. Site adı sistemimiz, tercih ettiğiniz ada yeteri kadar güvenmezse alternatif olan seçeneği mutlaka dikkate alır.

2. Yedek seçenek olarak alan adınızı veya alt alan adınızı sağlayın.

    

   Alan adınızı veya alt alan adınızı yedek seçenek olarak sağlamak için alan adınızı veya alt alan adınızı

    

   alternatif adınız

    

   olarak ekleyin. Sistemimizin bunu bir site adı tercihi olarak algılaması için alan adınızın veya alt alan adınızın tamamen küçük harfli olması gerekir (örneğin,

    

   ```
   Example.com
   ```

    

   değil

    

   ```
   example.com
   ```

   ). Tercih ettiğiniz ad seçili değilse sistemimiz mutlaka bu adı göz önünde bulundurur. Bu örnekte

    

   Burnt Toast

    

   en çok tercih edilen seçenektir. Ardından

    

   BT

    

   gelir ve son ad tercihi olarak

    

   example.com

    

   alan adıyla sona erer:

   

   ```
   <script type="application/ld+json">
     {
       "@context": "https://schema.org",
       "@type": "WebSite",
       "name": "Burnt Toast",
       "alternateName": ["BT", "B-T", "Burnt Toast Shop", "example.com"],
       "url": "https://www.example.com/"
     }
   </script>
   ```

3. Bu da işe yaramazsa son çare geçici bir seçenek olarak alan adınızı veya alt alan adınızı (tamamı küçük harfli) [tercih ettiğiniz ad](https://developers.google.com/search/docs/appearance/site-names?hl=tr#preferred-name) olarak sağlamayı deneyin.

    

   Tercih ettiğiniz ad olarak alan adınızı veya alt alan adınızı sağlarsanız sistemimiz genellikle bu adı seçer (ancak bunu yalnızca son çare olarak kullanmanızı öneririz). Bu örnekte, tek tercih

    

   example.com

    

   alan adıdır:

   

   ```
   <script type="application/ld+json">
     {
       "@context": "https://schema.org",
       "@type": "WebSite",
       "name": "example.com",
       "url": "https://www.example.com/"
     }
   </script>
   ```

[Sorun giderme adımlarını](https://developers.google.com/search/docs/appearance/site-names?hl=tr#troubleshooting) denemenize rağmen sorun yaşamaya devam ediyorsanız [Google Arama Merkezi Yardım Topluluğu](https://support.google.com/webmasters/thread/227739087?hl=tr)'nda soru yayınlayın. Bu sayede, sistemlerimizde yapacağımız olası iyileştirmeler hakkında bilgi edinebiliriz.Google Arama'da yapılandırılmış veri işaretlemeye giriş



Google Arama, bir sayfanın içeriğini anlamak için çok çalışır. Bir sayfaya yapılandırılmış veriler ekleyip Google'a sayfanın anlamıyla ilgili açık ipuçları sağlayarak bize yardımcı olabilirsiniz. Yapılandırılmış veriler, bir sayfa hakkında bilgi sağlamak ve sayfa içeriğini (örneğin bir tarif sayfasında, malzemeler, pişirme süresi ve sıcaklığı, kaloriler ve benzerleri) sınıflandırmak için kullanılan standart bir biçimdir.

## Bir sayfaya neden yapılandırılmış veri eklemeliyim?

Yapılandırılmış veri eklemek, kullanıcıların ilgisini daha çok çekecek ve web sitenizle daha fazla etkileşimde bulunmaya teşvik edebilecek arama sonuçları sağlayabilir. Bu sonuçlara *zengin sonuçlar* denir. Siteleri için yapılandırılmış veri uygulayan web sitelerine ait bazı örnek olayları aşağıda bulabilirsiniz:

- Rotten Tomatoes, 100.000 benzersiz sayfaya yapılandırılmış veri ekledi ve yapılandırılmış veri içermeyen sayfalarla karşılaştırıldığında yapılandırılmış verilerle geliştirilen sayfaların %25 daha yüksek tıklama oranına ulaştığını gördü.
- Food Network, arama özellikleri sağlamak için sayfalarının %80'ini dönüştürdü ve ziyaret sayısında %35'lik artış sağladı.
- Rakuten, kullanıcıların arama özelliklerinin uygulandığı sayfalarda, yapılandırılmış veri içermeyen sayfalara göre 1,5 kat daha fazla zaman harcadığını ve arama özellikleri içeren AMP sayfalarının, bu özellikleri içermeyen AMP sayfalarına göre 3,6 kat daha yüksek etkileşim oranına sahip olduğunu tespit etti.
- Nestlé, aramada zengin sonuç olarak gösterilen sayfaların, zengin olmayan sonuç olarak gösterilen sayfalara göre %82 daha yüksek tıklama oranına sahip olduğunu belirledi.

[Yapılandırılmış veri uygulayan sitelerdeki örnek olayları](https://developers.google.com/search/case-studies?hl=tr) inceleyin.

## Google Arama'da yapılandırılmış veriler nasıl çalışır?

Google, web’de bulduğu yapılandırılmış veriyi, ilgili sayfanın içeriğini anlamanın yanı sıra genel olarak web ve dünya hakkında bilgi (işaretlemede yer alan kişiler, kitaplar veya şirketler hakkındaki bilgiler gibi) toplamak için kullanır. Örneğin, bir yemek tarifi sayfasında tarifin başlığı, yazarı ve diğer ayrıntılarının açıklandığı [JSON-LD](https://json-ld.org/) yapılandırılmış verisi varsa Google Arama, tarifle ilgili zengin sonuç görüntülemek için bu bilgileri kullanabilir:

![Yemek tarifi web sayfalarındaki yapılandırılmış veriler, Google Arama&#39;daki zengin sonuçları nasıl etkileyebilir?](https://developers.google.com/static/search/docs/images/structured-data-explainer.png?hl=tr)

Yapılandırılmış veri, tarifin her öğesini etiketlediğinden kullanıcılar tarifinizi malzemesine, kalori sayısına, pişirme süresine ve diğer özelliklerine göre arayabilir.

**Wix, Wordpress veya Shopify gibi bir içerik yönetim sistemi (İYS) kullanıyorsanız** HTML'nizi doğrudan düzenleyemeyebilirsiniz. Bunun yerine, içerik yönetim sisteminizde bir arama motoru ayarları sayfası bulunabilir veya yapılandırılmış verileri belirtmenizi sağlayan bir eklenti yükleyebilirsiniz. İçerik yönetim sisteminize yapılandırılmış veri ekleme ile ilgili talimatları arayın (örneğin, "wix yapılandırılmış verisi" veya "wordpress yapılandırılmış veri eklentisi" için arama yapın).



Yapılandırılmış veriler, bilgilerin geçerli olduğu sayfada bulunan sayfa içi işaretleme kullanılarak kodlanır. Sayfadaki yapılandırılmış veriler, sayfanın içeriğini açıklar. Yalnızca yapılandırılmış veri yerleştirmek için içeriği olmayan ya da boş sayfalar oluşturmayın ve bilgi doğru olsa dahi kullanıcı tarafından görülmeyecek bilgiler hakkında yapılandırılmış veri eklemeyin. Teknik ve kaliteyle ilgili daha fazla yönerge için [Yapılandırılmış veri genel yönergeleri](https://developers.google.com/search/docs/guides/sd-policies?hl=tr) konusuna bakın.

[Zengin Sonuçlar Testi](https://search.google.com/test/rich-results?hl=tr), yapılandırılmış verilerinizi doğrulamak ve bazı durumlarda, Google Arama’daki bir özelliği önizlemek için kullanabileceğiniz kolay ve faydalı bir araçtır. Deneyin:



## Yapılandırılmış veri sözlüğü ve biçimi

Bu belgede, Google Arama açısından özel anlamı olan yapılandırılmış veri için hangi özelliklerin gerekli, hangilerinin isteğe bağlı olduğu veya önerildiği açıklanmaktadır. Arama yapılandırılmış verilerinin çoğu [schema.org](https://schema.org/) sözlüğünü kullanır ancak Google Arama davranışını anlamak için schema.org dokümanları yerine Google Arama Merkezi dokümanlarını kullanmanız uygun olur. schema.org'da farklı arama motoru, hizmet, araç ve platformlar için faydalı olabilecek daha başka özellikler ve nesneler bulunsa da bunlar, Google Arama için gerekli değildir.

Data-vocabulary.org işaretlemesi artık Google zengin sonuç özellikleri için uygun değildir. [data-vocabulary'nin kullanımdan kaldırılması](https://developers.google.com/search/blog/2020/01/data-vocabulary?hl=tr) hakkında daha fazla bilgi edinin.

Yapılandırılmış verinizi kontrol etmek için geliştirme sırasında [Zengin Sonuçlar Testi](https://search.google.com/test/rich-results?hl=tr)'ni ve dağıtımdan sonra [Zengin sonuç durum raporlarını](https://support.google.com/webmasters/answer/7552505?hl=tr) kullanarak sayfalarınızın doğruluğunu izlediğinizden emin olun. Şablon oluşturma veya sunma sorunları nedeniyle sayfalarınızın durumu bozulabilir.

Bir nesnenin Google Arama’da geliştirilmiş görüntülemeyle gösterilmeye uygun olması için gereken tüm özellikleri eklemeniz gerekir. Genel olarak, daha fazla önerilen özellik tanımlamak, bilgilerinizin Arama sonuçlarında geliştirilmiş görüntülemeyle gösterilme olasılığını artırabilir. **Bununla birlikte**, olası her önerilen özelliği eksik bilgiler, kötü biçimlendirme veya yanlış verilerle sağlamayı denemek yerine, daha az sayıda ama eksiksiz ve doğru önerilen özellikler sağlanması daha fazla önem taşır.

Burada belirtilen özelliklere ve nesnelere ek olarak Google, [`sameAs`](https://schema.org/sameAs) özelliğini ve diğer [schema.org](https://schema.org/) yapılandırılmış verilerini genel olarak kullanabilir. Bu öğelerin bazıları, faydalı görülürlerse gelecekteki Arama özelliklerini sağlamak için kullanılabilir.

### Desteklenen biçimler 

Google Arama, aksi belirtilmediği sürece yapılandırılmış veriyi aşağıdaki biçimlerde destekler. Genel olarak, uygulaması ve sürdürmesi en kolay olan biçimi (çoğu durumda, JSON-LD) kullanmanızı öneririz. İşaretlemenin geçerli olması ve özelliğin dokümanlarına göre doğru şekilde uygulanması koşuluyla üç biçim de Google için aynıdır.

| Biçimler                                                     |                                                              |
| :----------------------------------------------------------- | ------------------------------------------------------------ |
| [JSON-LD](https://json-ld.org/)* **(Önerilen)**              | HTML sayfasının `<head>` ve `<body>` öğelerindeki `<script>` etiketine yerleştirilmiş JavaScript gösterimi. İşaretleme, kullanıcının görebildiği metinle aralıklı yerleştirilmez. Bu, bir `Event` öğesinin `MusicVenue` bilgisinin `PostalAddress` değerinin `Country` öğesi gibi iç içe yerleştirilmiş veri öğelerinin ifade edilmesini kolaylaştırır. Google, [JavaScript kodu veya içerik yönetim sisteminizde yerleşik widget'lar gibi sayfanın içeriğine dinamik olarak eklenen JSON-LD verilerini](https://developers.google.com/search/docs/guides/generate-structured-data-with-javascript?hl=tr) de okuyabilir. |
| [Mikro veri](https://html.spec.whatwg.org/multipage/microdata.html#microdata) | Yapılandırılmış verileri HTML içine yerleştirmek için kullanılan bir açık topluluk HTML spesifikasyonu. RDFa'da olduğu gibi, yapılandırılmış veri olarak göstermek istediğiniz özellikleri adlandırmak için HTML etiketi özelliklerini kullanır. Genellikle `<body>` öğesinde kullanılır ancak `<head>` öğesinde de kullanılabilir. |
| [RDFa](https://rdfa.info/)                                   | Arama motorları için açıklamak istediğiniz, kullanıcının görebildiği içeriğe karşılık gelen [HTML etiketi özelliklerini](https://www.w3.org/TR/rdfa-lite/#the-attributes) kullanıma sunarak bağlantılı verileri destekleyen bir HTML5 uzantısı. RDFa, HTML sayfasının hem `<head>` hem de `<body>` bölümlerinde yaygın olarak kullanılır. |

Genel olarak Google, sitenizin kurulumu izin veriyorsa yapılandırılmış veriler için JSON-LD kullanmanızı önerir. Bunun nedeni de JSON-LD'nin, web sitesi sahiplerinin geniş ölçekte uygulaması ve sürdürmesi için en kolay çözüm olmasıdır (başka bir deyişle, kullanıcı hatalarına daha az açıktır).

## Yapılandırılmış veri kuralları

Yapılandırılmış veri türünüze özel kuralların yanı sıra [genel yapılandırılmış veri yönergelerini](https://developers.google.com/search/docs/appearance/structured-data/sd-policies?hl=tr) uyguladığınızdan emin olun. Aksi takdirde, yapılandırılmış verileriniz Google Arama'da zengin sonuç görüntüsü için uygun bulunmayabilir.

## Yapılandırılmış verileri kullanmaya başlama

Yapılandırılmış veriler konusunda yeniyseniz [schema.org'un yeni başlayanlar için yapılandırılmış veri kılavuzunu](https://schema.org/docs/gs.html) inceleyebilirsiniz. Kılavuz, Mikro Veri üzerinde yoğunlaşsa da temel fikirler, JSON-LD ve RDFa için de uygulanabilir.

Yapılandırılmış verilerle ilgili temel bilgileri edindikten sonra [Google Arama'daki yapılandırılmış veri özellikleri listesine](https://developers.google.com/search/docs/appearance/structured-data/search-gallery?hl=tr) göz atın ve uygulamak istediğiniz bir özelliği seçin. Her bir kılavuzda, yapılandırılmış verilerin sitenizi Google Arama'da zengin sonuç olarak görünmeye uygun hale getirecek şekilde nasıl uygulanacağı konusunda ayrıntılar yer alıyor.

[Bir özellik seçin](https://developers.google.com/search/docs/appearance/structured-data/search-gallery?hl=tr)

## Yapılandırılmış verilerin etkisini ölçme

Muhtemelen uğraşlarınıza değip değmediğine karar vermek için yapılandırılmış verilere sahip olan ve olmayan sayfalarınızın performansını karşılaştırmak istersiniz. Bunu yapmanın en iyi yolu [sitenizdeki birkaç sayfada öncesi ve sonrası testi](https://developers.google.com/search/docs/crawling-indexing/website-testing?hl=tr) çalıştırmaktır. Tek bir sayfa için sayfa görüntülemeleri çeşitli nedenlerle değişiklik gösterebildiğinden bu işlem biraz ustalık gerektirebilir.

1. Sitenizde yapılandırılmış verilerin kullanılmadığı ve Search Console'da birkaç aylık verisi bulunan bazı sayfaları alın. Yılın zamanından veya sayfa içeriğinin zamanlamasından etkilenmeyecek sayfalar seçtiğinizden emin olun; çok fazla değişmeyecek ancak yine de anlamlı veriler oluşturmak için yeterince okunacak kadar popüler olan sayfalar kullanın.
2. Sayfalarınıza yapılandırılmış veriler veya başka özellikler ekleyin. Sayfanızda [URL Denetleme aracını](https://support.google.com/webmasters/answer/9012289?hl=tr) kullanarak işaretlemenizin geçerli olduğunu ve Google'ın yapılandırılmış verilerinizi bulduğunu doğrulayın.
3. Birkaç ay boyunca [performans raporunda](https://support.google.com/webmasters/answer/7576553?hl=tr#by_search_appearance)performansı kaydedin ve sayfanızın performansını karşılaştırmak için URL'ye göre filtreleyin.



Bu size yardımcı oldu mu?