/**
 * Central viewport and Excalibur `Engine` configuration (normative:
 * `.cursor/plans/project-implementation-deep-dive.md` §D.1).
 *
 * **Viewport policy:** Fixed logical resolution — the game renders at a constant width×height in CSS pixels
 * (internal resolution). `DisplayMode` only controls how that resolution is letterboxed or scaled into the
 * container; scenes and gameplay must import dimensions from this module rather than repeating pixel sizes.
 *
 * **Logical playfield:** **1∶1** (square). **`VIEWPORT_SIZE`** is **960** — aligns with the **width** of the old 960×540 layout and gives a larger native playfield than the earlier 540×540 square (better for non–pixel-art scale before CSS upscaling).
 *
 * **`suppressHiDPIScaling`:** `false` — allow device pixel ratio so the canvas can scale smoothly on HiDPI
 * (better for illustrated / painterly art). Use `true` for crisp 1∶1 logical pixels (retro pixel art).
 *
 * **`antialiasing`:** `true` — linear texture filtering and smoother canvas scaling (paired with
 * {@link ImageFiltering.Blended} on {@link ImageSource} for grid sheets).
 */
import { DisplayMode, Engine, type EngineOptions } from 'excalibur';

/** Re-export so call sites and `DisplayMode` enum members (e.g. `DisplayMode.FitContainer`) resolve from this module. */
export { DisplayMode };

/** Fixed logical viewport edge length in CSS pixels (square 1∶1). Single source of truth for width and height. */
export const VIEWPORT_SIZE = 960;

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
export const SUPPRESS_HI_DPI_SCALING = false;

/**
 * Fit the **canvas parent** (`#game-canvas-wrap`), not the whole window — otherwise `FitScreen`
 * scales to `window` size and the playfield draws over HTML chrome (d-pad strip).
 */
export const DEFAULT_DISPLAY_MODE = DisplayMode.FitContainer;

/** Baseline `Engine` options; spread into `new Engine(...)` or override per call. */
export function createEngineOptions(overrides?: Partial<EngineOptions>): EngineOptions {
  return {
    width: VIEWPORT_WIDTH,
    height: VIEWPORT_HEIGHT,
    displayMode: DEFAULT_DISPLAY_MODE,
    suppressHiDPIScaling: SUPPRESS_HI_DPI_SCALING,
    /** Linear filtering + multisample-friendly canvas path (illustrated art). */
    antialiasing: true,
    ...overrides,
  };
}

/** Construct an `Engine` using the shared viewport and display policy. */
export function createEngine(overrides?: Partial<EngineOptions>): Engine {
  return new Engine(createEngineOptions(overrides));
}
