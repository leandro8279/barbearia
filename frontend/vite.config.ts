import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';

import * as path from 'path';
import { defineConfig } from 'vite';

const root = path.resolve(import.meta.dirname, 'src');

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { alias: { '@': root } },
});
