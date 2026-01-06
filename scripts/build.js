import { build } from 'vite';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { copyFileSync, mkdirSync, existsSync, rmSync, renameSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, '..');
const distDir = resolve(rootDir, 'dist');

async function buildExtension() {
  console.log('Building YouTube Focus Feed extension...\n');

  // Clean dist
  if (existsSync(distDir)) {
    rmSync(distDir, { recursive: true });
  }
  mkdirSync(distDir, { recursive: true });

  const commonConfig = {
    configFile: false,
    logLevel: 'warn',
    resolve: {
      alias: {
        '@': resolve(rootDir, 'src'),
      },
    },
  };

  // Build content script to temp directory
  const contentTempDir = resolve(rootDir, '.temp-content');
  console.log('Building content script...');
  await build({
    ...commonConfig,
    build: {
      outDir: contentTempDir,
      emptyDirFirst: true,
      lib: {
        entry: resolve(rootDir, 'src/content/index.ts'),
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
  });

  // Move content.js to dist
  renameSync(
    resolve(contentTempDir, 'content.js'),
    resolve(distDir, 'content.js')
  );
  rmSync(contentTempDir, { recursive: true });

  // Build background script to temp directory
  const bgTempDir = resolve(rootDir, '.temp-background');
  console.log('Building background script...');
  await build({
    ...commonConfig,
    build: {
      outDir: bgTempDir,
      emptyDirFirst: true,
      lib: {
        entry: resolve(rootDir, 'src/background/index.ts'),
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
  });

  // Move background.js to dist
  renameSync(
    resolve(bgTempDir, 'background.js'),
    resolve(distDir, 'background.js')
  );
  rmSync(bgTempDir, { recursive: true });

  // Copy manifest.json
  console.log('Copying static files...');
  copyFileSync(
    resolve(rootDir, 'manifest.json'),
    resolve(distDir, 'manifest.json')
  );

  // Copy CSS
  copyFileSync(
    resolve(rootDir, 'src/styles/content.css'),
    resolve(distDir, 'content.css')
  );

  // Copy icons
  const iconsDir = resolve(distDir, 'icons');
  mkdirSync(iconsDir, { recursive: true });
  ['icon16.png', 'icon48.png', 'icon128.png'].forEach((icon) => {
    const src = resolve(rootDir, 'assets/icons', icon);
    if (existsSync(src)) {
      copyFileSync(src, resolve(iconsDir, icon));
    }
  });

  console.log('\n✓ Extension build complete!');
  console.log(`  Output: ${distDir}`);
}

buildExtension().catch((err) => {
  console.error('Build failed:', err);
  process.exit(1);
});
