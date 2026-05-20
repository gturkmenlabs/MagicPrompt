import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  resolve: {
    alias: [
      // Root project: `@/foo` → `<root>/foo`  (mirrors tsconfig paths)
      { find: /^@\/(?!types\/framework|types\/routing)/, replacement: path.resolve(__dirname, './') + '/' },
      // routing-service internal: `@/types/framework` and `@/types/routing`
      { find: '@/types', replacement: path.resolve(__dirname, 'routing-service/src/domain/routing/types') },
    ],
  },
  test: {
    globals: false,
    environment: 'node',
    include: ['**/*.spec.ts', '**/*.test.ts'],
    exclude: [
      // Vitest defaults (must be explicit when overriding)
      '**/node_modules/**',
      '**/dist/**',
      '**/.{idea,git,cache,output,temp}/**',
      // Project-specific
      'archive/**',
      'Qwen-Agent-main/**',
      'playwright-report/**',
      'test-results/**',
      // Playwright e2e — run via `npm run test:e2e`, not vitest
      'e2e/**',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'dist/', 'tests/', '**/*.spec.ts', '**/*.test.ts'],
    },
  },
});
