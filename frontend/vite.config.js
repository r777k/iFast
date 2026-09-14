import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg'], // Caches your new icon
      manifest: {
        name: 'FastTracker: Engineer Your Metabolism',
        short_name: 'FastTracker',
        description: 'High-fidelity telemetry and physiological Fast Tracking for advanced metabolic flexibility.',
        theme_color: '#ffffff', // Changes the phone's status bar color
        background_color: '#ffffff', // Splash screen background
        display: 'standalone', // Removes the browser URL bar
        icons: [
          {
            src: '/icon.svg',
            sizes: '192x192 512x512',
            type: 'image/svg+xml',
            purpose: 'any maskable' // Ensures it crops perfectly on Android and iOS
          }
        ]
      }
    })
  ]
});