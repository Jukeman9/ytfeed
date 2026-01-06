import { defineConfig, build } from 'vite';
import { resolve } from 'path';
import { copyFileSync, mkdirSync, existsSync, rmSync, renameSync } from 'fs';

// Configuration for building Chrome extension
export default defineConfig({
  build: {
    outDir: 'dist',
    emptyDirFirst: true,
    lib: {
      entry: resolve(__dirname, 'src/content/index.ts'),
      name: 'YTFeedContent',
      formats: ['iife'],
      fileName: () => 'content.js',
    },
    rollupOptions: {
      output: {
        extend: true,
        inlineDynamicImports: true,
      },
    },
    minify: false,
    sourcemap: false,
    target: 'esnext',
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  plugins: [
    {
      name: 'build-background-and-copy',
      async closeBundle() {
        const distDir = resolve(__dirname, 'dist');

        // Rename content.js to preserve it (vite lib mode uses a temp name)
        const contentSrc = resolve(distDir, 'content.js');
        const contentDest = resolve(distDir, '_content_temp.js');
        if (existsSync(contentSrc)) {
          renameSync(contentSrc, contentDest);
        }

        // Build background script separately
        await build({
          configFile: false,
          build: {
            outDir: distDir,
            emptyDirFirst: false,
            lib: {
              entry: resolve(__dirname, 'src/background/index.ts'),
              name: 'YTFeedBackground',
              formats: ['iife'],
              fileName: () => 'background.js',
            },
            rollupOptions: {
              output: {
                extend: true,
                inlineDynamicImports: true,
              },
            },
            minify: false,
            sourcemap: false,
            target: 'esnext',
          },
          resolve: {
            alias: {
              '@': resolve(__dirname, 'src'),
            },
          },
        });

        // Restore content.js
        if (existsSync(contentDest)) {
          renameSync(contentDest, contentSrc);
        }

        // Ensure dist directory exists
        if (!existsSync(distDir)) {
          mkdirSync(distDir, { recursive: true });
        }

        // Copy manifest.json
        copyFileSync(
          resolve(__dirname, 'manifest.json'),
          resolve(distDir, 'manifest.json')
        );

        // Copy CSS
        copyFileSync(
          resolve(__dirname, 'src/styles/content.css'),
          resolve(distDir, 'content.css')
        );

        // Copy icons
        const iconsDir = resolve(distDir, 'icons');
        if (!existsSync(iconsDir)) {
          mkdirSync(iconsDir, { recursive: true });
        }
        ['icon16.png', 'icon48.png', 'icon128.png'].forEach((icon) => {
          const src = resolve(__dirname, 'assets/icons', icon);
          if (existsSync(src)) {
            copyFileSync(src, resolve(iconsDir, icon));
          }
        });

        console.log('Extension build complete!');
      },
    },
  ],
});
