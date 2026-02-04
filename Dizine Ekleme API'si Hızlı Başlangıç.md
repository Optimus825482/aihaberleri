- [Ana Sayfa](https://developers.google.com/?hl=tr)

- 

  Search Central

- 

  Indexing API

Bu size yardımcı oldu mu?



Geri bildirim gönderin



# Dizine Ekleme API'si Hızlı Başlangıç

Dizine ekleme API'si, site sahiplerinin iş ilanı veya canlı yayın video sayfaları eklendiğinde ya da kaldırıldığında Google'ı doğrudan bilgilendirmelerini sağlar. Bu şekilde Google, sayfaları yeniden taramak için program yapar. Yeniden tarama sayesinde daha kaliteli kullanıcı trafiği sağlanır. Dizine Ekleme API'si yalnızca `VideoObject` içinde yerleşik [`JobPosting`](https://developers.google.com/search/docs/appearance/structured-data/job-posting?hl=tr) veya [`BroadcastEvent`](https://developers.google.com/search/docs/appearance/structured-data/video?hl=tr#broadcast-event) bulunan sayfaları tarayabilir. Dizine Ekleme API'si, iş ilanları veya canlı yayın videoları gibi kısa süre yayında kalan çok sayıda sayfa içeren web siteleri için, güncellemelerin ayrı ayrı aktarılmasına izin vererek arama sonuçlarındaki içeriğin yeniliğini korumasını sağlar.

Dizine Ekleme API'si ile yapabileceğiniz bazı işlemler şunlardır:

- **URL güncelleme**: Google'a taranacak yeni bir URL'nin olduğunu veya daha önce gönderilen bir URL'nin içeriğinin güncellendiğini bildirebilirsiniz.
- **URL kaldırma**: Sunucularınızdan bir sayfayı silerseniz bunu Google'a bildirin. Böylece sayfayı dizinimizden kaldırabilir ve söz konusu URL'yi tekrar taramaya çalışmayız.
- **Bir isteğin durumunu öğrenme**: Google'ın belirli bir URL için her bildirim türünü en son ne zaman aldığını kontrol edebilirsiniz.
- **Toplu dizine ekleme istekleri gönderme**: En fazla 100 çağrıyı tek bir HTTP isteği bünyesinde birleştirerek, istemcinizin kurması gereken HTTP bağlantılarının sayısını azaltabilirsiniz.

**Site haritaları ve dizine ekleme API'si**: İş ilanları veya canlı yayın videoları gibi kısa süre yayında olan çok sayıda sayfanın yer aldığı web sitelerinde, site haritaları yerine dizine ekleme API'sini kullanmanızı öneririz. Bunun nedeni dizine ekleme API'sinin, site haritasını güncellemeye kıyasla daha kısa süre içinde Googlebot'tan sayfalarınızı taramasını istemesidir. Bununla birlikte, sitenizin tamamının kapsanması için [bir site haritası göndermenizi](https://developers.google.com/search/docs/crawling-indexing/sitemaps/overview?hl=tr) öneririz.

## Başlarken

Dizine ekleme API'si aracılığıyla yapılan tüm gönderimler, sıkı spam yakalama süreçlerinden geçer. Kullanım kotalarını aşmak için birden fazla hesap veya başka yöntemler kullanmak da dahil olmak üzere dizine ekleme API'sini kötüye kullanma girişimleri, erişimin iptal edilmesine neden olabilir. [Spam politikalarımız](https://developers.google.com/search/docs/essentials/spam-policies?hl=tr) hakkında daha fazla bilgi edinin.

Dizine ekleme API'sini kullanmak için aşağıdaki adımları uygulayın:

1. Dizine Ekleme API'sini etkinleştirme, yeni hizmet hesabı oluşturma, Search Console'da sahipliği doğrulama ve API çağrınızın kimliğini doğrulamak için erişim jetonu almaya dair [ön koşulların hepsini yerine getirin](https://developers.google.com/search/apis/indexing-api/v3/prereqs?hl=tr).
2. [Onay ve kota isteğinde bulunun](https://developers.google.com/search/apis/indexing-api/v3/quota?hl=tr#request-quota). API hazırlığı ve gönderim testi için varsayılan olarak 200 kota sağlayan dizine ekleme API'si, kullanım ve kaynak sağlama için ek onay ister.
3. [Yönergelerimizi](https://developers.google.com/search/apis/indexing-api/v3/using-api?hl=tr#guidelines) uygulama
4. Google'a yeni, güncellenmiş veya silinmiş web sayfalarını bildirmek için [istekler gönderin](https://developers.google.com/search/apis/indexing-api/v3/using-api?hl=tr).

# Dizine Ekleme API'sini kullanmanın ön koşulları



Dizine Ekleme API'sini kullanmaya başlamadan önce, henüz yapmadıysanız yapmanız gereken birkaç şey vardır:

- [İstemciniz için proje oluşturma](https://developers.google.com/search/apis/indexing-api/v3/prereqs?hl=tr#create-project)
- [Hizmet hesabı oluşturma](https://developers.google.com/search/apis/indexing-api/v3/prereqs?hl=tr#create-service-account)
- [Hizmet hesabınızı site sahibi olarak ekleme](https://developers.google.com/search/apis/indexing-api/v3/prereqs?hl=tr#verify-site)
- [Erişim jetonu alma](https://developers.google.com/search/apis/indexing-api/v3/prereqs?hl=tr#oauth)

## İstemciniz için proje oluşturma

Dizine Ekleme API'sine istek gönderebilmeniz için öncelikle Google'a istemcinizden bahsetmeniz ve API'ye erişimi etkinleştirmeniz gerekir. Bunun için, Google API Konsolu'nu kullanarak proje (ayarlar ve API erişim bilgilerinin adlandırılmış bir koleksiyonu) oluşturur ve uygulamanızı kaydedersiniz.

Dizine ekleme API'sini kullanmaya başlamak için ilk olarak [kurulum aracını kullanmanız](https://console.cloud.google.com/start/api?id=indexing.googleapis.com&%3Bcredential=client_key&hl=tr) gerekir. Bu araç, Google API Konsolu'nda proje oluşturma ve API'yi etkinleştirme konusunda size yol gösterir.

## Hizmet hesabı oluşturma

1. [**Hizmet hesapları** sayfasını](https://console.cloud.google.com/iam-admin/serviceaccounts?hl=tr) açın. İstenirse bir proje seçin.
2. add **Hizmet Hesabı Oluştur**'u tıklayın, hizmet hesabı için bir ad ve açıklama girin. Varsayılan hizmet hesabı kimliğini kullanabilir veya farklı, benzersiz bir tane seçebilirsiniz. Tamamladıktan sonra **Oluştur**'u tıklayın.
3. Sonraki **Hizmet hesabı izinleri (isteğe bağlı)** bölümü gerekli değildir. **Devam**'ı tıklayın.
4. **Kullanıcıların bu hizmet hesabına erişmelerine izin ver** ekranında, **Anahtar oluştur** bölümüne gidin. add**Anahtar oluştur**'u tıklayın.
5. Görüntülenen yan panelde anahtar biçimini seçin: **JSON** önerilir.
6. **Oluştur**'u tıklayın. Herkese açık/özel yeni anahtar çiftiniz oluşturulur ve makinenize indirilir; bu anahtarın tek kopyası olarak işlev görür. Güvenli şekilde nasıl depolanacağını öğrenmek için [Hizmet hesabı anahtarlarını yönetme](https://cloud.google.com/iam/docs/understanding-service-accounts?hl=tr#managing_service_account_keys) konusuna bakın.
7. **Özel anahtar bilgisayarınıza kaydedildi** iletişiminde **Kapat**'ı tıklayın. Ardından hizmet hesapları tablosuna dönmek için **Tamam**'ı tıklayın.

## Hizmet hesabınızı site sahibi olarak ekleme

Hizmet hesabınızı site sahibi olarak eklemek için:

1. Öncelikle Search Console'u kullanarak sitenin sahibi olduğunuzu kanıtlayın, ardından
2. Hizmet hesabınızı site sahibi olarak ekleyin.

### 1. Sitenin sahibi olduğunuzu kanıtlayın 

Search Console'u kullanarak [sitenin sahibi olduğunuzu doğrulayın](https://support.google.com/webmasters/answer/9008080?hl=tr). Search Console'un desteklediği herhangi bir doğrulama yöntemini kullanabilirsiniz. Sitenizi temsil etmek için bir alan mülkü (`example.com`) veya URL öneki mülkü (`https://example.com` veya `https://example.com/some/path/`) oluşturabilirsiniz (sitelerin Search Console'da *mülkler* olarak adlandırıldığını unutmayın).

### 2. Hizmet hesabınıza sahip durumu verin 

Daha sonra hizmet hesabınızı ([yetki verilmiş](https://support.google.com/webmasters/answer/7687615?hl=tr#permissions-section)) site sahibi olarak ekleyin:

1. [Search Console](https://www.google.com/webmasters/verification/home?hl=tr)'u açın.

2. Sahipliğini doğruladığınız mülkü tıklayın.

3. **Doğrulanmış sahip** listesinde, **Sahip ekle**'yi tıklayın.

4. Yetki verilmiş sahip olarak hizmet hesabı e-postanızı sağlayın. Hizmet hesabı e-posta adresinizi bulabileceğiniz iki yer vardır:

   - [Projenizi oluştururken](https://developers.google.com/search/apis/indexing-api/v3/prereqs?hl=tr#create-project) indirdiğiniz JSON özel anahtarındaki `client_email` alanı.
   - Google Cloud Console'daki Hizmet Hesapları görünümünün **Hizmet hesabı kimliği** sütunu.

   E-posta adresinin biçimi şu şekildedir:

   ```
   my-service-account@project-name.google.com.iam.gserviceaccount.com
   ```

   Örneğin:

    

   hizmet-hesabim@test-projesi-42.google.com.iam.ghizmethesabi.com

## Erişim jetonu alma

Dizine Ekleme API'sine yapılan her çağrının kimliği, özel anahtarınız karşılığında aldığınız OAuth jetonuyla doğrulanmalıdır. Her jeton belirli bir süre için geçerlidir. Google, çeşitli dillerde OAuth jetonları alabileceğiniz [API istemci kitaplıkları](https://developers.google.com/api-client-library?hl=tr) sağlar.

### Şartlar

Dizine Ekleme API'sine istek gönderirken, isteğinizde:

1. Kapsam olarak `https://www.googleapis.com/auth/indexing` adresi kullanılmalıdır.
2. [API'yi kullanma](https://developers.google.com/search/apis/indexing-api/v3/using-api?hl=tr) bölümünde belirtilen uç noktalardan biri kullanılmalıdır.
3. [Hizmet hesabı erişim jetonunu](https://developers.google.com/search/apis/indexing-api/v3/prereqs?hl=tr#create-service-account) içermelidir.
4. İsteğin gövde bölümünü, [API'yi kullanma](https://developers.google.com/search/apis/indexing-api/v3/using-api?hl=tr) bölümünde anlatıldığı şekilde tanımlamalıdır.

### Örnekler

Aşağıdaki örneklerde, OAuth erişim jetonunun nasıl alınacağı gösterilmektedir:

[Python](https://developers.google.com/search/apis/indexing-api/v3/prereqs?hl=tr#python)[Java](https://developers.google.com/search/apis/indexing-api/v3/prereqs?hl=tr#java)[PHP](https://developers.google.com/search/apis/indexing-api/v3/prereqs?hl=tr#php)[Node.js](https://developers.google.com/search/apis/indexing-api/v3/prereqs?hl=tr#node.js)

[Python için Google API İstemci Kitaplığı](https://developers.google.com/api-client-library/python?hl=tr)'nı kullanarak OAuth jetonu alır:



```
from oauth2client.service_account import ServiceAccountCredentials
import httplib2

SCOPES = [ "https://www.googleapis.com/auth/indexing" ]
ENDPOINT = "https://indexing.googleapis.com/v3/urlNotifications:publish"

# service_account_file.json is the private key that you created for your service account.
JSON_KEY_FILE = "service_account_file.json"

credentials = ServiceAccountCredentials.from_json_keyfile_name(JSON_KEY_FILE, scopes=SCOPES)

http = credentials.authorize(httplib2.Http())

# Define contents here as a JSON string.
# This example shows a simple update request.
# Other types of requests are described in the next step.

content = """{
  \"url\": \"http://example.com/jobs/42\",
  \"type\": \"URL_UPDATED\"
}"""

response, content = http.request(ENDPOINT, method="POST", body=content)
```



### Kod Eğitmeni

expand_more

thumb_up_off_altthumb_down_off_alt

#### Prerequisites

Before we begin, let's walk through the setup to ensure we can run the code without any issues.

------

##### Step 1. Google Cloud Project Setup

1. Create a Google Cloud account [here](https://console.cloud.google.com/freetrial).
2. Enable billing for your project [here](https://console.cloud.google.com/billing).
3. Enable the Indexing API for your project [here](https://console.cloud.google.com/apis/library).
4. Create a Service Account Key:
   - Go to the [API credentials page](https://console.cloud.google.com/apis/credentials).
   - Click `+ CREATE CREDENTIALS` and select `Service Account`.
   - Follow the steps to create a new service account. Grant it the `Indexer` role.
   - After creating the service account, click on it, then navigate to `KEYS`, click `ADD KEY`, and select `Create new key`.
   - Choose `JSON` as the key type and click `CREATE`.
   - A JSON file will be downloaded to your computer. Rename this file to `service_account_file.json` and place it in the same directory as your Python script. This file contains your private key and is essential for authentication.

##### Step 2. Install Python Libraries

1. Ensure you have Python installed on your system.

2. Install the necessary Python client libraries using

    

   ```
   pip
   ```

   :

   ```
   pip install --upgrade google-api-python-client google-auth-httplib2 oauth2client
   ```

#### Code Walkthrough

Now, let's walk through the code. The following sections break down the implementation, explaining the purpose of each logical chunk.

------

##### Importing Required Libraries

```
from oauth2client.service_account import ServiceAccountCredentials
import httplib2
```



This section imports the necessary Python libraries. `ServiceAccountCredentials` from `oauth2client.service_account` is used for authenticating with Google Cloud services using a service account key. `httplib2` is an HTTP client library that will be used to make requests to the Indexing API.



##### Define API Scope and Endpoint

```
SCOPES = [ "https://www.googleapis.com/auth/indexing" ]
ENDPOINT = "https://indexing.googleapis.com/v3/urlNotifications:publish"
```



Here, `SCOPES` defines the authorization scope required for the Google Indexing API. The `https://www.googleapis.com/auth/indexing` scope grants permission to publish URL notifications. `ENDPOINT` specifies the base URL for the Indexing API's `publish` method, which is used to send URL update notifications.



##### Specify Service Account Key File

```
# service_account_file.json is the private key that you created for your service account.
JSON_KEY_FILE = "service_account_file.json"
```



This line defines the filename for your service account private key. As instructed in the prerequisites, you should have downloaded a JSON key file for your service account and renamed it to `service_account_file.json`, placing it in the same directory as your script. This file contains the credentials needed to authenticate your application.



##### Load Service Account Credentials

```
credentials = ServiceAccountCredentials.from_json_keyfile_name(JSON_KEY_FILE, scopes=SCOPES)
```



This line loads your service account credentials from the `JSON_KEY_FILE`. It uses the `ServiceAccountCredentials.from_json_keyfile_name()` method, passing the path to your JSON key file and the defined `SCOPES`. This object will then be used to authorize HTTP requests.



##### Authorize HTTP Client

```
http = credentials.authorize(httplib2.Http())
```



This step creates an `httplib2.Http()` object and then authorizes it using the `credentials` obtained in the previous step. The `credentials.authorize()` method injects the necessary authentication headers into the `http` client, allowing it to make authenticated requests to the Google Indexing API.



##### Prepare Request Body

```
# Define contents here as a JSON string.
# This example shows a simple update request.
# Other types of requests are described in the next step.

content = """{ 
  \"url\": \"http://example.com/jobs/42\",
  \"type\": \"URL_UPDATED\"
}"""
```



This block defines the `content` of the request as a JSON string. This example demonstrates a `URL_UPDATED` notification, indicating that the URL `http://example.com/jobs/42` has been updated. The Indexing API supports different notification types, such as `URL_UPDATED` for changes and `URL_DELETED` for removal requests.



##### Send Request to Indexing API

```
response, content = http.request(ENDPOINT, method="POST", body=content)
```



Finally, this line sends the HTTP POST request to the Google Indexing API. It uses the `http.request()` method with the following parameters:

- `ENDPOINT`: The API endpoint for publishing URL notifications.
- `method="POST"`: Specifies that this is a POST request.
- `body=content`: The JSON string containing the URL notification details.

The response from the API and the content of that response are stored in the `response` and `content` variables, respectively.



Bu örnekler, jetonun nasıl alınacağını göstermenin yanı sıra istek mesajının gövde bölümünü nereye ekleyebileceğinizi de göstermektedir. Yapabileceğiniz çağrı türleri ve bu çağrıların mesaj gövdelerinin yapısı hakkında bilgi edinmek için [API'yi kullanma](https://developers.google.com/search/apis/indexing-api/v3/using-api?hl=tr) bölümüne bakın.



# Dizine Ekleme API'sini kullanma



Dizine ekleme API'sini, Google'a Google dizinindeki iş ilanı veya canlı yayın etkinliği sayfalarını güncellemesini ya da kaldırmasını söylemek için kullanabilirsiniz. İsteklerde web sayfasının konumu belirtilmelidir. Ayrıca Google'a gönderdiğiniz bildirimlerin durumunu da alabilirsiniz. Dizine Ekleme API'si yalnızca `VideoObject` içinde yerleşik [`JobPosting`](https://developers.google.com/search/docs/appearance/structured-data/job-posting?hl=tr) veya [`BroadcastEvent`](https://developers.google.com/search/docs/appearance/structured-data/video?hl=tr#broadcast-event) bulunan sayfaları tarayabilir.

## Yönergeler

Dizine ekleme API'sini kullanırken aşağıdaki yönergeler geçerlidir.

- Dizine ekleme API'si ile gönderilen içerikler için [spam politikalarımız](https://developers.google.com/search/docs/essentials/spam-policies?hl=tr) geçerlidir.
- `https://indexing.googleapis.com/v3/urlNotifications:publish` URL'sine yapılan tüm çağrılarda `Content-Type` başlığı olarak `"application/json"` kullanılması ZORUNLUDUR.
- Güncelleme isteğinin gövde bölümünde yalnızca tek bir URL gönderebileceğiniz gibi, isterseniz [Toplu dizine ekleme istekleri gönderme](https://developers.google.com/search/apis/indexing-api/v3/using-api?hl=tr#batching) bölümünde açıklandığı üzere en fazla 100 isteği birleştirip toplu halde de gönderebilirsiniz. Gönderim sınırlarımızı, birden fazla hesap kullanma gibi yöntemlerle atlatmayın.
- Bu örneklerdeki isteğin gövde bölümü, [erişim jetonu örneklerinde](https://developers.google.com/search/apis/indexing-api/v3/get-token?hl=tr) kullanılan `content` değişkeninin değeridir.

## API ile yapabilecekleriniz

Dizine Ekleme API'sine bir istek gönderdiğinizde bağımsız bir web sayfasının konumunu belirtin. Böylece Google bu sayfayı tarayabileceğini veya dizininden kaldırabileceğini bilir.

Aşağıda, Dizine Ekleme API'si ile gerçekleştirebileceğiniz işlemlere örnekler bulabilirsiniz:

| Örnekler             |                                                              |
| :------------------- | ------------------------------------------------------------ |
| URL güncelleme       | `https://indexing.googleapis.com/v3/urlNotifications:publish` uç noktasına aşağıdaki HTTP `POST` isteğini gönderin. Örneğin:`{  "url": "https://careers.google.com/jobs/google/technical-writer",  "type": "URL_UPDATED" }` |
| URL kaldırma         | `https://indexing.googleapis.com/v3/urlNotifications:publish` uç noktasına aşağıdaki HTTP `POST` isteğini gönderin. Örneğin:`{  "url": "https://careers.google.com/jobs/google/technical-writer",  "type": "URL_DELETED" }` |
| Bildirim durumu alma | `https://indexing.googleapis.com/v3/urlNotifications/metadata` uç noktasına bir HTTP `GET` isteği gönderin. |

## Parameters

Aşağıdaki tabloda, tüm yöntemler (URL güncelleme ve kaldırma) için gerekli alanlar açıklanmaktadır:

| Alanlar |                                                              |
| :------ | ------------------------------------------------------------ |
| `url`   | **Zorunlu**Güncellemek veya kaldırmak istediğiniz öğenin tam konumu. |
| `type`  | **Zorunlu**Gönderdiğiniz bildirimin türü.                    |

## URL güncelleme

Google'a taranacak yeni bir URL'nin olduğunu veya daha önce gönderilen bir URL'nin içeriğinin güncellendiğini bildirmek için şu adımları uygulayın:

1. Aşağıdaki uç noktaya bir HTTP

    

   ```
   POST
   ```

    

   isteği gönderin:

   

   ```
   https://indexing.googleapis.com/v3/urlNotifications:publish
   ```

2. İsteğin gövde bölümünde, aşağıdaki söz dizimini kullanarak sayfanın konumunu belirtin:

   

   ```
   {
     "url": "CONTENT_LOCATION",
     "type": "URL_UPDATED"
   }
   ```

3. Google, başarılı Dizine Ekleme API'si çağrılarına `HTTP 200` ile yanıt verir. `HTTP 200` yanıtı, Google'ın bu URL'yi yakında yeniden taramaya çalışabileceği anlamına gelir. Yanıtın gövde bölümünde bir `UrlNotificationMetadata` nesnesi bulunur. Bu nesnenin alanları, [bildirim durumu isteği](https://developers.google.com/search/apis/indexing-api/v3/using-api?hl=tr#gettinginfo) tarafından döndürülen alanlara karşılık gelir.

4. Bir `HTTP 200` yanıtı almazsanız [Dizine Ekleme API'sine özgü hatalar](https://developers.google.com/search/apis/indexing-api/v3/core-errors?hl=tr#api-errors) bölümüne bakın.

5. Sayfanın içeriği değişirse Google'ın sayfayı yeniden taramasını sağlayacak başka bir güncelleme bildirimi gönderin.

6. Dizine ekleme API'si, test için varsayılan bir kota sağlar. API'yi kullanmak için [onay ve kota isteğinde bulunun](https://developers.google.com/search/apis/indexing-api/v3/quota?hl=tr#request-quota).

## URL kaldırma

Sunucularınızdan bir sayfayı sildikten veya belirli bir sayfanın `<head>` bölümüne `<meta name="robots" content="noindex" />` etiketini ekledikten sonra bunu Google'a bildirin. Böylece sayfayı dizinimizden kaldırabilir ve söz konusu sayfayı tekrar taramaya ve dizine eklemeye çalışmayız. Kaldırma isteğinde bulunmadan önce URL'nin `404` veya `410` durum kodu döndürmesi ya da sayfanın `<meta name="robots" content="noindex" />` `meta` etiketi içermesi gerekir.

Bir sayfanın dizinimizden kaldırılmasını istemek için aşağıdaki adımları uygulayın:

1. Aşağıdaki uç noktaya bir

    

   ```
   POST
   ```

    

   isteği gönderin:

   

   ```
   https://indexing.googleapis.com/v3/urlNotifications:publish
   ```

2. İsteğin gövde bölümünde, aşağıdaki söz dizimini kullanarak kaldırmak istediğiniz URL'yi belirtin:

   

   ```
   {
     "url": "CONTENT_LOCATION",
     "type": "URL_DELETED"
   }
   ```

   Örneğin:

   

   ```
   {
     "url": "https://careers.google.com/jobs/google/technical-writer",
     "type": "URL_DELETED"
   }
   ```

3. Google, başarılı Dizine Ekleme API'si çağrılarına `HTTP 200` ile yanıt verir. `HTTP 200` yanıtı, Google'ın bu URL'yi dizinden kaldırabileceği anlamına gelir. Yanıtın gövde bölümünde bir `UrlNotificationMetadata` nesnesi bulunur. Bu nesnenin alanları, [bildirim durumu isteği](https://developers.google.com/search/apis/indexing-api/v3/using-api?hl=tr#gettinginfo) tarafından döndürülen alanlara karşılık gelir.

4. Bir `HTTP 200` yanıtı almazsanız [Dizine Ekleme API'sine özgü hatalar](https://developers.google.com/search/apis/indexing-api/v3/core-errors?hl=tr#api-errors) bölümüne bakın.

5. Dizine ekleme API'si, test için varsayılan bir kota sağlar. API'yi kullanmak için [onay ve kota isteğinde bulunun](https://developers.google.com/search/apis/indexing-api/v3/quota?hl=tr#request-quota).

## Bildirim durumu alma

Dizine Ekleme API'sini kullanarak, Google'ın belirli bir URL için her bildirim türünü en son ne zaman aldığını kontrol edebilirsiniz. `GET` isteği, Google'ın bir URL'yi ne zaman dizine eklediğini veya kaldırdığını söylemez; yalnızca başarılı bir şekilde istek gönderip göndermediğinizi döndürür.

Bir bildirimin durumunu öğrenmek için aşağıdaki adımları uygulayın:

1. Aşağıdaki uç noktaya bir

    

   ```
   GET
   ```

    

   isteği gönderin: Belirttiğiniz URL'ler URL kodlamalı olmalıdır. Örneğin,

    

   ```
   :
   ```

    

   (iki nokta) işaretinin yerine

    

   ```
   %3A
   ```

    

   ve

    

   ```
   /
   ```

    

   (düz eğik çizgi) işaretinin yerine de

    

   ```
   %2F
   ```

    

   kullanın.

   

   ```
   https://indexing.googleapis.com/v3/urlNotifications/metadata?url=ENCODED_URL
   ```

   Örneğin:

   

   ```
   GET https://indexing.googleapis.com/v3/urlNotifications/metadata?url=https%3A%2F%2Fcareers.google.com%2Fjobs%2Fgoogle%2Ftechnical-writer
   ```

2. Dizine Ekleme API'si, bildirimle ilgili ayrıntıların yer aldığı bir yük içeren

    

   ```
   HTTP 200
   ```

    

   mesajıyla yanıt verir. Aşağıdaki örnekte, bir güncelleme ve silme bildirimi hakkında bilgi içeren bir yanıtın gövde bölümü gösterilmektedir:

   

   ```
   {
     url: "http://foo.com",
     latest_update: {
       type: "URL_UPDATED",
       notify_time: "2017-07-31T19:30:54.524457662Z"
     },
     latest_remove: {
       type: "URL_DELETED",
       notify_time: "2017-08-31T19:30:54.524457662Z"
     }
   }
   ```

3. Bir `HTTP 200` yanıtı almazsanız [Dizine Ekleme API'sine özgü hatalar](https://developers.google.com/search/apis/indexing-api/v3/core-errors?hl=tr#api-errors) bölümüne bakın.

4. Dizine ekleme API'si, test için varsayılan bir kota sağlar. API'yi kullanmak için [onay ve kota isteğinde bulunun](https://developers.google.com/search/apis/indexing-api/v3/quota?hl=tr#request-quota).

## Toplu dizine ekleme isteği gönderme

İstemcinizin kurması gereken HTTP bağlantılarının sayısını azaltmak için, Dizine Ekleme API'sine yapılan en fazla 100 çağrıyı tek bir HTTP isteği bünyesinde birleştirebilirsiniz. Bunu, çok bölümlü bir istek üzerinden toplu halde yaparsınız.

Kota, URL düzeyinde sayılır. Örneğin, 10 isteği tek bir HTTP isteğinde birleştirirseniz yine de kotanız için 10 istek sayılır. Nasıl daha fazla [kota isteğinde bulunabileceğiniz](https://developers.google.com/search/apis/indexing-api/v3/quota-pricing?hl=tr#request-quota) konusunda daha fazla bilgi edinin.

Dizine Ekleme API'sine toplu istek gönderirken aşağıdaki uç noktayı kullanın:

```
https://indexing.googleapis.com/batch
```

Toplu isteğin gövde bölümü birden fazla parçadan oluşur. Her bir parça kendi yüklemi, URL'si, başlıkları ve gövdesi ile kendi başına eksiksiz bir HTTP isteğidir. Toplu istekteki her parça en fazla 1 MB boyutunda olabilir.

Toplu istek göndermenizi kolaylaştırmak için, Google'ın API İstemci Kitaplıkları, toplu hale getirme işlevini destekler. İstemci kitaplıklarını kullanarak toplu hale getirme hakkında daha fazla bilgi için aşağıdaki dile özgü sayfalara bakın:

- [Java](https://developers.google.com/api-client-library/java/google-api-java-client/batch?hl=tr)
- [Python](https://developers.google.com/api-client-library/python/guide/batch?hl=tr)
- [JavaScript](https://developers.google.com/api-client-library/javascript/features/batch?hl=tr)
- [PHP](https://developers.google.com/api-client-library/php/guide/batch?hl=tr)
- [.NET](https://developers.google.com/api-client-library/dotnet/guide/batch?hl=tr)

Bu sayfalardaki toplu hale getirme örneklerini kullanıyorsanız, kodunuzu, [Erişim jetonu alma](https://developers.google.com/search/apis/indexing-api/v3/get-token?hl=tr) bölümünde açıklanan uygulama gereksinimlerini yansıtacak şekilde güncellemeniz gerekebilir.

Aşağıdaki örnek toplu istek mesajının gövde bölümünde bir güncelleme bildirimi ve bir kaldırma bildirimi yer almaktadır:

```
POST /batch HTTP/1.1
Host: indexing.googleapis.com
Content-Length: content_length
Content-Type: multipart/mixed; boundary="===============7330845974216740156=="
Authorization: Bearer oauth2_token

--===============7330845974216740156==
Content-Type: application/http
Content-Transfer-Encoding: binary
Content-ID: <b29c5de2-0db4-490b-b421-6a51b598bd22+2>

POST /v3/urlNotifications:publish [1]
Content-Type: application/json
accept: application/json
content-length: 58

{ "url": "http://example.com/jobs/42", "type": "URL_UPDATED" }
--===============7330845974216740156==
Content-Type: application/http
Content-Transfer-Encoding: binary
Content-ID: <b29c5de2-0db4-490b-b421-6a51b598bd22+1>

POST /v3/urlNotifications:publish [2]
Content-Type: application/json
accept: application/json
content-length: 75

{ "url": "http://example.com/widgets/1", "type": "URL_UPDATED" }
--===============7330845974216740156==
Content-Type: application/http
Content-Transfer-Encoding: binary
Content-ID: <b29c5de2-0db4-490b-b421-6a51b598bd22+3>

POST /v3/urlNotifications:publish [3]
Content-Type: application/json
accept: application/json
content-length: 58

{ "url": "http://example.com/jobs/43", "type": "URL_DELETED" }
--===============7330845974216740156==
```

Daha fazla bilgi için [Toplu İstek Gönderme](https://cloud.google.com/storage/docs/json_api/v1/how-tos/batch?hl=tr) bölümüne bakın.





# Dizine Ekleme API'si Hataları



Bu dokümanda, Google API'lerin döndürdüğü bazı hata kodları ve mesajlar tanımlanmaktadır. Daha net belirtmek gerekirse burada listelenen hatalar, Google API'leri için genel (ya da varsayılan) alandadır. Birçok API de kendi alanını tanımlar, bu da genel alanda olmayan, API'ye özgü hataları ifade eder. Bu hatalar için `domain` mülkünün JSON yanıtındaki değeri, `youtube.parameter` gibi API'ye özgü bir değer olacaktır.

Bu sayfa, hataları [RFC 7231](https://tools.ietf.org/html/rfc7231#section-6)'de tanımlandığı gibi HTTP durum kodlarıyla listeler.

Aşağıdaki örnek JSON yanıtı, genel hatanın nasıl iletildiğini göstermektedir:

```
{
 "error": {
  "errors": [
   {
    "domain": "global",
    "reason": "invalidParameter",
    "message": "Invalid string value: 'asdf'. Allowed values: [mostpopular]",
    "locationType": "parameter",
    "location": "chart"
   }
  ],
  "code": 400,
  "message": "Invalid string value: 'asdf'. Allowed values: [mostpopular]"
 }
}
```

## Hatalar

### MOVED_PERMANENTLY (301)

| Hata kodu          | Açıklama                                                     |
| :----------------- | :----------------------------------------------------------- |
| `movedPermanently` | Bu isteğin ve aynı işlemle ilgili gelecekteki isteklerin, bu isteğin gönderildiği URL'ye değil, bu yanıtın `Location` başlığında belirtilen URL'ye gönderilmesi gerekir. |

### SEE_OTHER (303)

| Hata kodu               | Açıklama                                                     |
| :---------------------- | :----------------------------------------------------------- |
| `seeOther`              | İsteğiniz başarıyla işlendi. Yanıtınızı almak için, `Location` başlığında belirtilen URL'ye bir `GET` isteği gönderin. |
| `mediaDownloadRedirect` | İsteğiniz başarıyla işlendi. Yanıtınızı almak için, `Location` başlığında belirtilen URL'ye bir `GET` isteği gönderin. |

### NOT_MODIFIED (304)

| Hata kodu     | Açıklama                                                     |
| :------------ | :----------------------------------------------------------- |
| `notModified` | If-None-Match başlığı için belirlenen koşul yerine getirilmedi. Bu yanıt, istenen dokümanda değişiklik yapılmadığını ve önbelleğe alınmış bir yanıtın alınması gerektiğini gösterir. `If-None-Match` HTTP isteği başlığının değerini kontrol edin. |

### TEMPORARY_REDIRECT (307)

| Hata kodu           | Açıklama                                                     |
| :------------------ | :----------------------------------------------------------- |
| `temporaryRedirect` | İsteğinizin işleme koyulması için isteğinizi bu yanıtın `Location` başlığında belirtilen URL'ye tekrar gönderin. |

### BAD_REQUEST (400)

| Hata kodu                     | Açıklama                                                     |
| :---------------------------- | :----------------------------------------------------------- |
| `badRequest`                  | API isteği geçersiz veya yanlış biçimlendirilmiş. Bu nedenle API sunucusu isteği anlayamadı. |
| `badBinaryDomainRequest`      | İkili alan adı isteği geçersiz.                              |
| `badContent`                  | İstek verilerinin içerik türü veya çok parçalı bir isteğin bir bölümünün içerik türü desteklenmiyor. |
| `badLockedDomainRequest`      | Kilitli alan adı isteği geçersiz.                            |
| `corsRequestWithXOrigin`      | CORS isteği, kötü bir CORS isteğinin göstergesi olan XD3 X-Origin başlığı içeriyor. |
| `endpointConstraintMismatch`  | İstek, belirtilen API ile eşleşmediğinden başarısız oldu. URL yolunun değerini kontrol edin ve doğru olduğundan emin olun. |
| `invalid`                     | İstek geçersiz bir değer içerdiğinden başarısız oldu. Söz konusu değer bir parametre değeri, başlık değeri veya mülk değeri olabilir. |
| `invalidAltValue`             | `alt` parametre değeri, bilinmeyen bir çıktı biçimi belirtiyor. |
| `invalidHeader`               | İstek geçersiz bir başlık içerdiğinden başarısız oldu.       |
| `invalidParameter`            | İstek, geçersiz bir parametre veya parametre değeri içerdiğinden başarısız oldu. İsteğiniz için hangi parametrelerin geçerli olduğunu belirlemek üzere API dokümanlarını inceleyin. |
| `invalidQuery`                | İstek geçersiz. İstek için hangi parametrelerin desteklendiğini belirlemek ve isteğin geçersiz parametre kombinasyonu ya da geçersiz parametre değeri içerip içermediğini görmek üzere API dokümanlarına bakın. `q` istek parametresinin değerini kontrol edin. |
| `keyExpired`                  | İstekte sağlanan API anahtarının süresi dolduğu için API sunucusu, istekte bulunan uygulamanın kota sınırını kontrol edemiyor. Daha fazla bilgi edinmek veya yeni anahtar almak için [Google Developers Console](https://console.developers.google.com/?hl=tr)'a bakın. |
| `keyInvalid`                  | İstekte sağlanan API anahtarı geçersiz olduğu için API sunucusu, istekte bulunan uygulamanın kota sınırını kontrol edemiyor. API anahtarınızı bulmak veya yeni anahtar almak için [Google Developers Console](https://console.developers.google.com/?hl=tr)'u kullanın. |
| `lockedDomainCreationFailure` | OAuth jetonu, sorgu dizesinde alınmış. Bu API, JSON veya XML dışındaki yanıt biçimlerinde bu duruma izin vermez. OAuth jetonunu mümkünse Yetkilendirme başlığında göndermeyi deneyin. |
| `notDownload`                 | Yalnızca medya indirme istekleri `/download/*` URL yollarına gönderilebilir. İsteği `/download` ön eki olmadan aynı yola tekrar gönderin. |
| `notUpload`                   | İstek bir yükleme isteği olmadığından ve yalnızca yükleme istekleri `/upload/*` URI'lerine gönderilebildiğinden başarısız oldu. İsteği `/upload` öneki olmadan aynı yola tekrar göndermeyi deneyin. |
| `parseError`                  | API sunucusu, isteğin gövde metnini ayrıştıramaz.            |
| `required`                    | API isteğinde gerekli bilgiler eksik. Gerekli bilgi bir parametre veya kaynak mülkü olabilir. |
| `tooManyParts`                | Çok parçalı istek, çok fazla parça içerdiği için başarısız oldu. |
| `unknownApi`                  | İsteğin çağrıda bulunduğu API tanınmıyor.                    |
| `unsupportedMediaProtocol`    | İstemci desteklenmeyen bir medya protokolü kullanıyor.       |
| `unsupportedOutputFormat`     | `alt` parametre değeri, bu hizmette desteklenmeyen bir çıktı biçimini belirtiyor. `alt` istek parametresinin değerini kontrol edin. |
| `wrongUrlForUpload`           | İstek bir yükleme isteği, ancak doğru URI'ye gönderilmediğinden başarısız oldu. Yükleme istekleri, `/upload/*` ön ekini içeren URI'lere gönderilmelidir. İsteği `/upload` ön eki ile aynı yola tekrar göndermeyi deneyin. |

### UNAUTHORIZED (401)

| Hata kodu             | Açıklama                                                     |
| :-------------------- | :----------------------------------------------------------- |
| `unauthorized`        | Kullanıcı istekte bulunmaya yetkili değil.                   |
| `authError`           | İstek için sağlanan yetkilendirme kimlik bilgileri geçersiz. `Authorization` HTTP isteği başlığının değerini kontrol edin. |
| `expired`             | Oturumun süresi doldu. `Authorization` HTTP isteği başlığının değerini kontrol edin. |
| `lockedDomainExpired` | İstek, eskiden geçerli olan kilitli bir alan adının süresi dolduğu için başarısız oldu. |
| `required`            | Kullanıcının bu API isteğinde bulunabilmesi için giriş yapmış olması gerekir. `Authorization`Authorization HTTP isteği başlığının değerini kontrol edin. |

### PAYMENT_REQUIRED (402)

| Hata kodu               | Açıklama                                                     |
| :---------------------- | :----------------------------------------------------------- |
| `dailyLimitExceeded402` | Geliştiricinin belirlediği günlük bütçe sınırına ulaşıldı.   |
| `quotaExceeded402`      | İstenen işlem, kotanın izin verdiğinden daha fazla kaynak gerektiriyor. İşlemi tamamlamak için ödeme yapmanız gerekiyor. |
| `user402`               | İstenen işlem, kimliği doğrulanmış kullanıcının bir şekilde ödeme yapmasını gerektiriyor. |

### FORBIDDEN (403)

| Hata kodu                          | Açıklama                                                     |
| :--------------------------------- | :----------------------------------------------------------- |
| `forbidden`                        | İstenen işlem yasaktır ve tamamlanamaz.                      |
| `accessNotConfigured`              | Projeniz bu API’ye erişecek şekilde yapılandırılmamış. Lütfen [Google Developers Console](https://console.developers.google.com/?hl=tr)'u kullanarak projeniz için API'yi etkinleştirin. |
| `accessNotConfigured`              | Proje kötüye kullanım nedeniyle engellendi. [http://support.google.com/code/go/developer_compliance](http://support.google.com/code/go/developer_compliance?hl=tr) adresine bakın. |
| `accessNotConfigured`              | Proje silinmek üzere işaretlendi.                            |
| `accountDeleted`                   | İsteğin yetkilendirme kimlik bilgileriyle ilişkili kullanıcı hesabı silindi. `Authorization` HTTP isteği başlığının değerini kontrol edin. |
| `accountDisabled`                  | İsteğin yetkilendirme kimlik bilgileriyle ilişkili kullanıcı hesabı devre dışı bırakıldı. `Authorization` HTTP isteği başlığının değerini kontrol edin. |
| `accountUnverified`                | İstekte bulunan kullanıcının e-posta adresi doğrulanmadı. `Authorization` HTTP isteği başlığının değerini kontrol edin. |
| `concurrentLimitExceeded`          | Eşzamanlı kullanım sınırına ulaşıldığından istek başarısız oldu. |
| `dailyLimitExceeded`               | API için günlük kota sınırına ulaşıldı.                      |
| `dailyLimitExceeded`               | Günlük kota sınırına ulaşıldı ve proje kötüye kullanım nedeniyle engellendi. Sorunun çözülmesine yardımcı olmak için [Google API'leri uygunluk destek formuna](http://support.google.com/code/go/developer_compliance?hl=tr) bakın. |
| `dailyLimitExceededUnreg`          | Kimliği doğrulanmamış API kullanımı için günlük sınıra ulaşıldığından istek başarısız oldu. API'nin sürekli kullanılabilmesi için [Google Developers Console](https://console.developers.google.com/?hl=tr) üzerinden kaydolunması gerekir. |
| `downloadServiceForbidden`         | API bir indirme hizmetini desteklemiyor.                     |
| `insufficientAudience`             | İstek bu kitle için tamamlanamıyor.                          |
| `insufficientAuthorizedParty`      | İstek bu uygulama için tamamlanamıyor.                       |
| `insufficientPermissions`          | Kimliği doğrulanmış kullanıcının bu isteği yerine getirmek için yeterli izni yok. |
| `limitExceeded`                    | Erişim veya sıklık kısıtlamaları nedeniyle istek tamamlanamıyor. |
| `lockedDomainForbidden`            | Bu API, kilitli alan adlarını desteklemiyor.                 |
| `quotaExceeded`                    | İstenen işlem, kotanın izin verdiğinden daha fazla kaynak gerektiriyor. |
| `rateLimitExceeded`                | Belirli bir zaman diliminde çok fazla istek gönderildi.      |
| `rateLimitExceededUnreg`           | Bir ücret sınırı aşıldı ve API'ye çağrıda bulunmaya devam edebilmek için uygulamanızı kaydetmeniz gerekiyor. Lütfen [Google Developers Console](https://console.developers.google.com/?hl=tr)'u kullanarak kaydolun. |
| `responseTooLarge`                 | İstenen kaynak döndürülemeyecek kadar büyük.                 |
| `servingLimitExceeded`             | API için belirtilen genel sıklık sınırına zaten ulaşıldı.    |
| `sslRequired`                      | Bu işlemi gerçekleştirmek için SSL gereklidir.               |
| `unknownAuth`                      | API sunucusu, istek için kullanılan yetkilendirme düzenini tanımıyor. `Authorization`HTTP isteği başlığının değerini kontrol edin. |
| `userRateLimitExceeded`            | Kullanıcı başına sıklık sınırına ulaşıldığından istek başarısız oldu. |
| `userRateLimitExceededUnreg`       | Kullanıcı başına sıklık sınırına ulaşıldığı ve istemci geliştiricisi istekte tanımlanmadığı için istek başarısız oldu. Lütfen Google Developer Console'u (https://console.developers.google.com) kullanarak uygulamanız için bir proje oluşturun. |
| `variableTermExpiredDailyExceeded` | Değişken terim kotasının süresi dolduğundan ve günlük sınıra ulaşıldığından istek başarısız oldu. |
| `variableTermLimitExceeded`        | Değişken terim kota sınırına ulaşıldığından istek başarısız oldu. |

### NOT_FOUND (404)

| Hata kodu             | Açıklama                                                     |
| :-------------------- | :----------------------------------------------------------- |
| `notFound`            | İstekle ilgili bir kaynak bulunamadığından, istenen işlem başarısız oldu. |
| `notFound`            | İstekle ilgili bir kaynak bulunamadı. Bu API'yi son iki hafta içinde kullanmadıysanız lütfen App Engine uygulamasını yeniden dağıtın ve ona tekrar çağrıda bulunmayı deneyin. |
| `unsupportedProtocol` | İstekte kullanılan protokol desteklenmiyor.                  |

### METHOD_NOT_ALLOWED (405)

| Hata kodu              | Açıklama                                      |
| :--------------------- | :-------------------------------------------- |
| `httpMethodNotAllowed` | İstekle ilişkili HTTP yöntemi desteklenmiyor. |

### CONFLICT (409)

| Hata kodu   | Açıklama                                                     |
| :---------- | :----------------------------------------------------------- |
| `conflict`  | İstenen işlem mevcut öğelerden biriyle çakışacağı için API isteği tamamlanamıyor. Örneğin, kopya öğeler genellikle daha belirli hatalarla tanımlansa da kopya öğe oluşturmaya çalışan bir istek, çakışmaya neden olur. |
| `duplicate` | İstenen işlem zaten mevcut olan bir kaynağı oluşturmaya çalıştığı için başarısız oldu. |

### GONE (410)

| Hata kodu | Açıklama                                                  |
| :-------- | :-------------------------------------------------------- |
| `deleted` | İstekle ilgili kaynak silindiğinden istek başarısız oldu. |

### PRECONDITION_FAILED (412)

| Hata kodu         | Açıklama                                                     |
| :---------------- | :----------------------------------------------------------- |
| `conditionNotMet` | İsteğin `If-Match` veya `If-None-Match` HTTP isteği başlığında belirlenen koşul yerine getirilmedi. Ayrıntılar için HTTP spesifikasyonunun [ETag](https://tools.ietf.org/html/rfc7232#section-2.3) bölümüne bakın. `If-Match` HTTP isteği başlığının değerini kontrol edin. |

### REQUEST_ENTITY_TOO_LARGE (413)

| Hata kodu                | Açıklama                                                     |
| :----------------------- | :----------------------------------------------------------- |
| `backendRequestTooLarge` | İstek çok büyük.                                             |
| `batchSizeTooLarge`      | Toplu istek çok fazla öğe içeriyor.                          |
| `uploadTooLarge`         | İstekte gönderilen veriler çok büyük olduğundan istek başarısız oldu. |

### REQUESTED_RANGE_NOT_SATISFIABLE (416)

| Hata kodu                      | Açıklama                                         |
| :----------------------------- | :----------------------------------------------- |
| `requestedRangeNotSatisfiable` | İstek, yerine getirilemeyen bir aralık belirtti. |

### EXPECTATION_FAILED (417)

| Hata kodu           | Açıklama                                                     |
| :------------------ | :----------------------------------------------------------- |
| `expectationFailed` | İstemcinin beklentilerinden biri, sunucu tarafından karşılanamıyor. |

### PRECONDITION_REQUIRED (428)

| Hata kodu              | Açıklama                                                     |
| :--------------------- | :----------------------------------------------------------- |
| `preconditionRequired` | İstek, sağlanmayan bir ön koşul gerektiriyor. Bu isteğin başarılı olabilmesi için istekle birlikte bir `If-Match` veya `If-None-Match` başlığı sağlamanız gerekir. |

### TOO_MANY_REQUESTS (429)

| Hata kodu           | Açıklama                                                |
| :------------------ | :------------------------------------------------------ |
| `rateLimitExceeded` | Belirli bir zaman diliminde çok fazla istek gönderildi. |

### INTERNAL_SERVER_ERROR (500)

| Hata kodu       | Açıklama                                        |
| :-------------- | :---------------------------------------------- |
| `internalError` | Dahili bir hata nedeniyle istek başarısız oldu. |

### NOT_IMPLEMENTED (501)

| Hata kodu           | Açıklama                                                     |
| :------------------ | :----------------------------------------------------------- |
| `notImplemented`    | İstenen işlem gerçekleştirilmedi.                            |
| `unsupportedMethod` | İstek, bilinmeyen bir yöntem veya işlem uygulamaya çalıştığı için başarısız oldu. |

### SERVICE_UNAVAILABLE (503)

| Hata kodu             | Açıklama                                        |
| :-------------------- | :---------------------------------------------- |
| `backendError`        | Bir arka uç hatası oluştu.                      |
| `backendNotConnected` | Bağlantı hatası nedeniyle istek başarısız oldu. |
| `notReady`            | API sunucusu istek kabul etmeye hazır değil.    |

## Dizine Ekleme API'sine özgü hatalar

Aşağıdaki durumların hepsinde istek reddedilmiştir ve Google, URL'yi taramaz. Bu durum, [temel hata mesajları](https://developers.google.com/search/apis/indexing-api/v3/core-errors?hl=tr#Global_Errors) için de geçerlidir.

### BAD_REQUEST (400)

| Hata mesajı                                                  | Açıklama                                                     |
| :----------------------------------------------------------- | :----------------------------------------------------------- |
| `Missing attribute. 'url' attribute is required.`            | Kullanıcı, isteğinde URL'yi belirlemedi.                     |
| `Invalid attribute. 'url' is not in standard URL format`     | Kullanıcı, URL'ye benzemeyen bir URL (örneğin, "abcd") belirledi |
| `Unknown type. 'type' attribute is required and must be 'URL_REMOVED' or 'URL_UPDATED'.` | Kullanıcı, bildirim türünü belirlemedi.                      |
| `Invalid value at 'url_notification.type' (TYPE_ENUM)`       | Kullanıcı, bildirim türü olarak `URL_REMOVED` veya `URL_UPDATED` dışında bir şey belirledi. |

### FORBIDDEN (403)

| Hata mesajı                                              | Açıklama                                                     |
| :------------------------------------------------------- | :----------------------------------------------------------- |
| `Permission denied. Failed to verify the URL ownership.` | Kullanıcı, Sahiplik Doğrulama işlemini tamamlamadı veya kendisine ait olmayan bir URL'yi güncellemeye çalışıyor. |

### TOO_MANY_REQUESTS (429)

| Hata mesajı                                                  | Açıklama                                                     |
| :----------------------------------------------------------- | :----------------------------------------------------------- |
| `Insufficient tokens for quota 'indexing.googleapis.com/default_requests'` | Kullanıcı kendisine ayrılan Dizine Ekleme API'si kotasını aşıyor. |





# İstemci Kitaplıklarını Yükleme



Dizine Ekleme API'si HTTP ve JSON üzerine kurulu olduğundan herhangi bir standart HTTP istemcisi ona istek gönderebilir, yanıtları ayrıştırabilir.

Ancak Google API istemci kitaplıkları daha iyi dil entegrasyonu ve daha yüksek güvenlik sağlamanın yanı sıra kullanıcı yetkilendirme gerektiren çağrıların yapılmasını da destekler. İstemci kitaplıkları çeşitli programlama dillerinde kullanılabilir; bunları kullanarak HTTP isteklerini manuel olarak oluşturma ve yanıtları ayrıştırma zahmetinden kurtulabilirsiniz.

İstemci kitaplıklarını kullanmaya başlamak için, geliştirmede kullandığınız programlama dilini seçin.

[Git](https://developers.google.com/search/apis/indexing-api/v3/libraries?hl=tr#git)[Java](https://developers.google.com/search/apis/indexing-api/v3/libraries?hl=tr#java)[JavaScript](https://developers.google.com/search/apis/indexing-api/v3/libraries?hl=tr#javascript)[.NET](https://developers.google.com/search/apis/indexing-api/v3/libraries?hl=tr#.net)[Node.js](https://developers.google.com/search/apis/indexing-api/v3/libraries?hl=tr#node.js)[Obj-C](https://developers.google.com/search/apis/indexing-api/v3/libraries?hl=tr#obj-c)[PHP](https://developers.google.com/search/apis/indexing-api/v3/libraries?hl=tr#php)[Python](https://developers.google.com/search/apis/indexing-api/v3/libraries?hl=tr#python)[Ruby](https://developers.google.com/search/apis/indexing-api/v3/libraries?hl=tr#ruby)





Bu sayfada, Java için Google API İstemci Kitaplığı'nı kullanarak dizine ekleme API'sini kullanmaya başlama hakkında bilgiler yer alır. Daha fazla bilgi için aşağıdaki dokümanlara bakın:

- [Dizine ekleme API'si ile ilgili Javadoc referansına](https://googleapis.dev/java/google-api-services-indexing/latest/) göz atın.
- [Java için Google API İstemci Kitaplığı ile ilgili Geliştirici Kılavuzu](https://github.com/googleapis/google-api-java-client/)'nu okuyun.
- [Dizine ekleme API'si için API Gezgini](https://developers.google.com/apis-explorer/?hl=tr#p/indexing/v3/)'ni kullanarak tarayıcınızda bu API ile etkileşimde bulunun.

## İstemci kitaplığını projenize ekleme

Aşağıdaki sekmelerden derleme ortamınızı (Maven veya Gradle) seçin:



[Maven](https://developers.google.com/search/apis/indexing-api/v3/libraries?hl=tr#maven)[Gradle](https://developers.google.com/search/apis/indexing-api/v3/libraries?hl=tr#gradle)

`pom.xml` dosyanıza aşağıdakileri ekleyin:



[Maven Merkezi Veri Havuzu'nda bulunan tüm sürümleri](http://search.maven.org/#search|gav|1|g%3A"com.google.apis" AND a%3A"google-api-services-indexing") görün.

## Dizine ekleme API'sine erişmenin diğer yolları

Aşağıdaki tabloda dizine ekleme API'sine erişmenin diğer yolları listelenmektedir:

| Erişim yöntemi                                               | Açıklama                                                     |
| :----------------------------------------------------------- | :----------------------------------------------------------- |
| [API Gezgini](https://developers.google.com/apis-explorer/?hl=tr#p/indexing/v3/) | Google API'lerini doğrudan tarayıcınızdan denemenizi sağlayan etkileşimli bir araç. |





# İstekleri Yetkilendirme



Uygulamanız gizli veri isteğinde bulunduğunda isteğin, söz konusu verilere erişimi olan kimliği doğrulanmış bir kullanıcı tarafından yetkilendirilmesi gerekir.

Uygulamanız tarafından Dizine Ekleme API'sine gönderilen her isteğin bir yetkilendirme jetonu içermesi gerekir. Bu jeton ayrıca uygulamanızı Google'a tanıtır.

## Yetkilendirme protokolleri hakkında

Uygulamanız, istekleri yetkilendirmek için [OAuth 2.0](https://developers.google.com/identity/protocols/OAuth2?hl=tr) kullanmalıdır. Başka hiçbir yetkilendirme protokolü desteklenmez. Uygulamanız [Google ile Oturum Açma](https://developers.google.com/identity/gsi/web?hl=tr) özelliğini kullanıyorsa yetkilendirme işleminin bazı kısımları sizin adınıza gerçekleştirilir.

## OAuth 2.0 kullanarak istekleri yetkilendirme

Dizine Ekleme API'sine gönderilen tüm isteklerin, kimliği doğrulanmış bir kullanıcı tarafından yetkilendirilmesi gerekir.

OAuth 2.0 ile yetkilendirme işleminin ("akış") ayrıntıları, yazdığınız uygulamanın türüne bağlı olarak değişiklik gösterir. Aşağıdaki genel işlem tüm uygulama türleri için geçerlidir:

1. Uygulamanızı oluştururken [Google API Konsolu](https://console.cloud.google.com/?hl=tr)'nu kullanarak kaydedersiniz. Ardından Google, daha sonra ihtiyaç duyacağınız bilgiler (ör. istemci kimliği ve istemci gizli anahtarı) sağlar.
2. Google API Konsolu'nda Dizine Ekleme API'sini etkinleştirin. (API, API Konsolu'nda listelenmemişse bu adımı atlayın.)
3. Uygulamanız kullanıcı verilerine erişmesi gerektiğinde Google'dan belirli bir erişim **kapsamı** ister.
4. Google, kullanıcıya uygulamanızı kullanıcının verilerinden bazılarını istemeye yetkilendirmesi için bir **onay ekranı** gösterir.
5. Kullanıcı onaylarsa Google, uygulamanıza kısa süreli bir **erişim jetonu** verir.
6. Uygulamanız, erişim jetonunu isteğe ekleyerek kullanıcı verileri için istekte bulunur.
7. Google, isteğinizin ve jetonun geçerli olduğuna kanaat getirirse istenen verileri döndürür.

Bazı akışlarda başka adımlar da yer alır. Örneğin, yeni erişim jetonları almak için **yenileme jetonları** kullanmak. Farklı uygulama türlerine yönelik akışlar hakkında ayrıntılı bilgi için Google'ın [OAuth 2.0 dokümanlarına](https://developers.google.com/identity/protocols/OAuth2?hl=tr) bakın.

Dizine Ekleme API'si için OAuth 2.0 kapsam bilgileri şöyledir:

| Kapsam                                     | Anlamı               |
| :----------------------------------------- | :------------------- |
| `https://www.googleapis.com/auth/indexing` | Okuma/yazma erişimi. |

Uygulamanızın OAuth 2.0 kullanarak erişim isteğinde bulunabilmesi için hem kapsam bilgilerine hem de uygulamanızı kaydederken Google tarafından sağlanan bilgilere (ör. istemci kimliği ve istemci gizli anahtarı) ihtiyacı vardır.

**İpucu:** Google API'leri istemci kitaplıkları, yetkilendirme işleminin bazı adımlarını sizin yerinize gerçekleştirebilir. Bu kitaplıklar çeşitli programlama dilleri için kullanıma sunulmuştur. Ayrıntılar için [kitaplıkların ve örneklerin bulunduğu sayfayı](https://developers.google.com/search/apis/indexing-api/v3/libraries?hl=tr) inceleyin.

# Kota ve fiyatlandırma bilgileri



Dizine ekleme API'si, test için ilk varsayılan kota sağlar. [Kullanım ve kaynak sağlama için ek onay](https://developers.google.com/search/apis/indexing-api/v3/quota-pricing?hl=tr#request-quota) gerekir.

## İlk varsayılan kota

Dizine ekleme API'si, ilk API hazırlığı ve test gönderimleri için aşağıdaki varsayılan kotayı sağlar.

| Varsayılan kota                            |                                                              |
| :----------------------------------------- | ------------------------------------------------------------ |
| DefaultPublishRequestsPerDayPerProject     | `publish` uç noktasına günde kaç `publish` isteği gönderebileceğinizi belirleyen proje başına varsayılan kota. Buna hem `URL_UPDATED` hem de `URL_DELETED` istek türleri dahildir. Varsayılan değer 200 olarak ayarlanmıştır. Günlük kota, Pasifik Saati'ne göre gece yarısında sıfırlanır. Bu nedenle yeni kotanın yürürlüğe girmesi 24 saati bulabilir. |
| DefaultMetadataRequestsPerMinutePerProject | `getMetadata` uç noktasına dakikada kaç Salt Okunur istek gönderebileceğinizi belirleyen proje başına varsayılan kota. Varsayılan değer 180 olarak ayarlanmıştır. |
| DefaultRequestsPerMinutePerProject         | Tüm uç noktalar için proje başına dakika başına varsayılan kota. Varsayılan değer 380 olarak ayarlanmıştır. |

## Kotanızı görüntüleme

Kotanızı görüntülemek için [Google API Konsolu](https://console.cloud.google.com/apis/api/indexing.googleapis.com/quotas?hl=tr)'na gidin.

## Kota ve onay isteme

Dizine Ekleme API'si yalnızca `VideoObject` içinde yerleşik [`JobPosting`](https://developers.google.com/search/docs/appearance/structured-data/job-posting?hl=tr) veya [`BroadcastEvent`](https://developers.google.com/search/docs/appearance/structured-data/video?hl=tr#broadcast-event) bulunan sayfaları tarayabilir. İlk varsayılan kotadan daha fazla kota isteğinde bulunmak ve `JobPosting` veya `BroadcastEvent` işaretlemesine sahip sayfalar için API'yi kullanma onayı almak istiyorsanız [bu formu doldurun](https://docs.google.com/forms/d/e/1FAIpQLSc_mpLw3WnnCt3pVbUHYZZ6ZdOS-c0GIj-WZ_k54SG-jDqCXQ/viewform?hl=tr). Google Cloud konsolunda projenizin ayrıntılarını bilmeniz gerekir. Kota, dokümanın kalitesine bağlı olarak artabilir veya azalabilir.

## Fiyatlandırma

Dizine Ekleme API'sinin her türlü kullanımı ücretsizdir.