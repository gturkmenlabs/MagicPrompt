import React, { useState } from "react";
import { Icon, Chip } from "../components";
import { versions } from "../data";

const DIFF_LEFT = [
  { type: "ctx", text: "role: 'Müşteri destek temsilcisi'" },
  { type: "rm",  text: "tone: 'profesyonel'" },
  { type: "ctx", text: "constraints: [" },
  { type: "ctx", text: "  'PII redaksiyon zorunlu'," },
  { type: "rm",  text: "  'Token budget: 1000'," },
  { type: "ctx", text: "]" },
];

const DIFF_RIGHT = [
  { type: "ctx", text: "role: 'Müşteri destek temsilcisi'" },
  { type: "add", text: "tone: 'empati ağırlıklı'" },
  { type: "ctx", text: "constraints: [" },
  { type: "ctx", text: "  'PII redaksiyon zorunlu'," },
  { type: "add", text: "  'Token budget: 800'," },
  { type: "add", text: "  'Olumsuz cevapta empati cümlesi'," },
  { type: "ctx", text: "]" },
];

const cls = (t: string) => (t === "add" ? "diff-add" : t === "rm" ? "diff-rm" : "diff-ctx");

export const VersionsScreen: React.FC = () => {
  const [left, setLeft] = useState("v5");
  const [right, setRight] = useState("v7");

  return (
    <div className="fade-up" style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: 16 }}>
      <div className="glass-strong panel-top-glow" style={{ padding: 16 }}>
        <div className="nm-row" style={{ marginBottom: 12 }}>
          <Icon name="history" size={13} />
          <span style={{ fontSize: 13, fontWeight: 600 }}>Sürümler</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {versions.map((v) => {
            const sel = v.id === left || v.id === right;
            return (
              <div
                key={v.id}
                style={{
                  padding: 12,
                  borderRadius: 10,
                  border: `1px solid ${sel ? "var(--neon-cyan)" : "var(--border-soft)"}`,
                  background: sel ? "rgba(0,212,255,0.06)" : "rgba(10,12,24,0.4)",
                  cursor: "pointer",
                }}
                onClick={() => {
                  if (v.id === left) return;
                  if (v.id === right) setRight(left);
                  setLeft(v.id);
                  setRight(right === v.id ? left : right);
                }}
              >
                <div className="nm-row" style={{ marginBottom: 6 }}>
                  <span className="font-mono" style={{ fontSize: 12, fontWeight: 700, color: "var(--neon-cyan)" }}>{v.label}</span>
                  <Chip tone={v.branch === "main" ? "mint" : "amber"}>{v.branch}</Chip>
                  <span style={{ marginLeft: "auto", fontSize: 10, color: "var(--text-muted)" }}>{v.time}</span>
                </div>
                <div style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.45 }}>{v.change}</div>
                <div className="nm-row" style={{ marginTop: 6, fontSize: 10, color: "var(--text-tertiary)" }}>
                  <span>{v.author}</span>
                  <span style={{ marginLeft: "auto", color: "var(--neon-cyan)" }}>★ {v.judge}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div className="glass" style={{ padding: 14 }}>
          <div className="nm-row">
            <span style={{ fontSize: 13, fontWeight: 600 }}>Karşılaştırma</span>
            <Chip tone="red">{left}</Chip>
            <Icon name="arrow_right" size={12} />
            <Chip tone="mint">{right}</Chip>
            <span style={{ marginLeft: "auto" }} className="nm-row">
              <Chip tone="cyan">+4 satır</Chip>
              <Chip tone="red">-2 satır</Chip>
            </span>
          </div>
        </div>

        <div className="glass" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", borderBottom: "1px solid var(--border-soft)" }}>
            <div className="font-mono" style={{ padding: "10px 14px", fontSize: 11, color: "var(--neon-red)", letterSpacing: "0.06em" }}>
              {left} · before
            </div>
            <div className="font-mono" style={{ padding: "10px 14px", fontSize: 11, color: "var(--neon-mint)", letterSpacing: "0.06em", borderLeft: "1px solid var(--border-soft)" }}>
              {right} · after
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr" }}>
            <div style={{ padding: "8px 0", borderRight: "1px solid var(--border-soft)" }}>
              {DIFF_LEFT.map((l, i) => (
                <div key={i} className={`diff-line ${cls(l.type)}`}>
                  <span className="diff-gutter">{i + 1}</span>
                  <span>{l.text}</span>
                </div>
              ))}
            </div>
            <div style={{ padding: "8px 0" }}>
              {DIFF_RIGHT.map((l, i) => (
                <div key={i} className={`diff-line ${cls(l.type)}`}>
                  <span className="diff-gutter">{i + 1}</span>
                  <span>{l.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="glass" style={{ padding: 18 }}>
          <div className="nm-row" style={{ marginBottom: 10 }}>
            <Icon name="chart" size={13} />
            <span style={{ fontSize: 13, fontWeight: 600 }}>Skor değişimi</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
            {[
              { l: "Judge", a: 4.3, b: 4.7, color: "#00FF9F" },
              { l: "Latency", a: 480, b: 412, suffix: "ms", color: "#00D4FF" },
              { l: "Tokens", a: 1000, b: 800, color: "#8B5CF6" },
              { l: "Maliyet", a: 0.022, b: 0.018, prefix: "$", color: "#EC4899" },
            ].map((s) => (
              <div key={s.l} style={{ padding: 12, background: "rgba(10,12,24,0.4)", borderRadius: 10 }}>
                <div className="font-mono" style={{ fontSize: 10, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.1em" }}>{s.l}</div>
                <div className="nm-row" style={{ marginTop: 4 }}>
                  <span style={{ fontSize: 13, color: "var(--text-muted)", textDecoration: "line-through" }}>
                    {s.prefix || ""}{s.a}{s.suffix || ""}
                  </span>
                  <Icon name="arrow_right" size={11} />
                  <span style={{ fontSize: 16, fontWeight: 700, color: s.color }}>
                    {s.prefix || ""}{s.b}{s.suffix || ""}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
