import { defineConfig, loadEnv } from 'vite';

// GitHub project Pages (`https://<user>.github.io/<repo>/`) needs `base` under `/<repo>/`. Normative: `.cursor/plans/project-implementation-deep-dive.md` §A.2.1
// Object config (not a callback) so Vitest can merge this file via mergeConfig (see vitest.config.ts).
function viteBase(): string {
  const mode =
    process.env.NODE_ENV === 'production'
      ? 'production'
      : process.env.NODE_ENV === 'test'
        ? 'test'
        : 'development';
  const env = loadEnv(mode, process.cwd(), '');
  return env.VITE_BASE ?? process.env.VITE_BASE ?? '/';
}

export default defineConfig({
  base: viteBase(),
});
