import React, { useEffect, useState, type CSSProperties, type ReactNode } from "react";

/* ─── Icon set ────────────────────────────────────────────────── */
const ICON_PATHS: Record<string, string> = {
  sparkles: "M12 3l1.9 4.5L18 9l-4.1 1.5L12 15l-1.9-4.5L6 9l4.1-1.5zM19 13l.9 2.1L22 16l-2.1.9L19 19l-.9-2.1L16 16l2.1-.9zM5 13l.6 1.4L7 15l-1.4.6L5 17l-.6-1.4L3 15l1.4-.6z",
  terminal: "M4 5h16v14H4zM7 9l3 3-3 3M12 15h5",
  zap: "M13 2L4 14h7l-1 8 9-12h-7l1-8z",
  grid: "M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z",
  flask: "M9 3h6v4l5 12a2 2 0 01-2 3H6a2 2 0 01-2-3l5-12V3zM9 11h6",
  book: "M4 5a2 2 0 012-2h13v17H6a2 2 0 00-2 2V5zM4 5v17",
  library: "M4 4h3v16H4zM10 4h3v16h-3zM16 4l4 16",
  settings: "M12 9a3 3 0 100 6 3 3 0 000-6zM19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09a1.65 1.65 0 00-1-1.51 1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09a1.65 1.65 0 001.51-1 1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z",
  chart: "M3 3v18h18M7 14l4-4 4 4 5-5",
  branch: "M6 3v12M18 9v12M6 15a3 3 0 003 3h6a3 3 0 003-3",
  shield: "M12 2l8 4v6c0 5-3.5 9-8 10-4.5-1-8-5-8-10V6l8-4z",
  play: "M6 4l14 8-14 8V4z",
  plus: "M12 5v14M5 12h14",
  search: "M11 4a7 7 0 100 14 7 7 0 000-14zM21 21l-5-5",
  arrow_right: "M5 12h14M13 6l6 6-6 6",
  chevron_right: "M9 6l6 6-6 6",
  chevron_down: "M6 9l6 6 6-6",
  chevron_up: "M6 15l6-6 6 6",
  check: "M5 12l5 5L20 7",
  x: "M6 6l12 12M18 6L6 18",
  cpu: "M4 7a3 3 0 013-3h10a3 3 0 013 3v10a3 3 0 01-3 3H7a3 3 0 01-3-3V7zM9 9h6v6H9zM9 2v2M15 2v2M9 20v2M15 20v2M2 9h2M2 15h2M20 9h2M20 15h2",
  user: "M12 12a4 4 0 100-8 4 4 0 000 8zM4 21a8 8 0 0116 0",
  logout: "M16 17l5-5-5-5M21 12H9M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4",
  eye: "M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 9a3 3 0 100 6 3 3 0 000-6z",
  eye_off: "M3 3l18 18M10.6 5.1A11 11 0 0112 5c6 0 10 7 10 7a14 14 0 01-3.4 4M6.1 6.1A14 14 0 002 12s4 7 10 7a11 11 0 005.9-1.6M9 9.6a3 3 0 004.4 4.4",
  mail: "M3 6h18v12H3zM3 6l9 7 9-7",
  lock: "M5 11h14v10H5zM8 11V7a4 4 0 118 0v4",
  rocket: "M9 14l-3 3 4 1 1 4 3-3M14.7 5.3a8 8 0 016 6L13 19l-4-4z",
  bot: "M9 9h6v8H9zM12 4v3M5 13h2M17 13h2M8 21h8",
  bolt: "M13 2L4 14h7l-1 8 9-12h-7l1-8z",
  git: "M5 4v16M19 4v6a4 4 0 01-4 4H9M5 8a2 2 0 100-4 2 2 0 000 4zM5 20a2 2 0 100-4 2 2 0 000 4zM19 10a2 2 0 100-4 2 2 0 000 4zM9 18a2 2 0 100-4 2 2 0 000 4z",
  activity: "M3 12h4l3-9 4 18 3-9h4",
  layers: "M12 2l10 5-10 5L2 7zM2 17l10 5 10-5M2 12l10 5 10-5",
  history: "M3 12a9 9 0 109-9 9 9 0 00-6.4 2.6L3 8M3 3v5h5M12 7v5l3 2",
  bell: "M6 8a6 6 0 1112 0c0 7 3 9 3 9H3s3-2 3-9zM10 21a2 2 0 004 0",
  arrows: "M3 7h13M16 7l-3-3M16 7l-3 3M21 17H8M8 17l3 3M8 17l3-3",
  copy: "M9 9h11v11H9zM5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1",
  download: "M12 3v12M7 10l5 5 5-5M5 21h14",
  upload: "M12 21V9M7 14l5-5 5 5M5 3h14",
  code: "M16 4l4 8-4 8M8 4L4 12l4 8M14 4l-4 16",
  alert: "M12 2l11 19H1L12 2zM12 9v6M12 18v0",
  info: "M12 2a10 10 0 100 20 10 10 0 000-20zM12 8v0M11 12h1v4h1",
  diamond: "M2 8l4-5h12l4 5-10 13z",
  target: "M12 2a10 10 0 100 20 10 10 0 000-20zM12 6a6 6 0 100 12 6 6 0 000-12zM12 10a2 2 0 100 4 2 2 0 000-4z",
  server: "M3 5h18v6H3zM3 13h18v6H3zM7 9h0M7 17h0",
  globe: "M12 2a10 10 0 100 20 10 10 0 000-20zM2 12h20M12 2a14 14 0 010 20M12 2a14 14 0 000 20",
  coin: "M12 2a10 10 0 100 20 10 10 0 000-20zM9 9h4a2 2 0 010 4h-4a2 2 0 010 4h6",
  filter: "M3 5h18l-7 9v6l-4-2v-4z",
  edit: "M12 20h9M16.5 3.5a2.121 2.121 0 113 3L7 19l-4 1 1-4z",
};

export interface IconProps {
  name: string;
  size?: number;
  stroke?: number;
  className?: string;
  style?: CSSProperties;
}

export const Icon: React.FC<IconProps> = ({ name, size = 16, stroke = 1.6, className = "", style }) => {
  const d = ICON_PATHS[name] || ICON_PATHS.x;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
    >
      <path d={d} />
    </svg>
  );
};

/* ─── Logo ─────────────────────────────────────────────────────── */
export const Logo: React.FC<{ size?: number; withText?: boolean }> = ({ size = 36, withText = true }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
    <div
      style={{
        width: size,
        height: size,
        borderRadius: 10,
        background: "linear-gradient(135deg, #8B5CF6 0%, #00D4FF 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        boxShadow: "0 8px 24px -8px rgba(139,92,246,0.7), inset 0 1px 0 rgba(255,255,255,0.2)",
      }}
    >
      <svg width={size * 0.55} height={size * 0.55} viewBox="0 0 24 24" fill="none">
        <path d="M12 2 L4 8 L4 16 L12 22 L20 16 L20 8 Z" stroke="#0a0a14" strokeWidth="1.6" />
        <path d="M12 7 L8 10 L8 14 L12 17 L16 14 L16 10 Z" fill="#0a0a14" />
      </svg>
      <div
        style={{
          position: "absolute",
          inset: -2,
          borderRadius: 12,
          background: "linear-gradient(135deg, #8B5CF6, #00D4FF)",
          filter: "blur(8px)",
          opacity: 0.35,
          zIndex: -1,
        }}
      />
    </div>
    {withText && (
      <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.05 }}>
        <span style={{ fontWeight: 700, fontSize: 15, letterSpacing: "-0.01em" }}>
          Neo<span className="grad-text">Magic</span>
        </span>
        <span className="font-mono" style={{ fontSize: 9, color: "var(--text-tertiary)", letterSpacing: "0.18em" }}>
          PROMPT_OS v3.2
        </span>
      </div>
    )}
  </div>
);

/* ─── Sidebar nav ─────────────────────────────────────────────── */
export type NeoMagicPage =
  | "dashboard"
  | "workbench"
  | "ailab"
  | "cot"
  | "library"
  | "versions"
  | "providers"
  | "compliance"
  | "docs"
  | "settings";

interface NavItem {
  id: NeoMagicPage;
  label: string;
  desc: string;
  icon: string;
  badge?: "CORE" | "LIVE" | "BETA";
}

export const NAV_GROUPS: Array<{ label: string; items: NavItem[] }> = [
  {
    label: "WORKSPACE",
    items: [
      { id: "dashboard", label: "Dashboard", desc: "Genel görünüm", icon: "grid" },
      { id: "workbench", label: "Prompt Workbench", desc: "Üretim akışı", icon: "zap", badge: "CORE" },
      { id: "ailab", label: "AI Lab", desc: "Karşılaştırma & jüri", icon: "flask", badge: "LIVE" },
      { id: "cot", label: "CoT Visualizer", desc: "Akıl yürütme zinciri", icon: "branch" },
      { id: "library", label: "Library", desc: "Kayıtlı promptlar", icon: "library" },
    ],
  },
  {
    label: "PLATFORM",
    items: [
      { id: "versions", label: "Versions", desc: "Diff & geçmiş", icon: "history" },
      { id: "providers", label: "Providers", desc: "10+ LLM sağlayıcı", icon: "server" },
      { id: "compliance", label: "Compliance", desc: "WCAG / OWASP / KVKK", icon: "shield", badge: "BETA" },
      { id: "docs", label: "Documentation", desc: "Rehber & API", icon: "book" },
      { id: "settings", label: "Settings", desc: "Tercihler", icon: "settings" },
    ],
  },
];

export interface SidebarProps {
  active: NeoMagicPage;
  onChange: (id: NeoMagicPage) => void;
  onLogout?: () => void;
  user?: { name: string; initials: string };
}

export const Sidebar: React.FC<SidebarProps> = ({ active, onChange, onLogout, user }) => (
  <aside
    style={{
      width: 268,
      flexShrink: 0,
      display: "flex",
      flexDirection: "column",
      borderRight: "1px solid var(--border-soft)",
      background: "rgba(8, 9, 18, 0.6)",
      backdropFilter: "blur(20px)",
      WebkitBackdropFilter: "blur(20px)",
      position: "relative",
      zIndex: 5,
    }}
  >
    <div style={{ padding: "18px 16px 16px", borderBottom: "1px solid var(--border-soft)" }}>
      <Logo />
      <button
        className="btn btn-primary"
        style={{ width: "100%", marginTop: 14, justifyContent: "center" }}
        onClick={() => onChange("workbench")}
      >
        <Icon name="plus" size={14} stroke={2.5} />
        Yeni Prompt
        <span className="font-mono" style={{ marginLeft: "auto", fontSize: 10, opacity: 0.7 }}>⌘N</span>
      </button>
    </div>

    <nav className="scroll" style={{ flex: 1, overflowY: "auto", padding: "16px 12px" }}>
      {NAV_GROUPS.map((group) => (
        <div key={group.label} style={{ marginBottom: 20 }}>
          <div
            className="font-mono"
            style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.18em",
              color: "var(--text-muted)",
              padding: "0 14px 8px",
            }}
          >
            {group.label}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {group.items.map((item) => (
              <div
                key={item.id}
                className={`nav-item ${active === item.id ? "active" : ""}`}
                onClick={() => onChange(item.id)}
              >
                <Icon name={item.icon} size={16} />
                <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.2, minWidth: 0 }}>
                  <span>{item.label}</span>
                  <span style={{ fontSize: 10.5, color: "var(--text-tertiary)", marginTop: 2 }}>{item.desc}</span>
                </div>
                {item.badge && (
                  <span
                    className={`nav-badge ${item.badge === "LIVE" ? "live" : item.badge === "BETA" ? "beta" : ""}`}
                  >
                    {item.badge}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </nav>

    <div style={{ padding: 12, borderTop: "1px solid var(--border-soft)" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "10px 12px",
          borderRadius: 10,
          background: "rgba(139,92,246,0.06)",
          border: "1px solid var(--border-soft)",
        }}
      >
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: 999,
            background: "linear-gradient(135deg,#EC4899,#8B5CF6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 700,
            fontSize: 12,
            color: "#fff",
          }}
        >
          {user?.initials || "EK"}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600 }}>{user?.name || "Ekrem K."}</div>
          <div style={{ fontSize: 10.5, color: "var(--text-tertiary)", display: "flex", alignItems: "center", gap: 5 }}>
            <span
              className="chip-dot"
              style={{ width: 6, height: 6, background: "var(--neon-mint)", boxShadow: "0 0 6px var(--neon-mint)" }}
            />
            Pro · 4,823 / 5,000 token
          </div>
        </div>
        <button className="btn btn-soft btn-xs" onClick={onLogout} title="Çıkış">
          <Icon name="logout" size={13} />
        </button>
      </div>
    </div>
  </aside>
);

/* ─── TopBar ──────────────────────────────────────────────────── */
export interface TopBarProps {
  title: string;
  subtitle?: string;
  breadcrumb?: string[];
  actions?: ReactNode;
}

const TOP_BAR_NOTIFICATIONS = [
  { id: "n1", title: "Judge skoru düştü", desc: "refund_assistant_v7 → 3.8/5", time: "2dk önce", tone: "amber" as const },
  { id: "n2", title: "A/B turnuvası tamamlandı", desc: "variant A %58 kazanım ile öne çıktı", time: "12dk önce", tone: "mint" as const },
  { id: "n3", title: "Yeni framework yayınlandı", desc: "Tree-of-Thoughts v2 yüklendi", time: "1s önce", tone: "violet" as const },
];

export const TopBar: React.FC<TopBarProps> = ({ title, subtitle, breadcrumb, actions }) => {
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [notifOpen, setNotifOpen] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen((v) => !v);
      } else if (e.key === "Escape") {
        setSearchOpen(false);
        setNotifOpen(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
  <header
    style={{
      display: "flex",
      alignItems: "center",
      gap: 16,
      padding: "16px 28px",
      borderBottom: "1px solid var(--border-soft)",
      background: "rgba(5,6,13,0.5)",
      backdropFilter: "blur(20px)",
      WebkitBackdropFilter: "blur(20px)",
      minHeight: 72,
      position: "relative",
      zIndex: 4,
    }}
  >
    <div style={{ flex: 1, minWidth: 0 }}>
      {breadcrumb && breadcrumb.length > 0 && (
        <div
          className="font-mono"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontSize: 11,
            color: "var(--text-tertiary)",
            marginBottom: 4,
            letterSpacing: "0.1em",
          }}
        >
          {breadcrumb.map((b, i) => (
            <React.Fragment key={`${b}-${i}`}>
              <span style={{ color: i === breadcrumb.length - 1 ? "var(--neon-cyan)" : "var(--text-tertiary)" }}>{b}</span>
              {i < breadcrumb.length - 1 && <Icon name="chevron_right" size={11} />}
            </React.Fragment>
          ))}
        </div>
      )}
      <h1 style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-0.015em" }}>{title}</h1>
      {subtitle && <div style={{ fontSize: 12.5, color: "var(--text-tertiary)", marginTop: 3 }}>{subtitle}</div>}
    </div>
    <div style={{ display: "flex", alignItems: "center", gap: 10, position: "relative" }}>
      <button
        className="btn btn-soft btn-sm"
        title="Arama (⌘K)"
        onClick={() => setSearchOpen((v) => !v)}
      >
        <Icon name="search" size={13} />
        <span className="font-mono" style={{ fontSize: 11, color: "var(--text-tertiary)" }}>⌘K</span>
      </button>
      <button
        className="btn btn-soft btn-sm"
        title="Bildirimler"
        style={{ position: "relative", padding: 8 }}
        onClick={() => setNotifOpen((v) => !v)}
      >
        <Icon name="bell" size={14} />
        <span
          style={{
            position: "absolute",
            top: 5,
            right: 5,
            width: 6,
            height: 6,
            borderRadius: 999,
            background: "var(--neon-mint)",
            boxShadow: "0 0 6px var(--neon-mint)",
          }}
        />
      </button>
      {actions}
      {searchOpen && (
        <div
          className="glass-strong panel-top-glow fade-up"
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            right: 0,
            width: 360,
            padding: 12,
            zIndex: 10001,
            boxShadow: "var(--shadow-panel)",
          }}
        >
          <div style={{ position: "relative" }}>
            <Icon
              name="search"
              size={14}
              style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-tertiary)" }}
            />
            <input
              className="input"
              style={{ paddingLeft: 36 }}
              placeholder="Prompt, framework veya komut ara…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus
            />
          </div>
          <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginTop: 8 }}>
            {searchQuery
              ? `"${searchQuery}" için sonuçlar workspace genelinde aranıyor...`
              : "Hızlı arama. ESC ile kapat."}
          </div>
        </div>
      )}
      {notifOpen && (
        <div
          className="glass-strong panel-top-glow fade-up"
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            right: 0,
            width: 320,
            padding: 12,
            zIndex: 10001,
            boxShadow: "var(--shadow-panel)",
          }}
        >
          <div className="nm-row" style={{ marginBottom: 10 }}>
            <Icon name="bell" size={13} />
            <span style={{ fontSize: 12, fontWeight: 600 }}>Bildirimler</span>
            <button
              className="btn btn-soft btn-xs"
              style={{ marginLeft: "auto" }}
              onClick={() => setNotifOpen(false)}
            >
              <Icon name="x" size={10} />
            </button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {TOP_BAR_NOTIFICATIONS.map((n) => (
              <div
                key={n.id}
                style={{
                  padding: 10,
                  borderRadius: 8,
                  border: "1px solid var(--border-soft)",
                  background: "rgba(10,12,24,0.4)",
                }}
              >
                <div className="nm-row" style={{ marginBottom: 4 }}>
                  <Chip tone={n.tone} dot>{n.title}</Chip>
                  <span style={{ marginLeft: "auto", fontSize: 10, color: "var(--text-muted)" }}>{n.time}</span>
                </div>
                <div style={{ fontSize: 11.5, color: "var(--text-secondary)" }}>{n.desc}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  </header>
  );
};

/* ─── Status bar ──────────────────────────────────────────────── */
export const StatusBar: React.FC = () => {
  const [time, setTime] = useState<Date>(new Date());
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <div
      className="font-mono"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 16,
        padding: "6px 20px",
        borderTop: "1px solid var(--border-soft)",
        background: "rgba(5,6,13,0.7)",
        fontSize: 10.5,
        color: "var(--text-tertiary)",
        letterSpacing: "0.05em",
        minHeight: 30,
      }}
    >
      <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span className="chip-dot" style={{ color: "var(--neon-mint)" }} />
        SYSTEM_ONLINE
      </span>
      <span>·</span>
      <span>routing: <span style={{ color: "var(--neon-cyan)" }}>EU-WEST-2</span></span>
      <span>·</span>
      <span>cache: <span style={{ color: "var(--neon-mint)" }}>HIT 84%</span></span>
      <span>·</span>
      <span>judges: <span style={{ color: "var(--text-secondary)" }}>4/4 healthy</span></span>
      <span style={{ flex: 1 }} />
      <span>v3.2.0</span>
      <span>·</span>
      <span>{time.toTimeString().slice(0, 8)} UTC+3</span>
    </div>
  );
};

/* ─── Misc primitives ─────────────────────────────────────────── */
export interface ChipProps {
  tone?: "violet" | "cyan" | "mint" | "pink" | "amber" | "red";
  children: ReactNode;
  dot?: boolean;
  selected?: boolean;
  onClick?: () => void;
}

export const Chip: React.FC<ChipProps> = ({ tone = "violet", children, dot, selected, onClick }) => (
  <span
    className={`chip ${tone === "violet" ? "" : `chip-${tone}`}`.trim()}
    style={{
      cursor: onClick ? "pointer" : "default",
      ...(selected && {
        background: "var(--grad-soft)",
        borderColor: "var(--neon-cyan)",
        color: "#fff",
        boxShadow: "0 0 16px rgba(0,212,255,0.3)",
      }),
    }}
    onClick={onClick}
  >
    {dot && <span className="chip-dot" />}
    {children}
  </span>
);

export const ScoreBar: React.FC<{ value: number; max?: number; gradient?: string }> = ({
  value,
  max = 100,
  gradient,
}) => (
  <div className="score-bar">
    <div
      className="score-fill"
      style={{ width: `${(value / max) * 100}%`, background: gradient || "var(--grad-primary)" }}
    />
  </div>
);

export const KeyHint: React.FC<{ k: string }> = ({ k }) => (
  <kbd
    className="font-mono"
    style={{
      display: "inline-flex",
      alignItems: "center",
      height: 18,
      padding: "0 5px",
      border: "1px solid var(--border-soft)",
      background: "rgba(255,255,255,0.04)",
      borderRadius: 4,
      fontSize: 10,
      color: "var(--text-tertiary)",
    }}
  >
    {k}
  </kbd>
);
