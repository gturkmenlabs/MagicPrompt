import React, { useMemo, useState } from "react";
import { Icon, Chip, ScoreBar, type NeoMagicPage } from "../components";
import { frameworks } from "../data";
import { api, useAsync, relativeTime, type BackendPrompt } from "../api";

type FilterKey = "all" | "high" | "recent";

const Sparkline: React.FC<{ values: number[]; color: string }> = ({ values, color }) => {
  if (!values.length) return null;
  const max = Math.max(...values);
  const min = Math.min(...values);
  const w = 120;
  const h = 36;
  const pts = values
    .map((v, i) => {
      const x = (i / Math.max(values.length - 1, 1)) * w;
      const y = h - ((v - min) / (max - min || 1)) * h;
      return `${x},${y}`;
    })
    .join(" ");
  return (
    <svg width={w} height={h} style={{ display: "block" }}>
      <polyline fill="none" stroke={color} strokeWidth="1.6" points={pts} />
    </svg>
  );
};

const StatCard: React.FC<{
  label: string;
  value: string;
  delta: string;
  trend: number[];
  color: string;
}> = ({ label, value, delta, trend, color }) => (
  <div className="glass panel-top-glow" style={{ padding: 18 }}>
    <div className="nm-row" style={{ justifyContent: "space-between" }}>
      <div className="font-mono" style={{ fontSize: 10, color: "var(--text-tertiary)", letterSpacing: "0.16em", textTransform: "uppercase" }}>
        {label}
      </div>
      <span style={{ fontSize: 11, color: "var(--neon-mint)" }}>{delta}</span>
    </div>
    <div className="grad-text" style={{ fontSize: 30, fontWeight: 700, marginTop: 8 }}>{value}</div>
    <div style={{ marginTop: 8 }}>
      <Sparkline values={trend} color={color} />
    </div>
  </div>
);

function avgJudge(prompts: BackendPrompt[]): number {
  const scores = prompts.map((p) => Number(p.meta?.judge ?? p.meta?.score ?? 0)).filter((n) => n > 0);
  if (!scores.length) return 0;
  return scores.reduce((a, b) => a + b, 0) / scores.length;
}

function frameworkDistribution(prompts: BackendPrompt[]): Array<{ name: string; pct: number }> {
  const counts = new Map<string, number>();
  for (const p of prompts) {
    const fw = String(p.meta?.framework ?? "AUTO").toUpperCase();
    counts.set(fw, (counts.get(fw) ?? 0) + 1);
  }
  const total = prompts.length || 1;
  const items = Array.from(counts.entries())
    .map(([name, n]) => ({ name, pct: Math.round((n / total) * 100) }))
    .sort((a, b) => b.pct - a.pct);
  return items.slice(0, 6);
}

export interface DashboardScreenProps {
  onNavigate?: (page: NeoMagicPage) => void;
}

const FILTER_LABEL: Record<FilterKey, string> = {
  all: "Tümü",
  high: "Yüksek skor",
  recent: "Son 24 saat",
};

export const DashboardScreen: React.FC<DashboardScreenProps> = ({ onNavigate }) => {
  const promptsQ = useAsync(() => api.listPrompts({ page: 1, limit: 200 }), []);
  const learningQ = useAsync(() => api.learningStats(), []);
  const vectorQ = useAsync(() => api.vectorStats(), []);
  const healthQ = useAsync(() => api.health(), []);
  const [filter, setFilter] = useState<FilterKey>("all");

  const allPrompts = promptsQ.data?.prompts ?? [];
  const prompts = useMemo(() => {
    if (filter === "high") {
      return allPrompts.filter((p) => Number(p.meta?.judge ?? p.meta?.score ?? 0) >= 4);
    }
    if (filter === "recent") {
      const cutoff = Date.now() - 24 * 60 * 60 * 1000;
      return allPrompts.filter((p) => {
        const t = new Date(p.createdAt ?? 0).getTime();
        return Number.isFinite(t) && t >= cutoff;
      });
    }
    return allPrompts;
  }, [allPrompts, filter]);
  const total = promptsQ.data?.total ?? 0;
  const avg = avgJudge(prompts);
  const distribution = frameworkDistribution(prompts);

  const cycleFilter = () => {
    setFilter((f) => (f === "all" ? "high" : f === "high" ? "recent" : "all"));
  };
  const learningEvents = learningQ.data?.totalEvents ?? 0;
  const vectorCount = vectorQ.data?.vectorCount ?? 0;
  const topFw = distribution[0]?.name ?? "—";

  const tokenUsed = learningEvents * 12; // rough estimate from event count
  const tokenMax = Math.max(5000, tokenUsed * 1.2);
  const pct = tokenMax > 0 ? tokenUsed / tokenMax : 0;
  const r = 52;
  const c = 2 * Math.PI * r;

  return (
    <div className="fade-up" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Hero */}
      <div className="glass-strong panel-top-glow" style={{ padding: 28, display: "grid", gridTemplateColumns: "1fr 180px", gap: 28 }}>
        <div>
          <Chip tone={healthQ.data ? "violet" : "amber"} dot>
            {healthQ.data ? `WORKSPACE · ${healthQ.data.service.toUpperCase()}` : "WORKSPACE · OFFLINE"}
          </Chip>
          <h2 className="font-serif" style={{ fontSize: 32, lineHeight: 1.1, marginTop: 14 }}>
            Toplam <span className="grad-text">{total} prompt</span>{avg > 0 ? <> kayıtlı, ortalama jüri skoru <span className="grad-text">{avg.toFixed(1)}/5</span>.</> : "."}
          </h2>
          <p style={{ color: "var(--text-secondary)", fontSize: 13.5, marginTop: 10, maxWidth: 640 }}>
            {learningEvents > 0
              ? `Self-learning halkası ${learningEvents} olay kaydetti. `
              : "Self-learning halkası henüz olay kaydetmedi. "}
            En aktif framework: <span style={{ color: "var(--neon-cyan)" }}>{topFw}</span>
            {distribution[0] ? <> (üretimlerin %{distribution[0].pct}'i)</> : ""}.
          </p>
          <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
            <button className="btn btn-primary" onClick={() => onNavigate?.("workbench")}>
              <Icon name="zap" size={13} stroke={2.2} /> Yeni prompt başlat
            </button>
            <button className="btn btn-ghost" onClick={() => onNavigate?.("ailab")}>
              <Icon name="flask" size={13} /> A/B çalıştır
            </button>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
          <svg width="140" height="140" viewBox="0 0 140 140">
            <circle cx="70" cy="70" r={r} stroke="rgba(255,255,255,0.06)" strokeWidth="8" fill="none" />
            <circle
              cx="70"
              cy="70"
              r={r}
              stroke="url(#tokenGrad)"
              strokeWidth="8"
              fill="none"
              strokeDasharray={c}
              strokeDashoffset={c * (1 - pct)}
              strokeLinecap="round"
              transform="rotate(-90 70 70)"
            />
            <defs>
              <linearGradient id="tokenGrad" x1="0" x2="1">
                <stop offset="0%" stopColor="#8B5CF6" />
                <stop offset="100%" stopColor="#00D4FF" />
              </linearGradient>
            </defs>
            <text x="70" y="68" textAnchor="middle" fontSize="22" fontWeight="700" fill="#F2F3FA">
              {Math.round(pct * 100)}%
            </text>
            <text x="70" y="86" textAnchor="middle" fontSize="10" fill="#6B6F88" letterSpacing="0.1em">
              TOKEN
            </text>
          </svg>
          <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginTop: 6 }}>{tokenUsed.toLocaleString()} / {Math.round(tokenMax).toLocaleString()}</div>
        </div>
      </div>

      {/* Stat cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
        <StatCard label="Toplam prompt" value={String(total)} delta={promptsQ.loading ? "..." : `${prompts.length} aktif`} trend={[Math.max(1, total - 6), Math.max(1, total - 5), Math.max(1, total - 4), Math.max(1, total - 3), Math.max(1, total - 2), Math.max(1, total - 1), total]} color="#8B5CF6" />
        <StatCard label="Avg judge" value={avg > 0 ? avg.toFixed(1) : "—"} delta={avg > 0 ? "live" : "no data"} trend={prompts.slice(0, 7).map((p) => Number(p.meta?.judge ?? p.meta?.score ?? 0)).filter((n) => n > 0)} color="#00D4FF" />
        <StatCard label="Vector store" value={String(vectorCount)} delta={vectorQ.data?.ready ? "ready" : "init"} trend={[0, 0, 0, 0, vectorCount / 2, vectorCount * 0.8, vectorCount]} color="#00FF9F" />
        <StatCard label="Learning events" value={String(learningEvents)} delta={learningEvents > 0 ? "live" : "—"} trend={[0, Math.floor(learningEvents * 0.3), Math.floor(learningEvents * 0.5), Math.floor(learningEvents * 0.7), Math.floor(learningEvents * 0.8), Math.floor(learningEvents * 0.9), learningEvents]} color="#EC4899" />
      </div>

      {/* Recent prompts + Activity */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16 }}>
        <div className="glass" style={{ padding: 18 }}>
          <div className="nm-row" style={{ justifyContent: "space-between", marginBottom: 14 }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>Son kayıtlı promptlar</div>
              <div style={{ fontSize: 11, color: "var(--text-tertiary)" }}>
                {promptsQ.loading ? "Yükleniyor..." : promptsQ.error ? `Hata: ${promptsQ.error}` : `${prompts.length} prompt`}
              </div>
            </div>
            <button
              className="btn btn-soft btn-sm"
              onClick={cycleFilter}
              title="Filtreler arasında geçiş yap"
            >
              <Icon name="filter" size={12} /> {FILTER_LABEL[filter]}
            </button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {promptsQ.loading && (
              <div style={{ padding: 24, textAlign: "center", color: "var(--text-tertiary)", fontSize: 12 }}>
                Backend'den çekiliyor…
              </div>
            )}
            {!promptsQ.loading && prompts.length === 0 && (
              <div style={{ padding: 24, textAlign: "center", color: "var(--text-tertiary)", fontSize: 12 }}>
                Henüz prompt yok. Workbench'ten ilkini oluşturun.
              </div>
            )}
            {prompts.slice(0, 8).map((p) => {
              const judge = Number(p.meta?.judge ?? p.meta?.score ?? 0);
              return (
                <div
                  key={`${p.id}@${p.version}`}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr auto auto 64px 90px",
                    alignItems: "center",
                    gap: 14,
                    padding: "10px 12px",
                    borderRadius: 10,
                    border: "1px solid var(--border-soft)",
                    background: "rgba(10,12,24,0.4)",
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {p.name ?? p.masterPrompt.slice(0, 80)}
                    </div>
                    <div className="font-mono" style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 3 }}>{p.id}</div>
                  </div>
                  <Chip tone="violet">{String(p.meta?.framework ?? "AUTO")}</Chip>
                  <Chip tone="cyan">{String(p.meta?.domainId ?? p.meta?.domain ?? p.meta?.category ?? "—")}</Chip>
                  <div className="grad-text" style={{ fontSize: 16, fontWeight: 700, textAlign: "right" }}>v{p.version}</div>
                  <div style={{ fontSize: 11, color: "var(--text-tertiary)", textAlign: "right" }}>
                    {judge > 0 ? `★ ${judge.toFixed(1)}` : "—"}<br />
                    <span style={{ fontSize: 10, color: "var(--text-muted)" }}>{relativeTime(p.createdAt)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="glass" style={{ padding: 18 }}>
          <div className="nm-row" style={{ marginBottom: 14 }}>
            <Icon name="activity" size={14} />
            <span style={{ fontSize: 14, fontWeight: 600 }}>Servis durumu</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {[
              { c: "API", t: healthQ.data ? `${healthQ.data.service} sağlıklı` : healthQ.error ? `Hata: ${healthQ.error}` : "kontrol ediliyor...", ok: !!healthQ.data },
              { c: "Vector Store", t: vectorQ.data ? `${vectorQ.data.backend} · ${vectorQ.data.vectorCount} vektör` : vectorQ.error ? `Hata: ${vectorQ.error}` : "yükleniyor...", ok: !!vectorQ.data?.ready },
              { c: "Embedding", t: vectorQ.data ? `${vectorQ.data.embedding.model} · dim=${vectorQ.data.embedding.dim}` : "—", ok: !!vectorQ.data },
              { c: "Self-Learning", t: learningQ.data ? `${learningQ.data.totalEvents} olay kaydedildi` : learningQ.error ? `Hata: ${learningQ.error}` : "—", ok: !!learningQ.data?.ok },
              { c: "Prompt Store", t: promptsQ.data ? `${promptsQ.data.total} prompt` : promptsQ.error ? `Hata: ${promptsQ.error}` : "—", ok: !!promptsQ.data },
            ].map((a, i) => (
              <div key={i} className="nm-row" style={{ alignItems: "flex-start" }}>
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: 999,
                    marginTop: 6,
                    background: a.ok ? "var(--neon-mint)" : "var(--neon-amber)",
                    boxShadow: a.ok ? "0 0 6px var(--neon-mint)" : "0 0 6px var(--neon-amber)",
                  }}
                />
                <div style={{ flex: 1, fontSize: 12.5 }}>
                  <span style={{ color: "var(--neon-violet)" }}>{a.c}</span>{" "}
                  <span style={{ color: "var(--text-secondary)" }}>{a.t}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Framework distribution */}
      <div className="glass" style={{ padding: 18 }}>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Framework dağılımı (kayıtlı promptlardan)</div>
        {distribution.length === 0 && (
          <div style={{ fontSize: 12, color: "var(--text-tertiary)" }}>
            Veri yok — promptlar yüklenince burada görüntülenir.
            {frameworks.slice(0, 3).map((f) => f.name).join(", ")} gibi framework'ler kullanılabilir.
          </div>
        )}
        {distribution.map((f) => (
          <div key={f.name} style={{ marginBottom: 10 }}>
            <div className="nm-row" style={{ justifyContent: "space-between", marginBottom: 4 }}>
              <span style={{ fontSize: 12 }}>{f.name}</span>
              <span className="font-mono" style={{ fontSize: 11, color: "var(--text-tertiary)" }}>{f.pct}%</span>
            </div>
            <ScoreBar value={f.pct} />
          </div>
        ))}
      </div>
    </div>
  );
};
