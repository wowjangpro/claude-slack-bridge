import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import electron from 'vite-plugin-electron';
import path from 'path';

export default defineConfig({
  plugins: [
    react(),
    electron([
      {
        entry: 'electron-src/main/index.ts',
        vite: {
          build: {
            outDir: 'dist-electron/main',
            rollupOptions: {
              external: ['bufferutil', 'utf-8-validate'],
            },
            minify: false,
          },
          logLevel: 'silent',
          clearScreen: false,
        },
      },
      {
        entry: 'electron-src/preload/index.ts',
        onstart(options) {
          options.reload();
        },
        vite: {
          build: {
            outDir: 'dist-electron/preload',
            minify: false,
          },
          logLevel: 'silent',
          clearScreen: false,
        },
      },
    ]),
  ],
  base: './',
  build: {
    outDir: 'dist-vite',
    emptyOutDir: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './electron-src/renderer'),
      '@shared': path.resolve(__dirname, './electron-src/shared'),
    },
  },
  server: {
    port: 5173,
  },
  clearScreen: false,
  logLevel: 'warn',
});
