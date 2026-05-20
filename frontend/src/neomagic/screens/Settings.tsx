import React, { useState } from "react";
import { Icon, Chip } from "../components";

const TABS = [
  { id: "general", label: "Genel", icon: "settings" },
  { id: "api", label: "API & Keys", icon: "lock" },
  { id: "team", label: "Takım", icon: "user" },
  { id: "billing", label: "Faturalama", icon: "coin" },
  { id: "webhooks", label: "Webhooks", icon: "arrows" },
  { id: "notif", label: "Bildirimler", icon: "bell" },
];

const Switch: React.FC<{ on: boolean; onClick: () => void }> = ({ on, onClick }) => (
  <button
    onClick={onClick}
    style={{
      width: 38,
      height: 22,
      borderRadius: 999,
      border: "none",
      background: on ? "var(--grad-primary)" : "rgba(255,255,255,0.08)",
      position: "relative",
      cursor: "pointer",
      padding: 0,
      transition: "all 180ms",
    }}
  >
    <span
      style={{
        position: "absolute",
        top: 3,
        left: on ? 19 : 3,
        width: 16,
        height: 16,
        borderRadius: 999,
        background: "#fff",
        transition: "left 180ms",
      }}
    />
  </button>
);

const PLANS = ["FREE", "PRO", "TEAM", "ENTERPRISE"] as const;
type Plan = (typeof PLANS)[number];
const PLAN_PRICE: Record<Plan, string> = { FREE: "$0", PRO: "$49", TEAM: "$149", ENTERPRISE: "Özel" };

function randomKey(prefix: string): string {
  const rand = Math.random().toString(36).slice(2, 6) + Math.random().toString(36).slice(2, 6);
  return `${prefix}_${rand}`;
}

export const SettingsScreen: React.FC = () => {
  const [tab, setTab] = useState("general");
  const [theme, setTheme] = useState("dark");
  const [telemetry, setTelemetry] = useState(true);
  const [autoRoute, setAutoRoute] = useState(true);
  const [workspaceName, setWorkspaceName] = useState("NeoMagic — Üretim");
  const [apiKeys, setApiKeys] = useState<string[]>(["sk_live_xxxx_4823", "sk_test_xxxx_0912"]);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [webhooks, setWebhooks] = useState<string[]>([
    "https://api.acme.io/neomagic/hook",
    "https://slack.webhook.io/T0/B0/xxxx",
  ]);
  const [newWebhook, setNewWebhook] = useState("");
  const [showWebhookInput, setShowWebhookInput] = useState(false);
  const [plan, setPlan] = useState<Plan>("PRO");
  const [notifications, setNotifications] = useState<boolean[]>([true, true, false, true, false]);

  const handleCopyKey = async (k: string) => {
    try {
      await navigator.clipboard.writeText(k);
      setCopiedKey(k);
      window.setTimeout(() => setCopiedKey((c) => (c === k ? null : c)), 1500);
    } catch (err) {
      console.warn("[settings] kopyalama başarısız:", err);
    }
  };

  const handleRevokeKey = (k: string) => {
    setApiKeys((arr) => arr.filter((x) => x !== k));
  };

  const handleNewKey = () => {
    setApiKeys((arr) => [...arr, randomKey("sk_test_xxxx")]);
  };

  const handleCyclePlan = () => {
    const idx = PLANS.indexOf(plan);
    setPlan(PLANS[(idx + 1) % PLANS.length]);
  };

  const handleAddWebhook = () => {
    if (showWebhookInput) {
      const trimmed = newWebhook.trim();
      if (trimmed) {
        setWebhooks((arr) => [...arr, trimmed]);
        setNewWebhook("");
      }
      setShowWebhookInput(false);
    } else {
      setShowWebhookInput(true);
    }
  };

  const toggleNotification = (i: number) => {
    setNotifications((arr) => arr.map((v, idx) => (idx === i ? !v : v)));
  };

  return (
    <div className="fade-up" style={{ display: "grid", gridTemplateColumns: "240px 1fr", gap: 16 }}>
      <div className="glass" style={{ padding: 8, height: "fit-content" }}>
        {TABS.map((t) => (
          <div
            key={t.id}
            className={`nav-item ${tab === t.id ? "active" : ""}`}
            onClick={() => setTab(t.id)}
          >
            <Icon name={t.icon} size={14} />
            <span>{t.label}</span>
          </div>
        ))}
      </div>

      <div className="glass-strong panel-top-glow" style={{ padding: 24 }}>
        {tab === "general" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
            <div>
              <h3 style={{ fontSize: 18, fontWeight: 600 }}>Genel ayarlar</h3>
              <p style={{ color: "var(--text-tertiary)", fontSize: 12.5, marginTop: 4 }}>Workspace tercihleri ve görsel ayarlar.</p>
            </div>
            <div>
              <label className="field-label">Workspace adı</label>
              <input
                className="input"
                value={workspaceName}
                onChange={(e) => setWorkspaceName(e.target.value)}
              />
            </div>
            <div>
              <label className="field-label">Tema</label>
              <div style={{ display: "flex", gap: 8 }}>
                {["dark", "midnight", "cyber"].map((t) => (
                  <button
                    key={t}
                    onClick={() => setTheme(t)}
                    className="btn btn-soft btn-sm"
                    style={{
                      borderColor: theme === t ? "var(--neon-cyan)" : undefined,
                      background: theme === t ? "rgba(0,212,255,0.08)" : undefined,
                      color: theme === t ? "var(--neon-cyan)" : undefined,
                    }}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 500 }}>Telemetri</div>
                <div style={{ fontSize: 11, color: "var(--text-tertiary)" }}>Anonim performans ölçümleri gönder.</div>
              </div>
              <Switch on={telemetry} onClick={() => setTelemetry(!telemetry)} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 500 }}>Akıllı routing</div>
                <div style={{ fontSize: 11, color: "var(--text-tertiary)" }}>Provider'ı otomatik seç (latency/cost/quality dengeli).</div>
              </div>
              <Switch on={autoRoute} onClick={() => setAutoRoute(!autoRoute)} />
            </div>
          </div>
        )}

        {tab === "api" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <h3 style={{ fontSize: 18, fontWeight: 600 }}>API Anahtarları</h3>
            {apiKeys.length === 0 && (
              <div style={{ fontSize: 12, color: "var(--text-tertiary)" }}>
                Aktif API anahtarı yok. "Yeni anahtar" ile oluşturun.
              </div>
            )}
            {apiKeys.map((k) => (
              <div key={k} className="glass" style={{ padding: 14, display: "flex", alignItems: "center", gap: 10 }}>
                <Chip tone="cyan">{k.startsWith("sk_live") ? "LIVE" : "TEST"}</Chip>
                <code className="font-mono" style={{ fontSize: 12 }}>{k}</code>
                <span style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
                  <button className="btn btn-soft btn-xs" onClick={() => handleCopyKey(k)}>
                    <Icon name="copy" size={11} /> {copiedKey === k ? "Kopyalandı" : "Kopyala"}
                  </button>
                  <button className="btn btn-soft btn-xs" onClick={() => handleRevokeKey(k)}>
                    <Icon name="x" size={11} /> İptal
                  </button>
                </span>
              </div>
            ))}
            <button className="btn btn-primary" style={{ width: "fit-content" }} onClick={handleNewKey}>
              <Icon name="plus" size={13} /> Yeni anahtar
            </button>
          </div>
        )}

        {tab === "team" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <h3 style={{ fontSize: 18, fontWeight: 600 }}>Takım üyeleri</h3>
            {[
              { name: "Ekrem K.", role: "Owner", color: "violet" as const },
              { name: "Mert K.", role: "Admin", color: "cyan" as const },
              { name: "Ayşe D.", role: "Editor", color: "mint" as const },
              { name: "Burak A.", role: "Viewer", color: "amber" as const },
            ].map((m) => (
              <div key={m.name} className="glass" style={{ padding: 12, display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 999,
                  background: "linear-gradient(135deg,#EC4899,#8B5CF6)",
                  color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center",
                  fontWeight: 700, fontSize: 12,
                }}>{m.name.split(" ").map((s) => s[0]).join("")}</div>
                <div style={{ fontSize: 13.5, fontWeight: 500 }}>{m.name}</div>
                <span style={{ marginLeft: "auto" }}><Chip tone={m.color}>{m.role}</Chip></span>
              </div>
            ))}
          </div>
        )}

        {tab === "billing" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <h3 style={{ fontSize: 18, fontWeight: 600 }}>Faturalama</h3>
            <div className="glass-strong panel-top-glow" style={{ padding: 20 }}>
              <Chip tone="violet" dot>{plan} PLAN</Chip>
              <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginTop: 10 }}>
                <span className="grad-text" style={{ fontSize: 38, fontWeight: 700 }}>{PLAN_PRICE[plan]}</span>
                <span style={{ color: "var(--text-tertiary)" }}>/ ay</span>
              </div>
              <div style={{ fontSize: 12, color: "var(--text-tertiary)", marginTop: 6 }}>
                Sonraki faturalandırma: 15 Haziran 2026
              </div>
              <button className="btn btn-ghost" style={{ marginTop: 14 }} onClick={handleCyclePlan}>
                Plan değiştir
              </button>
            </div>
            <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>Bu ay kullanım: $184 / $400</div>
          </div>
        )}

        {tab === "webhooks" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <h3 style={{ fontSize: 18, fontWeight: 600 }}>Webhook endpoint'ları</h3>
            {webhooks.map((u) => (
              <div key={u} className="glass" style={{ padding: 14 }}>
                <div className="nm-row">
                  <Chip tone="mint" dot>ACTIVE</Chip>
                  <code className="font-mono" style={{ fontSize: 11.5, color: "var(--text-secondary)" }}>{u}</code>
                  <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 11, color: "var(--neon-cyan)" }}>200 OK · 2dk önce</span>
                    <button
                      className="btn btn-soft btn-xs"
                      onClick={() => setWebhooks((arr) => arr.filter((x) => x !== u))}
                      title="Webhook'u kaldır"
                    >
                      <Icon name="x" size={11} />
                    </button>
                  </span>
                </div>
              </div>
            ))}
            {showWebhookInput && (
              <div className="glass" style={{ padding: 14, display: "flex", gap: 8 }}>
                <input
                  className="input"
                  placeholder="https://example.com/webhook"
                  value={newWebhook}
                  onChange={(e) => setNewWebhook(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleAddWebhook();
                    if (e.key === "Escape") {
                      setShowWebhookInput(false);
                      setNewWebhook("");
                    }
                  }}
                  autoFocus
                />
                <button
                  className="btn btn-soft btn-sm"
                  onClick={() => {
                    setShowWebhookInput(false);
                    setNewWebhook("");
                  }}
                >
                  İptal
                </button>
              </div>
            )}
            <button className="btn btn-primary" style={{ width: "fit-content" }} onClick={handleAddWebhook}>
              <Icon name="plus" size={13} /> {showWebhookInput ? "Ekle" : "Yeni webhook"}
            </button>
          </div>
        )}

        {tab === "notif" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <h3 style={{ fontSize: 18, fontWeight: 600 }}>Bildirim tercihleri</h3>
            {[
              "Judge skoru < 4.0 düştüğünde",
              "A/B turnuvası tamamlandığında",
              "Cache miss oranı %20'yi geçtiğinde",
              "Provider outage tespit edildiğinde",
              "Yeni framework yayınlandığında",
            ].map((label, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid var(--border-soft)" }}>
                <span style={{ fontSize: 13 }}>{label}</span>
                <Switch on={notifications[i] ?? false} onClick={() => toggleNotification(i)} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
