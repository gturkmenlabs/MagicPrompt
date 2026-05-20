/**
 * Monaco theme definitions that map the NeoMagic design tokens
 * (defined in `frontend/src/styles.css`) onto Monaco's colour API.
 *
 * Two themes are exposed: `neomagic-dark` and `neomagic-light`.
 * Callers should resolve the current theme via the existing `useTheme`
 * hook and pass the corresponding id to `<Editor theme={...} />`.
 *
 * Token classes referenced here mirror those emitted by
 * `promptLanguage.ts` — keep the two files in sync when adding rules.
 */

import type * as Monaco from 'monaco-editor';

export const NEOMAGIC_DARK_THEME = 'neomagic-dark';
export const NEOMAGIC_LIGHT_THEME = 'neomagic-light';

let defined = false;

export function registerPromptThemes(monaco: typeof Monaco): void {
  if (defined) return;

  monaco.editor.defineTheme(NEOMAGIC_DARK_THEME, {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'metatag.section', foreground: 'F59E0B', fontStyle: 'bold' },
      { token: 'comment.section', foreground: 'A1A1AA', fontStyle: 'italic' },
      { token: 'comment', foreground: '52525B', fontStyle: 'italic' },
      { token: 'key.identifier', foreground: 'A5B4FC' },
      { token: 'variable.bracket', foreground: 'F59E0B', fontStyle: 'bold' },
      { token: 'variable.name', foreground: 'F59E0B' },
      { token: 'keyword.guard', foreground: 'F43F5E', fontStyle: 'bold' },
      { token: 'constant.language', foreground: '34D399' },
      { token: 'number', foreground: '60A5FA' },
      { token: 'string', foreground: 'D4D4D8' },
      { token: 'string.quote', foreground: '71717A' },
      { token: 'string.escape', foreground: 'F59E0B' },
      { token: 'string.invalid', foreground: 'F43F5E', fontStyle: 'underline' },
      { token: 'delimiter.list', foreground: '6366F1' },
      { token: 'delimiter', foreground: '71717A' },
    ],
    colors: {
      'editor.background': '#0A0A0B',
      'editor.foreground': '#FAFAFA',
      'editor.lineHighlightBackground': '#18181B',
      'editor.lineHighlightBorder': '#00000000',
      'editorLineNumber.foreground': '#52525B',
      'editorLineNumber.activeForeground': '#A5B4FC',
      'editorCursor.foreground': '#F59E0B',
      'editor.selectionBackground': '#6366F133',
      'editor.inactiveSelectionBackground': '#6366F122',
      'editor.findMatchBackground': '#F59E0B66',
      'editor.findMatchHighlightBackground': '#F59E0B33',
      'editorBracketMatch.background': '#6366F133',
      'editorBracketMatch.border': '#6366F1',
      'editorWidget.background': '#111113',
      'editorWidget.border': 'rgba(250,250,250,0.10)' as unknown as string,
      'editorSuggestWidget.background': '#111113',
      'editorSuggestWidget.border': '#27272A',
      'editorSuggestWidget.selectedBackground': '#27272A',
      'editorSuggestWidget.highlightForeground': '#F59E0B',
      'editorHoverWidget.background': '#111113',
      'editorHoverWidget.border': '#27272A',
      'editorOverviewRuler.border': '#00000000',
      'editorGutter.background': '#0A0A0B',
      'editorIndentGuide.background': '#18181B',
      'editorIndentGuide.activeBackground': '#27272A',
      'editorGhostText.foreground': '#71717A',
      'editorWhitespace.foreground': '#27272A',
      'scrollbarSlider.background': '#27272A88',
      'scrollbarSlider.hoverBackground': '#3F3F46CC',
      'scrollbarSlider.activeBackground': '#52525BCC',
      'editorError.foreground': '#F43F5E',
      'editorWarning.foreground': '#F59E0B',
      'editorInfo.foreground': '#6366F1',
    },
  });

  monaco.editor.defineTheme(NEOMAGIC_LIGHT_THEME, {
    base: 'vs',
    inherit: true,
    rules: [
      { token: 'metatag.section', foreground: 'B45309', fontStyle: 'bold' },
      { token: 'comment.section', foreground: '52525B', fontStyle: 'italic' },
      { token: 'comment', foreground: '71717A', fontStyle: 'italic' },
      { token: 'key.identifier', foreground: '4338CA' },
      { token: 'variable.bracket', foreground: 'B45309', fontStyle: 'bold' },
      { token: 'variable.name', foreground: 'B45309' },
      { token: 'keyword.guard', foreground: 'BE123C', fontStyle: 'bold' },
      { token: 'constant.language', foreground: '047857' },
      { token: 'number', foreground: '1D4ED8' },
      { token: 'string', foreground: '27272A' },
      { token: 'string.quote', foreground: 'A1A1AA' },
      { token: 'string.escape', foreground: 'B45309' },
      { token: 'string.invalid', foreground: 'BE123C', fontStyle: 'underline' },
      { token: 'delimiter.list', foreground: '4338CA' },
      { token: 'delimiter', foreground: 'A1A1AA' },
    ],
    colors: {
      'editor.background': '#FAFAFA',
      'editor.foreground': '#18181B',
      'editor.lineHighlightBackground': '#F4F4F5',
      'editorLineNumber.foreground': '#A1A1AA',
      'editorLineNumber.activeForeground': '#4338CA',
      'editorCursor.foreground': '#B45309',
      'editor.selectionBackground': '#4338CA22',
      'editorGhostText.foreground': '#A1A1AA',
    },
  });

  defined = true;
}

/**
 * Resolve a NeoMagic theme id from the currently-active app theme.
 * The frontend uses `dark` as default; any string other than `light` maps to dark.
 */
export function resolvePromptTheme(appTheme: string | undefined): string {
  return appTheme === 'light' ? NEOMAGIC_LIGHT_THEME : NEOMAGIC_DARK_THEME;
}
