import fs from 'node:fs'
import path from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// Resolve Windows Junction / symlink mismatch for Vite dev server dependency optimization
try {
  const realCwd = fs.realpathSync.native(process.cwd());
  if (realCwd && realCwd.toLowerCase() !== process.cwd().toLowerCase()) {
    process.chdir(realCwd);
  }
} catch {
  // fallback
}

const pkg = JSON.parse(fs.readFileSync(path.resolve(__dirname, 'package.json'), 'utf-8'));

function versionSyncPlugin() {
  const syncVersion = () => {
    try {
      const p = JSON.parse(fs.readFileSync(path.resolve(__dirname, 'package.json'), 'utf-8'));
      const publicDir = path.resolve(__dirname, 'public');
      if (!fs.existsSync(publicDir)) {
        fs.mkdirSync(publicDir, { recursive: true });
      }
      const data = {
        version: p.version || '1.0.0',
        buildTime: new Date().toISOString(),
      };
      fs.writeFileSync(path.resolve(publicDir, 'version.json'), JSON.stringify(data, null, 2) + '\n');
    } catch {
      // fallback
    }
  };

  return {
    name: 'version-json-sync',
    buildStart() {
      syncVersion();
    },
    configureServer(server: any) {
      syncVersion();
      const pkgFile = path.resolve(__dirname, 'package.json');
      server.watcher.add(pkgFile);
      server.watcher.on('change', (file: string) => {
        if (path.resolve(file) === pkgFile) {
          syncVersion();
        }
      });
      server.middlewares.use((req: any, res: any, next: any) => {
        if (req.url && (req.url === '/version.json' || req.url.startsWith('/version.json?'))) {
          res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
          res.setHeader('Content-Type', 'application/json');
          try {
            const currentPkg = JSON.parse(fs.readFileSync(pkgFile, 'utf-8'));
            res.end(JSON.stringify({
              version: currentPkg.version || '1.0.0',
              buildTime: new Date().toISOString()
            }, null, 2));
            return;
          } catch {
            // fallback
          }
        }
        next();
      });
    },
  };
}

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  plugins: [react(), tailwindcss(), versionSyncPlugin(), VitePWA({
    registerType: 'autoUpdate',
    includeAssets: ['logo.png', 'vite.svg', 'images/**/*'],
    workbox: {
      cleanupOutdatedCaches: true,
      clientsClaim: true,
      skipWaiting: true,
      maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
      navigateFallback: '/index.html',
      navigateFallbackDenylist: [/^\/api/, /\.xml$/, /^\/sitemap/, /^\/robots\.txt/, /^\/rss/, /^\/feed/],
      runtimeCaching: [
        {
          urlPattern: /\.(?:png|jpg|jpeg|svg|webp|ico)$/i,
          handler: 'CacheFirst',
          options: {
            cacheName: 'trusthyre-images-cache',
            expiration: {
              maxEntries: 100,
              maxAgeSeconds: 30 * 24 * 60 * 60, // 30 Days
            },
            cacheableResponse: {
              statuses: [0, 200],
            },
          },
        },
        {
          urlPattern: /^https:\/\/fonts\.(?:googleapis|gstatic)\.com\/.*/i,
          handler: 'CacheFirst',
          options: {
            cacheName: 'google-fonts',
            expiration: {
              maxEntries: 30,
              maxAgeSeconds: 365 * 24 * 60 * 60, // 1 Year
            },
            cacheableResponse: {
              statuses: [0, 200],
            },
          },
        },
      ],
    },
    manifest: {
      name: 'TrustHyre | Trusted Talent. Better Hiring.',
      short_name: 'TrustHyre',
      description: 'India’s #1 Verified Workforce & Employer Network',
      theme_color: '#0f2f63',
      background_color: '#ffffff',
      display: 'standalone',
      icons: [
        {
          src: 'logo.png',
          sizes: '192x192',
          type: 'image/png'
        },
        {
          src: 'logo.png',
          sizes: '512x512',
          type: 'image/png',
          purpose: 'any maskable'
        }
      ]
    }
  })],
  define: {
    global: 'window',
    __APP_VERSION__: JSON.stringify(pkg.version || '1.0.0'),
    __APP_BUILD_TIME__: JSON.stringify(new Date().toISOString()),
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-pdf': ['@react-pdf/renderer', 'jspdf', 'html2canvas'],
          'vendor-maps': ['leaflet', 'react-leaflet'],
          'vendor-motion': ['framer-motion', 'gsap'],
          'vendor-firebase': ['firebase/app', 'firebase/auth'],
          'vendor-icons': ['lucide-react'],
        },
      },
    },
    chunkSizeWarningLimit: 1000,
  },
})
