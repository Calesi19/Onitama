import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Relative base so the built site works under ANY GitHub Pages path
// (project page, user page, or custom domain) with no per-repo config.
export default defineConfig({
  base: './',
  plugins: [react()],
});
