import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

const diningMenuProxy = {
  '^/api/dining': {
    target: 'https://dining.iastate.edu',
    changeOrigin: true,
    rewrite: (p: string) => {
      const qi = p.indexOf('?');
      const query = qi >= 0 ? p.slice(qi) : '';
      return `/wp-json/dining/menu-hours/get-single-location/${query}`;
    },
  },
} as const;

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [react(), tailwindcss()],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      /** Client bundle (see `src/vite-env.d.ts`) — set `MAPBOX_API_KEY` in `.env` */
      'import.meta.env.MAPBOX_API_KEY': JSON.stringify(env.MAPBOX_API_KEY ?? ''),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      proxy: {...diningMenuProxy},
    },
    preview: {
      proxy: {...diningMenuProxy},
    },
  };
});
