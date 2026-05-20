/**
 * PromptMonaco — canonical Monaco wrapper for the NeoMagic workspace.
 *
 * This component is the single entry point for prompt editing. It:
 *  - lazy-loads `@monaco-editor/react` (already in the deps) via dynamic
 *    import so initial bundle size is unaffected.
 *  - registers the prompt DSL language + themes on mount.
 *  - exposes a callback-based API for inline completions (`onRegisterInlineCompletions`)
 *    used later by the Copilot ghost-text provider (B2).
 *  - accepts an optional `yText` handle so the F3 Yjs binding can attach
 *    a CRDT without changing this file again.
 *
 * Heavy editor logic lives in services / providers — this component
 * stays focused on mount lifecycle, theme wiring and prop translation.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type { ComponentType, CSSProperties, ReactElement } from 'react';
import { useTheme } from '../../hooks/useTheme';
import {
  PROMPT_LANGUAGE_ID,
  registerPromptLanguage,
} from './promptLanguage';
import { registerPromptThemes, resolvePromptTheme } from './monacoTheme';

// Monaco namespace is loaded dynamically; we keep the types only for the
// public-facing prop signatures.
type MonacoNamespace = typeof import('monaco-editor');
type MonacoEditor = import('monaco-editor').editor.IStandaloneCodeEditor;

export interface PromptMonacoProps {
  /** Current document content. Ignored if `yText` is provided (CRDT-driven). */
  value: string;
  /** Fires on every edit when `yText` is absent. */
  onChange?: (next: string) => void;
  /** Fires whenever the cursor or selection moves. */
  onCursor?: (line: number, column: number) => void;
  /** Read-only mode (review/preview surfaces). */
  readOnly?: boolean;
  /** Min height in px. Defaults to 240. */
  minHeight?: number;
  /** Optional className for the host div. */
  className?: string;
  /** Optional inline style on the host div. */
  style?: CSSProperties;
  /**
   * Hook called once Monaco and the editor are ready. Use this from
   * higher-level components to register inline completion providers,
   * decorations, hover providers, etc.
   */
  onEditorReady?: (editor: MonacoEditor, monaco: MonacoNamespace) => void;
  /**
   * Optional CRDT handle. When supplied, the F3 collab layer is expected
   * to bind it to this editor's model. The wrapper itself does not import
   * Yjs to avoid pulling it into bundles that don't need collaboration.
   */
  yText?: unknown;
  /** Language id override (defaults to the NeoMagic prompt DSL). */
  language?: string;
  /** Optional placeholder shown when value is empty. */
  placeholder?: string;
  /** Word-wrap toggle. Default true for prompt text. */
  wordWrap?: boolean;
}

interface MonacoReactModule {
  default: ComponentType<{
    value: string;
    defaultLanguage?: string;
    language?: string;
    theme?: string;
    onChange?: (val: string | undefined) => void;
    onMount?: (editor: MonacoEditor, monaco: MonacoNamespace) => void;
    options?: Record<string, unknown>;
    height?: string | number;
    className?: string;
  }>;
  loader?: { config: (opts: Record<string, unknown>) => void };
}

// Cache the lazy module so re-mounts don't pay the import cost again.
let monacoReactModulePromise: Promise<MonacoReactModule> | null = null;

function loadMonacoReact(): Promise<MonacoReactModule> {
  if (!monacoReactModulePromise) {
    monacoReactModulePromise = import('@monaco-editor/react') as unknown as Promise<MonacoReactModule>;
  }
  return monacoReactModulePromise;
}

/**
 * Resolve the final font stack from the document body so Monaco picks up
 * the same monospace font used elsewhere in the app (`JetBrains Mono`).
 */
function getFontFamily(): string {
  if (typeof window === 'undefined') return 'JetBrains Mono, monospace';
  const style = window.getComputedStyle(document.body);
  const fromBody = style.getPropertyValue('--font-mono')?.trim();
  return fromBody || 'JetBrains Mono, ui-monospace, SFMono-Regular, Menlo, monospace';
}

export function PromptMonaco(props: PromptMonacoProps): ReactElement {
  const {
    value,
    onChange,
    onCursor,
    readOnly = false,
    minHeight = 240,
    className,
    style,
    onEditorReady,
    language = PROMPT_LANGUAGE_ID,
    placeholder,
    wordWrap = true,
  } = props;

  const { theme } = useTheme();
  const editorRef = useRef<MonacoEditor | null>(null);
  const monacoRef = useRef<MonacoNamespace | null>(null);
  const [LazyEditor, setLazyEditor] = useState<MonacoReactModule['default'] | null>(null);

  // Lazy-import the Monaco React bridge on first mount.
  useEffect(() => {
    let cancelled = false;
    loadMonacoReact().then((mod) => {
      if (cancelled) return;
      setLazyEditor(() => mod.default);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Apply theme changes after the editor is mounted.
  useEffect(() => {
    const monaco = monacoRef.current;
    if (!monaco) return;
    monaco.editor.setTheme(resolvePromptTheme(theme));
  }, [theme]);

  const handleMount = useCallback(
    (editor: MonacoEditor, monaco: MonacoNamespace) => {
      editorRef.current = editor;
      monacoRef.current = monaco;

      registerPromptLanguage(monaco);
      registerPromptThemes(monaco);
      monaco.editor.setTheme(resolvePromptTheme(theme));

      if (onCursor) {
        editor.onDidChangeCursorPosition((e) => {
          onCursor(e.position.lineNumber, e.position.column);
        });
      }

      // Placeholder decoration — fades when the model is non-empty.
      if (placeholder) {
        const updatePlaceholder = () => {
          const model = editor.getModel();
          if (!model) return;
          const isEmpty = model.getValueLength() === 0;
          editor.updateOptions({ ariaLabel: isEmpty ? placeholder : 'Prompt editor' });
        };
        updatePlaceholder();
        editor.onDidChangeModelContent(updatePlaceholder);
      }

      onEditorReady?.(editor, monaco);
    },
    [onCursor, onEditorReady, placeholder, theme]
  );

  const handleChange = useCallback(
    (next: string | undefined) => {
      if (!onChange) return;
      onChange(next ?? '');
    },
    [onChange]
  );

  const hostStyle: CSSProperties = {
    minHeight,
    borderRadius: 'var(--radius-md, 10px)',
    overflow: 'hidden',
    background: 'var(--surface-1, #111113)',
    border: '1px solid var(--border-subtle, rgba(250,250,250,0.06))',
    ...style,
  };

  if (!LazyEditor) {
    return (
      <div
        className={className}
        style={hostStyle}
        role="region"
        aria-label="Prompt editor loading"
      >
        <div
          style={{
            padding: 'var(--space-4, 16px)',
            color: 'var(--muted-foreground, #A1A1AA)',
            fontFamily: getFontFamily(),
            fontSize: 13,
          }}
        >
          Loading editor…
        </div>
      </div>
    );
  }

  return (
    <div className={className} style={hostStyle}>
      <LazyEditor
        value={value}
        language={language}
        theme={resolvePromptTheme(theme)}
        onChange={handleChange}
        onMount={handleMount}
        height="100%"
        options={{
          readOnly,
          fontFamily: getFontFamily(),
          fontLigatures: true,
          fontSize: 14,
          lineHeight: 22,
          minimap: { enabled: false },
          padding: { top: 14, bottom: 14 },
          renderLineHighlight: 'line',
          renderWhitespace: 'selection',
          scrollBeyondLastLine: false,
          smoothScrolling: true,
          wordWrap: wordWrap ? 'on' : 'off',
          tabSize: 2,
          // Ghost-text / inline completions plumbing — the actual provider is
          // registered by callers via `onEditorReady` (see ghostText.ts).
          inlineSuggest: { enabled: true, showToolbar: 'onHover' },
          quickSuggestions: { other: true, comments: false, strings: false },
          suggestOnTriggerCharacters: true,
          bracketPairColorization: { enabled: true },
          guides: { indentation: true, bracketPairs: true },
          // Accessibility
          accessibilitySupport: 'auto',
          ariaLabel: placeholder ?? 'Prompt editor',
          // Performance
          automaticLayout: true,
        }}
      />
    </div>
  );
}

export default PromptMonaco;
