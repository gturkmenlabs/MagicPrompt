import React, { useEffect, useState } from "react";
import { Icon, Logo, Chip, KeyHint } from "../components";

const BOOT_LINES = [
  "$ neomagic --init",
  "[ok] Loading 57 reasoning frameworks",
  "[ok] Loading 59 domain packs",
  "[ok] Connecting 10 LLM providers",
  "[ok] Judge ensemble: 4/4 healthy",
  "[ok] Prompt lint engine: ready",
  "[ok] Vector store: 312k embeddings",
  "$ session restore: workspace_42",
  "$ ready_",
];

export const AuthScreen: React.FC<{ onSignIn: () => void }> = ({ onSignIn }) => {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [bootIdx, setBootIdx] = useState(0);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    if (bootIdx >= BOOT_LINES.length) return;
    const t = setTimeout(() => setBootIdx((i) => i + 1), 320);
    return () => clearTimeout(t);
  }, [bootIdx]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSignIn();
  };

  const handleSso = (provider: string) => {
    console.info(`[auth] ${provider} SSO triggered (mock)`);
    onSignIn();
  };

  return (
    <div
      style={{
        position: "relative",
        zIndex: 1,
        minHeight: "100vh",
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: 0,
      }}
    >
      {/* Left: form */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "48px 64px",
          maxWidth: 560,
          width: "100%",
          margin: "0 auto",
        }}
      >
        <Logo />
        <h1 className="font-serif fade-up" style={{ fontSize: 42, lineHeight: 1.05, marginTop: 36, marginBottom: 12 }}>
          Promptlarınızı <span className="grad-text">üretim kalitesine</span> taşıyın.
        </h1>
        <p style={{ color: "var(--text-secondary)", fontSize: 14, lineHeight: 1.6, marginBottom: 28 }}>
          57 akıl yürütme çerçevesi, 59 domain paketi ve jüri ensemble ile prompt'larınızı tek bir çalışma alanında tasarlayın, doğrulayın ve dağıtın.
        </p>

        <div
          style={{
            display: "inline-flex",
            background: "rgba(10,12,24,0.6)",
            border: "1px solid var(--border-soft)",
            borderRadius: 10,
            padding: 4,
            marginBottom: 20,
            width: "fit-content",
          }}
        >
          {(["signin", "signup"] as const).map((m) => (
            <button
              key={m}
              className="btn btn-sm"
              onClick={() => setMode(m)}
              style={{
                background: mode === m ? "var(--grad-primary)" : "transparent",
                color: mode === m ? "#0a0a14" : "var(--text-secondary)",
              }}
            >
              {m === "signin" ? "Oturum Aç" : "Hesap Oluştur"}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {mode === "signup" && (
            <div>
              <label className="field-label">Ad Soyad</label>
              <input
                className="input"
                placeholder="Ekrem Kaya"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
              />
            </div>
          )}
          <div>
            <label className="field-label">E-posta</label>
            <div style={{ position: "relative" }}>
              <Icon
                name="mail"
                size={14}
                style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "var(--text-tertiary)" }}
              />
              <input
                className="input"
                style={{ paddingLeft: 38 }}
                placeholder="siz@neomagic.ai"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                type="email"
              />
            </div>
          </div>
          <div>
            <label className="field-label">Şifre</label>
            <div style={{ position: "relative" }}>
              <Icon
                name="lock"
                size={14}
                style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "var(--text-tertiary)" }}
              />
              <input
                type="password"
                className="input"
                style={{ paddingLeft: 38 }}
                placeholder="••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={mode === "signin" ? "current-password" : "new-password"}
              />
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: "100%", justifyContent: "center", marginTop: 8 }}
          >
            {mode === "signin" ? "Çalışma alanına gir" : "Hesap oluştur"}
            <Icon name="arrow_right" size={14} />
          </button>
        </form>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            color: "var(--text-muted)",
            fontSize: 11,
            margin: "22px 0 14px",
            textTransform: "uppercase",
            letterSpacing: "0.16em",
          }}
        >
          <span className="divider" style={{ flex: 1 }} />
          ya da
          <span className="divider" style={{ flex: 1 }} />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
          {["Google", "GitHub", "SAML SSO"].map((p) => (
            <button
              key={p}
              type="button"
              className="btn btn-soft btn-sm"
              style={{ justifyContent: "center" }}
              onClick={() => handleSso(p)}
            >
              {p}
            </button>
          ))}
        </div>

        <div style={{ display: "flex", gap: 8, marginTop: 26, color: "var(--text-tertiary)", fontSize: 11 }}>
          <KeyHint k="⏎" /> Enter ile gönder
          <span style={{ marginLeft: "auto" }}>SOC2 · KVKK · GDPR</span>
        </div>
      </div>

      {/* Right: terminal + stats */}
      <div
        style={{
          padding: "48px 56px",
          display: "flex",
          flexDirection: "column",
          gap: 18,
          background: "linear-gradient(180deg, rgba(10,12,24,0.4) 0%, rgba(2,3,10,0.6) 100%)",
          borderLeft: "1px solid var(--border-soft)",
        }}
      >
        <div className="glass-strong panel-top-glow" style={{ padding: 20 }}>
          <div className="font-mono" style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, color: "var(--text-tertiary)", marginBottom: 10 }}>
            <Icon name="terminal" size={12} /> SYSTEM_BOOT
            <span style={{ marginLeft: "auto" }} className="chip chip-mint"><span className="chip-dot" />ONLINE</span>
          </div>
          <div
            className="font-mono"
            style={{
              fontSize: 12,
              lineHeight: 1.7,
              color: "var(--text-secondary)",
              minHeight: 180,
            }}
          >
            {BOOT_LINES.slice(0, bootIdx).map((line, i) => (
              <div key={i} style={{ color: line.startsWith("[ok]") ? "var(--neon-mint)" : line.startsWith("$") ? "var(--neon-cyan)" : "var(--text-secondary)" }}>
                {line}
              </div>
            ))}
            {bootIdx < BOOT_LINES.length && <span className="cursor-blink" style={{ color: "var(--neon-cyan)" }} />}
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
          {[
            { label: "Avg judge", value: "4.7/5", tone: "mint" as const },
            { label: "P95 latency", value: "388ms", tone: "cyan" as const },
            { label: "Cache hit", value: "84%", tone: "violet" as const },
          ].map((s) => (
            <div key={s.label} className="glass" style={{ padding: 14 }}>
              <div className="font-mono" style={{ fontSize: 10, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.12em" }}>
                {s.label}
              </div>
              <div className={`grad-text`} style={{ fontSize: 22, fontWeight: 700, marginTop: 6 }}>{s.value}</div>
            </div>
          ))}
        </div>

        <div className="glass" style={{ padding: 18 }}>
          <div className="nm-row" style={{ marginBottom: 10 }}>
            <Chip tone="cyan" dot>FEATURE PREVIEW</Chip>
            <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--text-tertiary)" }}>v3.2.0 — Beta</span>
          </div>
          <div style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6 }}>
            Adversarial immunity, semantic cache, multi-judge rubric ve KVKK PII redaktörü hepsi tek workspace altında.
          </div>
        </div>
      </div>
    </div>
  );
};
