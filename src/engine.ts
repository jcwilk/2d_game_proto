/**
 * Central viewport and Excalibur `Engine` configuration (normative:
 * `.cursor/plans/project-implementation-deep-dive.md` §D.1).
 *
 * **Viewport policy:** Fixed logical resolution — the game renders at a constant width×height in CSS pixels
 * (internal resolution). `DisplayMode` only controls how that resolution is letterboxed or scaled into the
 * container; scenes and gameplay must import dimensions from this module rather than repeating pixel sizes.
 *
 * **Logical playfield:** **1∶1** (square). `VIEWPORT_SIZE` matches the prior 960×540 layout’s **height** (540)
 * so vertical pixel density stays similar while the horizontal playfield narrows to a square.
 *
 * **`suppressHiDPIScaling`:** `true` — use device pixel ratio 1 so one game pixel aligns to the canvas grid for
 * crisp pixels (retro / pixel-aligned art). Use `false` for smoother scaling on HiDPI at the cost of blur or
 * fractional pixel alignment.
 */
import { DisplayMode, Engine, type EngineOptions } from 'excalibur';

/** Re-export so call sites and `DisplayMode` enum members (e.g. `DisplayMode.FitScreen`) resolve from this module. */
export { DisplayMode };

/** Fixed logical viewport edge length in CSS pixels (square 1∶1). Single source of truth for width and height. */
export const VIEWPORT_SIZE = 540;

/** Same as `VIEWPORT_SIZE` — kept for call sites that name width explicitly. */
export const VIEWPORT_WIDTH = VIEWPORT_SIZE;

/** Same as `VIEWPORT_SIZE` — kept for call sites that name height explicitly. */
export const VIEWPORT_HEIGHT = VIEWPORT_SIZE;

/**
 * D-pad / directional chrome movement cap in **world / logical** pixels per second (matches `Actor.vel` units).
 * Tune alongside `VIEWPORT_SIZE` in this module.
 */
export const CHROME_MOVE_SPEED = 200;

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
