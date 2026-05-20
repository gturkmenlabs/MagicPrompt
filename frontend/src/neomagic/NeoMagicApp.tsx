import React, { useState } from "react";
import { Sidebar, TopBar, StatusBar, Chip, Icon, type NeoMagicPage } from "./components";
import { AuthScreen } from "./screens/Auth";
import { DashboardScreen } from "./screens/Dashboard";
import { WorkbenchScreen } from "./screens/Workbench";
import { AILabScreen } from "./screens/AILab";
import { CoTScreen } from "./screens/CoT";
import { LibraryScreen } from "./screens/Library";
import { VersionsScreen } from "./screens/Versions";
import { ProvidersScreen } from "./screens/Providers";
import { ComplianceScreen } from "./screens/Compliance";
import { SettingsScreen } from "./screens/Settings";
import { DocsScreen } from "./screens/Docs";

import "./styles.css";

const PAGE_META: Record<NeoMagicPage, { title: string; subtitle: string; breadcrumb: string[] }> = {
  dashboard: {
    title: "Dashboard",
    subtitle: "Workspace genel görünümü — son 24 saat",
    breadcrumb: ["WORKSPACE", "DASHBOARD"],
  },
  workbench: {
    title: "Prompt Workbench",
    subtitle: "Niyetinizden üretim kalitesinde prompt'a — 5 aşamalı pipeline",
    breadcrumb: ["WORKSPACE", "WORKBENCH"],
  },
  ailab: {
    title: "AI Lab",
    subtitle: "A/B turnuvası ve jüri ensemble karşılaştırması",
    breadcrumb: ["WORKSPACE", "AI_LAB"],
  },
  cot: {
    title: "CoT Visualizer",
    subtitle: "Reasoning zincirini görselleştir ve inceleyin",
    breadcrumb: ["WORKSPACE", "COT"],
  },
  library: {
    title: "Library",
    subtitle: "Kayıtlı promptlar, koleksiyonlar ve şablonlar",
    breadcrumb: ["WORKSPACE", "LIBRARY"],
  },
  versions: {
    title: "Versions",
    subtitle: "Git-stili sürüm geçmişi ve diff karşılaştırması",
    breadcrumb: ["PLATFORM", "VERSIONS"],
  },
  providers: {
    title: "Providers",
    subtitle: "10+ LLM sağlayıcı — routing & sağlık takibi",
    breadcrumb: ["PLATFORM", "PROVIDERS"],
  },
  compliance: {
    title: "Compliance",
    subtitle: "WCAG, OWASP, KVKK, GDPR, SOC2 izleme",
    breadcrumb: ["PLATFORM", "COMPLIANCE"],
  },
  docs: {
    title: "Documentation",
    subtitle: "Rehberler, DSL referansı ve SDK örnekleri",
    breadcrumb: ["PLATFORM", "DOCS"],
  },
  settings: {
    title: "Settings",
    subtitle: "Workspace tercihleri, API anahtarları, takım",
    breadcrumb: ["PLATFORM", "SETTINGS"],
  },
};

interface TweakState {
  density: number;
  glow: number;
  scan: number;
}

const DEFAULT_TWEAKS: TweakState = { density: 1, glow: 1, scan: 0.18 };

const NeoMagicApp: React.FC = () => {
  const [authed, setAuthed] = useState(false);
  const [page, setPage] = useState<NeoMagicPage>("dashboard");
  const [tweaksOpen, setTweaksOpen] = useState(false);
  const [tweaks, setTweaks] = useState<TweakState>(DEFAULT_TWEAKS);

  const screen = (() => {
    switch (page) {
      case "dashboard": return <DashboardScreen onNavigate={setPage} />;
      case "workbench": return <WorkbenchScreen onNavigate={setPage} />;
      case "ailab": return <AILabScreen />;
      case "cot": return <CoTScreen />;
      case "library": return <LibraryScreen />;
      case "versions": return <VersionsScreen />;
      case "providers": return <ProvidersScreen />;
      case "compliance": return <ComplianceScreen />;
      case "settings": return <SettingsScreen />;
      case "docs": return <DocsScreen />;
      default: return <DashboardScreen onNavigate={setPage} />;
    }
  })();

  const handleShare = async () => {
    const url = typeof window !== "undefined" ? window.location.href : "";
    const shareData = {
      title: `NeoMagic — ${meta.title}`,
      text: meta.subtitle,
      url,
    };
    try {
      if (typeof navigator !== "undefined" && (navigator as Navigator & { share?: (d: ShareData) => Promise<void> }).share) {
        await (navigator as Navigator & { share: (d: ShareData) => Promise<void> }).share(shareData);
      } else if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(url);
        console.info("[share] URL panoya kopyalandı:", url);
      }
    } catch (err) {
      console.warn("[share] Paylaşım iptal edildi veya başarısız:", err);
    }
  };

  const meta = PAGE_META[page];

  if (!authed) {
    return (
      <div
        className="neomagic-root"
        style={
          {
            "--density": tweaks.density,
            "--glow": tweaks.glow,
            "--scan-opacity": tweaks.scan,
          } as React.CSSProperties
        }
      >
        <div className="cyber-bg" />
        <div className="cyber-noise" />
        <div className="cyber-scanline" />
        <AuthScreen onSignIn={() => setAuthed(true)} />
      </div>
    );
  }

  return (
    <div
      className="neomagic-root"
      style={
        {
          "--density": tweaks.density,
          "--glow": tweaks.glow,
          "--scan-opacity": tweaks.scan,
        } as React.CSSProperties
      }
    >
      <div className="cyber-bg" />
      <div className="cyber-noise" />
      <div className="cyber-scanline" />

      <div className="nm-shell">
        <Sidebar
          active={page}
          onChange={setPage}
          onLogout={() => setAuthed(false)}
          user={{ name: "Ekrem K.", initials: "EK" }}
        />
        <div className="nm-main">
          <TopBar
            title={meta.title}
            subtitle={meta.subtitle}
            breadcrumb={meta.breadcrumb}
            actions={
              <>
                <button
                  className="btn btn-soft btn-sm"
                  onClick={() => setTweaksOpen((v) => !v)}
                  title="Görsel ayarlar"
                >
                  <Icon name="sparkles" size={13} />
                  Tweaks
                </button>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={handleShare}
                  title="Bu sayfayı paylaş"
                >
                  <Icon name="upload" size={12} /> Paylaş
                </button>
              </>
            }
          />
          <div className="nm-page scroll">{screen}</div>
          <StatusBar />
        </div>
      </div>

      {tweaksOpen && (
        <div
          className="glass-strong panel-top-glow fade-up"
          style={{
            position: "fixed",
            top: 88,
            right: 28,
            width: 280,
            padding: 18,
            zIndex: 10000,
            boxShadow: "var(--shadow-panel)",
          }}
        >
          <div className="nm-row" style={{ marginBottom: 14 }}>
            <Icon name="sparkles" size={14} />
            <span style={{ fontSize: 13, fontWeight: 600 }}>Tweaks</span>
            <button
              className="btn btn-soft btn-xs"
              style={{ marginLeft: "auto" }}
              onClick={() => setTweaksOpen(false)}
            >
              <Icon name="x" size={11} />
            </button>
          </div>
          {[
            { l: "Density", k: "density" as const, min: 0.6, max: 1.4, step: 0.05 },
            { l: "Glow", k: "glow" as const, min: 0, max: 1.6, step: 0.05 },
            { l: "Scanline", k: "scan" as const, min: 0, max: 0.5, step: 0.01 },
          ].map((s) => (
            <div key={s.k} style={{ marginBottom: 14 }}>
              <div className="nm-row" style={{ justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ fontSize: 12 }}>{s.l}</span>
                <span className="font-mono" style={{ fontSize: 11, color: "var(--neon-cyan)" }}>
                  {tweaks[s.k].toFixed(2)}
                </span>
              </div>
              <input
                type="range"
                min={s.min}
                max={s.max}
                step={s.step}
                value={tweaks[s.k]}
                onChange={(e) => setTweaks({ ...tweaks, [s.k]: Number(e.target.value) })}
                style={{ width: "100%", accentColor: "#00D4FF" }}
              />
            </div>
          ))}
          <button
            className="btn btn-soft btn-sm"
            style={{ width: "100%", justifyContent: "center" }}
            onClick={() => setTweaks(DEFAULT_TWEAKS)}
          >
            Sıfırla
          </button>
          <div className="nm-row" style={{ marginTop: 12, fontSize: 11, color: "var(--text-tertiary)" }}>
            <Chip tone="violet" dot>LIVE</Chip>
            <span style={{ marginLeft: 8 }}>Tüm ekranlara uygulanır</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default NeoMagicApp;
