/// <reference types="vitest/config" />
import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import mkcert from 'vite-plugin-mkcert';
import { VitePWA } from 'vite-plugin-pwa';
import pkg from './package.json' with { type: 'json' };
import { basePath } from './base-path';

// HTTPS=1 enables a locally-trusted certificate so the service worker works
// when the dev/preview server is opened from an iPad on the LAN.
const useHttps = process.env.HTTPS === '1';

// BASE_PATH lets the app be served from a subpath, e.g. "/RollFor/" on GitHub Pages.
const base = basePath();

export default defineConfig({
  base,
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  plugins: [
    react(),
    tailwindcss(),
    useHttps && mkcert(),
    VitePWA({
      registerType: 'prompt', // never auto-reload mid-session; user confirms updates
      injectRegister: false, // registered from src/pwa/UpdatePrompt.tsx
      pwaAssets: { config: true, overrideManifestIcons: true },
      manifest: {
        name: 'RollFor',
        short_name: 'RollFor',
        description: 'D&D 2024 character sheets and session notes for iPad',
        lang: 'en',
        start_url: base,
        scope: base,
        display: 'standalone',
        orientation: 'any',
        theme_color: '#1c1917',
        background_color: '#1c1917',
      },
      workbox: {
        // manifest.webmanifest is added by the plugin; globbing it too creates a conflicting entry.
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        navigateFallback: 'index.html', // relative to the SW, so it works under any base
        cleanupOutdatedCaches: true,
      },
      devOptions: {
        enabled: false, // test SW behaviour with `npm run build && npm run preview`
      },
    }),
  ],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: {
    host: useHttps ? true : undefined,
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
