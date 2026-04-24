import path from "node:path";
import fs from "node:fs";
import { fileURLToPath, URL } from "node:url";
import { defineConfig, loadEnv } from "vite";
import vue from "@vitejs/plugin-vue";
import Icons from 'unplugin-icons/vite';
import { FileSystemIconLoader } from 'unplugin-icons/loaders';
import IconsResolver from 'unplugin-icons/resolver';
import Components from 'unplugin-vue-components/vite';

// Expose src/pptist/public/{mocks,imgs,...} at the URL root so PPTist's
// axios.get('./mocks/*.json') + <img src="./imgs/*.webp"> resolve in both dev and prod.
// Vite allows only one publicDir; this bridges the submodule's public assets.
const PPTIST_PUBLIC = path.resolve(__dirname, "src/pptist/public");
const pptistStaticAssets = () => ({
  name: 'pptist-static-assets',
  configureServer(server: any) {
    // Serve /mocks/* and /imgs/* from the pptist submodule's public dir.
    server.middlewares.use((req: any, res: any, next: any) => {
      const url = (req.url || '').split('?')[0];
      const m = url.match(/^\/((?:mocks|imgs)\/[^/]+)$/);
      if (!m) return next();
      const abs = path.join(PPTIST_PUBLIC, m[1]);
      if (abs.startsWith(PPTIST_PUBLIC) && fs.existsSync(abs) && fs.statSync(abs).isFile()) {
        const ext = path.extname(abs).toLowerCase();
        const mime: Record<string, string> = {
          '.json': 'application/json',
          '.webp': 'image/webp',
          '.png': 'image/png',
          '.jpg': 'image/jpeg',
          '.jpeg': 'image/jpeg',
          '.svg': 'image/svg+xml',
        };
        if (mime[ext]) res.setHeader('Content-Type', mime[ext]);
        fs.createReadStream(abs).pipe(res);
        return;
      }
      next();
    });
  },
  generateBundle() {
    const walk = (dir: string, rel = '') => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, entry.name);
        const r = rel ? `${rel}/${entry.name}` : entry.name;
        if (entry.isDirectory()) walk(p, r);
        else if (entry.isFile()) {
          (this as any).emitFile({
            type: 'asset',
            fileName: r,
            source: fs.readFileSync(p),
          });
        }
      }
    };
    if (fs.existsSync(PPTIST_PUBLIC)) walk(PPTIST_PUBLIC);
  },
});

// Vite plugin: rewrite @/ import strings in PPTist source files to @pptist/ BEFORE Vite's
// alias plugin resolves them. PPTist uses @ as its own src root; without this, @/ would
// resolve to vensuite's src instead of src/pptist/src/.
// Uses transform (not resolveId) because Vite's alias runs before user resolveId hooks.
const pptistImportRewriter = {
  name: 'pptist-import-rewriter',
  enforce: 'pre' as const,
  transform(code: string, id: string) {
    if (id.replace(/\\/g, '/').includes('/src/pptist/src/')) {
      return {
        code: code.replace(/(['"])\@\//g, '$1@pptist/'),
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
      pptistImportRewriter,
      pptistStaticAssets(),
      vue(),
      Components({
        dirs: [],
        resolvers: [
          IconsResolver({
            prefix: 'i',
            customCollections: ['custom'],
          }),
        ],
      }),
      Icons({
        compiler: 'vue3',
        autoInstall: false,
        customCollections: {
          custom: FileSystemIconLoader('src/pptist/src/assets/icons'),
        },
        scale: 1,
        defaultClass: 'i-icon',
      }),
    ],
    server: {
      hmr: {
        overlay: false,
      },
      proxy: {
        // Proxy all API calls to backend
        "/api": {
          target: "http://127.0.0.1:8000",
          changeOrigin: true,
          secure: false,
        },
        // Proxy storage/media to avoid CORS during local development
        "/storage": {
          target: shareBaseUrl,
          changeOrigin: true,
          secure: true,
        },
      },
    },
    build: {
      // Increase chunk size warning limit (CI is stricter than local)
      chunkSizeWarningLimit: 5000,
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
      // Rename .mjs assets to .js so servers (including venia.cloud CDN) serve
      // them with application/javascript instead of application/octet-stream.
      // Module workers enforce strict MIME checking; .js universally works.
      rollupOptions: {
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
            if (id.includes('node_modules/pptxtojson')) {
              return 'vendor-pptxtojson';
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
          additionalData: `
            @use 'sass:math';
            @import '${path.resolve(__dirname, 'src/pptist/src/assets/styles/variable.scss').replace(/\\/g, '/')}';
            @import '${path.resolve(__dirname, 'src/pptist/src/assets/styles/mixin.scss').replace(/\\/g, '/')}';
          `,
        },
      },
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
        "@pptist": path.resolve(__dirname, "./src/pptist/src"),
      },
    },
  };
});
