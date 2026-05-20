import React, { useState } from "react";
import { Icon, Chip, ScoreBar, type NeoMagicPage } from "../components";
import { frameworks, domains, providers, exampleIntent } from "../data";
import { api, type GenerateResponse, type JudgeResult, type LintResult } from "../api";

const PIPELINE_STAGES = [
  { id: "intent", label: "Intent" },
  { id: "framework", label: "Framework" },
  { id: "compile", label: "Compile (IR)" },
  { id: "judge", label: "Judge" },
  { id: "render", label: "Render" },
];

const OUTPUT_TABS = [
  { id: "compiled", label: "Compiled" },
  { id: "ir", label: "IR JSON" },
  { id: "raw", label: "Raw" },
  { id: "reasoning", label: "Reasoning" },
];

const CRITERION_LABELS: Record<string, string> = {
  clarity: "Açıklık",
  testability: "Test edilebilirlik",
  constraints: "Kısıt uyumu",
  security: "Güvenlik",
  repeatability: "Tekrarlanabilirlik",
  completeness: "Bütünlük",
  structure: "Yapı",
  goal: "Hedef",
};

export interface WorkbenchScreenProps {
  onNavigate?: (page: NeoMagicPage) => void;
}

export const WorkbenchScreen: React.FC<WorkbenchScreenProps> = ({ onNavigate }) => {
  const [intent, setIntent] = useState(exampleIntent);
  const [framework, setFramework] = useState("CoSTAR");
  const [domain, setDomain] = useState("backend");
  const [provider, setProvider] = useState("auto");
  const [tab, setTab] = useState("compiled");

  const [compiling, setCompiling] = useState(false);
  const [stage, setStage] = useState(0);
  const [result, setResult] = useState<GenerateResponse | undefined>();
  const [judge, setJudge] = useState<JudgeResult | undefined>();
  const [lint, setLint] = useState<LintResult | undefined>();
  const [error, setError] = useState<string | undefined>();
  const [qualityLoading, setQualityLoading] = useState(false);

  async function handleCompile() {
    if (!intent.trim() || compiling) return;
    setCompiling(true);
    setError(undefined);
    setStage(1);
    try {
      setStage(2);
      const gen = await api.generate({
        intent,
        framework,
        domainId: domain,
        provider,
        language: "tr",
      });
      setResult(gen);
      setStage(3);
      setQualityLoading(true);
      const [j, l] = await Promise.allSettled([
        api.judge(gen.masterPrompt, intent),
        api.lint(gen.masterPrompt),
      ]);
      if (j.status === "fulfilled") setJudge(j.value);
      if (l.status === "fulfilled") setLint(l.value);
      setQualityLoading(false);
      setStage(4);
    } catch (e) {
      setError((e as Error).message);
      setStage(0);
    } finally {
      setCompiling(false);
    }
  }

  const overallJudge = (() => {
    if (!judge?.scores?.length) return undefined;
    const sum = judge.scores.reduce((a, s) => a + s.score, 0);
    return sum / judge.scores.length;
  })();

  const handleExport = () => {
    if (!result) return;
    const payload = {
      framework: result.framework ?? framework,
      domainId: result.domainId ?? domain,
      provider: result.resolvedProvider ?? provider,
      model: result.resolvedModel,
      intent,
      masterPrompt: result.masterPrompt,
      meta: result.meta,
      judge,
      lint,
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `neomagic-prompt-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fade-up" style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: 16 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 16, minWidth: 0 }}>
        {/* Pipeline */}
        <div className="glass-strong panel-top-glow" style={{ padding: "16px 20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {PIPELINE_STAGES.map((s, i) => {
              const done = i < stage;
              const active = i === stage && compiling;
              return (
                <React.Fragment key={s.id}>
                  <div
                    className="nm-row"
                    style={{
                      padding: "6px 12px",
                      borderRadius: 999,
                      border: `1px solid ${active ? "var(--neon-cyan)" : "var(--border-soft)"}`,
                      background: active ? "rgba(0,212,255,0.08)" : done ? "rgba(0,255,159,0.06)" : "transparent",
                      color: done ? "var(--neon-mint)" : active ? "var(--neon-cyan)" : "var(--text-tertiary)",
                      fontSize: 12,
                      gap: 6,
                    }}
                  >
                    <span
                      style={{
                        width: 18,
                        height: 18,
                        borderRadius: 999,
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 10,
                        fontWeight: 700,
                        background: done ? "var(--neon-mint)" : active ? "var(--neon-cyan)" : "rgba(255,255,255,0.06)",
                        color: done || active ? "#0a0a14" : "var(--text-tertiary)",
                      }}
                    >
                      {done ? "✓" : i + 1}
                    </span>
                    <span className="font-mono" style={{ fontSize: 11 }}>{s.label}</span>
                  </div>
                  {i < PIPELINE_STAGES.length - 1 && (
                    <div style={{ flex: 1, height: 1, background: done ? "var(--neon-mint)" : "var(--border-soft)", opacity: 0.5 }} />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* Intent + Framework selector */}
        <div className="glass" style={{ padding: 18 }}>
          <label className="field-label">Niyetiniz nedir?</label>
          <textarea
            className="input"
            value={intent}
            onChange={(e) => setIntent(e.target.value)}
            placeholder="Örn. Müşteri destek asistanı, KVKK uyumlu, empati ağırlıklı..."
          />
          <div className="nm-row" style={{ justifyContent: "space-between", marginTop: 8, fontSize: 11, color: "var(--text-tertiary)" }}>
            <span>{intent.length} karakter · ~{Math.round(intent.length / 4)} token</span>
            <span style={{ color: "var(--neon-mint)" }}>● auto-save</span>
          </div>

          <div style={{ marginTop: 18 }}>
            <label className="field-label">Framework</label>
            <div className="tag-rail">
              {frameworks.map((f) => (
                <Chip key={f.id} tone={f.color} onClick={() => setFramework(f.id)} selected={framework === f.id}>
                  {f.name}
                </Chip>
              ))}
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginTop: 18 }}>
            <div>
              <label className="field-label">Domain pack</label>
              <select
                className="input input-mono"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
              >
                {domains.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="field-label">Provider</label>
              <select
                className="input input-mono"
                value={provider}
                onChange={(e) => setProvider(e.target.value)}
              >
                <option value="auto">Auto (routing)</option>
                {providers.map((p) => (
                  <option key={p.id} value={p.id}>{p.name} — {p.model}</option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
            <button className="btn btn-primary" onClick={handleCompile} disabled={compiling || !intent.trim()}>
              <Icon name="zap" size={13} stroke={2.4} />
              {compiling ? "Compiling..." : "Compile & Run"}
              <span className="font-mono" style={{ fontSize: 10, marginLeft: 4, opacity: 0.7 }}>⌘⏎</span>
            </button>
            <button
              className="btn btn-ghost"
              disabled={compiling}
              onClick={() => onNavigate?.("ailab")}
              title="A/B turnuvası başlat"
            >
              <Icon name="flask" size={13} /> A/B variant ekle
            </button>
            <button
              className="btn btn-soft btn-sm"
              style={{ marginLeft: "auto" }}
              onClick={() => onNavigate?.("versions")}
              title="Versiyon geçmişini aç"
            >
              <Icon name="history" size={12} /> Geçmiş
            </button>
          </div>

          {error && (
            <div style={{ marginTop: 14, padding: 12, borderRadius: 10, border: "1px solid rgba(239,68,68,0.4)", background: "rgba(239,68,68,0.08)", color: "#f87171", fontSize: 12, lineHeight: 1.5 }}>
              <strong>Compile başarısız:</strong> {error}
              {error.toLowerCase().includes("provider") && (
                <div style={{ marginTop: 6, color: "var(--text-tertiary)" }}>
                  Provider API key'i tanımlı değil. <code>backend/.env</code> dosyasına ekleyin (örn. <code>ANTHROPIC_API_KEY</code>, <code>OPENAI_API_KEY</code>).
                </div>
              )}
            </div>
          )}
        </div>

        {/* Output tabs */}
        <div className="glass" style={{ padding: 0 }}>
          <div style={{ display: "flex", borderBottom: "1px solid var(--border-soft)" }}>
            {OUTPUT_TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className="btn btn-soft btn-sm"
                style={{
                  borderRadius: 0,
                  borderBottom: tab === t.id ? "2px solid var(--neon-cyan)" : "2px solid transparent",
                  color: tab === t.id ? "var(--neon-cyan)" : "var(--text-tertiary)",
                  padding: "10px 18px",
                }}
              >
                {t.label}
              </button>
            ))}
            <div style={{ marginLeft: "auto", display: "flex", gap: 6, padding: "6px 12px" }}>
              <button
                className="btn btn-soft btn-xs"
                onClick={() => result?.masterPrompt && navigator.clipboard.writeText(result.masterPrompt)}
                disabled={!result}
              >
                <Icon name="copy" size={11} /> Copy
              </button>
              <button className="btn btn-soft btn-xs" disabled={!result} onClick={handleExport}>
                <Icon name="download" size={11} /> Export
              </button>
            </div>
          </div>

          <div className="scroll" style={{ padding: 18, maxHeight: 460, overflowY: "auto" }}>
            {!result && !compiling && (
              <div style={{ padding: 32, textAlign: "center", color: "var(--text-tertiary)", fontSize: 13 }}>
                Henüz compile edilmedi. Niyetinizi yazıp <strong>Compile & Run</strong>'a basın.
              </div>
            )}
            {compiling && (
              <div style={{ padding: 32, textAlign: "center", color: "var(--neon-cyan)", fontSize: 13 }}>
                Backend ile derleniyor…
              </div>
            )}
            {result && tab === "compiled" && (
              <pre className="font-mono" style={{ fontSize: 12.5, lineHeight: 1.65, color: "var(--text-secondary)", margin: 0, whiteSpace: "pre-wrap" }}>
                {result.masterPrompt}
              </pre>
            )}
            {result && tab === "ir" && (
              <pre className="font-mono" style={{ fontSize: 12, color: "var(--text-secondary)", margin: 0, whiteSpace: "pre-wrap" }}>
                {JSON.stringify({
                  framework: result.framework ?? framework,
                  domainId: result.domainId ?? domain,
                  provider: result.resolvedProvider ?? provider,
                  model: result.resolvedModel,
                  meta: result.meta,
                }, null, 2)}
              </pre>
            )}
            {result && tab === "raw" && (
              <pre className="font-mono" style={{ fontSize: 11.5, color: "var(--text-secondary)", margin: 0, whiteSpace: "pre-wrap" }}>
                {JSON.stringify(result, null, 2)}
              </pre>
            )}
            {result && tab === "reasoning" && (
              <pre className="font-mono" style={{ fontSize: 12.5, color: "var(--text-secondary)", margin: 0, whiteSpace: "pre-wrap" }}>
                {result.reasoning ?? "—"}
              </pre>
            )}
          </div>
        </div>
      </div>

      {/* Right: Judge sidebar */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16, minWidth: 0 }}>
        <div className="glass-strong panel-top-glow" style={{ padding: 16 }}>
          <div className="nm-row" style={{ marginBottom: 12 }}>
            <Icon name="target" size={14} />
            <span style={{ fontSize: 13, fontWeight: 600 }}>Judge Ensemble</span>
            <Chip tone={qualityLoading ? "amber" : judge ? "mint" : "violet"} dot>
              {qualityLoading ? "..." : judge?.scores ? `${judge.scores.length}` : "—"}
            </Chip>
          </div>
          <div style={{ display: "flex", justifyContent: "center", margin: "8px 0" }}>
            <svg width="120" height="120" viewBox="0 0 120 120">
              <circle cx="60" cy="60" r="48" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6" />
              <circle
                cx="60"
                cy="60"
                r="48"
                fill="none"
                stroke="url(#judgeGrad)"
                strokeWidth="6"
                strokeDasharray={2 * Math.PI * 48}
                strokeDashoffset={2 * Math.PI * 48 * (1 - (overallJudge ?? 0) / 100)}
                strokeLinecap="round"
                transform="rotate(-90 60 60)"
              />
              <defs>
                <linearGradient id="judgeGrad" x1="0" x2="1">
                  <stop offset="0%" stopColor="#00D4FF" />
                  <stop offset="100%" stopColor="#00FF9F" />
                </linearGradient>
              </defs>
              <text x="60" y="58" textAnchor="middle" fontSize="22" fontWeight="700" fill="#F2F3FA">
                {overallJudge ? overallJudge.toFixed(0) : "—"}
              </text>
              <text x="60" y="74" textAnchor="middle" fontSize="9" fill="#6B6F88" letterSpacing="0.1em">/100</text>
            </svg>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {!judge && (
              <div style={{ fontSize: 11.5, color: "var(--text-tertiary)", textAlign: "center" }}>
                Compile sonrası otomatik çalışır.
              </div>
            )}
            {judge?.scores?.map((c) => (
              <div key={c.criterionId}>
                <div className="nm-row" style={{ justifyContent: "space-between", marginBottom: 3, fontSize: 11.5 }}>
                  <span>{CRITERION_LABELS[c.criterionId] ?? c.criterionId}</span>
                  <span className="font-mono" style={{ color: "var(--neon-cyan)" }}>{c.score}</span>
                </div>
                <ScoreBar value={c.score} />
              </div>
            ))}
          </div>
        </div>

        <div className="glass" style={{ padding: 16 }}>
          <div className="nm-row" style={{ marginBottom: 10 }}>
            <Icon name="alert" size={13} />
            <span style={{ fontSize: 13, fontWeight: 600 }}>Lint çıkışı</span>
            <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--text-tertiary)" }}>
              {lint?.issues ? `${lint.issues.length} sonuç` : "—"}
            </span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {!lint && (
              <div style={{ fontSize: 11.5, color: "var(--text-tertiary)" }}>
                Compile sonrası otomatik çalışır.
              </div>
            )}
            {lint?.issues?.length === 0 && (
              <div style={{ fontSize: 12, color: "var(--neon-mint)" }}>Lint temiz ✓</div>
            )}
            {lint?.issues?.map((l, i) => {
              const tone =
                l.severity === "ok" ? "mint" : l.severity === "warning" ? "amber" : l.severity === "error" ? "red" : "cyan";
              return (
                <div key={i} className="nm-row" style={{ alignItems: "flex-start", gap: 8 }}>
                  <Chip tone={tone}>{l.ruleId}</Chip>
                  <div style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.5 }}>
                    {l.messageTr ?? l.message}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="glass" style={{ padding: 16 }}>
          <div className="nm-row" style={{ marginBottom: 10 }}>
            <Icon name="shield" size={13} />
            <span style={{ fontSize: 13, fontWeight: 600 }}>Resolved provider</span>
          </div>
          <div className="grad-text" style={{ fontSize: 16, fontWeight: 700 }}>
            {result?.resolvedProvider ?? "—"}
          </div>
          <div style={{ fontSize: 11.5, color: "var(--text-tertiary)", marginTop: 4 }}>
            {result?.resolvedModel ?? (compiling ? "seçiliyor..." : "compile sonrası gösterilir")}
          </div>
        </div>
      </div>
    </div>
  );
};
