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
  build: {
    // Increase chunk size warning limit
    chunkSizeWarningLimit: 2000,
    // Use a more modern target that supports BigInt
    target: 'es2020',
    // Optimize memory usage during build
    minify: 'terser',
    terserOptions: {
      compress: {
        // Reduce memory usage
        keep_infinity: true,
        passes: 1
      }
    },
    // Split chunks more intelligently based on app structure
    // rollupOptions: {
    //   output: {
    //     // Ensure entry chunks are reasonably sized
    //     entryFileNames: 'assets/[name]-[hash].js',
    //     chunkFileNames: 'assets/[name]-[hash].js',
    //     assetFileNames: 'assets/[name]-[hash].[ext]',
    //     // Optimize chunking strategy
    //     manualChunks: (id) => {
          
    //       // Node modules
    //       if (id.includes('node_modules')) {
    //         // Split Univer.js packages by functionality
    //         if (id.includes('@univerjs')) {
    //           if (id.includes('@univerjs/sheets')) {
    //             return 'vendor-univerjs-sheets';
    //           }
    //           if (id.includes('@univerjs/docs')) {
    //             return 'vendor-univerjs-docs';
    //           }
    //           if (id.includes('@univerjs/slides')) {
    //             return 'vendor-univerjs-slides';
    //           }
    //           if (id.includes('@univerjs/engine')) {
    //             return 'vendor-univerjs-engine';
    //           }
    //           if (id.includes('@univerjs/ui')) {
    //             return 'vendor-univerjs-ui';
    //           }
    //           if (id.includes('@univerjs/core')) {
    //             return 'vendor-univerjs-core';
    //           }
    //           // Other Univer packages
    //           return 'vendor-univerjs-other';
    //         }

    //         // Other dependencies
    //         return 'vendor';
    //       }
    //     }
    //   }
    // }
  },
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
