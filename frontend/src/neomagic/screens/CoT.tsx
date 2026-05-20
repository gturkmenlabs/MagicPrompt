import React, { useState } from "react";
import { Icon, Chip } from "../components";
import { cotChain } from "../data";

const TREE_NODES = [
  { id: 1, x: 400, y: 60, label: "Observe", text: "User input parsed", color: "#8B5CF6" },
  { id: 2, x: 400, y: 160, label: "Analyze", text: "Missing 3 fields", color: "#8B5CF6" },
  { id: 3, x: 220, y: 280, label: "Branch A", text: "Order # first", color: "#00D4FF", active: true },
  { id: 4, x: 580, y: 280, label: "Branch B", text: "Damage first", color: "#6B6F88" },
  { id: 5, x: 400, y: 400, label: "Decide", text: "Branch A wins", color: "#00FF9F" },
  { id: 6, x: 400, y: 500, label: "Act", text: "Empathy + ask", color: "#00FF9F" },
];

const TREE_EDGES = [
  { from: 1, to: 2 },
  { from: 2, to: 3 },
  { from: 2, to: 4 },
  { from: 3, to: 5 },
  { from: 4, to: 5, dim: true },
  { from: 5, to: 6 },
];

export const CoTScreen: React.FC = () => {
  const [view, setView] = useState<"tree" | "linear">("tree");
  const [activeNode, setActiveNode] = useState(3);

  const sel = TREE_NODES.find((n) => n.id === activeNode) ?? TREE_NODES[0];

  return (
    <div className="fade-up" style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 16 }}>
      <div className="glass-strong panel-top-glow" style={{ padding: 18, minHeight: 600 }}>
        <div className="nm-row" style={{ marginBottom: 14 }}>
          <Icon name="branch" size={14} />
          <span style={{ fontSize: 13, fontWeight: 600 }}>CoT — Reasoning Tree</span>
          <Chip tone="cyan">{cotChain.length} node</Chip>
          <div style={{ marginLeft: "auto", display: "inline-flex", border: "1px solid var(--border-soft)", borderRadius: 8, padding: 3 }}>
            {(["tree", "linear"] as const).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className="btn btn-sm"
                style={{
                  background: view === v ? "var(--grad-primary)" : "transparent",
                  color: view === v ? "#0a0a14" : "var(--text-tertiary)",
                  padding: "4px 12px",
                  fontSize: 11,
                }}
              >
                {v === "tree" ? "Tree" : "Linear"}
              </button>
            ))}
          </div>
        </div>

        {view === "tree" ? (
          <svg viewBox="0 0 800 580" width="100%" style={{ minHeight: 540 }}>
            {TREE_EDGES.map((e, i) => {
              const a = TREE_NODES.find((n) => n.id === e.from)!;
              const b = TREE_NODES.find((n) => n.id === e.to)!;
              return (
                <line
                  key={i}
                  x1={a.x}
                  y1={a.y + 22}
                  x2={b.x}
                  y2={b.y - 22}
                  stroke={e.dim ? "rgba(255,255,255,0.06)" : "url(#edgeGrad)"}
                  strokeWidth="2"
                  strokeDasharray={e.dim ? "4 4" : undefined}
                />
              );
            })}
            <defs>
              <linearGradient id="edgeGrad" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="#8B5CF6" />
                <stop offset="100%" stopColor="#00D4FF" />
              </linearGradient>
            </defs>
            {TREE_NODES.map((n) => (
              <g
                key={n.id}
                style={{ cursor: "pointer" }}
                onClick={() => setActiveNode(n.id)}
                transform={`translate(${n.x - 90}, ${n.y - 22})`}
              >
                <rect
                  width="180"
                  height="44"
                  rx="10"
                  fill={activeNode === n.id ? "rgba(0,212,255,0.12)" : "rgba(22,25,45,0.85)"}
                  stroke={activeNode === n.id ? "#00D4FF" : n.color}
                  strokeWidth="1.5"
                />
                <text x="14" y="19" fontSize="11" fontWeight="700" fill={n.color} letterSpacing="0.05em">
                  {n.label.toUpperCase()}
                </text>
                <text x="14" y="34" fontSize="11" fill="#A4A8C2">
                  {n.text}
                </text>
              </g>
            ))}
          </svg>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {cotChain.map((n) => (
              <div
                key={n.id}
                className={`cot-node ${activeNode === n.id ? "active" : ""}`}
                onClick={() => setActiveNode(n.id)}
              >
                <div className="nm-row" style={{ marginBottom: 6 }}>
                  <Chip tone="violet">{n.role}</Chip>
                  <span className="font-mono" style={{ marginLeft: "auto", fontSize: 10, color: "var(--text-muted)" }}>#{n.id}</span>
                </div>
                <div style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.55 }}>{n.text}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div className="glass-strong panel-top-glow" style={{ padding: 16 }}>
          <div className="nm-row" style={{ marginBottom: 10 }}>
            <Icon name="info" size={13} />
            <span style={{ fontSize: 13, fontWeight: 600 }}>Inspector</span>
            <span style={{ marginLeft: "auto" }}><Chip tone="cyan">#{sel.id}</Chip></span>
          </div>
          <div style={{ fontSize: 14, fontWeight: 600, color: sel.color, marginBottom: 6 }}>{sel.label}</div>
          <div style={{ fontSize: 12.5, color: "var(--text-secondary)", lineHeight: 1.6 }}>
            {cotChain.find((c) => c.id === sel.id)?.text}
          </div>
          <div className="divider" style={{ margin: "14px 0" }} />
          <div className="font-mono" style={{ fontSize: 11, color: "var(--text-tertiary)", lineHeight: 1.8 }}>
            <div>confidence: <span style={{ color: "var(--neon-mint)" }}>0.86</span></div>
            <div>token_cost: <span style={{ color: "var(--neon-cyan)" }}>142</span></div>
            <div>branch_depth: <span style={{ color: "var(--neon-violet)" }}>2</span></div>
          </div>
        </div>

        <div className="glass" style={{ padding: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>Path özeti</div>
          <ol style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.7 }}>
            <li>Observe → user intent extracted</li>
            <li>Analyze → 3 missing critical fields</li>
            <li style={{ color: "var(--neon-cyan)" }}>Branch A → KVKK-safe ordering</li>
            <li>Decide → A picked (lower entropy)</li>
            <li>Act → empathy + ask order #</li>
          </ol>
        </div>

        <div className="glass" style={{ padding: 16 }}>
          <div className="nm-row" style={{ marginBottom: 8 }}>
            <Icon name="arrows" size={13} />
            <span style={{ fontSize: 13, fontWeight: 600 }}>Branch karşılaştırma</span>
          </div>
          <div style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.55 }}>
            A: <span style={{ color: "var(--neon-mint)" }}>düşük belirsizlik</span>, KVKK uyumlu sıralama.
            B: <span style={{ color: "var(--neon-amber)" }}>yüksek esneklik</span> ama PII riski.
          </div>
        </div>
      </div>
    </div>
  );
};
