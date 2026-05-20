import { useMemo, useState } from "react";
import { AppSidebar } from "./components/shell/AppSidebar";
import { AppTopBar } from "./components/shell/AppTopBar";
import { PromptLab } from "./components/PromptLab";
import { BentoCard } from "./components/BentoCard";
import { ArrowRight, FlaskConical, LayoutTemplate, Library, Settings, Sparkles, TrendingUp } from "lucide-react";

export type AppPage =
  | "Prompt Lab"
  | "Library"
  | "AI Lab"
  | "Insights"
  | "Şablonlar"
  | "Ayarlar";

const pageMeta: Record<AppPage, {
  icon: typeof Sparkles;
  eyebrow: string;
  title: string;
  description: string;
  primaryAction: string;
}> = {
  "Prompt Lab": {
    icon: Sparkles,
    eyebrow: "CORE",
    title: "Prompt Lab",
    description: "Write, route, generate, and refine prompt briefs in the main workspace.",
    primaryAction: "Open prompt editor",
  },
  Library: {
    icon: Library,
    eyebrow: "KNOWLEDGE",
    title: "Library",
    description: "Browse saved prompts, reusable blocks, and project assets.",
    primaryAction: "Create collection",
  },
  "AI Lab": {
    icon: FlaskConical,
    eyebrow: "LIVE",
    title: "AI Lab",
    description: "Experiment with models, compare outputs, and test prompt variants.",
    primaryAction: "Start experiment",
  },
  Insights: {
    icon: TrendingUp,
    eyebrow: "YENİ",
    title: "Insights",
    description: "Track workspace activity, recent generations, and quality trends.",
    primaryAction: "Refresh metrics",
  },
  Şablonlar: {
    icon: LayoutTemplate,
    eyebrow: "TEMPLATES",
    title: "Şablonlar",
    description: "Pick starter structures for marketing, analysis, personas, and support.",
    primaryAction: "Use selected template",
  },
  Ayarlar: {
    icon: Settings,
    eyebrow: "SYSTEM",
    title: "Ayarlar",
    description: "Adjust workspace defaults, routing behavior, and notification settings.",
    primaryAction: "Save settings",
  },
};

function PlaceholderPage({
  page,
  onOpenPromptLab,
}: {
  page: AppPage;
  onOpenPromptLab: (seed?: string) => void;
}) {
  const meta = pageMeta[page];
  const Icon = meta.icon;
  const cards = useMemo(
    () => [
      { label: "Ready", value: "12", body: "Reusable items available for this workspace." },
      { label: "Updated", value: "Today", body: "The panel is wired and ready for module integration." },
      { label: "Next action", value: meta.primaryAction, body: "Use this action to continue from this page." },
    ],
    [meta.primaryAction],
  );

  return (
    <div className="w-full min-h-screen p-8 bg-[var(--surface-base)]">
      <div className="max-w-[1180px] mx-auto space-y-8">
        <BentoCard variant="spotlight" padding="wide">
          <div className="flex items-start justify-between gap-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[var(--iolite-500)] to-[var(--aurora-500)] flex items-center justify-center">
                <Icon className="w-6 h-6 text-white" />
              </div>
              <div>
                <div className="text-[var(--iolite-300)] text-xs font-semibold tracking-[0.12em] uppercase mb-2">
                  {meta.eyebrow}
                </div>
                <h1 className="font-['Instrument_Serif'] italic text-[var(--text-primary)]" style={{ fontSize: "var(--text-display-lg)", lineHeight: "var(--lh-display-lg)" }}>
                  {meta.title}
                </h1>
                <p className="mt-3 max-w-2xl text-[var(--text-secondary)]" style={{ fontSize: "var(--text-body-lg)" }}>
                  {meta.description}
                </p>
              </div>
            </div>
            <button
              onClick={() => onOpenPromptLab(`${meta.title}: ${meta.description}`)}
              className="h-11 px-4 rounded-lg bg-gradient-to-r from-[var(--iolite-500)] to-[var(--aurora-500)] text-white font-medium flex items-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-transform"
            >
              {meta.primaryAction}
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </BentoCard>

        <div className="grid grid-cols-3 gap-6">
          {cards.map((card) => (
            <BentoCard key={card.label}>
              <div className="text-[var(--text-tertiary)] text-xs font-semibold tracking-[0.12em] uppercase">
                {card.label}
              </div>
              <div className="mt-3 text-[var(--text-primary)] font-semibold" style={{ fontSize: "var(--text-h2)" }}>
                {card.value}
              </div>
              <p className="mt-2 text-[var(--text-secondary)] text-sm">{card.body}</p>
            </BentoCard>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [activePage, setActivePage] = useState<AppPage>("Prompt Lab");
  const [newPromptSignal, setNewPromptSignal] = useState(0);
  const [seedBrief, setSeedBrief] = useState("");

  const openPromptLab = (seed = "") => {
    setSeedBrief(seed);
    setActivePage("Prompt Lab");
    setNewPromptSignal((value) => value + 1);
  };

  return (
    <div className="size-full flex bg-[var(--surface-base)]">
      <AppSidebar activePage={activePage} onPageChange={setActivePage} />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <AppTopBar
          activePage={activePage}
          onPageChange={setActivePage}
          onNewPrompt={() => openPromptLab()}
        />

        <main className="flex-1 overflow-y-auto">
          {activePage === "Prompt Lab" ? (
            <PromptLab resetSignal={newPromptSignal} seedBrief={seedBrief} onOpenPage={setActivePage} />
          ) : (
            <PlaceholderPage page={activePage} onOpenPromptLab={openPromptLab} />
          )}
        </main>
      </div>
    </div>
  );
}
