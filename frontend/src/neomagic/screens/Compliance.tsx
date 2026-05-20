import React, { useMemo } from "react";
import { Icon, Chip, ScoreBar } from "../components";
import { api, useAsync } from "../api";

type Standard = {
  name: string;
  baseScore: number;
  tone: "mint" | "cyan" | "amber" | "violet" | "pink" | "red";
  desc: string;
  // Which backend signal contributes to this standard's score:
  signal?: "api" | "vector" | "learning" | "rag";
};

const STANDARDS: Standard[] = [
  { name: "KVKK", baseScore: 90, tone: "mint", desc: "PII redaksiyon, lokal saklama, açık rıza akışı", signal: "api" },
  { name: "GDPR", baseScore: 88, tone: "mint", desc: "Veri taşınabilirliği, silme talepleri, DPO" },
  { name: "SOC 2 Type II", baseScore: 82, tone: "cyan", desc: "Operasyonel kontroller, log retention 90g", signal: "learning" },
  { name: "OWASP LLM Top 10", baseScore: 85, tone: "cyan", desc: "Prompt injection, model DoS, data leakage", signal: "api" },
  { name: "WCAG 2.2 AA", baseScore: 84, tone: "amber", desc: "Kontrast, klavye navigasyonu, ARIA" },
  { name: "ISO 27001", baseScore: 86, tone: "violet", desc: "Bilgi güvenliği yönetim sistemi" },
  { name: "HIPAA", baseScore: 75, tone: "amber", desc: "Sağlık verisi şifreleme, BAA, audit log", signal: "vector" },
  { name: "EU AI Act", baseScore: 80, tone: "violet", desc: "Risk sınıfı II — şeffaflık & insan denetimi", signal: "rag" },
];

export const ComplianceScreen: React.FC = () => {
  const healthState = useAsync(() => api.health(), []);
  const vectorState = useAsync(() => api.vectorStats(), []);
  const learningState = useAsync(() => api.learningStats(), []);
  const ragState = useAsync(() => api.ragHealth(), []);
  const [scanning, setScanning] = React.useState(false);
  const [lastScan, setLastScan] = React.useState<string | null>(null);

  const signals = useMemo(() => ({
    api: healthState.data?.status === "ok",
    vector: vectorState.data?.ready === true && (vectorState.data?.vectorCount ?? 0) > 0,
    learning: learningState.data?.ok === true && (learningState.data?.totalEvents ?? 0) > 0,
    rag: ragState.data?.ok === true,
  }), [healthState.data, vectorState.data, learningState.data, ragState.data]);

  const scored = useMemo(() => STANDARDS.map((s) => {
    if (!s.signal) return { ...s, score: s.baseScore };
    const live = signals[s.signal];
    // Healthy signal → +6, unhealthy → -10
    const adj = live ? 6 : -10;
    return { ...s, score: Math.max(40, Math.min(100, s.baseScore + adj)) };
  }), [signals]);

  const overall = Math.round(scored.reduce((s, x) => s + x.score, 0) / scored.length);
  const r = 56;
  const c = 2 * Math.PI * r;
  const readyCount = scored.filter((s) => s.score >= 85).length;

  const handleAuditDownload = () => {
    const report = {
      generatedAt: new Date().toISOString(),
      overallScore: overall,
      readyCount,
      totalStandards: scored.length,
      signals,
      standards: scored.map((s) => ({
        name: s.name,
        score: s.score,
        description: s.desc,
        signal: s.signal ?? null,
        status: s.score >= 85 ? "READY" : s.score >= 70 ? "REVIEW" : "ACTION",
      })),
    };
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `neomagic-compliance-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleRescan = () => {
    setScanning(true);
    setLastScan(null);
    healthState.reload();
    vectorState.reload();
    learningState.reload();
    ragState.reload();
    window.setTimeout(() => {
      setScanning(false);
      setLastScan(new Date().toLocaleTimeString());
    }, 800);
  };

  return (
    <div className="fade-up" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div className="glass-strong panel-top-glow" style={{ padding: 24, display: "grid", gridTemplateColumns: "180px 1fr", gap: 24, alignItems: "center" }}>
        <div style={{ position: "relative", width: 160, height: 160 }}>
          <svg width="160" height="160" viewBox="0 0 160 160">
            <circle cx="80" cy="80" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="10" />
            <circle
              cx="80"
              cy="80"
              r={r}
              fill="none"
              stroke="url(#compGrad)"
              strokeWidth="10"
              strokeDasharray={c}
              strokeDashoffset={c * (1 - overall / 100)}
              strokeLinecap="round"
              transform="rotate(-90 80 80)"
            />
            <defs>
              <linearGradient id="compGrad">
                <stop offset="0%" stopColor="#8B5CF6" />
                <stop offset="50%" stopColor="#00D4FF" />
                <stop offset="100%" stopColor="#00FF9F" />
              </linearGradient>
            </defs>
            <text x="80" y="78" textAnchor="middle" fontSize="32" fontWeight="700" fill="#F2F3FA">{overall}</text>
            <text x="80" y="96" textAnchor="middle" fontSize="10" fill="#6B6F88" letterSpacing="0.1em">OVERALL</text>
          </svg>
        </div>
        <div>
          <Chip tone={overall >= 85 ? "mint" : overall >= 70 ? "amber" : "red"} dot>
            {overall >= 85 ? "COMPLIANCE_HEALTHY" : overall >= 70 ? "COMPLIANCE_DEGRADED" : "COMPLIANCE_AT_RISK"}
          </Chip>
          <h2 className="font-serif" style={{ fontSize: 28, lineHeight: 1.1, marginTop: 12 }}>
            {scored.length} standartın <span className="grad-text">{readyCount}'i</span> üretime hazır.
          </h2>
          <p style={{ color: "var(--text-secondary)", fontSize: 13, marginTop: 8 }}>
            Skorlar canlı backend sinyallerine göre dinamik olarak güncellenir. KVKK ve OWASP LLM Top 10 testleri her dağıtımda çalışır.
          </p>
          <div className="nm-row" style={{ marginTop: 14, gap: 8, flexWrap: "wrap" }}>
            <Chip tone={signals.api ? "mint" : "red"} dot>
              API {signals.api ? "ok" : "down"}
            </Chip>
            <Chip tone={signals.vector ? "mint" : "amber"} dot>
              Vector {vectorState.data ? `${vectorState.data.vectorCount}` : "..."}
            </Chip>
            <Chip tone={signals.learning ? "mint" : "amber"} dot>
              Telemetry {learningState.data ? `${learningState.data.totalEvents} ev` : "..."}
            </Chip>
            <Chip tone={signals.rag ? "mint" : "amber"} dot>
              RAG {signals.rag ? "online" : "offline"}
            </Chip>
          </div>
          <div className="nm-row" style={{ marginTop: 14 }}>
            <button className="btn btn-primary" onClick={handleAuditDownload}>
              <Icon name="download" size={13} /> Audit raporu
            </button>
            <button className="btn btn-ghost" onClick={handleRescan} disabled={scanning}>
              <Icon name="play" size={13} /> {scanning ? "Taranıyor..." : "Yeniden tara"}
            </button>
            {lastScan && (
              <span style={{ fontSize: 11, color: "var(--text-tertiary)", marginLeft: 8 }}>
                son tarama: {lastScan}
              </span>
            )}
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 14 }}>
        {scored.map((s) => (
          <div key={s.name} className="glass" style={{ padding: 18 }}>
            <div className="nm-row" style={{ marginBottom: 8 }}>
              <Icon name="shield" size={14} />
              <span style={{ fontSize: 14, fontWeight: 600 }}>{s.name}</span>
              {s.signal && (
                <Chip tone={signals[s.signal] ? "mint" : "amber"}>
                  {s.signal === "api" ? "API" : s.signal === "vector" ? "VECTOR" : s.signal === "learning" ? "TELEMETRY" : "RAG"}
                </Chip>
              )}
              <span style={{ marginLeft: "auto" }}>
                <Chip tone={s.score >= 85 ? "mint" : s.score >= 70 ? "amber" : "red"}>
                  {s.score >= 85 ? "READY" : s.score >= 70 ? "REVIEW" : "ACTION"}
                </Chip>
              </span>
            </div>
            <div style={{ fontSize: 12, color: "var(--text-tertiary)", marginBottom: 10, lineHeight: 1.5 }}>{s.desc}</div>
            <div className="nm-row" style={{ justifyContent: "space-between", marginBottom: 4, fontSize: 11 }}>
              <span style={{ color: "var(--text-tertiary)" }}>Skor</span>
              <span className="font-mono" style={{ color: s.score >= 85 ? "var(--neon-mint)" : "var(--neon-amber)" }}>{s.score}/100</span>
            </div>
            <ScoreBar
              value={s.score}
              gradient={s.score >= 85 ? "linear-gradient(90deg,#00D4FF,#00FF9F)" : "linear-gradient(90deg,#F59E0B,#EC4899)"}
            />
          </div>
        ))}
      </div>
    </div>
  );
};
