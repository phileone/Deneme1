# Edge Reklam Engelleyici - Kurulum Kılavuzu

## Microsoft Edge'e Kurulum

### Adım 1: Geliştirici Modunu Etkinleştir
1. Edge tarayıcısını aç
2. Adres çubuğuna `edge://extensions/` yaz ve Enter'a bas
3. Sol alt köşedeki **"Geliştirici modu"** anahtarını aç (sağa çevir)

### Adım 2: Uzantıyı Yükle
1. **"Paketi açılmamış öğeleri yükle"** butonuna tıkla
2. Bu `edge-ad-blocker` klasörünü seç
3. **"Klasör Seç"** butonuna tıkla

### Adım 3: Uzantıyı Kullan
- Tarayıcı araç çubuğunda uzantı ikonu görünecektir
- İkona tıklayarak popup'ı aç
- Filtreleri dilediğin gibi yapılandır

---

## Özellikler

### Ağ Düzeyi Engelleme
- **40+ reklam sunucusu** engellenir (Google Ads, DoubleClick, Taboola, Outbrain vb.)
- **35+ izleyici** engellenir (Google Analytics, Facebook Pixel, Hotjar vb.)
- Sayfa yüklenmeden önce istekler engellenir

### Kozmetik Filtreleme
- DOM'daki reklam öğeleri gizlenir
- Yaygın reklam sınıfları ve ID'leri temizlenir
- Dinamik içerik için MutationObserver kullanılır

### Filtre Seçenekleri
| Filtre | Açıklama |
|--------|----------|
| Reklamları Engelle | Banner, video ve sponsorlu reklamlar |
| İzleyicileri Engelle | Analitik ve takip scriptleri |
| Açılır Pencereleri Engelle | Pop-up ve yeni sekme reklamları |
| Çerez Bildirimlerini Gizle | GDPR/çerez onay pencereleri |

### İstatistikler
- Toplam engellenen reklam sayısı
- Oturum başına engellenen sayı
- İstatistikleri sıfırlama butonu

---

## Teknik Detaylar

- **Manifest V3** ile uyumlu
- `declarativeNetRequest` API kullanır
- Düşük bellek kullanımı
- Edge (Chromium tabanlı) ile tam uyumlu

---

## Sorun Giderme

**Uzantı görünmüyor:**
- `edge://extensions/` sayfasında "Etkin" olduğunu kontrol et

**Bazı reklamlar hâlâ görünüyor:**
- İzin verilen liste oluşturabilirsiniz (ileride eklenecek özellik)
- Sayfayı yenileyin

**Geliştirici modu uyarısı:**
- Normal! Microsoft'un resmi mağazasından yüklenmediği için görünür
- "Yine de etkin bırak" seçeneğini kullanabilirsiniz
