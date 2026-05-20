import React, { useState } from "react";
import { Icon, Chip, ScoreBar } from "../components";
import { abRun } from "../data";

const RADAR_DIMS = ["Açıklık", "Test", "Kısıt", "Güvenlik", "Tekrar", "Bütünlük"];

const Radar: React.FC<{ values: number[]; color: string }> = ({ values, color }) => {
  const cx = 90;
  const cy = 90;
  const r = 70;
  const pts = values.map((v, i) => {
    const angle = (Math.PI * 2 * i) / values.length - Math.PI / 2;
    const radius = (v / 5) * r;
    return [cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius];
  });
  const path = pts.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x},${y}`).join(" ") + " Z";

  return (
    <svg width="180" height="180" viewBox="0 0 180 180">
      {[0.25, 0.5, 0.75, 1].map((m) => (
        <polygon
          key={m}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          points={RADAR_DIMS.map((_, i) => {
            const angle = (Math.PI * 2 * i) / RADAR_DIMS.length - Math.PI / 2;
            return `${cx + Math.cos(angle) * r * m},${cy + Math.sin(angle) * r * m}`;
          }).join(" ")}
        />
      ))}
      {RADAR_DIMS.map((label, i) => {
        const angle = (Math.PI * 2 * i) / RADAR_DIMS.length - Math.PI / 2;
        return (
          <g key={label}>
            <line x1={cx} y1={cy} x2={cx + Math.cos(angle) * r} y2={cy + Math.sin(angle) * r} stroke="rgba(255,255,255,0.04)" />
            <text
              x={cx + Math.cos(angle) * (r + 12)}
              y={cy + Math.sin(angle) * (r + 12)}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize="9"
              fill="#6B6F88"
            >
              {label}
            </text>
          </g>
        );
      })}
      <path d={path} fill={`${color}33`} stroke={color} strokeWidth="1.6" />
      {pts.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="3" fill={color} />
      ))}
    </svg>
  );
};

const VariantCard: React.FC<{
  label: string;
  variant: typeof abRun.a;
  color: string;
  values: number[];
  winning?: boolean;
}> = ({ label, variant, color, values, winning }) => (
  <div className="glass-strong panel-top-glow" style={{ padding: 18, border: winning ? `1px solid ${color}` : undefined }}>
    <div className="nm-row" style={{ marginBottom: 10 }}>
      <span
        style={{
          fontSize: 24,
          fontWeight: 700,
          color,
          width: 32,
          height: 32,
          borderRadius: 999,
          background: `${color}22`,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {label}
      </span>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 600 }}>{variant.framework}</div>
        <div className="font-mono" style={{ fontSize: 11, color: "var(--text-tertiary)" }}>{variant.model}</div>
      </div>
      {winning && (
        <span style={{ marginLeft: "auto" }}>
          <Chip tone="mint" dot>WINNER</Chip>
        </span>
      )}
    </div>
    <div style={{ display: "flex", justifyContent: "center", margin: "8px 0" }}>
      <Radar values={values} color={color} />
    </div>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginTop: 8 }}>
      {[
        { l: "Judge", v: `${variant.judge}` },
        { l: "Latency", v: variant.latency },
        { l: "Cost", v: variant.cost },
      ].map((s) => (
        <div key={s.l} style={{ textAlign: "center", padding: "8px 4px", background: "rgba(10,12,24,0.4)", borderRadius: 8 }}>
          <div className="font-mono" style={{ fontSize: 10, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.1em" }}>{s.l}</div>
          <div style={{ fontSize: 14, fontWeight: 700, color, marginTop: 2 }}>{s.v}</div>
        </div>
      ))}
    </div>
    <div className="nm-row" style={{ marginTop: 12, fontSize: 12 }}>
      <span style={{ color: "var(--text-tertiary)" }}>Win rate</span>
      <span style={{ marginLeft: "auto", color, fontWeight: 700 }}>{variant.wins}%</span>
    </div>
    <ScoreBar value={variant.wins} gradient={`linear-gradient(90deg, ${color}, ${color}aa)`} />
  </div>
);

export const AILabScreen: React.FC = () => {
  const [running, setRunning] = useState(true);
  const heatmap = Array.from({ length: 100 }, (_, i) => {
    const seed = (i * 9301 + 49297) % 233280;
    return seed / 233280;
  });

  return (
    <div className="fade-up" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div className="glass-strong panel-top-glow" style={{ padding: 18 }}>
        <div className="nm-row">
          <Chip tone={running ? "cyan" : "amber"} dot>
            {running ? "TOURNAMENT_RUNNING" : "TOURNAMENT_STOPPED"}
          </Chip>
          <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>refund_assistant_v7 · 100 sentetik test koşusu</span>
          <span className="font-mono" style={{ marginLeft: "auto", fontSize: 11, color: "var(--text-tertiary)" }}>
            elapsed 02:14
          </span>
          <button
            className="btn btn-soft btn-sm"
            style={{ marginLeft: 12 }}
            onClick={() => setRunning((v) => !v)}
            title={running ? "Turnuvayı durdur" : "Turnuvayı yeniden başlat"}
          >
            <Icon name={running ? "x" : "play"} size={12} /> {running ? "Stop" : "Resume"}
          </button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <VariantCard label="A" variant={abRun.a} color="#8B5CF6" values={[4.8, 4.5, 4.7, 4.9, 4.4, 4.6]} winning />
        <VariantCard label="B" variant={abRun.b} color="#00D4FF" values={[4.4, 4.1, 4.5, 4.3, 4.0, 4.3]} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div className="glass" style={{ padding: 18 }}>
          <div className="nm-row" style={{ marginBottom: 12 }}>
            <Icon name="chart" size={14} />
            <span style={{ fontSize: 13, fontWeight: 600 }}>İstatistiksel anlamlılık</span>
            <span style={{ marginLeft: "auto" }}><Chip tone="mint" dot>SIGNIFICANT</Chip></span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            {[
              { l: "p-value", v: "0.003", note: "< 0.05" },
              { l: "Cohen's h", v: "0.48", note: "medium" },
              { l: "Confidence", v: "99.7%", note: "Wilson" },
              { l: "Sample", v: "100", note: "synthetic" },
            ].map((s) => (
              <div key={s.l} style={{ padding: 12, background: "rgba(10,12,24,0.4)", borderRadius: 10 }}>
                <div className="font-mono" style={{ fontSize: 10, color: "var(--text-tertiary)", letterSpacing: "0.1em", textTransform: "uppercase" }}>{s.l}</div>
                <div className="grad-text" style={{ fontSize: 22, fontWeight: 700, marginTop: 4 }}>{s.v}</div>
                <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>{s.note}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="glass" style={{ padding: 18 }}>
          <div className="nm-row" style={{ marginBottom: 12 }}>
            <Icon name="grid" size={14} />
            <span style={{ fontSize: 13, fontWeight: 600 }}>Test ısı haritası</span>
            <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--text-tertiary)" }}>100 koşu · A vs B delta</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(10, 1fr)", gap: 3 }}>
            {heatmap.map((v, i) => {
              const aWins = v > 0.45;
              const intensity = Math.abs(v - 0.5) * 2;
              return (
                <div
                  key={i}
                  title={`Test ${i + 1}: ${aWins ? "A" : "B"} (${(intensity * 100).toFixed(0)}%)`}
                  style={{
                    aspectRatio: "1",
                    borderRadius: 3,
                    background: aWins
                      ? `rgba(139, 92, 246, ${0.2 + intensity * 0.6})`
                      : `rgba(0, 212, 255, ${0.2 + intensity * 0.6})`,
                  }}
                />
              );
            })}
          </div>
          <div className="nm-row" style={{ marginTop: 10, fontSize: 11, color: "var(--text-tertiary)", gap: 16 }}>
            <span><span style={{ display: "inline-block", width: 10, height: 10, background: "#8B5CF6", borderRadius: 2, marginRight: 5 }} /> Variant A</span>
            <span><span style={{ display: "inline-block", width: 10, height: 10, background: "#00D4FF", borderRadius: 2, marginRight: 5 }} /> Variant B</span>
          </div>
        </div>
      </div>
    </div>
  );
};
