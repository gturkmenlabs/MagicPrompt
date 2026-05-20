import { defineConfig } from 'vitest/config';
import path from 'node:path';

// Mirror tsconfig.json paths so vitest can resolve aliases at runtime.
export default defineConfig({
  resolve: {
    alias: [
      { find: '@shared', replacement: path.resolve(__dirname, '../shared') },
      { find: /^@\/services\/(.*)$/, replacement: path.resolve(__dirname, '../shared/services') + '/$1' },
      { find: /^@\/types$/, replacement: path.resolve(__dirname, '../shared/types/index.ts') },
      { find: /^@\/types\/(.*)$/, replacement: path.resolve(__dirname, '../shared/types') + '/$1' },
      { find: /^@\/lib\/(.*)$/, replacement: path.resolve(__dirname, '../shared/lib') + '/$1' },
      { find: /^@\/utils\/(.*)$/, replacement: path.resolve(__dirname, '../shared/utils') + '/$1' },
      { find: /^@\/data$/, replacement: path.resolve(__dirname, '../shared/data') },
      { find: /^@\/data\/(.*)$/, replacement: path.resolve(__dirname, '../shared/data') + '/$1' },
      { find: /^@\/locales\/(.*)$/, replacement: path.resolve(__dirname, '../shared/locales') + '/$1' },
      // Fallback: any remaining `@/` mirrors tsconfig `"@/*": ["./*"]` (backend root)
      { find: /^@\/(.*)$/, replacement: path.resolve(__dirname, './') + '/$1' },
    ],
  },
  test: {
    globals: false,
    environment: 'node',
    include: ['**/*.test.ts', '**/*.spec.ts'],
    exclude: ['**/node_modules/**', '**/dist/**'],
  },
});
