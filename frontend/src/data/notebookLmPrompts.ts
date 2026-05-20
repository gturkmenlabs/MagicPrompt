/**
 * NotebookLM Prompt Kutuphanesi
 * Google NotebookLM (Chat + Studio) for optimize edilmis prompt koleksiyonu.
 * Kaynak: Resmi dokumantasyon + web derlemesi
 */

export interface NotebookLmPrompt {
  id: string;
  category: string;
  categoryEn: string;
  name: string;
  nameEn: string;
  prompt: string;
  promptEn: string;
  tags: string[];
}

export const NOTEBOOKLM_PROMPTS: NotebookLmPrompt[] = [
  // ═══════════════════════════════════════════════════════════
  // 1) ALTIN KURAL — Hallucination Azaltan Prompt Ekleri
  // ═══════════════════════════════════════════════════════════
  {
    id: 'nlm-gold-source',
    category: 'Altin Kural',
    categoryEn: 'Golden Rules',
    name: 'Kaynak Disiplini',
    nameEn: 'Source Discipline',
    prompt: 'Sadece secili kaynaklari kullan. Kaynakta yoksa "Kaynaklarda gecmiyor" de.',
    promptEn: 'Sadece secili kaynaklari kullan. Kaynakta yoksa "Kaynaklarda gecmiyor" de.',
    tags: ['hallucination', 'kaynak', 'dogruluk'],
  },
  {
    id: 'nlm-gold-evidence',
    category: 'Altin Kural',
    categoryEn: 'Golden Rules',
    name: 'Kanit Formati',
    nameEn: 'Evidence Format',
    prompt: 'Her onemli iddia for tiklanabilir alinti/citation ekle; mumkunse ilgili cumleyi kisa alintila (≤ 20 kelime).',
    promptEn: 'Her onemli iddia for tiklanabilir alinti/citation ekle; mumkunse ilgili cumleyi kisa alintila (≤ 20 kelime).',
    tags: ['citation', 'alinti', 'kanit'],
  },
  {
    id: 'nlm-gold-uncertainty',
    category: 'Altin Kural',
    categoryEn: 'Golden Rules',
    name: 'Belirsizlik Yonetimi',
    nameEn: 'Uncertainty Management',
    prompt: 'Emin olmadigin noktalari madde madde "Belirsiz/Varsayim" diye isaretle.',
    promptEn: 'Emin olmadigin noktalari madde madde "Belirsiz/Varsayim" diye isaretle.',
    tags: ['belirsizlik', 'dogruluk', 'varsayim'],
  },
  {
    id: 'nlm-gold-output',
    category: 'Altin Kural',
    categoryEn: 'Golden Rules',
    name: 'Output Standardi',
    nameEn: 'Output Standard',
    prompt: 'Cevabi: (1) Kisa ozet, (2) Detay, (3) Kaynaklara dayali alintilar tablosu seklinde ver.',
    promptEn: 'Cevabi: (1) Kisa ozet, (2) Detay, (3) Kaynaklara dayali alintilar tablosu seklinde ver.',
    tags: ['format', 'yapi', 'standart'],
  },

  // ═══════════════════════════════════════════════════════════
  // 2) OZET / CIKARIM PROMPTLARI
  // ═══════════════════════════════════════════════════════════
  {
    id: 'nlm-summary-exec',
    category: 'Ozet / Cikarim',
    categoryEn: 'Summary / Extraction',
    name: 'Yonetici Ozeti',
    nameEn: 'Executive Summary',
    prompt: 'Bu kaynaklardan 8 maddeyi gecmeyen bir yonetici ozeti cikar. Her maddeye citation ekle.',
    promptEn: 'Bu kaynaklardan 8 maddeyi gecmeyen bir yonetici ozeti cikar. Her maddeye citation ekle.',
    tags: ['ozet', 'yonetici', 'executive'],
  },
  {
    id: 'nlm-summary-tldr',
    category: 'Ozet / Cikarim',
    categoryEn: 'Summary / Extraction',
    name: 'TL;DR + Kritik Detaylar',
    nameEn: 'TL;DR + Critical Details',
    prompt: "Once 5 satirlik TL;DR, sonra 'Kritik detaylar' (en fazla 10 madde). Her madde citation'li.",
    promptEn: "Once 5 satirlik TL;DR, sonra 'Kritik detaylar' (en fazla 10 madde). Her madde citation'li.",
    tags: ['ozet', 'tldr', 'detay'],
  },
  {
    id: 'nlm-summary-concept',
    category: 'Ozet / Cikarim',
    categoryEn: 'Summary / Extraction',
    name: 'Kavram Cercevesi',
    nameEn: 'Concept Framework',
    prompt: 'Konuyu (a) Tanimlar, (b) Ana tezler, (c) Kanitlar, (d) Karsi argumanlar seklinde semala.',
    promptEn: 'Konuyu (a) Tanimlar, (b) Ana tezler, (c) Kanitlar, (d) Karsi argumanlar seklinde semala.',
    tags: ['kavram', 'cerceve', 'analysis'],
  },
  {
    id: 'nlm-summary-changelog',
    category: 'Ozet / Cikarim',
    categoryEn: 'Summary / Extraction',
    name: '"Ne Degisti?" Ozeti',
    nameEn: '"What Changed?" Summary',
    prompt: "Bu dokumanda onceki yaklasima gore neler degismis? 'Degisiklik → Etki → Kanit' tablosu yap.",
    promptEn: "Bu dokumanda onceki yaklasima gore neler degismis? 'Degisiklik → Etki → Kanit' tablosu yap.",
    tags: ['degisiklik', 'changelog', 'karsilastirma'],
  },
  {
    id: 'nlm-summary-section',
    category: 'Ozet / Cikarim',
    categoryEn: 'Summary / Extraction',
    name: 'Belirli Bolum Ozeti',
    nameEn: 'Specific Section Summary',
    prompt: "Yalnizca 'Results/Findings' ve 'Discussion' kisimlarini ozetle; geri kalani es gec.",
    promptEn: "Yalnizca 'Results/Findings' ve 'Discussion' kisimlarini ozetle; geri kalani es gec.",
    tags: ['bolum', 'secici', 'findings'],
  },

  // ═══════════════════════════════════════════════════════════
  // 3) SINAV / OGRENME PROMPTLARI
  // ═══════════════════════════════════════════════════════════
  {
    id: 'nlm-learn-note',
    category: 'Sinav / Ogrenme',
    categoryEn: 'Exam / Learning',
    name: 'Tek Sayfa Ders Notu',
    nameEn: 'One-Page Study Note',
    prompt: 'Bu kaynaklardan A4 tek sayfalik ders ozeti hazirla: basliklar + kisa aciklamalar + ornekler.',
    promptEn: 'Bu kaynaklardan A4 tek sayfalik ders ozeti hazirla: basliklar + kisa aciklamalar + ornekler.',
    tags: ['ders', 'not', 'ozet'],
  },
  {
    id: 'nlm-learn-recall',
    category: 'Sinav / Ogrenme',
    categoryEn: 'Exam / Learning',
    name: 'Aktif Hatirlama Sorulari',
    nameEn: 'Active Recall Questions',
    prompt: "20 adet aktif-hatirlama sorusu uret (kolay→zor). Cevap anahtarini en alta ekle; her cevaba citation.",
    promptEn: "20 adet aktif-hatirlama sorusu uret (kolay→zor). Cevap anahtarini en alta ekle; her cevaba citation.",
    tags: ['soru', 'sinav', 'hatirlama'],
  },
  {
    id: 'nlm-learn-flashcard',
    category: 'Sinav / Ogrenme',
    categoryEn: 'Exam / Learning',
    name: 'Flashcard Uretici',
    nameEn: 'Flashcard Generator',
    prompt: "30 flashcard uret: On yuz 'Soru/Kavram', arka yuz 'Kisa cevap + 1 example + citation'.",
    promptEn: "30 flashcard uret: On yuz 'Soru/Kavram', arka yuz 'Kisa cevap + 1 example + citation'.",
    tags: ['flashcard', 'ogrenme', 'kartlar'],
  },
  {
    id: 'nlm-learn-misconception',
    category: 'Sinav / Ogrenme',
    categoryEn: 'Exam / Learning',
    name: 'Yanilgi Avcisi',
    nameEn: 'Misconception Hunter',
    prompt: 'Bu konuda ogrencilerin yaptigi 10 yaygin hatayi cikar; her biri for dogru aciklamayi kaynakla destekle.',
    promptEn: 'Bu konuda ogrencilerin yaptigi 10 yaygin hatayi cikar; her biri for dogru aciklamayi kaynakla destekle.',
    tags: ['yanilgi', 'error', 'duzeltme'],
  },
  {
    id: 'nlm-learn-feynman',
    category: 'Sinav / Ogrenme',
    categoryEn: 'Exam / Learning',
    name: 'Feynman Testi',
    nameEn: 'Feynman Test',
    prompt: 'Konuyu 12 yasindaki birine anlatir gibi sadelestir; sonra ayni icerigi universite duzeyinde tekrar anlat.',
    promptEn: 'Konuyu 12 yasindaki birine anlatir gibi sadelestir; sonra ayni icerigi universite duzeyinde tekrar anlat.',
    tags: ['feynman', 'basitlestirme', 'seviye'],
  },

  // ═══════════════════════════════════════════════════════════
  // 4) ARASTIRMA / LITERATUR TARAMASI
  // ═══════════════════════════════════════════════════════════
  {
    id: 'nlm-research-consensus',
    category: 'Arastirma / Literatur',
    categoryEn: 'Research / Literature',
    name: 'Uzlasi / Ihtilaf / Bosluk',
    nameEn: 'Consensus / Conflict / Gap',
    prompt: "Kaynaklarin (a) uzerinde uzlastigi, (b) celistigi, (c) eksik biraktigi noktalari cikar. Her madde citation'li.",
    promptEn: "Kaynaklarin (a) uzerinde uzlastigi, (b) celistigi, (c) eksik biraktigi noktalari cikar. Her madde citation'li.",
    tags: ['uzlasi', 'celiski', 'bosluk'],
  },
  {
    id: 'nlm-research-matrix',
    category: 'Arastirma / Literatur',
    categoryEn: 'Research / Literature',
    name: 'Iddia–Kanit Matrisi',
    nameEn: 'Claim–Evidence Matrix',
    prompt: "Her satir bir 'iddia' olsun: Iddia | Kanit (kisa alinti) | Kaynak/citation | Guc (zayif/orta/guclu).",
    promptEn: "Her satir bir 'iddia' olsun: Iddia | Kanit (kisa alinti) | Kaynak/citation | Guc (zayif/orta/guclu).",
    tags: ['matris', 'iddia', 'kanit'],
  },
  {
    id: 'nlm-research-question',
    category: 'Arastirma / Literatur',
    categoryEn: 'Research / Literature',
    name: 'Arastirma Sorusu Netlestirme',
    nameEn: 'Research Question Refinement',
    prompt: 'Bu kaynaklara gore arastirma sorumu 3 alternatifle yeniden yaz: dar, orta, genis kapsam.',
    promptEn: 'Bu kaynaklara gore arastirma sorumu 3 alternatifle yeniden yaz: dar, orta, genis kapsam.',
    tags: ['soru', 'kapsam', 'netlestirme'],
  },
  {
    id: 'nlm-research-method',
    category: 'Arastirma / Literatur',
    categoryEn: 'Research / Literature',
    name: 'Metodoloji Karsilastirmasi',
    nameEn: 'Methodology Comparison',
    prompt: 'Calismalarin yontemlerini karsilastir: orneklem, olcum, sinirliliklar, bias riskleri.',
    promptEn: 'Calismalarin yontemlerini karsilastir: orneklem, olcum, sinirliliklar, bias riskleri.',
    tags: ['metodoloji', 'karsilastirma', 'method'],
  },
  {
    id: 'nlm-research-paragraph',
    category: 'Arastirma / Literatur',
    categoryEn: 'Research / Literature',
    name: 'Alintilanabilir Paragraf',
    nameEn: 'Citable Paragraph',
    prompt: "Bu kaynaklara dayanarak (akademik ton) 1 paragraf 'background' yaz; cumle sonlarinda citation ver.",
    promptEn: "Bu kaynaklara dayanarak (akademik ton) 1 paragraf 'background' yaz; cumle sonlarinda citation ver.",
    tags: ['akademik', 'paragraf', 'background'],
  },

  // ═══════════════════════════════════════════════════════════
  // 5) YAZMA / DUZENLEME PROMPTLARI
  // ═══════════════════════════════════════════════════════════
  {
    id: 'nlm-write-outline',
    category: 'Yazma / Duzenleme',
    categoryEn: 'Writing / Editing',
    name: 'Makale Iskeleti (Outline)',
    nameEn: 'Article Outline',
    prompt: "Su baslikla bir makale/rapor iskeleti cikar: input–Method–Bulgular–Tartisma–result; her bolum altina bullet'lar + citation.",
    promptEn: "Su baslikla bir makale/rapor iskeleti cikar: input–Method–Bulgular–Tartisma–result; her bolum altina bullet'lar + citation.",
    tags: ['iskelet', 'outline', 'makale'],
  },
  {
    id: 'nlm-write-argument',
    category: 'Yazma / Duzenleme',
    categoryEn: 'Writing / Editing',
    name: 'Arguman Guclendirme',
    nameEn: 'Argument Strengthening',
    prompt: "Bu tezi destekleyen 5 kanit ve 3 karsi arguman cikar; her biri citation'li.",
    promptEn: "Bu tezi destekleyen 5 kanit ve 3 karsi arguman cikar; her biri citation'li.",
    tags: ['arguman', 'tez', 'kanit'],
  },
  {
    id: 'nlm-write-tone',
    category: 'Yazma / Duzenleme',
    categoryEn: 'Writing / Editing',
    name: 'Ton Donusumu',
    nameEn: 'Tone Transformation',
    prompt: 'Ayni icerigi (a) teknik ekip, (b) yonetim, (c) musteri for ayri ayri yeniden cercevele.',
    promptEn: 'Ayni icerigi (a) teknik ekip, (b) yonetim, (c) musteri for ayri ayri yeniden cercevele.',
    tags: ['ton', 'hedef kitle', 'donusum'],
  },

  // ═══════════════════════════════════════════════════════════
  // 6) TOPLANTI / AKSIYON / PROJE
  // ═══════════════════════════════════════════════════════════
  {
    id: 'nlm-project-actions',
    category: 'Toplanti / Proje',
    categoryEn: 'Meeting / Project',
    name: 'Aksiyon Maddeleri',
    nameEn: 'Action Items',
    prompt: "Kararlari ve aksiyon maddelerini cikar: Aksiyon | Sorumlu | Tarih | Risk | Citation.",
    promptEn: "Kararlari ve aksiyon maddelerini cikar: Aksiyon | Sorumlu | Tarih | Risk | Citation.",
    tags: ['aksiyon', 'toplanti', 'karar'],
  },
  {
    id: 'nlm-project-risk',
    category: 'Toplanti / Proje',
    categoryEn: 'Meeting / Project',
    name: 'Risk Kaydi',
    nameEn: 'Risk Register',
    prompt: "Bu kaynaklara gore proje risklerini listele: Risk | Olasilik | Etki | Azaltim | Kanit/citation.",
    promptEn: "Bu kaynaklara gore proje risklerini listele: Risk | Olasilik | Etki | Azaltim | Kanit/citation.",
    tags: ['risk', 'proje', 'yonetim'],
  },
  {
    id: 'nlm-project-requirements',
    category: 'Toplanti / Proje',
    categoryEn: 'Meeting / Project',
    name: 'Gereksinim Cikarimi',
    nameEn: 'Requirements Extraction',
    prompt: "Is gereksinimlerini 'Must/Should/Could' olarak siniflandir; her madde citation.",
    promptEn: "Is gereksinimlerini 'Must/Should/Could' olarak siniflandir; her madde citation.",
    tags: ['gereksinim', 'moscow', 'onceliklendirme'],
  },

  // ═══════════════════════════════════════════════════════════
  // 7) KAYNAK YONETIMI
  // ═══════════════════════════════════════════════════════════
  {
    id: 'nlm-source-single',
    category: 'Kaynak Yonetimi',
    categoryEn: 'Source Management',
    name: 'Tek Kaynak Filtresi',
    nameEn: 'Single Source Filter',
    prompt: "Yalnizca 'X.pdf' kaynagini kullanarak cevapla.",
    promptEn: "Yalnizca 'X.pdf' kaynagini kullanarak cevapla.",
    tags: ['kaynak', 'filtre', 'tek'],
  },
  {
    id: 'nlm-source-multi',
    category: 'Kaynak Yonetimi',
    categoryEn: 'Source Management',
    name: 'Coklu Kaynak Secimi',
    nameEn: 'Multi Source Selection',
    prompt: "Sadece 'Policy.docx' + 'Appendix A' kaynaklarini select; digerlerini kullanma.",
    promptEn: "Sadece 'Policy.docx' + 'Appendix A' kaynaklarini select; digerlerini kullanma.",
    tags: ['kaynak', 'filtre', 'coklu'],
  },
  {
    id: 'nlm-source-limit',
    category: 'Kaynak Yonetimi',
    categoryEn: 'Source Management',
    name: 'Kaynak Sinirlamasi',
    nameEn: 'Source Limitation',
    prompt: 'Bu soruyu yanitlarken en fazla 3 kaynak kullan ve neden onlari sectigini soyle.',
    promptEn: 'Bu soruyu yanitlarken en fazla 3 kaynak kullan ve neden onlari sectigini soyle.',
    tags: ['kaynak', 'sinir', 'secim'],
  },

  // ═══════════════════════════════════════════════════════════
  // 8) STUDIO — AUDIO OVERVIEW
  // ═══════════════════════════════════════════════════════════
  {
    id: 'nlm-audio-expert',
    category: 'Audio Overview (Studio)',
    categoryEn: 'Audio Overview (Studio)',
    name: 'Uzman Seviyesi Deep Dive',
    nameEn: 'Expert Level Deep Dive',
    prompt: "Bu konunun temellerini biliyorum. X kismindaki varsayimlari ve Y kismindaki zayif noktalari derinlemesine acikla.",
    promptEn: "Bu konunun temellerini biliyorum. X kismindaki varsayimlari ve Y kismindaki zayif noktalari derinlemesine acikla.",
    tags: ['audio', 'uzman', 'deep-dive'],
  },
  {
    id: 'nlm-audio-exam',
    category: 'Audio Overview (Studio)',
    categoryEn: 'Audio Overview (Studio)',
    name: 'Sinav Modu',
    nameEn: 'Exam Mode',
    prompt: "X, Y, Z basliklarina gore ozetle; her baslik sonunda 3 tane 'cikabilir soru' uret.",
    promptEn: "X, Y, Z basliklarina gore ozetle; her baslik sonunda 3 tane 'cikabilir soru' uret.",
    tags: ['audio', 'sinav', 'hazirlik'],
  },
  {
    id: 'nlm-audio-beginner',
    category: 'Audio Overview (Studio)',
    categoryEn: 'Audio Overview (Studio)',
    name: 'Yeni Baslayan Modu',
    nameEn: 'Beginner Mode',
    prompt: "Sifirdan anlat: once terimler sozlugu, sonra 3 basit example, sonra yaygin hatalar.",
    promptEn: "Sifirdan anlat: once terimler sozlugu, sonra 3 basit example, sonra yaygin hatalar.",
    tags: ['audio', 'baslangic', 'temel'],
  },
  {
    id: 'nlm-audio-critique',
    category: 'Audio Overview (Studio)',
    categoryEn: 'Audio Overview (Studio)',
    name: 'Elestirel Degerlendirme',
    nameEn: 'Critical Evaluation',
    prompt: "Yazinin argumanini degerlendir: netlik, kanit kalitesi, eksikler, onerilen iyilestirmeler.",
    promptEn: "Yazinin argumanini degerlendir: netlik, kanit kalitesi, eksikler, onerilen iyilestirmeler.",
    tags: ['audio', 'elestiri', 'degerlendirme'],
  },
  {
    id: 'nlm-audio-debate',
    category: 'Audio Overview (Studio)',
    categoryEn: 'Audio Overview (Studio)',
    name: 'Tartisma (Debate)',
    nameEn: 'Debate',
    prompt: "Iki tarafi da guclu kur: 'lehinde' 5 arguman, 'aleyhinde' 5 arguman; sonra uzlasma oner.",
    promptEn: "Iki tarafi da guclu kur: 'lehinde' 5 arguman, 'aleyhinde' 5 arguman; sonra uzlasma oner.",
    tags: ['audio', 'tartisma', 'debate'],
  },

  // ═══════════════════════════════════════════════════════════
  // 9) STUDIO — SLIDE DECK
  // ═══════════════════════════════════════════════════════════
  {
    id: 'nlm-slide-exec',
    category: 'Slide Deck (Studio)',
    categoryEn: 'Slide Deck (Studio)',
    name: 'Yonetim Sunumu',
    nameEn: 'Executive Presentation',
    prompt: "Hedef kitle: C-level. 8 slayt. Problem → Etki → Cozum → Risk → Yol haritasi. Az metin, net mesaj.",
    promptEn: "Hedef kitle: C-level. 8 slayt. Problem → Etki → Cozum → Risk → Yol haritasi. Az metin, net mesaj.",
    tags: ['sunum', 'yonetim', 'c-level'],
  },
  {
    id: 'nlm-slide-edu',
    category: 'Slide Deck (Studio)',
    categoryEn: 'Slide Deck (Studio)',
    name: 'Egitici Sunum',
    nameEn: 'Educational Presentation',
    prompt: 'Hedef: yeni baslayanlar. Adim adim surec anlatimi. Her bolumde 1 example senaryo.',
    promptEn: 'Hedef: yeni baslayanlar. Adim adim surec anlatimi. Her bolumde 1 example senaryo.',
    tags: ['sunum', 'egitim', 'ogretici'],
  },
  {
    id: 'nlm-slide-tech',
    category: 'Slide Deck (Studio)',
    categoryEn: 'Slide Deck (Studio)',
    name: 'Teknik Tasarim Sunumu',
    nameEn: 'Technical Design Presentation',
    prompt: "Hedef: muhendis ekibi. Architecture, veri flow, trade-off'lar, acik sorular, next steps.",
    promptEn: "Hedef: muhendis ekibi. Architecture, veri flow, trade-off'lar, acik sorular, next steps.",
    tags: ['sunum', 'teknik', 'architecture'],
  },

  // ═══════════════════════════════════════════════════════════
  // 10) KAYNAK KESFETME (Web Arastirmasi)
  // ═══════════════════════════════════════════════════════════
  {
    id: 'nlm-discover-reliable',
    category: 'Kaynak Kesfetme',
    categoryEn: 'Source Discovery',
    name: 'Guvenilir Kaynak Onerisi',
    nameEn: 'Reliable Source Suggestion',
    prompt: "Su arastirma sorusu for webden en guvenilir 8 kaynak oner: akademik + resmi kurum + sektor raporu dengeli olsun.",
    promptEn: "Su arastirma sorusu for webden en guvenilir 8 kaynak oner: akademik + resmi kurum + sektor raporu dengeli olsun.",
    tags: ['kesfetme', 'kaynak', 'guvenilir'],
  },
  {
    id: 'nlm-discover-recent',
    category: 'Kaynak Kesfetme',
    categoryEn: 'Source Discovery',
    name: 'Guncel Kaynak Filtresi',
    nameEn: 'Recent Source Filter',
    prompt: "Sadece 2023 sonrasi yayinlari hedefle; pazarlama bloglarini ele.",
    promptEn: "Sadece 2023 sonrasi yayinlari hedefle; pazarlama bloglarini ele.",
    tags: ['kesfetme', 'guncel', 'filtre'],
  },
  {
    id: 'nlm-discover-evaluate',
    category: 'Kaynak Kesfetme',
    categoryEn: 'Source Discovery',
    name: 'Kaynak Degerlendirme',
    nameEn: 'Source Evaluation',
    prompt: "Kaynaklari eklemeden once her biri for: ne anlatiyor, neden guvenilir, hangi soruya cevap olur?",
    promptEn: "Kaynaklari eklemeden once her biri for: ne anlatiyor, neden guvenilir, hangi soruya cevap olur?",
    tags: ['kesfetme', 'degerlendirme', 'kalite'],
  },
  // ═══════════════════════════════════════════════════════════
  {
    id: 'nlm-template-universal',
    category: 'Evrensel template',
    categoryEn: 'Universal Template',
    name: 'Her Ise Uyar template',
    nameEn: 'Universal Prompt Template',
    prompt: `AMAC: …
KAPSAM: (yalnizca secili kaynaklar / yalnizca su dosyalar: …)
CIKTI: (madde / tablo / outline / Q&A / flashcard)
KANIT: Her iddia citation'li; kaynakta yoksa "kaynaklarda yok" de.
KISIT: (uzunluk, seviye, dil, ton)`,
    promptEn: `AMAC: …
KAPSAM: (yalnizca secili kaynaklar / yalnizca su dosyalar: …)
CIKTI: (madde / tablo / outline / Q&A / flashcard)
KANIT: Her iddia citation'li; kaynakta yoksa "kaynaklarda yok" de.
KISIT: (uzunluk, seviye, dil, ton)`,
    tags: ['template', 'evrensel', 'universal'],
  },
];

type CommunityTopic = {
  id: string;
  tr: string;
  en: string;
};

type CommunityPattern = {
  id: string;
  name: string;
  nameEn: string;
  prompt: string;
  promptEn: string;
  tags: string[];
};

const COMMUNITY_RESEARCH_TOPICS: CommunityTopic[] = [
  { id: 'ai', tr: 'Yapay Zeka', en: 'Artificial Intelligence' },
  { id: 'ml', tr: 'Makine Ogrenmesi', en: 'Machine Learning' },
  { id: 'llm', tr: 'Buyuk Dil Modelleri', en: 'Large Language Models' },
  { id: 'nlp', tr: 'Dogal Dil Isleme', en: 'Natural Language Processing' },
  { id: 'cv', tr: 'Bilgisayarli Goru', en: 'Computer Vision' },
  { id: 'data-eng', tr: 'Veri Muhendisligi', en: 'Data Engineering' },
  { id: 'analytics', tr: 'Veri Analitigi', en: 'Data Analytics' },
  { id: 'bi', tr: 'Is Zekasi', en: 'Business Intelligence' },
  { id: 'cloud', tr: 'Bulut Bilisim', en: 'Cloud Computing' },
  { id: 'devops', tr: 'DevOps', en: 'DevOps' },
  { id: 'sre', tr: 'SRE', en: 'SRE' },
  { id: 'kubernetes', tr: 'Kubernetes', en: 'Kubernetes' },
  { id: 'docker', tr: 'Docker', en: 'Docker' },
  { id: 'backend', tr: 'Backend Gelistirme', en: 'Backend Development' },
  { id: 'frontend', tr: 'Frontend Gelistirme', en: 'Frontend Development' },
  { id: 'mobile', tr: 'Mobil Gelistirme', en: 'Mobile Development' },
  { id: 'web-perf', tr: 'Web Performansi', en: 'Web Performance' },
  { id: 'qa', tr: 'Test ve QA', en: 'Testing and QA' },
  { id: 'security', tr: 'Siber security', en: 'Cybersecurity' },
  { id: 'privacy', tr: 'Veri Gizliligi', en: 'Data Privacy' },
  { id: 'product', tr: 'Urun Yonetimi', en: 'Product Management' },
  { id: 'ux', tr: 'UX Arastirmasi', en: 'UX Research' },
  { id: 'ui', tr: 'UI Tasarimi', en: 'UI Design' },
  { id: 'growth', tr: 'Buyume Stratejileri', en: 'Growth Strategies' },
  { id: 'seo', tr: 'SEO', en: 'SEO' },
  { id: 'content', tr: 'Content Pazarlamasi', en: 'Content Marketing' },
  { id: 'sales', tr: 'Satis Operasyonlari', en: 'Sales Operations' },
  { id: 'support', tr: 'Musteri Destegi', en: 'Customer Support' },
  { id: 'hr', tr: 'IK Teknolojileri', en: 'HR Technology' },
  { id: 'fintech', tr: 'Fintech', en: 'Fintech' },
  { id: 'ecommerce', tr: 'E-Ticaret', en: 'E-Commerce' },
  { id: 'saas', tr: 'SaaS', en: 'SaaS' },
  { id: 'startup', tr: 'Startup Operasyonlari', en: 'Startup Operations' },
  { id: 'education', tr: 'Egitim Teknolojileri', en: 'Education Technology' },
  { id: 'healthtech', tr: 'Saglik Teknolojileri', en: 'Health Technology' },
  { id: 'gaming', tr: 'Oyun Gelistirme', en: 'Game Development' },
  { id: 'blockchain', tr: 'Blockchain', en: 'Blockchain' },
  { id: 'iot', tr: 'Nesnelerin Interneti', en: 'Internet of Things' },
  { id: 'robotics', tr: 'Robotik', en: 'Robotics' },
  { id: 'energy', tr: 'Enerji Teknolojileri', en: 'Energy Technology' },
  { id: 'climate', tr: 'Iklim Teknolojileri', en: 'Climate Technology' },
  { id: 'legaltech', tr: 'LegalTech', en: 'Legal Technology' },
  { id: 'govtech', tr: 'Kamu Teknolojileri', en: 'Government Technology' },
  { id: 'travel', tr: 'Seyahat Teknolojileri', en: 'Travel Technology' },
  { id: 'logistics', tr: 'Lojistik Teknolojileri', en: 'Logistics Technology' },
  { id: 'manufacturing', tr: 'Uretim Teknolojileri', en: 'Manufacturing Technology' },
  { id: 'real-estate', tr: 'Gayrimenkul Teknolojileri', en: 'Real Estate Technology' },
  { id: 'media', tr: 'Medya Teknolojileri', en: 'Media Technology' },
  { id: 'community', tr: 'Topluluk Yonetimi', en: 'Community Management' },
  { id: 'leadership', tr: 'Liderlik ve Yonetim', en: 'Leadership and Management' },
];

const COMMUNITY_RESEARCH_PATTERNS: CommunityPattern[] = [
  {
    id: 'trend-scan',
    name: 'Trend Taramasi',
    nameEn: 'Trend Scan',
    prompt: '{topic} konusunda Reddit, X ve Stack Overflow paylasimlarini derle. Son 12 ayin en cok tekrar eden 10 trendini cikar ve her trend for example alinti/citation ver.',
    promptEn: '{topic} konusunda Reddit, X ve Stack Overflow paylasimlarini derle. Son 12 ayin en cok tekrar eden 10 trendini cikar ve her trend for example alinti/citation ver.',
    tags: ['reddit', 'x', 'stackoverflow', 'trend'],
  },
  {
    id: 'pain-points',
    name: 'Sorun Noktalari',
    nameEn: 'Pain Points',
    prompt: '{topic} ile ilgili user sikayetlerini Reddit, X ve Stack Overflow kaynaklarindan topla. Sorunlari etki-buyukluk ve tekrar sayisina gore sirala.',
    promptEn: '{topic} ile ilgili user sikayetlerini Reddit, X ve Stack Overflow kaynaklarindan topla. Sorunlari etki-buyukluk ve tekrar sayisina gore sirala.',
    tags: ['pain-point', 'problem', 'community'],
  },
  {
    id: 'faq',
    name: 'Topluluk SSS',
    nameEn: 'Community FAQ',
    prompt: '{topic} for Reddit, X ve Stack Overflow uzerinden 25 soruluk bir SSS listesi olustur. Her soruya kisa cevap ve kaynak referansi ekle.',
    promptEn: '{topic} for Reddit, X ve Stack Overflow uzerinden 25 soruluk bir SSS listesi olustur. Her soruya kisa cevap ve kaynak referansi ekle.',
    tags: ['faq', 'qa', 'sources'],
  },
  {
    id: 'myths-vs-facts',
    name: 'Mitler ve Gercekler',
    nameEn: 'Myths vs Facts',
    prompt: '{topic} konusunda toplulukta dolasan yanlis inanislari belirle. Reddit, X ve Stack Overflow delilleriyle "Mit -> Gercek" tablosu yap.',
    promptEn: '{topic} konusunda toplulukta dolasan yanlis inanislari belirle. Reddit, X ve Stack Overflow delilleriyle "Mit -> Gercek" tablosu yap.',
    tags: ['myth', 'fact-check', 'evidence'],
  },
  {
    id: 'beginner-guide',
    name: 'Baslangic Rehberi',
    nameEn: 'Beginner Guide',
    prompt: '{topic} for yeni baslayanlara yonelik adim adim rehber yaz. Reddit, X ve Stack Overflowdan gelen pratik ipuclarini dahil et.',
    promptEn: '{topic} for yeni baslayanlara yonelik adim adim rehber yaz. Reddit, X ve Stack Overflowdan gelen pratik ipuclarini dahil et.',
    tags: ['beginner', 'guide', 'learning'],
  },
  {
    id: 'advanced-patterns',
    name: 'Ileri Duzey Kaliplar',
    nameEn: 'Advanced Patterns',
    prompt: '{topic} konusunda uzmanlarin kullandigi ileri teknikleri Reddit, X ve Stack Overflowdan cikar. "Ne zaman kullanilir / riskleri" ile sun.',
    promptEn: '{topic} konusunda uzmanlarin kullandigi ileri teknikleri Reddit, X ve Stack Overflowdan cikar. "Ne zaman kullanilir / riskleri" ile sun.',
    tags: ['advanced', 'patterns', 'experts'],
  },
  {
    id: 'tool-comparison',
    name: 'Arac Karsilastirma',
    nameEn: 'Tool Comparison',
    prompt: '{topic} alaninda en cok karsilastirilan araclari Reddit, X ve Stack Overflow verileriyle karsilastir. Arti-eksi ve kullanim senaryosu yaz.',
    promptEn: '{topic} alaninda en cok karsilastirilan araclari Reddit, X ve Stack Overflow verileriyle karsilastir. Arti-eksi ve kullanim senaryosu yaz.',
    tags: ['comparison', 'tools', 'tradeoff'],
  },
  {
    id: 'career-skills',
    name: 'Kariyer Yetkinlikleri',
    nameEn: 'Career Skills',
    prompt: '{topic} for is gorusmelerinde sorulan becerileri Reddit, X ve Stack Overflow tartismalarindan cikar. 90 gunluk gelisim plani olustur.',
    promptEn: '{topic} for is gorusmelerinde sorulan becerileri Reddit, X ve Stack Overflow tartismalarindan cikar. 90 gunluk gelisim plani olustur.',
    tags: ['career', 'skills', 'interview'],
  },
  {
    id: 'debug-playbook',
    name: 'Debug Playbook',
    nameEn: 'Debug Playbook',
    prompt: '{topic} ile ilgili en yaygin hatalar for Stack Overflow cozumlerini ve Reddit/X deneyimlerini birlestirerek bir debug playbook yaz.',
    promptEn: '{topic} ile ilgili en yaygin hatalar for Stack Overflow cozumlerini ve Reddit/X deneyimlerini birlestirerek bir debug playbook yaz.',
    tags: ['debug', 'troubleshooting', 'stack-overflow'],
  },
  {
    id: 'decision-framework',
    name: 'Karar Cercevesi',
    nameEn: 'Decision Framework',
    prompt: '{topic} secimlerinde karar vermek for "baglam -> secenek -> kriter -> karar" cercevesi olustur; Reddit, X, Stack Overflowdan alintilar ekle.',
    promptEn: '{topic} secimlerinde karar vermek for "baglam -> secenek -> kriter -> karar" cercevesi olustur; Reddit, X, Stack Overflowdan alintilar ekle.',
    tags: ['decision', 'framework', 'options'],
  },
  {
    id: 'anti-patterns',
    name: 'Anti-Pattern Avcisi',
    nameEn: 'Anti-Pattern Hunter',
    prompt: '{topic} konusunda toplulukta sik gorulen anti-patternleri tespit et. Her anti-pattern for daha iyi alternatif ve kaynak kaniti ver.',
    promptEn: '{topic} konusunda toplulukta sik gorulen anti-patternleri tespit et. Her anti-pattern for daha iyi alternatif ve kaynak kaniti ver.',
    tags: ['anti-pattern', 'best-practice', 'quality'],
  },
  {
    id: 'implementation-checklist',
    name: 'Uygulama Kontrol Listesi',
    nameEn: 'Implementation Checklist',
    prompt: '{topic} projesi for uygulama kontrol listesi olustur. Maddeleri Reddit, X ve Stack Overflowdan gelen gercek sorunlara gore onceliklendir.',
    promptEn: '{topic} projesi for uygulama kontrol listesi olustur. Maddeleri Reddit, X ve Stack Overflowdan gelen gercek sorunlara gore onceliklendir.',
    tags: ['checklist', 'implementation', 'priority'],
  },
  {
    id: 'risk-register',
    name: 'Topluluk Risk Kaydi',
    nameEn: 'Community Risk Register',
    prompt: '{topic} uygulamalarinda karsilasilan riskleri topluluk kaynaklarindan derle. Risk, olasilik, etki ve azaltim tablosu olustur.',
    promptEn: '{topic} uygulamalarinda karsilasilan riskleri topluluk kaynaklarindan derle. Risk, olasilik, etki ve azaltim tablosu olustur.',
    tags: ['risk', 'mitigation', 'project'],
  },
  {
    id: 'cost-performance',
    name: 'Maliyet-Performans Analizi',
    nameEn: 'Cost-Performance Analysis',
    prompt: '{topic} cozumlerinde maliyet ve performans dengesini Reddit, X ve Stack Overflow yorumlarina dayanarak analysis et.',
    promptEn: '{topic} cozumlerinde maliyet ve performans dengesini Reddit, X ve Stack Overflow yorumlarina dayanarak analysis et.',
    tags: ['cost', 'performance', 'tradeoff'],
  },
  {
    id: 'security-review',
    name: 'security Incelemesi',
    nameEn: 'Security Review',
    prompt: '{topic} ile ilgili security aciklari ve kotu pratikleri topluluk kaynaklarindan cikar. Onlem listesini etki sirasina gore ver.',
    promptEn: '{topic} ile ilgili security aciklari ve kotu pratikleri topluluk kaynaklarindan cikar. Onlem listesini etki sirasina gore ver.',
    tags: ['security', 'pitfall', 'hardening'],
  },
  {
    id: 'benchmarking',
    name: 'Topluluk Benchmark Ozeti',
    nameEn: 'Community Benchmark Summary',
    prompt: '{topic} hakkindaki benchmark paylasimlarini Reddit, X ve Stack Overflow uzerinden topla. Sonuclari metodoloji farklariyla birlikte ozetle.',
    promptEn: '{topic} hakkindaki benchmark paylasimlarini Reddit, X ve Stack Overflow uzerinden topla. Sonuclari metodoloji farklariyla birlikte ozetle.',
    tags: ['benchmark', 'metrics', 'comparison'],
  },
  {
    id: 'roadmap',
    name: '90 Gunluk Yol Haritasi',
    nameEn: '90-Day Roadmap',
    prompt: '{topic} for topluluk bilgisine dayali 90 gunluk uygulama yol haritasi cikar: hafta hafta hedef, output, risk, olcum metrigi.',
    promptEn: '{topic} for topluluk bilgisine dayali 90 gunluk uygulama yol haritasi cikar: hafta hafta hedef, output, risk, olcum metrigi.',
    tags: ['roadmap', 'planning', 'execution'],
  },
  {
    id: 'debate-map',
    name: 'Tartisma Haritasi',
    nameEn: 'Debate Map',
    prompt: '{topic} konusunda Reddit, X ve Stack Overflowdaki gorus ayriliklarini haritala: lehinde, aleyhinde, uzlasi noktasi.',
    promptEn: '{topic} konusunda Reddit, X ve Stack Overflowdaki gorus ayriliklarini haritala: lehinde, aleyhinde, uzlasi noktasi.',
    tags: ['debate', 'arguments', 'consensus'],
  },
  {
    id: 'resource-pack',
    name: 'Kaynak Paketi',
    nameEn: 'Resource Pack',
    prompt: '{topic} ogrenimi for topluluk tarafindan en cok onerilen 20 kaynaklik bir paket hazirla. Her kaynak for neden onemli oldugunu acikla.',
    promptEn: '{topic} ogrenimi for topluluk tarafindan en cok onerilen 20 kaynaklik bir paket hazirla. Her kaynak for neden onemli oldugunu acikla.',
    tags: ['resources', 'learning', 'curation'],
  },
  {
    id: 'action-summary',
    name: 'Aksiyon Ozeti',
    nameEn: 'Action Summary',
    prompt: '{topic} konusunda Reddit, X ve Stack Overflow arastirmasini "simdi ne yapmali?" odakli ozetle: 10 net aksiyon maddesi ver.',
    promptEn: '{topic} konusunda Reddit, X ve Stack Overflow arastirmasini "simdi ne yapmali?" odakli ozetle: 10 net aksiyon maddesi ver.',
    tags: ['action', 'execution', 'summary'],
  },
];

const applyTopic = (text: string, topic: CommunityTopic) => text.replaceAll('{topic}', topic.tr);
const applyTopicEn = (text: string, topic: CommunityTopic) => text.replaceAll('{topic}', topic.en);

const NOTEBOOKLM_COMMUNITY_PROMPTS: NotebookLmPrompt[] = COMMUNITY_RESEARCH_TOPICS.flatMap(topic =>
  COMMUNITY_RESEARCH_PATTERNS.map(pattern => ({
    id: `nlm-community-${topic.id}-${pattern.id}`,
    category: 'Topluluk Arastirmasi',
    categoryEn: 'Community Research',
    name: `${topic.tr} — ${pattern.name}`,
    nameEn: `${topic.en} — ${pattern.nameEn}`,
    prompt: applyTopic(pattern.prompt, topic),
    promptEn: applyTopicEn(pattern.promptEn, topic),
    tags: [...pattern.tags, topic.id, 'topluluk-arastirmasi'],
  }))
);

// 50 konu x 20 desen = 1000 yeni prompt
NOTEBOOKLM_PROMPTS.push(...NOTEBOOKLM_COMMUNITY_PROMPTS);

// ═══════════════════════════════════════════════════════════════
// VERI SETI PROMPT'LARI — Tum dataset kaynaklarindan entegre
// ═══════════════════════════════════════════════════════════════
import { ALL_DATASET_PROMPTS } from './datasetPrompts';
NOTEBOOKLM_PROMPTS.push(...ALL_DATASET_PROMPTS);

/** Kategorileri benzersiz olarak cikar */
export const NOTEBOOKLM_CATEGORIES = [...new Set(NOTEBOOKLM_PROMPTS.map(p => p.category))];
export const NOTEBOOKLM_CATEGORIES_EN = [...new Set(NOTEBOOKLM_PROMPTS.map(p => p.categoryEn))];
