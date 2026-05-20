import React, { useMemo, useState } from "react";
import { Icon, Chip, ScoreBar } from "../components";
import { api, useAsync, type OpenRouterModel } from "../api";

type ProviderRow = {
  id: string;
  name: string;
  model: string;
  status: "online" | "local" | "offline";
  latencyLabel: string;
  costLabel: string;
  usagePct: number;
  color: "violet" | "cyan" | "mint" | "amber" | "pink" | "red";
};

const COLORS: ProviderRow["color"][] = ["violet", "cyan", "mint", "amber", "pink", "red"];

function providerKey(m: OpenRouterModel): string {
  if (m.provider?.trim()) return m.provider.trim();
  const slash = m.id.indexOf("/");
  return slash > 0 ? m.id.slice(0, slash) : "other";
}

function bucketByProvider(models: OpenRouterModel[]) {
  const groups = new Map<string, OpenRouterModel[]>();
  for (const m of models) {
    const key = providerKey(m);
    const list = groups.get(key) ?? [];
    list.push(m);
    groups.set(key, list);
  }
  return groups;
}

function formatCost(p: OpenRouterModel): string {
  if (p.free) return "ücretsiz";
  const usdPer1k = ((p.promptPrice ?? 0) + (p.completionPrice ?? 0)) / 2;
  if (!Number.isFinite(usdPer1k) || usdPer1k <= 0) return "—";
  return `$${usdPer1k.toFixed(4)}`;
}

export const ProvidersScreen: React.FC = () => {
  const [showAll, setShowAll] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [settingsForId, setSettingsForId] = useState<string | null>(null);
  const orState = useAsync(() => api.openRouterModels(), []);
  const ragState = useAsync(() => api.ragHealth(), []);
  const healthState = useAsync(() => api.health(), []);

  const orModels = orState.data?.models ?? [];
  const totalModels = orModels.length;
  const totalProviders = useMemo(() => bucketByProvider(orModels).size, [orModels]);

  const rows: ProviderRow[] = useMemo(() => {
    const out: ProviderRow[] = [];
    const ormodels = orModels;
    if (ormodels.length > 0) {
      const groups = bucketByProvider(ormodels);
      const entries = Array.from(groups.entries()).sort((a, b) => b[1].length - a[1].length);
      const visible = showAll ? entries : entries.slice(0, 8);
      visible.forEach(([provider, models], i) => {
        const top = models[0];
        const usagePct = Math.min(95, 10 + models.length * 4);
        out.push({
          id: `or:${provider}`,
          name: provider,
          model: `${models.length} model · top: ${top.label || top.id}`,
          status: "online",
          latencyLabel: top.contextLength ? `${Math.round(top.contextLength / 1000)}k ctx` : "—",
          costLabel: formatCost(top),
          usagePct,
          color: COLORS[i % COLORS.length],
        });
      });
    }
    return out;
  }, [orModels, showAll]);

  return (
    <div className="fade-up" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div className="glass-strong panel-top-glow" style={{ padding: 20 }}>
        <div className="nm-row" style={{ gap: 12, flexWrap: "wrap" }}>
          <Chip tone="cyan" dot>
            {orState.loading ? "yükleniyor..." : `${totalProviders} provider · ${totalModels} model`}
          </Chip>
          <Chip tone={healthState.data?.status === "ok" ? "mint" : "amber"} dot>
            API {healthState.data?.status ?? (healthState.loading ? "..." : "?")}
          </Chip>
          <Chip tone={ragState.data?.ok ? "mint" : "amber"} dot>
            RAG {ragState.data?.ok ? "online" : ragState.loading ? "..." : "offline"}
          </Chip>
          <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>
            Otomatik routing politikası: latency / cost / quality dengeli
          </span>
          <button className="btn btn-soft btn-sm" style={{ marginLeft: "auto" }} onClick={() => setShowAll((v) => !v)}>
            <Icon name="settings" size={12} /> {showAll ? "İlk 8'i göster" : "Tümünü göster"}
          </button>
        </div>
      </div>

      {orState.error && (
        <div className="glass" style={{ padding: 14, borderLeft: "3px solid var(--neon-amber)" }}>
          <div style={{ fontSize: 12, color: "var(--neon-amber)" }}>
            OpenRouter kataloğu yüklenemedi: {orState.error}
          </div>
        </div>
      )}

      {orState.loading && rows.length === 0 ? (
        <div className="glass" style={{ padding: 40, textAlign: "center", color: "var(--text-tertiary)" }}>
          <Icon name="loader" size={20} /> Provider listesi yükleniyor...
        </div>
      ) : rows.length === 0 ? (
        <div className="glass" style={{ padding: 40, textAlign: "center", color: "var(--text-tertiary)" }}>
          Aktif provider bulunamadı. <code>backend/.env</code> dosyasında <code>OPENROUTER_API_KEY</code> tanımlı mı?
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
          {rows.map((p) => (
            <div key={p.id} className="glass panel-top-glow" style={{ padding: 18 }}>
              <div className="nm-row" style={{ marginBottom: 10 }}>
                <div
                  style={{
                    width: 36, height: 36, borderRadius: 10,
                    background: `linear-gradient(135deg, var(--neon-${p.color}) 0%, var(--neon-cyan) 100%)`,
                    display: "inline-flex", alignItems: "center", justifyContent: "center", fontWeight: 700, color: "#0a0a14",
                  }}
                >
                  {p.name.charAt(0).toUpperCase()}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, textTransform: "capitalize" }}>{p.name}</div>
                  <div
                    className="font-mono"
                    style={{ fontSize: 10.5, color: "var(--text-tertiary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                    title={p.model}
                  >
                    {p.model}
                  </div>
                </div>
                <span style={{ marginLeft: "auto" }}>
                  <Chip tone={p.status === "online" ? "mint" : p.status === "local" ? "amber" : "red"} dot>
                    {p.status.toUpperCase()}
                  </Chip>
                </span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 12 }}>
                <div style={{ padding: 10, background: "rgba(10,12,24,0.4)", borderRadius: 8 }}>
                  <div className="font-mono" style={{ fontSize: 10, color: "var(--text-tertiary)", textTransform: "uppercase" }}>Capacity</div>
                  <div className="grad-text" style={{ fontSize: 18, fontWeight: 700, marginTop: 4 }}>{p.latencyLabel}</div>
                </div>
                <div style={{ padding: 10, background: "rgba(10,12,24,0.4)", borderRadius: 8 }}>
                  <div className="font-mono" style={{ fontSize: 10, color: "var(--text-tertiary)", textTransform: "uppercase" }}>Cost / 1k</div>
                  <div className="grad-text" style={{ fontSize: 18, fontWeight: 700, marginTop: 4 }}>{p.costLabel}</div>
                </div>
              </div>
              <div style={{ marginTop: 14 }}>
                <div className="nm-row" style={{ justifyContent: "space-between", marginBottom: 4, fontSize: 11 }}>
                  <span style={{ color: "var(--text-tertiary)" }}>Model yoğunluğu</span>
                  <span style={{ color: "var(--neon-cyan)" }}>{p.usagePct}%</span>
                </div>
                <ScoreBar value={p.usagePct} />
              </div>
              <div className="nm-row" style={{ marginTop: 14, gap: 8 }}>
                <button
                  className="btn btn-soft btn-xs"
                  onClick={() => setActiveId((id) => (id === p.id ? null : p.id))}
                  style={activeId === p.id ? { borderColor: "var(--neon-mint)", color: "var(--neon-mint)" } : undefined}
                  title="Bu sağlayıcıyı aktif olarak işaretle"
                >
                  <Icon name="check" size={11} /> {activeId === p.id ? "Seçili" : "Aktif"}
                </button>
                <button
                  className="btn btn-soft btn-xs"
                  onClick={() => setSettingsForId((id) => (id === p.id ? null : p.id))}
                  title="Sağlayıcı ayarlarını aç"
                >
                  <Icon name="settings" size={11} /> Ayarlar
                </button>
                <button
                  className="btn btn-soft btn-xs"
                  style={{ marginLeft: "auto" }}
                  onClick={() => setActiveId(p.id)}
                  title="Detayları gör"
                >
                  <Icon name="arrow_right" size={11} />
                </button>
              </div>
              {settingsForId === p.id && (
                <div
                  style={{
                    marginTop: 10,
                    padding: 10,
                    borderRadius: 8,
                    background: "rgba(10,12,24,0.55)",
                    border: "1px solid var(--border-soft)",
                    fontSize: 11.5,
                    color: "var(--text-tertiary)",
                    lineHeight: 1.5,
                  }}
                >
                  <strong style={{ color: "var(--text-secondary)" }}>{p.name}</strong> ayarları
                  yapılandırma <code>backend/.env</code> dosyasından okunur. Routing önceliğini
                  Settings → Workspace altından değiştirin.
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
