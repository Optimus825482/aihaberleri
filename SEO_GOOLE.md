# Arama Motoru Optimizasyonu (SEO) Başlangıç Kılavuzu



Web sitenizi oluştururken muhtemelen kullanıcılarınızı göz önünde bulundurup içeriklerinizi bulmalarını ve keşfetmelerini kolaylaştırmaya çalışmışsınızdır. Bu kullanıcılardan biri de kullanıcıların içeriğinizi keşfetmesine yardımcı olan arama motorudur. Kısaca SEO olarak adlandırılan arama motoru optimizasyonu, arama motorlarının içeriğinizi anlamasına ve kullanıcıların da sitenizi bulup bir arama motoru aracılığıyla ziyaret edip etmeyeceklerine karar vermelerine yardımcı olur.

[Arama Yönergeleri](https://developers.google.com/search/docs/essentials?hl=tr), web sitenizi Google Arama'da görünmeye uygun kılan en önemli noktaları özetler. Belirli bir sitenin Google'ın dizinine ekleneceği garanti edilmese de **Arama Yönergeleri'ne uygun davranan sitelerin Google'ın arama sonuçlarında görünme olasılığı daha yüksektir**. SEO, bir sonraki adımı atmak ve **sitenizin Arama'daki varlığını iyileştirmek için çalışmaktır**. Bu kılavuz, sitenizde yapabileceğiniz en yaygın ve etkili iyileştirmelerden bazıları hakkında bilgi verir.

Maalesef sitenizi Google'da otomatik olarak birinci sıraya yerleştirecek bir sır veremiyoruz. Hatta, önerilerimizden bazıları işletmeniz için geçerli bile olmayabilir. Ancak, en iyi uygulamaları kullanmanın, arama motorlarının (yalnızca Google'ın değil) içeriğinizi taramasını, dizine eklemesini ve anlamasını kolaylaştıracağını umuyoruz.

## Google Arama nasıl çalışır?

Google, dizinimize eklenecek sayfalar aramak için tarayıcı adı verilen programları kullanarak web'i sürekli olarak keşfeden tam otomatik bir arama motorudur. Genellikle sitenizi web'de yayınlamak dışında bir şey yapmanız gerekmez. Aslında arama sonuçlarımızda listelenen sitelerin büyük çoğunluğu, web’i taradığımızda otomatik olarak bulunur ve eklenir. Daha fazla bilgi edinmeye istekliyseniz [Google'ın web sayfalarını nasıl keşfettiği, taradığı ve sunduğu](https://developers.google.com/search/docs/fundamentals/how-search-works?hl=tr) ile ilgili dokümanlarımıza göz atabilirsiniz.

**Zamanınız kısıtlı mı ya da macera aramıyor musunuz?** Dilerseniz bu konuyla ilgili bir uzmanı işe alabilirsiniz. [Göz önünde bulundurmanız gereken noktalar aşağıda açıklanmıştır](https://developers.google.com/search/docs/fundamentals/do-i-need-seo?hl=tr).

## Arama sonuçlarında ne kadar sürede etki görürüm?

Yaptığınız her değişikliğin, Google'ın tarafında yansıtılması biraz zaman alır. Bazı değişiklikler birkaç saat içinde geçerli olurken diğerlerinin geçerli olması birkaç ay sürebilir. Genelde yaptığınız çalışmanın, Google Arama sonuçlarında faydalı etkileri olup olmadığını değerlendirmek için birkaç hafta beklemeniz gerekebilir. Web sitenizde yaptığınız tüm değişikliklerin, arama sonuçlarında gözle görülür bir etkisi olmayacağını unutmayın. Sonuçlardan memnun değilseniz ve işletme stratejileriniz buna uygunsa değişikliklerde iterasyon yapmayı deneyin ve bir fark olup olmadığına bakın.

## Google'ın içeriğinizi bulmasına yardımcı olun

Bu bölümde bahsedilen işlemleri yapmadan önce Google'ın içeriğinizi bulup bulmadığını kontrol edin (bu durumda herhangi bir işlem yapmanıza gerek olmayabilir). Google'da sitenizi `site: search operator` kullanarak aramayı deneyin. Sitenize yönlendiren sonuçlar görürseniz dizinde yer alıyorsunuz demektir. Örneğin, `site:wikipedia.org` araması [bu sonuçları](https://www.google.com/search?q=site%3Awikipedia.org&hl=tr) döndürür. Sitenizi görmüyorsanız sitenizin Google Arama'da gösterilmesini teknik açıdan engelleyen bir sorun olup olmadığını anlamak için [teknik koşulları](https://developers.google.com/search/docs/essentials/technical?hl=tr) inceleyip buraya geri dönün.

Google, sayfaları öncelikli olarak taradığı diğer sayfalardaki bağlantılardan bulur. Bunlar çoğu durumda sayfalarınıza bağlantı veren diğer web siteleridir. Diğer sitelerin size bağlantı vermesi, zaman içinde kendiliğinden gerçekleşir. Ayrıca, [sitenizi tanıtarak](https://developers.google.com/search/docs/fundamentals/seo-starter-guide?hl=tr#promoting) kullanıcıları içeriğinizi keşfetmeye teşvik edebilirsiniz.

Kendinize teknik açıdan meydan okumak isterseniz [site haritası da gönderebilirsiniz](https://developers.google.com/search/docs/crawling-indexing/sitemaps/overview?hl=tr). Site haritası, sitenizde önemsediğiniz tüm URL'leri içeren bir dosyadır. Bazı içerik yönetim sistemleri (İYS) bunu sizin adınıza otomatik olarak da yapabilir. Ancak bu zorunlu değildir ve öncelikle [kullanıcıların sitenizden haberdar olmasını](https://developers.google.com/search/docs/fundamentals/seo-starter-guide?hl=tr#promoting) sağlamaya odaklanmanızı öneririz.

### Google'ın sayfanızı bir kullanıcıyla aynı şekilde görüp görmediğini kontrol edin

Google, taradığı bir sayfayı ideal olarak [ortalama bir kullanıcıyla aynı şekilde görmelidir](https://developers.google.com/search/blog/2014/05/understanding-web-pages-better?hl=tr). Bunun için Google'ın, kullanıcının tarayıcısıyla aynı kaynaklara erişebilmesi gerekir. Siteniz, web sitenizi oluşturan önemli bileşenleri (ör. [CSS](https://en.wikipedia.org/wiki/CSS) ve [JavaScript](https://en.wikipedia.org/wiki/JavaScript)) gizliyorsa Google, sayfalarınızı anlayamayabilir. Bu durumda da sayfalar arama sonuçlarında görünmeyebilir veya hedeflediğiniz terimlerdeki sıralamaları iyi olmayabilir.

Kullanıcının fiziksel konumuna bağlı olarak sayfalarınızda farklı bilgiler yer alıyorsa Google'ın, kendi tarayıcısının konumundan (genellikle ABD'dir) gördüğü bilgilerde sizin açınızdan bir sorun olup olmadığına bakın.

Google'ın sayfanızı nasıl gördüğünü kontrol etmek için [Search Console'daki URL Denetleme aracını](https://support.google.com/webmasters/answer/9012289?hl=tr) kullanabilirsiniz.

### Bir sayfanın Google'ın arama sonuçlarında görünmesini istemiyor musunuz?

Sitenizin tamamının veya bazı bölümlerinin, arama sonuçlarında görünmesini devre dışı bırakmak sizin açınızdan önemli olabilir. Örneğin, utandığınız yeni saç kesiminizle ilgili yayınlarınızın arama sonuçlarında görünmesini istemeyebilirsiniz. Google, URL'lerinizin taranmasını ve dizine eklenmesini devre dışı bırakmanıza olanak tanıyan çeşitli yöntemleri destekler. Bazı dosyaların, dizinlerin ve hatta tüm sitenizin Google Arama'da görünmesini engellemeniz gerekiyorsa [içeriğin arama sonuçlarında görünmesini engelleme yöntemleri](https://developers.google.com/search/docs/crawling-indexing/control-what-you-share?hl=tr#how-to-block-content) ile ilgili kılavuzumuza göz atın.

## Sitenizi düzenleyin

Sitenizi oluştururken veya yeniden yaparken mantıklı bir şekilde düzenlemeniz önemlidir. Böylece arama motorları ve kullanıcılar, sayfalarınızın sitenizin geri kalanıyla olan ilişkisini anlayabilir. Elinizdeki işleri bırakıp hemen sitenizi yeniden düzenlemeye başlamayın. Bu öneriler uzun vadede faydalı olsa da (özellikle büyük ölçekli bir web sitesi üzerinde çalışıyorsanız) arama motorları, sitenizin nasıl düzenlendiğinden bağımsız olarak sayfalarınızı muhtemelen şu anda olduğu gibi anlayacaktır.

### Açıklayıcı URL'ler kullanın

URL'nin bazı bölümleri, arama sonuçlarında içerik haritası olarak gösterilebilir. Böylece kullanıcılar, bir sonucun kendileri açısından faydalı olup olmayacağını anlamak için URL'leri de kullanabilir.

<svg aria-labelledby="descriptive-url" direction="ltr" viewBox="0 0 750 300" xlink="http://www.w3.org/1999/xlink" xmlns="http://www.w3.org/2000/svg" style="color: rgb(32, 33, 36); font-family: Roboto, &quot;Noto Sans&quot;, &quot;Noto Sans JP&quot;, &quot;Noto Sans KR&quot;, &quot;Noto Naskh Arabic&quot;, &quot;Noto Sans Thai&quot;, &quot;Noto Sans Hebrew&quot;, &quot;Noto Sans Bengali&quot;, sans-serif; font-size: 16px; font-style: normal; font-variant-ligatures: normal; font-variant-caps: normal; font-weight: 400; letter-spacing: normal; orphans: 2; text-align: start; text-indent: 0px; text-transform: none; widows: 2; word-spacing: 0px; -webkit-text-stroke-width: 0px; white-space: normal; background-color: rgb(255, 255, 255); text-decoration-thickness: initial; text-decoration-style: initial; text-decoration-color: initial;"><image width="100%" y="10%" href="https://developers.google.com/search/docs/images/text-result.png?hl=tr"></image><line stroke="#ffba00" stroke-width="4px" x1="200" x2="200" y1="120" y2="300"></line><foreignObject height="50" width="300" x="210" y="260"><p xmlns="http://www.w3.org/1999/xhtml" style="box-sizing: inherit; margin: 0px; padding: 1rem 0px;"><a href="https://developers.google.com/search/docs/appearance/visual-elements-gallery?hl=tr#domain" style="box-sizing: inherit; color: rgb(26, 115, 232); outline: 0px; text-decoration: rgb(26, 115, 232); word-break: break-word;">Alan</a></p></foreignObject><line stroke="#ffba00" stroke-width="4px" x1="330" x2="330" y1="20" y2="110"></line><foreignObject height="50" width="300" x="340" y="0"><p xmlns="http://www.w3.org/1999/xhtml" style="box-sizing: inherit; margin: 0px; padding: 1rem 0px;"><a href="https://developers.google.com/search/docs/appearance/visual-elements-gallery?hl=tr#breadcrumb" style="box-sizing: inherit; color: rgb(26, 115, 232); outline: 0px; text-decoration: rgb(26, 115, 232); word-break: break-word;">İçerik haritası</a></p></foreignObject></svg>



Google, içerik haritalarını URL'deki kelimelere göre otomatik olarak öğrenir, ancak kendinize teknik açıdan meydan okumayı seviyorsanız bunları [yapılandırılmış verilerle](https://developers.google.com/search/docs/appearance/structured-data/breadcrumb?hl=tr) de etkileyebilirsiniz. URL'ye kullanıcılar için faydalı olabilecek kelimeler eklemeye çalışın. Örneğin:

```
https://www.example.com/pets/cats.html
```

Sadece rastgele tanımlayıcılar içeren bir URL, kullanıcılara daha az yardımcı olur. Örneğin:

```
https://www.example.com/2/6772756D707920636174
```

### Dizinlerdeki konu bakımından benzer sayfaları gruplandırın

![Dizinlerdeki sayfaların nasıl gruplandırılacağını gösteren resim](https://developers.google.com/static/search/docs/images/grouping-pages-in-directories.png?hl=tr)

Sitenizde birkaç binden fazla URL varsa içeriğinizi düzenleme şekliniz, Google'ın sitenizi tarama ve dizine ekleme şeklini etkileyebilir. Özellikle de benzer konuları gruplandırmak için dizinleri (veya klasörleri) kullanmak, Google'ın bağımsız dizinlerdeki URL'lerin ne sıklıkta değiştiğini öğrenmesine yardımcı olabilir.

Örneğin, aşağıdaki URL'leri ele alalım:

```
https://www.example.com/policies/return-policy.html
https://www.example.com/promotions/new-promos.html
```

`policies` dizinindeki içerik nadiren değişirken `promotions` dizinindeki içerik muhtemelen çok sık değişir. Google bu bilgileri öğrenebilir ve farklı dizinleri farklı sıklıkta tarayabilir. Aramaya uygun site yapıları hakkında daha fazla bilgi edinmek için [e-ticaret siteleri kılavuzumuza](https://developers.google.com/search/docs/specialty/ecommerce/help-google-understand-your-ecommerce-site-structure?hl=tr) göz atın. E-ticaret siteleri genelde daha büyük olduğundan iyi bir URL yapısı bu siteler için daha önemlidir.

### Yinelenen içeriği azaltın

Bazı web siteleri, farklı URL'ler altında aynı içeriği gösterir ve bunlara *[yinelenen içerik](https://developers.google.com/search/docs/crawling-indexing/canonicalization?hl=tr)* denir. Arama motorları, kullanıcılara her içerik parçası için gösterilecek tek bir URL (*standart* URL) seçer.

Sitenizde yinelenen içerik olması, spam politikalarımızı ihlal etmese de bu durum, kötü bir kullanıcı deneyimine neden olabilir ve arama motorları, önemsemediğiniz URL'ler için tarama kaynaklarını boşa harcayabilir. Biraz macera arıyorsanız sayfalarınız için [standart sürüm belirtip belirtemeyeceğinizi](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls?hl=tr) tespit etmeyi deneyebilirsiniz. Ancak URL'lerinizi kendiniz standartlaştırmazsanız Google bunu sizin için otomatik olarak yapmaya çalışır.

Standartlaştırma çalışmaları yaparken sitenizdeki her bir içerik parçasına yalnızca tek bir URL aracılığıyla erişilebildiğinden emin olun. Tanıtımlarınızla ilgili aynı bilgileri içeren iki sayfanız olması kafa karıştırıcı bir kullanıcı deneyimine yol açabilir (örneğin, kullanıcılar hangi sayfanın doğru olduğunu ve ikisi arasında bir fark olup olmadığını merak edebilir).

Aynı bilgileri içeren birden fazla sayfanız varsa tercih edilmeyen URL'lerden, ilgili bilgileri en iyi şekilde temsil eden URL'ye [yönlendirme](https://developers.google.com/search/docs/crawling-indexing/301-redirects?hl=tr) oluşturmayı deneyin. Yönlendirme yapamıyorsanız bunun yerine `rel="canonical"` `link` öğesini kullanın. Ancak bu konuda çok fazla endişelenmenize gerek yoktur. Arama motorları genellikle bunu sizin adınıza kendileri çözebilir.

## Sitenizi ilginç ve yararlı hale getirin

Kullanıcıların ilgi çekici ve faydalı bulduğu içerikler oluşturmanız, web sitenizin arama sonuçlarındaki varlığını muhtemelen bu kılavuzdaki diğer tüm önerilerden daha fazla etkileyecektir. "İlgi çekici ve faydalı içerik", farklı kullanıcılar için farklı anlamlara gelebilse de bu tarz içerikler genellikle aşağıdaki gibi bazı ortak özellikleri taşır:

- **Metin kolay anlaşılabilir ve iyi düzenlenmiştir**: İçeriği doğal bir dille yazın. Ayrıca düzgün yazıldığından, kolay anlaşıldığından ve yazım/dil bilgisi hataları içermediğinden emin olun. Uzun içerikleri paragraflara ve bölümlere ayırıp kullanıcıların sayfalarınızda gezinmesine yardımcı olacak başlıklar ekleyin.
- **[İçerik benzersizdir](https://developers.google.com/search/docs/essentials/spam-policies?hl=tr#scraped-content)**: Yeni içerik yazarken başkalarına ait içerikleri kısmen veya tamamen kopyalamayın. İçeriği, konuyla ilgili bildiklerinize göre kendiniz oluşturun. Başkalarının yayınladığı içeriklerin sadece sözcüklerini değiştirerek içerik oluşturmayın.
- **İçerik günceldir**: Daha önce yayınlanmış içerikleri kontrol edip gerektiğinde güncelleyin veya artık alakalı değilse silin.
- **İçerik [faydalı, güvenilir ve kullanıcı odaklıdır](https://developers.google.com/search/docs/fundamentals/creating-helpful-content?hl=tr):** Okuyucularınızın faydalı ve güvenilir olduğunu düşüneceği içerikler yazın. Örneğin, uzman veya deneyimli kaynaklar sağlamak, kullanıcıların makalelerinizin uzmanlığını anlamalarına yardımcı olabilir.

### Okuyucularınızın kullanacağı arama terimlerini düşünün

Kullanıcıların içeriğinizde bir bölümü bulmak için arayabileceği kelimeleri düşünün. Konuyla ilgili çok şey bilen kullanıcılar, arama sorgularında konuyla yeni ilgilenenlerden farklı anahtar kelimeler kullanabilirler. Örneğin, bazı kullanıcılar "şarküteri tabağı", başka kullanıcılar ise "peynir tabağı" şeklinde arama yapabilir. Arama davranışındaki bu farklılıkları tahmin etmeniz ve içeriklerinizi yazarken okuyucularınızı göz önünde bulundurmanız, sitenizin arama sonuçlarındaki performansı üzerinde olumlu etki yaratabilir.

Bununla birlikte, kullanıcıların içeriğinizi aramak için kullandığı her terimi tahmin edememeniz de sorun değildir. Google'ın gelişmiş dil eşleştirme sistemleri, sayfalarınızda terimlerin bire bir aynısını kullanmasanız bile bu sayfaların birçok sorguyla olan ilişkisini anlayabilir.

### Dikkat dağıtan reklamlardan kaçının

İnternetin bir parçası olan reklamlar, kullanıcılara gösterilmek için oluşturulsa da bunların fazla dikkat dağıtıcı olmamasını veya kullanıcılarınızın, içeriklerinizi okumasını engellememesini sağlayın. Örneğin, web sitesinin kullanılmasını zorlaştıran reklamlar veya [ara sayfalar](https://developers.google.com/search/docs/appearance/avoid-intrusive-interstitials?hl=tr) (beklediğiniz içerikten önce veya sonra gösterilen sayfalar).

### İlgili kaynaklara bağlantı verin

Bağlantılar, kullanıcılarınız ve arama motorları ile sitenizin diğer bölümleri ya da başka sitelerdeki alakalı sayfalar arasında bağlantı oluşturmak için etkili bir yöntemdir. Hatta Google, her gün yeni sayfaların büyük çoğunluğunu bağlantılardan bulur. Dolayısıyla bağlantılar, sayfalarınızın Google tarafından keşfedilmesini ve potansiyel olarak arama sonuçlarında gösterilmesini sağlamak için göz önünde bulundurmanız gereken önemli bir kaynaktır. Ayrıca bağlantılar, kullanıcılar (ve Google) ile yazdığınız konuyu destekleyen başka bir kaynak arasında bağlantı oluşturarak da değer katabilir.

![Bir web sayfasının, diğer alakalı kaynaklara nasıl bağlantı verdiğini gösteren resim](https://developers.google.com/static/search/docs/images/link-to-relevant-resources.png?hl=tr)

#### İyi bağlantı metinleri yazın

*Bağlantı metni*, gördüğünüz bir *bağlantının metin* kısmıdır. Bu metin, kullanıcılara ve Google'a bağlantı verdiğiniz sayfayla ilgili bir şeyler bildirir. [Uygun bağlantı metni](https://developers.google.com/search/docs/crawling-indexing/links-crawlable?hl=tr#write-good-anchor-text) sağladığınızda kullanıcılar ve arama motorları, bağlantı verdiğiniz sayfaları ziyaret etmeden önce içeriklerini kolayca anlayabilir.![Bir bağlantının metin kısmını gösteren resim](https://developers.google.com/static/search/docs/images/what-is-link-text.png?hl=tr)

#### Gerektiğinde bağlantı verin

Bağlantılar hem kullanıcılar hem de arama motorları için bir konuyla ilgili daha fazla bağlam sunabilir. Bu da bir konu hakkındaki bilgi birikiminizi göstermenize yardımcı olabilir. Ancak başka sitelerdeki içerikler gibi kendi kontrolünüz dışındaki sayfalara bağlantı verirken bağlantı verdiğiniz kaynağa güvenmeniz gerekir. İçeriğe güvenmemenize rağmen yine de bağlantı vermek istiyorsanız bağlantıya [`nofollow` veya benzer bir ek açıklama](https://developers.google.com/search/docs/crawling-indexing/qualify-outbound-links?hl=tr) ekleyerek arama motorlarının sitenizi, bağlantı verdiğiniz siteyle ilişkilendirmesini önleyebilirsiniz. Böylece, Google Arama'daki sıralamanızla ilgili muhtemel olumsuz sonuçları da önlemiş olursunuz.

Sitenizde kullanıcı tarafından oluşturulan içerik (ör. forum yayınları veya yorumlar) kabul ediyorsanız kullanıcıların yayınladığı her bağlantıda, içerik yönetim sisteminizin otomatik olarak eklediği `nofollow` veya benzeri bir ek açıklama bulunduğundan emin olun. Bu durumda içerikleri siz oluşturmadığınız için sitenizin, kullanıcıların bağlantı verdiği sitelerle koşulsuz bir şekilde ilişkilendirilmesini istemeyeceğinizi düşünüyoruz. Ayrıca bu şekilde, spam yapanların web sitenizi kötüye kullanmasının da önüne geçebilirsiniz.

## Sitenizin, Google Arama'da görünme şeklini etkileyin



Tipik bir Google Arama sonuçları sayfası [birkaç farklı görsel öğeden](https://developers.google.com/search/docs/appearance/visual-elements-gallery?hl=tr) oluşur. Söz konusu öğeleri etkileyerek kullanıcıların bu arama sonuçları üzerinden sitenizi ziyaret edip etmeyeceğine karar vermesine yardımcı olabilirsiniz. Bu bölümde, görsel açıdan önemli öğeler oldukları için *başlık bağlantısına* ve *snippet*'e odaklanacağız.

### Başlık bağlantılarınızı etkileyin

*Başlık bağlantısı*, arama sonucunun başlık kısmıdır ve kullanıcıların, tıklayacakları arama sonucuna karar vermelerine yardımcı olabilir. Google'ın bu başlık bağlantısını oluşturmak için kullandığı birkaç kaynak vardır. Bu kaynaklara, `<title>` öğesinin içindeki kelimeler (başlık metni de denir) ve sayfadaki diğer başlıklar dahildir. Bu başlık metni, tarayıcılarda ve yer işaretlerinde gösterilen başlık için de kullanılabilir.

<svg aria-labelledby="svg-title-link" direction="ltr" viewBox="0 0 800 250" xlink="http://www.w3.org/1999/xlink" xmlns="http://www.w3.org/2000/svg" style="color: rgb(32, 33, 36); font-family: Roboto, &quot;Noto Sans&quot;, &quot;Noto Sans JP&quot;, &quot;Noto Sans KR&quot;, &quot;Noto Naskh Arabic&quot;, &quot;Noto Sans Thai&quot;, &quot;Noto Sans Hebrew&quot;, &quot;Noto Sans Bengali&quot;, sans-serif; font-size: 16px; font-style: normal; font-variant-ligatures: normal; font-variant-caps: normal; font-weight: 400; letter-spacing: normal; orphans: 2; text-align: start; text-indent: 0px; text-transform: none; widows: 2; word-spacing: 0px; -webkit-text-stroke-width: 0px; white-space: normal; background-color: rgb(255, 255, 255); text-decoration-thickness: initial; text-decoration-style: initial; text-decoration-color: initial;"><image width="100%" y="0%" href="https://developers.google.com/search/docs/images/blank-title-link.png?hl=tr"></image><foreignObject height="80" width="600" x="55" y="64"><p xmlns="http://www.w3.org/1999/xhtml" style="box-sizing: inherit; margin: 0px; padding: 1rem 0px; font: 400 24px / 32px &quot;Google Sans&quot;, &quot;Noto Sans&quot;, &quot;Noto Sans JP&quot;, &quot;Noto Sans KR&quot;, &quot;Noto Naskh Arabic&quot;, &quot;Noto Sans Thai&quot;, &quot;Noto Sans Hebrew&quot;, &quot;Noto Sans Bengali&quot;, sans-serif;"><a class="external-link" href="https://wikipedia.org/wiki/Chili_oil" style="box-sizing: inherit; color: rgb(26, 115, 232); outline: 0px; text-decoration: rgb(26, 115, 232); word-break: break-word;">Kendi biber yağınızı yapma</a></p></foreignObject></svg>



**İçerik yönetim sistemi kullanıyorsanız** başlıklarınızla ilgili teknik bir işlem yapmanıza gerek olmayabilir. Sadece iyi başlıklar yazmaya odaklanmanız yeterlidir. Çoğu içerik yönetim sistemi, yazdığınız başlıkları otomatik olarak HTML'de `<title>` öğesine dönüştürebilir.

![Başlık metninin, web sayfasında ve HTML&#39;de nasıl göründüğünü gösteren resim](https://developers.google.com/static/search/docs/images/titles-on-page-html.png?hl=tr)

İyi başlıklar yazarak Arama'daki başlık bağlantılarını etkileyebilirsiniz. İyi bir başlık sayfaya özgüdür, net ve kısadır, ayrıca sayfadaki içerikleri doğru bir şekilde açıklar. Örneğin, başlığınızda web sitenizin veya işletmenizin adı, işletmenin fiziksel konumu gibi diğer önemli bilgiler ve başlığın yer aldığı sayfanın, kullanıcılara neler sunduğu hakkında bilgi bulunabilir. [Başlık bağlantılarıyla ilgili dokümanlarımızda](https://developers.google.com/search/docs/appearance/title-link?hl=tr), iyi başlıkları nasıl oluşturacağınız ve sitenizin arama sonuçlarındaki başlık bağlantılarını nasıl etkileyeceğiniz hakkında daha fazla ipucu bulabilirsiniz.

### Snippet'lerinizi kontrol edin

Başlık bağlantısının altındaki arama sonuçlarında genellikle kullanıcıların arama sonucunu tıklayıp tıklamayacağına karar vermelerine yardımcı olacak hedef sayfanın bir açıklaması bulunur. Buna *snippet* denir.

<svg aria-labelledby="svg-snippet" direction="ltr" viewBox="0 0 800 300" xlink="http://www.w3.org/1999/xlink" xmlns="http://www.w3.org/2000/svg" style="color: rgb(32, 33, 36); font-family: Roboto, &quot;Noto Sans&quot;, &quot;Noto Sans JP&quot;, &quot;Noto Sans KR&quot;, &quot;Noto Naskh Arabic&quot;, &quot;Noto Sans Thai&quot;, &quot;Noto Sans Hebrew&quot;, &quot;Noto Sans Bengali&quot;, sans-serif; font-size: 16px; font-style: normal; font-variant-ligatures: normal; font-variant-caps: normal; font-weight: 400; letter-spacing: normal; orphans: 2; text-align: start; text-indent: 0px; text-transform: none; widows: 2; word-spacing: 0px; -webkit-text-stroke-width: 0px; white-space: normal; background-color: rgb(255, 255, 255); text-decoration-thickness: initial; text-decoration-style: initial; text-decoration-color: initial;"><image width="100%" y="10%" href="https://developers.google.com/search/docs/images/blank-snippet.png?hl=tr"></image><foreignObject height="65" width="680" x="55" y="140"><p xmlns="http://www.w3.org/1999/xhtml" style="box-sizing: inherit; margin: 0px; padding: 1rem 0px;">Bu kolay rehberle yumurta pişirmeyi 5 dakikadan kısa sürede öğrenin. Kızarmış, çok pişmiş ve poşe dahil tüm yöntemleri işliyoruz.</p></foreignObject></svg>



Snippet, arama sonucunun bağlantı verdiği sayfadaki gerçek içeriklerden alındığından snippet'i oluştururken kullanılabilecek kelimeler üzerinde tam kontrol sahibi olursunuz. Bazen snippet, meta tanım etiketindeki içeriklerden alınabilir. Meta tanım etiketi genellikle sayfanın bir veya iki cümlelik kısa özetidir. İyi bir meta tanım kısadır, belirli bir sayfaya özgüdür ve sayfanın en alakalı noktalarını içerir. Daha fazla fikir edinmek için [iyi meta tanımlar yazma](https://developers.google.com/search/docs/appearance/snippet?hl=tr#meta-descriptions) ipuçlarımıza göz atın.

## Sitenize resim ekleyin ve bunları optimize edin

Birçok kullanıcı görsel arama yapar ve resimler, kullanıcıların web sitenizle ilk kez karşılaşacağı öğe olabilir. Örneğin, bir yemek tarifi blogunuz varsa kullanıcılar, "meyveli turta tarifleri" araması yaparak ve çeşitli meyveli turta fotoğraflarına göz atarak içeriğinizi bulabilir.

Sitenize resim eklerken kullanıcıların ve arama motorlarının bunları bulup anlayabileceğinden emin olun.

### Alakalı metnin yakınına yüksek kaliteli resimler ekleyin

Yüksek kaliteli resimler kullandığınızda kullanıcılara aradıklarıyla en iyi eşleşen resmin hangisi olduğuna karar vermeleri için yeterli bağlam ve ayrıntı sunmuş olursunuz. Örneğin, kullanıcılar "papatya" araması yaparken arama sonuçlarında alpyıldızı çiçeğiyle karşılaşırlarsa daha yüksek kaliteli bir resim, çiçeğin türünü ayırt etmelerine yardımcı olur.

Net resimler kullanın ve bunları resimle alakalı metinlerin yakınına yerleştirin. Resimlerin yakınında yer alan metinler, Google'ın bu resmin ne hakkında olduğunu ve sayfanız açısından ne anlama geldiğini daha iyi anlamasına yardımcı olabilir.

Örneğin, bir sayfada Londra'daki iplik dükkanları inceleniyorsa iplik dükkanına ait fotoğraflarınızdan birini, ilgili dükkanın konumu, açıklaması ve inceleme bilgilerinin yer aldığı bölüme yerleştirmek mantıklıdır. Bu sayede Google ve kullanıcılar, resmi sayfanın konusu hakkında daha fazla bağlam sağlayan metinle ilişkilendirebilir.

### Resme açıklayıcı alternatif metin ekleyin

Alternatif metin, resim ve içeriğiniz arasındaki ilişkiyi açıklayan kısa ancak açıklayıcı bir metin parçasıdır. Arama motorlarının, resminizin konusunu ve sayfanızla olan ilişkisinin bağlamını anlamasına yardımcı olur. Bu nedenle, [iyi alternatif metinler](https://developers.google.com/search/docs/appearance/google-images?hl=tr#descriptive-alt-text) yazmak oldukça önemlidir. Alternatif metni, `img` öğesinin `alt` özelliğiyle HTML'nize ekleyebilirsiniz veya içerik yönetim sisteminiz, resmi sitenize yüklerken bununla ilgili açıklama belirtebileceğiniz kolay bir yöntem sunabilir. [İyi alternatif metin yazma](https://developers.google.com/search/docs/appearance/google-images?hl=tr#descriptive-alt-text) ve bu metni resimlerinize nasıl ekleyeceğiniz hakkında daha fazla bilgi edinin.

## Videolarınızı optimize edin

Web sitenizde özellikle tek tek videolarla ilgili sayfalar varsa kullanıcılar, sitenizi Google Arama'daki video sonuçları aracılığıyla da keşfedebilir. Resimler ve metinlerle ilgili en iyi uygulamaların çoğu videolar için de geçerlidir:

- Yüksek kaliteli video içerikleri oluşturun ve videoyu, bağımsız bir sayfaya, kendisiyle ilgili metnin yanına yerleştirin.
- Videonun başlık ve açıklama alanlarına açıklayıcı metinler yazın (videonun başlığı da bir başlık olduğundan başlık yazmayla ilgili en iyi uygulamaları burada da kullanabilirsiniz).

Sitenizin asıl odak noktası videoysa [videolarınızı, arama motorlarına yönelik optimize etmek](https://developers.google.com/search/docs/appearance/video?hl=tr) için yapabileceğiniz diğer işlemler hakkında bilgi edinmeye devam edin.

## Web sitenizi tanıtın

Yeni içeriğinizi etkili bir şekilde tanıtmak, aynı konuyla ilgilenen kullanıcılar ve arama motorları tarafından daha hızlı keşfedilmesini sağlar. Bunu birçok şekilde yapabilirsiniz:

- Sosyal medya üzerinden tanıtım
- Topluluk etkileşimi
- Hem çevrimdışı hem de çevrimiçi reklam
- Kulaktan kulağa pazarlama ve daha pek çok yöntem

[En etkili ve kalıcı yöntemlerden](https://www.nielsen.com/insights/2012/global-trust-in-advertising-and-brand-messages-2/) biri kulaktan kulağa pazarlamadır. Bu yöntemde, sitenizi bilen kullanıcılar, arkadaşlarına sitenizden bahseder ve bu kişiler de sitenizi ziyaret eder. Bu süreç zaman alabilir ve genelde öncelikle topluluk etkileşimi gibi diğer uygulamalara biraz zaman ve çaba harcamanız gerekir. İçerik Üreticiler için Google'daki dostlarımız, [kitlenizi oluşturma ve onlarla etkileşim kurma](https://creators.google/en-us/content-creation-guides/audience-engagement/?hl=tr) ile ilgili muhteşem kaynaklara sahiptir.

Şirketinizin veya sitenizin çevrimdışı tanıtımıyla uğraşmanız da faydalı olabilir. Örneğin, bir işletme siteniz varsa kartvizitler, antetler, afişler ve diğer materyallerinizde sitenizin URL'sinin yer aldığından emin olun. Ayrıca, izinlerini aldığınızda takdirde kitlenize yinelenen bültenler göndererek web sitenizdeki yeni içerikleri haber verebilirsiniz.

Hayattaki her şeyde olduğu gibi, sitenizi tanıtma konusunda aşırıya kaçmanız sitenize zarar verebilir. Kullanıcılar, tanıtımlarınızdan bıkabilir ve arama motorları bu uygulamaların bazılarını [arama sonuçlarına müdahale](https://developers.google.com/search/docs/essentials/spam-policies?hl=tr) olarak algılayabilir.

## Odaklanmamanız gerektiğini düşündüğümüz konular

SEO geliştikçe bu konuyla ilgili fikirler ve uygulamalar da (ve zaman zaman yanlış düşünceler) gelişti. Eskiden en iyi uygulama veya en büyük öncelik olarak kabul edilen şeyler, arama motorlarının (ve internetin) zaman içindeki gelişimi nedeniyle artık alakalı veya etkili olmayabilir.

SEO açısından gerçekten önemli olan konulara odaklanmanıza yardımcı olmak için internette dolaştığını gördüğümüz en yaygın ve öne çıkan konulardan bazılarını bir araya getirdik. Bu konularda genel olarak işletme alanınız için en iyi olanı yapmanızı öneririz. Aşağıda birkaç noktaya detaylı olarak değineceğiz:

| Meta anahtar kelimelerGoogle Arama, [anahtar kelime meta etiketini kullanmaz](https://developers.google.com/search/blog/2009/09/google-does-not-use-keywords-meta-tag?hl=tr).Anahtar kelime doldurmaAynı kelimeleri tekrar tekrar kullanmak (başka sözcüklerle ifade edilmiş olsa bile) kullanıcıları yorar ve [anahtar kelime doldurma, Google'ın spam politikalarına aykırıdır](https://developers.google.com/search/docs/essentials/spam-policies?hl=tr#keyword-stuffing).Alan adı veya URL yolundaki anahtar kelimelerSitenizin adını seçerken işletmeniz için en iyi olanı yapın. Kullanıcılar sizi bu adla bulacağı için genel pazarlama en iyi uygulamalarını kullanmanızı öneririz. Sıralama açısından bakarsak da alan adındaki (veya URL yolundaki) anahtar kelimelerin, [içerik haritalarında](https://developers.google.com/search/docs/appearance/visual-elements-gallery?hl=tr#breadcrumb) görünme dışında tek başına pek bir etkisi yoktur.Alan adlarından bahsetmeye devam ediyorken TLD'nin (ör. ".com" veya ".guru" ile biten alan adı) yalnızca belirli bir ülkedeki kullanıcıları hedefliyorsanız önemli olduğunu ve o durumda bile genellikle düşük etkili bir sinyal olduğunu belirtmek isteriz. Örneğin, İsviçre'den arama yapan kullanıcılara Hollanda peyniri satmaya çalışıyorsanız .ch alan adını kullanmak mantıklıdır (hem işletme hem de [SEO bakış açısından](https://developers.google.com/search/docs/specialty/international/managing-multi-regional-sites?hl=tr#geotargeting)). Aksi takdirde, Google Arama hangi TLD'yi (.com, .org veya .asia) kullandığınızla ilgilenmez.Minimum veya maksimum içerik uzunluğuİçeriğin uzunluğu, sıralama açısından tek başına önemli değildir (büyülü bir minimum veya maksimum kelime sayısı hedefi olmasa da en azından bir tane kelime kullanmanız gerekecektir). Farklı kelimeler kullanıyorsanız (tekrara düşmeyecek şekilde doğal bir dille yazıyorsanız) daha fazla anahtar kelime kullandığınız için Arama'da görünme şansınız artar. | Alt alan adları ve alt dizinlerin karşılaştırmasıİşletme bakış açısından düşünürsek işletmeniz için uygun olanı yapın. Örneğin, alt dizinler bazında segmentlere ayrılmış bir siteyi yönetmek daha kolay olsa da bazen sitenizin konusuna veya sektörüne bağlı olarak konuları alt alan adlarına bölmek de mantıklı olabilir.PageRankBağlantıları kullanan [PageRank](https://developers.google.com/search/docs/appearance/ranking-systems-guide?hl=tr#link-analysis), Google'ın temel algoritmalarından biri olsa da Google Arama'da bağlantılardan çok daha fazlası mevcuttur. Birçok sıralama sinyalimiz vardır ve PageRank bunlardan yalnızca biridir.Yinelenen içerik "cezası"Birden fazla URL'den erişilebilen içeriğiniz varsa bu bir sorun değildir ve endişelenmenize gerek yoktur. Bu yaklaşım verimsiz olsa da manuel işlem uygulanmasına neden olmaz. [Başkalarının içeriklerini kopyalamak ise apayrı bir konudur.](https://developers.google.com/search/docs/essentials/spam-policies?hl=tr#scraped-content)Başlık sayısı ve sırasıBaşlıklarınızın anlamsal sırada olması ekran okuyucular açısından çok faydalı olsa da Google Arama açısından bakıldığında bunları herhangi bir sırası olmadan kullanmanız önemli değildir. Web genel olarak geçerli bir HTML olmadığından Google Arama, HTML spesifikasyonunda gizlenen semantik anlamları nadiren kullanabilir.Ayrıca, belirli bir sayfanın içermesi gereken büyülü ve ideal bir başlık sayısı da yoktur. Ancak sayının çok fazla olduğunu düşünüyorsanız muhtemelen fazladır.D-U-Y-G'nin bir sıralama faktörü olduğunu düşünme[Hayır, değil.](https://developers.google.com/search/docs/fundamentals/creating-helpful-content?hl=tr#eat) |
| ------------------------------------------------------------ | ------------------------------------------------------------ |
|                                                              |                                                              |

## Sonraki adımlar

- **Search Console'u kullanmaya başlayın**: Search Console hesabı oluşturmanız, web sitenizin Google Arama'daki performansını izlemenize ve optimize etmenize yardımcı olur. [Hesabınızı nasıl oluşturacağınızı ve ilk olarak hangi raporlara göz atmanız gerektiğini](https://developers.google.com/search/docs/monitor-debug/search-console-start?hl=tr) öğrenin.
- **Zaman içinde web sitenizin SEO'sunu koruyun**: Site taşıma işlemine hazırlanma veya çok dilli bir siteyi yönetme gibi daha ayrıntılı SEO görevleri ve senaryoları da dahil olmak üzere [uzun vadede sitenizin varlığını yönetme](https://developers.google.com/search/docs/fundamentals/get-started?hl=tr) hakkında daha fazla bilgi edinin.
- **Sitenizin Google Arama sonuçlarındaki görünümünü iyileştirin**: Sayfalarınızda geçerli [yapılandırılmış veriler](https://developers.google.com/search/docs/appearance/structured-data/intro-structured-data?hl=tr) olması, sayfalarınızın Google Arama sonuçlarındaki yorum yıldızları, bantlar vb. pek çok özel özelliğe uygun olmasını da sağlar. Sayfanızın uygun olabileceği [arama sonucu türleri galerisine](https://developers.google.com/search/docs/appearance/structured-data/search-gallery?hl=tr) bakın.



# Google Arama'nın işleyiş şekliyle ilgili ayrıntılı kılavuz





Google Arama, dizinimize eklenecek sayfaları bulmak üzere web'i düzenli olarak keşfetmek için web tarayıcıları adlı yazılımı kullanan tam otomatik bir arama motorudur. Aslında arama sonuçlarımızda listelenen sayfaların büyük çoğunluğu, eklenmek üzere manuel olarak gönderilmiş siteler değil, web tarayıcılarımızın web’i tararken keşfedip otomatik olarak eklediği sitelerdir. Bu dokümanda, Arama'nın web siteniz bağlamında işleyiş şeklinin aşamaları açıklanmaktadır. Bu temel bilgilere sahip olmanız, tarama sorunlarını çözmenize, sayfalarınızın dizine eklenmesini sağlamanıza ve sitenizin Google Arama'da nasıl görüneceğini optimize etmenize yardımcı olabilir.

Daha az teknik bilgiye mi ihtiyacınız var? Arama'nın işleyiş şeklini, arama yapan kullanıcının bakış açısından açıklayan [Arama'nın İşleyiş Şekli sitemize](https://www.google.com/search/howsearchworks/?hl=tr) göz atın.

## Başlamadan önce göz önüne alınması gereken bazı noktalar

Arama'nın işleyiş şekline dair ayrıntılara girmeden önce, Google'ın bir siteyi daha sık taramak veya daha üst sırada göstermek için ödeme kabul etmediğini unutmayın. Kim size bunun tersini söylerse yanılıyordur.

Sayfanız [Google Arama Yönergeleri](https://developers.google.com/search/docs/essentials?hl=tr)'ne uygun olsa bile Google, sayfanızın taranacağını, dizine ekleneceğini veya yayınlanacağını garanti etmez.

## Google Arama'nın üç aşaması

Google Arama üç aşamada çalışır (tüm sayfalar her aşamadan geçmez):

1. [**Tarama:**](https://developers.google.com/search/docs/fundamentals/how-search-works?hl=tr#crawling) Google, tarayıcı adı verilen otomatik programları kullanarak internette bulduğu sayfalardaki metin, resim ve videoları indirir.
2. [**Dizine ekleme:**](https://developers.google.com/search/docs/fundamentals/how-search-works?hl=tr#indexing) Google, sayfadaki metni, resimleri ve video dosyalarını analiz edip elde ettiği bilgileri büyük bir veritabanı olan Google dizininde depolar.
3. [**Arama sonuçlarını yayınlama:**](https://developers.google.com/search/docs/fundamentals/how-search-works?hl=tr#serving) Bir kullanıcı Google'da arama yaptığında Google, kullanıcının sorgusuyla alakalı bilgileri döndürür.

## Tarama

İlk aşama web'de hangi sayfaların olduğunu bulmaktır. Tüm web sayfalarının kaydedildiği tek bir yer yoktur. Bu yüzden Google'ın sürekli olarak yeni ve güncellenmiş sayfaları bulup bunları bilinen sayfalar listesine eklemesi gerekir. Bu işleme "URL keşfi" denir. Google daha önce ziyaret ettiğinden bazı sayfalar hakkında bilgi sahibidir. Google, diğer sayfaları ise bilinen bir sayfadan yeni sayfalara giden bağlantıları (örneğin, kategori sayfası gibi bir merkez sayfasından yeni blog yayınına giden bir bağlantı) çıkararak keşfeder. Bunların dışında, taranması için sayfa listesini ([site haritası](https://developers.google.com/search/docs/crawling-indexing/sitemaps/overview?hl=tr)) Google'a gönderdiğinizde de diğer sayfalar keşfedilir.



Google bir sayfanın URL'sini keşfettikten sonra içinde ne olduğunu öğrenmek için sayfayı ziyaret edebilir (veya "tarayabilir"). Web’deki milyarlarca sayfayı taramak için muazzam sayıda bilgisayardan yararlanırız. Getirme işlemini yapan programın adı [Googlebot](https://developers.google.com/search/docs/crawling-indexing/googlebot?hl=tr)’tur (robot, bot veya örümcek olarak da bilinir). Googlebot; taranacak siteleri, tarama sıklığını ve her siteden kaç sayfanın getirileceğini belirlemek için algoritmik bir işlemden yararlanır. [Google tarayıcıları](https://developers.google.com/search/docs/crawling-indexing/overview-google-crawlers?hl=tr) da yoğunluğa yol açmamak için siteyi çok hızlı taramamaya çalışacak şekilde programlanır. Bu mekanizma, sitenin yanıtlarına bağlıdır (örneğin, [HTTP 500 hataları "yavaşla" anlamına gelir](https://developers.google.com/search/docs/crawling-indexing/http-network-errors?hl=tr#http-status-codes)).

Bununla birlikte, Googlebot, bulduğu tüm sayfaları taramaz. Bazı sayfaların [taranmasına site sahibi izin vermeyebilir](https://developers.google.com/search/docs/crawling-indexing/robots/robots_txt?hl=tr#disallow), bazı sayfalara erişmek için siteye giriş yapılması gerekebilir.

Tarama sırasında Google sayfayı oluşturur ve [Chrome](https://www.google.com/chrome/?hl=tr)'un son sürümünü kullanarak [bulduğu tüm JavaScript kodlarını çalıştırır](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics?hl=tr#how-googlebot-processes-javascript). Bu, web tarayıcınızın ziyaret ettiğiniz sayfaları oluşturmasına benzer. Web siteleri, içeriği sayfada göstermek için genellikle JavaScript'e ihtiyaç duyduğundan oluşturma işlemi önemlidir. Aksi takdirde Google, sayfayı oluşturmadan içeriği göremeyebilir.

Tarama, Google tarayıcılarının siteye erişip erişemediğine bağlıdır. Googlebot’un sitelere erişmesiyle ilgili yaygın sorunlardan bazıları şunlardır:

- [Siteyi yöneten sunucuyla ilgili sorunlar](https://developers.google.com/search/docs/crawling-indexing/http-network-errors?hl=tr#http-status-codes)
- [Ağ sorunları](https://developers.google.com/crawling/docs/troubleshooting/dns-network-errors?hl=tr)
- [Googlebot'un sayfaya erişmesini engelleyen robots.txt kuralları](https://developers.google.com/search/docs/crawling-indexing/robots/intro?hl=tr)

## Dizine ekleme

Bir sayfa tarandıktan sonra, Google sayfanın neyle ilgili olduğunu anlamaya çalışır. Bu aşama, dizine ekleme olarak adlandırılır ve metin içeriğinin, önemli içerik etiketlerinin ve özelliklerin ([`` öğeleri](https://developers.google.com/search/docs/appearance/title-link?hl=tr) ve alt özellikleri, [resimler](https://developers.google.com/search/docs/appearance/google-images?hl=tr), [videolar](https://developers.google.com/search/docs/appearance/video?hl=tr) ve diğer özellikler gibi) işlenip analiz edilmesi sürecini içerir.



Google, dizine ekleme işlemi sırasında bir sayfanın, [internetteki başka bir sayfanın veya standart sayfanın kopyası](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls?hl=tr) olup olmadığını belirler. Standart sayfa, arama sonuçlarında gösterilebilen sayfadır. Standart sayfayı seçmek için önce internette bulduğumuz ve benzer içeriğe sahip sayfaları gruplarız (buna küme oluşturma da denir). Ardından grubu en iyi şekilde temsil eden sayfayı seçeriz. Grubun diğer sayfaları, farklı bağlamlarda (örneğin, kullanıcının mobil cihazdan arama yaptığı veya bu kümedeki çok spesifik bir sayfayı aradığı) sunulabilecek alternatif sürümlerdir.

Google, standart sayfa ve içeriğiyle ilgili sinyaller de toplar. Bu sinyaller, bir sonraki aşama olan sayfayı arama sonuçlarında sunma sırasında kullanılabilir. Bu sinyallerden bazıları arasında sayfanın dili, içeriğin bulunduğu ülke, sayfanın kullanılabilirliği yer alır.

Standart sayfa ve grubuyla ilgili toplanan bilgiler, binlerce bilgisayarda barındırılan büyük bir veritabanı olan Google dizininde depolanabilir. Sayfaların dizine ekleneceği garanti değildir. Google'ın işlediği her sayfa dizine eklenmez.

Dizine ekleme, sayfanın içeriğine ve sayfadaki meta verilere de bağlıdır. Dizine eklemeyle ilgili yaygın sorunlarından bazıları şunlardır:

- [Sayfadaki içeriğin kalitesi düşük](https://developers.google.com/search/docs/essentials?hl=tr)
- [Robots `meta` kuralı dizine eklemeye izin vermiyor](https://developers.google.com/search/docs/crawling-indexing/block-indexing?hl=tr)
- [Web sitesinin tasarımı dizine eklemeyi zorlaştırabilir](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics?hl=tr)

## Arama sonuçlarını sunma

Sıralama otomatik yapılır ve Google, sayfaları daha üst sırada göstermek için ödeme kabul etmez. [Google Arama'daki reklamlar hakkında daha fazla bilgi edinin](https://www.google.com/search/howsearchworks/our-approach/ads-on-search/?hl=tr).

Kullanıcı bir sorgu girdiği zaman, makinelerimiz, dizinde eşleşen sayfa olup olmadığını anlamak için arama yapar ve kullanıcının sorgusuyla en alakalı olduğunu düşündüğümüz en yüksek kaliteye sahip sonuçları döndürür. Alaka düzeyi belirlenirken kullanıcının konumu, dili ve cihazı (masaüstü veya telefon) gibi bilgileri içerebilen yüzlerce faktörden yararlanılır. Örneğin, "bisiklet tamircisi" araması, Paris'teki bir kullanıcıyla Hong Kong'daki bir kullanıcıya farklı sonuçlar gösterecektir.



Kullanıcının sorgusuna bağlı olarak arama sonuçları sayfasında görünen arama özellikleri de değişir. Örneğin, "bisiklet tamircileri" araması muhtemelen yerel sonuçlar gösterirken [görsel sonuçlar](https://developers.google.com/search/docs/appearance/visual-elements-gallery?hl=tr#image-result) sunmaz. Ancak "modern bisiklet" araması yapıldığında görsel sonuçlar gösterilme olasılığı artarken yerel sonuçlar gösterilmez. [Görsel Öğe Galerimizde](https://developers.google.com/search/docs/appearance/visual-elements-gallery?hl=tr), Google Web Araması'nın en yaygın kullanıcı arayüzü öğelerini keşfedebilirsiniz.

Search Console, bir sayfanın dizine eklendiğini belirtebilir ancak bu sayfayı, arama sonuçlarında görmezsiniz. Bunun nedeni aşağıdakilerden biri olabilir:

- [Sayfadaki içerik, kullanıcıların sorgularıyla alakalı değildir](https://developers.google.com/search/docs/fundamentals/seo-starter-guide?hl=tr#expect-search-terms)
- [İçeriğin kalitesi düşüktür](https://developers.google.com/search/docs/essentials?hl=tr)
- [Robots `meta` kuralı, sayfanın sunulmasını engelliyordur](https://developers.google.com/search/docs/crawling-indexing/block-indexing?hl=tr)

Bu kılavuzda Arama'nın işleyiş şekli anlatılmış olsa da algoritmalarımızı geliştirmek için sürekli çalışıyoruz. [Google Arama Merkezi blogunu](https://developers.google.com/search/blog?hl=tr) takip ederek bu değişiklikler hakkında bilgi edinebilirsiniz.







# Kullanıcı odaklı, faydalı ve güvenilir içerikler oluşturma



Google'ın [otomatik sıralama sistemleri](https://www.google.com/search/howsearchworks/how-search-works/ranking-results/?hl=tr), arama motoru sıralamalarını etkilemek için oluşturulan içerikleri değil, kullanıcıların yararlanması için oluşturulan faydalı ve güvenilir bilgilere öncelik verecek şekilde tasarlanmıştır. Bu sayfa, içerik üreticilerin bu gibi faydalı içerikler üretip üretmediklerini değerlendirmelerine yardımcı olmayı amaçlamaktadır.

## İçeriğinizle ilgili kişisel değerlendirme yapma 

Kendi içeriğinizi bu sorulara göre değerlendirmek, oluşturduğunuz içeriğin faydalı ve güvenilir olup olmadığını ölçmenize yardımcı olabilir. Kendinize bu soruları sormanın ötesinde, güvendiğiniz ancak sitenizle bağı olmayan başkalarının dürüst bir değerlendirme sağlamasını düşünün.

Ayrıca, yaşamış olabileceğiniz düşüşü denetlemeyi düşünün. En çok hangi sayfalar, hangi arama türleri için etkilendi? İçeriklerin buradaki soruların bazılarına göre nasıl değerlendirildiğini anlamak için bu sayfaları yakından inceleyin.

### İçerik ve kalite soruları

- İçerik özgün bilgiler, raporlar, araştırma sonuçları veya analizler sağlıyor mu?
- İçerik, konuyla ilgili önemli, tam veya kapsamlı bir açıklama sağlıyor mu?
- İçerik bariz olanın ötesinde, kapsamlı analiz veya ilginç bilgiler sağlıyor mu?
- İçerik başka kaynaklardan yararlanıyorsa, bu kaynakları kopyalamaktan veya yeniden yazmaktan kaçınıyor ve bunun yerine önemli bir ek değer ve özgünlük getiriyor mu?
- Ana başlık veya sayfa başlığı içeriğin açıklayıcı, faydalı bir özetini sağlıyor mu?
- Ana başlık veya sayfa başlığı abartıdan ya da şoke edici olmaktan kaçınıyor mu?
- Bu, yer işareti koymak, arkadaşınızla paylaşmak veya önermek istediğiniz türden bir sayfa mı?
- Bu içeriği basılı bir dergide, ansiklopedide veya kitapta görmeyi ya da bu tür kaynaklar tarafından referans verilmesini bekler miydiniz?
- İçerik, arama sonuçlarındaki diğer sayfalara kıyasla önemli bir değer sağlıyor mu?
- İçerikte yazım veya stil sorunları var mı?
- İçerik iyi üretilmiş mi yoksa özensiz veya aceleyle hazırlanmış gibi mi görünüyor?
- İçerik, dışarıdan çok sayıda içerik oluşturucunun katkısıyla toplu olarak mı oluşturulmuş, yoksa tek tek sayfaların veya sitelerin dikkat çekmeyeceği ya da önemsenmeyeceği şekilde çok sayıda siteden oluşan büyük bir ağa mı yayılmış?

### Uzmanlık soruları

- İçeriğin sunuluşu bu içeriğe güvenmeyi tercih etmenize neden oluyor mu? Örneğin, kaynaklar açıkça belirtilmiş, ilgili uzmanlığa ait kanıtlar sunulmuş, yazar veya yayınlayan site hakkında bilgi (yazarın sayfasına veya sitenin Hakkında sayfasına verilen bağlantılar aracılığıyla) verilmiş mi?
- İçeriği üreten siteyi inceleyen bir kullanıcı, sitenin güvenilir olduğu ya da konuyla ilgili genel anlamda bir otorite olarak tanındığı izlenimini edinir mi?
- Bu içerik bir uzman veya konuyu iyi bildiği anlaşılan meraklı biri tarafından mı yazılmış veya incelenmiş?
- İçerikte kolayca doğrulanabilen maddi hatalar var mı?

## Mükemmel bir sayfa deneyimi sunma 

Google'ın temel sıralama sistemleri, iyi bir sayfa deneyimi sunan içerikleri ödüllendirmeyi amaçlar. Sistemlerimizle başarıya ulaşmak isteyen site sahipleri, sayfa deneyiminin yalnızca bir veya iki unsuruna odaklanmamalıdır. Bunun yerine, birçok açıdan genel olarak iyi bir sayfa deneyimi sunup sunmadığınızı kontrol edin. Daha fazla öneri için [Google Arama sonuçlarında sayfa deneyimini anlama](https://developers.google.com/search/docs/appearance/page-experience?hl=tr) sayfamıza göz atın.

## Kullanıcı odaklı içeriklere ağırlık verin

Kullanıcı odaklı içerikler, arama motoru sıralamalarını etkileme amacıyla değil, öncelikle kullanıcılar için oluşturulmuş içerikleri ifade eder. Kullanıcı odaklı içerikler oluşturup oluşturmadığınızı nasıl değerlendirebilirsiniz? Aşağıdaki sorulara evet yanıtı vermeniz, muhtemelen kullanıcı odaklı bir yaklaşım benimsediğiniz anlamına gelir:

- İşletmeniz veya siteniz için, doğrudan size gelseler içeriğinizi faydalı bulabilecek mevcut veya hedeflediğiniz bir kitle var mı?
- İçeriğinizde birinci elden uzmanlık ve kapsamlı bilgi (ör. bir ürün veya hizmeti gerçekten kullanmış ya da bahsedilen yeri ziyaret etmiş olmanın sağladığı uzmanlık) açıkça gösteriliyor mu?
- Sitenizin birincil amacı veya odaklandığı bir konu var mı?
- İçeriğinizi okuyan bir kullanıcı, ilgili konuda amacına ulaşmasını sağlayacak düzeyde bilgi edindiğini hisseder mi?
- İçeriğinizi okuyan bir kullanıcı tatmin edici bir deneyim yaşadığını düşünür mü?

## Arama motoru odaklı içerik oluşturmaktan kaçınma

Google Arama'da başarılı olmak istiyorsanız asıl amacı arama motoru sıralamalarını yükseltmek olan arama motoru odaklı içerikler yerine kullanıcı odaklı içerikler üretmeye öncelik vermenizi öneririz. Aşağıdaki soruların bazılarına veya tümüne evet yanıtı vermeniz, içerik oluşturma şeklinizi yeniden değerlendirmeniz gerektiğini gösteren bir uyarı niteliğindedir:

- İçeriğin amacı öncelikli olarak arama motorlarından gelen ziyaretçileri çekmek mi?
- Arama sonuçlarında iyi performans göstereceğini umarak farklı konularda çok fazla içerik üretiyor musunuz?
- Pek çok konuda içerik üretmek için kapsamlı otomasyon kullanıyor musunuz?
- Esas olarak, fazla değer katmadan başkalarının söylediklerini özetliyor musunuz?
- Konuları normalde mevcut kitleniz için yazacağınız şeyler olduğundan değil, yalnızca trend oldukları için mi yazıyorsunuz?
- İçeriğinizi okuyan kullanıcılar, diğer kaynaklardan daha iyi bilgi bulmak için tekrar arama yapmaları gerektiğini düşünüyor mu?
- Google'ın tercih ettiği bir kelime sayısı olduğunu duyduğunuz veya okuduğunuz için yazılarınızı bu kelime sayısına göre mi yazıyorsunuz? (Bizim böyle bir kelime sayısı tercihimiz yok).
- Belirli bir konu hakkında bilgi sahibi olmadan yalnızca arama trafiği elde etmek amacıyla mı o konu hakkında bilgi sağlamaya karar verdiniz?
- İçeriğiniz, yanıtı olmayan bir soruyla ilgili yanıta sahip olduğunu mu iddia ediyor. Örneğin henüz yayın tarihi belli olmayan bir ürünün, filmin veya TV dizisinin yayın tarihini mi veriyor?
- İçerik önemli ölçüde değişmemesine rağmen sayfaların güncel görünmesini sağlamak için tarihlerini değiştiriyor musunuz?
- Sitenizi bir şekilde "güncel" göstererek genel arama sıralamanızı iyileştireceğine inandığınız için çok sayıda yeni içerik ekliyor veya çok sayıda eski içerik kaldırıyor musunuz? (Hayır, bunu yapmak sıralamanızı iyileştirmez)

### Peki ya SEO? Bu süreç de arama motoru odaklı değil mi?

Arama motorlarının içeriğinizi daha iyi keşfetmesine ve anlamasına yardımcı olmak için yapabileceğiniz bazı işlemler vardır. Bu işlemlere toplu olarak "arama motoru optimizasyonu" veya kısaca SEO denir. Göz önüne alınması gereken en iyi uygulamalar [Google'ın kendi SEO kılavuzunda](https://developers.google.com/search/docs/fundamentals/seo-starter-guide?hl=tr) açıklanmıştır. SEO, arama motoru odaklı içerikler yerine kullanıcı odaklı içeriklere uygulandığında faydalı bir süreç olabilir.

## D-U-Y-G (E-E-A-T) ve kalite değerlendirici yönergelerini öğrenme

Google'ın otomatik sistemleri, kaliteli içeriği sıralamak için [birçok farklı faktörü](https://www.google.com/search/howsearchworks/how-search-works/ranking-results/?hl=tr) kullanacak şekilde tasarlanmıştır. Sistemlerimiz, alakalı içerikleri tanımladıktan sonra bunlar arasında en faydalı görünenlere öncelik vermeyi amaçlar. Bunun için de hangi içeriklerin deneyim, uzmanlık, yetkinlik ve güvenilirlik (D-U-Y-G olarak da adlandırırız) gösterdiğini belirlemeye yardımcı olabilecek çeşitli faktörleri belirler.

Bu unsurlardan en önemlisi güvendir. Diğer unsurlar güveni artırır, ancak içeriklerin bunların hepsine sahip olması gerekmez. Örneğin, bazı içerikler paylaştığı deneyime bağlı olarak faydalı olurken diğer içerikler de paylaştığı yetkinlik nedeniyle faydalı olabilir.

D-U-Y-G'nin kendisi belirli bir sıralama faktörü olmasa da iyi D-U-Y-G'ye sahip içerikleri belirleyen faktörlerin bir arada kullanılması faydalıdır. Örneğin, sistemlerimiz sağlık, finansal istikrar, insanların güvenliği, toplumsal refah veya sağlığı önemli ölçüde etkileyebilecek konularda D-U-Y-G'ye tam anlamıyla uygun olan içeriğe daha da fazla önem verir. Bunlar, "Paranız ya da Hayatınız" konuları veya kısaca YMYL olarak adlandırılır.

Değerlendiriciler, algoritmalarımızın iyi sonuçlar verip vermediği konusunda [bize bilgi veren](https://www.google.com/search/howsearchworks/how-search-works/rigorous-testing/?hl=tr) kullanıcılardır. Bu yöntem, değişikliklerimizin işe yaradığını doğrulamamıza yardımcı olur. Özellikle, değerlendiriciler, içeriğin D-U-Y-G'ye tam anlamıyla sahip olup olmadığını anlamaları için eğitilir. Bunu yapmak için kullandıkları ölçütler, [arama kalitesi değerlendirici yönergelerimizde](https://services.google.com/fh/files/misc/hsw-sqrg.pdf?hl=tr) açıklanmıştır.

Arama değerlendiricilerin, sayfaların sıralaması üzerinde hiçbir kontrolü yoktur. Değerlendirici verileri doğrudan sıralama algoritmalarımızda kullanılmaz. Aksine, biz bunları bir restoranın müşterilerinden aldığı geri bildirim kartları gibi kullanırız. Bu geri bildirimler sistemlerimizin çalışıp çalışmadığını öğrenmemize yardımcı olur.

Yönergeleri okumak, içeriğinizin D-U-Y-G açısından ne durumda olduğunu ve dikkate alınacak iyileştirmeleri kendi kendinize değerlendirmenize yardımcı olabilir. Ayrıca, otomatik sistemlerimizin içeriği sıralamak için kullandığı farklı sinyallerle içeriğinizi kavramsal açıdan uygun hale getirmenize yardımcı olabilir.

## İçeriğiniz için "Kim, Nasıl ve Neden" sorularını sorma

Sistemlerimizin neyi ödüllendirdiğini anlamak için içeriklerinizi "Kim, Nasıl ve Neden" sorularına göre değerlendirebilirsiniz.

### İçeriği "kim" oluşturdu?

İçeriği kimin oluşturduğunun net bir şekilde anlaşılması kullanıcıların, içeriği D-U-Y-G açısından sezgisel olarak anlamasına yardımcı olan bir şeydir. Bu noktada, **"Kim"** sorusunun göz önünde bulundurulması gerekir. İçerik oluştururken düşünmeniz gereken bazı "kim" sorularını aşağıda bulabilirsiniz:

- Ziyaretçileriniz, içeriğinizi kimin yazdığını net bir şekilde anlayabiliyor mu?
- Ziyaretçilerin bu bilgileri görmeyi bekleyeceği sayfalarda yazar adının bulunduğu satır var mı?
- Yazar adının bulunduğu satır, yazarlar ve hangi konularda yazdıkları hakkında arka plan bilgisi vererek içerikte yer alan yazar veya yazarlarla ilgili daha fazla ayrıntı sağlıyor mu?

İçeriği kimin oluşturduğunu açıkça belirtiyorsanız muhtemelen D-U-Y-G kavramlarına uymuşsunuzdur ve başarıya giden yoldasınızdır. Doğru yazar bilgilerini sağlamanızı (ör. okuyucuların bu bilgileri görmeyi bekleyebileceği içeriklere yazar adının bulunduğu satır eklenmesi) önemle tavsiye ederiz.

### İçerik "nasıl" oluşturuldu?

Okuyucuların bir içeriğin nasıl üretildiğini bilmesi faydalıdır. Bunun için de içeriğinizle ilgili **"Nasıl"** sorusunu düşünmeniz gerekir.

Örneğin, ürün yorumları sayesinde, okuyucular test edilen ürünlerin sayısını, test sonuçlarının ne olduğunu ve testlerin nasıl gerçekleştirildiğini anladığında ve bu çalışmalarla ilgili kanıtları (ör. fotoğraflar) gördüğünde okuyucuların güvenini kazanabilirsiniz. [Yüksek kaliteli ürün yorumları yazma](https://developers.google.com/search/docs/specialty/ecommerce/write-high-quality-reviews?hl=tr) yardım sayfamızda da bu tavsiyeyle ilgili daha fazla bilgi bulabilirsiniz.

Birçok içerik türünde "Nasıl" bileşeni olabilir. Buna otomatik, yapay zeka tarafından oluşturulan ve yapay zeka destekli içerikler dahildir. Süreçlerle ilgili ayrıntılar paylaşılırsa okuyucular ve ziyaretçiler, otomasyonun sunduğu benzersiz ve yararlı rolleri daha iyi anlayabilir.

Otomasyon çok fazla sayıda içerik oluşturmak için kullanılıyorsa kendinize aşağıdaki soruları sorabilirsiniz:

- Yapay zeka ile oluşturma da dahil olmak üzere otomasyon kullanımı, açıklamalarla veya başka yollarla ziyaretçiler tarafından net bir şekilde anlaşılıyor mu?
- İçerik oluşturmak için otomasyon veya yapay zeka ile oluşturmanın nasıl kullanıldığı hakkında arka plan bilgisi sağlıyor musunuz?
- Otomasyonun veya yapay zekanın, içerik üretmek için neden yararlı görüldüğünü açıklıyor musunuz?

Genel olarak, yapay zeka veya otomasyon açıklamaları, bir kullanıcının "Bu içerik nasıl oluşturuldu?" diye düşünebileceği içerikler için yararlıdır. Kullanıcıların bu bilgileri görmeyi bekleyeceği durumlarda bu açıklamaları ekleyin. Daha fazla bilgi için blog yayınımıza ve SSS bölümüne bakın: [Google Arama, yapay zeka tarafından oluşturulan içerikleri nasıl görür?](https://developers.google.com/search/blog/2023/02/google-search-and-ai-content?hl=tr)

### İçerik "neden" oluşturuldu?

**"Neden"** sorusu belki de içeriğinizle ilgili cevaplanması gereken en önemli sorudur. İçerik esasen neden oluşturuldu?

"Neden" sorusunun cevabı, kullanıcıların doğrudan sitenize gelmesi durumunda öncelikli olarak bu ziyaretçilere yardım eden içerikler üretmek olmalıdır. Bu yaklaşımı benimserseniz genel olarak D-U-Y-G kavramlarına ve [temel sıralama sistemlerimizin](https://developers.google.com/search/updates/core-updates?hl=tr) ödüllendirdiği noktalara uygun olursunuz.

"Neden" sorusunun cevabı, öncelikli olarak arama motoru ziyaretlerini artıran içerikler üretmekse bu yaklaşım, sistemlerimizin ödüllendirdiği noktalara uygun değildir. Asıl amacı arama sıralamalarını etkilemek olan içerikler üretmek için yapay zeka ile oluşturma da dahil otomasyon kullanılması [spam politikalarımızı ihlal etmektedir](https://developers.google.com/search/docs/essentials/spam-policies?hl=tr#scaled-content).





# SEO'ya ihtiyacınız var mı?





SEO, "arama motoru optimizasyonu" veya "arama motoru optimize edici" için kullanılan bir kısaltmadır. Bir SEO ile çalışma kararı, sitenizi geliştirip zaman kazanmanızı sağlayabilecek önemli bir karardır, ancak sitenize ve itibarınıza zarar verme riski de vardır. SEO'nun sitenize kazandırabileceği avantajların yanı sıra sorumsuzca hazırlanmış bir SEO'nun verebileceği zararları da araştırdığınızdan emin olun. Pek çok SEO ile diğer ajans ve danışmanlar, web sitesi sahipleri için aşağıdakiler gibi yararlı hizmetler sunmaktadır:

- Sitenizin içeriğini veya yapısını inceleme
- Web sitesinin geliştirilmesiyle ilgili teknik önerilerde bulunma. Örneğin, barındırma, yönlendirmeler, hata sayfaları, JavaScript kullanımı
- İçerik geliştirme
- Çevrimiçi iş geliştirme kampanyalarının yönetimi
- Anahtar kelime araştırma
- SEO eğitimi
- Belirli pazarlarda ve bölgelerde uzmanlık.

Google'da reklam vermenizin, sitenizin arama sonuçlarımızdaki durumu üzerinde hiçbir etkisi olmaz. Google, siteleri ücret karşılığında arama sonuçlarımıza eklemez veya sitelerin sıralamasını değiştirmez. Organik arama sonuçlarımızda görünmenin herhangi bir maliyeti yoktur. [Search Console](https://search.google.com/search-console?hl=tr), resmi [Google Arama Merkezi blogu](https://developers.google.com/search/blog?hl=tr) ve [tartışma forumumuz](https://support.google.com/webmasters/community?hl=tr) gibi kaynaklarda sitenizi organik arama için nasıl optimize edebileceğiniz konusunda bol miktarda bilgi bulabilirsiniz.

## SEO'yu kullanmaya başlama

Yerel çapta küçük bir işletmeniz varsa muhtemelen işin büyük bir kısmını kendiniz halledebilirsiniz. İşinize yarayabilecek bazı kaynakları aşağıda bulabilirsiniz:

- İşletmeniz için internette varlık oluşturmayla ilgili [video serimize](https://www.youtube.com/playlist?list=PLKoqnv2vTMUOHPb5IJIn-7egNRmsvbPIE&hl=tr) göz atın.
- [Arama'nın Temel Özellikleri](https://developers.google.com/search/docs/essentials?hl=tr)
- [Google web'de tarama, dizine ekleme ve yayınlama işlemlerini nasıl yapar?](https://developers.google.com/search/docs/fundamentals/how-search-works?hl=tr)
- SEO'nuzun sizin için yapacaklarının birçoğunu [SEO başlangıç kılavuzunda](https://developers.google.com/search/docs/fundamentals/seo-starter-guide?hl=tr) bulabilirsiniz. Bu iş için bir uzmandan yardım alacaksanız bu kılavuzu iyice öğrenmeniz gerekmez. Yine de bu tekniklerden haberdar olmak sizin yararınıza olacaktır. Bu sayede, SEO, önerilmeyen veya daha da kötüsü kesinlikle tavsiye edilmeyen bir teknik kullanmak isterse bunu bilirsiniz.

Sonuçları görebilmeniz için biraz zaman geçmesi gerektiğini unutmayın. Genellikle değişiklik yapmaya başladıktan sonraki dört ay ila bir yıl içinde faydalarını görmeye başlarsınız.

Yine de bir uzmandan ekstra yardım almanız gerektiğini düşünüyorsanız SEO seçimiyle ilgili bölümü okuyun.

## SEO seçimi

Bir SEO ile çalışmayı düşünüyorsanız ne kadar çabuk harekete geçerseniz o kadar iyi olur. SEO ile çalışmaya başlamak için en uygun zaman, bir siteyi yeniden tasarlamayı veya yeni bir siteyi devreye sokmayı düşündüğünüz zamandır. Bu şekilde SEO'nuz ve siz, daha en başından sitenizin, arama motorlarına uygun bir şekilde tasarlanmasını sağlayabilirsiniz. Bununla birlikte iyi bir SEO, mevcut bir siteyi de iyileştirmeye yardımcı olabilir.

1. **Önerilen değişiklikleri uygulama konusunda kararlı olun.** SEO tarafından önerilen değişikliklerin yapılması zaman ve çaba gerektirir. Bu değişiklikleri yapmaya zaman ayırmayacaksanız bir uzmanla çalışmanıza değmez.

2. Potansiyel SEO'nuzla görüşme yapın.

    

   SEO'ya yöneltebileceğiniz bazı yararlı sorular şunlardır:

   - Önceki çalışmalarınızdan örnekler gösterebilir ve başarı öykülerinizden bazılarını bizimle paylaşır mısınız?
   - Google Arama'nın Temel Özellikleri'ne uyuyor musunuz?
   - Organik aramaya ek olarak çevrimiçi pazarlama hizmetleri veya önerisi sunuyor musunuz?
   - Ne kadar zamanda, nasıl sonuçlar bekliyorsunuz? Başarınızı nasıl ölçüyorsunuz?
   - Sektörümüzdeki deneyiminiz nedir?
   - Ülkemizdeki/şehrimizdeki deneyiminiz nedir?
   - Uluslararası siteler hazırlama konusunda deneyiminiz nedir?
   - En önemli SEO teknikleriniz nelerdir?
   - Ne kadar zamandır bu işle ilgileniyorsunuz?
   - Sizinle nasıl iletişim kurabilirim? Sitemizde yaptığınız değişikliklerin tümünü bizimle paylaşıp önerileriniz hakkında nedenleriyle birlikte bize ayrıntılı bilgi verecek misiniz?
   - SEO'nun sizinle ve işletmenizle ilgilenip ilgilenmediğine bakın. İlgilenmiyorsa ilgilenen birini bulun. SEO'nuz aşağıdakilere benzer sorular sormalıdır:
     - İşletmenizi veya hizmetinizi müşteriler için benzersiz ve değerli kılan nedir?
     - Müşterileriniz kimler?
     - İşletmeniz nasıl para kazanıyor ve arama sonuçları nasıl yardımcı olabilir?
     - Başka hangi reklam kanallarını kullanıyorsunuz?
     - Rakipleriniz kimler?

3. **SEO'nuzun profesyonel referanslarını kontrol edin**. Önceki müşterilerine bu SEO'nun faydalı bir hizmet sağlayıp sağlamadığını, birlikte çalışılması kolay bir insan olup olmadığını ve olumlu sonuçlar elde edip etmediğini sorun.

4. Sitenizi **hem teknik anlamda hem de arama açısından denetlemesini isteyin**. Böylece neyin neden yapılması gerektiğini düşündüğünü ve beklenmesi gereken sonucun ne olduğunu öğrenebilirsiniz. Muhtemelen bunun için ödeme yapmanız gerekir. Büyük ihtimalle Search Console'da SEO'ya sitenize salt okuma erişimi de vermeniz gerekir. (Bu aşamada yazma erişimi vermeyin.) Potansiyel SEO'nuz nelerin iyileştirilebileceğiyle ve yapılması gerekenlerle ilgili gerçekçi tahminlerde bulunabilmelidir. Yapacağı değişikliklerin sizi arama sonuçlarında birinci sıraya oturtacağını garanti ediyorsa başka birini bulun.

5. **Bir uzmanla çalışmak isteyip istemediğinize karar verin.**

### Önlemler

SEO'lar, müşterilerine değerli hizmetler sağlayabiliyor olsa da etik kuralları gözetmeyen bazı SEO'lar, agresif pazarlamacılık anlayışları ve arama sonuçlarına haksız yöntemlerle müdahale etme girişimleri yüzünden sektörün itibarını zedelemektedir. [Spam politikalarımızı](https://developers.google.com/search/docs/essentials/spam-policies?hl=tr) ihlal eden uygulamalar, sitenizin Google'daki varlığı ile ilgili olumsuz düzenleme yapılmasına ve hatta sitenizin dizinimizden kaldırılmasına neden olabilir.

SEO'nuz sitenizle ilgili birtakım öneriler getirdiğinde bu önerileri Search Console yardım sayfası, Google Arama Merkezi blog girişi veya [forumundaki](https://support.google.com/webmasters/community?hl=tr) Google onaylı yanıtlar gibi güvenilir bir kaynakla desteklemesini isteyin.

Aşağıda dikkat etmeniz gereken bazı konular sıralanmıştır:

- En yaygın hilelerden biri, aldatıcı yönlendirmeler kullanarak kullanıcıları başka bir siteye yönlendiren "gölge" alan adları oluşturmaktır. Çoğu zaman bu gölge alan adları, bir müşteri adına çalıştığını iddia eden SEO'nun kendisine aittir. Ancak aralarındaki ilişki bozulduğunda SEO alan adını farklı bir siteye, hatta rakibin alan adına yönlendirebilmektedir. Böyle bir durumda müşteri, tamamen SEO'ya ait olan bir rakip sitenin geliştirilmesi için para ödemiş olmaktadır.
- Başka bir yasal olmayan uygulama da, müşterinin sitesinde bir yere anahtar kelimelerle yüklü "köprü" sayfalar yerleştirmektir. SEO bu uygulamanın sayfayı daha fazla sorgu için daha alakalı hale getireceğini söylemektedir. Bu, doğası gereği yanlıştır; çünkü tek tek sayfalar çok çeşitli anahtar kelimeler ile nadiren alakalıdır. Bununla birlikte söz konusu hilelerden daha sinsice olan şey, köprü sayfaların genellikle SEO’nun diğer müşterilerine ait gizli bağlantılar da içermesidir. Bu tür köprü sayfalar sitenin bağlantı popülerliğini yavaş yavaş azaltmakta ve siteyi çirkin veya yasa dışı içerik barındıran sitelere de sahip olabilecek SEO'ya ve SEO’nun diğer müşterilerine yönlendirmektedir.
- Son olarak, sıralamanızı yükseltmek için başka sitelerden bağlantı satın almak gibi [bağlantı düzenlerine](https://developers.google.com/search/docs/essentials/spam-policies?hl=tr#link-spam) karışmayın. Bu, Google'ın spam politikalarına aykırıdır ve [sitenizin bir kısmına veya tamamına manuel işlem uygulanmasına](https://support.google.com/webmasters/answer/9044175?ref_topic=7440006&hl=tr#unnatural-links-to-your-site&zippy=,unnatural-links-to-your-site) yol açarak sıralamasını olumsuz yönde etkileyebilir.

Bir SEO tarafından herhangi bir şekilde aldatıldığınızı düşünüyorsanız bu durumu raporlayabilirsiniz.

ABD'de, Federal Ticaret Komisyonu (FTC) aldatıcı veya haksız iş uygulamaları hakkındaki şikayetleri işleme koymaktadır. Şikayette bulunmak için https://www.ftc.gov/ adresini ziyaret edin ve "File a Complaint Online"ı (Çevrimiçi Şikayette Bulun) tıklayın, 1-877-FTC-HELP hattını arayın veya şu adrese yazın:

> Federal Ticaret Komisyonu
> CRC-240
> Washington, DC 20580

Şikayetiniz ABD dışında bulunan bir şirket hakkındaysa şikayetinizi https://www.econsumer.gov/ adresine göndermeniz gerekir.

## Faydalı yönergeler

- Size durup dururken e-posta gönderen SEO firmalarına ve web danışmanlıklarına veya acentelerine karşı dikkatli olun.

  Şaşırtıcı, ama bu spam e-postalarını biz de alıyoruz:

  > *"Sayın google.com,
  > Web sitenizi ziyaret ettim ve başlıca arama motorları ile dizinlerin çoğunda bulunmadığınızı fark ettim..."*

  "Gece yağ yakma"yı sağlayan diyet hapları veya görevinden alınmış yöneticilerden gelen "para aktarımına yardımcı olma talepleri" konusunda gösterdiğiniz şüpheciliğin aynısını arama motorlarına ilişkin istenmeyen e-postalar için de gösterin.

- Kimse Google’da birinci sıra garantisi veremez.

  Sıralama garantisi veren, Google ile “özel ilişkisi” olduğunu ileri süren veya Google’a "öncelikli gönderim" hizmetinin tanıtımını yapan SEO’lara karşı dikkatli olun. Google için öncelikli gönderim diye bir şey yoktur. Aslında bir siteyi doğrudan [Google'a göndermenin](https://developers.google.com/search/docs/crawling-indexing/ask-google-to-recrawl?hl=tr) tek yolu [URL Denetleme Aracı](https://developers.google.com/search/docs/crawling-indexing/ask-google-to-recrawl?hl=tr#use-the-url-inspection-tool-just-a-few-urls)'nı kullanmak, [Site haritası](https://developers.google.com/search/docs/crawling-indexing/sitemaps/overview?hl=tr) göndermek veya daha özel içerikler için [Google Dizine Ekleme API'si](https://developers.google.com/search/apis/indexing-api/v3/quickstart?hl=tr) kullanmaktır. Bunların hepsini kendiniz yapabilirsiniz.

- Gizemli ve amaçlarını açıkça ifade etmeyen şirketlere karşı dikkatli olun.

  Belirsiz olduğunu hissettiğiniz konularda kendilerinden açıklama isteyin. SEO sizin adınıza köprü sayfalar veya “ıskarta” alan adları gibi aldatıcı ya da yanıltıcı içerik oluşturursa siteniz Google dizininden tamamen kaldırılabilir. Nihayetinde, iş verdiğiniz şirketlerin faaliyetlerinden siz sorumlu olursunuz. Bu nedenle söz konusu şirketlerin size hangi amaçla "yardımcı olduklarını" tam olarak bilmeniz gerekir. SEO'nun sunucunuza FTP erişimi varsa sitenizde yapmakta olduğu tüm değişiklikleri açıklayabilmelidir.

- Asla bir SEO'ya bağlantınız olmamalı.

  Bağlantı popülerliği planlarından veya sitenizi binlerce arama motoruna göndermekten bahseden SEO'lardan kaçının. Bunlar tipik olarak başlıca arama motorlarının sonuçlarındaki sıralamanızı, en azından sizin pozitif olarak düşündüğünüz şekilde etkilemeyen yararsız uygulamalardır.

- Bilerek seçim yapın.

  Bir SEO ile çalışıp çalışmayacağınızı düşünürken, sektörle ilgili bazı araştırmalar yapmak isteyebilirsiniz. Bunu yapabilmenin bir yolu da elbette Google’dır. Google, özel şirketlerle ilgili yorumda bulunmamakla birlikte kabul edilmiş iş davranışının açık bir şekilde kapsamı dışında kalan uygulamaları takip eden ve kendilerini SEO olarak adlandıran firmalarla karşılaşmıştır. Dikkatli olun.

- Paranın nereye gittiğini bilin.

  Google, arama sonuçlarında asla para karşılığı daha iyi bir sıralama sözü vermese de diğer pek çok arama motoru, tıklama başına ödeme veya sıralamaya dahil edilen sayfa başına ödeme üzerinden sağlanan sonuçları normal web arama sonuçlarıyla birleştirir. Bazı SEO’lar size arama motorlarında üst sıralara yerleştirme sözü verir, ancak sizi arama sonuçları yerine reklam bölümüne yerleştirir. Hatta bazı SEO'lar diğer arama motorlarını “kontrol” ettikleri izlenimi oluşturmak ve kendilerini tercih edilen konumunda göstermek için teklif fiyatlarını anlık olarak değiştirir. Reklamlarımızın açık bir şekilde belirtilmesi ve arama sonuçlarımızdan ayrı tutulması sayesinde bu hile Google’da işe yaramaz. Yine de çalışmayı düşündüğünüz SEO’ya hangi ödemelerin sıralamaya kalıcı olarak eklenmek için, hangilerinin de geçici reklamlara ayrıldığını sormayı ihmal etmeyin.

- Başka nelere dikkat etmek gerekir?

  Kötü niyetli bir SEO karşısında dikkat etmeniz gereken birkaç uyarı işareti vardır. Tüm işaretleri bu listede sıralamak mümkün olmadığından herhangi bir şüpheniz varsa içgüdülerinize güvenin:

  - Gölge alan adlarına sahipse
  - Köprü sayfalar üzerine diğer müşterilerine ait bağlantıları koyuyorsa
  - Adres çubuğundaki anahtar kelimeleri satmayı teklif ediyorsa
  - Gerçek arama sonuçları ile arama sonucu sayfalarında görünen reklamları ayırt etmiyorsa
  - Sıralamayı, sadece herhangi bir şekilde zaten bulabileceğiniz anlaşılması güç, uzun anahtar kelime grupları üzerinde garanti ediyorsa
  - Birden çok takma ad veya sahte WHOIS bilgilerini kullanıyorsa
  - Trafiği "sahte" arama motorlarından, casus yazılım veya kötü amaçlı yazılımlardan alıyorsa
  - Google dizininden kaldırılmış veya Google’da listelenmeyen alan adlarına sahipse







#  Web sitenizin SEO'sunu yönetme



Siteniz Google'da yer alıyorsa ve [SEO'nun temelleri](https://developers.google.com/search/docs/fundamentals/seo-starter-guide?hl=tr) hakkında bilgi sahibiyseniz sitenizin Google'da görünümünü iyileştirmek için yapabileceğiniz daha fazla şey vardır. Web sitenizi yönetirken Google Arama'yı etkileyen daha benzersiz senaryolarla karşılaşabilirsiniz. Bu kılavuzda, siteyi taşımak için hazırlama veya çok dilli bir siteyi yönetme gibi daha kapsamlı SEO görevleri ele alınmaktadır.

## Google’ın sitenizi tarama ve dizine ekleme şeklini kontrol etme

[Google Arama'nın işleyişiyle](https://developers.google.com/search/docs/fundamentals/how-search-works?hl=tr) ilgili ileri düzey kılavuzu okuyun. Tarama/dizine ekleme/sunum sürecini iyice anlamazsanız sitenizde hata ayıklamakta veya Arama davranışını tahmin etmekte zorluk yaşayabilirsiniz.

### Yinelenen içerik 

[Standart sayfaların](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls?hl=tr#definition) ne olduğunu, sitenizin taranmasını ve dizine eklenmesini nasıl etkilediğini anladığınızdan emin olun.

### Kaynaklar 

Google'ın taraması amaçlanan kaynaklara (resimler, CSS dosyaları vb.) erişebildiğinden emin olun. Yani, bu kaynaklar herhangi bir robots.txt kuralı tarafından engellenmemeli, anonim bir kullanıcı tarafından erişilebilmelidir. Erişilemeyen sayfalar [sayfa dizine ekleme raporunda](https://search.google.com/search-console/index?hl=tr) görünmez. Bu sayfalar [URL Denetleme aracı](https://support.google.com/webmasters/answer/9012289?hl=tr) tarafından taranmadı olarak gösterilir. Engellenen kaynaklar, URL Denetleme aracında yalnızca bağımsız URL düzeyinde gösterilir. Bir sayfadaki önemli kaynaklar engellendiyse bu, Google'ın sayfanızı düzgün bir şekilde taramasını engelleyebilir. Google'ın sayfayı beklediğiniz şekilde görüp görmediğini doğrulamak üzere yayındaki sayfayı oluşturmak için URL Denetleme aracını kullanın.

### Robots.txt 

Taramayı önlemek için robots.txt kurallarını ve taramayı teşvik etmek için de site haritalarını kullanın. Sitenizdeki yinelenen içeriğin veya isteklerle sunucunuzda aşırı yüklenmeye sebep olabilecek önemsiz kaynakların (simgeler veya logolar benzeri küçük, sık kullanılan grafikler gibi) taranmasını engelleyin. Dizine eklemeyi engellemek için robots.txt kuralı kullanmayın; bu işlem için `noindex` etiketini veya giriş yapma zorunluluğunu kullanın. [İçeriğinize erişimi engelleme hakkında daha fazla bilgi edinin.](https://developers.google.com/search/docs/crawling-indexing/control-what-you-share?hl=tr)

### Site Haritaları

Site haritaları, hangi sayfaların siteniz açısından önemli olduğunu Google'a bildirmenin çok önemli bir yoludur ve ayrıca ek bilgiler (güncelleme sıklığı gibi) sağlar. Metin harici içeriğin (resim veya video gibi) taranması için de çok önemlidir. Google, taramayı site haritalarınızda listelenen sayfalarla sınırlamamakla birlikte, bu sayfaların taranmasına öncelik verir. Bu yaklaşım özellikle, hızlı bir şekilde değişen içeriğe sahip veya bağlantılar yoluyla keşfedilemeyen sayfalar için önemlidir. Site haritalarını kullanmak, Google’ın sitenizde hangi sayfaları tarayacağını keşfetmesine ve önceliği belirlemesine yardımcı olur. [Site haritalarıyla ilgili tüm bilgileri burada bulabilirsiniz.](https://developers.google.com/search/docs/crawling-indexing/sitemaps/overview?hl=tr)

### Uluslararası veya çok dilli siteler

Siteniz birden fazla dil içeriyorsa veya belirli yerlerdeki kullanıcıları hedefliyorsa:

- Farklı diller veya bölgeler için yerelleştirilmiş içeriğe sahip sitelerin nasıl yönetileceğiyle ilgili ileri seviye tavsiyeler için [çok bölgeli ve çok dilli siteler hakkında bilgi edinin](https://developers.google.com/search/docs/specialty/international/managing-multi-regional-sites?hl=tr).
- Google'a sitenizdeki sayfaların farklı dil varyasyonları hakkında bilgi vermek için [hreflang etiketini kullanın](https://developers.google.com/search/docs/specialty/international/localized-versions?hl=tr).
- Siteniz sayfalarının içeriğini isteğin yerel ayarına göre uyarlıyorsa, bunun [Google'ın sitenizi taramasını nasıl etkileyebileceğini](https://developers.google.com/search/docs/specialty/international/locale-adaptive-pages?hl=tr) okuyun.

### Bir sayfayı veya siteyi taşıma

Tek bir URL'yi, hatta tüm siteyi taşımanızın gerekebileceği durumlarda aşağıdaki yönergeleri izleyin:

#### Tek bir URL'yi taşıma

Bir sayfayı kalıcı olarak başka bir konuma taşırsanız [sayfanız için `301` yönlendirmelerini uygulamayı](https://developers.google.com/search/docs/crawling-indexing/301-redirects?hl=tr) unutmayın. Herhangi bir nedenle bir sayfayı geçici olarak taşırsanız Google'a sayfayı taramaya devam etmesini söylemek için `302` döndürün.

Bir kullanıcı, kaldırılmış sayfa istediğinde daha iyi deneyim sağlamak için özel `404` sayfası oluşturabilirsiniz. Ancak bir kullanıcı artık olmayan bir sayfayı istediğinde, [`soft 404`](https://developers.google.com/search/docs/crawling-indexing/troubleshoot-crawling-errors?hl=tr#soft-404-errors) değil gerçek bir `404` hatası döndürdüğünüzden emin olun.

#### Site taşıma

Bir sitenin tamamını taşıyorsanız gereken tüm `301` ve site haritası değişikliklerini uygulayın, ardından yeni siteyi taramaya ve sinyallerinizi yeni siteye yönlendirmeye başlayabilmemiz için taşıma işlemini Google'a bildirin. [Sitenizi nasıl taşıyacağınızı öğrenin.](https://developers.google.com/search/docs/crawling-indexing/site-move-with-url-changes?hl=tr)

### Tarama ve dizine ekleme ile ilgili en iyi uygulamaları izleyin

- **[Bağlantılarınızı taranabilir yapın](https://developers.google.com/search/docs/crawling-indexing/links-crawlable?hl=tr#crawlable-links).**
- Ücretli bağlantılar, oturum açılmasını gerektiren bağlantılar veya güvenilmeyen içerikler (kullanıcıların gönderdiği içerikler gibi) için **[`rel=nofollow` kodunu kullanın](https://developers.google.com/search/docs/crawling-indexing/qualify-outbound-links?hl=tr)**. Böylece kalite sinyallerinizin bu tür bağlantılara geçmesini veya bu içeriklerin kötü kalitesinin sizi yansıtmasını önlemiş olursunuz.
- **[Tarama bütçenizi yönetme](https://developers.google.com/search/docs/crawling-indexing/large-site-managing-crawl-budget?hl=tr)**: Siteniz özellikle çok büyükse (düzenli aralıklarla değişen yüz milyonlarca sayfa veya sık sık değişen on milyonlarca sayfa) Google sitenizin tamamını istediğiniz sıklıkta tarayamayabilir. Bu nedenle Google'ı sitenizdeki en önemli sayfalara yönlendirmeniz gerekebilir. Şu anda bunu yapmanın en iyi yöntemi, en son güncellenen veya en önemli sayfalarınızı site haritalarınızda listelemek ve robots.txt kurallarını kullanarak daha az önemli sayfalarınızı gizlemektir.
- **JavaScript kullanımı**: [Google'ın web sitelerinde JavaScript kullanımıyla ilgili önerilerini](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics?hl=tr) uygulayın.
- **Çok sayfalı makaleler**: Birkaç sayfaya ayrılmış bir makaleniz varsa kullanıcıların tıklaması için belirgin sonraki ve önceki bağlantıların bulunduğundan ve bunların taranabilir bağlantılar olduğundan emin olun. Sayfa grubunun Google tarafından taranması için tek ihtiyacınız olan şey budur.
- **Sonsuz kaydırma sayfaları**: Google, sonsuz kaydırma sayfalarını kaydırırken sorun yaşayabilir; sayfanın taranmasını istiyorsanız sayfalara ayrılmış bir sürüm sağlayın. [Arama dostu sonsuz kaydırma sayfaları hakkında daha fazla bilgi edinin.](https://developers.google.com/search/docs/crawling-indexing/javascript/lazy-loading?hl=tr#paginated-infinite-scroll)
- Yorum yayınlama, hesap oluşturma, alışveriş sepetine öğe ekleme gibi **durumu değiştiren URL'lere erişimi engelleyin**. Bu URL'leri engellemek için [robots.txt](https://developers.google.com/search/docs/crawling-indexing/robots/intro?hl=tr) dosyasını kullanın.
- [Google tarafından dizine eklenebilen dosya türlerinin listesini](https://developers.google.com/search/docs/crawling-indexing/indexable-file-types?hl=tr) inceleyin.
- Gerçekleşmesi küçük bir ihtimal olsa da **Google, sitenizi çok fazla tarıyor gibi görünüyorsa** siteniz için [tarama oranını azaltabilirsiniz](https://developers.google.com/search/docs/crawling-indexing/reduce-crawl-rate?hl=tr). Ancak bu nadir görülen bir durumdur.
- Siteniz hâlâ HTTP protokolünü kullanıyorsa [kullanıcılarınızın yanı sıra kendi güvenliğiniz](https://web.dev/articles/enable-https?hl=tr) için [HTTPS'ye taşımanızı](https://developers.google.com/search/blog/2018/12/why-how-to-secure-your-website-https?hl=tr) öneririz.

## Google'ın sitenizi anlamasına yardımcı olma

Sitede önemli bilgileri grafik değil metinle belirtin. Google'ın [birçok dosya türünü](https://developers.google.com/search/docs/crawling-indexing/indexable-file-types?hl=tr) ayrıştırıp dizine ekleyebilmesine rağmen metin hâlâ sayfanın içeriğini anlamamıza yardımcı olan en güvenli seçenektir. Metin olmayan içerik kullanıyorsanız veya sitenin içeriğiyle ilgili ek bilgi sağlamak istiyorsanız, içeriğinizi anlamamıza yardımcı olmak için sayfalarınıza [yapılandırılmış veriler](https://developers.google.com/search/docs/appearance/structured-data/intro-structured-data?hl=tr) ekleyin (ve bazı durumlarda [zengin sonuçlar](https://developers.google.com/search/docs/appearance/structured-data/search-gallery?hl=tr) gibi özel arama özellikleri sağlayın).

HTML ve temel kodlama konusunda kendinizi rahat hissediyorsanız [geliştirici kurallarını](https://developers.google.com/search/docs/appearance/structured-data/intro-structured-data?hl=tr) uygulayarak yapılandırılmış verileri manuel olarak ekleyebilirsiniz. Biraz yardım almak isterseniz WYSIWYG [Yapılandırılmış Veri İşaretleme yardımcısını](https://support.google.com/webmasters/answer/3069489?hl=tr) kullanarak temel yapılandırılmış veriler oluşturabilirsiniz.

Sayfalarınıza yapılandırılmış veriler ekleme imkanınız yoksa bir sayfanın bölümlerini vurgulamanıza ve Google'a her bir bölümün neyi temsil ettiğini (etkinlik, tarih, fiyat vb.) söylemenize olanak tanıyan [Veri İşaretleyici aracını](https://support.google.com/webmasters/answer/2753960?hl=tr) kullanabilirsiniz. Bu basit bir işlemdir ancak sayfanızın düzenini değiştirirseniz bozulabilir.

[Google'ın site içeriğinizi anlamasına yardımcı olma hakkında daha fazla bilgi edinin.](https://developers.google.com/search/docs/fundamentals/seo-starter-guide?hl=tr#understand_your_content)

## Yönergelerimizi uygulama

**Dikkat**: [Arama'nın Temel Özellikleri](https://developers.google.com/search/docs/essentials?hl=tr)'ne uyduğunuzdan emin olun. Bunlardan bazıları öneri ve en iyi uygulamalardır, diğerleri ise uygulanmadığı takdirde sitenin Google dizininden kaldırılmasına yol açabilir.

### İçeriğe özel yönergeler

Sitenizde belirli içerik türleri varsa bunların Google'da yer almasını en iyi şekilde sağlayacak önerilerden bazıları aşağıda verilmiştir:

- **Video**: Google'ın sitenizde barındırılan videoları bulmasını, taramasını ve sonuçları göstermesini sağlamak için [video en iyi uygulamalarımıza](https://developers.google.com/search/docs/appearance/video?hl=tr) uyduğunuzdan emin olun.

- **Resimler**: Resimlerinizin Arama'da görünmesini sağlamak için [resimlerle ilgili en iyi uygulamalarımızı](https://developers.google.com/search/docs/appearance/google-images?hl=tr) izleyin. Resimlerin barındırıldığı sayfada [resim meta verisini sağlayarak](https://developers.google.com/search/docs/appearance/structured-data/image-license-metadata?hl=tr) Google Görseller'de resminizle ilgili ek bilgiler sunabilirsiniz. Bir resmin dizine eklenmesini engellemek için [robots.txt `Disallow` kuralını kullanın](https://developers.google.com/search/docs/crawling-indexing/prevent-images-on-your-page?hl=tr).

- **Çocuklar için:** İçeriğiniz özellikle çocuklar içinse, Çocukların Çevrimiçi Gizliliğini Koruma Yasası'na ([COPPA](https://developers.google.com/search/docs/advanced/guidelines/tag-child-directed-treatment?hl=tr)) uymak amacıyla [sayfalarınızı veya sitenizi çocuklara yönelik olarak etiketleyin](https://business.ftc.gov/privacy-and-security/childrens-privacy).

- **Yetişkin siteleri**: Siteniz (veya belirli sayfalarınız) yetişkinlere yönelik içerik barındırıyorsa bu içeriği [yetişkinlere yönelik içerik](https://developers.google.com/search/docs/crawling-indexing/safesearch?hl=tr) olarak etiketlemeyi düşünebilirsiniz. Bu işlem söz konusu içeriği Güvenli Arama sonuçlarında filtreler.

- Haberler

  : Bir haber sitesi yayınlıyorsanız göz önünde bulundurulması gereken bazı önemli noktalar aşağıda verilmiştir:

  - Haber içeriğiniz varsa [Google Yayıncı Merkezi yardım dokümanlarını](https://support.google.com/news/publisher-center/?hl=tr) okuduğunuzdan emin olun.
  - Ayrıca, Google'ın içeriği daha hızlı bir şekilde keşfetmesine yardımcı olmak için [Haberler site haritası](https://developers.google.com/search/docs/crawling-indexing/sitemaps/news-sitemap?hl=tr) oluşturun.
  - Sitenizde [kötüye kullanımı engellediğinizden](https://developers.google.com/search/docs/monitor-debug/prevent-abuse?hl=tr) emin olun.
  - Aboneliği olmayan veya giriş yapmayan ziyaretçilere sınırlı sayıda görüntüleme sağlamak istiyorsanız içeriğinize sınırlı erişim sağlama konusunda bazı en iyi uygulamaları öğrenmek için [esnek örnekleme](https://developers.google.com/search/docs/appearance/flexible-sampling?hl=tr) ile ilgili bilgileri okuyun.
  - Taramanın devamını sağlarken, Google'a sitenizdeki [abonelik gerektiren ve ödeme duvarlı içeriği nasıl belirteceğinizi](https://developers.google.com/search/docs/appearance/structured-data/paywalled-content?hl=tr) öğrenin.
  - [Arama sonucu snippet'lerini oluştururken metin veya resim kullanımını sınırlamak](https://developers.google.com/search/docs/crawling-indexing/special-tags?hl=tr) için `meta` etiketlerinin nasıl kullanılacağını öğrenin.
  - Hızlı yüklenen içerik için [AMP](https://amp.dev/) veya [Web Hikayeleri](https://amp.dev/about/stories/) kullanmayı düşünün.

- **Diğer siteler** (örneğin işletmeler, kitaplar, uygulamalar, akademik çalışmalarla ilgili siteler): Bilgilerinizi yayınlayabileceğiniz [diğer Google hizmetlerine](https://developers.google.com/search/docs/fundamentals/get-on-google?hl=tr) bakın.

- [Google'ın içerik türünüze özel bir Arama özelliğini destekleyip desteklemediğine](https://developers.google.com/search/docs/appearance/structured-data/search-gallery?hl=tr) bakın. Google yemek tarifleri, etkinlikler, iş ilanı siteleri ve daha fazlası için özelleştirilmiş Arama özelliklerini destekler.

## Kullanıcı deneyimini yönetme

İyi kullanıcı deneyimi sağlamak, sitenizin en önemli hedefi olmalıdır. İyi kullanıcı deneyimi bir sıralama faktörüdür. İyi bir kullanıcı deneyimi sunmanın birçok unsuru vardır. Bunlardan bazılarını aşağıda bulabilirsiniz.

Kullanıcı ve site güvenliğini iyileştirmek için HTTP yerine [Google web sitelerinin HTTPS kullanmasını önerir](https://developers.google.com/search/blog/2018/12/why-how-to-secure-your-website-https?hl=tr). HTTP protokolünü kullanan siteler Chrome tarayıcısında "güvenli değil" olarak işaretlenebilir. [Sitenizi HTTPS ile nasıl güvenli hale getireceğiniz öğrenin.](https://web.dev/articles/enable-https?hl=tr).

Kullanıcı memnuniyeti açısından hızlı sayfa genellikle yavaş sayfadan daha iyidir. Site genelindeki performans rakamlarınızı görmek için [Önemli Web Verileri raporunu](https://search.google.com/search-console/core-web-vitals?hl=tr) veya tek tek sayfaların performansını test etmek için [PageSpeed Insights](https://pagespeed.web.dev/?hl=tr)'ı kullanabilirsiniz. Hızlı sayfalar oluşturma hakkında [web.dev sitesinde](https://web.dev/explore/fast?hl=tr) daha fazla bilgi edinebilirsiniz. Ayrıca, hızlı sayfalar için [AMP](https://amp.dev/about/stories/) kullanmayı da düşünün.

### Mobil kullanım ile ilgili dikkat edilmesi gereken noktalar

[Dünyadaki internet nüfusunun %60'ından fazlası internete bağlanmak için mobil cihaz kullandığından](https://www.statista.com/topics/779/mobile-internet/#topicOverview) sitenizin mobil uyumlu olması önemlidir. Google artık mobil tarayıcıyı web siteleri için varsayılan tarayıcı olarak kullanıyor. [Sitenizi nasıl mobil uyumlu hale getireceğinizi öğrenin](https://developers.google.com/search/docs/crawling-indexing/mobile/mobile-sites-mobile-first-indexing?hl=tr).

## Arama görünümünüzü kontrol etme

[Google Arama'da birçok türden arama sonucu özelliği ve deneyimi](https://developers.google.com/search/docs/appearance/search-result-features?hl=tr) sunulur. Yorum yıldızları ve etkinlik veya yemek tarifi gibi bilgi çeşitleri için gösterilen özel sonuç türleri de bu farklı özellik ve deneyimler arasında yer alır. Siteniz için hangilerinin uygun olduğuna bakın ve bunları uygulamayı düşünün. Siteniz için arama sonuçlarında gösterilmek üzere [site simgesi sağlayabilirsiniz](https://developers.google.com/search/docs/appearance/favicon-in-search?hl=tr). Ayrıca arama sonuçlarında görünecek [bir makale tarihi de sağlayabilirsiniz](https://developers.google.com/search/docs/appearance/publication-dates?hl=tr).

Google'ın iyi [başlık bağlantıları](https://developers.google.com/search/docs/appearance/title-link?hl=tr) ve [snippet'ler](https://developers.google.com/search/docs/appearance/snippet?hl=tr) sağlamasına nasıl yardımcı olabileceğinizle ilgili makaleleri okuduğunuzdan emin olun. Ayrıca, snippet uzunluğunu sınırlayabilir veya isterseniz snippet'i tümüyle atlayabilirsiniz. [Arama sonucu snippet'lerini oluştururken metin veya resim kullanımını sınırlamak](https://developers.google.com/search/docs/appearance/snippet?hl=tr#nosnippet) için `meta` etiketlerinin nasıl kullanılacağını öğrenin.

## Search Console'u kullanma

Search Console, sitenizin Google Arama'daki performansını izlemenize ve optimize etmenize yardımcı olacak çok çeşitli raporlar sunar. [Kullanılacak raporlar](https://developers.google.com/search/docs/advanced/guidelines/search-console?hl=tr) hakkında daha fazla bilgi edinin.





# Arama'yı kullanmaya başlama: Geliştirici kılavuzu



İçeriğinizi arama için uygun hale getirmek, içeriğinizi daha alakalı kullanıcıların görüntülemesini sağlayacağından önemlidir. Buna arama motoru optimizasyonu (SEO) denir ve bu şekilde sitenizle ilgilenen daha fazla sayıda kullanıcı sitenize gelebilir. Google Arama'nın sayfanızı anlama konusunda sorun yaşaması, muhtemelen önemli bir trafik kaynağınızın eksik olduğu anlamına gelir.

Bu kılavuzda, sitelerinin Google Arama ile iyi bir şekilde çalıştığından emin olmak için geliştiricilerin yapabileceklerine yer verilmektedir. Bu kılavuzdaki öğelere ek olarak, sitenizin [güvenli](https://web.dev/explore/secure?hl=tr), [hızlı](https://web.dev/explore/fast?hl=tr), [herkes tarafından erişilebilir](https://web.dev/explore/accessible?hl=tr) olduğundan ve [tüm cihazlarda çalıştığından](https://developers.google.com/search/docs/crawling-indexing/mobile/mobile-sites-mobile-first-indexing?hl=tr) emin olun.

Fazla teknik olmayan konularda yardım için [SEO başlangıç kılavuzunu](https://developers.google.com/search/docs/fundamentals/seo-starter-guide?hl=tr) ziyaret edin. SEO başlangıç kılavuzu, SEO'nun içerik yazma gibi diğer yönlerini de kapsar.

## Google'ın sitenizi nasıl gördüğünü öğrenin

Başlamak için sitenizi [URL Denetleme aracı](https://search.google.com/search-console?hl=tr) veya [Zengin Sonuçlar Testi](https://search.google.com/test/rich-results?hl=tr) ile test ederek Google'ın sitenizi nasıl gördüğünü öğrenin. [Google'ın web tarama botu olan Googlebot](https://developers.google.com/search/docs/crawling-indexing/googlebot?hl=tr), Google dizini için yeni ve güncellenmiş sayfaları keşfeder. Süreç hakkında daha fazla bilgi için [Google Arama Nasıl Çalışır?](https://developers.google.com/search/docs/fundamentals/how-search-works?hl=tr) bölümüne gidin.

Google'ın tarayıcıda gördüğünüz her şeyi daima görmediğini duymak sizi şaşırtabilir. Aşağıdaki örnekte, sayfa Google tarafından desteklenmeyen bir JavaScript özelliğini kullandığından Googlebot bu resim olduğunu bilmez.

[Kullanıcı görünümü](https://developers.google.com/search/docs/fundamentals/get-started-developers?hl=tr#kullanıcı-görünümü)[Google görünümü](https://developers.google.com/search/docs/fundamentals/get-started-developers?hl=tr#google-görünümü)

Bir kullanıcının sayfayı nasıl gördüğü burada gösterilmiştir. Kullanıcılar resimleri ve metni tarayıcıda görebilirler.

![6 farklı kedi resmi gösteren bir web sitesi. Web sitesinin başlığı                       Sevimli Kedi Günlükleri&#39;dir.](https://developers.google.com/static/search/docs/images/get-started01.png?hl=tr)

## Bağlantılarınızı kontrol edin

Googlebot, bağlantıları, site haritalarını ve yönlendirmeleri getirip ayrıştırarak URL’den URL’ye gider. Googlebot, her URL’yi sitenizde gördüğü ilk ve tek URL'ymiş gibi işler. Googlebot’un sitenizdeki tüm URL’leri bulabildiğinden emin olmak için:

- [Google'ın tarayabileceği `` öğeleri](https://developers.google.com/search/docs/crawling-indexing/links-crawlable?hl=tr#crawlable-links) kullanın. Sitedeki tüm sayfalara, bulunabilir başka bir sayfadaki bağlantı aracılığıyla ulaşılabildiğinden emin olun. Yönlendiren bağlantının, metin ya da resimler için hedef sayfayla alakalı bir alt özelliği içerdiğinden emin olun.
- Googlebot’un sitenizi daha akıllı bir şekilde taramasına yardımcı olmak için [bir site haritası oluşturup gönderin](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap?hl=tr). Site haritası; sitenizdeki sayfalar, videolar, diğer dosyalar ve bunlar arasındaki ilişkilerle ilgili bilgi sağladığınız bir dosyadır.
- Yalnızca bir HTML sayfasına sahip JavaScript uygulamaları için her bir ekranın veya bağımsız içerik parçasının bir URL'ye sahip olduğundan emin olun.

## JavaScript'i kullanma şeklinizi kontrol edin

Google, JavaScript’i çalıştırırken, tarayıcıların içeriğinize nasıl eriştiği ve bunları nasıl oluşturduğuyla alakalı olarak sayfa ve uygulama tasarımında dikkate almanız gereken bazı farklılıklar ve sınırlamalar ortaya çıkacaktır. [JavaScript SEO ile ilgili temel kavramlar](https://developers.google.com/search/docs/guides/javascript-seo-basics?hl=tr) veya [Arama ile ilgili JavaScript sorunlarını düzeltme](https://developers.google.com/search/docs/guides/fix-search-javascript?hl=tr) hakkında daha fazla bilgi edinin.

Google’ın tarama, oluşturma ve dizine ekleme işlemleri sırasında JavaScript’i nasıl kullandığı hakkında daha fazla bilgi edinmek için aşağıdaki videoyu izleyin.



## İçerik değiştiğinde Google'daki bilgilerin güncel kalmasını sağlayın

Google’ın yeni veya güncellenmiş sayfalarınızı hızlı bir şekilde bulmasını sağlamak için:

- [Site haritaları gönderin](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap?hl=tr).
- [Google'dan URL'lerinizi yeniden taramasını isteyin](https://developers.google.com/search/docs/crawling-indexing/ask-google-to-recrawl?hl=tr).

Sayfanızın dizine eklenmesiyle ilgili sorun yaşamaya devam ederseniz sunucu günlüklerinizde hata bulunup bulunmadığını kontrol edin.

## Sayfadaki kelimeleri unutmayın

Googlebot yalnızca metin olarak görünen içeriği bulabilir. Örneğin, Googlebot videolardaki metinleri göremez. Google Arama’nın sayfanızın neyle ilgili olduğunu anladığından emin olmak için:

- **Görsel içeriğinizin metin biçiminde ifade edildiğinden emin olun.** Örneğin, gömlek resimlerinden oluşan bir liste içeren ancak her bir resim hakkında metin bağlamı içermeyen bir ürün sayfası yetersizdir. Ürün kategorisi sayfası, her resim için yazılı açıklamalar içermelidir.
- **Her sayfanın bir [açıklayıcı başlığı](https://developers.google.com/search/docs/appearance/title-link?hl=tr#page-titles) ve [meta tanımı](https://developers.google.com/search/docs/appearance/snippet?hl=tr#meta-descriptions)** olduğundan emin olun. Benzersiz başlıklar ve meta tanımlar, Google’ın sayfalarınızın kullanıcılarla ne yönden alakalı olduğunu göstermesine yardımcı olur ve bunun sonucunda arama trafiğiniz artabilir.
- **Semantik HTML'yi kullanın**. Google; HTML, PDF içeriği, resim ve videoları dizine eklerken eklenti (örneğin, Java veya Silverlight) gerektiren içerikleri ya da bir tuvalde oluşturulan içerikleri dizine eklemez. İçeriğiniz için eklenti kullanmak yerine, mümkün olduğunca semantik HTML işaretlemesini kullanın.
- **Metin içeriğinize [DOM](https://developer.mozilla.org/en-US/docs/Web/API/Document_Object_Model/Introduction)'da erişilebildiğinden emin olun.**[ Örneğin, ](https://developer.mozilla.org/en-US/docs/Web/API/Document_Object_Model/Introduction)[CSS `content` özelliği](https://developer.mozilla.org/en-US/docs/Web/CSS/content) aracılığıyla eklenen içerikler DOM'un parçası değildir ve Google Arama şu anda bunu yoksayar. Sitenizin daha güzel görünmesini sağlayan içerikler için `content` özelliğini kullanabilirsiniz. Google Arama bu içeriği dizine eklemeyebilir.

## Google’a içeriğinizin diğer sürümleri hakkında bilgi verin

Google, sitenizin veya içeriğinizin birden fazla sürümü olduğunu otomatik olarak bilmez. Örneğin, sitenizin mobil ve masaüstü sürümü veya uluslararası sürümleri. Google’ın kullanıcılara doğru sürümü sunduğundan emin olmak için şunları yapabilirsiniz:

- [Yinelenen URL'leri birleştirin](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls?hl=tr).
- [Google'a sayfanızın yerelleştirilmiş sürümleri hakkında bilgi verin](https://developers.google.com/search/docs/specialty/international/localized-versions?hl=tr).
- [AMP sayfalarınızı bulunabilir duruma getirin](https://www.ampproject.org/docs/fundamentals/discovery).

## Google’ın hangi içeriği göreceğini kontrol edin

Googlebot’u birkaç şekilde engelleyebilirsiniz:

- Google’ın sayfanızı bulmasını engellemek için içeriğinize erişimi, giriş yapan kullanıcılarla sınırlandırın (örneğin, bir giriş sayfası kullanın veya [sayfanızı şifre korumalı yapın](https://developers.google.com/search/docs/crawling-indexing/control-what-you-share?hl=tr)).
- Googlebot’un sayfanızı taramasını engellemek için [bir robots.txt oluşturun](https://developers.google.com/search/docs/crawling-indexing/robots/create-robots-txt?hl=tr).Robots.txt, web sayfalarını Google'ın dışında tutmak için kullanılabilecek bir mekanizma değildir. Bir web sayfasını Google'ın dışında tutmak için `noindex` robots kurallarını kullanmanız veya sayfanızı [şifreyle korumanız](https://developers.google.com/search/docs/crawling-indexing/control-what-you-share?hl=tr) gerekir.
- Google'ın sayfanızı dizine eklemesini engellemek ancak taramasına izin vermek için [`noindex` etiketi ekleyin](https://developers.google.com/search/docs/crawling-indexing/robots-meta-tag?hl=tr#noindex).Birden fazla tarama ve dizine ekleme kuralının birlikte kullanılması, bazı kuralların diğerlerini etkisiz kılmasına neden olabilir. Bu kuralları nasıl düzgün bir şekilde yapılandıracağınızı öğrenmek için [Taramayı dizine ekleme/sunma kurallarıyla birleştirme](https://developers.google.com/search/docs/crawling-indexing/robots-meta-tag?hl=tr#combining) bölümünü okuyabilirsiniz.

İçeriğiniz Google Arama’da görünmüyorsa ve gösterilmesini istiyorsanız şu adımları uygulayın:

- [URL Denetleme aracıyla](https://support.google.com/webmasters/answer/9012289?hl=tr), Googlebot’un sayfaya erişip erişemediğini kontrol edin.
- Googlebot'un sitenizi taramasını yanlışlıkla engelleyip engellemediğinizi görmek için [robot.txt dosyanızı test edin](https://support.google.com/webmasters/answer/6062598?hl=tr).
- HTML’nizin `meta` etiketlerinde `noindex` kurallarının olup olmadığını kontrol edin.

## Siteniz için zengin sonuçları etkinleştirin

Zengin sonuç, sitenizin Arama sonuçlarında daha fazla öne çıkmasına yardımcı olabilecek stil, resim veya diğer etkileşimli özellikleri içerebilir. [Bir sayfada yapılandırılmış veriler kullanıp](https://developers.google.com/search/docs/appearance/structured-data/intro-structured-data?hl=tr) sayfanın anlamı hakkında açık ipuçları sağlayarak Google’ın sayfanızı daha iyi anlamasına ve Arama’da sayfa için zengin sonuçlar göstermesine yardımcı olabilirsiniz. Nereden başlamanız gerektiğinden emin değilseniz [kullanılabilir özellikler galerimizi keşfedin](https://developers.google.com/search/docs/guides/search-gallery?hl=tr).

# Web sitenizin Google'da yer almasını sağlama

Google, dizinimize eklenecek siteleri otomatik olarak aradığı için genellikle sitenizi web'de yayınlamak dışında bir şey yapmanıza gerek kalmaz. Ancak bazen siteler gözden kaçırılabilir. Sitenizin Google'da yer alıp almadığını kontrol edin ve içeriğinizi Google Arama'da nasıl daha görünür hale getireceğinizi öğrenin.

## Google Arama sonuçlarında görünmek için temel kontrol listesi 

Burada, başlarken web sitenizle ilgili kendinize soracağınız bazı temel sorular belirtilmiştir. Nasıl başlayacağınızla ilgili ek bilgileri[SEO Başlangıç Kılavuzu](https://developers.google.com/search/docs/fundamentals/seo-starter-guide?hl=tr)'nda bulabilirsiniz.

### Web siteniz Google'da görünüyor mu? 

Sayfalarınızın [dizine eklenmiş](https://developers.google.com/search/docs/fundamentals/how-search-works?hl=tr#indexing) olup olmadığını görmek için Google Arama'da aşağıdakine benzer bir sorguyla sitenizi arayın. "example.com" kısmını kendi sitenizle değiştirin.

```
site:example.com
```

`site:` operatörü, sorguda belirtilen önek kapsamında dizine eklenen tüm URL'leri döndürmez. [`site:` operatörü hakkında daha fazla bilgi edinin](https://developers.google.com/search/docs/monitor-debug/search-operators/all-search-site?hl=tr).

Google milyarlarca sayfayı tarasa da bazı sitelerin gözden kaçmasının önüne geçilemez. Tarayıcılarımız bir siteyi atladığında, bunun nedeni çoğunlukla aşağıdakilerden biridir:

- **Siteniz web'deki diğer pek çok siteye bağlı değil.** Başka sitelerin sitenize bağlantı verip vermediğine bakın (ancak lütfen size bağlantı vermeleri için ödeme yapmayın; bu, [Google’ın Spam Politikalarının ihlali](https://developers.google.com/search/docs/essentials/spam-policies?hl=tr#link-spam) olarak değerlendirilebilir).

- **Yeni bir siteyi kullanıma sundunuz ve Google'ın henüz bu siteyi [taramak](https://developers.google.com/search/docs/fundamentals/how-search-works?hl=tr#crawling) için zamanı olmadı.** Google’ın yeni bir siteyi veya mevcut sitenizdeki değişiklikleri fark etmesi birkaç hafta sürebilir.

- **Sitenin tasarımı, içeriğinin Google tarafından etkili bir şekilde taranmasını zorlaştırıyor.** Siteniz HTML dışında bazı özel teknolojilere dayanıyorsa Google’ın sitenizi doğru bir şekilde taraması konusunda sorunlar olabilir. Sitenizde resim veya videoların yanı sıra metin kullanmayı da unutmayın.

- **Google, sitenizi taramaya çalışırken bir hatayla karşılaştı.** Bunun en yaygın nedenleri, siteniz için bir giriş sayfanızın olması veya sitenizin bir nedenle Google’a izin vermemesidir. Sitenize [gizli bir pencerede](https://support.google.com/chrome/answer/95464?hl=tr) erişebildiğinizden emin olun.

- Google sitenizi gözden kaçırdı:

   

  Google milyarlarca sayfayı tararken bazı sitelerin, özellikle de küçük olanların gözden kaçırılması kaçınılmazdır. Bir süre bekleyin ve diğer sitelerden bağlantı almaya çalışın.

  Beklemek yerine harekete geçmek istiyorsanız Google'ın sitenizi anlamasını engelleyebilecek bir hata olup olmadığını görmek için [sitenizi Search Console'a ekleyebilirsiniz](https://support.google.com/webmasters/answer/9008080?hl=tr). Ayrıca [en önemli URL'lerinizi bize göndererek](https://developers.google.com/search/docs/crawling-indexing/ask-google-to-recrawl?hl=tr) bunları taramamız ve dizine eklememiz gerektiğini bize bildirebilirsiniz.

Google'da görünmek için site yönergelerini karşıladığınızdan emin olmak üzere [Google Arama Yönergeleri](https://developers.google.com/search/docs/essentials?hl=tr)'ni uygulayın.

### Kullanıcılara yüksek kaliteli içerik sunuyor musunuz? 

Birinci önceliğiniz, kullanıcılara sitenizde mümkün olan en iyi deneyimi sağlamak olmalıdır. Sitenizi benzersiz, değerli veya çekici yapan şeyleri düşünün. İçeriğinizi daha kolay değerlendirmek için [kullanıcı odaklı, faydalı ve güvenilir içerikler oluşturma](https://developers.google.com/search/docs/fundamentals/creating-helpful-content?hl=tr) kılavuzumuzdaki kişisel değerlendirme sorularını kendinize sorun. Web sitenizi Google dostu uygulamalar kullanarak yönettiğinizden emin olmak için [Arama Yönergeleri](https://developers.google.com/search/docs/essentials?hl=tr)'ni okuyun.

### Yerel işletmeniz Google'da görünüyor mu? 

İşletme Profiliniz, Arama ve Haritalar da dahil olmak üzere işletme bilgilerinizin Google genelinde nasıl görüneceğini yönetmenizi sağlar. [İşletme Profilinizle ilgili hak talebinde bulunmayı](https://www.google.com/business/?hl=tr) düşünebilirsiniz.

### İçeriğinize tüm cihazlarda hızlı ve kolay bir şekilde erişiliyor mu? 

Günümüzde aramaların çoğu mobil cihazlardan yapılmaktadır. İçeriğinizin hızlı yüklenmek ve tüm ekran boyutlarında doğru bir şekilde görüntülenmek üzere optimize edildiğinden emin olun. Sayfanızın mobil uyumlu olup olmadığını test etmek için [Lighthouse](https://developer.chrome.com/docs/lighthouse/overview?hl=tr) gibi araçları kullanabilirsiniz.

### Web siteniz güvenli mi? 

Modern kullanıcılar güvenli bir çevrimiçi deneyim bekler. [Web sitesi bağlantınızın güvenliğini HTTPS ile sağlayın](https://web.dev/articles/enable-https?hl=tr).

### Daha fazla yardıma mı ihtiyacınız var? 

Web sitenizi iyileştirmenize ve arama motorlarında görünürlüğünü artırmanıza yardımcı olabilecek profesyonellere SEO (arama motoru optimize edici) adı verilir. [Neden bir SEO ile çalışmanız gerektiği ve bir SEO'yu nasıl işe alacağınızla](https://developers.google.com/search/docs/fundamentals/do-i-need-seo?hl=tr) ilgili daha fazla bilgi edinin.

### İçeriğiniz özel bir konu hakkında mı? 

Konusuna bağlı olarak içeriğinizin Google'da yer almasını sağlayabileceğiniz diğer yollar vardır. Aşağıdaki tabloda, Google'ın bir işletme veya kişiyle ilgili içeriğinizi edinmek için sağladığı farklı yollara ait bağlantılar yer almaktadır.

| İşletme veya kişi                                            |                                                              |
| :----------------------------------------------------------- | ------------------------------------------------------------ |
| [**Google Perakende**](https://www.google.com/ads/shopping/index.html?hl=tr) | Ürünlerinizi Google Alışveriş, Google Offers ve diğer mülklerde tanıtmak için ürün kataloglarınızı dijital olarak Google Arama'ya gönderebilirsiniz. |
| [**Küçük İşletmeler İçin Google**](https://smallbusiness.withgoogle.com/) | Google'ın küçük işletmelerin başarılı olmasına yardımcı olmak için sunduğu kaynakları öğrenin. |
| [**Street View**](https://www.google.com/streetview/earn/?hl=tr) | Müşterileri işletmenizde sanal tura davet edin.              |
| [**Bilgi paneli**](https://support.google.com/knowledgepanel/answer/9163198?hl=tr) | Google'da kimliğinizi bir kişi, işletme veya kuruluş olarak yönetmek istiyorsanız [bilgi paneli girişinizde değişiklikler yapılması için öneride bulunabilirsiniz](https://support.google.com/knowledgepanel/answer/7534842?hl=tr). |

Google'da dijital içerikleri alma hakkında daha fazla bilgi edinmek için aşağıdaki kaynakları inceleyebilirsiniz:

| Dijital içerik                                               |                                                              |
| :----------------------------------------------------------- | ------------------------------------------------------------ |
| [**Google Kitaplar ve e-Kitaplar**](https://support.google.com/books/partner/answer/3324395?hl=tr) | Kitaplarınızı çevrimiçi ortamda tanıtın ve e-Kitap mağazamızda satın. |
| [**Google Akademik**](https://scholar.google.com/intl/en/scholar/about.html?hl=tr) | Akademik çalışmaları Google'ın akademik dizinine ekleyin.    |
| [**Google Haberler**](https://support.google.com/news/publisher-center/answer/9607025?hl=tr) | Google Haberler arama sonuçlarında görünün veya abonelik için dijital sürümleri sağlayın. |

Google'da yerel bilgileri almak için aşağıdaki kaynaklar yardımcı olabilir:

| Yerel bilgiler                                               |                                                              |
| :----------------------------------------------------------- | ------------------------------------------------------------ |
| [**Google Haritalar İçerik İş Ortağı**](https://contentpartners.maps.google.com/?hl=tr) | Bölgesel verilerin yetkili veya resmi bir kaynağıysanız bu verileri Google üzerinden yayınlayın. |
| [**Fotoğraf Küresi**](https://www.google.com/maps/about/contribute/photosphere/?hl=tr) | 360° resimlerle dünyanın fotoğrafını çekip paylaşın.         |
| [**Street View**](https://www.google.com/streetview/contributors/?hl=tr) | İşletmenize ait panoramik bir sanal tur sunun.               |
| [**Google Transit İş Ortağı Programı**](https://support.google.com/transitpartners/answer/1111481?hl=tr) | Rotaları, tarifeleri ve ücretleri kolay bulunabilir hale getirerek toplu taşıma araçlarının kullanılmasını teşvik edin. |

| Medya                                                        |                                                              |
| :----------------------------------------------------------- | ------------------------------------------------------------ |
| [**Google Haritalar İçerik İş Ortağı**](https://contentpartners.maps.google.com/?hl=tr) | Bölgesel verilerin yetkili veya resmi bir kaynağıysanız bu verileri Google üzerinden yayınlayın. |
| [**Google Arama'da Video**](https://developers.google.com/search/docs/appearance/video?hl=tr) | Videolarınızı Google Arama ile bulunabilir ve taranabilir hale getirin. |
| [**YouTube**](https://www.youtube.com/t/partnerships_faq?hl=tr) | Videolarınızı yükleyin, dağıtın ve videolarınızdan para kazanın. |



# Tarama ve dizine ekleme konularına genel bakış



Bu bölümdeki konular, Google'ın içeriğinizi Arama ve diğer Google mülklerinde göstermek üzere bulabilmesini ve tarayabilmesini nasıl kontrol edebileceğinizi, ayrıca Google'ın sitenizdeki belirli içeriği taramasını nasıl engelleyeceğinizi açıklamaktadır.

Aşağıda, her sayfanın kısa bir açıklaması verilmiştir. Tarama ve dizine ekleme hakkında genel bilgi edinmek için [Arama nasıl çalışır?](https://developers.google.com/search/docs/fundamentals/how-search-works?hl=tr) rehberimizi okuyun.

| Konular                                                      |                                                              |
| :----------------------------------------------------------- | ------------------------------------------------------------ |
| [Google tarafından dizine eklenebilir dosya türleri](https://developers.google.com/search/docs/crawling-indexing/indexable-file-types?hl=tr) | Google, sayfa ve dosya türlerinin çoğuna ait içeriği dizine ekleyebilir. Google Arama'nın dizine ekleyebileceği en yaygın dosya türlerinin listesini inceleyin. |
| [URL yapısı](https://developers.google.com/search/docs/crawling-indexing/url-structure?hl=tr) | İçeriğinizi düzenlerken URL’leri mantıklı ve kullanıcılar tarafından rahatça anlaşılacak şekilde yapılandırmaya çalışın. |
| [Site Haritaları](https://developers.google.com/search/docs/crawling-indexing/sitemaps/overview?hl=tr) | Sitenizdeki yeni veya güncellenmiş sayfaları Google'a bildirin. |
| Tarayıcı yönetimi                                            | [Google'dan URL'lerinizi yeniden taramasını isteme](https://developers.google.com/search/docs/crawling-indexing/ask-google-to-recrawl?hl=tr)[Filtreli (faceted) gezinme URL'lerinin taranmasını yönetme](https://developers.google.com/search/docs/crawling-indexing/crawling-managing-faceted-navigation?hl=tr)[Büyük site sahiplerine yönelik tarama bütçenizi yönetme rehberi](https://developers.google.com/search/docs/crawling-indexing/large-site-managing-crawl-budget?hl=tr)[HTTP durum kodları ile ağ ve DNS hatalarının Google Arama'ya etkileri](https://developers.google.com/search/docs/crawling-indexing/http-network-errors?hl=tr)[Google tarayıcıları](https://developers.google.com/search/docs/crawling-indexing/overview-google-crawlers?hl=tr) |
| [robots.txt](https://developers.google.com/search/docs/crawling-indexing/robots/intro?hl=tr) | Robots.txt dosyası, arama motoru tarayıcılarına sitenizden isteyebilecekleri ve isteyemeyecekleri sayfaları veya dosyaları söyler. |
| [Canonicalization](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls?hl=tr) | URL standartlaştırmanın ne olduğunu ve aşırı taramadan kaçınmak için sitenizdeki kopya sayfaları Google'a nasıl bildireceğinizi öğrenin. Google'ın yinelenen içeriği otomatik olarak nasıl algılayıp işlediğini ve bulunan kopya sayfa gruplarına nasıl *standart sayfa* atadığını öğrenin. |
| [Mobil cihazlar için siteler](https://developers.google.com/search/docs/crawling-indexing/mobile?hl=tr) | Sitenizi mobil cihazlar için nasıl optimize edebileceğinizi öğrenin ve doğru şekilde taranıp dizine eklendiğinden emin olun. |
| [AMP](https://developers.google.com/search/docs/crawling-indexing/amp?hl=tr) | AMP sayfalarınız varsa AMP'nin Google Arama'da nasıl çalıştığını öğrenin. |
| [JavaScript](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics?hl=tr) | Tarayıcıların içeriğinize nasıl eriştiği ve bunları nasıl oluşturduğuyla alakalı olarak sayfa ve uygulama tasarımında dikkate almanız gereken bazı farklılıklar ve sınırlamalar vardır. |
| [Sayfa ve içerik meta verisi](https://developers.google.com/search/docs/crawling-indexing/special-tags?hl=tr) | [Sayfa meta verilerini belirtmek için geçerli HTML etiketleri kullanma](https://developers.google.com/search/docs/crawling-indexing/valid-page-metadata?hl=tr)[Google'ın anladığı tüm `meta` etiketleri](https://developers.google.com/search/docs/crawling-indexing/special-tags?hl=tr)[Robots `meta` etiketi, `data-nosnippet` ve X-Robots-Tag spesifikasyonları](https://developers.google.com/search/docs/crawling-indexing/robots-meta-tag?hl=tr)[`noindex` `meta` etiketiyle dizine eklemeyi engelleme](https://developers.google.com/search/docs/crawling-indexing/block-indexing?hl=tr)[Bağlantılarınızı taranabilir yapma](https://developers.google.com/search/docs/crawling-indexing/links-crawlable?hl=tr)[Giden bağlantılarınızın niteliğini Google'a `rel` özellikleriyle belirtme](https://developers.google.com/search/docs/crawling-indexing/qualify-outbound-links?hl=tr) |
| Kaldırma                                                     | [Google ile paylaştıklarınızı kontrol etme](https://developers.google.com/search/docs/crawling-indexing/control-what-you-share?hl=tr)[Sitenizde barındırılan bir sayfayı Google'dan kaldırma](https://developers.google.com/search/docs/crawling-indexing/remove-information?hl=tr)[Sitenizde barındırılan resimleri arama sonuçlarından kaldırma](https://developers.google.com/search/docs/crawling-indexing/prevent-images-on-your-page?hl=tr)[Çıkartılan bilgileri Google Arama'nın dışında tutma](https://developers.google.com/search/docs/crawling-indexing/keep-redacted-information-out?hl=tr) |
| Site taşıma ve değiştirme                                    | [Yönlendirmeler ve Google Arama](https://developers.google.com/search/docs/crawling-indexing/301-redirects?hl=tr)[Site taşıma](https://developers.google.com/search/docs/crawling-indexing/site-move-with-url-changes?hl=tr)[Google Arama'da A/B testi etkisini en aza indirme](https://developers.google.com/search/docs/crawling-indexing/website-testing?hl=tr)[Web sitesini geçici olarak duraklatma veya devre dışı bırakma](https://developers.google.com/search/docs/crawling-indexing/pause-online-business?hl=tr) |



# Google tarafından dizine eklenebilir dosya türleri



Google çoğu metin tabanlı dosyayı ve belirli kodlanmış doküman biçimlerini dizine ekleyebilir. Dizine eklediğimiz en yaygın dosya türleri şunlardır:

- Adobe Taşınabilir Belge Biçimi (.pdf)
- Adobe PostScript (.ps)
- Virgülle ayrılmış değerler (.csv)
- Elektronik Yayın (.epub)
- Google Earth (.kml, .kmz)
- GPS eXchange Biçimi (.gpx)
- Hancom Hanword (.hwp)
- HTML (.htm, .html, diğer dosya uzantıları)
- Microsoft Excel (.xls, .xlsx)
- Microsoft PowerPoint (.ppt, .pptx)
- Microsoft Word (.doc, .docx)
- OpenOffice sunumu (.odp)
- OpenOffice e-tablosu (.ods)
- OpenOffice metni (.odt)
- Zengin Metin Biçimi (.rtf)
- Ölçeklenebilir Vektör Grafikleri (.svg)
- TeX/LaTeX (.tex)
- Aşağıdakiler gibi yaygın programlama dillerindeki kaynak kod da dahil olmak üzere metinler (.txt, .text, diğer dosya uzantıları):
  - Basic kaynak kodu (.bas)
  - C/C++ kaynak kodu (.c, .cc, .cpp, .cxx, .h, .hpp)
  - C# kaynak kodu (.cs)
  - Java kaynak kodu (.java)
  - Perl kaynak kodu (.pl)
  - Python kaynak kodu (.py)
- Kablosuz Biçimlendirme Dili (WAP)
- XML (.xml)

Google aşağıdaki medya biçimlerini de dizine ekleyebilir:

- Resim biçimleri: BMP, GIF, JPEG, PNG, WebP, SVG ve AVIF
- Video biçimleri: 3GP, 3G2, ASF, AVI, DivX, M2V, M3U, M3U8, M4V, MKV, MOV, MP4, MPEG, OGV, QVT, RAM, RM, VOB, WebM, WMV ve XAP

## Dosya türüne göre arama

Sonuçların belirli bir dosya türüyle veya uzantısıyla sınırlandırılması için Google Arama'da `filetype:` operatörünü kullanabilirsiniz. Örneğin, `filetype:rtf galway` sorgusu, içinde "galway" ifadesi geçen ve `.rtf` ile biten RTF dosyalarını ve URL'leri arar.





# Google Arama için URL yapısıyla ilgili en iyi uygulamalar



Google Arama'nın sitenizi etkili bir şekilde tarayabilmesi için aşağıdaki koşulları karşılayan taranabilir bir URL yapısı kullanın. URL'leriniz aşağıdaki ölçütleri karşılamıyorsa Google Arama, sitenizi muhtemelen son derece yüksek arama hızları dahil ancak bunlarla sınırlı olmamak üzere verimsiz bir şekilde tarar veya hiç taramayabilir.

| Taranabilir URL yapısıyla ilgili koşullar                    |                                                              |
| :----------------------------------------------------------- | ------------------------------------------------------------ |
| [IETF STD 66](https://datatracker.ietf.org/doc/std66/)'ya uyun | Google Arama, URL'leri [IETF STD 66](https://datatracker.ietf.org/doc/std66/) tarafından tanımlandığı şekilde destekler. Standart tarafından [ayrılmış](https://www.rfc-editor.org/rfc/rfc3986#section-2.2) olarak tanımlanan karakterler [yüzde olarak kodlanmalıdır](https://developer.mozilla.org/docs/Glossary/Percent-encoding). |
| İçeriği değiştirmek için URL parçaları kullanmayın           | Google Arama genellikle URL parçalarını desteklemediğinden sayfa içeriğini değiştirmek için [parçalar](https://wikipedia.org/wiki/URI_fragment) kullanmayın. Aşağıda bir URL parçası örneği verilmiştir:`https://example.com/#/potatoes`İçeriği değiştirmek için JavaScript kullanıyorsanız bunun yerine [History API'yi kullanın](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics?hl=tr#use-history-api). |
| URL parametreleri için ortak bir kodlama kullanın            | URL parametrelerini belirtirken şu yaygın kodlamayı kullanın: anahtar/değer çiftlerini ayırmak için eşittir işareti (`=`), ek parametre eklemek için ve işareti (`&`) kullanın. Bir anahtar/değer çifti içindeki aynı anahtar için birden fazla değer listelemek istiyorsanız [IETF STD 66](https://datatracker.ietf.org/doc/std66/) ile çakışmayan virgül (`,`) gibi bir karakter kullanabilirsiniz.ÖnerilirÖnerilmezÖnerilen: Anahtar/değer çiftlerini ayırmak için eşittir işareti (`=`), ek parametre eklemek için ve işareti (`&`) kullanma:`https://example.com/category?category=dresses&sort=low-to-high&sid=789`Anahtar/değer çiftlerini ayırmak için iki nokta üst üste (`:`), ilave parametre eklemek için köşeli parantez (`[ ]`) kullanma:`https://example.com/category?[category:dresses][sort:price-low-to-high][sid:789]`Aynı anahtarda birden fazla değer listelemek için virgül (`,`), anahtar/değer çiftlerini ayırmak için eşittir işareti (`=`), ek parametre eklemek için ve işareti (`&`) kullanma:`https://example.com/category?category=dresses&color=purple,pink,salmon&sort=low-to-high&sid=789`Anahtar/değer çiftlerini ayırmak için tek virgül (`,`), ilave parametre eklemek için çift virgül (`,,`) kullanma:`https://example.com/category?category,dresses,,sort,lowtohigh,,sid,789` |

## URL yapınızın anlaşılmasını kolaylaştırın

Google Arama'nın (ve kullanıcılarınızın) sitenizi daha iyi anlamasına yardımcı olmak için mümkün olduğunda aşağıdaki en iyi uygulamaları kullanarak basit bir URL yapısı oluşturmanızı öneririz.

İçeriğinizi düzenlerken URL’leri mantıklı ve kullanıcılar tarafından rahatça anlaşılacak şekilde yapılandırmaya çalışın. Sitenizi bir bütün olarak yapılandırma hakkında bilgi edinmek için [SEO Başlangıç Kılavuzu'nun bu bölümüne](https://developers.google.com/search/docs/fundamentals/seo-starter-guide?hl=tr#group-topically) göz atın.

| En iyi uygulamalar                                     |                                                              |
| :----------------------------------------------------- | ------------------------------------------------------------ |
| Açıklayıcı URL'ler kullanın                            | Mümkünse URL'lerinizde uzun kimlik numaraları yerine okunaklı kelimeler kullanın.Önerilir (basit, açıklayıcı kelimeler)Önerilmez (okunamayan, uzun kimlik numaraları)`https://example.com/**wiki/Aviation**``https://example.com/**index.php?topic=42&area=3a5ebc944f41daa6f849f730f1**` |
| Kitlenizin dilini kullanın                             | URL'de kitlenizin dilinde kelimeler kullanın (mümkünse, harf çevirisi yapın). Örneğin, kitleniz Almanca arama yapıyorsa URL'de Almanca kelimeler kullanın:`https://example.com/**lebensmittel/pfefferminz**`Kitleniz Japonca arama yapıyorsa URL'de Japonca kelimeler kullanın:`https://example.com/**ペパーミント**` |
| Gerekirse yüzde kodlaması kullanın                     | [Sitenizdeki sayfalara bağlantı verirken](https://developers.google.com/search/docs/crawling-indexing/links-crawlable?hl=tr) bağlantılarınızın `href` özelliklerinde gerektiğinde yüzde kodlamasını kullanın. Ayrılmamış ASCII karakterler kodlanmamış biçimde bırakılabilir. Ayrıca, ASCII olmayan aralıktaki karakterler için yüzde kodlaması kullanılmalıdır. Örneğin:Önerilir (yüzde kodlaması)Önerilmez (ASCII olmayan karakterler)`https://example.com/**%D9%86%D8%B9%D9%86%D8%A7%D8%B9/%D8%A8%D9%82%D8%A7%D9%84%D8%A9**``https://example.com/**نعناع**``https://example.com/**%E6%9D%82%E8%B4%A7/%E8%96%84%E8%8D%B7**``https://example.com/**杂货/薄荷**``https://example.com/**gem%C3%BCse**``https://example.com/**gemüse**``https://example.com/**%F0%9F%A6%99%E2%9C%A8**``https://example.com/**🦙✨**` |
| Kelimeleri ayırmak için kısa çizgi kullanın            | Mümkünse URL'lerinizdeki kelimeleri ayırmanızı öneririz. Özellikle, URL'lerinizdeki kelimeleri ayırmak için alt çizgi (`_`) yerine kısa çizgi (`-`) kullanmanızı öneririz. Bu şekilde kullanıcılar ve arama motorları URL'deki kavramları daha iyi tanımlayabilir. Geçmişe dayalı nedenlerle, alt çizgi kullanmanızı önermeyiz. Bu stil, birlikte tutulması gereken kavramları belirtmek için halihazırda yaygın olarak kullanılmaktadır. Örneğin, çeşitli programlama dilleri, işlevleri adlandırmak için alt çizgi kullanır (ör. `format_date`).ÖnerilirÖnerilmezKelimeleri ayırmak için kısa çizgi (`-`) kullanma:`https://example.com/summer**-**clothing/filter?color**-**profile=dark**-**grey`Kelimeleri ayırmak için alt çizgi (`_`) kullanma:`https://example.com/summer**_**clothing/filter?color**_**profile=dark**_**grey`URL'de kelimeleri birleştirme:`https://example.com/**greendress**` |
| Mümkün olduğunca az parametre kullanın                 | Mümkün olan her durumda, gereksiz parametreleri (yani içeriği değiştirmeyen parametreleri) çıkararak URL'leri kısaltmaya özen gösterin. |
| URL'lerin büyük/küçük harfe duyarlı olduğunu unutmayın | IETF STD 66'ya uyan diğer tüm HTTP istemcileri gibi, Google Arama'nın URL işleme yöntemi de büyük/küçük harfe duyarlıdır (örneğin, Google hem `/APPLE` hem de `/apple` öğelerini kendi içeriklerine sahip farklı URL'ler olarak değerlendirir). Web sunucunuzda URL'lerdeki büyük ve küçük harf kullanılan metinler aynı şekilde işleniyorsa, Google'ın aynı sayfaya işaret eden URL'leri daha kolay belirleyebilmesi için tüm metinleri tamamen büyük harf veya tamamen küçük harf kullanacak şekilde değiştirin. |
| Çok bölgeli siteler için                               | Siteniz çok bölgeliyse sitenizi coğrafi hedeflemenizi kolaylaştıracak bir URL yapısı kullanın. URL'lerinizi nasıl yapılandırabileceğinizle ilgili daha fazla örnek için [yerel ayara özel URL'ler kullanma](https://developers.google.com/search/docs/specialty/international/managing-multi-regional-sites?hl=tr#locale-specific-urls) konusuna bakın.Önerilir (ülkeye özgü alan adı kullanma):`https://example.de`Önerilir (gTLD içeren ülkeye özgü alt dizin kullanma):`https://example.com/de/` |

## URL'lerle ilgili yaygın sorunları önleme

Fazlasıyla karışık URL’ler, özellikle birden çok parametre içerenler, sitenizdeki özdeş veya benzer içeriğe götüren çok sayıda URL oluşturarak tarayıcılar açısından sorun yaratabilir. Bunun sonucunda, Googlebot gerekenin çok üstünde bant genişliği kullanabilir veya Google Arama, sitenizdeki içeriğin tamamını dizine ekleyemeyebilir.

Gereğinden çok sayıda URL, çeşitli sorunların sonucunda ortaya çıkmaktadır. Bunlardan bazıları şöyle sıralanabilir:

| Yaygın sorunlar                   |                                                              |
| :-------------------------------- | ------------------------------------------------------------ |
| Bir grup öğeye ek filtre uygulama | Bir grup öğeye ek filtre uygulama. Pek çok site, aynı öğe veya arama sonuç kümesi için farklı görünümler sunar ve genellikle kullanıcıya tanımlı ölçütlerle (örneğin, plajı olan otelleri göster) bu kümeye filtre uygulama olanağı tanır. Filtreler, birbirine eklenerek birleştirilebildiğinde (örneğin: sahildeki ve fitness merkezi olan oteller), sitelerdeki URL (veri görünümü) sayısında bir patlama olur. Birbirinden pek farkı olmayan otellerden oluşan kabarık bir liste oluşturmak gereksizdir; Googlebot’un her otelin sayfasına erişebilmek için az sayıda listeyi görebilmesi yeterlidir. Örneğin:"Uygun fiyatlı" oteller":`https://example.com/hotel-search-results.jsp?Ne=292&N=461`Plajı olan "uygun fiyatlı" oteller:`https://example.com/hotel-search-results.jsp?Ne=292&N=461+4294967240`Plajı ve fitness merkezi olan "uygun fiyatlı" oteller:`https://example.com/hotel-search-results.jsp?Ne=292&N=461+4294967240+4294967270` |
| Alakasız parametreler             | URL'deki alakasız parametreler çok sayıda URL'ye neden olabilir. Örneğin:Yönlendirme parametreleri:`https://example.com/search/noheaders?click=6EE2BF1AF6A3D705D5561B7C3564D9C2&clickPage=OPD+Product+Page&cat=79``https://example.com/discuss/showthread.php?referrerid=249406&threadid=535913``https://example.com/products/products.asp?N=200063&Ne=500955&ref=foo%2Cbar&Cn=Accessories`Alışveriş sıralama parametreleri:`https://example.com/results?search_type=search_videos&search_query=tpb&search_sort=relevance&search_category=25`Oturum kimlikleri:`https://example.com/search/noheaders?sessionid=6EE2BF1AF6A3D705D5561B7C3564D9C2`Mümkünse URL'lerde oturum kimlikleri kullanmaktan kaçının. Onun yerine çerez kullanmayı düşünün.Googlebot'un bu sorunlu URL'lere erişimini engellemek için [robots.txt dosyası](https://developers.google.com/search/docs/crawling-indexing/robots/intro?hl=tr) kullanabilirsiniz. |
| Takvim sorunları                  | Dinamik olarak oluşturulmuş bir takvim, başlangıç veya bitiş tarihlerine ilişkin herhangi bir sınırlama olmaksızın, gelecekteki ve geçmişteki tarihlere yönelik bağlantılar oluşturabilir. Örneğin:`https://example.com/calendar.php?d=13&m=8&y=2011`Siteniz sonsuz bir takvim içeriyorsa dinamik olarak oluşturulan gelecekteki takvim sayfalarına götüren bağlantılara `nofollow` özelliği ekleyin. |
| Çalışmayan göreli bağlantılar     | Sunucunuz, var olmayan sayfalar için doğru HTTP durum koduyla yanıt vermezse yanlış bir sayfaya [üst öğeyle göreli bağlantı](https://developer.mozilla.org/en-US/docs/Web/API/URL_API/Resolving_relative_references#parent-directory_relative) yerleştirmek sonsuz boşluklar oluşturabilir. Örneğin, `https://example.com/category/community/070413/html/FAQ.htm` sayfasında `<a href="../../category/stuff">...</a>` gibi üst öğeyle göreli bir bağlantı, `https://example.com/category/community/category/stuff` gibi sahte URL'lere yol açabilir. Bu sorunu düzeltmek için bağlantılarınızda üst öğeyle göreli URL'ler yerine kökle göreli URL'ler kullanın. |

## Taramayla ilgili URL yapısı sorunlarını düzeltme

Google Arama'nın bu sorunlu URL'leri taradığını fark ederseniz aşağıdakileri yapmanızı öneririz:

- Googlebot'un [sorunlu URL'lere](https://developers.google.com/search/docs/crawling-indexing/url-structure?hl=tr#common-issues) erişimini engellemek için bir [robots.txt dosyası](https://developers.google.com/search/docs/crawling-indexing/robots/intro?hl=tr) kullanabilirsiniz. Genel olarak, dinamik URL'leri (arama sonuçlarını oluşturan URL'ler gibi) veya sonsuz boşluk oluşturabilen URL'leri (takvimler, sıralama ve filtreleme işlevleri gibi) engelleyebilirsiniz.
- Sitenizde filtreli (faceted) gezinme varsa [bu filtreli (faceted) gezinme URL'lerinin taranmasını nasıl yöneteceğinizi](https://developers.google.com/search/docs/crawling-indexing/crawling-managing-faceted-navigation?hl=tr#prevent-crawling-of-faceted-navigation-urls) öğrenin.



# Google için bağlantı en iyi uygulamaları



Google, sayfaların alaka düzeyini belirlemek ve taranacak yeni sayfalar bulmak için bir sinyal olarak bağlantıları kullanır. Google'ın sayfanızdaki bağlantılar üzerinden sitenizdeki diğer sayfaları bulabilmesi için bağlantılarınızı nasıl taranabilir yapacağınızı öğrenin. Ayrıca, hem kullanıcıların hem de Google'ın içeriğinizi daha kolay anlamasına yardımcı olmak için bağlantı metninizi nasıl iyileştirebileceğinizi öğrenin.

## Bağlantılarınızı taranabilir yapın

Genel olarak Google, bağlantınızı yalnızca `href` özelliğine sahip bir `<a>` HTML öğesi (*bağlantı öğesi* olarak da bilinir) olduğunda tarayabilir. Google tarayıcıları, diğer biçimlerdeki bağlantıların çoğunu ayrıştırmaz ve çıkarmaz. Google, `href` özelliğine sahip olmayan `<a>` öğelerindeki veya komut dosyası etkinlikleri nedeniyle bağlantı işlevi gören diğer etiketlerdeki URL'leri güvenli bir şekilde ayıklayamaz. Google'ın ayrıştırabileceği ve ayrıştıramayacağı bağlantı örnekleri aşağıda verilmiştir:

**Önerilir (Google ayrıştırabilir)**

```
<a href="https://example.com">
<a href="/products/category/shoes">
<a href="./products/category/shoes">
<a href="/products/category/shoes" onclick="javascript:goTo('shoes')">
<a href="/products/category/shoes" class="pretty">
```

Yukarıda gösterilen HTML işaretlemesine sahip bağlantıları dinamik olarak bir sayfaya eklemek için JavaScript'i kullandığınızda da bağlantılar taranabilir.

**Önerilmez (ancak Google bunu ayrıştırmaya çalışabilir):**

```
<a routerLink="products/category">
<span href="https://example.com">
<a onclick="goto('https://example.com')">
```

<a> öğenizdeki URL'nin, Google tarayıcılarının istek gönderebileceği gerçek bir web adresi olarak çözümlendiğinden (yani bir URI'ye benzediğinden) emin olun. Örneğin:

**Önerilir (Google çözümleyebilir):**

```
<a href="https://example.com/stuff">
<a href="/products">
<a href="/products.php?id=123">
```

**Önerilmez (ancak Google bunu çözümlemeye çalışabilir):**

```
<a href="javascript:goTo('products')">
<a href="javascript:window.location.href='/products'">
```

## Bağlantı metni yerleşimi

*Bağlantı metni*, bir bağlantının görünen metnidir. Bu metin, kullanıcılara ve Google'a bağlantı verdiğiniz sayfayla ilgili bir şeyler bildirir. Bağlantı metnini [Google'ın tarayabileceği `` öğelerinin](https://developers.google.com/search/docs/crawling-indexing/links-crawlable?hl=tr#crawlable-links) arasına yerleştirin.

**İyi:**

> <a href="https://example.com/ghost-peppers">**kırmızı biber**</a>

**Kötü (boş bağlantı metni):**

> <a href="https://example.com"></a>

<a> öğesi herhangi bir nedenle boş olduğunda Google, title özelliğini yedek bağlantı metni olarak kullanabilir.

> <a href="https://example.com/ghost-pepper-recipe" title="**kırmızı biber turşusu nasıl yapılır?**"></a>

Google, bağlantı olarak kullanılan resimler için bağlantı metni olarak `img` öğesinin `alt` özelliğini kullanır. Bu nedenle, [resimlerinize açıklayıcı alternatif metinler eklediğinizden](https://developers.google.com/search/docs/appearance/google-images?hl=tr#descriptive-alt-text) emin olun:

**İyi:**

> <a href="/add-to-cart.html"><img src="enchiladas-in-shopping-cart.jpg" alt="**alışveriş sepetinize enchilada ekleyin**"/></a>

**Kötü (boş alternatif metin ve boş bağlantı metni):**

> <a href="/add-to-cart.html"><img src="enchiladas-in-shopping-cart.jpg" alt=""/></a>

Bağlantı metni eklemek için JavaScript kullanıyorsanız oluşturulan URL'de bulunduğundan emin olmak için [URL Denetleme aracını](https://support.google.com/webmasters/answer/9012289?hl=tr) kullanın.

## İyi bağlantı metni yazma

İyi bağlantı metni açıklayıcı, kısa ve öz, bulunduğu ve bağlantı verdiği sayfayla alakalı olmalıdır. Ayrıca, bağlantının bağlamına dair bilgi vermeli ve okuyucularınızın beklentilerini oluşturmalıdır. Bağlantı metniniz ne kadar iyi olursa kullanıcıların sitenizde gezinmesi ve Google'ın o sayfanın neyle ilgili olduğunu anlaması o kadar kolay olur.

**Kötü (çok genel):**

> Daha fazla bilgi için <a href="https://example.com">**burayı tıklayın**</a>.

> <a href="https://example.com">**Devamını okuyun**</a>.

> Peynirimiz hakkında daha fazla bilgiyi <a href="https://example.com">**web sitemizde**</a> bulabilirsiniz.

> Peynir yapımı hakkında daha ayrıntılı bilgi veren bir <a href="https://example.com">**makalemiz**</a> bulunmaktadır.

**İpucu**: Bağlam olmadan yalnızca bağlantı metnini okumayı deneyin ve metnin kendi başına anlamlı olacak kadar spesifik olup olmadığını kontrol edin. Sayfanın ne hakkında olduğunu anlayamıyorsanız daha açıklayıcı bir bağlantı metnine ihtiyacınız var demektir.

**Daha iyi (daha açıklayıcı)**

> Satın alınabilen peynirlerin tam listesi için <a href="https://example.com">**peynir türleri listesine**</a> bakın.

**Kötü (çok uzun):**

> Önümüzdeki Salı gününden itibaren <a href="https://example.com">**Knitted Cow, Wisconsin yerlilerini büyük açılışa davet ediyor ve inek şeklindeki ücretsiz buzdan heykelleri**</a> ilk 20 müşteriye verecek.

**Daha iyi (daha kısa ve öz):**

> Önümüzdeki Salı gününden itibaren <a href="https://example.com">**Knitted Cow, Wisconsin yerlilerini büyük açılışa davet ediyor**</a> ve inek şeklindeki ücretsiz buzdan heykelleri ilk 20 müşteriye verecek.

Mümkün olduğunca doğal bir şekilde yazın ve bağlantı verdiğiniz sayfayla alakalı her anahtar kelimeyi ekleme dürtüsüne yenik düşmeyin ([anahtar kelime doldurmanın](https://developers.google.com/search/docs/essentials/spam-policies?hl=tr#keyword-stuffing) spam politikalarımızı ihlal ettiğini unutmayın). Okuyucunun sonraki sayfayı anlamak için bu anahtar kelimelere ihtiyacı olup olmadığını kendinize sorun. Anahtar kelimeleri, bağlantı metnine zorla eklemeye çalışıyorsanız muhtemelen çok fazla şey ekliyorsunuzdur.

Bağlantılarınızla ilgili bağlam bilgisi vermeyi unutmayın. Bağlantılardan önceki ve sonraki kelimeler önemli olduğu için cümlenin tamamına dikkat edin. Bağlantıları birbiri ardına yerleştirmeyin. Okuyucuların bağlantıları ayırt etmesi daha zor hale gelir ve her bağlantının çevresindeki metin kaybolur.

**Kötü (birbiri ardında yerleştirilen çok fazla bağlantı var):**

> Peynir hakkında <a href="https://example.com/page1">**bu**</a> <a href="https://example.com/page2">**yıl**</a> <a href="https://example.com/page3">**çok**</a> <a href="https://example.com/page4">**fazla**</a> <a href="https://example.com/page5">**şey**</a> yazdım.

**Daha iyi (bağlantıların arasında bağlama göre boşluk var):**

> Peynir hakkında bu yıl çok fazla şey yazdım: <a href="https://example.com/blue-cheese-vs-gorgonzola">**Rokfor ve gorgonzola tartışması**</a>, En Peynirli Araştırma Madalyası'nı kazanan <a href="https://example.com/worlds-oldest-brie">**dünyanın en eski brie peyniri**</a>, <a href="https://example.com/the-lost-cheese">**Kayıp Peynir**</a>'in muhteşem yeniden aktarımı ve kişisel favorim olan <a href="https://example.com/boy-and-his-cheese">**Çocuk ve Peyniri: Alışılmadık iki arkadaşın hikayesi**</a> gibi yazıları kim unutabilir?

## Dahili bağlantılar: Kendi içeriğinize çapraz yönlendirme



Bağlantı oluşturmayı genellikle harici web sitelerini işaret etme olarak düşünebilirsiniz, ancak dahili bağlantılar için kullanılan bağlantı metnine daha fazla dikkat etmek, hem kullanıcıların hem de Google'ın sitenizi daha kolay anlamasına ve sitenizdeki diğer sayfaları bulmasına yardımcı olabilir. Önemsediğiniz her sayfaya, sitenizdeki en az bir tane başka sayfadan bağlantı verilmelidir. Sitenizdeki diğer hangi kaynakların, okuyucularınızın sitenizdeki belirli bir sayfayı anlamasına yardımcı olabileceğini düşünün ve bu sayfalara bağlam içerecek şekilde bağlantı verin.

Belirli bir sayfanın içermesi gereken büyülü bir ideal bağlantı sayısı yoktur. Ancak sayının çok fazla olduğunu düşünüyorsanız muhtemelen fazladır.

## Harici bağlantılar: Diğer sitelere verilen bağlantı

Diğer sitelere bağlantı vermek korkulacak bir şey değildir. Hatta, harici bağlantılar kullanmanız güvenilirlik oluşturmanıza yardımcı olabilir (örneğin, kaynaklarınızın bağlantısını verme). Uygun olduğunda harici sitelere bağlantı verin ve okuyucularınıza neler bekleyebileceklerine dair bağlam sunun.

**İyi (kaynaklarınızın bağlantısını verme)**:

> İsviçreli araştırmacıların yakın zamanda yaptığı bir araştırmaya göre, müziğe maruz bırakılan emmental peynir tekerleri, müziğe maruz bırakılmayan kontrol grubundaki peynir tekerlerine kıyasla daha yumuşak bir tada sahipti. Bu konuyla ilgili tüm bulgulara <a href="https://example.com">**bir mutfak sanatı deneyi olan Cheese in Surround Sound**</a>'dan ulaşabilirsiniz.

[`nofollow`](https://developers.google.com/search/docs/crawling-indexing/qualify-outbound-links?hl=tr#nofollow) öğesini, sitenizdeki her harici bağlantı için değil, yalnızca kaynağa güvenmediğiniz zamanlarda kullanın. Örneğin, peynir tutkunu olduğunuzu ve birisinin en sevdiğiniz peynirle ilgili kötü şeyler söylediği bir hikaye yayınladığını, sizin de buna yanıt niteliğinde bir makale yazmak istediğinizi varsayalım. Ancak, vereceğiniz bağlantıyla bu siteye itibar kazandırmak istemiyorsunuz. Bu, tam da `nofollow` özelliğinin kullanılacağı yerdir.

Bağlantı için ödeme aldıysanız bu bağlantıları [`sponsored`](https://developers.google.com/search/docs/crawling-indexing/qualify-outbound-links?hl=tr#sponsored) veya `nofollow` ile belirtin. Kullanıcılar sitenize bağlantı ekleyebiliyorsa (örneğin, bir forum bölümünüz veya Soru-Cevap siteniz varsa) bu bağlantılara da [`ugc`](https://developers.google.com/search/docs/crawling-indexing/qualify-outbound-links?hl=tr#ugc) veya `nofollow` ekleyin.



# Site haritaları hakkında bilgi edinme





*Site haritası*; sitenizdeki sayfalar, videolar, diğer dosyalar ve bunlar arasındaki ilişkilerle ilgili bilgi sağladığınız bir dosyadır. Google gibi arama motorları, sitenizi daha verimli bir şekilde taramak için bu dosyayı okur. Site haritası, sitenizde önemli olduğunu düşündüğünüz sayfaları ve dosyaları arama motorlarına bildirir. Ayrıca bu dosyalar hakkında değerli bilgiler sağlar. Örneğin, sayfanın en son ne zaman güncellendiği ve sayfanın alternatif dil sürümleri gibi bilgileri verir.

[Video](https://developers.google.com/search/docs/crawling-indexing/sitemaps/video-sitemaps?hl=tr), [resim](https://developers.google.com/search/docs/crawling-indexing/sitemaps/image-sitemaps?hl=tr) ve [haber](https://developers.google.com/search/docs/crawling-indexing/sitemaps/news-sitemap?hl=tr) içeriği de dahil olmak üzere sayfalarınızdaki özel içerik türleriyle ilgili bilgileri sağlamak için site haritası kullanabilirsiniz. Örneğin:

- Site haritası *video girişi*; videonun uzunluğunu, puanını ve yaş uygunluğu derecelendirmesini belirtebilir.
- Site haritası *resim girişi*, bir sayfada yer alan resimlerin konumunu içerebilir.
- Site haritası *haber girişi*, makale başlığını ve yayınlanma tarihini içerebilir.

WordPress, Wix veya Blogger gibi bir içerik yönetim sistemi kullanıyorsanız büyük olasılıkla içerik yönetim sisteminiz [arama motorları için zaten bir site haritası hazırlamıştır](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap?hl=tr#cmssitemap) ve herhangi bir şey yapmanız gerekmez.

## Site haritasına ihtiyacım var mı?

Sitenizin sayfaları doğru bir şekilde bağlandıysa Google genellikle sitenizin büyük çoğunluğunu keşfedebilir. Doğru şekilde bağlantı oluşturmak ile kastedilen, önemli gördüğünüz tüm sayfalara, sitenizin menüsü veya sayfalara yerleştirdiğiniz bağlantılar gibi bir tür gezinme yöntemiyle ulaşılabilmesidir. Buna rağmen, site haritası daha büyük, daha karmaşık veya daha özel dosyaların taranmasını iyileştirebilir.

Site haritası, arama motorlarının sitenizdeki URL’leri keşfetmesine yardımcı olur ancak site haritanızdaki tüm öğelerin taranıp dizine ekleneceği garanti edilmez. Ancak çoğu durumda, site haritası kullanmak faydalıdır.

**Aşağıdaki durumlarda site haritasına ihtiyacınız olabilir:**

- **Siteniz büyükse.** Genel olarak, büyük sitelerde her sayfaya sitedeki en az bir tane başka sayfanın bağlantı verdiğinden emin olmak daha zordur. Sonuç olarak, [Googlebot](https://developers.google.com/search/docs/crawling-indexing/googlebot?hl=tr)'un yeni sayfalarınızdan bazılarını keşfetmeme ihtimali daha yüksektir.
- **Siteniz yeniyse ve sitenize verilen harici bağlantı sayısı azsa.** Googlebot ve diğer web tarayıcılar, daha önce taranmış sayfalarda bulunan URL'lere erişerek web'i tarar. Sonuç olarak Googlebot, başka hiçbir siteden bağlantı verilmezse sayfalarınızı keşfedemeyebilir.
- **Siteniz çok sayıda zengin medya içeriğine sahipse (video, resimler) veya Google Haberler'de gösteriliyorsa.** Google, site haritalarındaki ek bilgileri Arama açısından dikkate alabilir.

**Aşağıdaki durumlarda bir site haritasına ihtiyacınız olmayabilir:**

- **Siteniz "küçükse".** Burada kastedilen, sitenizin yaklaşık 500 veya daha az sayfaya sahip olmasıdır. Bu toplama yalnızca arama sonuçlarında yer almasını gerekli gördüğünüz sayfalar dahildir.
- **Siteniz kendi içinde kapsamlı şekilde bağlantılıysa.** Bu, Googlebot'un ana sayfadan başlayıp bağlantıları izleyerek sitenizdeki tüm önemli sayfaları bulabilmesi anlamına gelir.
- Arama sonuçlarında görünmesini istediğiniz **çok sayıda medya dosyanız (video, resim) veya haber sayfalarınız yoksa.** Site haritaları, Google'ın sitenizdeki video ve resim dosyalarını veya haber makalelerini bulup anlamasına yardımcı olabilir. Bu sonuçların Arama'da görünmesini istemiyorsanız site haritasına ihtiyacınız olmayabilir.

## Site haritası oluşturma

Bir site haritasına ihtiyacınız olduğuna karar verdiyseniz [nasıl oluşturulacağı hakkında daha fazla bilgi edinin](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap?hl=tr).



# Site haritası oluşturma ve gönderme



Bu sayfada, bir site haritasının nasıl oluşturulacağı ve Google'ın kullanımına nasıl sunulacağı anlatılmaktadır. Site haritalarını kullanmaya yeni başlıyorsanız [önce bu konuya giriş sayfamızı okuyun](https://developers.google.com/search/docs/crawling-indexing/sitemaps/overview?hl=tr).

Google, [site haritaları protokolü](https://www.sitemaps.org/protocol.html#otherformats) tarafından tanımlanan site haritası biçimlerini destekler. Her biçimin kendine özgü avantajları ve dezavantajları olduğundan sitenize ve kurulumunuza en uygun olanı seçin (Google'ın bu konuda bir tercihi yoktur). Aşağıdaki tabloda farklı site haritası biçimleri karşılaştırılmaktadır:

| Site haritaları karşılaştırması                              |                                                              |
| :----------------------------------------------------------- | ------------------------------------------------------------ |
| [XML site haritası](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap?hl=tr#xml) | XML site haritaları, site haritası biçimleri arasında en çok yönlü olanıdır. XML genişletilebilir olup [resim](https://developers.google.com/search/docs/crawling-indexing/sitemaps/image-sitemaps?hl=tr), [video](https://developers.google.com/search/docs/crawling-indexing/sitemaps/video-sitemaps?hl=tr) ve [haber](https://developers.google.com/search/docs/crawling-indexing/sitemaps/news-sitemap?hl=tr) içeriklerinin yanı sıra sayfalarınızın [yerelleştirilmiş sürümleri](https://developers.google.com/search/docs/specialty/international/localized-versions?hl=tr) hakkında ek veriler sağlamak için kullanılabilir.**Artıları:**Genişletilebilir ve çok yönlü.URL'leriniz hakkında en fazla bilgiyi sağlayabilir.Çoğu içerik yönetim sistemi (İYS), site haritalarını otomatik olarak oluşturur veya içerik yönetim sistemi kullanıcıları çok sayıda site haritası eklentisinden faydalanabilir.**Eksileri:**Kullanımı zor olabilir.Daha büyük sitelerde veya URL'lerin sık sık değiştiği sitelerde eşlemenin korunması karmaşık bir hal alabilir. |
| [RSS, mRSS ve Atom 1.0](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap?hl=tr#rss) | RSS, mRSS ve Atom 1.0 site haritalarının yapısı XML site haritalarına benzer olsa da içerik yönetim sistemleri tarafından otomatik olarak oluşturuldukları için bu araçlar genellikle sağlanması en kolay olanlardır.**Artıları:**Çoğu içerik yönetim sistemi, RSS ve Atom feed'lerini otomatik olarak oluşturur.Google'a videolarınızla ilgili bilgi sağlamak için kullanılabilir.**Eksileri:**[HTML ve diğer dizine eklenebilir metin içeriklerinin](https://developers.google.com/search/docs/crawling-indexing/indexable-file-types?hl=tr) yanı sıra resimler veya haberler yerine yalnızca videolar hakkında bilgi sağlayabilir.Kullanımı zor olabilir. |
| [Metin site haritası](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap?hl=tr#text) | En basit site haritası biçimidir. Yalnızca HTML'ye ve diğer dizine eklenebilir sayfalara ait URL'leri listeleyebilir.**Artıları:**Özellikle büyük sitelerde yapılması ve sağlanması kolaydır.**Eksileri:**HTML ve diğer dizine eklenebilir metin içeriğiyle sınırlıdır. |

## Site haritası en iyi uygulamaları

Site haritalarıyla ilgili en iyi uygulamalar, [site haritaları protokolü](https://www.sitemaps.org/protocol.html) tarafından tanımlanır. En sık gözden kaçan en iyi uygulamalar; boyut sınırları, site haritası konumu ve site haritalarında yer alan URL'lerle ilgilidir.

**Site haritası boyut sınırları:** Tüm biçimlerde tek bir site haritasının boyutu en fazla 50 MB (sıkıştırılmamış olarak) olabilir veya en fazla 50.000 URL içerebilir. Daha büyük bir dosyanız veya daha fazla URL'niz varsa site haritanızı birden fazla site haritası halinde bölmeniz gerekir. İsteğe bağlı olarak, bir [site haritası dizini](https://developers.google.com/search/docs/crawling-indexing/sitemaps/large-sitemaps?hl=tr) dosyası oluşturup bu tek dizin dosyasını Google'a gönderebilirsiniz. Google'a birden fazla site haritası ve site haritası dizin dosyası gönderebilirsiniz. Bu işlem, Search Console'daki her bir site haritasının arama performansını izlemek istiyorsanız yararlı olabilir.

**Site haritası dosyasının kodlaması ve konumu:** Site haritası dosyası UTF-8 olarak kodlanmalıdır. Site haritalarınızı sitenizin herhangi bir yerinde barındırabilirsiniz ancak site haritanızı [Search Console](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap?hl=tr#addsitemap) üzerinden göndermediğiniz sürece harita yalnızca üst dizinin alt öğelerini etkiler. Bu nedenle, site kök dizininde yayınlanan bir site haritası, site üzerindeki tüm dosyaları etkileyebildiğinden site haritasını kök dizinde yayınlamanızı öneririz.

**Referans verilen URL'lerin özellikleri:** Site haritalarınızda tam nitelikli, mutlak URL'ler kullanın. Google, URL'lerinizi listelendiği şekilde taramayı dener. Örneğin, siteniz `https://www.example.com/` adresindeyse `/mypage.html` (göreli URL) gibi bir URL belirtmeyin. Bunun yerine tam, mutlak URL'yi kullanın: `https://www.example.com/mypage.html`.

Google'ın arama sonuçlarında görmek istediğiniz URL'leri site haritanıza ekleyin. Google, arama sonuçlarında genellikle [standart URL'leri](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls?hl=tr) gösterir. Bu URL'leri de site haritalarıyla etkileyebilirsiniz. Bir sayfanın mobil ve masaüstü sürümleri için farklı URL'leriniz varsa bir site haritasında yalnızca tek bir sürüme işaret etmenizi öneririz. Ancak her iki URL’yi de işaret etmek istiyorsanız masaüstü ve mobil sürümleri belirtmek için URL’lerinize [ek açıklama](https://developers.google.com/search/docs/crawling-indexing/mobile/mobile-sites-mobile-first-indexing?hl=tr#additional-best-practices) girin.

En iyi uygulamaların tam listesi için [site haritaları protokolüne](https://www.sitemaps.org/protocol.html) göz atın.

## XML site haritası

XML site haritası biçimi, desteklenen biçimler arasında en çok yönlü olanıdır. Google tarafından desteklenen site haritası uzantılarını kullanarak [resim](https://developers.google.com/search/docs/crawling-indexing/sitemaps/image-sitemaps?hl=tr), [video](https://developers.google.com/search/docs/crawling-indexing/sitemaps/video-sitemaps?hl=tr) ve [haber](https://developers.google.com/search/docs/crawling-indexing/sitemaps/news-sitemap?hl=tr) içeriklerinizin yanı sıra sayfalarınızın [yerelleştirilmiş sürümleri](https://developers.google.com/search/docs/specialty/international/localized-versions?hl=tr) hakkında ek bilgi de sağlayabilirsiniz.

Aşağıda, tek bir URL'nin konumunu içeren çok basit bir XML site haritası verilmiştir:

```
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://www.example.com/foo.html</loc>
    <lastmod>2022-06-04</lastmod>
  </url>
</urlset>
```

[sitemaps.org](https://www.sitemaps.org/protocol.html) adresinde daha karmaşık örnekler ve dokümanların tamamını bulabilirsiniz.

### XML site haritaları hakkında ek notlar

- Tüm XML dosyalarında olduğu gibi, tüm etiket değerleri [öğe çıkış karakterleri ile oluşturulmuş](https://www.sitemaps.org/protocol.html#escaping) olmalıdır.
- Google hem `<priority>` hem de `<changefreq>` değerlerini yok sayar.
- Google, tutarlı ve doğrulanabilir bir şekilde (örneğin, sayfanın son değişikliğiyle karşılaştırarak) doğruysa `<lastmod>` değerini kullanır.`<lastmod>` değeri, sayfanın son önemli güncellemesinin tarihini ve saatini yansıtmalıdır. Örneğin, sayfanın ana içeriğinde, yapılandırılmış verilerinde veya bağlantılarında yapılan güncellemeler genel olarak önemli kabul edilirken, telif hakkı tarihindeki değişiklik önemli güncelleme olarak değerlendirilmez.

## RSS, mRSS ve Atom 1.0

İçerik yönetim sisteminiz bir RSS veya Atom feed'i oluşturuyorsa o feed'in URL'sini site haritası olarak gönderebilirsiniz. Çoğu içerik yönetim sistemi sizin için bir feed oluşturur. Ancak bu feed'in yalnızca son URL'ler hakkında bilgi sağladığını unutmayın.

### RSS, mRSS ve Atom 1.0 hakkında ek notlar

- Google, RSS 2.0 ve Atom 1.0 özet akışlarını kabul eder.
- Sitenizdeki video içeriği hakkında Google'a ayrıntılı bilgi sunmak üzere bir [mRSS (medya RSS)](https://developers.google.com/search/docs/crawling-indexing/sitemaps/video-sitemaps?hl=tr) özet akışından yararlanabilirsiniz.
- Tüm XML dosyalarında olduğu gibi, tüm etiket değerleri [öğe çıkış karakterleri ile oluşturulmuş](https://www.sitemaps.org/protocol.html#escaping) olmalıdır.

## Metin site haritası

Yalnızca web sayfası URL'lerini sağlamak istiyorsanız her satırda bir URL içeren genel bir metin dosyası oluşturup bunu Google'a gönderebilirsiniz. Örneğin, sitenizde iki sayfa varsa bunları `https://www.example.com/sitemap.txt` adresindeki metin site haritanıza ekleyebilirsiniz:

```
https://www.example.com/file1.html
https://www.example.com/file2.html
```

### Metin dosyası site haritaları hakkında ek notlar

- Site haritası dosyasına URL'lerden başka herhangi bir şey koymayın.
- Dosya `.txt` uzantılı olduğu sürece metin dosyasına istediğiniz ismi verebilirsiniz (örneğin, sitemap.txt).

## Site haritası nasıl oluşturulur?



Site haritası oluşturduğunuzda arama motorlarına, arama sonuçlarında gösterilmesini tercih ettiğinizi URL'leri belirtmiş olursunuz. Bunlar [standart URL'lerdir](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls?hl=tr). Aynı içeriğinize farklı URL'lerle erişilebiliyorsa aynı içeriğe yönlendiren tüm URL'ler yerine tercih ettiğiniz URL'yi seçip site haritasına ekleyin.

Site haritasına ekleyeceğiniz URL'lere karar verdikten sonra sitenizin mimarisine ve boyutuna bağlı olarak site haritası oluşturmak için aşağıdaki yöntemlerden birini seçin:

- [İçerik Yönetim Sisteminizin sizin için site haritası oluşturmasına olanak tanıma](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap?hl=tr#cmssitemap).
- Birkaç düzineden az URL içeren site haritaları için [manuel olarak site haritası oluşturabilirsiniz](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap?hl=tr#manualsitemap).
- Birkaç düzineden fazla URL içeren site haritaları için [otomatik olarak site haritası oluşturabilirsiniz](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap?hl=tr#autositemap).

### İçerik Yönetim Sisteminizin sizin için site haritası oluşturmasına olanak tanıma

WordPress, Wix veya Blogger gibi bir İçerik Yönetim Sistemi (İYS) kullanıyorsanız büyük olasılıkla İYS'niz arama motorları için zaten bir site haritası hazırlamıştır. İYS'nizin site haritalarını nasıl oluşturduğu veya İYS'niz site haritalarını otomatik olarak oluşturmuyorsa nasıl site haritası oluşturacağınız hakkındaki bilgiyi aramayı deneyin. Örneğin, Wix'i kullanıyorsanız "wix sitemap" ifadesini, Blogger kullanıyorsanız da "Blogger RSS" ifadesini arayın.

### Manuel olarak site haritası oluşturma

Birkaç düzineden az URL içeren site haritaları için manuel olarak site haritası oluşturabilirsiniz. Bu yapmak için [Windows Not Defteri](https://www.microsoft.com/en-us/search?q=windows+notepad) veya [Nano (Linux, MacOS)](https://www.nano-editor.org/) gibi bir metin düzenleyici açıp [Site Haritası Biçimleri](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap?hl=tr#sitemapformat) bölümünde açıklanan söz dizimini uygulayın. [URL'de izin verilen karakterleri](https://developers.google.com/maps/url-encoding?hl=tr) kullanarak dosyayı istediğiniz gibi adlandırabilirsiniz.

Manuel olarak daha büyük site haritaları da oluşturabilirsiniz ancak bu yorucu bir işlem olup uygulaması uzun vadede zor olabilir.

### Araçlarla otomatik olarak site haritası oluşturma

Birkaç düzineden fazla URL içeren site haritaları için site haritası oluşturmanız gerekir. [Site haritası oluşturabilen](https://www.google.com/search?q=generate+sitemap&hl=tr) çeşitli araçlar vardır. Bununla birlikte, web sitesi yazılımınızın site haritasını sizin için oluşturmasını sağlamak en iyi yöntemdir. Örneğin, web sitenizin veritabanından sitenizin URL'lerini çıkarıp ekrana veya web sunucunuzdaki gerçek dosyaya aktarabilirsiniz. Bu çözüm hakkında geliştiricilerinizle veya sunucu yöneticinizle görüşün. Kod oluşturma konusunda yardıma ihtiyacınız varsa [üçüncü taraf site haritası oluşturma araçlarından](http://code.google.com/p/sitemap-generators/wiki/SitemapGenerators?hl=tr) oluşan eski, yönetilmeyen koleksiyonumuza göz atın.

Site haritanızdaki URL'lerin sırası konusunda endişelenmenize gerek yoktur. Bu sıra Google açısından önemli değildir. [Site haritaları için boyut gereksinimlerini](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap?hl=tr#general-guidelines) göz önünde bulundurun. Site haritası çok büyük olursa daha küçük site haritalarına bölmeniz gerekir. [Büyük site haritalarını yönetme](https://developers.google.com/search/docs/crawling-indexing/sitemaps/large-sitemaps?hl=tr) hakkında daha fazla bilgi edinin.

## Site haritanızı Google'a gönderme

Site haritası göndermenin sadece bir ipucu olarak değerlendirildiğini unutmayın: Google'ın site haritasını indireceği veya sitedeki URL'leri taramak için site haritasını kullanacağı garanti edilmez. Site haritanızı Google'ın kullanımına sunmanın birkaç farklı yolu vardır.

- [Site haritaları raporunu](https://support.google.com/webmasters/answer/7451001?hl=tr) kullanarak **Search Console'da site haritası gönderin**. Bu sayede Googlebot'un site haritasına ne zaman eriştiğini ve olası işleme hatalarını görebilirsiniz.

- Programatik olarak [site haritası göndermek](https://developers.google.com/webmaster-tools/v1/sitemaps/submit?hl=tr) için **Search Console API'yi kullanın**.

- Aşağıdaki satırı robots.txt dosyanızda herhangi bir yere ekleyerek

   

  site haritanızın yolunu belirtin. Site haritasını, robots.txt dosyanızı tekrar taradığımızda buluruz:

  

  ```
  Sitemap: https://example.com/my_sitemap.xml
  ```

- Atom veya RSS kullanıyorsanız değişikliklerinizi Google da dahil olmak üzere arama motorlarında yayınlamak için [WebSub](https://www.w3.org/TR/websub/)'ı kullanabilirsiniz.

## Birden fazla site için site haritalarını karşılıklı gönderme

Birden fazla web siteniz varsa doğrulanmış tüm sitelerinizin URL'lerini içeren bir ya da daha fazla site haritası oluşturarak ve site haritalarını tek bir konuma kaydederek gönderme sürecini basitleştirebilirsiniz. Şunlardan birini kullanmayı tercih edebilirsiniz:

- Farklı alanlardaki siteler dahil olmak üzere, birden fazla web sitesinin URL'lerini içeren tek bir site haritası. Örneğin,

   

  ```
  https://host1.example.com/sitemap.xml
  ```

   

  adresinde bulunan site haritası aşağıdaki URL'leri içerebilir.

  - `https://host1.example.com`
  - `https://host2.example.com`
  - `https://host3.example.com`
  - `https://host1.example1.com`
  - `https://host1.example.ch`

- Hepsi tek bir konumda bulunan bağımsız (her site için bir adet) site haritaları. Örneğin,

   

  ```
  https://host1.example.com
  ```

  , aşağıdaki site haritalarının tümünü barındırabilir

  - `https://host1.example.com/host1-example-sitemap.xml`
  - `https://host1.example.com/host2-example-sitemap.xml`
  - `https://host1.example.com/host3-example-sitemap.xml`
  - `https://host1.example.com/host1-example1-sitemap.xml`
  - `https://host1.example.com/host1-example-ch-sitemap.xml`

Tek bir konumda barındırılan siteler arası site haritaları göndermek için Search Console'u veya robots.txt dosyasını kullanabilirsiniz.

### Search Console ile site haritasını karşılıklı gönderme

1. Site haritasına ekleyeceğiniz tüm sitelerin [sahipliğini doğruladığınızdan](https://support.google.com/webmasters/answer/35181?hl=tr) emin olun.
2. Kapsamak istediğiniz tüm sitelerdeki URL'leri içeren [bir (veya isterseniz daha fazla) site haritası oluşturun](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap?hl=tr#createsitemap). Site haritalarını isterseniz bir [site haritası dizini](https://developers.google.com/search/docs/crawling-indexing/sitemaps/large-sitemaps?hl=tr) dosyasına ekleyebilir ve sonrasında bu site haritası diziniyle çalışabilirsiniz.
3. Google Search Console'u kullanarak [site haritalarınızı veya site haritası dizin dosyanızı gönderin](https://support.google.com/webmasters/answer/7451001?hl=tr).

### Robots.txt ile site haritasını karşılıklı gönderme

1. Her site için [bir veya daha fazla site haritası oluşturun](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap?hl=tr#createsitemap). Her bir site haritası dosyası için yalnızca söz konusu sitedeki URL'leri eklediğinizden emin olun.

2. Tüm site haritalarını kontrolünüzde olan tek bir siteye yükleyin (örneğin, `https://sitemaps.example.com`).

3. Her bir site için robots.txt dosyasının söz konusu sitenin site haritasına başvurduğundan emin olun. Örneğin,

    

   ```
   https://example.com/
   ```

    

   için bir site haritası oluşturduysanız ve site haritasını

    

   ```
   https://sitemaps.example.com/sitemap-example-com.xml
   ```

    

   adresinde barındırıyorsanız

    

   ```
   https://example.com/robots.txt
   ```

    

   adresindeki robots.txt dosyasında yer alan site haritasına ile başvurun.

   

   ```
   # robots.txt file of https://example.com/
   sitemap: https://sitemaps.example.com/sitemap-example-com.xml
   ```

## Site haritalarıyla ilgili sorunları giderme

Site haritanızla ilgili sorun yaşıyorsanız hataları Google Search Console ile inceleyebilirsiniz. Yardım almak için Search Console'un [site haritaları sorun giderme kılavuzuna](https://support.google.com/webmasters/answer/7451001?hl=tr#errors) bakın.





# Site haritalarınızı site haritası dizin dosyasıyla yönetme



[Boyut sınırlarını](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap?hl=tr) aşan bir site haritanız varsa her yeni site haritası, boyut sınırının altında olacak şekilde büyük site haritanızı birden fazla site haritasına bölmeniz gerekir. Site haritanızı böldükten sonra aynı anda birden fazla site haritası göndermenin bir yolu olarak site haritası dizin dosyasından yararlanabilirsiniz.

## Site haritası diziniyle ilgili en iyi uygulamalar

Site haritası dizin dosyasının XML biçimi, site haritası dosyasının XML biçimine çok benzerdir ve [Site haritası protokolüne](https://www.sitemaps.org/protocol.html#index) göre tanımlanır. Bu, tüm site haritası şartlarının, site haritası dizin dosyaları için de geçerli olduğu anlamına gelir.

Başvurulan site haritaları, site haritası dizin dosyanızla aynı sitede barındırılmalıdır. [Siteler arası gönderme](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap?hl=tr#cross-submit) ayarladığınızda bu şart geçerli olmaz.

Site haritası dizin dosyasında başvurulan site haritaları, site haritası diziniyle aynı dizinde bulunmalı veya site hiyerarşisinde site haritası dizininden aşağıda yer almalıdır. Örneğin, site haritası dizin dosyası `https://example.com/public/sitemap_index.xml` adresindeyse yalnızca `https://example.com/public/shared/...` gibi aynı veya daha derin dizindeki site haritalarını içerebilir.

Search Console hesabınızdaki her bir site için en fazla 500 site haritası dizin dosyası gönderebilirsiniz.

## Örnek site haritası dizini

Aşağıdaki örnekte iki site haritası listelemekte olan XML biçiminde bir site haritası dizini verilmiştir:

```
<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>https://www.example.com/sitemap1.xml.gz</loc>
    <lastmod>2024-08-15</lastmod>
  </sitemap>
  <sitemap>
    <loc>https://www.example.com/sitemap2.xml.gz</loc>
    <lastmod>2022-06-05</lastmod>
  </sitemap>
</sitemapindex>
```

## Site haritası dizinine başvurma

Site haritası dizinindeki etiketler, geleneksel site haritalarıyla aynı ad alanına göre tanımlanır: [`http://www.sitemaps.org/schemas/sitemap/0.9`](http://www.sitemaps.org/schemas/sitemap/0.9)

Google'ın site haritası dizininizi kullanabileceğinden emin olmak için aşağıdaki zorunlu etiketleri kullanmanız gerekir:

| Zorunlu etiketler |                                                              |
| :---------------- | ------------------------------------------------------------ |
| `sitemapindex`    | XML ağacının kök etiketi. Diğer tüm etiketleri içerir.       |
| `sitemap`         | Dosyada listelenen site haritalarının her birinin üst etiketidir. `sitemapindex` etiketinin tek doğrudan alt öğesidir. |
| `loc`             | Site haritasının konumu (URL). `sitemap` etiketinin alt öğesidr. Bir site haritası dizin dosyasının en fazla 50.000 `loc` etiketi olabilir. |

Ayrıca, aşağıdaki isteğe bağlı etiketler Google'ın site haritalarınızı tarama için planlamasına yardımcı olabilir:

| İsteğe bağlı etiketler |                                                              |
| :--------------------- | ------------------------------------------------------------ |
| `lastmod`              | İlgili site haritası dosyasının değiştirildiği zamanı tanımlar. `sitemap` etiketinin alt öğesi olabilir. `lastmod` etiketinin değeri [W3C Datetime biçiminde](https://www.w3.org/TR/NOTE-datetime) olmalıdır. |











# rama görünümü konularına genel bakış



Bu bölümdeki konularda, web sitenizin Google Arama'da nasıl göründüğünü nasıl etkileyebileceğiniz açıklanmaktadır.

| [Yapay zeka özellikleri](https://developers.google.com/search/docs/appearance/ai-features?hl=tr)[İş bilgileri](https://developers.google.com/search/docs/appearance/establish-business-details?hl=tr)[Bilgi satırı tarihleri](https://developers.google.com/search/docs/appearance/publication-dates?hl=tr)[Site simgeleri](https://developers.google.com/search/docs/appearance/favicon-in-search?hl=tr)[Öne çıkan snippet'ler](https://developers.google.com/search/docs/appearance/featured-snippets?hl=tr)[Esnek Örnekleme ile ilgili genel yönergeler](https://developers.google.com/search/docs/appearance/flexible-sampling?hl=tr)[Google Keşfet](https://developers.google.com/search/docs/appearance/google-discover?hl=tr)[Görseller](https://developers.google.com/search/docs/appearance/google-images?hl=tr) | [Site adları](https://developers.google.com/search/docs/appearance/site-names?hl=tr)[Site Bağlantıları](https://developers.google.com/search/docs/appearance/sitelinks?hl=tr)[Snippet'ler](https://developers.google.com/search/docs/appearance/snippet?hl=tr)[Başlık bağlantıları](https://developers.google.com/search/docs/appearance/title-link?hl=tr)[En Popüler Yerler Listesi](https://developers.google.com/search/docs/appearance/top-places-list?hl=tr)[Çevrilmiş sonuçlar](https://developers.google.com/search/docs/appearance/translated-results?hl=tr)[Videolar](https://developers.google.com/search/docs/appearance/video?hl=tr)[Görsel öğeler galerisi](https://developers.google.com/search/docs/appearance/visual-elements-gallery?hl=tr)[Web hikayeleri](https://developers.google.com/search/docs/appearance/enable-web-stories?hl=tr) |
| ------------------------------------------------------------ | ------------------------------------------------------------ |
|                                                              |                                                              |

## Yapılandırılmış veriyi kullanma 

Google, sayfadaki içeriği anlamak için yapılandırılmış verileri kullanır. Siteniz hakkında, arama sonuçlarında daha zengin özelliklerde görüntülenmesine yardımcı olabilecek belirli bilgiler sağlayarak bize yardımcı olabilirsiniz.

| [Google Arama'nın desteklediği yapılandırılmış veri işaretleme listesi](https://developers.google.com/search/docs/appearance/structured-data/search-gallery?hl=tr)[Yapılandırılmış verilerin nasıl çalıştığını anlama](https://developers.google.com/search/docs/appearance/structured-data/intro-structured-data?hl=tr)[JavaScript ile yapılandırılmış veri oluşturma](https://developers.google.com/search/docs/appearance/structured-data/generate-structured-data-with-javascript?hl=tr) | [Yapılandırılmış verilerle ilgili genel yönergeler](https://developers.google.com/search/docs/appearance/structured-data/sd-policies?hl=tr)[Zenginleştirilmiş arama sonuçları](https://developers.google.com/search/docs/appearance/enriched-search-results?hl=tr) |
| ------------------------------------------------------------ | ------------------------------------------------------------ |
|                                                              |                                                              |

### Yapılandırılmış veri kullanan özellikler 

Aşağıda, yapılandırılmış veri kullanan özelliklerin listesi verilmiştir:

| [Makale](https://developers.google.com/search/docs/appearance/structured-data/article?hl=tr)[İçerik haritası](https://developers.google.com/search/docs/appearance/structured-data/breadcrumb?hl=tr)[Bant](https://developers.google.com/search/docs/appearance/structured-data/carousel?hl=tr)[Kurs listesi](https://developers.google.com/search/docs/appearance/structured-data/course?hl=tr)[Veri Kümesi](https://developers.google.com/search/docs/appearance/structured-data/dataset?hl=tr)[Tartışma forumu](https://developers.google.com/search/docs/appearance/structured-data/discussion-forum?hl=tr)[Eğitim amaçlı soru-cevap](https://developers.google.com/search/docs/appearance/structured-data/education-qa?hl=tr)[İşveren toplu puanı](https://developers.google.com/search/docs/appearance/structured-data/employer-rating?hl=tr)[Etkinlik](https://developers.google.com/search/docs/appearance/structured-data/event?hl=tr)[SSS](https://developers.google.com/search/docs/appearance/structured-data/faqpage?hl=tr)[Resim meta verisi](https://developers.google.com/search/docs/appearance/structured-data/image-license-metadata?hl=tr)[İş ilanı](https://developers.google.com/search/docs/appearance/structured-data/job-posting?hl=tr) | [Yerel işletme](https://developers.google.com/search/docs/appearance/structured-data/local-business?hl=tr)[Matematik problemi çözme aracı](https://developers.google.com/search/docs/appearance/structured-data/math-solvers?hl=tr)[Film bandı](https://developers.google.com/search/docs/appearance/structured-data/movie?hl=tr)[Kuruluş](https://developers.google.com/search/docs/appearance/structured-data/organization?hl=tr)[Alıştırma sorusu](https://developers.google.com/search/docs/appearance/structured-data/practice-problems?hl=tr)[Ürün](https://developers.google.com/search/docs/appearance/structured-data/product?hl=tr):[Ürün snippet'i](https://developers.google.com/search/docs/appearance/structured-data/product-snippet?hl=tr)[Satıcı ürün listeleme deneyimi](https://developers.google.com/search/docs/appearance/structured-data/merchant-listing?hl=tr)[Varyantlar](https://developers.google.com/search/docs/appearance/structured-data/product-variants?hl=tr)[Satıcının iade politikası](https://developers.google.com/search/docs/appearance/structured-data/return-policy?hl=tr)[Satıcının kargo politikası](https://developers.google.com/search/docs/appearance/structured-data/shipping-policy?hl=tr)[Bağlılık programı](https://developers.google.com/search/docs/appearance/structured-data/loyalty-program?hl=tr)[Profil sayfası](https://developers.google.com/search/docs/appearance/structured-data/profile-page?hl=tr) | [Soru-Cevap](https://developers.google.com/search/docs/appearance/structured-data/qapage?hl=tr)[Yemek tarifi](https://developers.google.com/search/docs/appearance/structured-data/recipe?hl=tr)[Yorum snippet'i](https://developers.google.com/search/docs/appearance/structured-data/review-snippet?hl=tr)[Yazılım uygulaması](https://developers.google.com/search/docs/appearance/structured-data/software-app?hl=tr)[Sesli söylenebilir](https://developers.google.com/search/docs/appearance/structured-data/speakable?hl=tr)[Abonelik ve ödeme duvarlı içerik](https://developers.google.com/search/docs/appearance/structured-data/paywalled-content?hl=tr)[Kiralık yer](https://developers.google.com/search/docs/appearance/structured-data/vacation-rental?hl=tr)[Video](https://developers.google.com/search/docs/appearance/structured-data/video?hl=tr) |
| ------------------------------------------------------------ | ------------------------------------------------------------ | ------------------------------------------------------------ |
|                                                              |                                                              |                                                              |

## İlk Kullanıcılar Programı 

Google, kullanıcılara en iyi deneyimi sunmak için sınırlı sayıda kuruluşla bazı özelliklerin pilot çalışmasını gerçekleştirmektedir. Aşağıda, İlk Kullanıcılar Programı'nda olan özellikler verilmiştir:

- [Kargo takibi](https://developers.google.com/search/docs/appearance/package-tracking?hl=tr)

- [Yapılandırılmış veri bantları (beta)](https://developers.google.com/search/docs/appearance/structured-data/carousels-beta?hl=tr)

- # Yapay zeka özellikleri ve web siteniz

  

  Bu kılavuzda, Yapay Zeka Bakışı ve Yapay Zeka Modu gibi yapay zeka özelliklerinin Google Arama'da site sahibi açısından işleyiş şekli ve içeriğinizin bu deneyimlere nasıl dahil edileceği ele alınmaktadır.

  SEO ile ilgili en iyi uygulamalar, Google Arama'daki yapay zeka özellikleri (ör. Yapay Zeka Bakışı ve Yapay Zeka Modu) için geçerli olmaya devam edecektir. **Yapay Zeka Bakışı veya Yapay Zeka Modu'nda görünmek için ek şart yoktur. Ayrıca başka özel optimizasyonlar da gerekmez.** Bununla birlikte, [SEO ile ilgili temel en iyi uygulamaların](https://developers.google.com/search/docs/essentials?hl=tr) incelenmesi her zaman faydalıdır.

  ## Arama'da yapay zeka özellikleri nasıl çalışır?

  Arama'nın genelinde olduğu gibi, [Yapay Zeka Bakışı](https://support.google.com/websearch/answer/14901683?hl=tr) ve [Yapay Zeka Modu](https://support.google.com/websearch/answer/16011537?hl=tr)'ndaki yapay zeka özellikleri, kullanıcıların aradıkları bilgiyi hızlı ve güvenilir şekilde bulmalarına, ayrıca daha önce keşfetmedikleri içerikleri keşfetmelerine yardımcı olmak için alakalı bağlantılar gösterir. Bu özellikler, daha fazla site türünün görünmesi için benzersiz fırsatlar sunar.

  **Yapay Zeka Bakışı**, kullanıcıların karmaşık bir konunun veya sorunun ana fikrini daha hızlı anlamalarına yardımcı olur ve daha fazla bilgi edinmek için bağlantıları keşfedebilecekleri bir başlangıç noktası sağlar. Bu sonuçlar, kullanıcıların Arama'da elde edebileceğinden daha fazla avantaj sağlanabilecek sorgularda görünecek şekilde tasarlanmıştır. Yapay Zeka Bakışı sayesinde artık kullanıcılar daha karmaşık sorularla ilgili yardım almak için çok daha çeşitli web sitelerini ziyaret ediyor.

  **Yapay Zeka Modu**, özellikle daha ayrıntılı inceleme, akıl yürütme veya karmaşık karşılaştırma gerektiren sorgular için idealdir. Kullanıcılar, daha önce birden fazla arama yapmayı gerektiren ayrıntılı sorular sorabilir (ör. yeni bir kavramı keşfetme, seçenekleri karşılaştırma vb.) ve destekleyici web sitelerinin bağlantılarını içeren kapsamlı, yapay zeka destekli yanıtlar alabilir.

  

  Hem Yapay Zeka Bakışı hem de Yapay Zeka Modu, yanıt geliştirmek için "sorgu yayma" tekniğini (alt konularda ve veri kaynaklarında birden fazla ilgili arama yapma) kullanabilir. Yanıtlar oluşturulurken gelişmiş modellerimiz daha fazla destekleyici web sayfası tespit eder. Bu sayede, klasik bir web aramasına kıyasla yanıtla ilişkili **daha fazla sayıda faydalı bağlantı gösterebilir** ve keşif için yeni fırsatlar sunarız.

  Yapay Zeka Modu ve Yapay Zeka Bakışı farklı modeller ve teknikler kullanabileceğinden gösterdikleri yanıtlar ve bağlantılar da değişiklik gösterir. Yapay Zeka Bakışı yalnızca klasik Arama'ya katkıda bulunacağı sistemlerimiz tarafından belirlendiğinde gösterilir ve bu nedenle genellikle devreye girmez.

  ## Yapay zeka özelliklerinde görünme

  Yapay zeka özellikleri için genel olarak Google Arama'da kullandığınız şu [temel SEO en iyi uygulamalarına](https://developers.google.com/search/docs/essentials?hl=tr) uyabilirsiniz: Sayfanın [Google Arama'nın teknik şartlarını ](https://developers.google.com/search/docs/essentials/technical?hl=tr)karşıladığından emin olun, [Arama politikalarına](https://support.google.com/websearch/answer/10622781?hl=tr) uyun ve [yararlı, güvenilir, kullanıcı odaklı içerikler oluşturma](https://developers.google.com/search/docs/fundamentals/creating-helpful-content?hl=tr) gibi [önemli en iyi uygulamalara](https://developers.google.com/search/docs/essentials?hl=tr#key-best-practices) odaklanın.

  ### Yapay zeka özelliklerinde görünmek için teknik koşullar

  Yapay Zeka Bakışı veya Yapay Zeka Modu'nda destekleyici bağlantı olarak gösterilmeye uygun olması için bir sayfanın dizine eklenmiş olması, ayrıca [Arama teknik koşullarını](https://developers.google.com/search/docs/essentials/technical?hl=tr) karşılayarak Google Arama'da snippet ile gösterilmeye uygun olması gerekir. Ek teknik koşullar yoktur.

  Bir sayfa tüm koşulları, en iyi uygulamaları karşılasa ve politikalara uygun olsa da Google tarafından taranmayabilir, dizine eklenmeyebilir veya içeriği yayınlanmayabilir. Sayfanın dizine ekleneceği ve yayınlanacağı garanti edilmez. [Arama'nın nasıl çalıştığı](https://developers.google.com/search/docs/fundamentals/how-search-works?hl=tr) hakkında daha fazla bilgi edinin.

  ### SEO ile ilgili en iyi uygulamalar

  Yapay Zeka Bakışı ve Yapay Zeka Modu için belirli bir optimizasyon gerekmese de mevcut tüm [SEO temel ilkeleri](https://developers.google.com/search/docs/fundamentals/seo-starter-guide?hl=tr) faydalı olmaya devam etmektedir. Örneğin:

  - Robots.txt dosyasında ve tüm CDN'lerde veya barındırma altyapılarında taramaya izin verildiğinden emin olma
  - İçeriklerinizi web sitenizdeki [dahili bağlantılar](https://developers.google.com/search/docs/crawling-indexing/links-crawlable?hl=tr#internal-links) aracılığıyla kolayca bulunabilir hale getirme
  - Kullanıcılara mükemmel bir [sayfa deneyimi](https://developers.google.com/search/docs/appearance/page-experience?hl=tr) sunma
  - Önemli içeriklerin metin biçiminde sunulduğundan emin olma
  - Metin içeriklerinizi yüksek kaliteli [görsel](https://developers.google.com/search/docs/appearance/google-images?hl=tr) ve [videolarla](https://developers.google.com/search/docs/appearance/video?hl=tr) destekleme (uygun durumlarda)
  - [Yapılandırılmış verilerinizin](https://developers.google.com/search/docs/appearance/structured-data/sd-policies?hl=tr) sayfadaki görünür metinle eşleştiğinden emin olma
  - [Merchant Center](https://support.google.com/merchants/answer/12159157?hl=tr) ve [İşletme Profili](https://developers.google.com/search/docs/appearance/establish-business-details?hl=tr) bilgilerinizin güncel olup olmadığını kontrol etme

  Bu özelliklerde görünmesi için yeni makine tarafından okunabilir dosyalar, yapay zeka metin dosyaları veya işaretleme oluşturmanız gerekmez. Ayrıca eklemeniz gereken özel bir schema.org yapılandırılmış verisi de yoktur.

  Olası teknik sorunları hızlı şekilde tespit ve teşhis etmek için [sitenizi Search Console'da doğrulayın](https://support.google.com/webmasters/answer/9008080?hl=tr).

  ## Sitenizin performansını ölçme

  Arama sonuçları sayfasının geri kalanı gibi, yapay zeka özelliklerinde (ör. Yapay Zeka Bakışı ve Yapay Zeka Modu) görünen siteler de [Search Console](https://search.google.com/search-console/about?hl=tr)'daki genel arama trafiğine dahil edilir. Özellikle [Performans raporundaki](https://support.google.com/webmasters/answer/7576553?hl=tr) ["Web" arama türü](https://support.google.com/webmasters/answer/7576553?hl=tr#by_search_type) altında raporlanırlar. Search Console'da [Yapay Zeka Bakışı](https://support.google.com/webmasters/answer/7042828?hl=tr#ai-overviews&zippy=,t,ai-overviews) ve [Yapay Zeka Modu](https://support.google.com/webmasters/answer/7042828?hl=tr#ai-mode&zippy=,t,ai-mode)'nun genel verilerin hesaplanmasına nasıl dahil edildiği, genel olarak [trafik değişikliklerinin nasıl analiz edileceği](https://developers.google.com/search/docs/monitor-debug/debugging-search-traffic-drops?hl=tr) ve [Search Console ile Analytics verilerinin nasıl birleştirileceği](https://developers.google.com/search/docs/monitor-debug/google-analytics-search-console?hl=tr) hakkında daha fazla bilgi edinin.

  Search Console'a ek olarak, Google Analytics gibi diğer araçlarda da dönüşümleri ve sitenizde geçirilen süreyi izleyebilirsiniz. Yapay Zeka Bakışı özelliğinin bulunduğu arama sonucu sayfalarında kullanıcıların yaptıkları tıklamaların daha yüksek kalitede olduğunu (yani kullanıcıların söz konusu sitede daha fazla zaman geçirme ihtimalinin olduğunu) tespit ettik.

  ## Arama'daki yapay zeka özelliklerinde içeriğinizi kontrol etme

  Yapay zeka, Arama'nın yapısına dahil edilerek Arama'nın işleyişine entegre edilmiştir. Bu nedenle, [Googlebot](https://developers.google.com/search/docs/crawling-indexing/overview-google-crawlers?hl=tr) için robots.txt yönergeleri, site sahiplerinin sitelerinin Arama için nasıl taranacağına dair erişimi yönetmelerini sağlayan kontrol mekanizmasıdır. Arama'da sayfalarınızdan gösterilen bilgileri sınırlamak için [`nosnippet`, `data-nosnippet`, `max-snippet`](https://developers.google.com/search/docs/crawling-indexing/robots-meta-tag?hl=tr) veya [`noindex`](https://developers.google.com/search/docs/crawling-indexing/block-indexing?hl=tr) denetimlerini kullanın.

  Google'ın diğer sistemlerinin bazılarında yapay zeka eğitimini ve temellendirmeyi sınırlamak için [Google-Extended](https://developers.google.com/search/docs/crawling-indexing/google-common-crawlers?hl=tr#google-extended) hakkında daha fazla bilgi edinin.

  ### Önizleme kontrolleriyle ilgili sorunları giderme

  [Önizleme kontrollerini](https://developers.google.com/search/docs/appearance/snippet?hl=tr#nosnippet) uyguladığınız halde içeriğiniz Arama'daki yapay zeka özelliklerinde görünmeye devam ediyorsa aşağıdaki adımları deneyin:

  1. Önizleme kontrolünün doğru olduğundan ve Googlebot tarafından görülebildiğinden emin olun. Uygulamanızın doğru olup olmadığını test etmek için [URL Denetleme aracını](https://support.google.com/webmasters/answer/9012289?hl=tr) kullanarak Googlebot'un sayfayı tararken aldığı HTML'ye bakın.
  2. Google'ın önizleme kontrollerinde yapılan değişikliği yeniden tarayıp işlemesi için zaman tanıyın. Taramanın, sistemlerimizin bir sayfanın ne sıklıkta yenilenmesi gerektiğini belirlediğine bağlı olarak birkaç gün ila birkaç ay sürebileceğini unutmayın. Değişiklik yaptıysanız [Google'ın sayfalarınızı yeniden taramasını isteyebilirsiniz](https://developers.google.com/search/docs/crawling-indexing/ask-google-to-recrawl?hl=tr).

  Sorun giderme adımlarını denemenize rağmen sorun yaşamaya devam ediyorsanız [Google Arama Merkezi Yardım Topluluğu](https://support.google.com/webmasters/thread/227739087?hl=tr)'nda soru yayınlayın.Google Arama'daki künye tarihi üzerinde etkide bulunmanızı sağlayacak yöntemler

  

  *Künye tarihi* Google'ın, web sayfasının güncellendiğini veya yayınlandığını tahmin ettiği tarihtir. Google, sayfanızın veya videonuzun künye tarihini belirleyebiliyorsa kullanıcı için yararlı olması durumunda bu bilgileri Arama sonuçlarında gösterebilir. Künye tarihinin Google tarafından belirlenmesine yardımcı olmak için bilgi sağlayabilirsiniz.

  <svg aria-labelledby="svg-byline-date" direction="ltr" viewBox="0 0 800 250" xlink="https://www.w3.org/1999/xlink" xmlns="https://www.w3.org/2000/svg" style="color: rgb(32, 33, 36); font-family: Roboto, &quot;Noto Sans&quot;, &quot;Noto Sans JP&quot;, &quot;Noto Sans KR&quot;, &quot;Noto Naskh Arabic&quot;, &quot;Noto Sans Thai&quot;, &quot;Noto Sans Hebrew&quot;, &quot;Noto Sans Bengali&quot;, sans-serif; font-size: 16px; font-style: normal; font-variant-ligatures: normal; font-variant-caps: normal; font-weight: 400; letter-spacing: normal; orphans: 2; text-align: start; text-indent: 0px; text-transform: none; widows: 2; word-spacing: 0px; -webkit-text-stroke-width: 0px; white-space: normal; background-color: rgb(255, 255, 255); text-decoration-thickness: initial; text-decoration-style: initial; text-decoration-color: initial;"><image href="https://developers.google.com/static/search/docs/images/blank-byline-date.png?hl=tr" width="100%" y="0%"></image><foreignObject height="80" width="600" x="130" y="30"><p class="hide-from-toc no-link" xmlns="https://www.w3.org/1999/xhtml" style="box-sizing: inherit; margin: 0px; padding: 1rem 0px; font: 400 24px / 32px &quot;Google Sans&quot;, &quot;Noto Sans&quot;, &quot;Noto Sans JP&quot;, &quot;Noto Sans KR&quot;, &quot;Noto Naskh Arabic&quot;, &quot;Noto Sans Thai&quot;, &quot;Noto Sans Hebrew&quot;, &quot;Noto Sans Bengali&quot;, sans-serif;">Curious Panda</p></foreignObject><foreignObject height="80" width="600" x="50" y="100"><p class="hide-from-toc no-link" xmlns="https://www.w3.org/1999/xhtml" style="box-sizing: inherit; margin: 0px; padding: 1rem 0px; font: 400 20px / 28px &quot;Google Sans&quot;, &quot;Noto Sans&quot;, &quot;Noto Sans JP&quot;, &quot;Noto Sans KR&quot;, &quot;Noto Naskh Arabic&quot;, &quot;Noto Sans Thai&quot;, &quot;Noto Sans Hebrew&quot;, &quot;Noto Sans Bengali&quot;, sans-serif;"><a class="external-link" href="https://wikipedia.org/wiki/Sloth" style="box-sizing: inherit; color: rgb(26, 115, 232); outline: 0px; text-decoration: rgb(26, 115, 232); word-break: break-word;">Tembel hayvanlar neden çok yavaş?</a></p></foreignObject><foreignObject height="80" width="600" x="65" y="140"><p xmlns="https://www.w3.org/1999/xhtml" style="box-sizing: inherit; margin: 0px; padding: 1rem 0px;">25 Ağustos 2023</p></foreignObject></svg>

  

  Her faktörde bazı sorunlar olabileceğinden Google tek bir tarih faktörüne dayalı karar vermez. Bu yüzden sistemlerimiz bir sayfanın yayınlandığı veya önemli ölçüde güncellendiği zamanı en iyi şekilde tahmin etmek için pek çok faktöre bakar.

  ## Google’a tarih bilgisi nasıl verilir?

  Google'a tarih bilgisi vermek için aşağıdaki adımları uygulayın:

  1. [Künye tarihi etkilemeye yönelik en iyi uygulamaları](https://developers.google.com/search/docs/appearance/publication-dates?hl=tr#guidelines) kullanın.

  2. Sayfaya kullanıcının görebileceği bir tarih ekleyip belirgin bir şekilde öne çıkarın. Tarihlerinizi "Yayınlama" veya "Son güncelleme" gibi bir metinle uygun şekilde etiketleyin. Aşağıda, bir web sayfasıyla ilgili tarih bilgilerini nasıl vurgulayabileceğinize dair bazı örnekler verilmiştir:

     - **Gönderim tarihi: 4 Şubat 2019**
     - **Yayınlanma tarihi: 4 Şubat 2019**
     - **Son güncellenme tarihi: 14 Şubat 2018**
     - **Güncellenme tarihi: 14 Şubat 2019 20:00 ET**

     Yayınlanma tarihi ve/veya son güncellenme tarihi ile ilgili bilgi verebilirsiniz.

     

     ```
     <html>
       <head>
         <title>Analyzing Google Search traffic drops</title>
       </head>
       <body>
         <p>
           Posted Tuesday, July 20, 2021
         </p>
         <p>
           Suppose you open Search Console and find out that your Google Search traffic dropped. What should you do?
         </p>
       </body>
     </html>
     ```

  3. Tarihleri

      

     yapılandırılmış verilerle

      

     belirtin. Bir

      

     `CreativeWork`

      

     alt türü (örneğin

      

     `Article`

     ,

      

     `BlogPosting`

     , veya

      

     `VideoObject`

     ), eklemenizi ve

      

     ```
     datePublished
     ```

      

     ve/veya

      

     ```
     dateModified
     ```

      

     alanlarını belirlemenizi öneririz. Tarayıcılarımızın makalenizin tarihlerini anlamasına yardımcı olmak için

      

     Google'ın yapılandırılmış veri yönergelerine uyduğunuzdan emin olun

     .

     

     ```
     <html>
       <head>
         <title>Analyzing Google Search traffic drops</title>
         <script type="application/ld+json">
         {
           "@context": "https://schema.org",
           "@type": "NewsArticle",
           "headline": "Analyzing Google Search traffic drops",
           "datePublished": "2021-07-20T08:00:00+08:00",
           "dateModified": "2021-07-20T09:20:00+08:00"
         }
         </script>
       </head>
       <body>
         <p>
           Posted Tuesday, July 20, 2021
         </p>
         <p>
           Suppose you open Search Console and find out that your Google Search traffic dropped. What should you do?
         </p>
       </body>
     </html>
     ```

  ## Künye tarihini etkilemeye yönelik en iyi uygulamalar 

  Google, ister görünür ister yapılandırılmış veri biçiminde olsun, bir künye tarihinin arama sonuçlarında gösterileceğini garanti etmez. Ancak burada belirtilen yönergelere uyulması, algoritmalarımızın bilgileri bulmasına ve işlemesine yardımcı olur.

  - **Tarih zorunlu olup saat zorunlu değildir:** Bununla birlikte, daha kesin veri için işaretlemede saat ve saat dilimini sağlamanızı öneririz.

  - **Saat dilimini belirtmeyi seçerseniz** [yaz saati uygulamasını](https://en.wikipedia.org/wiki/Daylight_saving_time) gerektiği şekilde dikkate alarak [doğru saat dilimini](https://en.wikipedia.org/wiki/ISO_8601#Time_zone_designators) girin.

  - **Tarihleriniz ve saatleriniz tutarlı olsun.** Tarihin (ve isteğe bağlı saat ile saat diliminin), kullanıcıların görebileceği biçime ve yapılandırılmış verilere ait denk değerler arasında tutarlı olduğundan emin olun. Saat ve saat dilimi bilgisi, yapılandırılmış verilerde sağlansa bile kullanıcıların görebileceği verilerde isteğe bağlıdır.

  - **İleriye dönük tarihler ya da sayfada anlatılan işlemin tarihini belirtmeyin.** Tarihler, sayfada yer alan haberlerin veya olayların değil, sayfanın kendisinin yayınlanma veya güncellenme tarihini belirtmelidir. İsterseniz sayfada listelenen etkinlikleri açıklamak için sayfaya [Etkinlik işaretlemesi](https://developers.google.com/search/docs/appearance/structured-data/event?hl=tr) ekleyebilirsiniz.

  - **Sayfadaki diğer tarihlerin varlığını en aza indirin:** En iyi uygulamalara dikkat etmenize rağmen yanlış tarihin seçildiğini fark ederseniz, sayfada görünen tarihlerden bazılarını veya diğer hepsini kaldırmayı düşünebilirsiniz.

  - **Sayfanızın Google Haberler arama sonuçlarında görünmesini planlıyorsanız** [buradaki ek yönergelere](https://support.google.com/news/publisher-center/answer/9607104?hl=tr) uyun.

  - # Arama sonuçlarında gösterilecek site simgesi tanımlayın

    

    Sitenizde [site simgesi](https://www.google.com/search?q=what+is+a+favicon&hl=tr) varsa bu simge, siteniz için yapılan Google Arama sonuçlarına dahil edilebilir.

    Bu doküman, organik arama sonuçlarına yöneliktir. Google Ads sonuçlarındaki logolar için [işletme logosu özellikleri](https://support.google.com/adspolicy/answer/12499303?hl=tr#business_logo) sayfasını ziyaret edin.

    <svg aria-labelledby="svgtitle-favicon" class="attempt-right" direction="ltr" viewBox="0 0 350 200" xlink="http://www.w3.org/1999/xlink" xmlns="http://www.w3.org/2000/svg" style="color: rgb(32, 33, 36); font-family: Roboto, &quot;Noto Sans&quot;, &quot;Noto Sans JP&quot;, &quot;Noto Sans KR&quot;, &quot;Noto Naskh Arabic&quot;, &quot;Noto Sans Thai&quot;, &quot;Noto Sans Hebrew&quot;, &quot;Noto Sans Bengali&quot;, sans-serif; font-size: 16px; font-style: normal; font-variant-ligatures: normal; font-variant-caps: normal; font-weight: 400; letter-spacing: normal; orphans: 2; text-align: start; text-indent: 0px; text-transform: none; widows: 2; word-spacing: 0px; -webkit-text-stroke-width: 0px; white-space: normal; background-color: rgb(255, 255, 255); text-decoration-thickness: initial; text-decoration-style: initial; text-decoration-color: initial;"><image width="100%" y="30%" href="https://developers.google.com/search/docs/images/text-result.png?hl=tr"></image><line stroke="#ffba00" stroke-width="4px" x1="30" x2="30" y1="85" y2="15"></line><foreignObject height="50" width="300" x="40" y="-5"><p xmlns="http://www.w3.org/1999/xhtml" style="box-sizing: inherit; margin: 0px; padding: 1rem 0px;">Site simgesi</p></foreignObject></svg>

    ## Uygulama

    Sitenizi, Google Arama sonuçlarında site simgesi göstermeye uygun hale nasıl getireceğiniz aşağıda açıklanmaktadır:

    1. [Yönergelere](https://developers.google.com/search/docs/appearance/favicon-in-search?hl=tr#guidelines) uyan bir site simgesi oluşturun.

    2. Aşağıdaki söz dizimiyle

        

       ana sayfanızın

        

       başlığına

        

       ```
       <link>
       ```

        

       etiketi ekleyin:

       

       ```
       <link rel="icon" href="/path/to/favicon.ico">
       ```

       Google, site simgesi bilgilerini almak için `link` öğesinin aşağıdaki özelliklerini kullanır:

       | Özellikler |                                                              |
       | :--------- | ------------------------------------------------------------ |
       | `rel`      | Google, site simgesi belirtmek için aşağıdaki `rel` özellik değerlerini destekler. Kullanım alanınıza uygun olan seçeneği kullanın:`icon`[HTML standardında](https://html.spec.whatwg.org/#rel-icon) tanımlandığı şekilde sitenizi temsil eden simge.Geçmişe dayalı nedenlerle, `icon` öğesinin eski bir alternatif sürümü olan `shortcut icon` desteklenir.`apple-touch-icon`[Apple'ın geliştirici dokümanlarına](https://developer.apple.com/library/archive/documentation/AppleApplications/Reference/SafariWebContent/ConfiguringWebApplications/ConfiguringWebApplications.html) göre sitenizi temsil eden iOS uyumlu bir simge.`apple-touch-icon-precomposed`[Apple'ın geliştirici dokümanlarına](https://developer.apple.com/library/archive/documentation/AppleApplications/Reference/SafariWebContent/ConfiguringWebApplications/ConfiguringWebApplications.html) göre iOS'in önceki sürümleri için alternatif bir simge. |
       | `href`     | Site simgesinin URL'si. Site simgesinin URL'si, göreli yol (`/smile.ico`) veya mutlak yol (`https://example.com/smile.ico`) olabilir. URL'nin sitenizde barındırılması gerekmez (örneğin, site simgeniz bir içerik yayınlama ağında (CDN) barındırılabilir). |

    3. Google'ın, ana sayfanızdaki yeni bilgileri yeniden tarayıp işlemesi için zaman tanıyın. Taramanın, sistemlerimizin içeriklerin ne sıklıkta yenilenmesi gerektiğini belirlediğine bağlı olarak birkaç gün ila birkaç hafta sürebileceğini unutmayın. URL Denetleme aracını kullanarak sitenizin ana sayfasının [dizine eklenmesini isteyebilirsiniz](https://developers.google.com/search/docs/crawling-indexing/ask-google-to-recrawl?hl=tr).

    ## Yönergeler

    Site simgenizin Google Arama sonuçlarında görünebilmesi için bu kurallara uymanız gerekir.

    Tüm yönergeler karşılanmış olsa bile site simgesinin Google Arama sonuçlarında görünmesi garanti edilmez.

    - Google Arama, site başına yalnızca bir site simgesini destekler. Buradaki *site*, ana makine adıyla tanımlanır. Örneğin, `https://www.example.com/` ve `https://code.example.com/` iki farklı ana makine adı olduğu için iki farklı site simgesi içerebilir. Bununla birlikte, `https://www.example.com/sub-site` bir sitenin alt dizinidir ve `https://www.example.com/` için site ile alt dizinlerinde geçerli olan yalnızca bir site simgesi belirleyebilirsiniz.
      **Desteklenir**: `https://example.com` (bu, alan adı düzeyinde bir ana sayfadır)
      **Desteklenir**: `https://news.example.com` (bu, alt alan adı düzeyinde bir ana sayfadır)
      **Desteklenmez**: `https://example.com/news` (bu, alt dizin düzeyinde bir ana sayfadır)
    - Googlebot Görüntü'nün, site simgesi dosyasını tarayabilmesi ve Googlebot'un ana sayfayı tarayabilmesi gerekir. Bunların tarama yapması [engellenemez](https://developers.google.com/search/docs/crawling-indexing/control-what-you-share?hl=tr).
    - Arama sonuçlarına göz atan kullanıcıların sitenizi hızlıca tanıyabilmesi için site simgenizin görsel olarak sitenizin markasını temsil ettiğinden emin olun.
    - Site simgeniz en az 8x8 piksel boyutunda kare (1:1 en boy oranı) olmalıdır. Minimum boyut şartı 8x8 piksel olsa da farklı platformlarda iyi görünmesi için 48x48 pikselden büyük bir site simgesi kullanmanızı öneririz. Tüm [geçerli site simgesi biçimleri](https://en.wikipedia.org/wiki/Favicon#Image_file_format_support) desteklenir.
    - Site simgesinin URL'si sabit olmalıdır (URL'yi sık sık değiştirmeyin).
    - Google, pornografi veya nefret sembolleri de (örneğin, gamalı haç) dahil olmak üzere uygunsuz gördüğü simgeleri göstermez. Site simgesi içinde bu tür görüntüler bulunursa Google bunu varsayılan bir simge ile değiştirir.

    # oogle Görseller SEO en iyi uygulamaları

    

    Google, kullanıcıların web'deki bilgileri görsel olarak keşfetmelerine yardımcı olan çeşitli Arama özellikleri ve ürünleri (ör. [metin sonucu görselleri](https://developers.google.com/search/docs/appearance/visual-elements-gallery?hl=tr#text-result-image), Google Keşfet ve Google Görseller) sunar. Her özellik ve ürün farklı görünse de bunlarda görsel gösterilmesini sağlamaya yönelik genel öneriler aynıdır.

    ![Google arama sonuçlarında, görseller sekmesinde ve Keşfet&#39;te görselleri gösteren bir resim](https://developers.google.com/static/search/docs/images/images-on-google.png?hl=tr)

    Aşağıdaki en iyi uygulamaları kullanarak görsellerinizi Google'ın arama sonuçlarında görünecek şekilde optimize edebilirsiniz:

    1. [Görsellerinizi keşfetmemize ve dizine eklememize yardımcı olma](https://developers.google.com/search/docs/appearance/google-images?hl=tr#discover-images)
    2. [Görsel açılış sayfalarını optimize etme](https://developers.google.com/search/docs/appearance/google-images?hl=tr#optimize-landing-page)

    ## Görsellerinizi keşfetmemize ve dizine eklememize yardımcı olma

    

    İçeriğinizin Google arama sonuçlarında görünmesine yönelik [teknik şartlar](https://developers.google.com/search/docs/essentials/technical?hl=tr), görseller için de geçerlidir. Görseller, HTML ile karşılaştırıldığında oldukça farklı bir biçim olduğundan görsellerin dizine eklenmesi için ek şartlar mevcuttur. Örneğin, sitenizdeki görselleri bulmak farklıdır ve görsellerin sunumu, görselin dizine eklenip eklenmediğini ve dizine eklerken doğru anahtar kelimelerin kullanılıp kullanılmadığını da etkiler.

    ### Resim yerleştirmek için HTML resim öğelerini kullanma

    Standart HTML resim öğeleri, tarayıcıların resimleri bulup işlemesine yardımcı olur. Google, göreselleri `<img>` öğesinin `src` özelliğinde bulabilir (bu öğe `<picture>` gibi başka öğelerin alt öğesi olsa bile). Google, CSS görsellerini dizine eklemez.

    **İyi:**

    > <img src="puppy.jpg" alt="Yavru golden retriever" />

    **Kötü:**

    > <div style="background-image:url(puppy.jpg)">Yavru golden retriever</div>

    ### Görsel site haritası kullanma

    Başka türlü keşfedemeyebileceğimiz görsel URL'lerini [bir görsel site haritası göndererek](https://developers.google.com/search/docs/crawling-indexing/sitemaps/image-sitemaps?hl=tr) sağlayabilirsiniz.

    Normal site haritalarının aksine, görsel site haritalarının `<image:loc>` öğelerine diğer alan adlarından URL'ler ekleyebilirsiniz. Bu, görselleri barındırmak için CDN'leri (içerik yayınlama ağları) kullanmanızı sağlar. CDN kullanıyorsanız Search Console'da CDN'nin alan adının [sahipliğini doğrulamanızı](https://support.google.com/webmasters/answer/9008080?hl=tr) öneririz. Böylece, bulabileceğimiz tarama hatalarını size bildirebiliriz.

    ### Duyarlı görseller

    Duyarlı web sayfaları tasarlamak, bu sayfalara kullanıcılar çok çeşitli cihazlardan erişebildiğinden daha iyi kullanıcı deneyimi sunar. Web sitenizde görsel kullanımıyla ilgili en iyi uygulamaları öğrenmek için [duyarlı görsel rehberimizi](https://web.dev/articles/responsive-images?hl=tr) inceleyin.

    Web sayfaları, uyumlu görselleri belirtmek için bir `<picture>` öğesini veya `img` öğesinin `srcset` özelliğini kullanır. Ancak bazı tarayıcılar bu özellikleri anlamaz. Dolayısıyla, `src` özelliğini kullanarak her zaman yedek bir URL belirtmenizi öneririz.

    `srcset` özelliği, özellikle farklı ekran boyutları için aynı görselin farklı sürümlerini belirtmeyi sağlar. Örneğin:

    ```
    <img
      srcset="maine-coon-nap-320w.jpg 320w, maine-coon-nap-480w.jpg 480w, maine-coon-nap-800w.jpg 800w"
      sizes="(max-width: 320px) 280px, (max-width: 480px) 440px, 800px"
      src="maine-coon-nap-800w.jpg"
      alt="A watercolor illustration of a maine coon napping leisurely in front of a fireplace">
    ```

    `<picture>` öğesi, aynı görselin farklı `<source>` sürümlerini gruplandırmak için kullanılan bir kapsayıcıdır. Yedek olarak kullanılabilecek bir yaklaşım sunar. Böylece tarayıcı, cihaz olanaklarına göre (ör. piksel yoğunluğu ve ekran boyutu) doğru görseli seçebilir. `picture` öğesi ayrıca ileride yeni biçimleri destekleme ihtimali olan istemcilerin, yerleşik olarak bulunan kontrollü azalma stratejisiyle oluşturulmuş yeni görselin biçimlerini kullanmaları açısından da pratiktir.

    [HTML Standardı'nın 4.8.1 bölümü](https://html.spec.whatwg.org/multipage/embedded-content.html#the-picture-element) uyarınca, `picture` öğesini aşağıdaki biçimde kullanırken `img` öğesini bir `src` özelliğiyle yedek olarak sağladığınızdan emin olun:

    ```
    <picture>
      <source type="image/svg+xml" srcset="pyramid.svg">
      <source type="image/webp" srcset="pyramid.webp">
      <img src="pyramid.png" alt="An 1800s oil painting of The Great Pyramid">
    </picture>
    ```

    ### Desteklenen resim biçimlerini kullanın

    Google Arama, `img` etiketinin `src` özelliğinde referans verilen resimler için şu dosya biçimlerinde destekler: BMP, GIF, JPEG, PNG, WebP, SVG ve AVIF. Dosya türüyle eşleşen bir dosya adı uzantınızın olması da iyi bir fikirdir.

    Ayrıca, görselleri Veri URI'leri olarak satır içine de alabilirsiniz. Veri URI'leri aşağıdaki biçimi kullanarak, görsel gibi bir dosyayı `img` öğesinin `src` özelliğini Base64 olarak kodlanmış dize şeklinde ayarlayarak satır içine almanın yolunu sağlar:

    ```
    <img src="data:image/svg+xml;base64,[data]">
    ```

    Görselleri satır içine almak HTTP isteklerini azaltabilir. Ancak bunların ne zaman kullanılacağını dikkatlice değerlendirin. Zira bu kullanım sayfa boyutunu önemli ölçüde büyütebilir. Bu konuyla ilgili daha fazla bilgi için [web.dev sayfamızda resimleri satır içine almanın avantajları ve dezavantajları bölümüne](https://web.dev/articles/responsive-images?hl=tr#inlining_pros_cons) bakabilirsiniz.

    ### Hız ve kalite için optimize etme

    

    Yüksek kaliteli fotoğraflar, kullanıcılara bulanık, belirsiz görsellere göre daha çekici görünür. Ayrıca, net görseller, sonuç küçük resminde kullanıcılara daha cazip görünür ve kullanıcılardan trafik alma olasılığınızı artırabilir. Bununla birlikte görseller genellikle toplam sayfa boyutuna en çok katkıda bulunan öğelerdir ve sayfaları yavaşlatıp yüklenmelerini zorlaştırabilir. Hem yüksek kaliteli hem de hızlı bir kullanıcı deneyimi sağlamak için [en yeni görsel optimizasyonu](https://web.dev/fast?hl=tr#optimize-your-images) ve [duyarlı görsel tekniklerini](https://web.dev/learn/design?hl=tr) uyguladığınızdan emin olun.

    Site hızınızı [PageSpeed Insights](https://pagespeed.web.dev/?hl=tr) ile analiz edin. Ayrıca web sitesi performansını iyileştirmenizi sağlayacak en iyi uygulamaları ve teknikleri öğrenmek için [Hız neden önemlidir](https://web.dev/learn/performance/why-speed-matters?hl=tr) sayfamızı ziyaret edin.

    ## Görsel açılış sayfalarını optimize etme

    Bir görselin yerleştirildiği sayfaların içerikleri ve meta verileri, hemen belli olmasa da görselin Google'ın arama sonuçlarında nasıl ve nerede görünebileceği üzerinde büyük etkiye sahip olabilir.

    ### Sayfa başlığınızı ve açıklamanızı kontrol etme

    Google Arama her sonucu ve sonucun kullanıcı sorgusuyla nasıl ilişkilendirileceğini en iyi şekilde açıklamak için otomatik olarak bir başlık bağlantısı ve snippet oluşturur. Bu, kullanıcıların bir sonucu tıklayıp tıklamayacağına karar vermesine yardımcı olur. Başlık bağlantıları ile snippet'in bir Google Arama sonuçları sayfasında nasıl görünebileceğine dair iki örnek aşağıda verilmiştir:

    ![Görsel arama sonuçlarında başlıkları ve açıklamaları gösteren bir resim](https://developers.google.com/static/search/docs/images/titles-descriptions-in-image-results.png?hl=tr)

    Bu bilgi için, her sayfanın `title` ve `meta` etiketindeki açıklayıcı bilgiler dahil olmak üzere çeşitli kaynakları kullanırız.

    Google'ın [başlık](https://developers.google.com/search/docs/appearance/title-link?hl=tr) ve [snippet](https://developers.google.com/search/docs/appearance/snippet?hl=tr) kurallarını uygulayarak sayfalarınız için görüntülenen başlık bağlantısı ve snippet'in kalitesini iyileştirmemize yardımcı olabilirsiniz.

    ### Yapılandırılmış veriler ekleme

    Yapılandırılmış veriler eklerseniz Google, görsellerinizi Google Görseller'de [belirgin bir rozet](https://developers.google.com/search/blog/2017/08/badges-on-image-search-help-users-find?hl=tr) ile birlikte belirli [zengin sonuçlarda](https://developers.google.com/search/docs/appearance/structured-data/search-gallery?hl=tr) gösterebilir. Böylece, kullanıcılarınıza sayfanıza dair alakalı bilgiler sağlamış olursunuz ve sitenize daha iyi hedeflenmiş trafik çekebilirsiniz.

    Yapılandırılmış veri türünüze özel kuralların yanı sıra [genel yapılandırılmış veri kurallarını](https://developers.google.com/search/docs/appearance/structured-data/sd-policies?hl=tr) uygulayın. Aksi takdirde, yapılandırılmış verileriniz Google Görseller'de zengin sonuç görüntüsü için uygun bulunmayabilir. Bu yapılandırılmış veri türlerinin her birinde image (görsel) özelliği, Google Görseller'deki rozet ve zengin sonuca uygun olmak için zorunlu bir alandır. Zengin sonuçların Google Görseller'de nasıl görünebileceğine dair iki örnek aşağıda verilmiştir:

    ![Zengin sonuçların Google Görseller&#39;de nasıl görünebileceğini gösteren bir resim](https://developers.google.com/static/search/docs/images/structured-data-in-image-results.png?hl=tr)

    ### Açıklayıcı dosya adı, başlık ve alternatif metin kullanma

    Google, görselin konusuyla ilgili bilgileri altyazılar ve görsel başlıkları dahil olmak üzere sayfanın içeriğinden çıkarır. Mümkün olduğunda, görsellerin alakalı metnin yakınına ve görselin konusuyla alakalı sayfalara yerleştirildiğinden emin olun.

    Benzer şekilde, dosya adı da Google'a görselin konusuyla ilgili çok ufak ipuçları verebilir. Mümkün olduğunda, kısa ancak açıklayıcı dosya adları kullanın. Örneğin, dosya adı olarak `IMG00023.JPG` yerine `my-new-black-kitten.jpg` kullanmanız daha iyidir. Mümkün olduğunda `image1.jpg`, `pic.gif`, `1.jpg` gibi genel dosya adları kullanmaktan kaçının. Sitenizde binlerce resim varsa resim adlandırmayı otomatikleştirme seçeneğini değerlendirebilirsiniz. Görsellerinizi yerelleştiriyorsanız Latin alfabesinde olmayan veya özel karakterler kullanmanız durumunda dosya adlarını çevirirken de [URL kodlama yönergelerine](https://developers.google.com/search/docs/crawling-indexing/url-structure?hl=tr) uyduğunuzdan emin olun.

    

    Bir görsel için daha fazla meta veri sağlama konusundaki en önemli özellik alternatif metindir (bir görseli açıklayan metin). Bu özellik, ekran okuyucu kullanan veya düşük bant genişliği olan bağlantılara sahip kullanıcılar da dahil olmak üzere web sayfalarındaki görselleri göremeyen kişiler için erişilebilirliği de artırır.

    Google, görselin konusunu anlamak için alternatif metinle birlikte bilgisayar görüşü algoritmalarını ve sayfanın içeriğini kullanır. Ayrıca, bir görseli bağlantı olarak kullanmaya karar verirseniz görsellerdeki alternatif metin bağlantı metni olarak da kullanılabilir.

    Alt metin yazarken, anahtar kelimeleri uygun şekilde kullanan ve sayfanın içeriği bağlamında yer alan, yararlı, bilgi bakımından zengin içerik oluşturmaya odaklanın. `alt` özelliklerini anahtar kelimelerle doldurmaktan ([anahtar kelime doldurma](https://developers.google.com/search/docs/essentials/spam-policies?hl=tr#keyword-stuffing) olarak da bilinir) kaçının. Bu, negatif bir kullanıcı deneyimine yol açabilir ve sitenizin spam olarak görünmesine neden olabilir.

    **Kötü (eksik alternatif metin)**:

    > <img src="puppy.jpg"/>

    **Kötü (anahtar kelime doldurma)**:

    > <img src="puppy.jpg" alt="köpek yavrusu köpek bebek köpek yavru yavrular sevimli köpekler talaş yavrucuklar köpek retriever labrador av köpeği setter pointer yavru jack russell terrier yavrular köpek maması ucuz mama yavru köpek maması"/>

    **Daha iyi**:

    > <img src="puppy.jpg" alt="köpek yavrusu"/>

    **En iyi**:

    > <img src="puppy.jpg" alt="Dalmaçyalı yavru köpek atılanları getirme oyunu oyuyor"/>

    Ayrıca, alternatif metninizin [W3 yönergeleri](https://www.w3.org/WAI/tutorials/images/) uyarınca erişilebilirliğini de göz önünde bulundurun. `<img>` için öğenin `alt` özelliğini ekleyebilirsiniz. Satır içi `<svg>` öğeleri için ise `<title>` öğesini kullanabilirsiniz. Örneğin:

    ```
    <svg aria-labelledby="svgtitle1">
      <title id="svgtitle1">Googlebot wearing an apron and chef hat, struggling to make pancakes on the stovetop</title>
    </svg>
    ```

    [Erişilebilirliği denetleyerek](https://developer.chrome.com/docs/devtools/accessibility/reference?hl=tr) ve [yavaş ağ bağlantısı emülatörü kullanarak](https://developer.chrome.com/docs/devtools/network/reference?hl=tr#throttling) içeriğinizi test etmenizi öneririz.

    Bir resme, daha büyük bir web sitesindeki birden fazla sayfada referans veriliyorsa [sitenin genel tarama bütçesini](https://developers.google.com/search/docs/crawling-indexing/large-site-managing-crawl-budget?hl=tr) göz önünde bulundurun. Özellikle, Google'ın resmi birden çok kez istemesine gerek kalmadan önbelleğe ekleyip yeniden kullanabilmesi için resme her zaman aynı URL ile başvurun.

    ## Google Görseller satır içi bağlantısını devre dışı bırakma

    İsterseniz Google Görseller arama sonuçlarında satır içi bağlantıyı devre dışı bırakarak tam boyutlu görüntünün Google Görseller arama sonuçları sayfasında görünmesini engelleyebilirsiniz. **Satır içi bağlantı oluşturmayı devre dışı bırakmak için:**

    1. Resminiz istendiğinde, istekteki [HTTP yönlendiren üst bilgisini](https://en.wikipedia.org/wiki/HTTP_referer) inceleyin.
    2. İstek bir Google alanından geliyorsa `200` HTTP durum kodu veya `204` HTTP durum koduyla ve içerik olmadan yanıt verin.

    Google sayfanızı taramaya devam eder ve resmi görür, ancak arama sonuçlarında tarama sırasında oluşturulan bir küçük resmi görüntüler. Web sitesinin resimlerinin yeniden işlenmesini gerektirmeyen bu devre dışı bırakma işlemini istediğiniz zaman gerçekleştirebilirsiniz. Bu davranış, resim [gizleme](https://developers.google.com/search/docs/essentials/spam-policies?hl=tr#cloaking) olarak kabul edilmez ve manuel işlemlerle sonuçlanmaz.

    Alternatif olarak da [görselin, arama sonuçlarında tamamen görünmesini engelleyebilirsiniz.](https://developers.google.com/search/docs/crawling-indexing/prevent-images-on-your-page?hl=tr)

    ## Güvenli Arama için optimize etme

    Google kullanıcı hesabındaki bir ayar olan Güvenli Arama, müstehcen görsellerin, videoların ve web sitelerinin Google Arama sonuçlarında gösterileceğini mi, bulanıklaştırılacağını mı yoksa engelleneceğini mi belirler. Gerektiğinde Güvenli Arama filtrelerinin sitenize uygulanabilmesi için Google'ın sitenizin yapısını anladığından emin olun. [Güvenli Arama için sayfaları etiketleme hakkında daha fazla bilgi edinin](https://developers.google.com/search/docs/crawling-indexing/safesearch?hl=tr).

  - # İşletme bilgilerinizi Google ile oluşturma

    ![Arama sonuçlarında Google bilgi paneli](https://developers.google.com/static/search/docs/images/enhance-site01-corporate.png?hl=tr)

    Resmi web sitenizi ilk olarak Google ile oluşturup sitenin görünümünü, kapsamını ve Arama sonuçlarındaki varlığını geliştirebilirsiniz. Bu, kullanıcıların resmi sitenizi tanımalarını kolaylaştırır ve arama yaptıklarında sağladığınız bilgilere daha kolay erişmelerini sağlar.

    Google, Arama sonuçlarında kullanıcılara gösterilebilmeleri için temel işletme bilgilerini sağlamanıza yardımcı olacak çeşitli yöntemler sunar. Bu kılavuzda, işletmelerinizin bulunduğu konumu, resmi sitesini ve içerik bilgilerini sonuçlarda, Google bilgi panelinde ve Google Haritalar'da nasıl kullanılabilir hale getireceğiniz açıklanmaktadır.

    ## Yerel işletmeniz için hak talebinde bulunma 

    [İşletme Profiliniz için hak talebinde bulunarak](https://business.google.com/?hl=tr) işletmenizin Google Haritalar ve Google Arama'da nasıl görüneceğini yönetin. Kendinizi bir girişin sahibi olarak doğruladıktan sonra adresinizi, iletişim bilgilerinizi, işletme türünüzü ve fotoğraflarınızı sağlayabilir veya düzenleyebilirsiniz. Bu, yerel işletme bilgilerinizin Google Haritalar ve Google bilgi panelinde görünmesini sağlar.

    ## Web sitenizi Search Console ile kaydetme

    Web sitenizi resmi bir varlık olarak kurmanın ilk adımı [Search Console'da web sitesi sahipliğinizi doğrulamaktır](https://support.google.com/webmasters/answer/9008080?hl=tr). Bu işlem, sitenin sahiplerini ve operatörlerini doğrular. Web sitenizi doğruladıktan sonra, Google'ın sitenizle ilgili bilgileri nasıl görüntülediğini anlamak ve izlemek için Search Console'u kullanabilirsiniz.

    ## Sitenizin Google bilgi panelini güncelleme

    Google algoritmaları; sitenizin adı, kurumsal iletişim bilgileri ve sosyal profiller gibi web'de herkese açık şekilde görüntülenebilecek bilgiler bulur. Arama sonuçlarında daha geniş erişim ve tanınma için sitenizle ilgili diğer bilgileri güncelleyebilir veya sağlayabilirsiniz. Resmi bir temsilci olarak doğrulandıysanız Google'ın otomatik olarak bulduğu bilgileri geçersiz kılmak için [Google bilgi panelinizi güncelleyebilirsiniz](https://support.google.com/knowledgepanel/answer/7534842?hl=tr).

    ## Yapılandırılmış veri ekleme

    Google Arama, bir sayfanın içeriğini anlamak için çok çalışır. Bir sayfaya yapılandırılmış veriler ekleyip Google'a sayfanın anlamıyla ilgili açık ipuçları sağlayarak bize yardımcı olabilirsiniz. Yapılandırılmış veriler, bir sayfa hakkında bilgi sağlamak ve sayfa içeriğini sınıflandırmak için kullanılan standart bir biçimdir. [Yapılandırılmış veriler](https://developers.google.com/search/docs/appearance/structured-data/intro-structured-data?hl=tr) hakkında daha fazla bilgi edinin.

    Tüm web sitelerinin yararlanabileceği yapılandırılmış veri özelliklerinden bazıları şunlardır:

    - **Site logosu**: Google'ın Arama sonuçlarında ve Google bilgi panelinizde kuruluşunuzun logosu için kullanmasını istediğiniz resmi belirtebilirsiniz. Bunu yapmak için resmi web sitenize, [tercih ettiğiniz logonun konumunu](https://developers.google.com/search/docs/appearance/structured-data/organization?hl=tr#logo) tanımlayan [`Organization`yapılandırılmış veri](https://developers.google.com/search/docs/appearance/structured-data/organization?hl=tr) ekleyin.
    - **İçerik haritaları**: Sayfalardaki içerik haritası yolları, sayfanın site hiyerarşisindeki konumunu belirtir. Kullanıcı, içerik haritası yolundaki son içerik haritasından başlayarak, her seferinde bir seviye ilerleyip site hiyerarşisinin en üstüne kadar gidebilir. Google'ın içerik haritalarınızı anlamasına yardımcı olmak için sitenize [İçerik haritası yapılandırılmış verileri](https://developers.google.com/search/docs/appearance/structured-data/breadcrumb?hl=tr) ekleyebilirsiniz.

    ## Müşteri desteği yöntemlerinizi vurgulama

    Müşteriler sıklıkla işletmelerle iletişime geçmenin yollarını ararken Google, müşterilere [çeşitli şekillerde](https://developers.google.com/search/docs/appearance/visual-elements-gallery?hl=tr) yardımcı olmak amacıyla mümkün olan en iyi bilgileri göstermek için çalışır. İşletmeniz veya sunduğunuz hizmet için Google Arama'da müşteri desteği yöntemlerinizi vurgulayabilirsiniz. Bununla ilgili [birkaç en iyi uygulamayı izleyerek](https://developers.google.com/search/blog/2021/07/customer-support?hl=tr) müşterilerinize en doğru bilgileri sunmamızı sağlayabilirsiniz.

    ## Sorun giderme

    Sitenizin bilgileri konusunda sorun yaşıyorsanız aşağıdaki sorun giderme ipuçlarını deneyin:

    - Google bilgi panelinizde önerilen değişiklikleri yapın.

      İşaretlenmiş sayfanızın Google tarafından son olarak taranmasının üzerinden en az bir hafta geçtiyse Google bilgi panelinin alt kısmındaki **Geri Bildirim** bağlantısını tıklayarak Google bilgi panelinde yanlış olduğunu düşündüğünüz bilgileri bildirin. Tanınmış bir otorite veya Google bilgi panelinde temsil edilen site veya varlıksanız belirli düzenlemeleri sağlamak için daha fazla seçenek görüntüleyebilirsiniz.

      [Google bilgi panelinizi nasıl güncelleyeceğiniz](https://support.google.com/posts/answer/7534842?hl=tr) hakkında daha fazla bilgi edinin.

    - **İşaretlemenizi test etmek için [Zengin Sonuçlar Testi](https://search.google.com/test/rich-results?hl=tr) 'ni kullanın**. Arama sonuçlarında site ayrıntılarınızı bulmak ve güncellemek için sistemimize bir hafta zaman verin.

    - # En Popüler Yerler Listesi

      

      İşletmeniz internette herhangi bir "en popüler yerler" listesinde yer alıyorsa Google, işletmenizin bulunduğu listeleri gösteren bir zengin sonuç görüntüleyebilir. Örneğin, restoranınız [uygun web sitelerindeki](https://developers.google.com/search/docs/appearance/top-places-list?hl=tr#requirements) "New York'taki en iyi 10 Çin restoranı" listesinde ve "Şehirdeki en iyi restoranlar" listesinde yer alıyorsa bu listeler işletmenizin arama sonuçlarında gösterilir. Bu özellik yalnızca fiziksel bir yeri olan işletmeler içindir.

      ![Restoran arama sonucu için en popüler yerler listesi](https://developers.google.com/static/search/docs/images/top-places-list.png?hl=tr)**Not**: Arama sonuçlarındaki gerçek görünüm farklı olabilir.

      ## Liste sunan sitelerle ilgili koşullar

      Sitenizdeki "en popüler yerler" listesinin En Popüler Yerler Listesi sonucunda görüntülenmeye uygun olması için şu ölçütleri karşılaması gerekir:

      - Liste, içerik sağlayıcı tarafından seçilmiş, orijinal, bağımsız olmalı ve sponsor destekli olmamalıdır.
      - Listede verilerden veya otomatik metriklerden oluşturulan şablonlu cümleler olmamalıdır.
      - Liste, kaba veya rahatsız edici olabilecek bir dil içermemelidir.

      ## Web sitenizdeki listelerin En Popüler Yerler Listesi özelliğinde görünmesini engelleme

      Sitenizdeki listelerin En Popüler Yerler Listesi'nde görünmesini engellemek için [yerel arama sonuçları ve diğer Google mülklerinde görüntülenmeyi devre dışı bırakın](https://support.google.com/webmasters/answer/3035947?hl=tr).