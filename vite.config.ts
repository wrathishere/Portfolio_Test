import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// GitHub Pages serves this repository at /Portfolio_Test/, so production asset URLs
// must be rooted there. VITE_BASE_PATH lets forks/previews override the path.
export default defineConfig({
  base: process.env.VITE_BASE_PATH ?? '/Portfolio_Test/',
  plugins: [react()],
  build: { sourcemap: true },
});
