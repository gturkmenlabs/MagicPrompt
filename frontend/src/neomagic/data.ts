// NeoMagic — shared sample data (frameworks, domains, prompts, etc.)

export type ChipTone = "violet" | "cyan" | "mint" | "pink" | "amber" | "red";

export interface FrameworkItem { id: string; name: string; tag: string; color: ChipTone; desc: string; }
export interface DomainItem { id: string; name: string; icon: string; }
export interface ProviderItem { id: string; name: string; model: string; lat: string; cost: string; color: ChipTone; status: "online" | "local"; }
export interface RecentPrompt { id: string; title: string; framework: string; domain: string; score: number; time: string; judge: number; }
export interface JudgeCriterion { id: string; name: string; score: number; weight: number; }
export interface LintIssue { sev: "warn" | "info" | "ok"; code: string; msg: string; line: number | null; }
export interface VersionItem { id: string; label: string; time: string; author: string; change: string; judge: number; branch: string; }
export interface CompiledPrompt {
  role: string;
  context: string;
  task: string[];
  format: string;
  constraints: string[];
}
export interface CotNode { id: number; role: string; text: string; active?: boolean; }
export interface AbRun {
  a: { framework: string; model: string; judge: number; latency: string; cost: string; wins: number; };
  b: { framework: string; model: string; judge: number; latency: string; cost: string; wins: number; };
}

export const frameworks: FrameworkItem[] = [
  { id: "AUTO", name: "AUTO", tag: "Smart", color: "violet", desc: "Niyetinize göre otomatik seçim" },
  { id: "CoT", name: "Chain of Thought", tag: "Reasoning", color: "cyan", desc: "Adım adım düşünme" },
  { id: "ToT", name: "Tree of Thought", tag: "Reasoning", color: "cyan", desc: "Dallandırarak keşif" },
  { id: "ReAct", name: "ReAct", tag: "Agent", color: "mint", desc: "Düşün + eyleme geç döngüsü" },
  { id: "RISEN", name: "RISEN", tag: "Structure", color: "violet", desc: "Role-Input-Steps-Expectations-Narrowing" },
  { id: "CoSTAR", name: "CoSTAR", tag: "Structure", color: "violet", desc: "Context-Objective-Style-Tone-Audience-Response" },
  { id: "OODA", name: "OODA", tag: "Decision", color: "pink", desc: "Observe-Orient-Decide-Act" },
  { id: "RedTeam", name: "Red Team", tag: "Security", color: "red", desc: "Saldırgan bakış" },
  { id: "FirstP", name: "First Principles", tag: "Reasoning", color: "cyan", desc: "Temel ilkelere indirme" },
  { id: "SCAMPER", name: "SCAMPER", tag: "Creative", color: "amber", desc: "Yaratıcı uyarlama" },
  { id: "SixHats", name: "Six Hats", tag: "Creative", color: "amber", desc: "Altı şapkalı düşünme" },
  { id: "MECE", name: "MECE", tag: "Analysis", color: "violet", desc: "Birbiriyle çakışmayan tam kapsama" },
  { id: "PESTEL", name: "PESTEL", tag: "Analysis", color: "violet", desc: "Makro çevre analizi" },
  { id: "Bayes", name: "Bayesian", tag: "Reasoning", color: "cyan", desc: "Olasılıksal güncelleme" },
  { id: "TRIZ", name: "TRIZ", tag: "Creative", color: "amber", desc: "İcat problem çözme" },
];

export const domains: DomainItem[] = [
  { id: "frontend", name: "Frontend", icon: "code" },
  { id: "backend", name: "Backend", icon: "server" },
  { id: "ml", name: "ML / AI", icon: "bot" },
  { id: "nlp", name: "NLP / LLM", icon: "code" },
  { id: "devops", name: "DevOps", icon: "globe" },
  { id: "fintech", name: "FinTech", icon: "coin" },
  { id: "health", name: "Sağlık", icon: "activity" },
  { id: "blockchain", name: "Blockchain", icon: "git" },
  { id: "law", name: "Hukuk", icon: "shield" },
  { id: "edu", name: "Eğitim", icon: "book" },
  { id: "cyber", name: "Siber Güvenlik", icon: "shield" },
  { id: "robotics", name: "Robotik", icon: "bot" },
  { id: "game", name: "Oyun Geliştirme", icon: "play" },
  { id: "aero", name: "Havacılık", icon: "rocket" },
  { id: "pharma", name: "İlaç", icon: "diamond" },
];

export const providers: ProviderItem[] = [
  { id: "anthropic", name: "Anthropic", model: "claude-opus-4.5", lat: "412ms", cost: "$0.018", color: "violet", status: "online" },
  { id: "openai", name: "OpenAI", model: "gpt-5-turbo", lat: "388ms", cost: "$0.014", color: "mint", status: "online" },
  { id: "google", name: "Google", model: "gemini-2.5-pro", lat: "501ms", cost: "$0.011", color: "cyan", status: "online" },
  { id: "deepseek", name: "DeepSeek", model: "deepseek-v4", lat: "287ms", cost: "$0.003", color: "amber", status: "online" },
  { id: "groq", name: "Groq", model: "llama-4-70b", lat: "94ms", cost: "$0.002", color: "pink", status: "online" },
];

export const recentPrompts: RecentPrompt[] = [
  { id: "p_482", title: "E-ticaret iade akışı için müşteri destek asistanı", framework: "CoSTAR", domain: "Backend", score: 94, time: "2dk önce", judge: 4.7 },
  { id: "p_481", title: "Finansal rapor özetleyici (KAP duyuruları)", framework: "RISEN", domain: "FinTech", score: 89, time: "14dk önce", judge: 4.5 },
  { id: "p_480", title: "Kod review yapısal analiz — TypeScript", framework: "First Principles", domain: "Frontend", score: 92, time: "1s önce", judge: 4.6 },
  { id: "p_479", title: "İlaç etkileşimi kontrol botu prompt'u", framework: "CoT", domain: "Sağlık", score: 87, time: "3s önce", judge: 4.3 },
  { id: "p_478", title: "SQL injection penetrasyon testi senaryosu", framework: "Red Team", domain: "Siber", score: 96, time: "5s önce", judge: 4.8 },
  { id: "p_477", title: "K-12 matematik problem üretici", framework: "SCAMPER", domain: "Eğitim", score: 81, time: "Dün", judge: 4.1 },
  { id: "p_476", title: "Smart contract audit ön kontrol listesi", framework: "Red Team", domain: "Blockchain", score: 93, time: "Dün", judge: 4.7 },
  { id: "p_475", title: "Hukuki sözleşme madde analizi (KVKK)", framework: "MECE", domain: "Hukuk", score: 88, time: "2gün", judge: 4.4 },
];

export const judgeCriteria: JudgeCriterion[] = [
  { id: "clarity", name: "Açıklık", score: 94, weight: 0.2 },
  { id: "testability", name: "Test edilebilirlik", score: 89, weight: 0.18 },
  { id: "constraints", name: "Kısıt uyumu", score: 92, weight: 0.18 },
  { id: "security", name: "Güvenlik", score: 96, weight: 0.16 },
  { id: "repeatability", name: "Tekrarlanabilirlik", score: 87, weight: 0.14 },
  { id: "completeness", name: "Bütünlük", score: 91, weight: 0.14 },
];

export const lintIssues: LintIssue[] = [
  { sev: "warn", code: "L-014", msg: "Belirsiz eylem fiili: \"optimize et\" — niceliksel ölçüt belirtin.", line: 12 },
  { sev: "info", code: "L-028", msg: "Çıktı formatı kısmen tanımlı. JSON Schema önerilir.", line: 28 },
  { sev: "warn", code: "L-031", msg: "Token bütçesi sınırı yakın (4823 / 5000).", line: null },
  { sev: "ok",   code: "L-002", msg: "Rol tanımı net.", line: 1 },
  { sev: "ok",   code: "L-007", msg: "Kısıtlar listesi tam.", line: 17 },
];

export const versions: VersionItem[] = [
  { id: "v7", label: "v7", time: "2dk önce", author: "siz", change: "Çıktı formatı JSON Schema'ya dönüştürüldü", judge: 4.7, branch: "main" },
  { id: "v6", label: "v6", time: "1s önce", author: "siz", change: "Few-shot örnek eklendi (3 adet)", judge: 4.5, branch: "main" },
  { id: "v5", label: "v5", time: "Dün",     author: "Mert K.", change: "Tone: profesyonel → empati ağırlıklı", judge: 4.3, branch: "main" },
  { id: "v4", label: "v4", time: "2gün",    author: "Mert K.", change: "Kısıt: PII redaksiyon kuralı zorunlu", judge: 4.2, branch: "experiment/empathy" },
  { id: "v3", label: "v3", time: "3gün",    author: "siz",     change: "Framework: CoT → CoSTAR", judge: 4.0, branch: "main" },
  { id: "v2", label: "v2", time: "5gün",    author: "siz",     change: "İlk taslak — RISEN", judge: 3.6, branch: "main" },
];

export const exampleIntent =
  "Türk e-ticaret sitesi için iade akışını yönetecek müşteri destek asistanı. KVKK uyumlu, empati ağırlıklı, çıktı JSON yapılı.";

export const compiledPrompt: CompiledPrompt = {
  role: "Sen, KVKK uyumlu çalışan bir Türk e-ticaret platformunun kıdemli müşteri destek temsilcisisin. 12 yıllık deneyime, ürün iade süreçlerinde derinleşmiş uzmanlığa sahipsin.",
  context:
    "Kullanıcı, son 14 gün içinde aldığı bir ürünü iade etmek istiyor. Sipariş numarası, ürün durumu (kullanılmamış / hasarlı / yanlış ürün), satın alma tarihi ve fatura bilgisi verilmiş olabilir veya eksik olabilir.",
  task: [
    "Eksik bilgileri tek tek, empatik biçimde iste — birden fazla soruyu tek seferde sorma.",
    "İade koşullarını (14 gün, ambalaj, fiş) net şekilde ifade et.",
    "Uygunsa kargo etiketi gönderim adımını başlat.",
    "Uygun değilse alternatif çözüm öner (değişim, kupon, onarım).",
  ],
  format:
    'Yanıtlarını JSON olarak ver:\n{\n  "response": "<müşteriye gösterilecek metin>",\n  "intent_class": "refund|exchange|info|complaint",\n  "next_action": "collect_info|approve|reject|escalate",\n  "pii_redacted": true|false\n}',
  constraints: [
    "Asla teklif olmayan tarihlerde söz verme.",
    "PII'yi (TC, kart no, adres) maskele.",
    "Olumsuz cevapta empati cümlesi ekle.",
    "Token bütçesi: ≤ 800 tokens.",
  ],
};

export const cotChain: CotNode[] = [
  { id: 1, role: "Observe",  text: "Kullanıcı 'hasarlı kameralı drone' yazdı. Tarih, sipariş no ve fatura yok." },
  { id: 2, role: "Analyze",  text: "Eksik bilgi: 3 kritik alan. Hasar durumu → garantili iade kapsamı olası." },
  { id: 3, role: "Branch A", text: "Önce sipariş no iste → KVKK uyumlu doğrulama → iade akışı.", active: true },
  { id: 4, role: "Branch B", text: "Önce hasarı sor → onarım/değişim teklifi → satıcı atanmış mı kontrol et." },
  { id: 5, role: "Decide",   text: "Branch A daha düşük belirsizlik. Sipariş doğrulaması olmadan PII riski yüksek." },
  { id: 6, role: "Act",      text: "Empati cümlesi + sipariş no talebi (tek soru) + fotoğraf önerisi." },
];

export const abRun: AbRun = {
  a: { framework: "CoSTAR", model: "Claude Opus 4.5", judge: 4.7, latency: "412ms", cost: "$0.018", wins: 62 },
  b: { framework: "RISEN", model: "Gemini 2.5 Pro", judge: 4.4, latency: "501ms", cost: "$0.011", wins: 38 },
};
