/** Ambient typings for `.mjs` modules until migrated to TypeScript. */

declare module "./presets/registry.mjs" {
  export const PRESETS: Record<string, unknown>;
}
