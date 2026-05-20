import React, { useEffect, useMemo, useState } from "react";
import { Icon, Chip } from "../components";
import { api, useAsync, relativeTime, type BackendPrompt, type SemanticSearchHit } from "../api";

type ChipTone = "violet" | "cyan" | "mint" | "red" | "amber" | "pink";

const COLLECTION_TONES: ChipTone[] = ["violet", "cyan", "mint", "red", "amber", "pink"];

function useDebounced<T>(value: T, delay = 350): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

function judgeOf(p: BackendPrompt): number | undefined {
  const j = p.meta?.judge ?? p.meta?.score;
  return typeof j === "number" ? j : undefined;
}

function frameworkLabel(p: BackendPrompt): string {
  return p.meta?.framework ?? "—";
}

function domainLabel(p: BackendPrompt): string {
  return p.meta?.domain ?? p.meta?.domainId ?? p.meta?.category ?? "—";
}

function titleOf(p: BackendPrompt): string {
  if (p.name && p.name.trim().length > 0) return p.name;
  const text = p.masterPrompt || "";
  const firstLine = text.split("\n").map((s) => s.trim()).find(Boolean) ?? "";
  return firstLine.slice(0, 120) || `Prompt ${p.id.slice(0, 8)}`;
}

export const LibraryScreen: React.FC = () => {
  const [view, setView] = useState<"grid" | "list">("grid");
  const [query, setQuery] = useState("");
  const [semantic, setSemantic] = useState(false);
  const [activeCollection, setActiveCollection] = useState<string | undefined>();
  const debounced = useDebounced(query, 400);

  // Always load the full list (paginated) for collection counts + non-semantic filter
  const promptsState = useAsync(() => api.listPrompts({ page: 1, limit: 100 }), []);
  const all = promptsState.data?.prompts ?? [];

  // Semantic results (only when toggle on + query exists)
  const semanticState = useAsync<{ results: SemanticSearchHit[] }>(
    () => (semantic && debounced.trim().length > 1
      ? api.semanticSearch(debounced.trim(), 30)
      : Promise.resolve({ results: [] })),
    [semantic, debounced]
  );

  const collections = useMemo(() => {
    const byCat = new Map<string, number>();
    for (const p of all) {
      const cat = p.meta?.category ?? p.meta?.domain ?? p.meta?.domainId ?? "Diğer";
      byCat.set(cat, (byCat.get(cat) ?? 0) + 1);
    }
    return Array.from(byCat.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([name, count], i) => ({ id: name, name, count, color: COLLECTION_TONES[i % COLLECTION_TONES.length] }));
  }, [all]);

  const filtered = useMemo(() => {
    if (semantic && debounced.trim().length > 1) {
      // Map semantic hits to a normalized shape (using BackendPrompt-ish)
      const hits = semanticState.data?.results ?? [];
      return hits.map<BackendPrompt & { _score?: number }>((h) => ({
        id: h.id,
        version: "—",
        name: h.metadata?.name ?? h.name,
        masterPrompt: h.text,
        meta: {
          category: h.metadata?.category,
          tags: h.metadata?.tags,
          framework: undefined,
          domain: h.metadata?.category,
        },
        _score: h.score,
      }));
    }
    const q = debounced.toLowerCase();
    return all.filter((p) => {
      if (activeCollection) {
        const cat = p.meta?.category ?? p.meta?.domain ?? p.meta?.domainId ?? "Diğer";
        if (cat !== activeCollection) return false;
      }
      if (!q) return true;
      return (
        titleOf(p).toLowerCase().includes(q) ||
        p.masterPrompt.toLowerCase().includes(q) ||
        (p.meta?.tags ?? []).some((t) => t.toLowerCase().includes(q))
      );
    });
  }, [semantic, semanticState.data, debounced, all, activeCollection]);

  const isLoading = promptsState.loading || (semantic && semanticState.loading);
  const error = promptsState.error || (semantic ? semanticState.error : undefined);

  return (
    <div className="fade-up" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div className="glass-strong panel-top-glow" style={{ padding: 18 }}>
        <div className="nm-row" style={{ gap: 12 }}>
          <div style={{ position: "relative", flex: 1, maxWidth: 480 }}>
            <Icon name="search" size={14} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "var(--text-tertiary)" }} />
            <input
              className="input"
              style={{ paddingLeft: 38 }}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={semantic ? "Anlamsal arama: ne istediğini yaz..." : "Prompt veya etiket ara..."}
            />
          </div>
          <button
            className="btn btn-soft btn-sm"
            onClick={() => setSemantic((v) => !v)}
            style={{
              background: semantic ? "var(--grad-primary)" : undefined,
              color: semantic ? "#0a0a14" : undefined,
            }}
            title="Vektör tabanlı anlamsal arama"
          >
            <Icon name="sparkles" size={12} /> Semantik {semantic ? "açık" : "kapalı"}
          </button>
          {activeCollection && (
            <button className="btn btn-soft btn-sm" onClick={() => setActiveCollection(undefined)}>
              <Icon name="x" size={12} /> {activeCollection}
            </button>
          )}
          <div style={{ marginLeft: "auto", display: "inline-flex", border: "1px solid var(--border-soft)", borderRadius: 8, padding: 3 }}>
            {(["grid", "list"] as const).map((v) => (
              <button
                key={v}
                className="btn btn-sm"
                onClick={() => setView(v)}
                style={{
                  background: view === v ? "var(--grad-primary)" : "transparent",
                  color: view === v ? "#0a0a14" : "var(--text-tertiary)",
                  padding: "4px 10px",
                }}
              >
                <Icon name={v === "grid" ? "grid" : "library"} size={12} />
              </button>
            ))}
          </div>
        </div>
      </div>

      {error && (
        <div className="glass" style={{ padding: 14, borderLeft: "3px solid var(--neon-red)" }}>
          <div style={{ fontSize: 12, color: "var(--neon-red)" }}>Yüklenemedi: {error}</div>
        </div>
      )}

      {collections.length > 0 && (
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10, color: "var(--text-secondary)" }}>Koleksiyonlar</div>
          <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.min(6, collections.length)}, 1fr)`, gap: 12 }}>
            {collections.map((c) => (
              <div
                key={c.id}
                className="glass"
                style={{
                  padding: 14,
                  cursor: "pointer",
                  transition: "all 180ms",
                  borderColor: activeCollection === c.id ? "var(--neon-cyan)" : undefined,
                }}
                onClick={() => setActiveCollection((cur) => (cur === c.id ? undefined : c.id))}
              >
                <Chip tone={c.color} dot>{c.name}</Chip>
                <div className="grad-text" style={{ fontSize: 28, fontWeight: 700, marginTop: 10 }}>{c.count}</div>
                <div style={{ fontSize: 11, color: "var(--text-tertiary)" }}>prompt</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <div className="nm-row" style={{ justifyContent: "space-between", marginBottom: 10 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-secondary)" }}>
            {semantic && debounced.trim().length > 1 ? "Anlamsal sonuçlar" : "Tüm promptlar"}
          </div>
          <span className="font-mono" style={{ fontSize: 11, color: "var(--text-tertiary)" }}>
            {isLoading ? "yükleniyor..." : `${filtered.length} sonuç`}
            {promptsState.data && !semantic && ` / ${promptsState.data.total} toplam`}
          </span>
        </div>

        {isLoading && filtered.length === 0 ? (
          <div className="glass" style={{ padding: 40, textAlign: "center", color: "var(--text-tertiary)" }}>
            <Icon name="loader" size={20} /> Yükleniyor...
          </div>
        ) : filtered.length === 0 ? (
          <div className="glass" style={{ padding: 40, textAlign: "center", color: "var(--text-tertiary)" }}>
            {query || activeCollection ? "Eşleşen prompt bulunamadı." : "Henüz prompt yok."}
          </div>
        ) : view === "grid" ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
            {filtered.map((p) => {
              const j = judgeOf(p);
              const score = (p as BackendPrompt & { _score?: number })._score;
              return (
                <div key={p.id} className="glass panel-top-glow" style={{ padding: 16, cursor: "pointer" }}>
                  <div className="nm-row" style={{ marginBottom: 8, gap: 6 }}>
                    <Chip tone="violet">{frameworkLabel(p)}</Chip>
                    <Chip tone="cyan">{domainLabel(p)}</Chip>
                  </div>
                  <div style={{ fontSize: 13.5, fontWeight: 500, lineHeight: 1.5, minHeight: 56 }}>
                    {titleOf(p)}
                  </div>
                  <div className="divider" style={{ margin: "12px 0" }} />
                  <div className="nm-row" style={{ fontSize: 11, color: "var(--text-tertiary)" }}>
                    <span className="font-mono">{p.id.slice(0, 8)}</span>
                    {typeof j === "number" && (
                      <span style={{ marginLeft: "auto", color: "var(--neon-cyan)" }}>★ {j.toFixed(2)}</span>
                    )}
                    {typeof score === "number" && (
                      <span style={{ marginLeft: "auto", color: "var(--neon-mint)" }}>~ {score.toFixed(3)}</span>
                    )}
                    <span style={{ marginLeft: 10 }}>{relativeTime(p.updatedAt ?? p.createdAt)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="glass" style={{ padding: 0 }}>
            {filtered.map((p, i) => {
              const j = judgeOf(p);
              const score = (p as BackendPrompt & { _score?: number })._score;
              return (
                <div key={p.id} style={{
                  display: "grid",
                  gridTemplateColumns: "100px 1fr auto auto 70px 100px",
                  gap: 14, padding: "12px 18px",
                  alignItems: "center",
                  borderBottom: i < filtered.length - 1 ? "1px solid var(--border-soft)" : undefined,
                  cursor: "pointer",
                }}>
                  <span className="font-mono" style={{ fontSize: 11, color: "var(--text-muted)" }}>
                    {p.id.slice(0, 8)}
                  </span>
                  <span style={{ fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {titleOf(p)}
                  </span>
                  <Chip tone="violet">{frameworkLabel(p)}</Chip>
                  <Chip tone="cyan">{domainLabel(p)}</Chip>
                  <span className="grad-text" style={{ fontWeight: 700 }}>
                    {typeof j === "number" ? j.toFixed(2) : typeof score === "number" ? score.toFixed(2) : "—"}
                  </span>
                  <span style={{ fontSize: 11, color: "var(--text-tertiary)", textAlign: "right" }}>
                    {relativeTime(p.updatedAt ?? p.createdAt)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
