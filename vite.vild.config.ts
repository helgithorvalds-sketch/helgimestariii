import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'path';
import fs from 'fs';

/**
 * Standalone build of the VILD module (for Capacitor and for vild.is).
 *
 *   npx vite build --config vite.vild.config.ts        → dist-vild/
 *   npx vite --config vite.vild.config.ts --port 8090  → dev server at /
 *
 * vild-app.html is the entry (not vild.html: the main dev server would serve that file at /vild); after the build it is renamed to index.html so
 * Capacitor and static hosts find it.
 */
export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    {
      name: 'vild-rename-entry',
      closeBundle() {
        const out = path.resolve(__dirname, 'dist-vild');
        const from = path.join(out, 'vild-app.html');
        if (fs.existsSync(from)) fs.renameSync(from, path.join(out, 'index.html'));
      },
    },
  ],
  define: {
    'import.meta.env.VITE_VILD_BASE': JSON.stringify(''),
  },
  resolve: { alias: { '@': path.resolve(__dirname, './src') } },
  server: { host: '127.0.0.1', port: 8090, open: '/vild-app.html' },
  appType: 'spa',
  build: {
    outDir: 'dist-vild',
    emptyOutDir: true,
    sourcemap: mode !== 'production',
    rollupOptions: { input: path.resolve(__dirname, 'vild-app.html') },
  },
}));
