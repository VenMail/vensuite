import path from "node:path";
import { defineConfig, loadEnv } from "vite";
import vue from "@vitejs/plugin-vue";
import IconsResolver from 'unplugin-icons/resolver';
import Icons from 'unplugin-icons/vite';
import Components from 'unplugin-vue-components/vite';

// avnac-vue ships source files (TypeScript + Vue). Resolve through the installed
// package so Vite and TypeScript compile the same source in every environment.
const PACKAGE_AVNAC_SRC = path.resolve(__dirname, 'node_modules/@venmail/avnac-vue/src')
const PACKAGE_AVNAC_SRC_NORM = PACKAGE_AVNAC_SRC.replace(/\\/g, '/')
const avnacImportRewriter = {
  name: 'avnac-import-rewriter',
  enforce: 'pre' as const,
  transform(code: string, id: string) {
    const normalized = id.replace(/\\/g, '/')
    const isAvnac =
      normalized.includes(PACKAGE_AVNAC_SRC_NORM) ||
      normalized.includes('@venmail/avnac-vue/src/') ||
      normalized.includes('@venmail+avnac-vue')
    if (isAvnac) {
      return {
        code: code
          .replace(/(['"])#\//g, '$1@avnac/')
          .replace(/(['"])\@\//g, '$1@avnac/'),
        map: null,
      }
    }
  },
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const shareBaseUrl = env.VITE_SHARE_BASE_URL || 'https://venia.cloud';

  return {
    plugins: [
      avnacImportRewriter,
      vue(),
      Components({
        dirs: [],
        resolvers: [
          IconsResolver({ prefix: 'i' }),
        ],
      }),
      Icons({
        compiler: 'vue3',
        autoInstall: false,
        scale: 1,
        defaultClass: 'i-icon',
      }),
    ],
    optimizeDeps: {
      // Exclude avnac-vue source from pre-bundling; avnacImportRewriter handles #/ at serve time.
      exclude: ['@venmail/avnac-vue', '@avnac'],
      // jszip is CJS and imported by avnac-vue (which is excluded above).
      include: ['jszip'],
      esbuildOptions: {
        plugins: [
          {
            name: 'avnac-dep-scan-resolver',
            setup(build: any) {
              build.onResolve({ filter: /^[#@]\// }, (args: any) => {
                const importer = (args.importer || '').replace(/\\/g, '/')
                if (
                  importer.includes('/node_modules/@venmail/avnac-vue/src/') ||
                  importer.includes('@venmail+avnac-vue') ||
                  importer.includes(PACKAGE_AVNAC_SRC_NORM)
                ) {
                  return { external: true }
                }
              })
            },
          },
        ],
      },
    },
    server: {
      hmr: { overlay: false },
      proxy: {
        "/api": {
          target: "http://127.0.0.1:8000",
          changeOrigin: true,
          secure: false,
        },
        "/storage": {
          target: shareBaseUrl,
          changeOrigin: true,
          secure: true,
        },
      },
    },
    build: {
      chunkSizeWarningLimit: 13000,
      target: 'es2020',
      minify: 'terser',
      terserOptions: {
        compress: { keep_infinity: true, passes: 1 },
      },
      rollupOptions: {
        onwarn(warning, warn) {
          const message = warning.message || '';
          if (message.includes('is dynamically imported by') && message.includes('@venmail/avnac-vue')) {
            return;
          }
          warn(warning);
        },
        output: {
          assetFileNames(assetInfo) {
            if (assetInfo.names?.some((n: string) => n.endsWith('.mjs'))) {
              return 'assets/[name]-[hash].js';
            }
            return 'assets/[name]-[hash].[ext]';
          },
          manualChunks(id) {
            if (id.includes('node_modules/echarts') || id.includes('node_modules/zrender')) {
              return 'vendor-echarts';
            }
            if (id.includes('node_modules/mermaid') || id.includes('node_modules/@mermaid-js')) {
              return 'vendor-mermaid';
            }
            if (id.includes('node_modules/pdfjs-dist')) {
              return 'vendor-pdfjs';
            }
            if (id.includes('node_modules/prosemirror')) {
              return 'vendor-prosemirror';
            }
            if (id.includes('node_modules/dexie')) {
              return 'vendor-dexie';
            }
          },
        },
      },
    },
    define: {
      'import.meta.env.VITE_API_BASE_URL': JSON.stringify(env.VITE_API_BASE_URL),
      'import.meta.env.VITE_AUTH_URL': JSON.stringify(env.VITE_AUTH_URL),
      'import.meta.env.VITE_OAUTH_REDIRECT_URI': JSON.stringify(env.VITE_OAUTH_REDIRECT_URI),
      'import.meta.env.SOCKET_BASE_URL': JSON.stringify(env.SOCKET_BASE_URL),
    },
    css: {
      preprocessorOptions: {
        scss: {
          silenceDeprecations: ['import', 'legacy-js-api', 'global-builtin'],
        },
      },
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
        "@avnac": PACKAGE_AVNAC_SRC,
        "#": PACKAGE_AVNAC_SRC,
        fs: path.resolve(__dirname, './src/shims/node-empty.ts'),
        path: path.resolve(__dirname, './src/shims/node-empty.ts'),
        crypto: path.resolve(__dirname, './src/shims/node-empty.ts'),
      },
    },
  };
});
