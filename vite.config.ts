import path from "node:path";
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

import tailwind from "tailwindcss";
import autoprefixer from "autoprefixer";
// @ts-ignore
import { univerPlugin } from '@univerjs/vite-plugin';

export default defineConfig({
  css: {
    postcss: {
      plugins: [tailwind(), autoprefixer()],
    },
  },
  plugins: [
    vue(),
    univerPlugin(),
  ],
  define: {
    'import.meta.env.VITE_API_BASE_URL': JSON.stringify(process.env.VITE_API_BASE_URL),
    'import.meta.env.VITE_AUTH_URL': JSON.stringify(process.env.VITE_AUTH_URL),
    'import.meta.env.SOCKET_BASE_URL': JSON.stringify(process.env.SOCKET_BASE_URL),
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
