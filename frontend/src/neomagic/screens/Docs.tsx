import React, { useMemo, useState } from "react";
import { Icon, Chip } from "../components";

const DOC_CARDS = [
  { icon: "rocket", title: "Hızlı başlangıç", desc: "5 dakikada ilk prompt'unuzu compile edin.", chip: "5 min", tone: "mint" as const },
  { icon: "book", title: "Framework rehberi", desc: "57 reasoning framework: ne zaman hangisini seçmeli.", chip: "guide", tone: "violet" as const },
  { icon: "code", title: "DSL referansı", desc: "Prompt DSL söz dizimi ve örnekler.", chip: "ref", tone: "cyan" as const },
  { icon: "server", title: "API & SDK", desc: "REST API, TypeScript SDK, MCP server.", chip: "api", tone: "amber" as const },
  { icon: "shield", title: "Güvenlik & PII", desc: "KVKK, OWASP LLM Top 10, adversarial immunity.", chip: "sec", tone: "red" as const },
  { icon: "flask", title: "A/B & jüri", desc: "Tournament çalıştırma ve istatistik yorumlama.", chip: "lab", tone: "pink" as const },
];

const SDK_CODE = `import { NeoMagicClient } from "@neomagic/sdk";

const client = new NeoMagicClient({
  apiKey: process.env.NEOMAGIC_KEY,
});

const prompt = await client.compile({
  intent: "Müşteri destek asistanı, KVKK uyumlu, empati ağırlıklı",
  framework: "CoSTAR",
  domain: "backend",
  constraints: {
    pii_redact: true,
    token_budget: 800,
  },
});

const result = await client.run(prompt, {
  provider: "anthropic",
  model: "claude-opus-4.5",
});

console.log(result.judge);   // 4.7
console.log(result.tokens);  // 742
console.log(result.cost);    // 0.018`;

export const DocsScreen: React.FC = () => {
  const [search, setSearch] = useState("");
  const [openCard, setOpenCard] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(SDK_CODE);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch (err) {
      console.warn("[docs] kopyalama başarısız:", err);
    }
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return DOC_CARDS;
    return DOC_CARDS.filter(
      (c) => c.title.toLowerCase().includes(q) || c.desc.toLowerCase().includes(q),
    );
  }, [search]);

  return (
    <div className="fade-up" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div className="glass-strong panel-top-glow" style={{ padding: 28 }}>
        <Chip tone="cyan" dot>DOCS · v3.2</Chip>
        <h2 className="font-serif" style={{ fontSize: 32, lineHeight: 1.1, marginTop: 14 }}>
          Prompt'larınızı <span className="grad-text">üretime taşıyacak</span> rehberler.
        </h2>
        <p style={{ color: "var(--text-secondary)", fontSize: 13.5, marginTop: 8, maxWidth: 680 }}>
          Framework seçiminden adversarial test'e, DSL söz diziminden MCP entegrasyonuna kadar her şey burada.
        </p>
        <div style={{ marginTop: 18, position: "relative", maxWidth: 480 }}>
          <Icon name="search" size={14} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "var(--text-tertiary)" }} />
          <input
            className="input"
            style={{ paddingLeft: 38 }}
            placeholder="Dokümantasyon ara..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
        {filtered.length === 0 && (
          <div style={{ gridColumn: "1 / -1", padding: 24, textAlign: "center", color: "var(--text-tertiary)", fontSize: 13 }}>
            "{search}" için sonuç bulunamadı.
          </div>
        )}
        {filtered.map((c) => {
          const isOpen = openCard === c.title;
          return (
            <button
              key={c.title}
              type="button"
              onClick={() => setOpenCard((cur) => (cur === c.title ? null : c.title))}
              className="glass"
              style={{
                padding: 18,
                cursor: "pointer",
                textAlign: "left",
                background: isOpen ? "rgba(0,212,255,0.04)" : undefined,
                borderColor: isOpen ? "var(--neon-cyan)" : undefined,
                border: isOpen ? "1px solid var(--neon-cyan)" : undefined,
              }}
            >
              <div className="nm-row" style={{ marginBottom: 10 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 10,
                  background: "rgba(139,92,246,0.1)",
                  border: "1px solid var(--border-default)",
                  display: "inline-flex", alignItems: "center", justifyContent: "center",
                  color: "var(--neon-cyan)",
                }}>
                  <Icon name={c.icon} size={16} />
                </div>
                <span style={{ marginLeft: "auto" }}><Chip tone={c.tone}>{c.chip}</Chip></span>
              </div>
              <div style={{ fontSize: 15, fontWeight: 600 }}>{c.title}</div>
              <div style={{ fontSize: 12.5, color: "var(--text-tertiary)", marginTop: 6, lineHeight: 1.55 }}>{c.desc}</div>
              <div className="nm-row" style={{ marginTop: 12, fontSize: 12, color: "var(--neon-cyan)" }}>
                {isOpen ? "Kapat" : "Oku"} <Icon name="arrow_right" size={12} />
              </div>
              {isOpen && (
                <div style={{ marginTop: 10, padding: 10, borderRadius: 8, background: "rgba(10,12,24,0.55)", fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.55 }}>
                  Bu bölüm tam dokümantasyon sayfasından yüklenecek. Şu an için kısa özet: {c.desc}
                </div>
              )}
            </button>
          );
        })}
      </div>

      <div className="glass" style={{ padding: 0, overflow: "hidden" }}>
        <div className="nm-row" style={{ padding: "12px 18px", borderBottom: "1px solid var(--border-soft)" }}>
          <Icon name="code" size={14} />
          <span style={{ fontSize: 13, fontWeight: 600 }}>TypeScript SDK örneği</span>
          <span style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
            <Chip tone="cyan">ts</Chip>
            <button className="btn btn-soft btn-xs" onClick={handleCopy}>
              <Icon name="copy" size={11} /> {copied ? "Kopyalandı" : "Copy"}
            </button>
          </span>
        </div>
        <pre className="font-mono" style={{ margin: 0, padding: 18, fontSize: 12, lineHeight: 1.7, color: "var(--text-secondary)", overflowX: "auto" }}>
{SDK_CODE}
        </pre>
      </div>
    </div>
  );
};
