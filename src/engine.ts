/**
 * Central viewport and Excalibur `Engine` configuration (normative:
 * `.cursor/plans/project-implementation-deep-dive.md` §D.1).
 *
 * **Viewport policy:** Fixed logical resolution — the game renders at a constant width×height in CSS pixels
 * (internal resolution). `DisplayMode` only controls how that resolution is letterboxed or scaled into the
 * container; scenes and gameplay must import dimensions from this module rather than repeating pixel sizes.
 *
 * **`suppressHiDPIScaling`:** `true` — use device pixel ratio 1 so one game pixel aligns to the canvas grid for
 * crisp pixels (retro / pixel-aligned art). Use `false` for smoother scaling on HiDPI at the cost of blur or
 * fractional pixel alignment.
 */
import { DisplayMode, Engine, type EngineOptions } from 'excalibur';

/** Re-export so call sites and `DisplayMode` enum members (e.g. `DisplayMode.FitScreen`) resolve from this module. */
export { DisplayMode };

/** Fixed logical viewport width in CSS pixels (16∶9 reference). */
export const VIEWPORT_WIDTH = 960;

/** Fixed logical viewport height in CSS pixels (16∶9 reference). */
export const VIEWPORT_HEIGHT = 540;

/** Matches `Engine` option; kept as a named constant for grep-friendly policy documentation. */
export const SUPPRESS_HI_DPI_SCALING = true;

/** Default display mode: fit the window while preserving aspect ratio and resolution. */
export const DEFAULT_DISPLAY_MODE = DisplayMode.FitScreen;

/** Baseline `Engine` options; spread into `new Engine(...)` or override per call. */
export function createEngineOptions(overrides?: Partial<EngineOptions>): EngineOptions {
  return {
    width: VIEWPORT_WIDTH,
    height: VIEWPORT_HEIGHT,
    displayMode: DEFAULT_DISPLAY_MODE,
    suppressHiDPIScaling: SUPPRESS_HI_DPI_SCALING,
    ...overrides,
  };
}

/** Construct an `Engine` using the shared viewport and display policy. */
export function createEngine(overrides?: Partial<EngineOptions>): Engine {
  return new Engine(createEngineOptions(overrides));
}
