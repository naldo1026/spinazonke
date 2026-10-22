import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// GitHub Pages serves the site from /<repo-name>/. Override with BASE_PATH if the repo is renamed.
export default defineConfig({
  base: process.env.BASE_PATH ?? '/spinazonke/',
  plugins: [react()],
  server: { host: true },
  build: {
    rolldownOptions: {
      onwarn(warning, warn) {
        // lottie-web uses eval for expressions. It's lazy-loaded and only used if Lottie files are added.
        if (warning.code === 'EVAL' && warning.id?.includes('lottie-web')) return;
        warn(warning);
      },
    },
  },
});
