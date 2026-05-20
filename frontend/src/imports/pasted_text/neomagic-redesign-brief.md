NEOMAGIC
Yeniden Tasarım Brief'i
Bento Grid · Glassmorphism · Dark-Mode-First
PROMPT OPERATING SYSTEM · v2.0
Hazırlayan: Tasarım & UX Brief'i
Versiyon 1.0 · Nisan 2026
Kapsam: Tüm uygulama + Landing + Auth ekranları

İçindekiler


1. Proje Özeti & Vizyon
1.1 Mevcut Durum Analizi
NeoMagic, prompt yönetimi, RAG, AI ajan akışları ve optimizasyon araçlarını tek çatı altında toplayan bir Prompt Operating System. Mevcut arayüz işlevsel; ancak görsel hiyerarşi, mikro-etkileşimler ve modülerlik konusunda 2026 standartlarının altında kalıyor. Bu brief, ürünün vaadi olan "profesyonel AI iş istasyonu" pozisyonlamasına görsel olarak da kavuşması için hazırlandı.
1.2 Tasarım Vizyonu
"Bir prompt mühendisinin masası nasıl görünmeli?" sorusuna cevap veriyoruz. Cevabımız: Yoğun bilgi içeren ama sakin bir yüzey. Kullanıcı brief'i yazarken, geçmişe baktığında ve sonucu incelerken bağlam asla kaybolmamalı. Bento grid mimarisi modüler bilgi yoğunluğu sağlarken; glassmorphism katmanları, derinlik hissini bozmadan içerik hiyerarşisini kuruyor.
1.3 Tasarım Prensipleri
	•	Sakin yoğunluk. Çok bilgi gösteriyoruz, ama göz yormayacak şekilde. Boşluk lükstür; her piksel hak edilmiş olmalı.
	•	Modülerlik. Bento grid sayesinde her panel kendi başına bir "kart". Kullanıcı taşıyabilir, daraltabilir, gizleyebilir.
	•	Cam katmanlar, sahte derinlik değil. Glassmorphism dekorasyon değil, hiyerarşi aracı. Sadece üst-katman elementler için (modal, popover, floating panel).
	•	Karanlık varsayılan. Uzun süre çalışan profesyonelin gözünü korur. Aydınlık tema opsiyonel (Phase 2).
	•	Tipografi konuşur. Display font'u editorial bir tutum sergiler; UI font'u operasyonel netlik sunar.
	•	Hareket anlam taşır. Animasyon süsleme değil, durum değişikliğini aktarmak için. Maksimum 240 ms.
1.4 Hedef Kullanıcı Profili
Birincil kullanıcı: AI ile profesyonel iş yapan prompt mühendisi, içerik stratejisti, ajans takım lideri. Günde 4+ saat ekran karşısında. Klavye kısayollarına bağımlı, çoklu pencere/sekme kullanıyor. Görsel konfor ve bilgi yoğunluğu birlikte istiyor.
İkincil kullanıcı: Pazarlama analisti, ürün yöneticisi, eğitmen. Daha az teknik; ama sonuç odaklı. Şablonlar ve hazır akışlar üzerinden ilerliyor.
1.5 Ölçülebilir Hedefler
Metrik
Mevcut (Tahmin)
Hedef
Ana ekrana ilk anlam yükleme
4-6 saniye
≤ 2 saniye
Yeni kullanıcının ilk prompt'a ulaşma süresi
90+ saniye
≤ 30 saniye
Sidebar bilişsel yükü (eleman sayısı)
7 ana, gruplanmamış
3 grup, 7-9 öğe
Mobil/tablet kullanılabilirlik
Sınırlı
Tam responsive
Erişilebilirlik standardı
Kısmi
WCAG 2.2 AA
2. Tasarım Sistemi (Design Tokens)
Tüm görsel kararlar token olarak tanımlanır. Token'lar Figma Variables ve CSS Custom Properties olarak senkronize çalışır. Hardcoded değer kullanımı yasaktır.
2.1 Renk Paleti
2.1.1 Temel Yüzey Renkleri (Surface)
Karanlık tema, saf siyah yerine derin lacivert tonlardan başlar. Bu, OLED ekranlarda da rahatsız etmez ve cam efektine derinlik katar.
Token
Hex
Kullanım
Örnek
--surface-base
#070A14
Sayfa arkaplanı (en alt)
Body, root
--surface-1
#0D1220
Sidebar, ana panel
Sidebar bg
--surface-2
#141A2E
Kartlar (Bento)
Card bg
--surface-3
#1C233D
İç içe kartlar, hover
Elevated
--surface-glass
rgba(28,35,61,0.55)
Cam katmanlar
Modal, popover
--surface-overlay
rgba(7,10,20,0.72)
Modal arkaplan blur
Backdrop
2.1.2 Marka Renkleri (Brand)
İki ana renk: iolite (mavi-mor, primary) ve aurora (mor, accent). Her ikisi de gradient köprüsü kurar.
Token
Hex
Kullanım
WCAG (Surface-1)
--iolite-300
#A5B0FF
Tint, focus ring
AAA (10.2)
--iolite-500
#5B6BFF
Primary CTA, link
AA (5.8)
--iolite-700
#3B4BD9
Pressed, active
AA (4.6)
--aurora-500
#9B7BFF
Accent, AI rozet
AA (5.4)
--gradient-brand
135°, iolite→aurora
Logo, premium CTA
Görsel ağırlıklı
2.1.3 Metin Renkleri
Token
Hex / RGBA
Kullanım
Hiyerarşi
--text-primary
#F5F7FF
Başlıklar, ana metin
100% opacity
--text-secondary
#B8C0D9
Alt metin, açıklama
72% opacity
--text-tertiary
#7A8299
Etiketler, meta
52% opacity
--text-disabled
#4A5266
Pasif durum
32% opacity
--text-on-brand
#FFFFFF
Primary buton üstü
100% opacity
2.1.4 Durum Renkleri (Semantic)
Token
Hex
Anlam
Tint Versiyonu
--success-500
#10B981
Başarı, kaydet, tamamlandı
--success-tint: rgba(16,185,129,0.12)
--warning-500
#F59E0B
Uyarı, dikkat
--warning-tint: rgba(245,158,11,0.14)
--danger-500
#EF4444
Hata, sil
--danger-tint: rgba(239,68,68,0.14)
--info-500
#0EA5E9
Bilgi, ipucu
--info-tint: rgba(14,165,233,0.14)
--ai-pulse
#9B7BFF + glow
Aktif AI çalışıyor sinyali
Animasyonlu, 1.6s ease
2.1.5 Çizgi (Border) ve Bölücü (Divider)
	•	--border-subtle: rgba(255,255,255,0.06) — kart iç bölmeleri
	•	--border-default: rgba(255,255,255,0.10) — kart kenarları
	•	--border-strong: rgba(255,255,255,0.18) — focus, hover
	•	--border-glow: 0 0 0 1px rgba(91,107,255,0.4) — aktif durum çift sınır
2.2 Tipografi
2.2.1 Font Aileleri
Rol
Font
Kullanım
Display
Instrument Serif
Hero başlıklar, editorial vurgular. İtalik kesim ile karakter kazanır.
UI / Body
Inter Variable
Tüm arayüz metni. -2% letter-spacing başlıklarda.
Mono
JetBrains Mono
Kod blokları, terminal, prompt değişkenleri.
Numerik
Inter (tabular-nums)
Dashboard sayıları, metrikler. font-feature-settings: 'tnum'.
Yedek (Fallback):  Web fontlar yüklenmezse: Display → Georgia, italic; UI → -apple-system, Segoe UI; Mono → ui-monospace, Menlo.
2.2.2 Tipografi Skalası
Modüler oran 1.250 (Major Third). Mobilde -1 step otomatik küçültme.
Token
Boyut
Line-h
Weight
Kullanım
--text-display-2xl
72 / 80px
0.95
400 italic
Landing hero
--text-display-xl
56 / 64px
1.0
400 italic
Sayfa başlığı
--text-display-lg
40 / 48px
1.05
400 italic
Modal başlık
--text-h1
32 / 40px
1.15
600
Bölüm başlığı
--text-h2
24 / 32px
1.25
600
Kart başlığı
--text-h3
20 / 28px
1.3
600
Alt başlık
--text-body-lg
17 / 26px
1.55
400
Vurgulu paragraf
--text-body
15 / 24px
1.6
400
Standart metin
--text-body-sm
13 / 20px
1.55
400
Yardımcı metin
--text-label
12 / 16px
1.4
500, +0.04em
Etiket, badge
--text-overline
11 / 14px
1.3
600, +0.12em
KAPAK ETİKETİ (CAPS)
2.3 Spacing (Boşluk) Sistemi
8 px temel birim. Tüm padding, margin ve gap değerleri bu birimin katlarıdır. İstisna: 4 px (sıkışık iç boşluklar) ve 2 px (focus ring).
Token
Değer
Kullanım
--space-0
0
Reset, sıfır boşluk
--space-0-5
2px
Focus ring offset
--space-1
4px
İkon-metin arası, badge iç padding
--space-2
8px
Sıkı kontrol grupları, chip aralıkları
--space-3
12px
Form alanı iç padding (vertical)
--space-4
16px
Standart kart iç padding (kompakt)
--space-5
20px
Form bölümleri arası
--space-6
24px
Kart iç padding (standart)
--space-8
32px
Bento grid gap, bölüm aralıkları
--space-10
40px
Kart iç padding (geniş, hero)
--space-12
48px
Sayfa kenarları (orta)
--space-16
64px
Sayfa kenarları (geniş ekran), bölüm ayraçları
--space-24
96px
Landing hero ile sonraki bölüm arası
2.4 Border Radius
Token
Değer
Kullanım
--radius-none
0
Tablo kenarları, divider
--radius-sm
6px
Küçük badge, etiket, chip
--radius-md
10px
Buton, input, küçük kart
--radius-lg
16px
Standart Bento kart
--radius-xl
24px
Geniş hero kart, modal
--radius-2xl
32px
Landing hero, sidebar dış sınır
--radius-full
9999px
Avatar, pill butonlar, dot indicator
Hiyerarşi kuralı:  Alt eleman ana kapsayıcısından küçük radius almalıdır. Örnek: 24 px kart içindeki buton 10 px radius (24-14 = 10).
2.5 Glass Effect (Cam) Spesifikasyonu
Glassmorphism, performans pahalı bir efekt. Yalnızca yüzen / üst-katman elementlerde kullanılır: modal, popover, floating sidebar, command palette, toast, üst-bar (scroll edildiğinde).
2.5.1 Cam Varyantları
Token
Backdrop-blur
Background
Border
--glass-thin
blur(8px)
rgba(20,26,46,0.40)
1px rgba(255,255,255,0.08)
--glass-regular
blur(16px)
rgba(20,26,46,0.55)
1px rgba(255,255,255,0.10)
--glass-thick
blur(24px)
rgba(13,18,32,0.72)
1px rgba(255,255,255,0.12)
--glass-tinted
blur(20px)
rgba(91,107,255,0.10) +
1px rgba(91,107,255,0.30)
Cam katmanın altında her zaman okunabilir bir yüzey olmalı. Asla cam üstüne cam koymayın (iki kat blur performans katleder, ayrıca "oturtulmuş" hissini bozar).
2.5.2 Cam CSS Şablonu
.glass-regular {
  background: rgba(20, 26, 46, 0.55);
  backdrop-filter: blur(16px) saturate(140%);
  -webkit-backdrop-filter: blur(16px) saturate(140%);
  border: 1px solid rgba(255, 255, 255, 0.10);
  box-shadow:
    inset 0 1px 0 rgba(255,255,255,0.06),  /* iç highlight */
    0 24px 48px -12px rgba(0,0,0,0.45);    /* dış elevation */
  border-radius: var(--radius-xl);
}
2.6 Elevation (Gölge) Sistemi
Karanlık temada gölge tek başına derinlik veremez; iç-highlight ile birlikte kullanılır.
Seviye
Box-shadow
Kullanım
--elev-0
none
Düz
--elev-1
0 1px 2px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.04)
Kart durağan
--elev-2
0 4px 12px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.06)
Hover, dropdown
--elev-3
0 12px 28px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.08)
Popover
--elev-4
0 24px 48px rgba(0,0,0,0.65), inset 0 1px 0 rgba(255,255,255,0.10)
Modal
--elev-glow
0 0 0 1px var(--iolite-500), 0 0 24px rgba(91,107,255,0.4)
AI aktif
2.7 Bento Grid Sistemi
Bento grid, dengesiz ama hizalı kart yerleşim sistemidir. NeoMagic'in sayfaları 12 sütunlu CSS Grid üzerine kurulur; karelet (cell) boyutları 1×1, 2×1, 2×2, 3×2, 4×2 ve 6×2 oranlarındadır.
2.7.1 Grid Spesifikasyonu
Özellik
Değer
Not
Sütun sayısı
12 (desktop) / 8 (tablet) / 4 (mobile)
Responsive otomatik düşer
Gap
32px (desktop) / 24px (tablet) / 16px (mobile)
--space-8 / --space-6 / --space-4
Min satır yüksekliği
auto (içeriğe göre)
Sabit yükseklik kullanmayın
Maks. genişlik
1440 px
Üzerinde center
2.7.2 Bento Kart Boyut Tipolojisi
	•	Spotlight (12×3): Hero kart. Sayfada en fazla bir tane. Editorial görsel + büyük başlık.
	•	Wide (8×2): Geniş içerik kartı (chart, tablolu özet, prompt önizleme).
	•	Half (6×2): Yan yana iki kart (örn. metrik + ilgili eylem).
	•	Square (4×2): Standart Bento; ana içerik birimi. Üçlü dizilim için ideal.
	•	Compact (3×1): Tek metrik / tek aksiyon. Dörtlü grid için.
	•	Tile (2×1): Etiket veya kısayol. Altılı şerit için.
3. Bileşen Kütüphanesi
Her bileşen, atomik tasarım yöntemiyle tanımlanmıştır. Anatomi → Varyantlar → Durumlar → Davranış sırasını takip edin.
3.1 Buton
3.1.1 Anatomi
	•	İkon (sol, opsiyonel) — 16 px
	•	Etiket — text-body, weight 500
	•	Kısayol göstergesi (sağ, opsiyonel) — text-label, %52 opacity
	•	İç padding: vertical 12 px, horizontal 20 px (md)
	•	Min yükseklik: 40 px (md), 32 px (sm), 48 px (lg)
	•	Border radius: --radius-md (10 px); pill varyant için --radius-full
3.1.2 Varyantlar
Varyant
Background
Text
Kullanım
Primary
--gradient-brand
--text-on-brand
Sayfa başına 1 (CTA)
Secondary
--surface-3
--text-primary
Yan eylemler
Glass
--glass-thin
--text-primary
Görsel arka plan üstü
Ghost
transparent
--text-secondary
Toolbar, üçüncül
Danger
--danger-tint
--danger-500
Sil, iptal et
Icon-only
transparent → --surface-3 hover
--text-secondary
Toolbar simgeleri
3.1.3 Durumlar (States)
	•	Default · Hover (background -1 step daha açık + scale 1.01) · Active (scale 0.98) · Focus-visible (2 px iolite-300 ring + 2 px offset) · Disabled (opacity 0.4, cursor not-allowed) · Loading (etiket yerine spinner, genişlik kilitli)
3.1.4 Mikro-etkileşim
transition: transform 120ms cubic-bezier(0.4, 0, 0.2, 1),
            background 160ms ease-out,
            box-shadow 200ms ease-out;
3.2 Input ve Textarea
3.2.1 Anatomi
	•	Etiket (üstte, 8 px boşluklu, text-label) — opsiyonel
	•	İkon (sol, opsiyonel) — 18 px
	•	Placeholder — --text-tertiary, asla etiket yerine kullanılmaz
	•	Yardım metni / hata (altta, 6 px boşluklu, text-body-sm)
	•	Karakter sayacı (sağ alt, opsiyonel)
3.2.2 Varyantlar
	•	Default: Surface-2 background, 1 px border-default. Focus'ta 1 px iolite-500 + glow.
	•	Filled: Surface-3 background, sınır yok, alt çizgi 2 px iolite focus'ta.
	•	Inline: Tablo içi düzenleme. Background yok; hover'da hafif tint.
	•	Brief Editor (özel): Prompt Lab'in büyük textarea'sı. Min 240 px yükseklik, otomatik genişler. Markdown shortcut'ları aktif. Sağ üstte token sayacı.
3.3 Bento Card
3.3.1 Anatomi
	•	Header: Eyebrow (overline, primary renkte) + Başlık (h2 / h3) + Aksiyon ikonu (sağ)
	•	Body: İçerik (chart, tablo, metin, form, kombinasyon)
	•	Footer (opsiyonel): Meta bilgi + ikincil CTA
	•	Padding: --space-6 (standart) veya --space-8 (geniş)
	•	Background: --surface-2; border 1 px --border-default; radius --radius-lg
3.3.2 Kart Varyantları
Varyant
Görsel İmza
Kullanım
Default
Düz surface-2
Çoğu içerik kartı
Spotlight
Gradient kenar (1 px iolite→aurora)
Hero kart, sayfa başına 1
Stat
Büyük rakam ortada (display-lg)
KPI, sayısal metrik
Action
Tıklanabilir, hover'da elev-2
Yeni şablon, hızlı başlat
Live
Sol üstte ai-pulse dot
Aktif AI ajanı, çalışan job
Empty
Dashed border, merkezi içerik
Veri yok durumu
3.4 Sidebar Item
3.4.1 Anatomi
	•	İkon (16 px, sol) · Etiket (text-body, 500) · Alt-etiket (text-label, %52 op., 2. satır) · Rozet (sağ, opsiyonel: CORE / LIVE / BETA)
	•	Yatay padding 16 px, dikey 12 px; toplam yükseklik 56 px (iki satırlı)
	•	Aktif durum: Sol kenarda 3 px gradient bar + surface-3 background + iolite-300 metin
	•	Hover: surface-3 background, ikon 4 px sağa kayar (240ms)
3.5 Badge / Chip
	•	Status badge (kapsül): Solid renk + 8% opacity background, 2 px ikon noktası (dot indicator) sol başta. STANDBY · ACTIVE · ERROR · QUEUED.
	•	Filter chip: Tıklanabilir, seçili durumda iolite-500 dolgu + onay ikonu.
	•	Tag chip: Kütüphane ve şablon etiketleri için. Renk kodlu, x ile silinebilir.
	•	AI badge: Aurora renkli, ⨂ veya kıvılcım ikonu. "AI ürettiği" içerik için.
3.6 Modal & Dialog
	•	Backdrop: --surface-overlay + blur(8px); tıklayınca kapanır (destructive değilse)
	•	Container: --glass-thick, --radius-xl (24 px), max 560 px (sm) / 720 px (md) / 960 px (lg)
	•	Padding: --space-8; başlık ile içerik arası --space-6
	•	Kapanış: ESC tuşu + sağ üst X butonu (icon-only, 32 px)
	•	Footer: Sağa yaslı buton grubu; Primary en sağda, Cancel solunda
	•	Focus trap zorunlu; ilk focus'lanan eleman: en mantıklı input veya cancel buton
3.7 Command Palette (⌘K)
Power user'ların ana navigasyon aracı. Cmd+K (mac) / Ctrl+K (Windows) ile açılır.
	•	Container: --glass-thick, --radius-xl, üst-merkez konumda (top: 15vh, max-width: 640 px)
	•	Search input: ikonsuz, 56 px yükseklik, text-body-lg
	•	Sonuç listesi: gruplara ayrılmış (Sayfalar, Eylemler, Geçmiş, AI Önerileri)
	•	Her satır: ikon + başlık + alt etiket + sağda klavye kısayolu
	•	Klavye navigasyonu: ↑↓ taşı, Enter seç, Tab grup değiştir
	•	AI önerisi: Aurora renk vurgusu, üstte sabit kalır
3.8 Toast / Notification
	•	Konum: Sağ alt, --space-6 offset; üst üste yığılır (max 3, sonra eski silinir)
	•	Container: --glass-regular, --radius-lg, min 320 px / max 480 px genişlik
	•	Sol kenarda 3 px renk şeridi (success / warning / danger / info)
	•	İçerik: ikon + başlık + (opsiyonel) açıklama + (opsiyonel) aksiyon linki
	•	Otomatik kapanma: success 4 sn, info 5 sn, warning 7 sn, danger manuel
	•	Hover'da timer durur
3.9 Tablo (Data Grid)
	•	Header: surface-3 background, sticky, text-label uppercase, sıralama oklarıyla
	•	Satırlar: 48 px yükseklik (kompakt 40, geniş 56)
	•	Hover: surface-3 background tüm satıra
	•	Seçim: sol başta checkbox sütunu; seçili satır iolite-tint background
	•	Boş durum: tablo merkezi, illüstrasyon + 1 satır açıklama + CTA
	•	Sayfalama: alt sağda; "X-Y / N kayıt" + ‹ 1 2 3 › ok navigasyonu
4. Ekran Tasarımları
4.1 Landing (Public)
Yeni bir kullanıcının NeoMagic ile ilk karşılaşması. Görev: 8 saniye içinde "bu ne yapıyor ve neden bana lazım" sorusunu cevaplamak.
4.1.1 Bölüm Yapısı (Yukarıdan aşağı)
	•	01 — Top Nav (sticky glass): Logo (sol) · Ürün, Çözümler, Fiyatlandırma, Belgeler (orta) · Giriş Yap, Ücretsiz Başla (sağ). 64 px yükseklik. Scroll'da glass-thick'e dönüşür.
	•	02 — Hero Bento (12×6): Sol 7 sütun: Eyebrow ("PROMPT OPERATING SYSTEM") + Display-2xl başlık (italic karışımı, ör: "Write the brief once, keep the rest nearby.") + 2 satır açıklama + 2 CTA. Sağ 5 sütun: ürün ekranının glass-thick framelı izometrik render'ı, üzerinde 3 küçük floating chip (Live, AI Agent, Routing).
	•	03 — Sosyal kanıt şeridi: 12 sütun, 6 logo gri tonlu + "5.000+ prompt mühendisinin tercihi" cümlesi. Otomatik yatay kayma yavaş.
	•	04 — Yetenek Bento Mozaiği (12×6): Düzen: [Spotlight 8×3 "Prompt Lab"] [Square 4×3 "AI Agent"] [Half 6×2 "RAG Engine"] [Half 6×2 "Optimizer"] [Wide 8×2 "Library"] [Square 4×2 "Analytics"]. Her kart kendi içinde mini animasyon (lottie) içerir.
	•	05 — Akış demo (full-bleed): "Brief'ten cevaba 30 saniye" başlığı + 4 adımlı yatay scroll-snap bölümü. Her adımda gerçek UI screenshot + glass overlay açıklama.
	•	06 — Kullanım senaryoları (3 sütun): Pazarlama Ekibi · Geliştirici Ekibi · Eğitim Kurumları. Her senaryo: ikon + başlık + 3 madde + "Senaryo videosunu izle".
	•	07 — Fiyatlandırma (3 plan): Free · Pro · Team. Pro önerilen (gradient kenar + "Most popular" badge).
	•	08 — SSS (Accordion): 8 ana soru. Tıklayınca yumuşak açılım (240ms ease-out).
	•	09 — Final CTA (Spotlight 12×4): Gradient arka plan, merkezi başlık, tek primary CTA "Ücretsiz başla" + "Kart gerekmez" alt etiketi.
	•	10 — Footer: 4 sütun (Ürün, Şirket, Belgeler, Yasal) + alt şerit (telif, dil seçimi, sosyal medya).
Hero karar:  Mevcut ekrandaki "Write the brief once and keep the rest nearby" cümlesini Display-2xl ile koruyun, ama "keep the rest nearby" kısmını Instrument Serif italic yapın. Bu, editorial markalı tipografinin özüdür.
4.2 Login & Signup
İki sütunlu split layout. Sol: editorial içerik (marka hikayesi). Sağ: form.
4.2.1 Layout
	•	Sol panel (40% genişlik, full-height): --gradient-brand background + animated noise texture. Üstte küçük logo, ortada büyük italic alıntı ("Senin promptun, senin sistemin."), altında üç müşteri logosu.
	•	Sağ panel (60% genişlik, merkezde form): glass-thin background, max-width 400 px form. Başlık → input'lar → primary CTA → ayraç ("veya") → 3 sosyal giriş butonu (Google, GitHub, SSO).
	•	Mobilde: sol panel 240 px yüksekliğe küçülür, üstte yatay banner olur.
4.2.2 Form Davranışı
	•	Email validation: blur'da; geçersizse alt yardım metni danger-500 + ikon
	•	Password strength indicator: 4 segmentli bar (zayıf → güçlü); rengi zayıftan güçlüye doğru danger → warning → info → success
	•	"Şifremi unuttum" link: Password input'un sağ üstünde, text-label, text-tertiary
	•	Hatırla checkbox: form altında "Beni hatırla" + "Bu cihazda 30 gün"
	•	Magic Link opsiyonu: "Şifresiz giriş yap →" linki, Aurora renk
4.3 App Shell — Sidebar (Global)
Tüm uygulamanın iskelet bileşeni. Her ekranda görünür, sayfaya göre vurgu değiştirir.
4.3.1 Boyut ve Yapı
	•	Genişlik: 280 px (genişletilmiş) / 72 px (daraltılmış); Cmd+\ ile toggle
	•	Background: surface-1; sağ kenarda 1 px border-default
	•	Tepe (Brand): Logo + ürün adı + ürün rozeti (PROMPT OS); 72 px yükseklik
	•	Workspace seçici: Logo altında, sıkıştırılmış kart; aktif workspace adı + ▼; tıklayınca dropdown
	•	Ana navigasyon: 3 grup, başlıkları text-overline ile (WORKSPACE, PLATFORM, ARAÇLAR)
	•	Tabanı (User pod): Sticky alt; avatar + ad + plan rozeti + ayarlar dişli ikonu
4.3.2 Yeni Navigasyon Yapısı
Mevcut 7 öğe gruplanır ve 1 öğe eklenir (Insights).
Grup
Öğe
İkon (Lucide)
Rozet
WORKSPACE
Prompt Lab
Sparkles
CORE

Library
Library
—

AI Lab
FlaskConical
LIVE
PLATFORM
RAG Engine
Database
—

Optimizer
Activity
BETA

Insights
ChartLine
YENİ
ARAÇLAR
Şablonlar
LayoutTemplate
—

Ayarlar
Settings
—
Not:  "Analytics" → "Insights" olarak yeniden adlandırıldı. Çünkü tek başına metrik göstermiyor; AI önerileri de sunuyor. "Insights" bu çift role daha iyi oturuyor.
4.4 App Shell — Top Bar
Sayfa içeriği üstünde, sticky, başlangıçta şeffaf; scroll'da glass-thin'e dönüşür.
	•	Sol: Sayfa breadcrumb (Workspace › Prompt Lab) + sayfa başlığı (h2)
	•	Orta: Universal search (40% genişlik, ⌘K kısayollu, placeholder "Ara veya komut çalıştır...")
	•	Sağ: Status pill (STANDBY/ACTIVE) · AUTO ROUTE toggle · Bildirimler (zil) · + New (primary buton, dropdown)
	•	Yükseklik: 64 px
4.5 Prompt Lab (Yeniden Tasarım)
Ürünün kalbi. Mevcut tek sütunlu form'dan, çok-panelli iş istasyonuna geçiş.
4.5.1 Bento Layout (12 sütun)
İlk yükleme "Brief Mode". Brief üretildikten sonra "Working Mode"a geçer.
Brief Mode (boş ekran)
	•	Spotlight 8×3 (sol-üst): Editorial başlık + brief textarea + alt aksiyon şeridi
	•	Square 4×3 (sağ-üst): "Hızlı Başlat" — 4 şablon kartı (icon + ad + 1 satır açıklama)
	•	Half 6×2 (sol-alt): "Son Kullanılanlar" — listede son 5 prompt
	•	Half 6×2 (sağ-alt): "Topluluk Önerileri" — AI tarafından küratörlenmiş 3 şablon
Working Mode (brief üretildikten sonra)
	•	Sol panel (8 sütun): Brief editor (üst) + Versiyon timeline (alt)
	•	Sağ panel (4 sütun, sticky): Output preview (üst, scroll) + Routing & ayarlar (alt)
	•	Üst şerit (sayfa başlığı altı): Breadcrumb stages → Brief · Routed · Generated · Refined; tıklanabilir
4.5.2 Brief Editor Detayı
	•	Üst meta şeridi: 4 chip — Mode (Otomatik/Manuel), Detection (Auto/Manuel), Framework (Auto/RACE/CRISPE/...), Status
	•	Editor: 240 px min yükseklik, otomatik genişler. Markdown shortcut'lar (#, ##, **, [], ```), satır numarası gizli, focus'ta gradient outline
	•	Slash menü (/): "/template" şablon ekle, "/var" değişken, "/ref" referans dosya, "/system" system prompt bölümü
	•	Sağ üst köşe: Token counter (renkli — yeşil <70%, sarı 70-90%, kırmızı >90%) + Hesap
	•	Alt aksiyon şeridi: Primary CTA "Generate prompt" (sol) · Secondary "Try an example" · Tertiary linkler (Open templates, Attach file, Show advanced)
	•	Show advanced açılınca: Glass-tinted alt panel açılır — Temperature slider, Max tokens, Top-P, Stop sequences, System prompt overlay
4.5.3 Output Panel
	•	Sticky sağ panel; içeriden kart formatında result
	•	Üst şerit: Model adı + üretilme zamanı + token kullanımı + 3 ikon (kopyala, paylaş, daha fazla menüsü)
	•	İçerik: Markdown render edilmiş; kod blokları kendi temasıyla (jetbrains mono, syntax highlight)
	•	Hover'da satır highlight + sol kenarda ⋯ menüsü ("Bu satırı geliştir", "Yeniden yaz", "Açıkla")
	•	Alt: Reaction chip'leri (👍 / 👎 / Save to library) + ek bağlam alanı
	•	Karşılaştırma modu: Tek tıkla 2 modeli yan yana çağırır; her sütun bağımsız scroll
4.5.4 Routing & Ayarlar Paneli
	•	Auto-Route durumu: Kullanılan model + neden seçildiği ("Hız öncelikli" / "Kalite öncelikli" / "Maliyet öncelikli")
	•	Manuel override: 3 dropdown — Provider, Model, Strategy
	•	Çoklu model: "+ Add comparison" linki ile aynı brief'i farklı modellere göndermek
	•	Bağlam: Eklenmiş dosyalar listesi (gri liste + sil ikonu)
	•	Geçmiş bağlantı: "Bu brief için önceki 3 versiyon" linki — versiyon timeline'ına atlar
4.6 Library
Promptlar, koleksiyonlar, paylaşılan şablonlar. Mevcut basit listeden, koleksiyon mimarisine geçer.
4.6.1 Layout
	•	Sol filtre paneli (240 px): Koleksiyonlar (akordeon) + Etiketler (chip listesi) + Tarih aralığı + Sahip filtresi
	•	Ana içerik: Üstte view toggle (Grid / List / Kanban) + sıralama + arama; altta kart gridi
	•	Grid varsayılan: 3 sütun bento (her kart Square 4×2); kanban için 4 kolon (Draft / Reviewing / Approved / Archived)
	•	Her prompt kartı: Eyebrow (kategori) + Başlık + 2 satır preview + footer (avatar + tarih + kullanım sayısı)
	•	Hover: Kart yükselir + sağ üstte 3 ikon belirir (yıldız, paylaş, çoğalt)
	•	Çoklu seçim: Shift+click ile aralık; toplu eylem barı altta floating glass-thick (Sil, Etiketle, Taşı, Dışa Aktar)
4.7 AI Lab (Agent Flow)
AI ajanlarının zincir akışlarını tasarlama ve test etme alanı. Yeni mimari: node-edge canvas.
4.7.1 Layout
	•	Canvas (orta, full-bleed): Node-edge editor; surface-base background + 24 px noktalı grid
	•	Sol panel (240 px, daraltılabilir): Node Library — kategori sekmeleri (Triggers / Models / Tools / Logic / Outputs) + her sekmede sürüklenebilir node listesi
	•	Sağ panel (320 px, daraltılabilir): Inspector — seçili node'un ayarları; node yoksa "Run history" sekmesi
	•	Üst şerit: Akış adı (inline edit) + Run/Stop butonu (primary) + Debug toggle + Versiyon menüsü + Paylaş
	•	Alt şerit: Console (collapse'lı) — log akışı, hata, token kullanımı
4.7.2 Node Görselleri
	•	Her node bir mini glass-regular kart; üst şerit kategori rengi; alt iki port (in/out, sürüklenebilir)
	•	Çalışırken: ai-pulse + iolite glow
	•	Hata: danger-500 kenar + alt şeritte hata özeti
	•	Edge'ler (bağlantılar): bezier curve, kalınlık 2 px; veri akarken animated dash; renk veri tipiyle eşleşir (text→iolite, json→aurora, file→success)
4.8 RAG Engine
Bilgi bankası kurulumu ve test. Document-centric yapı.
	•	Üst Bento (8×2 + 4×2): Toplam doküman sayısı + index durumu (sol) | Hızlı upload zone (sağ, drag-drop)
	•	Orta tablo (12×4): Doküman tablosu — ad, boyut, tip, vector count, son indekslenme, durum, eylem
	•	Alt Bento (12×2): RAG playground — soru sor, görülecek embedding'leri gör, retrieval kalitesini test et
	•	Drag-drop davranışı: Tüm sayfa overlay; "Bırak ve indekslemeye başla" mesajı
4.9 Optimizer
A/B prompt karşılaştırma ve diff aracı. Code editor estetiği.
	•	Layout: Sol-sağ split (her biri 6 sütun); ortada ince diff göstergesi
	•	Her panel: Üstte versiyon seçici (dropdown), altında prompt editor (mono font), altta metrik özeti (token, latency, kalite skoru)
	•	Diff modu: Inline kırmızı-yeşil işaretleme, satır numarası boyunca işaret köprüsü
	•	Alt karşılaştırma sonuçları (12×3): Run by run; tablo formatında; mini sparkline ile kalite trendi
4.10 Insights (Eski: Analytics)
Sadece chart değil, AI'in kullanıma dair çıkardığı sonuçları da gösteren ekran.
	•	Üst tarih aralığı: 7G / 30G / 90G / Özel; segment selector (Workspace / Project / User)
	•	KPI satırı (4 × Compact 3×1): Toplam Run, Ortalama Latency, Toplam Token, Tasarruf %
	•	Wide 8×3 (sol): Run trendi line chart; üstte mod toggle (Volume / Cost / Quality)
	•	Square 4×3 (sağ): Top kullanılan promptlar — list + bar
	•	Half 6×2 + Half 6×2: Model dağılımı donut + Hata oranı line
	•	AI Insights kartı (Spotlight 12×2): "Bu hafta dikkat etmen gereken 3 şey" — AI tarafından üretilmiş kısa içgörüler, her biri bir aksiyon link'i ile
4.11 Settings
İki sütunlu klasik ayarlar; ama her bölüm bir Bento kart.
	•	Sol panel (240 px): Bölüm menüsü — Profil, Workspace, Sağlayıcılar, Faturalandırma, Güvenlik, API, Webhooks, Tehlikeli Bölge
	•	Sağ içerik: Seçili bölüm; her ayar grubu kendi Bento kartında
	•	Form davranışı: Auto-save (değişiklik sonrası 2 sn idle'da kaydet); başarı toast + sağ üstte küçük "Saved" badge
	•	Tehlikeli Bölge: Danger renk şeridi, tüm aksiyonlar onay modal'ı ister + şifre yeniden girişi
5. Etkileşim & Hareket
5.1 Hareket Felsefesi
Hareket durum değişikliklerini iletir; süsleme değildir. Üç sınıf hareket vardır:
	•	Mikro: ≤ 200 ms — buton hover, focus, küçük durum geçişleri.
	•	Geçişsel: 200-400 ms — modal açılma, panel kayma, sayfa içi navigasyon.
	•	Anlatımsal: 400-800 ms — sayfa geçişi, onboarding adımları, hero animasyonu. Nadiren.
5.2 Easing Eğrileri
Token
Bezier
Kullanım
--ease-snap
cubic-bezier(0.4, 0, 0.2, 1)
Standart geçişler (mikro)
--ease-out
cubic-bezier(0.16, 1, 0.3, 1)
Modal/panel açılma
--ease-in
cubic-bezier(0.7, 0, 0.84, 0)
Çıkış animasyonları
--ease-spring
cubic-bezier(0.34, 1.56, 0.64, 1)
CTA, başarı bildirimi
--ease-linear
linear
Loading, progress
5.3 Süre Skalası
	•	--duration-instant: 80 ms — focus, küçük durum
	•	--duration-fast: 160 ms — hover, button press
	•	--duration-base: 240 ms — standart geçiş, dropdown
	•	--duration-slow: 400 ms — modal, drawer
	•	--duration-slower: 600 ms — sayfa geçişi, hero giriş
5.4 Önemli Etkileşim Senaryoları
5.4.1 "Generate Prompt" Tıklandığında
	•	Buton içeriği fade out (80ms), spinner fade in (80ms)
	•	Ana brief container'ında 1 px iolite-300 outline glow başlar (ai-pulse)
	•	Sağ output paneli skeleton state'e geçer (içerik shimmer)
	•	Token sayacı sıfırlanır, gerçek zamanlı sayar
	•	İlk token geldiğinde: skeleton kaybolur, harf harf typewriter (her 8ms 1 karakter, max ~120 chr/sn'ye limitli)
	•	Tamamlandığında: ai-pulse durur, başarı toast belirir, brief'e "Versiyon eklendi" rozeti düşer
5.4.2 Sidebar Daraltma
	•	Trigger: Cmd+\ veya başlıktaki collapse ikonu
	•	280 → 72 px width transition: 240 ms ease-out
	•	Etiketler opacity fade (160 ms, gecikme 0)
	•	Ana içerik margin-left transition'la (240 ms ease-out)
	•	Daraltılmış durumda hover'da tooltip (300 ms gecikmeli)
5.4.3 Bento Kart Sürükleme (Library Kanban)
	•	MouseDown 200 ms basılı tutulunca: kart 1.04× scale + elev-3 + cursor: grabbing
	•	Sürükleme: kart yarı şeffaf (0.85), placeholder eski yerinde dashed border ile durur
	•	Drop zone hover: kolon iolite-tint background
	•	Drop: spring easing ile yeni konuma yerleşir (300 ms), elev-1'e döner
5.4.4 Command Palette Açılma
	•	Cmd+K → backdrop fade in 80 ms
	•	Container scale(0.96) → scale(1) + opacity 0 → 1, ease-out 240 ms
	•	Search input otomatik focus, caret blink
	•	Yazma sırasında sonuç listesi her tuşta micro-stagger (her satır 16ms gecikmeli)
5.5 Mikroetkileşim Detayları
	•	Button press: scale 0.98, 80 ms; bırakınca spring geri dönüş 160 ms
	•	Input focus: border 1 px → 2 px iolite + glow (100 ms ease-out)
	•	Toggle switch: dot kayar 200 ms ease-snap; arkaplan rengi paralel geçiş
	•	Checkbox: işaret çizgisi stroke-dashoffset animasyonu (160 ms)
	•	Tooltip: 600 ms hover gecikme, sonra 80 ms fade in; out 80 ms gecikmesiz
5.6 Erişilebilirlik İçin Hareket Azaltma
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
  .ai-pulse { animation: none; opacity: 0.5; }
}
Bu kullanıcılar için: vestibüler bozukluk veya migren tetikleyicileri olmaması esas. Kritik geri bildirim sinyalleri (focus, error) korunur ama animasyon süresi 0'a yakın olur.
6. Figma Kurulum Rehberi
Tasarım sistemini Figma'da uygulamanın doğru yolu. Bu yapı, hem tasarımcı hem geliştirici için tek doğru kaynak (single source of truth) olur.
6.1 Dosya Yapısı
Üç ayrı Figma dosyası önerilir:
	•	01 — Foundations (Library): Variables, color/text/effect styles, ikonografi. Yayımlanmış kütüphane.
	•	02 — Components (Library): Tüm bileşen setleri (Button, Input, Card, vb.). Foundations'tan beslenir, yayımlanır.
	•	03 — Product (Working): Asıl ekran tasarımları. Components'tan instance kullanır. Yayımlanmaz.
6.2 Pages (Sayfa) Yapısı
Foundations dosyası içinde:
	•	🎨 00 · Cover
	•	🌈 01 · Color Variables
	•	🔤 02 · Typography
	•	📏 03 · Spacing & Radius
	•	✨ 04 · Effects (shadows, glass)
	•	🎭 05 · Iconography (Lucide set)
	•	📐 06 · Grid System (Bento)
	•	📚 07 · Documentation
Components dosyası içinde:
	•	📦 00 · Cover
	•	🔘 Atoms · Buttons / Inputs / Badges / Avatars / Switches / Checkboxes / Radios
	•	🧩 Molecules · Form Field / Search / Pagination / Breadcrumb / Tabs / Tooltip
	•	🏗 Organisms · Sidebar / TopBar / Modal / Bento Card / Table / Toast / Command Palette
	•	📑 Templates · Auth Layout / App Shell / Bento Grids
	•	📚 Documentation
Product dosyası içinde:
	•	🌍 00 · Cover & Roadmap
	•	🚪 01 · Landing Page
	•	🔐 02 · Auth (Login / Signup / Forgot)
	•	🧪 03 · Prompt Lab (Brief Mode + Working Mode)
	•	📚 04 · Library
	•	🤖 05 · AI Lab
	•	🗄 06 · RAG Engine
	•	📊 07 · Insights
	•	⚙ 08 · Optimizer
	•	⚙ 09 · Settings
	•	📱 10 · Responsive Variants
	•	🎬 11 · Prototypes
6.3 Variables (Değişkenler)
Figma Variables, design token'ların Figma karşılığıdır. 4 koleksiyon halinde organize edilir:
Koleksiyon
Mode'lar
İçerik
Color
Dark / Light
Tüm renkler primitive ve semantic olarak iki katmanda. Semantic'ler primitive'lere bağlanır.
Spacing
Default
--space-0 ile --space-24 arası 11 değişken (number type).
Radius
Default
7 radius değişkeni (number type).
Typography
Desktop / Mobile
Font size, line-height, letter-spacing değişkenleri. Mobile mode'da -1 step otomatik.
6.4 Renk Variable Yapısı (Önemli)
İki katman kullanın: Primitive (ham renkler) ve Semantic (anlamlı renkler). Semantic'ler primitive'lere bağlanır. Bu sayede tema değiştirmek için sadece semantic'leri yeniden eşlersiniz.
Primitive katman:
Primitives/Iolite/300 → #A5B0FF
Primitives/Iolite/500 → #5B6BFF
Primitives/Iolite/700 → #3B4BD9
Primitives/Aurora/500 → #9B7BFF
Primitives/Neutral/950 → #070A14
Primitives/Neutral/900 → #0D1220
(... ve diğerleri)
Semantic katman:
Semantic/Surface/Base       → Primitives/Neutral/950
Semantic/Surface/Card       → Primitives/Neutral/800
Semantic/Brand/Primary      → Primitives/Iolite/500
Semantic/Text/Primary       → Primitives/Neutral/50
Semantic/Text/Secondary     → Primitives/Neutral/300
(... ve diğerleri)
Kural:  Tasarım dosyalarında SADECE Semantic kullanın. Primitive doğrudan asla atanmamalıdır. Bu sayede ileride Light Mode eklemek bir saatlik iş olur, üç haftalık değil.
6.5 Effect Styles (Efekt Stilleri)
Glass varyantları, elevation seviyeleri, glow efektleri Figma effect style olarak kaydedilir.
	•	Glass / Thin (background blur 8 + fill rgba)
	•	Glass / Regular (background blur 16 + fill rgba)
	•	Glass / Thick (background blur 24 + fill rgba)
	•	Elevation / 1, 2, 3, 4 (drop shadow + iç highlight için ekstra layer)
	•	Glow / AI Pulse (outer glow iolite)
	•	Glow / Focus Ring (drop shadow 0 0 0 2 px iolite-300)
İç highlight (inner highlight) ipucu:  Figma drop shadow'da iç gölge tek başına yeterli değil. Cam efekt için ayrı bir 1 px üst stroke (linear gradient white→transparent) eklemek gerekir. Bu, bileşen şablonu içinde bir auto-layout child olarak konumlanır.
6.6 Bileşen Yapısı (Component Structure)
6.6.1 Naming Convention
[Atomic Level] / [Component Name] / [Variant] / [Size] / [State]
Örnekler:
Atom/Button/Primary/Md/Default
Atom/Button/Primary/Md/Hover
Molecule/FormField/Default/Filled
Organism/BentoCard/Spotlight/Live
6.6.2 Variant Property'leri
Her bileşen için tutarlı property kullanımı:
	•	Variant: Visual style (Primary, Secondary, Ghost, ...)
	•	Size: Sm / Md / Lg
	•	State: Default / Hover / Active / Focus / Disabled / Loading
	•	HasIcon: Boolean (sol ikon)
	•	HasShortcut: Boolean (sağ kısayol)
	•	Mode: Brief / Working (sayfaya özel bileşenlerde)
6.6.3 Auto-layout Kuralları
	•	Tüm bileşenler auto-layout. Manuel pozisyonlama yasak.
	•	Padding her zaman variable kullanır (--space-X)
	•	Gap aynı şekilde variable
	•	Sizing: Hug contents (içeriğe sarmal) varsayılan; Fill container ihtiyaca göre
	•	Çocukların absolute position kullanması yasak (yalnızca tooltip ve dot indicator gibi overlay'lerde)
6.7 Grid Setup (Layout Grid)
Her ekran için layout grid:
Breakpoint
Min-W
Sütun
Margin / Gutter
Mobile
320
4
16 / 16
Tablet
768
8
32 / 24
Desktop
1024
12
48 / 32
Wide
1440
12
max-w 1440, center / 32
6.8 Prototyping
	•	Her ana akış için prototype: Brief→Generate→Output, Library kanban drag-drop, Sidebar collapse, Command palette
	•	Smart animate kullan; süre token'lara uygun (160 ms / 240 ms / 400 ms)
	•	Easing: ease-out kullan (Figma'da 'Ease in and out' DEĞİL — bu eski stil)
	•	Conditional logic ile: hover state'ler, form validasyon
6.9 Devs için Inspect Modu
	•	Variables açık olmalı — geliştirici hangi token'ın kullanıldığını görsün
	•	Component description her bileşenin açıklamasını içerir (Markdown destekli)
	•	Code snippet preset: "React + Tailwind" config
	•	Section'lar dev mode'da "ready for dev" işaretlenir
7. Geliştirme Notları (Implementation)
7.1 Tavsiye Edilen Teknoloji Yığını
	•	Framework: Next.js 14+ (App Router)
	•	Styling: Tailwind CSS v4 + CSS Variables (token'lar Tailwind config'e değil :root'a)
	•	Bileşenler: Radix UI primitives (headless) + kendi shell
	•	Hareket: Framer Motion (sayfa geçişi, complex), CSS (mikro)
	•	İkonlar: Lucide React
	•	Form: React Hook Form + Zod
	•	Charts: Recharts veya Visx
7.2 CSS Variable Yapısı
Token'lar :root'ta tanımlanır; Tailwind utility'ler bunları kullanır. Tema değiştirme için data-theme attribute'u.
:root, [data-theme='dark'] {
  /* Surface */
  --surface-base: #070A14;
  --surface-1: #0D1220;
  --surface-2: #141A2E;
  --surface-3: #1C233D;

  /* Brand */
  --iolite-300: #A5B0FF;
  --iolite-500: #5B6BFF;
  --iolite-700: #3B4BD9;
  --aurora-500: #9B7BFF;
  --gradient-brand: linear-gradient(135deg, #5B6BFF 0%, #9B7BFF 100%);

  /* Text */
  --text-primary: #F5F7FF;
  --text-secondary: #B8C0D9;
  --text-tertiary: #7A8299;

  /* Spacing (rem-based) */
  --space-1: 0.25rem;
  --space-2: 0.5rem;
  --space-3: 0.75rem;
  --space-4: 1rem;
  --space-6: 1.5rem;
  --space-8: 2rem;
  /* ... */

  /* Radius */
  --radius-md: 0.625rem;
  --radius-lg: 1rem;
  --radius-xl: 1.5rem;

  /* Motion */
  --duration-fast: 160ms;
  --duration-base: 240ms;
  --ease-snap: cubic-bezier(0.4, 0, 0.2, 1);
  --ease-out: cubic-bezier(0.16, 1, 0.3, 1);
}
7.3 Tailwind Config (Önemli Bölümler)
// tailwind.config.ts
export default {
  theme: {
    extend: {
      colors: {
        surface: {
          base: 'var(--surface-base)',
          1: 'var(--surface-1)',
          2: 'var(--surface-2)',
          3: 'var(--surface-3)',
        },
        iolite: {
          300: 'var(--iolite-300)',
          500: 'var(--iolite-500)',
          700: 'var(--iolite-700)',
        },
        // ...
      },
      backdropBlur: {
        thin: '8px',
        regular: '16px',
        thick: '24px',
      },
      borderRadius: {
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
        xl: 'var(--radius-xl)',
      },
      fontFamily: {
        display: ['Instrument Serif', 'Georgia', 'serif'],
        sans: ['Inter Variable', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
    },
  },
}
7.4 Bileşen Mimarisi (Yapı Önerisi)
src/
├── app/                    # Next.js App Router
├── components/
│   ├── ui/                # Atomik bileşenler (Button, Input, Card)
│   ├── shell/             # Sidebar, TopBar, AppLayout
│   ├── prompt-lab/        # Sayfa-özel bileşenler
│   ├── library/
│   └── ai-lab/
├── lib/
│   ├── tokens.ts          # Token'ların TS tipleri
│   ├── motion.ts          # Framer presets
│   └── utils.ts
├── styles/
│   ├── globals.css        # CSS variables (:root)
│   └── tokens.css         # Token tanımları
└── hooks/
7.5 Glass Bileşeni Örnek (React)
// components/ui/glass-panel.tsx
import { cn } from '@/lib/utils';

interface GlassPanelProps {
  variant?: 'thin' | 'regular' | 'thick' | 'tinted';
  className?: string;
  children: React.ReactNode;
}

export function GlassPanel({ variant = 'regular', className, children }: GlassPanelProps) {
  return (
    <div
      className={cn(
        'rounded-xl border border-white/10',
        'shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_24px_48px_-12px_rgba(0,0,0,0.45)]',
        variant === 'thin' && 'bg-surface-2/40 backdrop-blur-thin',
        variant === 'regular' && 'bg-surface-2/55 backdrop-blur-regular',
        variant === 'thick' && 'bg-surface-1/72 backdrop-blur-thick',
        variant === 'tinted' && 'bg-iolite-500/10 backdrop-blur-regular border-iolite-500/30',
        className
      )}
    >
      {children}
    </div>
  );
}
7.6 Performans Notları
	•	backdrop-filter pahalıdır — sayfada aynı anda 3'ten fazla aktif glass katman olmamalı
	•	Sidebar gibi her zaman görünür element'lerde glass DEĞİL solid surface kullanın
	•	CSS contain: layout style ile bento kartlarda re-paint izole edilir
	•	Animasyon transform ve opacity üzerinde olmalı; width/height/top/left animasyonu yasak (kompozisyon dışı)
	•	Charts için lazy loading ve viewport-based render
	•	Prompt çıktısı için virtualization (react-virtual) — 10K+ token output'lar için
8. Erişilebilirlik (WCAG 2.2 AA)
8.1 Renk Kontrastı
Tüm metin ve interaktif elementler minimum AA standardını karşılar. Tablo Bölüm 2.1'de her token'ın WCAG kontrast oranı belirtilmiştir.
	•	Normal metin: 4.5:1 minimum
	•	Büyük metin (24px+): 3:1 minimum
	•	İnteraktif sınırlar (border): 3:1 minimum
	•	Focus indicator: 3:1 minimum, ek olarak 2 px kalınlık
8.2 Klavye Navigasyonu
	•	Tüm interaktif elementler Tab ile erişilebilir, mantıklı tab order
	•	Modal açıldığında focus modal'a hapsolur (focus trap), kapanınca tetikleyiciye döner
	•	Skip-to-content linki Tab ile ilk gelir, görünmez ama focus'ta görünür hale gelir
	•	Klavye kısayolları: Cmd+K (palette), Cmd+Enter (run), Cmd+S (save), Cmd+/ (help), Cmd+\ (sidebar)
	•	Tüm kısayollar Settings'te görüntülenebilir ve yeniden atanabilir
8.3 Ekran Okuyucu Desteği
	•	Tüm icon-only butonlar aria-label içerir
	•	Status değişiklikleri aria-live region ile bildirilir
	•	Loading state aria-busy="true" ile işaretlenir
	•	Form validasyon hataları aria-describedby ile alana bağlıdır
	•	Modal role="dialog" ve aria-modal="true" içerir
	•	Toast'lar role="status" veya role="alert" (severity'ye göre)
	•	Bento grid'de heading sırası bozulmaz (h1 → h2 → h3 lineer)
8.4 Focus Yönetimi
	•	Focus indicator her zaman görünür (outline none yasak; özel ring kullanılır)
	•	:focus-visible kullanın — fare tıklamasında değil yalnızca klavye focus'unda
	•	Skeleton loading sırasında focus pozisyonu korunur
	•	Sayfa geçişlerinde focus ana içerik başlangıcına taşınır
8.5 Hareket ve Düşük Veri Modu
	•	prefers-reduced-motion: animasyon süreleri 0'a yakın
	•	prefers-reduced-transparency: glass efektleri solid surface'lara dönüşür
	•	prefers-color-scheme: light: Light mode otomatik aktif (Phase 2)
	•	Auto-play medya yok; ai-pulse de pause'lanabilir
8.6 Form Erişilebilirliği
	•	Her input <label> ile bağlıdır (placeholder asla label yerine geçmez)
	•	Hata mesajları input'tan sonra gelir, aria-describedby ile bağlanır
	•	Required işareti hem görsel (*) hem semantik (required attribute)
	•	Input grupları fieldset + legend ile sarılır
	•	Error özetleri form üstünde, aria-live="polite"
8.7 Touch Hedef Boyutları
	•	Tüm interaktif elementler minimum 44x44 px touch target (Apple) / 48x48 px (Android)
	•	Icon-only butonlar görsel olarak küçük olsa bile padding ile genişletilir
	•	Bitişik tıklanabilir elementler arasında minimum 8 px boşluk
9. Responsive Strateji
9.1 Breakpoint Sistemi
	•	xs: 0-639 px (mobile portrait)
	•	sm: 640-767 px (mobile landscape)
	•	md: 768-1023 px (tablet)
	•	lg: 1024-1279 px (laptop)
	•	xl: 1280-1439 px (desktop)
	•	2xl: 1440+ px (wide)
9.2 Mobilde Strüktür Değişiklikleri
	•	Sidebar: Drawer'a dönüşür; alt navbar (4 ana öğe) eklenir
	•	TopBar: Search ikonik buton'a, Status badge gizlenir (palette'te erişilebilir)
	•	Bento grid: Tüm kartlar tam genişlik, dikey stack
	•	Prompt Lab: Tek sütun; output panel altta sticky bottom-sheet
	•	Library: Liste görünüm varsayılan, grid sadece yatay tablette
	•	AI Lab: Canvas zoom out + node listesi alt sheet
	•	Modal: Bottom sheet'e dönüşür (slide up)
	•	Tablo: Yatay scroll yerine kart-stack (her satır mini kart)
9.3 Tablet Özel Davranışları
	•	Sidebar daraltılmış olarak başlar (72 px)
	•	İki sütun bento mümkün ama 3+ değil
	•	Side panel'ler overlay olur (içerik üstüne kayar)
9.4 Wide Ekran (1440+)
	•	Maks. genişlik 1440 px; üzerinde center, kenarlarda surface-base
	•	Bento grid 12 sütun korunur
	•	Prompt Lab 8+4 yerine 9+3 olur (output panel daralır)
10. Yol Haritası ve Önceliklendirme
10.1 Phase 1 — Foundations (4 hafta)
	•	Design token sistemini Figma Variables olarak kur
	•	Atomik bileşenleri (Button, Input, Badge, Card) tasarla ve kodla
	•	App Shell (Sidebar + TopBar) yeniden yap
	•	Karanlık tema CSS variable'larını canlı sisteme entegre et
Çıktı:  Tüm uygulama yeni shell'i kullanır. Eski sayfa içerikleri henüz değişmemiş olabilir.
10.2 Phase 2 — Prompt Lab Yenileme (3 hafta)
	•	Brief Mode + Working Mode mimarisini uygula
	•	Output panel sticky right + comparison mode
	•	Slash menü, token sayacı, advanced panel
	•	Versiyon timeline'ı
Çıktı:  Ürünün ana ekranı yenilenmiş. Kullanıcı feedback toplama döngüsü başlar.
10.3 Phase 3 — Library + Insights (2 hafta)
	•	Library kanban + grid + list view'leri
	•	Insights (eski Analytics) yeni ad ve AI insights kartı
	•	Command Palette (Cmd+K) tüm uygulama genelinde
10.4 Phase 4 — AI Lab + RAG + Optimizer (4 hafta)
	•	AI Lab node-edge canvas (en kompleks parça, ayrı sprint)
	•	RAG Engine document table + playground
	•	Optimizer diff viewer
10.5 Phase 5 — Public Surface (3 hafta)
	•	Yeni Landing Page
	•	Auth ekranları (Login, Signup, Forgot)
	•	Settings yeniden organize
	•	Documentation site iskeleti
10.6 Phase 6 — Cilalama (2 hafta)
	•	Light mode (Phase 2 olarak söz verilen)
	•	Tüm prefers-* media query'leri
	•	Mobil deneyim final cilası
	•	WCAG 2.2 AA denetim
	•	Performance audit (Lighthouse 95+ hedefli)
10.7 Toplam Süre ve Risk
Toplam tahmini süre: 18 hafta (~4.5 ay) tek tasarımcı + 2 geliştirici ekibi için. AI Lab'ın canvas mimarisi en yüksek risk; isterse Phase 4'te kapsamı daraltılabilir (canvas yerine lineer adım listesi).
Tavsiye:  Phase 1 ve 2 paralel kodlanırken, Phase 3+ Figma'da paralel tasarlanmalı. Bu sayede her phase başlarken tasarım hazır olur, geliştirici beklemez.
11. Ekler
11.1 Asset Listesi (İndirilecekler)
	•	Inter Variable — rsms.me/inter — OFL Lisansı
	•	Instrument Serif — fontshare.com/fonts/instrument-serif — Free Commercial
	•	JetBrains Mono — jetbrains.com/lp/mono — Apache 2.0
	•	Lucide Icons — lucide.dev — ISC Lisansı
11.2 Referans / İlham
	•	Linear app — bilgi yoğunluğu, klavye odaklı UX
	•	Vercel dashboard — modern dark mode
	•	Arc browser — bento ve mod geçişleri
	•	Raycast — command palette referansı
	•	Apple Vision OS — glassmorphism uygulama detayları
11.3 Kontrol Listesi (Her Ekran İçin)
	•	[ ] Karanlık tema kontrast tüm metinler için ≥ 4.5:1
	•	[ ] Klavye ile tüm aksiyonlar erişilebilir
	•	[ ] Focus state her zaman görünür
	•	[ ] 320 px genişliğe kadar bozulmadan çalışır
	•	[ ] Loading state, empty state, error state tasarımı var
	•	[ ] Animasyonlar reduce-motion'da pasif
	•	[ ] Tüm metin string'leri çevrilebilir (i18n hazır)
	•	[ ] Touch hedefleri ≥ 44 px
	•	[ ] aria-label, role, aria-live doğru kullanılmış
	•	[ ] Token'lar dışında hardcoded değer yok
11.4 Sözlük
Terim
Açıklama
Bento Grid
Japon yemek kutusundan esinlenen, farklı boyutlarda ama hizalı kart yerleşim sistemi.
Glassmorphism
Buzlu cam efekti. Backdrop-blur + yarı saydam fill + ince border.
Design Token
Tasarım kararının (renk, boşluk, vb.) atomik birim halinde tanımı.
Spotlight Card
Sayfada en çok dikkat çeken hero kart; sayfa başına 1 tane.
Brief Mode / Working Mode
Prompt Lab'ın iki durumu: brief yazılırken vs. brief üretildikten sonra.
AI Pulse
Aktif AI işlemi olduğunu gösteren glow + nabız animasyonu.
Iolite / Aurora
Marka renkleri. Iolite mavi-mor (primary), Aurora mor (accent).
11.5 Sürüm Notu
Versiyon 1.0 · Nisan 2026
Bu doküman canlı bir spesifikasyondur. Tasarım sistemi olgunlaştıkça güncellenir. Önemli değişiklikler için PR review süreci uygulanır.
İletişim: tasarim@neomagic.app · #design Slack kanalı

—  Brief sonu  —
