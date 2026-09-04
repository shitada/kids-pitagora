import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  base: '/kids-pitagora/',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  build: {
    target: 'es2022',
    outDir: 'dist',
    rollupOptions: {
      output: {
        manualChunks(id) {
          const normalizedId = id.replace(/\\/g, '/');

          if (normalizedId.includes('/node_modules/three/')) {
            return 'three';
          }

          if (normalizedId.includes('/src/game/scenes/')) {
            return 'game-scenes';
          }

          if (normalizedId.includes('/src/game/')) {
            return 'game-core';
          }

          return undefined;
        },
      },
    },
  },
});
