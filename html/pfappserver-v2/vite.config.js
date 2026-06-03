import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

// The app is reverse-proxied under /admin/v2/. Setting `base` here ensures
// asset URLs in the built index.html and Vue Router history both line up.
export default defineConfig({
  base: '/admin/v2/',
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 8082,
    strictPort: true,
    // Listen on all interfaces so the dev server is reachable by hostname/IP
    // (e.g. the `pfdev` box from another machine). Vite 5.4.12+ adds strict
    // Host-header validation (CVE-2025-30208); the symptom of a rejected
    // host is a `blocked:origin` entry in Chrome's network panel. Setting
    // `allowedHosts: true` disables that check — fine on a trusted dev
    // network. Tighten to a list of expected hostnames for shared envs.
    host: true,
    allowedHosts: true,
    proxy: {
      // Forward API + Netdata calls to the existing pfappserver during dev.
      // Override host with VITE_API_HOST if running against a remote box.
      '/api': {
        target: process.env.VITE_API_HOST || 'https://localhost:1443',
        changeOrigin: true,
        secure: false,
      },
      '/netdata': {
        target: process.env.VITE_API_HOST || 'https://localhost:1443',
        changeOrigin: true,
        secure: false,
      },
    },
  },
})
