import path from 'path';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
let appVersion = '3.2.0';
try {
  const pkg = JSON.parse(readFileSync(path.join(__dirname, 'package.json'), 'utf-8'));
  if (pkg.version) appVersion = pkg.version;
} catch {
  // fallback above
}

// Sadece Proxy ve non-sensitive keyler kalmali
export default defineConfig(() => {
  const apiTarget = process.env.VITE_API_URL || 'http://localhost:4000';
  const proxyErrorHandler = (err: Error, _req: unknown, res: { writeHead: (a: number, b: Record<string, string>) => void; end: (s: string) => void; headersSent: boolean }) => {
    const msg = (err && err.message) || '';
    if (msg.includes('ECONNREFUSED') || msg.includes('connect')) {
      console.error('\n⚠️  [PROXY] Backend erisilemiyor (ECONNREFUSED). API\'yi baslatin: npm run api  veya  npm run dev:all\n');
    }
    if (!res.headersSent) {
      res.writeHead(502, { 'Content-Type': 'text/plain' });
      res.end('Bad Gateway: Backend unreachable. Run npm run api or npm run dev:all');
    }
  };
  const proxy: Record<string, any> = {};
  proxy['/api/v1'] = {
    target: apiTarget,
    changeOrigin: true,
    rewrite: (path: string) => path.replace(/^\/api/, ''),
    configure: (proxy: any) => proxy.on('error', proxyErrorHandler),
  };
  proxy['/v1'] = {
    target: apiTarget,
    changeOrigin: true,
    configure: (proxy: any) => proxy.on('error', proxyErrorHandler),
  };
  return {
    define: {
      __APP_VERSION__: JSON.stringify(appVersion),
    },
    server: {
      port: 3000,
      strictPort: false,
      host: true,
      open: true,
      proxy: Object.keys(proxy).length ? proxy : undefined,
      watch: {
        ignored: [
          '**/.archive-*/**',
          '**/node_modules/**',
          '**/dist/**',
          '**/.git/**',
          '**/Qwen-Agent-main/**',
          '**/.venv-qwen-agent/**',
        ],
      },
      hmr: {
        protocol: 'ws',
      },
    },
    preview: {
      host: '0.0.0.0',
      port: 3100,
      allowedHosts: ['srv1327766.hstgr.cloud', 'localhost', '127.0.0.1'],
      proxy: {
        '/api/v1': {
          target: process.env.VITE_API_URL || 'http://localhost:4100',
          changeOrigin: true,
          rewrite: (path: string) => path.replace(/^\/api/, ''),
        },
        '/v1': {
          target: process.env.VITE_API_URL || 'http://localhost:4100',
          changeOrigin: true,
        },
      },
    },
    plugins: [
      react({
        babel: {
          plugins: [
            ['@babel/plugin-transform-react-jsx', { runtime: 'automatic' }]
          ]
        }
      })
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
        '@shared': path.resolve(__dirname, '../shared'),
      }
    },
    build: {
      target: 'es2022',
      cssMinify: true,
      sourcemap: false,
      chunkSizeWarningLimit: 1000,
      rollupOptions: {
        output: {
          manualChunks(id: string) {
            if (!id.includes('node_modules')) return undefined;
            if (id.includes('react-dom') || id.includes('react/')) return 'vendor-react';
            if (id.includes('@mui')) return 'vendor-mui';
            if (id.includes('@radix-ui') || id.includes('cmdk') || id.includes('vaul')) return 'vendor-ui';
            if (id.includes('recharts')) return 'vendor-charts';
            if (id.includes('lucide-react')) return 'vendor-icons';
            if (id.includes('reactflow') || id.includes('elkjs')) return 'vendor-flow';
            if (id.includes('framer-motion')) return 'vendor-motion';
            if (id.includes('@monaco-editor') || id.includes('monaco-editor')) return 'vendor-editor';
            return undefined;
          },
        },
      },
    },
    optimizeDeps: {
      include: ['react', 'react-dom', 'react-dom/client', 'react-markdown'],
      force: true, // Eski cache 504 hatasini onlemek for her baslangicta yeniden on paketle
    },
    test: {
      globals: true,
      environment: 'node',
      include: ['tests/**/*.test.ts', '**/*.test.ts'],
      exclude: [
        '**/._*',
        '**/node_modules/**',
        '**/.archive-data/**',
        '**/.archive-dist/**',
        '**/.archive-projects/**',
        '**/.archive-zips/**',
      ],
    },
  };
});
