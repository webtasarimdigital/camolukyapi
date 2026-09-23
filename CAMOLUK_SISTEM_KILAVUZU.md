# Çamoluk Yapı - Entegre Operasyon & Yönetim Sistemi Kılavuzu

Bu belge, Çamoluk Yapı operasyon, muhasebe, sevkiyat ve finans yönetim platformunda geliştirilen tüm modülleri, rol bazlı yetkilendirme (RBAC) kurallarını, Excel/PDF entegrasyonlarını ve kullanım detaylarını eksiksiz olarak açıklamaktadır.

---

## 📌 İçindekiler
1. [Kullanıcı Rolleri & Yetkilendirme (RBAC)](#1-kullanıcı-rolleri--yetkilendirme-rbac)
2. [Kullanıcı İşlem İmzası & Denetim İzi (Audit Log)](#2-kullanıcı-işlem-imzası--denetim-izi-audit-log)
3. [Sevkiyat Yönetimi & Otobil GPS Araç Takibi](#3-sevkiyat-yönetimi--otobil-gps-araç-takibi)
4. [Excel & PDF ile Stok İçe Aktarma (Özel Format)](#4-excel--pdf-ile-stok-i̇çe-aktarma-özel-format)
5. [Toplanacak & Yapılacak Ödemeler (Vade & Erteleme)](#5-toplanacak--yapılacak-ödemeler-vade--erteleme)
6. [Nakliyeler & 12 Gün Takip Kuralı](#6-nakliyeler--12-gün-takip-kuralı)
7. [Finans & Ödeme Yöntemleri Analitiği](#7-finans--ödeme-yöntemleri-analitiği)
8. [Temiz Teklif Görünümü & Özel QR Kod Entegrasyonu](#8-temiz-teklif-görünümü--özel-qr-kod-entegrasyonu)
9. [Personel, Avans & Yıllık İzin Yönetimi](#9-personel-avans--yıllık-i̇zin-yönetimi)
10. [Kiralar Yönetimi (Toplanan & Verilen Kiralar)](#10-kiralar-yönetimi-toplanan--verilen-kiralar)
11. [Mobil Uyumluluk & Kullanım Kolaylıkları](#11-mobil-uyumluluk--kullanım-kolaylıkları)

---

## 1. Kullanıcı Rolleri & Yetkilendirme (RBAC)

Sistemde 4 farklı yetki seviyesi tanımlanmıştır. Kullanıcılar giriş ekranından kullanıcı adı/şifre ile veya **tek tıkla Hızlı Rol Girişi** yaparak sisteme erişebilir. Ayrıca ekranın sağ üst köşesindeki **Rol Değiştirici** menüden istenilen an roller arasında geçiş yapılabilir.

| Modül / Sayfa | 👑 Admin (Çamoluk) | 💼 Muhasebe 1 | 📊 Muhasebe 2 | 🚚 Sevkiyat |
| :--- | :---: | :---: | :---: | :---: |
| **Dashboard** (`/dashboard`) | ✅ Açık | ✅ Açık | ✅ Açık | ❌ Gizli (Sevkiyata Yönlenir) |
| **Sevkiyat & GPS** (`/sevkiyat`) | ✅ Açık | ✅ Açık | ✅ Açık | ✅ **Açık** |
| **Ürünler & Stok** (`/urunler`) | ✅ Açık | ✅ Açık | ✅ Açık | ✅ **Açık** |
| **Excel & PDF İçe Aktar** (`/import`) | ✅ Açık | ✅ Açık | ✅ Açık | ❌ Gizli |
| **Müşteriler** (`/musteriler`) | ✅ Açık | ✅ Açık | ✅ Açık | ❌ Gizli |
| **Teklif Oluştur & Teklifler** (`/teklifler`) | ✅ Açık | ✅ Açık | ✅ Açık | ❌ Gizli |
| **Satış Oluştur & Satışlar** (`/satislar`) | ✅ Açık | ✅ Açık | ✅ Açık | ❌ Gizli |
| **Ödeme & Vadeler** (`/odemeler`) | ✅ Açık | ✅ Açık | ✅ Açık | ❌ Gizli |
| **Nakliyeler (12 Gün)** (`/nakliyeler`) | ✅ Açık | ✅ Açık | ✅ Açık | ❌ Gizli |
| **Personel & İzinler** (`/personel`) | ✅ Açık | ✅ Açık | ✅ Açık | ❌ Gizli |
| **Finans & Analiz** (`/finans`) | ✅ Açık | ❌ **GİZLİ** | ✅ Açık | ❌ Gizli |
| **Ortak Finans (Cari)** (`/ortak-cari`) | ✅ Açık | ❌ **GİZLİ** | ✅ Açık | ❌ Gizli |
| **Kiralar (Gelir/Gider)** (`/kiralar`) | ✅ Açık | ❌ **GİZLİ** | ✅ Açık | ❌ Gizli |
| **Raporlar** (`/raporlar`) | ✅ Açık | ❌ Gizli | ✅ Açık | ❌ Gizli |
| **Kullanıcılar & Ayarlar** | ✅ Açık | ❌ Gizli | ❌ Gizli | ❌ Gizli |

---

## 2. Kullanıcı İşlem İmzası & Denetim İzi (Audit Log)

Sitede herhangi bir kullanıcı bir işlem gerçekleştirdiğinde, bu işlem o kullanıcının adı ve unvanı ile mühürlenir:
* **Tekliflerde:** Teklifi hazırlayan personelin adı teklif kartında ve teklif notlarında `[Hazırlayan: Kullanıcı Adı]` olarak görüntülenir.
* **Satışlarda:** Satışlar listesindeki `Temsilci` sütununda satışı onaylayan personel listelenir.
* **Sevkiyatta:** Sevkiyat fişini oluşturan ve statü güncelleyen personel listelenir.
* **Ödeme & Borç Takibinde:** Borcu veya alacağı giren yetkili kişi açıkça gösterilir.
* **Finans Hareketlerinde:** Kasa/banka işlemine imza atan kullanıcı etiketi yer alır.

---

## 3. Sevkiyat Yönetimi & Otobil GPS Araç Takibi

`/sevkiyat` sayfası üzerinden sevkiyat ve depo süreçleri yönetilir:

### A. Alanlar:
* **Müşteri Adı:** Sevk edilecek alıcı firma veya şantiye.
* **Satıcı / Temsilci:** Satışı gerçekleştiren personel (Örn: Ahmet Duvarbaşı).
* **Sevk Yeri:** Teslimatın yapılacağı adres veya şantiye sahası.
* **Fiş No:** Sevkiyat irsaliye / fiş numarası (Örn: SEV-2026-001).
* **Resmi / Gayriresmi:** Fatura türü seçimi.
* **Metrekare ($m^2$):** Sevk edilen seramik/granit alanı.
* **Palet Sayısı:** Yüklenen palet adedi.
* **Hazırlık / Sevk Notu:** Özel depo talimatları, derz, yapıştırıcı veya ambalaj notları.

### B. Tek Tıkla Statü Değiştirme (Inline Status Switcher):
Sevkiyat personeli hiçbir formu yeniden açmadan doğrudan tablo üzerindeki statü butonlarına tıklayarak durumu güncelleyebilir:
1. 🟡 **Depoya Gitti:** Yük depoda hazırlanıyor.
2. 🔵 **Sevkiyata Çıktı:** Araç yüklendi ve yola çıktı.
3. 🟢 **Teslim Edildi:** Müşteriye teslimat tamamlandı.

### C. Otobil GPS Entegrasyon Paneli:
Sevkiyat sayfasının üst kısmında araç filosunun anlık konumunu, kontak durumunu ve şoför bilgilerini gösteren canlı izleme kartı ve Otobil GPS portalına doğrudan geçiş bağlantısı yer alır.

---

## 4. Excel & PDF ile Stok İçe Aktarma (Özel Format)

Excel içe aktarma modülü (`/import/yeni`), Çamoluk Yapı'nın kullandığı özel stok tablosu formatını doğrudan destekler.

### A. Okunan Sütunlar:
* **Sütun A:** Stok Kodu (`product_code`)
* **Sütun B:** Stok Adı (`product_name`)
* **Sütun D:** Stok Grubu (`product_group`)
* **Sütun E:** Birimi (`unit` - M2, ADET vb.)
* **Sütun H:** Kalan Miktar ➡️ Doğrudan `stock_qty` (Mevcut Stok Miktarı) alanına aktarılır.
* **Sütun Q:** Standart Fiyat ➡️ Doğrudan `default_sale_price` (Satış Fiyatı) alanına aktarılır.

### B. Otomatik Yok Sayılan Sarı Sütunlar:
Gereksiz ara hesaplamalar veya renkli sarı kolonlar (F, G, I, J, K, P, R, S vb.) sistem tarafından güvenle atlanır ve veritabanı kirliliği önlenir.

### C. 50 MB PDF Yükleme Desteği:
Sunucu işlem boyutu limiti **50 MB**'a çıkarılmıştır. Yüksek çözünürlüklü üretici katalogları veya çok sayfalı PDF'ler yükleme sırasında çökme hatası vermez.

---

## 5. Toplanacak & Yapılacak Ödemeler (Vade & Erteleme)

`/odemeler` sayfasında firmanın nakit akışını etkileyen tüm vadeli taahhütler yönetilir:
* **Toplanacaklar (Alacak):** Müşterilerden vadeli tahsil edilecek tutarlar.
* **Yapılacaklar (Borç):** Fabrika, hammadde veya tedarikçilere ödenecek vadeler.

### Vade Uyarı Renkleri & Kriterleri:
* 🔴 **Vadesi Geçmiş:** Vade tarihi geçmiş ve ödeme tamamlanmamışsa kırmızı alarm verir.
* 🟡 **Bugün Ödenecek:** Vadesi bugün dolan ödemeler sarı rozetle öne çıkarılır.
* 🟢 **Gelecek Vade:** Vadesine gün bulunan ödemeler yeşil takvimle listelenir.

### Kısmi Ödeme & Tarih Erteleme:
* Müşteri borcun bir kısmını ödediğinde "Kısmi Ödeme" girilebilir; kalan alacak sistem tarafından otomatik hesaplanır.
* Müşteri vadeyi uzatmak istediğinde yeni tarih girilerek statü **"Ertelendi"** olarak güncellenir.

---

## 6. Nakliyeler & 12 Gün Takip Kuralı

`/nakliyeler` sayfasında sevkiyat yapan bağımsız nakliyeciler takip edilir:
* **Alanlar:** Nakliyeci Adı / Plaka, Taşıma Tarihi, Nakliye Tutarı, IBAN Numarası, Ödeme Durumu (Ödendi / Ödenmedi) ve Not.
* **12 Gün Kuralı:** Nakliye tarihi girildiği anda sistem vadeyi otomatik olarak **Taşıma Tarihi + 12 Gün** olarak hesaplar.
* **Gecikme Uyarısı:** Taşıma tarihinden itibaren 12 gün geçmiş ve nakliyeci hala ödenmemişse satırda **"12 GÜN DOLDU - ÖDEME BEKLİYOR"** kırmızı uyarısı yanar.

---

## 7. Finans & Ödeme Yöntemleri Analitiği

`/finans` sayfasında şirketin anlık mali dengesi ve ödeme araçlarının dağılımı raporlanır:
* **Nakit Kasa:** Elden yapılan nakit tahsilatlar.
* **Kredi Kartı / POS:** Mağaza veya sanal POS çekimleri.
* **Banka Havale / EFT:** Banka hesaplarına gelen veya çıkan transferler.
* **Müşteri & Tedarikçi Çekleri:** Portföydeki vadeli çekler.
* **Vadeli Senetler:** Senetli satış ve borçlar.

Her ödeme tipinin toplam tutarı, işlem adedi ve toplam ciro içerisindeki yüzde oranı dinamik renkli çubuk grafiklerle gösterilir.

---

## 8. Temiz Teklif Görünümü & Özel QR Kod Entegrasyonu

Müşteriye teklif sunulduğunda veya A4 çıktısı alındığında:
1. **İzole Önizleme Sayfası (`/teklif-onizleme/[id]`):**
   * Sol menü, üst bar, butonlar veya operasyonel paneller **kesinlikle görünmez**.
   * Yalnızca Çamoluk Yapı logosu, müşteri bilgileri, ürün kalemleri, KDV ve genel toplamı içeren şık bir teklif formu açılır.
2. **Dinamik QR Kod:**
   * A4 teklif çıktısının sol alt köşesinde her teklife özel üretilen QR kod yer alır.
   * Müşteri akıllı telefonuyla QR kodu okuttuğunda doğrudan bu temiz önizleme sayfasına ulaşır; giriş yapması veya şifre girmesi gerekmez.

---

## 9. Personel, Avans & Yıllık İzin Yönetimi

`/personel` sayfası çalışan kayıtlarını ve hak edişlerini takip eder:
* **Bilgiler:** Ad Soyad, Telefon, Pozisyon/Görev, İşe Giriş Tarihi.
* **Maaş & Avans Hesabı:** Brüt/Net Maaş girildiğinde alınan toplam avans düşülür ve **"Kalan Ödenecek Maaş"** otomatik olarak hesaplanır.
* **Yıllık İzin Takibi:** Kullanılan izin günleri ve hak edilen kalan izin günleri sayısal olarak gösterilir.

---

## 10. Kiralar Yönetimi (Toplanan & Verilen Kiralar)

`/kiralar` sayfası mülk ve gayrimenkul kira akışını ikiye ayırır:
* 🟢 **Toplanan Kiralar (Gelir):** Çamoluk Yapı'ya ait dükkan veya depolardan kiracılardan her ay tahsil edilen kira gelirleri.
* 🔴 **Verilen Kiralar (Gider):** İşletilen ana showroom, depo veya açık sevkiyat sahaları için mülk sahiplerine ödenen kira giderleri.
* **Takip:** Her kayıtta ödeme günü (ayın kaçı olduğu), ödeme yöntemi ve tahsilat statüsü yer alır.

---

## 11. Mobil Uyumluluk & Kullanım Kolaylıkları

* **Mobil Hamburger Menü:** Akıllı telefon veya tabletten giriş yapıldığında sol menü ekranı kaplamaz; sol üstteki menü ikonuna basıldığında açılan kayar çekmece (drawer) ile tüm sayfalara kolayca erişilir.
* **Kaydırma & Taşma Koruması:** Büyük tablolar mobilde ekranın dışına taşmaz, yatay kaydırma çubuğu ve kart formatı ile rahatça okunur.
* **Hızlı Rol Değiştirme:** Masaüstünde ve mobilde üst menüden tek dokunuşla rol değiştirilerek farklı kullanıcıların ekran deneyimi anında test edilebilir.

---

*Çamoluk Yapı Bilgi İşlem ve Operasyon Dokümantasyonu • 2026*
