# ÇAMOLUK YAPI — ANTIGRAVITY MASTER PRODUCT / UI-UX / DATABASE / DEVELOPMENT PROMPT

> Bu doküman, Çamoluk Yapı'nın yalnızca şirket içi kullanacağı; ürün/fiyat listesi, stok, teklif, satış, tahsilat/finans ve ortak cari süreçlerini yönetecek özel panelin ana geliştirme şartnamesidir.
>
> Uygulama Vercel üzerinde yayınlanacak, Next.js tabanlı olacak ve veri katmanı Supabase/PostgreSQL üzerinde çalışacaktır.
>
> Bu bir halka açık e-ticaret sitesi değildir. Login ekranı dışında hiçbir sayfa anonim kullanıcıya açık olmamalıdır.

---

# 1. PROJE AMACI

Çamoluk Yapı'nın günlük operasyonlarını tek panelden yönetmek:

- Excel fiyat listelerinden ürünleri sisteme almak ve güncellemek.
- Ürünleri ürün koduna göre tekilleştirmek.
- Ürünleri elle ekleyebilmek/düzenleyebilmek.
- Stok miktarlarını takip etmek.
- Satış girildiğinde stoktan otomatik düşmek.
- Müşteriye profesyonel teklif oluşturmak.
- Ürün bazlı ve teklif geneli iskonto uygulamak.
- Teklifleri benzersiz teklif kodu ile saklamak ve tekrar çağırmak.
- Teklifi PDF olarak indirmek ve direkt yazdırmak.
- Teklifi satışa dönüştürmek.
- Satışları ana finans/ciro sistemine aktarmak.
- Günlük, aylık, yıllık satış/ciro/tahsilat/gider grafiklerini göstermek.
- İki ortak arasındaki firma-borç/alacak hareketlerini tamamen ayrı bir modülde takip etmek.
- Tüm kritik işlemlerde kullanıcı ve işlem geçmişi tutmak.

Bu panel, klasik bir “admin template” görünümünde değil; Çamoluk Yapı'nın kurumsal kimliğine uygun, hızlı, yoğun veriyle çalışmaya elverişli, masaüstü öncelikli gerçek bir şirket içi operasyon paneli olmalıdır.

---

# 2. TEMEL TEKNOLOJİ YIĞINI

## Frontend / Full-stack
- Next.js — güncel stabil sürüm
- App Router
- TypeScript strict mode
- React Server Components uygun yerlerde
- Server Actions ve Route Handlers
- Tailwind CSS
- shadcn/ui veya aynı kalite seviyesinde erişilebilir component yapısı
- TanStack Table — ürün, teklif, satış, finans ve hareket tabloları
- React Hook Form + Zod
- Recharts — dashboard ve finans grafikleri
- Lucide Icons
- Sonner/toast sistemi

## Backend / Database
- Supabase PostgreSQL
- Supabase Auth
- Supabase Storage
- Row Level Security
- PostgreSQL RPC / functions — özellikle stok ve satış işlemlerinde transaction güvenliği için

## Dosya / Excel
- `xlsx` / SheetJS
- `.xlsx` ve `.xls` desteği
- Excel dosyasının kendisini Supabase Storage'da arşivleme
- Import geçmişi ve hata raporu

## PDF / Print
Tercihen:
- `@react-pdf/renderer` ile gerçek A4 PDF üretimi

Ek olarak:
- `/teklif/[id]/print` yazdırma görünümü
- Browser print CSS
- “PDF İndir” ve “Yazdır” ayrı butonlar

## Deployment
- Vercel
- Supabase
- Europe/Istanbul timezone
- TRY / Türk Lirası varsayılan para birimi
- Türkçe locale: `tr-TR`

---

# 3. GÜVENLİK VE ERİŞİM

Uygulama dışarıya açık bir ürün değildir.

## Zorunlu kurallar
- Public registration / “Kayıt Ol” kesinlikle olmayacak.
- Kullanıcılar yalnızca admin tarafından davet edilecek veya oluşturulacak.
- `/login` dışında tüm route'lar authentication zorunlu.
- Next.js middleware ile route protection.
- Supabase Auth kullan.
- Supabase RLS tüm iş tablolarında aktif olacak.
- `service_role` key browser'a kesinlikle gönderilmeyecek.
- Kullanıcı hangi şirkete üyeyse yalnızca o şirketin kayıtlarını görebilecek.
- Şimdilik tek şirket Çamoluk Yapı olsa da veri modelinde `company_id` kullan; ileride gerekirse genişleyebilsin.
- `robots.txt` ve metadata ile uygulama `noindex, nofollow`.
- Login olmayan kullanıcı API route'larına da erişememeli.
- Kritik silmeler hard delete yerine soft delete veya iptal/ters kayıt yöntemi ile yapılmalı.
- Satış/stok/finans kayıtlarında veri kaybına sebep olacak doğrudan delete işlemi kullanılmamalı.
- Tüm parasal alanlar PostgreSQL `numeric`, JavaScript floating point mantığına bırakılmamalı.

## Roller
Başlangıçta aşağıdaki yapı yeterlidir:

### `admin`
Tam erişim:
- kullanıcılar
- ayarlar
- Excel import
- ürünler
- stok
- teklifler
- satışlar
- finans
- ortak cari
- raporlar
- audit log

### `staff`
Operasyon erişimi:
- müşteriler
- ürün görüntüleme
- teklifler
- satışlar
- gerekli stok bilgileri

Admin isterse daha sonra:
- satış
- depo
- muhasebe
gibi ayrı roller eklenebilecek şekilde permission yapısı genişletilebilir olmalı.

**Ortak Cari menüsü varsayılan olarak yalnızca admin rolüne açık olsun.**

---

# 4. TASARIM DİLİ

Referans dashboard mantığı:
- sol tarafta koyu menü
- üstte hızlı arama ve kullanıcı alanı
- ana bölümde KPI kartları
- altında grafikler ve operasyon listeleri
- yoğun tabloları rahat okutacak temiz grid yapısı

## Çamoluk Yapı renk yaklaşımı
Aşırı gradient, neon veya “AI ile üretilmiş dashboard” hissi verme.

Ana renkler:
- Koyu lacivert / füme: sidebar ve güçlü yüzeyler
- Altın / sıcak sarı: vurgu, aktif menü, önemli KPI
- Çamoluk teklif örneğindeki kırmızı: teklif/PDF ve kritik aksiyon vurgusu
- Açık gri / beyaz: ana içerik alanları

Örnek token yaklaşımı:
- `--brand-navy: #131B2A`
- `--brand-navy-2: #202B3D`
- `--brand-gold: #D7A64A`
- `--brand-red: #B30E17`
- `--surface: #F5F6F8`
- `--border: #E2E5EA`
- `--text: #161A22`

## Tasarım ilkeleri
- Desktop-first.
- 1366 / 1440 px ekranlarda rahat kullanım.
- 1920 px'de gereksiz boşluk yaratma.
- Tablet destekle.
- Mobilde temel görüntüleme mümkün olsun ancak ana kullanım masaüstü.
- Tablo başlıkları sticky olabilir.
- Filtreler collapsible olabilir.
- Her sayfada tek bir güçlü primary action.
- Para alanları sağa hizalı.
- Stok ve fiyat değişiklikleri görsel badge'lerle anlaşılır.
- Türkçe metinlerde karakter sorunu olmamalı.

---

# 5. SOL MENÜ / BİLGİ MİMARİSİ

Önerilen ana menü:

1. Dashboard
2. Ürünler
3. Excel / Fiyat Listesi İçe Aktar
4. Stok Yönetimi
5. Müşteriler
6. Teklif Oluştur
7. Teklifler
8. Satış Oluştur
9. Satışlar
10. Finans
11. Ortak Cari
12. Raporlar
13. Kullanıcılar
14. Ayarlar
15. Audit Log

Alt menüler gerekiyorsa sade tutulmalı.

---

# 6. VERİ KAYNAĞI / FİYAT LİSTESİ YAPISI

Kullanıcının verdiği NG Seramik fiyat listesinde görülen temel kolon mantığı:

- Ebat
- Ürün Grubu
- Seri Adı
- Ürün Kodu
- Ürün Adı
- 1. Kalite Brüt Fiyat
- 2. Kalite Brüt Fiyat
- Ticari Kalite Brüt Fiyat
- Birim / Brm

Önemli:
- Fiyat kolonlarının başında dönem adı değişebilir. Örnek: `2026-03`.
- Bu nedenle Excel importer kolon adını tam sabit string ile aramamalı.
- Fiyat listelerinde `M2` yanında `ADT` gibi farklı birimler bulunabilir.
- Ürün grubu yalnızca `NG SERAMİK` olmak zorunda değildir; farklı ürün grupları ve ileride farklı markalar gelebilir.
- Bazı ürünlerde üç fiyat seviyesi varken bazı satırlarda fiyat alanlarından biri/ikisi boş olabilir.
- Fiyat listesi fiyatları KDV hariç kabul edilecek.
- Ebat formatı sabit değildir: `120*280`, `60*120`, `31.5*61.5`, `120*300` vb.
- Ürün kodu metin olarak saklanmalıdır. Sayısal tipe dönüştürülmemeli.
- Excel'den gelen ürün kodunda baştaki sıfır varsa kaybolmamalı.

---

# 7. ÜRÜN VERİ MODELİ

`products`

Önerilen alanlar:

```text
id uuid pk
company_id uuid fk
product_code text NOT NULL
product_name text NOT NULL
product_group text
series_name text
size text
unit text NOT NULL
price_quality_1 numeric(14,2)
price_quality_2 numeric(14,2)
price_commercial numeric(14,2)
default_sale_price numeric(14,2)
cost_price numeric(14,2) nullable
stock_qty numeric(14,3) default 0
min_stock_qty numeric(14,3) default 0
allows_decimal_qty boolean
brand text nullable
supplier text nullable
notes text nullable
is_active boolean default true
last_import_id uuid nullable
created_at timestamptz
updated_at timestamptz
created_by uuid
updated_by uuid
deleted_at timestamptz nullable
```

Unique:
```text
UNIQUE(company_id, product_code)
```

## Birim mantığı
Desteklenen başlangıç birimleri:
- M2
- ADT
- MT
- PAKET
- KOLİ
- KG
- LT
- SET
- DİĞER

`M2`, `MT`, `KG`, `LT` için ondalıklı miktar kabul edilebilir.

`ADT`, `PAKET`, `KOLİ`, `SET` varsayılan olarak tam sayı olmalı.

Bu davranış `allows_decimal_qty` ile ürün özelinde override edilebilir.

---

# 8. EXCEL İÇE AKTARMA

Bu modül sadece admin tarafından kullanılmalı.

## Akış

### Adım 1 — Dosya yükle
- `.xlsx`
- `.xls`
- örneğin max 10–20 MB
- dosya Supabase Storage'a arşivlenir
- import kaydı açılır

### Adım 2 — Sheet seçimi
Excel birden fazla sheet içeriyorsa kullanıcı sheet seçebilsin.

### Adım 3 — Header tespiti
Sistem ilk uygun header satırını otomatik bulmaya çalışsın.

### Adım 4 — Kolon eşleştirme
Otomatik eşleştirme yap ancak admin kontrol edebilsin.

Hedef alanlar:
- Ebat
- Ürün Grubu
- Seri Adı
- Ürün Kodu
- Ürün Adı
- 1. Kalite Fiyat
- 2. Kalite Fiyat
- Ticari Fiyat
- Birim
- Opsiyonel Stok

Özellikle fiyat kolonlarındaki tarih/dönem prefix'ini önemseme.

Örneğin:
```text
2026-03 1. KALİTE BRÜT FİYAT LİSTESİ
2026-04 1. KALİTE BRÜT FİYAT LİSTESİ
```

ikisi de `price_quality_1` alanına eşlenebilmeli.

### Adım 5 — Önizleme
İlk 20–30 satırı göster.

Kolonlar:
- Excel ürün kodu
- ürün adı
- mevcut ürün var mı
- eski fiyat
- yeni fiyat
- işlem: Insert / Update / Skip / Warning

### Adım 6 — Import
En önemli kural:

**`product_code` ürünün unique ana anahtarıdır.**

- Kod sistemde yoksa `INSERT`.
- Kod sistemde varsa `UPDATE`.
- Yeni Excel yüklemek eski ürünleri silmez.
- Excel'de olmayan eski ürünler sistemde kalır.
- Aynı kod mevcutsa yeni bir ürün kaydı oluşturulmaz.
- Update sırasında fiyat, isim, seri, ebat, grup ve birim güncellenebilir.
- Excel'deki boş hücre varsayılan olarak sistemdeki dolu değeri silmesin.
- Admin import öncesi “boş değerler mevcut veriyi temizlesin” gibi özel seçeneği açmadıkça null overwrite yapılmasın.
- Excel'de stok kolonu yoksa mevcut stok kesinlikle değişmesin.
- Excel'de opsiyonel stok kolonu varsa “stok güncellensin” ayrıca onay gerektirsin.

### Aynı Excel içinde mükerrer ürün kodu
- Import önizlemesinde warning ver.
- Deterministik davranış: son dolu satır esas alınabilir.
- Raporda “aynı dosyada mükerrer kod” göster.
- Kullanıcı import öncesi görebilsin.

## Türkçe sayı formatı
Şunları doğru parse et:
```text
3.870,00 -> 3870.00
1.210,00 -> 1210.00
955,00   -> 955.00
```

Excel hücresi zaten numeric ise tekrar locale parse etmeye çalışma.

## Import sonucu
Göster:
- toplam satır
- insert edilen
- update edilen
- değişmeyen
- hatalı
- warning
- işlem süresi

Hata raporu indirilebilsin.

## Import geçmişi
Her import:
- dosya adı
- tarih
- yükleyen kişi
- inserted count
- updated count
- error count
- storage path
- status
- özet
ile saklansın.

---

# 9. IMPORT TABLOLARI

`product_imports`

```text
id
company_id
file_name
storage_path
sheet_name
status
total_rows
inserted_rows
updated_rows
skipped_rows
error_rows
mapping_json jsonb
created_by
created_at
completed_at
```

`product_import_errors`

```text
id
import_id
row_number
product_code
error_type
message
raw_row jsonb
created_at
```

---

# 10. ÜRÜNLER SAYFASI

Yoğun veri kullanımına uygun olmalı.

## Üst bölüm
- arama
- ürün ekle
- Excel yükle
- filtreleri aç
- CSV/Excel export opsiyonel

## Arama
Tek kutudan:
- ürün kodu
- ürün adı
- seri adı
- ürün grubu

## Filtreler
- ürün grubu
- seri
- ebat
- birim
- aktif/pasif
- stokta var/yok
- kritik stok
- fiyat aralığı

## Tablo
Önerilen kolonlar:
- Ürün Kodu
- Ürün Adı
- Ebat
- Grup
- Seri
- Birim
- 1. Kalite
- 2. Kalite
- Ticari
- Stok
- Son Güncelleme
- İşlem

Fiyat ve stok ayrı görsel ağırlığa sahip olsun.

## Manuel ürün ekleme
Admin elle:
- ürün kodu
- ürün adı
- grup
- seri
- ebat
- birim
- üç fiyat seviyesi
- varsayılan satış fiyatı
- opsiyonel maliyet
- açılış stok
- minimum stok
- açıklama
girebilsin.

Ürün kodu zorunlu ve unique.

---

# 11. STOK YÖNETİMİ

Stok `products.stock_qty` alanında güncel snapshot olarak tutulabilir fakat stok miktarı client tarafından doğrudan yazılmamalı.

Her değişikliğin ayrıca hareket kaydı olmalı.

`stock_movements`

```text
id
company_id
product_id
movement_type
quantity
quantity_before
quantity_after
reference_type
reference_id
reason
created_by
created_at
```

`movement_type`:
- opening
- purchase
- sale
- sale_cancel
- return
- adjustment_in
- adjustment_out
- manual_correction

## Stok kuralları
- Satış tamamlandığında stok düş.
- Teklif oluşturulduğunda stok düşme.
- Teklif stok rezervasyonu oluşturmasın.
- Satış iptalinde eski kaydı silme; ters stok hareketi üret.
- Aynı satış iki kez stok düşürememeli.
- Varsayılan olarak negatif stok satışını engelle.
- Admin için opsiyonel override olabilir ancak mutlaka warning ve audit log üret.
- Stok değişimleri PostgreSQL transaction/RPC üzerinden yapılmalı.
- Eşzamanlı iki satışta race condition oluşmamalı.
- `SELECT ... FOR UPDATE` benzeri güvenli transaction yaklaşımı kullan.

## Stok hareket sayfası
Filtre:
- ürün
- tarih
- hareket tipi
- kullanıcı
- satış no/reference

---

# 12. MÜŞTERİLER / MINI CRM

Teklif ve satış için ayrı ayrı aynı müşteri bilgilerini tekrar yazmak yerine müşteri kartı kullanılmalı.

`customers`

```text
id
company_id
type                 # bireysel / kurumsal
company_name
contact_name
phone
email
address
tax_office
tax_number
notes
is_active
created_by
created_at
updated_at
```

Müşteri oluştururken minimum alan:
- müşteri/ünvan
- telefon

Diğerleri opsiyonel.

Müşteri detayında:
- iletişim bilgileri
- teklifler
- satışlar
- toplam satış
- tahsilat durumu
görülebilir.

---

# 13. TEKLİF OLUŞTURMA — ANA MODÜL

Bu sayfa sistemin en önemli ekranlarından biridir.

## Üst bilgi

### Sol — Müşteri
- mevcut müşteri seç
- yeni müşteri oluştur
- müşteri ünvanı
- adres
- iletişim
- vergi dairesi / vergi no
- e-posta

### Sağ — Teklif
- Teklif No
- Teklif Tarihi
- Geçerlilik Süresi
- Satış Temsilcisi
- Satış temsilcisi telefon/e-posta bilgisi tercihen kullanıcı profilinden otomatik
- Teklif Durumu

**Satış temsilcisi bilgisi teklif PDF'inde yalnızca bir ana yerde bulunsun. Referans örnekteki gibi aynı satış temsilcisini hem sağ üstte hem ayrıca sol altta tekrar ederek mükerrer alan yaratma.**

---

# 14. BENZERSİZ TEKLİF NUMARASI

`000001`, `000002` gibi kolay tahmin edilen seri kullanılmayacak.

DB tarafında 10 karakterlik random, insan tarafından okunabilir bir kod üret.

Örnek:
```text
7K3M9Q2X8P
B6H4T9R2WK
```

Karakter setinde mümkünse karışabilecek:
- O / 0
- I / 1
- L

gibi karakterlerden kaçın.

Önerilen karakter seti:
```text
ABCDEFGHJKMNPQRSTUVWXYZ23456789
```

Kolon:
```text
quote_code char(10) UNIQUE NOT NULL
```

Kod yalnızca frontend'de generate edilmesin.
Postgres function ile üret ve unique constraint ile garanti et.

İstersen kullanıcı arayüzünde:
```text
TKF-7K3M9Q2X8P
```
şeklinde gösterilebilir ancak DB'deki benzersiz çekirdek kod 10 karakter olmalı.

---

# 15. TEKLİFE ÜRÜN EKLEME

Ürün seçim modalı / autocomplete:

Arama:
- ürün kodu
- ürün adı
- seri

Ürün seçildiğinde:
- açıklama snapshot
- birim
- fiyat kaynakları
- stok bilgisi
gelmeli.

## Fiyat kaynağı
Her teklif satırında fiyat dropdown:
- 1. Kalite
- 2. Kalite
- Ticari
- Varsayılan
- Özel Fiyat

Kullanıcı fiyatı gerektiğinde elle değiştirebilmeli.

Özel fiyat seçildiğinde bu değişiklik sadece teklif satırını etkiler, ürün kartındaki ana fiyatı değiştirmez.

## Serbest satır
Katalogda olmayan kalem girilebilsin.

Örnek:
- Nakliye Maslak
- Uygulama Ekipman Desteği
- Vida ve Dübel
- Silikon
- Palet
- özel hizmet

Alanlar:
- açıklama
- miktar
- birim
- birim fiyat
- iskonto

Bu satırın `product_id` değeri null olabilir.

Serbest satır teklif/satış tarihçesinde aynen snapshot olarak saklanmalı.

---

# 16. TEKLİF KALEMİ HESAPLARI

Her satır:

```text
brut_line_total = quantity * unit_price
line_discount_amount
line_net_total = brut_line_total - line_discount_amount
```

## Satır indirimi
Kullanıcı:
- yüzde iskonto
veya
- sabit TL iskonto

uygulayabilsin.

UI'da:
- İskonto %
- İskonto Tutarı

ikisi de görülebilir.

Ancak hesaplamada tek bir kaynak aktif olsun; çifte iskonto hatası yaratma.

Örnek:
- qty 60.48
- unit price 550
- discount %10
- sistem discount amount ve satır toplamını otomatik hesaplar.

---

# 17. TEKLİF GENEL İSKONTO

Satır iskonto hesaplarından sonra ayrıca teklif geneli indirim olmalı.

Destekle:
- Genel iskonto yüzde
- Genel iskonto sabit TL

Örnek:
```text
Ara Toplam      71.296,85
Genel İskonto   -3.000,00
Net Tutar        68.296,85
KDV %20          13.659,37
Genel Toplam     81.956,22
```

## Hesap sırası
1. Satır brütleri
2. Satır iskontoları
3. Ara toplam
4. Genel iskonto
5. Net tutar
6. KDV
7. Genel toplam

## KDV
- varsayılan %20
- şirket ayarından değiştirilebilir
- teklif özelinde override edilebilir
- fiyat listesi KDV hariç mantığıyla çalışır

Tüm hesaplar tek bir ortak calculation utility/server validation ile yapılmalı.
Frontend ve backend farklı sonuç üretmemeli.
Kaydetme öncesi server tekrar hesaplamalı.

---

# 18. TEKLİF VERİ MODELİ

`quotes`

```text
id uuid pk
company_id
quote_code char(10) unique
customer_id nullable
customer_snapshot jsonb
quote_date date
valid_until date
validity_text text
sales_rep_id
status
currency default 'TRY'
vat_rate numeric(5,2)
subtotal numeric(14,2)
line_discount_total numeric(14,2)
general_discount_type text
general_discount_value numeric(14,2)
general_discount_amount numeric(14,2)
net_total numeric(14,2)
vat_total numeric(14,2)
grand_total numeric(14,2)
delivery_terms text
payment_terms text
warranty_terms text
return_terms text
notes text
internal_notes text
created_by
updated_by
created_at
updated_at
deleted_at nullable
converted_sale_id nullable
```

Status:
- draft
- sent
- accepted
- rejected
- expired
- converted_to_sale
- cancelled

`quote_items`

```text
id
quote_id
sort_order
product_id nullable
product_code_snapshot
product_name_snapshot
description_snapshot
unit_snapshot
price_source
quantity
unit_price
discount_type
discount_value
discount_amount
line_subtotal
line_total
created_at
```

**Snapshot alanları zorunlu mantıkta kullanılmalı.**
Ürün ismi/fiyatı daha sonra değişse bile eski teklif bozulmamalı.

---

# 19. TEKLİFLER SAYFASI

Arama:
- teklif kodu
- müşteri adı
- telefon
- satış temsilcisi

Filtre:
- tarih
- durum
- satış temsilcisi
- toplam tutar

Tablo:
- Teklif No
- Tarih
- Müşteri
- Temsilci
- Tutar
- Durum
- Geçerlilik
- Son Güncelleme
- İşlemler

## Teklif kodu ile çağırma
Sayfanın üstünde belirgin:
`Teklif No ile Bul`

Kullanıcı 10 haneli kodu yazınca direkt teklif detayına gidebilmeli.

## Teklif işlemleri
- Görüntüle
- Düzenle
- Kopyala / yeni teklif olarak çoğalt
- PDF indir
- Yazdır
- Kabul edildi
- Reddedildi
- Satışa dönüştür
- İptal

---

# 20. TEKLİF PDF TASARIMI

A4, kurumsal ve temiz.

Referans teklif formundaki güçlü kısımları koru ancak tekrar eden/mükerrer bölümleri sadeleştir.

## PDF yapısı

### Header
- Çamoluk Yapı logo
- opsiyonel marka/partner logosu
- sağda büyük `TEKLİF`

### Üst kartlar
Sol:
- müşteri bilgileri

Sağ:
- teklif no
- tarih
- geçerlilik
- satış temsilcisi
- iletişim

### Ürün tablosu
Kolonlar:
- Sıra No
- Ürün Açıklaması
- Miktar
- Birim
- Birim Fiyat
- İskonto %
- İskonto Tutarı
- Tutar

Ürün kodu tercihe göre açıklamanın altında küçük gösterilebilir.

### Fiyat notu
- “Fiyatlara KDV dahil değildir.” gibi şirket ayarındaki metin

### Banka bilgileri
Şirket ayarından:
- hesap adı
- banka
- hesap no
- IBAN
- şube
- opsiyonel IBAN QR

### Toplamlar
- Ara Toplam
- Genel İskonto
- Net Tutar
- KDV
- Genel Toplam

### Önemli Notlar
Şirket ayarından editable liste.

### Teslim & Ödeme Koşulları
- Teslim
- Ödeme Şekli
- Garanti
- İade Koşulları

### Çözüm ortakları
Opsiyonel.
Ayarlar panelinden logo eklenirse göster.
Yoksa PDF boş alan yaratmasın.

### Onay
Sadece:
- Firma Yetkilisi
- Ad Soyad
- Kaşe / İmza
- Tarih

Satış temsilcisi zaten üst bölümde bulunduğu için aynı bilgiyi alt bölümde ikinci kez büyük bir kart olarak tekrar etme.

### Footer
- firma adresi
- telefon
- web sitesi
- slogan

## PDF teknik
- Çok ürün varsa sayfa otomatik devam etmeli.
- Her sayfada header sade biçimde tekrarlanabilir.
- Tablo başlığı yeni sayfada tekrar etmeli.
- Toplamlar sadece son sayfada.
- Teklif kodu her sayfanın footer'ında küçük yer alabilir.
- Türkçe font embed et.
- ₺ sembolü sorunsuz olmalı.
- PDF içindeki text gerçek text olmalı; screenshot PDF üretme.

---

# 21. YAZDIRMA

`/teklif/[id]/print`

- A4 print CSS
- admin sidebar/header görünmez
- page break kontrolü
- browser `window.print()`
- ekranda:
  - Yazdır
  - PDF İndir
  - Geri Dön

---

# 22. SATIŞ OLUŞTURMA

Satış iki şekilde oluşturulabilsin:

### A. Manuel satış
Kullanıcı doğrudan ürün seçer.

### B. Tekliften satış
Kabul edilmiş teklif:
`Satışa Dönüştür`

- müşteri
- ürünler
- fiyatlar
- iskontolar
- toplamlar
satışa snapshot olarak kopyalanır.

Teklif satışa dönüştürüldüğünde `converted_sale_id` set edilir.
Aynı teklif yanlışlıkla iki kez satışa dönüştürülemez.

---

# 23. SATIŞ EKRANI

Alanlar:
- müşteri
- satış tarihi
- satış temsilcisi
- ürünler
- miktar
- birim fiyat
- iskonto
- KDV
- genel iskonto
- genel toplam
- ödeme durumu
- ödenen tutar
- ödeme yöntemi
- vade
- açıklama

## Ürün satırı
Teklif ile aynı ürün arama mantığı.

Kullanıcı katalog ürününün fiyatını satış özelinde değiştirebilsin.

Serbest ürün/hizmet satırı ekleyebilsin.

## Stok
Katalog ürünü satışında stok düşer.
Serbest satır stoktan düşmez.

Satış kaydetmeden önce:
- mevcut stok
- satış sonrası stok
göster.

Yetersiz stok varsa varsayılan olarak işlemi engelle.

---

# 24. SATIŞ VERİ MODELİ

`sales`

```text
id
company_id
sale_code
customer_id nullable
customer_snapshot jsonb
source_quote_id nullable
sale_date
sales_rep_id
status
currency
subtotal
discount_total
net_total
vat_rate
vat_total
grand_total
payment_status
paid_amount
remaining_amount
due_date nullable
notes
created_by
created_at
completed_at
cancelled_at nullable
```

`payment_status`:
- unpaid
- partial
- paid

`sale_items`

```text
id
sale_id
sort_order
product_id nullable
product_code_snapshot
product_name_snapshot
description_snapshot
unit_snapshot
quantity
unit_price
discount_type
discount_value
discount_amount
line_total
unit_cost_snapshot nullable
line_cost_total nullable
created_at
```

Satış geçmişi ürün ana kartı değişse bile aynı kalmalı.

---

# 25. SATIŞ TAMAMLAMA TRANSACTION'I

Satış “Taslak” iken stok değiştirme.

`Satışı Tamamla` aksiyonunda server-side/PostgreSQL RPC:

1. satış kaydını doğrula
2. sale item'ları kilitle/oku
3. product stock row'larını lock et
4. stok yeterliliğini doğrula
5. stokları düş
6. stock_movements oluştur
7. sale status = completed
8. gerekiyorsa ödeme kaydı oluştur
9. finance transaction oluştur
10. audit log
11. transaction commit

Bir adım hata verirse tamamı rollback.

---

# 26. SATIŞ İPTALİ

Satışı doğrudan silme.

`Satışı İptal Et`:
- yetki iste
- sebep zorunlu
- stok iadesi hareketi oluştur
- ilgili otomatik finans/tahsilat kaydını ters kayıt veya void mantığıyla düzelt
- satış statüsünü `cancelled` yap
- audit log tut

Tarihsel kayıt korunmalı.

---

# 27. TAHSİLAT

Profesyonel finans takibi için satış ile nakit hareketini ayır.

Satış ciroyu doğurur.
Tahsilat gerçek para girişini temsil eder.

`payments`

```text
id
company_id
sale_id
customer_id
amount
payment_date
payment_method
reference_no nullable
notes
created_by
created_at
voided_at nullable
```

Ödeme yöntemi:
- Nakit
- Havale/EFT
- Kredi Kartı
- Çek
- Diğer

Satış anında:
- tam ödendi
- kısmi ödendi
- ödenmedi
seçilebilir.

Kısmi tahsilat yapılırsa kalan alacak satışta görünür.

Daha sonra satış detayından `Tahsilat Ekle`.

---

# 28. FİNANS MODÜLÜ

**Ortak Cari bu modüle dahil değildir.**

Finansın ana amacı:
- satış/ciro
- tahsilat
- gider
- net nakit
- müşteri alacağı
göstermek.

## Dashboard kartları
- Bugünkü Ciro
- Bu Ay Ciro
- Bu Yıl Ciro
- Bugünkü Tahsilat
- Bu Ay Tahsilat
- Bekleyen Alacak
- Bu Ay Gider
- Net Nakit

## Grafikler
- Son 30 gün satış / tahsilat
- Son 12 ay ciro
- Son 12 ay tahsilat
- Son 12 ay gider
- Net nakit akışı
- En çok satılan ürünler
- Satış temsilcisi performansı opsiyonel

## Gerçek “kar” konusu
Fiyat listesi satış fiyatları içeriyor; gerçek ürün maliyeti yoksa sistem gerçek kârı uydurmamalı.

- `cost_price` dolu ürünlerde brüt kâr hesaplanabilir.
- Maliyet verisi eksikse dashboard “Brüt Kâr” kartını ya gizle ya da “maliyet verisi eksik” olarak göster.
- Ciroya “kâr” deme.

---

# 29. FİNANSAL HAREKETLER

`financial_transactions`

```text
id
company_id
transaction_type       # income / expense
category
amount
transaction_date
source_type             # payment / manual_income / manual_expense / reversal
source_id nullable
customer_id nullable
description
payment_method nullable
created_by
created_at
voided_at nullable
```

Satış direkt olarak her durumda “nakit gelir” yazmamalı.

Önerilen profesyonel mantık:
- ciro = completed sales üzerinden
- nakit gelir = payments üzerinden
- gider = financial_transactions expense
- net nakit = income - expense

Eğer MVP'yi daha sade kurmak gerekirse bile veri modeli bu ayrımı desteklesin.

## Manuel gider
Admin:
- tarih
- kategori
- tutar
- açıklama
- ödeme yöntemi
girebilsin.

Kategori örnekleri:
- Nakliye
- Personel
- Kira
- Akaryakıt
- Malzeme
- Diğer

---

# 30. ORTAK CARİ — TAMAMEN AYRI MODÜL

Bu bölüm şirketin iki ortağı için firma ile olan kişisel borç/alacak hareketlerini izler.

**Bu modül ana finansı, ciroyu, gideri, tahsilatı, dashboard net rakamlarını ASLA etkilemeyecek.**

Burada oluşturulan hiçbir hareket:
- `financial_transactions`
- satış
- tahsilat
- gider
- stok
tablolarına trigger ile bile yazılmamalı.

Bu modül kendi ledger'ında izole çalışmalı.

## Ortaklar
Ayarlar veya `partners` tablosundan:
- Mehmet
- Ahmet
gibi ortaklar tanımlanabilsin.

Hardcode isim kullanma.

`partners`

```text
id
company_id
name
phone nullable
is_active
created_at
```

---

# 31. ORTAK CARİ HAREKET MANTIĞI

“Borç / Alacak” kelimeleri kullanıcı için ters anlaşılabileceğinden ana aksiyon isimlerini açık yaz:

### `Ortak Firmaya Para Verdi`
Anlam:
- ortak şirket kasasına kendi parasını verdi
- firma ortağa borçlu

### `Firma Ortağa Para Verdi`
Anlam:
- firma ortağa para verdi
- ortak firmaya borçlu

Her işlemde zorunlu:
- ortak
- işlem tipi
- tarih
- tutar
- sebep

Opsiyonel:
- açıklama/not
- belge no

`partner_ledger`

```text
id
company_id
partner_id
direction
amount
transaction_date
reason
notes
created_by
created_at
voided_at nullable
```

`direction`:
- partner_to_company
- company_to_partner

## Özet
Her ortak kartında:
- Ortağın Firmaya Verdiği Toplam
- Firmanın Ortağa Verdiği Toplam
- Net Bakiye

Net sonucu metinle açık göster:
- `Firma Ahmet'e 125.000 ₺ borçlu`
veya
- `Ahmet firmaya 38.500 ₺ borçlu`
veya
- `Bakiye kapalı`

Tüm ortakların ayrıca genel ledger tablosu olsun.

Filtre:
- ortak
- tarih
- yön
- tutar
- sebep

Hareket iptalinde delete değil `void` veya ters kayıt.

---

# 32. DASHBOARD

Dashboard şirket sahibinin açınca 10 saniyede durumu anlamasını sağlamalı.

## Üst KPI kartları
Örnek:
- Bugünkü Ciro
- Aylık Ciro
- Bugünkü Satış Adedi
- Bekleyen Teklif
- Bugünkü Tahsilat
- Bekleyen Ödeme / Müşteri Alacağı
- Kritik Stok Ürünü

## Ana grafik
- 12 aylık Ciro
- Tahsilat
- opsiyonel Brüt Kâr

## Alt widget'lar
- Bekleyen Teklifler
- Vadesi Gelen Ödemeler
- Son Satışlar
- Kritik Stoklar
- En Çok Satılan Ürünler
- Son Excel Import
- Günlük nakit akışı

**Ortak Cari hiçbir dashboard KPI'sına dahil edilmemeli.**
Ortak cari sadece kendi menüsünde görünmeli.

---

# 33. GLOBAL HIZLI ARAMA

Üst bardaki search:
- ürün kodu
- ürün adı
- müşteri
- teklif kodu
- satış kodu

sonuçlarını grouped autocomplete olarak versin.

Örnek:
```text
Ürünler
  55018167RP — AMAZONIT...

Teklifler
  7K3M9Q2X8P — Mert Proje

Müşteriler
  Mert Proje

Satışlar
  SAT-...
```

---

# 34. RAPORLAR

MVP raporları:
- Tarih aralığı satış raporu
- Ürün bazlı satış raporu
- Müşteri bazlı satış
- Satış temsilcisi bazlı satış
- Tahsilat raporu
- Gider raporu
- Stok hareket raporu
- Kritik stok
- Teklif dönüşüm oranı
- Teklif tutarları
- Import geçmişi

Export:
- Excel
- CSV

PDF rapor export sonraki aşama olabilir.

---

# 35. AYARLAR

## Şirket bilgileri
- firma adı
- logo
- adres
- telefon
- e-posta
- web
- vergi dairesi
- vergi no
- slogan

## Teklif ayarları
- varsayılan KDV
- varsayılan geçerlilik günü
- teklif alt notu
- teslim metni
- ödeme şekli metni
- garanti metni
- iade koşulu
- genel notlar

## Banka
Birden fazla banka hesabı desteklenebilir:
- banka adı
- hesap adı
- IBAN
- hesap no
- şube
- aktif/pasif
- QR üretimi

## Çözüm ortakları
- logo upload
- sıra
- aktif/pasif

## Sistem
- para birimi
- timezone
- negatif stok izni
- düşük stok threshold varsayılanı

---

# 36. AUDIT LOG

Kritik tüm hareketleri kaydet.

`audit_logs`

```text
id
company_id
user_id
action
entity_type
entity_id
before_data jsonb
after_data jsonb
metadata jsonb
ip_address nullable
created_at
```

Kaydedilecek aksiyon örnekleri:
- ürün oluşturuldu
- ürün fiyatı değişti
- Excel import yapıldı
- stok düzeltildi
- teklif oluşturuldu
- teklif değiştirildi
- teklif PDF indirildi opsiyonel
- satış tamamlandı
- satış iptal edildi
- tahsilat eklendi
- tahsilat iptal edildi
- gider eklendi
- ortak cari hareket eklendi/iptal edildi
- şirket ayarı değişti

---

# 37. ÖNERİLEN DATABASE TABLOLARI

Minimum:

```text
companies
profiles
company_members
customers

products
product_imports
product_import_errors
stock_movements

quotes
quote_items
quote_status_history

sales
sale_items
payments

financial_transactions

partners
partner_ledger

company_settings
company_bank_accounts
company_partner_logos

audit_logs
```

---

# 38. KRİTİK INDEX / CONSTRAINT'LAR

```text
products:
  unique(company_id, product_code)
  index(company_id, product_name)
  index(company_id, series_name)

quotes:
  unique(company_id, quote_code)
  index(company_id, quote_date)
  index(company_id, customer_id)
  index(company_id, status)

sales:
  unique(company_id, sale_code)
  index(company_id, sale_date)
  index(company_id, customer_id)

stock_movements:
  index(company_id, product_id, created_at)

payments:
  index(company_id, sale_id)
  index(company_id, payment_date)

partner_ledger:
  index(company_id, partner_id, transaction_date)
```

Ürün araması çok büyürse `pg_trgm` ile ürün adı / kod araması optimize edilebilir.

---

# 39. RLS PRENSİBİ

Her business tabloda `company_id`.

RLS örneği mantığı:
- authenticated user
- `company_members` içinde aktif üyeliği var
- row.company_id = membership.company_id
- role/action permission kontrolü

Frontend filtresine güvenme.
Database RLS gerçek sınır olmalı.

`partner_ledger` için ayrıca admin permission kontrolü.

---

# 40. DOSYA STORAGE BUCKET'LARI

Öneri:

```text
company-assets
  /{company_id}/logo/
  /{company_id}/partner-logos/

price-imports
  /{company_id}/{yyyy}/{mm}/...

quote-assets
  gerekirse ileride
```

Private bucket kullan.
Signed URL veya server üzerinden erişim.

---

# 41. KULLANICI DENEYİMİ DETAYLARI

## Kaydetme
Uzun formlarda:
- “Kaydet”
- “Kaydet ve PDF”
- “Kaydet ve Satışa Dönüştür” yalnız uygun durumda

## Unsaved changes
Sayfadan çıkarken kaydedilmemiş değişiklik varsa uyar.

## Para input
Kullanıcı:
```text
3870
3.870
3.870,00
```
gibi değer yazsa bile parse/format düzgün olsun.

Gösterim:
```text
₺3.870,00
```

## Tarih
```text
24.06.2026
```

DB'de ISO tarih.

## Loading
Tablolarda skeleton.
Büyük Excel importta progress.
Double submit engelle.

## Toast
Başarılı aksiyonlar kısa.
Hata mesajları neyin yanlış olduğunu açık söylesin.

---

# 42. BUSINESS RULE'LAR — DEĞİŞTİRME

1. Ürün kodu ürün importunda ana unique key.
2. Yeni Excel mevcut ürünleri silmez.
3. Aynı ürün kodu varsa update edilir.
4. Excel import stok kolonunu içermiyorsa stok değişmez.
5. Teklif stok düşürmez.
6. Satış tamamlanınca stok düşer.
7. Satış iptalinde stok geri gelir.
8. Geçmiş teklif ve satışlar snapshot kullanır; güncel ürün fiyatı eski belgeleri değiştirmez.
9. Teklif kodu 10 karakter random ve unique.
10. Teklifte satır bazlı iskonto + genel iskonto vardır.
11. PDF ve print vardır.
12. Tekliften satış üretilebilir.
13. Satış ana ciro sistemine dahil olur.
14. Tahsilat ayrı izlenebilir.
15. Ortak Cari ana finansı hiçbir şekilde etkilemez.
16. Ortak Cari yalnız kendi menüsünde hesaplanır.
17. Para hesaplarında floating point hatası kabul edilmez.
18. Client'ın gönderdiği toplam rakama güvenilmez; server tekrar hesaplar.
19. Stok client'tan direkt update edilmez; transaction/RPC üzerinden hareket oluşturulur.
20. Hard delete yerine iptal/soft delete/ters hareket tercih edilir.

---

# 43. SAYFA ROUTE ÖNERİSİ

```text
/login

/dashboard

/urunler
/urunler/yeni
/urunler/[id]

/import
/import/[id]

/stok
/stok/hareketler

/musteriler
/musteriler/yeni
/musteriler/[id]

/teklif/yeni
/teklifler
/teklifler/[id]
/teklifler/[id]/duzenle
/teklifler/[id]/print

/satis/yeni
/satislar
/satislar/[id]

/finans
/finans/tahsilatlar
/finans/giderler
/finans/hareketler

/ortak-cari
/ortak-cari/[partnerId]

/raporlar

/kullanicilar
/ayarlar
/audit
```

---

# 44. TEKLİF OLUŞTURMA UX AKIŞI

1. Müşteri seç / yeni müşteri.
2. Teklif tarihi otomatik bugün.
3. Teklif kodu server üretir.
4. Geçerlilik şirket ayarından gelir.
5. Satış temsilcisi login olan kullanıcı.
6. Ürün ara.
7. Fiyat seviyesi seç.
8. Miktar gir.
9. Gerekirse satır iskonto.
10. Birden fazla ürün ekle.
11. Gerekirse serbest kalem ekle.
12. Genel iskonto uygula.
13. KDV kontrol et.
14. Teslim/ödeme notu.
15. Önizle.
16. Kaydet.
17. PDF indir / yazdır.
18. Kabul edilirse satışa dönüştür.

---

# 45. SATIŞ UX AKIŞI

1. Manuel satış veya tekliften dönüşüm.
2. Müşteri.
3. Ürünler ve miktarlar.
4. Sistem mevcut stok gösterir.
5. Fiyat/iskonto.
6. Toplam.
7. Ödeme:
   - ödenmedi
   - kısmi
   - tam
8. Ödeme yöntemi.
9. Satışı tamamla.
10. Server transaction:
   - stok düşür
   - hareket kaydı
   - satış tamamla
   - ödeme/tahsilat yaz
   - finans hareketi
11. Başarılı ekran.

---

# 46. İLK KURULUM / SEED

İlk deploy sonrası:

- Çamoluk Yapı company oluştur.
- İlk admin kullanıcı oluştur.
- Şirket ayarlarını doldur.
- Banka hesabını gir.
- Teklif metinlerini gir.
- Logo yükle.
- Ortakları tanımla.
- İlk fiyat Excel'ini import et.
- Açılış stoklarını ayrı stok işlemi ile gir.
- Test teklifi oluştur.
- Test PDF.
- Test satış.
- Test iptal/stock reversal.
- Test tahsilat.
- Ortak cari izolasyonunu test et.

---

# 47. KABUL KRİTERLERİ

## Excel
- Aynı ürün kodlu ikinci Excel yüklenince duplicate ürün oluşmamalı.
- Fiyat değiştiyse aynı ürün update olmalı.
- Yeni kod insert olmalı.
- Excel'de olmayan ürün silinmemeli.
- Stok kolon yoksa stock_qty aynı kalmalı.
- TR fiyat formatı doğru parse edilmeli.

## Teklif
- 10 karakter random teklif kodu.
- Kod unique.
- Tek tek iskonto.
- Genel iskonto.
- KDV.
- Doğru genel toplam.
- PDF.
- Print.
- Kod ile arama.
- Eski teklif yeni ürün fiyatı değişince bozulmamalı.
- PDF'de satış temsilcisi mükerrer görünmemeli.

## Satış / stok
- Satış tamamlanınca doğru miktar düşmeli.
- Draft satış stok düşürmemeli.
- Yetersiz stok varsayılan olarak engellenmeli.
- Satış iptal edilince stok geri gelmeli.
- Aynı satış iki kere stok düşürmemeli.

## Finans
- Ciro satıştan hesaplanmalı.
- Tahsilat payment kayıtlarından hesaplanmalı.
- Gider ayrı girilmeli.
- Günlük/aylık/yıllık grafik doğru.
- Kısmi ödeme kalan alacağı doğru hesaplamalı.

## Ortak Cari
- Ahmet/Mehmet vb. partner dinamik seçilmeli.
- Sebep zorunlu.
- Firma ortağa / ortak firmaya hareketleri doğru netleşmeli.
- Ortak cari hareketi ana finansın tek bir rakamını dahi değiştirmemeli.

## Güvenlik
- login olmadan sayfalar görünmemeli.
- staff ortak cariye erişememeli.
- başka company_id verisi erişilememeli.
- service role client bundle'da olmamalı.

---

# 48. QA / TEST SENARYOLARI

Otomatik veya manuel olarak en az şu senaryoları çalıştır:

### Import
- 1000 satırlık Excel
- aynı kod tekrar
- boş fiyat
- fiyat `3.870,00`
- ADT ürün
- M2 ürün
- yeni dönem başlıklı fiyat kolonları
- hatalı ürün kodu
- aynı dosyada duplicate

### Quote
- 1 ürün
- 20 ürün
- 2 sayfaya taşan PDF
- ondalıklı M2 miktarı
- satır % iskonto
- satır sabit iskonto
- genel % iskonto
- genel sabit iskonto
- KDV 20
- serbest ürün
- PDF Türkçe karakter
- print A4

### Sale
- yeterli stok
- yetersiz stok
- concurrent iki satış
- kısmi ödeme
- tam ödeme
- iptal
- tekliften satış
- aynı teklifi ikinci kez dönüştürme girişimi

### Partner ledger
- partner firmaya para verir
- firma partnera para verir
- net bakiye
- hareket iptali
- ana finance total değişmiyor kontrolü

---

# 49. PERFORMANS

- Product table server pagination.
- Varsayılan page size 50.
- 10.000+ ürün rahat çalışmalı.
- Search debounce 250–350ms.
- Querylerde sadece gereken kolonları çek.
- Dashboard her kart için 10 ayrı client fetch yapmasın; toplu server query/RPC kullan.
- Excel import chunk'lar halinde upsert olabilir.
- Gerekirse 300–500 kayıt batch.
- Import işlemi tekrar çalıştırıldığında idempotent sonuç vermeli.
- PDF üretimi büyük tekliflerde timeout yaratmamalı.

---

# 50. HATA YÖNETİMİ

Kullanıcıya ham Supabase/Postgres hata kodu gösterme.

Örnek mesajlar:
- “Bu ürün kodu zaten kullanılıyor.”
- “Satış için yeterli stok bulunmuyor. Mevcut stok: 8 M2.”
- “Excel'de Ürün Kodu kolonu bulunamadı. Kolon eşleştirmesini kontrol edin.”
- “Teklif PDF'i oluşturulamadı. Lütfen tekrar deneyin.”
- “Bu teklif daha önce satışa dönüştürülmüş.”

Log tarafında teknik detay saklanabilir.

---

# 51. YEDEKLEME / VERİ GÜVENLİĞİ

- Supabase production backup seçeneklerini aktive etmeye uygun kurulum.
- Kritik import öncesi/sonrası import log.
- Kullanıcı yanlış ürün silse bile soft-delete.
- Satış/ödeme/hareket geçmişi silinmemeli.
- Audit log son kullanıcı tarafından düzenlenememeli.
- Excel orijinal dosyası saklanmalı.

---

# 52. ŞİMDİLİK KAPSAM DIŞI

Bu ilk sürümde kullanıcı istemedikçe ekleme:
- e-Fatura entegrasyonu
- e-Arşiv
- resmi muhasebe defteri
- banka API entegrasyonu
- e-ticaret
- müşteri portalı
- public fiyat listesi
- WhatsApp otomasyonu
- kargo entegrasyonu
- multi-warehouse karmaşık depo transferi

Veri mimarisi ileride bunlara engel olmayacak şekilde temiz olsun.

---

# 53. ANTIGRAVITY İÇİN GELİŞTİRME SIRASI

Bu projeyi tek seferde rastgele tüm ekranları üretme.

Şu sırayla ilerle:

1. Proje setup + theme + auth
2. Supabase schema + RLS
3. Company / users / settings
4. Products
5. Excel importer + upsert
6. Stock ledger
7. Customers
8. Quote builder
9. Quote PDF + print
10. Quote list/search
11. Sales + stock transaction
12. Payments
13. Finance
14. Partner ledger
15. Dashboard
16. Reports
17. Audit log
18. QA / edge cases
19. Production hardening

Her aşamada:
- gerçek DB bağlantısı
- loading/error/empty state
- validation
- permission
- responsive davranış
tamamlanmadan sonraki aşamaya geçme.

---

# 54. KOD KALİTESİ KURALLARI

- TypeScript `any` kullanma; zorunluysa nedenini açıkla.
- DB type'larını Supabase'den generate et.
- Money calculation utility tek yerde.
- Quote total calculation tek yerde.
- Sale total calculation mümkünse quote ile ortak engine.
- Zod schema'lar server tarafında da kullanılmalı.
- Query logic component içine gömülmesin.
- Service/repository veya domain action düzeni kullan.
- UI component ile business logic ayrışsın.
- Bir satış transaction'ı 5 farklı client request'e bölünmesin.
- Security-sensitive işlerde server-side/RPC kullan.
- Magic string yerine enum/const.
- Status transition kuralları merkezi olsun.
- Her kritik mutation audit log üretmeli.

---

# 55. ÖRNEK DOMAIN HESAPLARI

## Teklif
```text
Satır 1:
Miktar: 60.48
Birim fiyat: 550
Brüt: 33,264.00
İskonto: %10
İskonto tutarı: 3,326.40
Satır net: 29,937.60
```

Toplam:
```text
subtotal = sum(item.line_total)
general_discount_amount = ...
net_total = subtotal - general_discount_amount
vat_total = net_total * vat_rate / 100
grand_total = net_total + vat_total
```

Yuvarlama:
- para: 2 decimal
- miktar: max 3 decimal
- her final para değeri decimal-safe hesap

---

# 56. ÜRÜN FİYAT TARİHÇESİ — EK ÖNERİ

Fiyat listeleri değişeceği için `product_price_history` eklemek güçlü olur.

```text
id
company_id
product_id
price_quality_1
price_quality_2
price_commercial
source_import_id nullable
effective_at
created_by
created_at
```

Excel importta fiyat gerçekten değiştiyse history kaydı ekle.

Bu sayede:
- geçen ay fiyat neydi?
- hangi import değiştirdi?
görülebilir.

Bu tablo dashboard'a veya satış geçmişine zorunlu değil ama veri güvenliği için önerilir.

---

# 57. STOK MALİYETİ / KAR — EK ÖNERİ

Gerçek kâr takibi istenirse yalnız satış fiyatı yetmez.

Ürün kartına:
- maliyet fiyatı
ve ileride:
- alış hareketleri
eklenebilir.

Sale item'da `unit_cost_snapshot` sakla.

Böylece eski satış kârı sonradan maliyet değişince bozulmaz.

Maliyet girilmemiş ürünlerde “kâr” üretme.

---

# 58. SON ÜRÜN BEKLENTİSİ

Sonuçta Çamoluk Yapı çalışanı:

- sisteme giriş yapacak,
- yeni NG Seramik veya başka fiyat Excel'ini yükleyecek,
- sistem ürün kodlarına göre insert/update yapacak,
- stoklar korunacak,
- ürünleri hızlı arayacak,
- müşteri seçip teklif hazırlayacak,
- ürün bazlı iskonto ve genel iskonto yapacak,
- 10 karakter benzersiz teklif kodu alacak,
- profesyonel Çamoluk teklif PDF'ini indirecek/yazdıracak,
- teklif koduyla eski teklifi anında bulacak,
- teklifi satışa çevirecek,
- satış stoktan otomatik düşecek,
- tahsilat/ciro finans ekranlarına doğru yansıyacak,
- günlük/aylık/yıllık veriyi grafikle görecek,
- firma ortaklarının şirketle olan borç/alacaklarını ayrı bir menüde takip edecek,
- ortak cari hiçbir şekilde ana finansı bozmayacak.

Bu panel bir demo değil, günlük işletme kullanımına uygun gerçek bir operasyon uygulaması olarak geliştirilmeli.

---

# 59. ANTIGRAVITY'E SON TALİMAT

Önce mevcut repository'yi incele.

Eğer sıfır projeyse yukarıdaki stack ile oluştur.

Sonra:
- database migration'larını yaz,
- RLS policy'leri oluştur,
- seed script hazırla,
- Supabase env template oluştur,
- gerçek auth akışını kur,
- UI shell'i kur,
- modülleri verilen sırayla gerçek backend ile tamamla.

Mock data yalnız component geliştirme sırasında geçici kullanılabilir.
Final projede ana operasyon ekranları mock data ile bırakılmayacak.

Her aşamada mevcut kurallarla çelişen bir karar gerekiyorsa:
- veri kaybı yaratma,
- finans ve stok tarihçesini koru,
- idempotency sağla,
- history/snapshot mantığını tercih et,
- Ortak Cari izolasyonunu bozma.

**Öncelik sırası:**
1. Veri doğruluğu
2. Stok/finans transaction güvenliği
3. Teklif hesaplarının doğruluğu
4. Kullanım hızı
5. Görsel kalite
