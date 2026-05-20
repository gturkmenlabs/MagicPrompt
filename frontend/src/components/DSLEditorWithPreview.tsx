/**
 * DSLEditorWithPreview — Sol: DSL / Monaco Editor, Sag: anlik rendered master prompt + metrikler.
 * Ileride API ile compileDSL baglanabilir; su an client-side onizleme ve tahmini metrikler.
 */

import { useState, useEffect, useCallback } from 'react';
import { PromptMonaco } from './editor/PromptMonaco';
import { GlassCard } from './ui/GlassCard';
import { GlowProgress } from './ui/GlowProgress';

interface DSLEditorWithPreviewProps {
  /** Baslangic icerigi veya .prompt file yolu (API baglandiginda kullanilir). */
  initialFile?: string;
  /** Baslangic DSL kodu. */
  initialCode?: string;
  /** Ust bar'da progress gostermek for 0-100 (opsiyonel). */
  progressValue?: number;
}

interface PreviewMetrics {
  tokens: number;
  judge: number;
  budget: string;
}

/** Tahmini token (yaklasik 4 karakter = 1 token). */
function estimateTokens(text: string): number {
  return Math.ceil((text || '').length / 4);
}

export function DSLEditorWithPreview({
  initialFile = '',
  initialCode = '// .prompt dosyasi burada\n# intent\nYour intent here\n\n# domain\nauto\n\n# framework\nauto',
  progressValue,
}: DSLEditorWithPreviewProps) {
  const [code, setCode] = useState(initialCode);
  const [preview, setPreview] = useState('');
  const [metrics, setMetrics] = useState<PreviewMetrics>({ tokens: 0, judge: 0, budget: '≈ $0.00' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(true);
      setError(null);
      try {
        // Client-side onizleme: su an DSL metnini aynen gosteriyoruz.
        // Tam derleme for ileride POST /api/v1/compile-dsl gibi bir endpoint kullanilabilir.
        setPreview(code || '');
        const tokens = estimateTokens(code);
        const judge = Math.min(100, Math.round(70 + Math.random() * 20)); // placeholder
        const cost = (tokens / 1000) * 0.02;
        setMetrics({
          tokens,
          judge,
          budget: `≈ $${cost.toFixed(4)}`,
        });
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Derleme hatasi');
        setPreview('');
      } finally {
        setLoading(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [code, initialFile]);

  const handleEditorChange = useCallback((value: string) => {
    setCode(value);
  }, []);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[80vh]">
      {/* Sol: Editor */}
      <GlassCard neon="cyan" padding="none" className="overflow-hidden flex flex-col min-h-0">
        {progressValue !== undefined && (
          <div className="px-4 py-2 border-b border-white/10">
            <GlowProgress value={progressValue} variant="cyan" height={4} showLabel />
          </div>
        )}
        <div className="flex-1 min-h-0">
          <PromptMonaco
            value={code}
            onChange={handleEditorChange}
            minHeight={0}
            style={{ height: '100%', borderRadius: 0, border: 'none', background: 'transparent' }}
          />
        </div>
      </GlassCard>

      {/* Sag: Preview + Metrics */}
      <GlassCard neon="purple" padding="none" className="flex flex-col min-h-0 p-6">
        <div className="flex justify-between items-center mb-4 flex-shrink-0">
          <h3 className="neon-text text-xl font-bold">Live Master Prompt</h3>
          <div className="flex gap-4 text-sm font-mono">
            <span>
              Tokens: <strong className="text-neon-cyan">{metrics.tokens}</strong>
            </span>
            <span>
              Judge: <strong className={metrics.judge > 85 ? 'text-green-400' : 'text-amber-400'}>{metrics.judge}/100</strong>
            </span>
            <span>
              Budget: <strong className="text-neon-purple">{metrics.budget}</strong>
            </span>
          </div>
        </div>
        <pre className="flex-1 overflow-auto bg-black/40 p-4 rounded-xl neon-text whitespace-pre-wrap text-sm min-h-0 font-mono">
          {error ? `Error: ${error}` : loading ? 'Derleniyor...' : preview || 'Output burada gorunecek.'}
        </pre>
      </GlassCard>
    </div>
  );
}

export default DSLEditorWithPreview;
