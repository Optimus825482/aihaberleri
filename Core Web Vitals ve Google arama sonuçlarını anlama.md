# Core Web Vitals ve Google arama sonuçlarını anlama

[Core Web Vitals](https://web.dev/articles/vitals?hl=tr#core-web-vitals), sayfanın yükleme performansı, etkileşimi ve görsel kararlılığı ile ilgili gerçek kullanıcı deneyimini ölçen bir grup metriktir. Site sahiplerinin Arama'da başarıya ulaşmak ve genel olarak mükemmel bir kullanıcı deneyimi sağlamak için Core Web Vitals durumunun hızlı olmasını önemle tavsiye ederiz. Bunun sağlanması, diğer sayfa deneyimi unsurlarıyla birlikte temel sıralama sistemlerimizin ödüllendirmek istediği hedeflerle uyumludur. [Google Arama sonuçlarındaki sayfa deneyimini anlama](https://developers.google.com/search/docs/appearance/page-experience?hl=tr) başlıklı makaleden daha fazla bilgi edinebilirsiniz.

## Core Web Vitals metrikleri 

- [Largest Contentful Paint (LCP)](https://web.dev/articles/lcp?hl=tr): Yükleme performansını ölçer. İyi bir kullanıcı deneyimi sağlamak için sayfanın yüklenmeye başladığında [LCP'nin ilk 2,5 saniye içinde gerçekleşmesini](https://web.dev/articles/lcp?hl=tr#what-is-a-good-lcp-score) sağlamaya çalışın.
- [Interaction to Next Paint (INP)](https://web.dev/articles/inp?hl=tr): Duyarlılığı ölçer. İyi bir kullanıcı deneyimi sağlamak için [INP'nin 200 milisaniyeden kısa](https://web.dev/articles/inp?hl=tr#good-score) olması gerekir.
- [Cumulative Layout Shift (CLS)](https://web.dev/articles/cls?hl=tr): Görsel kararlılığı ölçer. İyi bir kullanıcı deneyimi sağlamak için [CLS puanının 0,1'den az](https://web.dev/articles/cls?hl=tr#what-is-a-good-cls-score) olması gerekir.

## Core Web Vitals'ı optimize etme 

Core Web Vitals'ı ölçmenize, izlemenize ve optimize etmenize yardımcı olabilecek bazı kaynakları aşağıda bulabilirsiniz:

- [Search Console'daki Core Web Vitals raporunu](https://support.google.com/webmasters/answer/9205520?hl=tr) inceleyin. Bu raporda sayfalarınızın performansı gösterilir.
- Core Web Vitals ile ilgili ölçüm, hata ayıklama, iyileştirme ve en iyi uygulamaların yer aldığı bir kılavuz olan [Core Web Vitals](https://web.dev/articles/learn-core-web-vitals?hl=tr) hakkında daha fazla bilgi edinin.
- [Önemli Web Verilerini ölçmenize ve bildirmenize](https://web.dev/articles/vitals-tools?hl=tr) yardımcı olabilecek farklı araçlar hakkında bilgi edinin. Bu araçlar LCP, INP ve CLS'yi ölçer.

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

[Google Arama Merkezi blogunda](https://developers.google.com/search/blog?hl=tr) Core Web Vitals hakkında duyurduğumuz her şeyi burada bulabilirsiniz:

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

Daha fazlaexpand_more





Bu size yardımcı oldu mu?











