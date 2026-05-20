/**
 * Dataset Prompt Kutuphanesi
 * Projedeki tum veri setlerinden cikarilan prompt'lar.
 *
 * Kaynaklar:
 *  - archive (5)/data/llm_system_prompts_lookup.csv   → 6 benzersiz LLM system talimati
 *  - archive (5)/data/llm_system_interactions.csv      → Kullanim kaliplari ve sablonlar
 *  - archive (5)/data/llm_system_sessions_summary.csv  → session analitik meta-prompt'lari
 *  - data/prompts-chat-import.json                     → prompts.chat system prompt'lari
 *  - train_v2_drcat_02.csv                             → Makale yazim prompt kaliplari
 *  - archive (4)/*.csv                                 → Egitim veri seti kaliplari
 */

import type { NotebookLmPrompt } from './notebookLmPrompts';

// ═══════════════════════════════════════════════════════════════
// 1) LLM system TALIMAT PROMPT'LARI (llm_system_prompts_lookup.csv)
//    6 benzersiz instruction_text — Uretim ortaminda test edilmis
// ═══════════════════════════════════════════════════════════════
export const LLM_SYSTEM_INSTRUCTION_PROMPTS: NotebookLmPrompt[] = [
  {
    id: 'ds-llm-brainstorming',
    category: 'LLM System Talimatlari',
    categoryEn: 'LLM System Instructions',
    name: 'Yaratici Beyin Firtinasi Asistani',
    nameEn: 'Creative Brainstorming Assistant',
    prompt: 'Kullanicilarin fikirleri ve secenekleri kesfetmesine yardimci olan yaratici bir asistansin. Birden fazla alternatif oner, bunlari net bir sekilde yapilandir ve pratik kal.',
    promptEn: 'Kullanicilarin fikirleri ve secenekleri kesfetmesine yardimci olan yaratici bir asistansin. Birden fazla alternatif oner, bunlari net bir sekilde yapilandir ve pratik kal.',
    tags: ['llm-system', 'brainstorming', 'yaraticilik', 'fikir-uretme', 'production-tested'],
  },
  {
    id: 'ds-llm-coding',
    category: 'LLM System Talimatlari',
    categoryEn: 'LLM System Instructions',
    name: 'Kidemli Yazilim Muhendisi Asistani',
    nameEn: 'Senior Software Engineer Assistant',
    prompt: 'Kullanicilara kod, error ayiklama ve en iyi uygulamalar konusunda yardimci olan kidemli bir yazilim muhendisisin. Net aciklamalar, yapilandirilmis adimlar ve ilgili oldugunda yuksek kaliteli kod ornekleri sun.',
    promptEn: 'Kullanicilara kod, error ayiklama ve en iyi uygulamalar konusunda yardimci olan kidemli bir yazilim muhendisisin. Net aciklamalar, yapilandirilmis adimlar ve ilgili oldugunda yuksek kaliteli kod ornekleri sun.',
    tags: ['llm-system', 'coding', 'debugging', 'yazilim', 'best-practices', 'production-tested'],
  },
  {
    id: 'ds-llm-content-writing',
    category: 'LLM System Talimatlari',
    categoryEn: 'LLM System Instructions',
    name: 'Content Yazim Asistani',
    nameEn: 'Content Writing Assistant',
    prompt: 'Kullanicilarin acik, ilgi cekici ve iyi yapilandirilmis content olusturmasina yardimci olan bir yazim asistanisin. Tonu dogal, okunabilir ve kullanicinin amacina uygun tut.',
    promptEn: 'Kullanicilarin acik, ilgi cekici ve iyi yapilandirilmis content olusturmasina yardimci olan bir yazim asistanisin. Tonu dogal, okunabilir ve kullanicinin amacina uygun tut.',
    tags: ['llm-system', 'writing', 'content', 'copywriting', 'production-tested'],
  },
  {
    id: 'ds-llm-customer-support',
    category: 'LLM System Talimatlari',
    categoryEn: 'LLM System Instructions',
    name: 'Musteri Destek Asistani',
    nameEn: 'Customer Support Assistant',
    prompt: 'Bir SaaS urunu for yardimci musteri destek asistanisin. Acikca, empatik ve adim adim yanit ver, yaniti kisa ve pratik tut.',
    promptEn: 'Bir SaaS urunu for yardimci musteri destek asistanisin. Acikca, empatik ve adim adim yanit ver, yaniti kisa ve pratik tut.',
    tags: ['llm-system', 'customer-support', 'musteri-destek', 'saas', 'production-tested'],
  },
  {
    id: 'ds-llm-data-analysis',
    category: 'LLM System Talimatlari',
    categoryEn: 'LLM System Instructions',
    name: 'Veri Analizi Asistani',
    nameEn: 'Data Analysis Assistant',
    prompt: 'Kullanicilarin veri, metrikler ve modeller hakkinda akil yurutmesine yardimci olan bir veri analizi asistanisin. Odunlesimleri acikla, adimlari belirt ve dili erisilebilir ama kesin tut.',
    promptEn: 'Kullanicilarin veri, metrikler ve modeller hakkinda akil yurutmesine yardimci olan bir veri analizi asistanisin. Odunlesimleri acikla, adimlari belirt ve dili erisilebilir ama kesin tut.',
    tags: ['llm-system', 'data-analysis', 'veri-analizi', 'metrikler', 'production-tested'],
  },
  {
    id: 'ds-llm-internal-qa',
    category: 'LLM System Talimatlari',
    categoryEn: 'LLM System Instructions',
    name: 'Dahili Bilgi Asistani',
    nameEn: 'Internal Knowledge Assistant',
    prompt: 'Ekip arkadaslarinin dokumantasyon, politikalar ve dahili araclarda gezinmesine yardimci olan dahili bilgi asistanisin. Kesin, ozlu ol ve ilgili bilgilere ve sonraki adimlara yonlendir.',
    promptEn: 'Ekip arkadaslarinin dokumantasyon, politikalar ve dahili araclarda gezinmesine yardimci olan dahili bilgi asistanisin. Kesin, ozlu ol ve ilgili bilgilere ve sonraki adimlara yonlendir.',
    tags: ['llm-system', 'internal-qa', 'dokumantasyon', 'bilgi-yonetimi', 'production-tested'],
  },
];

// ═══════════════════════════════════════════════════════════════
// 2) TALIMAT SABLONU META-PROMPT'LARI (instruction_template patterns)
//    6 farkli template stratejisi
// ═══════════════════════════════════════════════════════════════
export const LLM_INSTRUCTION_TEMPLATE_PROMPTS: NotebookLmPrompt[] = [
  {
    id: 'ds-template-analytics-helper',
    category: 'LLM Talimat Sablonlari',
    categoryEn: 'LLM Instruction Templates',
    name: 'Analitik Yardimci Sablonu',
    nameEn: 'Analytics Helper Template',
    prompt: 'Analitik yardimci sablonu: Verilere dayali icgoruler sunmak, metrikleri aciklamak ve karar verme sureclerini desteklemek for tasarlanmis LLM talimat kalibi. Kullanim alanlari: brainstorming, kodlama, content yazimi, musteri destegi, veri analizi, dahili bilgi yonetimi.',
    promptEn: 'Analitik yardimci sablonu: Verilere dayali icgoruler sunmak, metrikleri aciklamak ve karar verme sureclerini desteklemek for tasarlanmis LLM talimat kalibi. Kullanim alanlari: brainstorming, kodlama, content yazimi, musteri destegi, veri analizi, dahili bilgi yonetimi.',
    tags: ['template', 'analytics', 'instruction-design', 'llm-ops'],
  },
  {
    id: 'ds-template-code-assistant-secure',
    category: 'LLM Talimat Sablonlari',
    categoryEn: 'LLM Instruction Templates',
    name: 'Guvenli Kod Asistani Sablonu',
    nameEn: 'Secure Code Assistant Template',
    prompt: 'Guvenli kod asistani sablonu: security odakli kodlama pratigi sunan, security aciklarini onleyen ve en iyi security uygulamalarini takip eden LLM talimat kalibi. Input verification, output encoding ve guvenli API kullanimini vurgular.',
    promptEn: 'Secure Code Assistant Template: An LLM instruction pattern that delivers security-focused coding practices, prevents vulnerabilities, and follows security best practices. Emphasizes input validation, output encoding, and secure API usage.',
    tags: ['template', 'security', 'secure-coding', 'instruction-design', 'llm-ops'],
  },
  {
    id: 'ds-template-creative-writer',
    category: 'LLM Talimat Sablonlari',
    categoryEn: 'LLM Instruction Templates',
    name: 'Yaratici Yazar Sablonu',
    nameEn: 'Creative Writer Template',
    prompt: 'Yaratici yazar sablonu: Yaratici ve ozgun content uretimi for tasarlanmis LLM talimat kalibi. Hikaye anlatimi, senaryo yazimi, blog yazilari ve pazarlama metinleri for kullanilir. Ton, stil ve hedef kitle uyumu saglar.',
    promptEn: 'Creative Writer Template: An LLM instruction pattern designed for creative and original content generation. Used for storytelling, screenwriting, blog posts, and marketing copy. Ensures tone, style, and audience alignment.',
    tags: ['template', 'creative-writing', 'yaratici-yazim', 'instruction-design', 'llm-ops'],
  },
  {
    id: 'ds-template-general-assistant',
    category: 'LLM Talimat Sablonlari',
    categoryEn: 'LLM Instruction Templates',
    name: 'Genel Amacli Asistan Sablonu',
    nameEn: 'General Assistant Template',
    prompt: 'Genel amacli asistan sablonu: Genis kullanim alanlari for esnek, adaptif bir LLM talimat kalibi. Tum kullanim durumlarina (kodlama, yazim, analysis, destek) tek bir sablonla uyum saglar. Baglam farkindaligi ve dinamik yanit stratejisi kullanir.',
    promptEn: 'General Assistant Template: A flexible, adaptive LLM instruction pattern for broad use cases. Adapts to all scenarios (coding, writing, analysis, support) via a single template. Uses context awareness and dynamic response strategy.',
    tags: ['template', 'general-purpose', 'genel-amacli', 'instruction-design', 'llm-ops'],
  },
  {
    id: 'ds-template-internal-policy-qa',
    category: 'LLM Talimat Sablonlari',
    categoryEn: 'LLM Instruction Templates',
    name: 'Dahili Politika Soru-Cevap Sablonu',
    nameEn: 'Internal Policy QA Template',
    prompt: 'Dahili politika soru-cevap sablonu: Sirket politikalari, prosedurler ve dahili dokumantasyon uzerinde dogru yanitlar sunan LLM talimat kalibi. Sadece yetkili kaynaklara dayanir, hallusinasyonu minimize eder.',
    promptEn: 'Internal Policy QA Template: An LLM instruction pattern that delivers accurate answers about company policies, procedures, and internal documentation. Relies only on authorized sources, minimizes hallucination.',
    tags: ['template', 'policy', 'internal-qa', 'instruction-design', 'llm-ops'],
  },
  {
    id: 'ds-template-support-strict',
    category: 'LLM Talimat Sablonlari',
    categoryEn: 'LLM Instruction Templates',
    name: 'Siki Destek Sablonu',
    nameEn: 'Strict Support Template',
    prompt: 'Siki destek sablonu: Kati kurallar ve SLA\'lar cercevesinde musteri destegi sunan LLM talimat kalibi. Yanit suresi, ton tutarliligi ve eskalasyon kurallarini siki bir sekilde takip eder. Uyumsuz istekleri nazikce reddeder.',
    promptEn: 'Strict Support Template: An LLM instruction pattern that delivers customer support within strict rules and SLAs. Strictly follows response time, tone consistency, and escalation rules. Politely declines non-compliant requests.',
    tags: ['template', 'support', 'strict', 'sla', 'instruction-design', 'llm-ops'],
  },
];

// ═══════════════════════════════════════════════════════════════
// 3) PROMPTS.CHAT system PROMPT'LARI
// ═══════════════════════════════════════════════════════════════
export const PROMPTS_CHAT_SYSTEM_PROMPTS: NotebookLmPrompt[] = [
  {
    id: 'ds-pchat-system-architect',
    category: 'System Prompt\'lari',
    categoryEn: 'System Prompts',
    name: 'Deneyimli System Architecture',
    nameEn: 'Experienced System Architect',
    prompt: '25+ yillik deneyime sahip bir system mimarisin. Verilen fikir for calisabilir bir system tasarla: problemi acikla, bilesenleri tanimla, adim adim surec belirle, kaynaklari listele, riskleri degerlendir, olceklendirme planla ve uygulama plani sun. Sadece kanitlanmis yaklasimlari kullan.',
    promptEn: 'You are an experienced System Architect with 25+ years of expertise in designing practical, real-world systems across multiple domains. Your task is to design a fully workable system for the given idea: explain the problem, define components, describe step-by-step process, list resources, identify risks, explain scaling, and provide implementation plan. Use only existing, proven approaches.',
    tags: ['system-prompt', 'architecture', 'system-tasarim', 'prompts-chat'],
  },
  {
    id: 'ds-pchat-wfgy-reasoning-os',
    category: 'System Prompt\'lari',
    categoryEn: 'System Prompts',
    name: 'WFGY Akil Yurutme Isletim Sistemi',
    nameEn: 'WFGY Self-Healing Reasoning OS',
    prompt: 'WFGY Core\'sun — herhangi bir LLM uzerinde calisan hafif bir akil yurutme isletim sistemi. Yanitlari: kullanicinin gercek hedefiyle uyumlu tut, bilinen/bilinmeyen ayrimini acik yap, sonradan error ayiklamayi kolay kil.',
    promptEn: 'You are WFGY Core — a lightweight reasoning operating system that runs on top of any strong LLM (ChatGPT, Claude, Gemini, local models). Keep answers: aligned with the user\'s actual goal, explicit about what is known vs unknown, easy to debug later.',
    tags: ['system-prompt', 'reasoning', 'akil-yurutme', 'meta-prompt', 'prompts-chat'],
  },
];

// ═══════════════════════════════════════════════════════════════
// 4) LLM ANALITIK KULLANIM KALIPLARI (interactions + sessions)
//    Gercek kullanim verisinden cikarilan prompt kaliplari
// ═══════════════════════════════════════════════════════════════
export const LLM_ANALYTICS_USE_CASE_PROMPTS: NotebookLmPrompt[] = [
  {
    id: 'ds-usecase-brainstorming',
    category: 'LLM Kullanim Kaliplari',
    categoryEn: 'LLM Use Case Patterns',
    name: 'Beyin Firtinasi Kullanim Kalibi',
    nameEn: 'Brainstorming Use Case Pattern',
    prompt: 'Beyin firtinasi kullanim kalibi: Urun fikirleri, kampanya sloganlari, ozellik alternatifleri uretmek for. Optimum settings: temperature 0.7-0.9, max_tokens 768-1024. Basari metrigi: user memnuniyeti (CSAT) ve uretilen alternatif sayisi.',
    promptEn: 'Brainstorming Use Case Pattern: For generating product ideas, campaign slogans, feature alternatives. Optimal settings: temperature 0.7-0.9, max_tokens 768-1024. Success metrics: CSAT and number of alternatives generated.',
    tags: ['use-case', 'brainstorming', 'analytics', 'llm-ops'],
  },
  {
    id: 'ds-usecase-coding-assistant',
    category: 'LLM Kullanim Kaliplari',
    categoryEn: 'LLM Use Case Patterns',
    name: 'Kodlama Asistani Kullanim Kalibi',
    nameEn: 'Coding Assistant Use Case Pattern',
    prompt: 'Kodlama asistani kullanim kalibi: Error ayiklama, kod uretimi, code review for. Optimum settings: temperature 0.2-0.4, max_tokens 1024-2048. En sik araclar: code execution, linting. Basari metrigi: cozum dogrulugu ve ilk seferde cozum orani.',
    promptEn: 'Coding Assistant Use Case Pattern: For debugging, code generation, code review. Optimal settings: temperature 0.2-0.4, max_tokens 1024-2048. Most used tools: code execution, linting. Success metrics: solution accuracy and first-attempt resolution rate.',
    tags: ['use-case', 'coding', 'analytics', 'llm-ops'],
  },
  {
    id: 'ds-usecase-content-writing',
    category: 'LLM Kullanim Kaliplari',
    categoryEn: 'LLM Use Case Patterns',
    name: 'Content Yazim Kullanim Kalibi',
    nameEn: 'Content Writing Use Case Pattern',
    prompt: 'Content yazim kullanim kalibi: Blog, e-posta, sosyal medya, pazarlama metni for. Optimum settings: temperature 0.5-0.7, max_tokens 1024. Ton ve stil tutarliligi kritik. Basari metrigi: yeniden yazim orani ve user onay hizi.',
    promptEn: 'Content Writing Use Case Pattern: For blogs, emails, social media, marketing copy. Optimal settings: temperature 0.5-0.7, max_tokens 1024. Tone and style consistency are critical. Success metrics: rewrite rate and user approval speed.',
    tags: ['use-case', 'content-writing', 'analytics', 'llm-ops'],
  },
  {
    id: 'ds-usecase-customer-support',
    category: 'LLM Kullanim Kaliplari',
    categoryEn: 'LLM Use Case Patterns',
    name: 'Musteri Destek Kullanim Kalibi',
    nameEn: 'Customer Support Use Case Pattern',
    prompt: 'Musteri destek kullanim kalibi: Bilet cozumu, FAQ yanitlama, eskalasyon yonetimi for. Optimum settings: temperature 0.1-0.3, max_tokens 512. Empati ve adim-adim yanit onemli. En yuksek etkilesim hacmi bu kategoride. Basari metrigi: cozum orani ve CSAT.',
    promptEn: 'Customer Support Use Case Pattern: For ticket resolution, FAQ answering, escalation management. Optimal settings: temperature 0.1-0.3, max_tokens 512. Empathy and step-by-step responses are important. Highest interaction volume in this category. Success metrics: resolution rate and CSAT.',
    tags: ['use-case', 'customer-support', 'analytics', 'llm-ops'],
  },
  {
    id: 'ds-usecase-data-analysis',
    category: 'LLM Kullanim Kaliplari',
    categoryEn: 'LLM Use Case Patterns',
    name: 'Veri Analizi Kullanim Kalibi',
    nameEn: 'Data Analysis Use Case Pattern',
    prompt: 'Veri analizi kullanim kalibi: Metrik yorumlama, trend analizi, model degerlendirme for. Optimum settings: temperature 0.1-0.3, max_tokens 1024. Kesinlik ve odunlesim aciklamalari kritik. Basari metrigi: icgoru dogrulugu ve uygulama orani.',
    promptEn: 'Data Analysis Use Case Pattern: For metric interpretation, trend analysis, model evaluation. Optimal settings: temperature 0.1-0.3, max_tokens 1024. Precision and trade-off explanations are critical. Success metrics: insight accuracy and implementation rate.',
    tags: ['use-case', 'data-analysis', 'analytics', 'llm-ops'],
  },
  {
    id: 'ds-usecase-internal-qa',
    category: 'LLM Kullanim Kaliplari',
    categoryEn: 'LLM Use Case Patterns',
    name: 'Dahili Bilgi Yonetimi Kullanim Kalibi',
    nameEn: 'Internal QA Use Case Pattern',
    prompt: 'Dahili bilgi yonetimi kullanim kalibi: Dokumantasyon arama, politika aciklama, arac kullanim rehberligi for. Optimum settings: temperature 0.1, max_tokens 512. Kaynak referansi zorunlu. En dusuk etkilesim hacmi ama en yuksek dogruluk beklentisi.',
    promptEn: 'Internal QA Use Case Pattern: For documentation search, policy clarification, tool usage guidance. Optimal settings: temperature 0.1, max_tokens 512. Source references are mandatory. Lowest interaction volume but highest accuracy expectation.',
    tags: ['use-case', 'internal-qa', 'analytics', 'llm-ops'],
  },
];

// ═══════════════════════════════════════════════════════════════
// 5) LLM OPS & PERFORMANS PROMPT'LARI (analytics-derived)
//    session ve etkilesim verilerinden cikarilan operasyonel kaliplar
// ═══════════════════════════════════════════════════════════════
export const LLM_OPS_PROMPTS: NotebookLmPrompt[] = [
  {
    id: 'ds-ops-quality-scoring',
    category: 'LLMOps Kaliplari',
    categoryEn: 'LLMOps Patterns',
    name: 'Yanit Kalite Puanlama Sistemi',
    nameEn: 'Response Quality Scoring System',
    prompt: 'LLM yanit kalitesi puanlama sistemi tasarla: (1) Dogruluk — hallusinasyon, toksiklik, security blogu kontrolu, (2) Format — yapisal error, arac hatasi kontrolu, (3) Performans — gecikme, token/saniye, maliyet analizi. 0-1 arasi bilesik skor uret.',
    promptEn: 'Design an LLM response quality scoring system: (1) Accuracy — hallucination, toxicity, safety block checks, (2) Format — structural error, tool error checks, (3) Performance — latency, tokens/second, cost analysis. Generate a composite score between 0-1.',
    tags: ['llm-ops', 'quality', 'scoring', 'monitoring'],
  },
  {
    id: 'ds-ops-failure-analysis',
    category: 'LLMOps Kaliplari',
    categoryEn: 'LLMOps Patterns',
    name: 'Error Analizi ve Onarim Stratejisi',
    nameEn: 'Failure Analysis & Repair Strategy',
    prompt: 'LLM error analizi ve onarim stratejisi: Error turleri — formatting_error, safety_block, hallucination, tool_error, latency_timeout. Her error turu for: (1) Tespit yontemi, (2) Kok neden analizi, (3) Otomatik onarim stratejisi (retry, enable_tools, manual_post_edit), (4) Eskalasyon kurali.',
    promptEn: 'LLM failure analysis and repair strategy: Failure types — formatting_error, safety_block, hallucination, tool_error, latency_timeout. For each failure type: (1) Detection method, (2) Root cause analysis, (3) Auto-repair strategy (retry, enable_tools, manual_post_edit), (4) Escalation rule.',
    tags: ['llm-ops', 'failure-analysis', 'repair', 'monitoring'],
  },
  {
    id: 'ds-ops-cost-optimization',
    category: 'LLMOps Kaliplari',
    categoryEn: 'LLMOps Patterns',
    name: 'LLM Maliyet Optimizasyonu',
    nameEn: 'LLM Cost Optimization',
    prompt: 'LLM maliyet optimizasyonu stratejisi: (1) Token kullanimi analizi — prompt/completion orani, (2) Model secimi — task karmasikligina gore model routing, (3) Cache stratejisi — benzer sorgular for yanit onbellegi, (4) Batch isleme — dusuk oncelikli istekleri gruplama. Hedef: istek basina %30 maliyet dususu.',
    promptEn: 'LLM cost optimization strategy: (1) Token usage analysis — prompt/completion ratio, (2) Model selection — model routing by task complexity, (3) Cache strategy — response caching for similar queries, (4) Batch processing — grouping low-priority requests. Target: 30% cost reduction per request.',
    tags: ['llm-ops', 'cost', 'optimization', 'maliyet'],
  },
  {
    id: 'ds-ops-user-segmentation',
    category: 'LLMOps Kaliplari',
    categoryEn: 'LLMOps Patterns',
    name: 'User Segmentasyonu ve Risk Analizi',
    nameEn: 'User Segmentation & Risk Analysis',
    prompt: 'LLM user segmentasyonu: Segment turleri — individual, team, enterprise_team. Risk bayraklari: yuksek error orani (>%20), dusuk CSAT (<3.0), yuksek eskalasyon orani. Hesap seviyeleri: free, pro, enterprise. Her segment for ozel prompt stratejisi ve SLA tanimla.',
    promptEn: 'LLM user segmentation: Segment types — individual, team, enterprise_team. Risk flags: high failure rate (>20%), low CSAT (<3.0), high escalation rate. Account tiers: free, pro, enterprise. Define custom prompt strategy and SLA for each segment.',
    tags: ['llm-ops', 'segmentation', 'risk-analysis', 'user'],
  },
  {
    id: 'ds-ops-ab-testing',
    category: 'LLMOps Kaliplari',
    categoryEn: 'LLMOps Patterns',
    name: 'Prompt A/B Test Cercevesi',
    nameEn: 'Prompt A/B Testing Framework',
    prompt: 'Prompt A/B test cercevesi: (1) Hipotez — hangi prompt varyanti daha iyi performans gosterir, (2) Metrikler — CSAT, cozum orani, token maliyeti, gecikme, (3) Trafik bolusumu — %50/%50 veya kademeli dagitim, (4) Istatistiksel anlamlilik — minimum orneklem buyuklugu hesabi, (5) Karar kurali — hangi varyant kazandigini belirleme.',
    promptEn: 'Prompt A/B testing framework: (1) Hypothesis — which prompt variant performs better, (2) Metrics — CSAT, resolution rate, token cost, latency, (3) Traffic split — 50/50 or gradual rollout, (4) Statistical significance — minimum sample size calculation, (5) Decision rule — determining the winning variant.',
    tags: ['llm-ops', 'ab-testing', 'optimization', 'deneysel'],
  },
  {
    id: 'ds-ops-multi-model-routing',
    category: 'LLMOps Kaliplari',
    categoryEn: 'LLMOps Patterns',
    name: 'Cok Modelli Yonlendirme Stratejisi',
    nameEn: 'Multi-Model Routing Strategy',
    prompt: 'Cok modelli yonlendirme: Model saglayicilari (OpenAI, Anthropic, Google, Meta) arasinda akilli yonlendirme. Karar faktorleri: (1) Task turu — kodlama→claude, yaratici→gpt4, analysis→gemini, (2) Maliyet butcesi, (3) Gecikme gereksinimleri, (4) Bolge kisitlamalari. Fallback zinciri ve circuit breaker kalibi uygula.',
    promptEn: 'Multi-model routing: Intelligent routing between model providers (OpenAI, Anthropic, Google, Meta). Decision factors: (1) Task type — coding→claude, creative→gpt4, analysis→gemini, (2) Cost budget, (3) Latency requirements, (4) Region constraints. Implement fallback chain and circuit breaker pattern.',
    tags: ['llm-ops', 'routing', 'multi-model', 'architecture'],
  },
];

// ═══════════════════════════════════════════════════════════════
// 6) SFT / TALIMAT AYARLAMA PROMPT'LARI (instruction_tuning_samples)
//    Egitim verisi kaliplarindan cikarilan prompt muhendisligi kaliplari
// ═══════════════════════════════════════════════════════════════
export const SFT_PROMPT_PATTERNS: NotebookLmPrompt[] = [
  {
    id: 'ds-sft-structured-request',
    category: 'SFT Prompt Kaliplari',
    categoryEn: 'SFT Prompt Patterns',
    name: 'Yapilandirilmis Istek Formati',
    nameEn: 'Structured Request Format',
    prompt: 'Yapilandirilmis istek formati: Baglam → Istek → Gereksinimler → Format seklinde 4 bolumlu prompt yapisi. Baglam uretim sistemi bilgisi verir, Istek spesifik gorevi tanimlar, Gereksinimler kisitlamalari belirtir, Format output seklini belirler. Bu yapi SFT egitiminde en yuksek kalite puanini almistir.',
    promptEn: 'Structured Request Format: A 4-section prompt structure of Context → Request → Requirements → Format. Context provides production system info, Request defines the specific task, Requirements specify constraints, Format determines output shape. This structure achieved the highest quality scores in SFT training.',
    tags: ['sft', 'prompt-engineering', 'structured', 'best-practice'],
  },
  {
    id: 'ds-sft-chain-of-thought',
    category: 'SFT Prompt Kaliplari',
    categoryEn: 'SFT Prompt Patterns',
    name: 'Dusunce Zinciri Kalibi',
    nameEn: 'Chain of Thought Pattern',
    prompt: 'Dusunce zinciri kalibi: Karmasik gorevler for adim adim akil yurutme talimati. "Adim adim dusun ve her adimi acikla" ifadesi ekle. Sonuca dogrudan atlamak yerine ara adimlari goster. Error ayiklama ve verification for kritik.',
    promptEn: 'Chain of Thought Pattern: Step-by-step reasoning instruction for complex tasks. Add "Think step by step and explain each step." Show intermediate steps instead of jumping to conclusions. Critical for debugging and verification.',
    tags: ['sft', 'chain-of-thought', 'reasoning', 'prompt-engineering'],
  },
  {
    id: 'ds-sft-guardrails',
    category: 'SFT Prompt Kaliplari',
    categoryEn: 'SFT Prompt Patterns',
    name: 'security Raylari Kalibi',
    nameEn: 'Guardrails Pattern',
    prompt: 'security raylari kalibi: (1) Input verification — zararli content filtreleme, (2) Output verification — format kontrolu, hallusinasyon tespiti, (3) Konu sinirlari — ilgisiz sorgulara nazik reddetme, (4) Eskalasyon — belirsiz durumlarda insana yonlendirme. Uretim sistemlerinde %15 error azalmasi saglar.',
    promptEn: 'Guardrails Pattern: (1) Input validation — harmful content filtering, (2) Output validation — format checking, hallucination detection, (3) Topic boundaries — polite decline for irrelevant queries, (4) Escalation — routing to human for uncertain cases. Reduces errors by 15% in production systems.',
    tags: ['sft', 'guardrails', 'safety', 'prompt-engineering'],
  },
  {
    id: 'ds-sft-few-shot',
    category: 'SFT Prompt Kaliplari',
    categoryEn: 'SFT Prompt Patterns',
    name: 'Az Ornekli Ogrenme Kalibi',
    nameEn: 'Few-Shot Learning Pattern',
    prompt: 'Az ornekli ogrenme kalibi: 2-5 example input/output cifti sunarak modeli yonlendir. Ornekler: (1) Farkli zorluklarda olmali, (2) Beklenen formati gostermeli, (3) Uc durumlari kapsamali. Prompt boyutu artsa da dogruluk %20-40 artar.',
    promptEn: 'Few-Shot Learning Pattern: Guide the model by providing 2-5 example input/output pairs. Examples should: (1) Vary in difficulty, (2) Demonstrate expected format, (3) Cover edge cases. While prompt size increases, accuracy improves by 20-40%.',
    tags: ['sft', 'few-shot', 'ogrenme', 'prompt-engineering'],
  },
  {
    id: 'ds-sft-self-consistency',
    category: 'SFT Prompt Kaliplari',
    categoryEn: 'SFT Prompt Patterns',
    name: 'Oz-Tutarlilik Verification Kalibi',
    nameEn: 'Self-Consistency Verification Pattern',
    prompt: 'Oz-tutarlilik verification kalibi: (1) Ayni soruya 3 farkli yaklasimla yanit uret, (2) Yanitlari karsilastir, (3) Tutarsizliklari belirle, (4) Cogunluk oyuyla final yaniti select. Kritik kararlar ve yuksek riskli senaryolar for kullan.',
    promptEn: 'Self-Consistency Verification Pattern: (1) Generate 3 responses with different approaches to the same question, (2) Compare responses, (3) Identify inconsistencies, (4) Select final answer by majority vote. Use for critical decisions and high-risk scenarios.',
    tags: ['sft', 'self-consistency', 'verification', 'prompt-engineering'],
  },
];

// ═══════════════════════════════════════════════════════════════
// 7) MAKALE YAZIM PROMPT KALIPLARI (train_v2_drcat_02.csv)
//    Egitim veri setinden cikarilan yazim prompt kaliplari
// ═══════════════════════════════════════════════════════════════
export const ESSAY_WRITING_PROMPTS: NotebookLmPrompt[] = [
  {
    id: 'ds-essay-persuasive',
    category: 'Makale Yazim Kaliplari',
    categoryEn: 'Essay Writing Patterns',
    name: 'Ikna Edici Makale Yazimi',
    nameEn: 'Persuasive Essay Writing',
    prompt: 'Ikna edici makale yaz: Verilen konu hakkinda guclu bir tez cumlesi olustur, destekleyici argumanlar sun, karsit gorusleri curut ve guclu bir sonucla bitir. Yapi: input→Tez→3 Arguman→Karsit Gorus→Curutme→result. AI-tespit edilemez dogal bir stil kullan.',
    promptEn: 'Write a persuasive essay: Create a strong thesis statement about the given topic, present supporting arguments, refute opposing views, and end with a powerful conclusion. Structure: Introduction→Thesis→3 Arguments→Counter-argument→Refutation→Conclusion. Use a natural style that is AI-undetectable.',
    tags: ['essay', 'persuasive', 'writing', 'egitim-verisi'],
  },
  {
    id: 'ds-essay-argumentative',
    category: 'Makale Yazim Kaliplari',
    categoryEn: 'Essay Writing Patterns',
    name: 'Tartismaci Makale Yazimi',
    nameEn: 'Argumentative Essay Writing',
    prompt: 'Tartismaci makale yaz: Lehte ve aleyhte argumanlari dengeli bir sekilde sun. Her argumani kanitlarla destekle. Tarafsiz bir ton kullanarak okuyucunun kendi kararini vermesine izin ver. Kaynak gosterimi ve mantiksal tutarlilik kritik.',
    promptEn: 'Write an argumentative essay: Present arguments for and against in a balanced manner. Support each argument with evidence. Use a neutral tone allowing the reader to form their own judgment. Source citation and logical consistency are critical.',
    tags: ['essay', 'argumentative', 'writing', 'egitim-verisi'],
  },
  {
    id: 'ds-essay-expository',
    category: 'Makale Yazim Kaliplari',
    categoryEn: 'Essay Writing Patterns',
    name: 'Aciklayici Makale Yazimi',
    nameEn: 'Expository Essay Writing',
    prompt: 'Aciklayici makale yaz: Verilen konuyu objektif ve bilgilendirici bir sekilde acikla. Tanim, siniflandirma, karsilastirma, neden-result iliskisi gibi yontemleri kullan. Kisisel gorus belirtme, sadece olgulara dayanarak bilgi sun.',
    promptEn: 'Write an expository essay: Explain the given topic objectively and informatively. Use methods like definition, classification, comparison, cause-and-effect. Do not express personal opinions, present information based only on facts.',
    tags: ['essay', 'expository', 'writing', 'egitim-verisi'],
  },
  {
    id: 'ds-essay-technology-impact',
    category: 'Makale Yazim Kaliplari',
    categoryEn: 'Essay Writing Patterns',
    name: 'Teknoloji Etki Analizi Makalesi',
    nameEn: 'Technology Impact Analysis Essay',
    prompt: 'Teknolojinin toplum uzerindeki etkisini analysis eden bir makale yaz: Telefon kullanimi, sosyal medya, yapay zeka gibi konularda olumlu ve olumsuz etkileri tartis. Gercek veriler ve istatistiklerle destekle. Gelecege yonelik ongoruler sun.',
    promptEn: 'Write an essay analyzing the impact of technology on society: Discuss positive and negative effects on topics like phone usage, social media, AI. Support with real data and statistics. Provide forward-looking predictions.',
    tags: ['essay', 'technology', 'impact', 'analysis', 'egitim-verisi'],
  },
  {
    id: 'ds-essay-ai-detection-resistant',
    category: 'Makale Yazim Kaliplari',
    categoryEn: 'Essay Writing Patterns',
    name: 'Dogal Dil Yazim Kalibi',
    nameEn: 'Natural Language Writing Pattern',
    prompt: 'Dogal ve insan benzeri bir yazim stili kullan: (1) Variable cumle uzunluklari, (2) Gunluk dil ifadeleri, (3) Kisisel deneyim referanslari, (4) Kucuk dilbilgisi cesitlilikleri, (5) Tutarli ton ama robotik olmayan akis. AI-uretilmis content tespitinden kacinmak for organik yapi kur.',
    promptEn: 'Use a natural and human-like writing style: (1) Varied sentence lengths, (2) Colloquial expressions, (3) Personal experience references, (4) Minor grammatical variations, (5) Consistent tone but non-robotic flow. Build organic structure to avoid AI-generated content detection.',
    tags: ['essay', 'natural-language', 'ai-detection', 'writing-style'],
  },
];

// ═══════════════════════════════════════════════════════════════
// 8) EGITIM VERI SETI analysis PROMPT'LARI (archive 4 & 5)
//    Veri seti analysis ve isleme kaliplari
// ═══════════════════════════════════════════════════════════════
export const DATASET_ANALYSIS_PROMPTS: NotebookLmPrompt[] = [
  {
    id: 'ds-analysis-csv-explorer',
    category: 'Veri Seti Analizi',
    categoryEn: 'Dataset Analysis',
    name: 'CSV Veri Kesif Analizi',
    nameEn: 'CSV Data Exploration Analysis',
    prompt: 'Verilen CSV veri setini analysis et: (1) Sutun turlerini ve istatistiklerini cikar, (2) Eksik veri oranlarini hesapla, (3) Aykiri degerleri tespit et, (4) Korelasyon matrisini olustur, (5) Ilk 5 satirlik example goster. Pandas kodu ile birlikte metin ozet sun.',
    promptEn: 'Analyze the given CSV dataset: (1) Extract column types and statistics, (2) Calculate missing data rates, (3) Detect outliers, (4) Create correlation matrix, (5) Show sample of first 5 rows. Provide text summary along with Pandas code.',
    tags: ['dataset', 'csv', 'eda', 'analysis'],
  },
  {
    id: 'ds-analysis-label-distribution',
    category: 'Veri Seti Analizi',
    categoryEn: 'Dataset Analysis',
    name: 'Etiket Dagilimi Analizi',
    nameEn: 'Label Distribution Analysis',
    prompt: 'Egitim veri setindeki etiket dagilimini analysis et: (1) Sinif basina example sayisi, (2) Dengesizlik orani, (3) Duzeltme stratejileri — oversampling, undersampling, SMOTE, class weights. Dagilim grafigi for matplotlib/seaborn kodu uret.',
    promptEn: 'Analyze label distribution in the training dataset: (1) Sample count per class, (2) Imbalance ratio, (3) Correction strategies — oversampling, undersampling, SMOTE, class weights. Generate matplotlib/seaborn code for distribution chart.',
    tags: ['dataset', 'labels', 'imbalance', 'analysis'],
  },
  {
    id: 'ds-analysis-text-classification',
    category: 'Veri Seti Analizi',
    categoryEn: 'Dataset Analysis',
    name: 'Metin Siniflandirma Pipeline',
    nameEn: 'Text Classification Pipeline',
    prompt: 'Metin siniflandirma pipeline olustur: (1) Veri on isleme — temizleme, tokenizasyon, (2) Ozellik cikarimi — TF-IDF, word embeddings, (3) Model secimi — naive bayes, SVM, transformer, (4) Egitim/verification bolunmesi, (5) Degerlendirme — accuracy, F1, precision, recall. Scikit-learn ve Hugging Face kodu sun.',
    promptEn: 'Create a text classification pipeline: (1) Data preprocessing — cleaning, tokenization, (2) Feature extraction — TF-IDF, word embeddings, (3) Model selection — naive bayes, SVM, transformer, (4) Train/validation split, (5) Evaluation — accuracy, F1, precision, recall. Provide scikit-learn and Hugging Face code.',
    tags: ['dataset', 'classification', 'nlp', 'ml-pipeline'],
  },
  {
    id: 'ds-analysis-session-analytics',
    category: 'Veri Seti Analizi',
    categoryEn: 'Dataset Analysis',
    name: 'LLM session Analitik Raporu',
    nameEn: 'LLM Session Analytics Report',
    prompt: 'LLM session analitik raporu olustur: (1) Ortalama session suresi ve istek sayisi, (2) Error oranlari — kanal ve kullanim durumuna gore, (3) Gecikme dagilimi — P50/P95/P99, (4) Maliyet analizi — session basina/istek basina, (5) Risk oturumlari — yuksek error veya eskalasyon orani olan oturumlar. Dashboard tasarimi oner.',
    promptEn: 'Create an LLM session analytics report: (1) Average session duration and request count, (2) Failure rates — by channel and use case, (3) Latency distribution — P50/P95/P99, (4) Cost analysis — per session/per request, (5) Risk sessions — sessions with high failure or escalation rate. Suggest dashboard design.',
    tags: ['dataset', 'analytics', 'session', 'llm-ops'],
  },
  {
    id: 'ds-analysis-user-behavior',
    category: 'Veri Seti Analizi',
    categoryEn: 'Dataset Analysis',
    name: 'User Davranis Analizi',
    nameEn: 'User Behavior Analysis',
    prompt: 'LLM user davranis analizi yap: (1) Kullanim kaliplari — saat, gun, kanal tercih, (2) Churn riski — dusen CSAT, azalan kullanim, (3) Power user segmenti — yuksek hacim, coklu kullanim durumu, (4) Ozellik benimseme — arac kullanimi, retry orani, (5) Kohort analizi — zaman icinde davranis degisimi.',
    promptEn: 'Perform LLM user behavior analysis: (1) Usage patterns — hour, day, channel preference, (2) Churn risk — declining CSAT, decreasing usage, (3) Power user segment — high volume, multiple use cases, (4) Feature adoption — tool usage, retry rate, (5) Cohort analysis — behavior changes over time.',
    tags: ['dataset', 'user-behavior', 'analytics', 'segmentation'],
  },
];

// ═══════════════════════════════════════════════════════════════
// 9) TUM VERI SETI PROMPT'LARI (BIRLESIK)
// ═══════════════════════════════════════════════════════════════
export const ALL_DATASET_PROMPTS: NotebookLmPrompt[] = [
  ...LLM_SYSTEM_INSTRUCTION_PROMPTS,
  ...LLM_INSTRUCTION_TEMPLATE_PROMPTS,
  ...PROMPTS_CHAT_SYSTEM_PROMPTS,
  ...LLM_ANALYTICS_USE_CASE_PROMPTS,
  ...LLM_OPS_PROMPTS,
  ...SFT_PROMPT_PATTERNS,
  ...ESSAY_WRITING_PROMPTS,
  ...DATASET_ANALYSIS_PROMPTS,
];
