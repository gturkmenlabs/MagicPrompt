/**
 * Monaco Monarch tokenizer for the NeoMagic Prompt DSL.
 *
 * The DSL is a hybrid of YAML frontmatter + section markers (`# @meta`,
 * `# @intent`, `# @style`, `# @examples`, `# @evaluation`) plus inline
 * variables (`{{name}}`) and guard blocks (uppercase identifiers under
 * `guards:`). We give each construct its own token class so the theme
 * (see `monacoTheme.ts`) can colour them with project tokens.
 *
 * Registration is idempotent — calling `registerPromptLanguage()` multiple
 * times is safe; subsequent calls are no-ops.
 */

import type * as Monaco from 'monaco-editor';

export const PROMPT_LANGUAGE_ID = 'neomagic-prompt';

const SECTION_NAMES = [
  'meta',
  'intent',
  'style',
  'examples',
  'evaluation',
  'guards',
  'output',
];

let registered = false;

export function registerPromptLanguage(monaco: typeof Monaco): void {
  if (registered) return;

  const langs = monaco.languages.getLanguages();
  if (!langs.some((l) => l.id === PROMPT_LANGUAGE_ID)) {
    monaco.languages.register({
      id: PROMPT_LANGUAGE_ID,
      extensions: ['.prompt'],
      aliases: ['NeoMagic Prompt', 'prompt'],
    });
  }

  monaco.languages.setLanguageConfiguration(PROMPT_LANGUAGE_ID, {
    comments: { lineComment: '#' },
    brackets: [
      ['{', '}'],
      ['[', ']'],
    ],
    autoClosingPairs: [
      { open: '{{', close: '}}' },
      { open: '{', close: '}' },
      { open: '[', close: ']' },
      { open: '"', close: '"' },
      { open: "'", close: "'" },
    ],
    surroundingPairs: [
      { open: '{{', close: '}}' },
      { open: '{', close: '}' },
      { open: '[', close: ']' },
      { open: '"', close: '"' },
      { open: "'", close: "'" },
    ],
    onEnterRules: [
      {
        beforeText: /^\s*-\s.+$/,
        action: { indentAction: monaco.languages.IndentAction.None, appendText: '- ' },
      },
    ],
  });

  monaco.languages.setMonarchTokensProvider(PROMPT_LANGUAGE_ID, {
    defaultToken: '',
    tokenPostfix: '.prompt',
    sections: SECTION_NAMES,

    // YAML-ish; we keep it intentionally permissive — the DSL parser is the
    // authority. Monaco only needs enough structure to colour tokens.
    tokenizer: {
      root: [
        // Section markers: `# @intent`, `# @meta`, etc.
        [
          /^#\s*@([A-Za-z_][\w-]*)\s*$/,
          {
            cases: {
              '$1@sections': { token: 'metatag.section' },
              '@default': 'comment.section',
            },
          },
        ],

        // Plain line comments
        [/^\s*#.*$/, 'comment'],

        // Frontmatter / YAML key — `name: value`
        [/^[ \t]*([A-Za-z_][\w-]*)(\s*:)(\s*)/, ['key.identifier', 'delimiter', 'white']],

        // Inline variables `{{foo}}`
        [/\{\{/, { token: 'variable.bracket', next: '@variable' }],

        // Guard identifiers (UPPER_SNAKE) appearing as list items
        [/^[ \t]*-\s+([A-Z][A-Z0-9_]+)\b/, ['', 'keyword.guard']],

        // Strings
        [/"([^"\\]|\\.)*$/, 'string.invalid'],
        [/"/, { token: 'string.quote', next: '@dqstring' }],
        [/'([^'\\]|\\.)*$/, 'string.invalid'],
        [/'/, { token: 'string.quote', next: '@sqstring' }],

        // Numbers
        [/\b\d+(\.\d+)?\b/, 'number'],

        // Booleans / null
        [/\b(true|false|null|yes|no)\b/, 'constant.language'],

        // YAML list dash
        [/^[ \t]*-\s/, 'delimiter.list'],

        // Whitespace
        [/[ \t\r\n]+/, 'white'],
      ],

      variable: [
        [/[^}]+/, 'variable.name'],
        [/\}\}/, { token: 'variable.bracket', next: '@pop' }],
      ],

      dqstring: [
        [/[^\\"]+/, 'string'],
        [/\\./, 'string.escape'],
        [/"/, { token: 'string.quote', next: '@pop' }],
      ],

      sqstring: [
        [/[^\\']+/, 'string'],
        [/\\./, 'string.escape'],
        [/'/, { token: 'string.quote', next: '@pop' }],
      ],
    },
  } as Monaco.languages.IMonarchLanguage & { sections: string[] });

  registered = true;
}
