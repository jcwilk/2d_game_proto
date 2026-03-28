import { defineConfig, loadEnv } from 'vite';

// GitHub project Pages (`https://<user>.github.io/<repo>/`) needs `base` under `/<repo>/`. Normative: `.cursor/plans/project-implementation-deep-dive.md` §A.2.1
//
// Cache busting (prototype): keep Vite/Rollup defaults so chunks and assets stay **content-hashed** (plan §B.2)—do not override `rollupOptions.output` to strip `[hash]` from `chunkFileNames` / `assetFileNames`. Do **not** add `vite-plugin-pwa` or `navigator.serviceWorker.register` here (plan §B.3). Plan §B.1 / §B.4: even with hashed filenames, updates are **not** instant for every user worldwide (CDN propagation, open tabs, proxies).
// Object config (not a callback) so Vitest can merge this file via mergeConfig (see vitest.config.ts).
function viteBase(): string {
  const nodeEnv = process.env['NODE_ENV'];
  const mode =
    nodeEnv === 'production'
      ? 'production'
      : nodeEnv === 'test'
        ? 'test'
        : 'development';
  const env = loadEnv(mode, process.cwd(), '');
  return env['VITE_BASE'] ?? process.env['VITE_BASE'] ?? '/';
}

export default defineConfig({
  base: viteBase(),
});
