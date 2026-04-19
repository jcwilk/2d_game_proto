/**
 * Shared contracts for sprite generators consumed by
 * `tools/sprite-generation/pipeline.ts` (**2gp-98mn**).
 *
 * Each generator implements the same async surface so presets can swap mock vs fal
 * without branching the orchestrator.
 */

import type { Buffer } from "node:buffer";
import type { FalClient } from "@fal-ai/client";

export interface GeneratorFrame {
  /** Stable key (e.g. d-pad `"up"`). */
  id: string;
  outSubdir?: string;
  promptVariant?: string;
  /** Preset-specific fields. */
  extra?: Record<string, unknown>;
}

/** Result of a single rasterization step (one PNG buffer plus small structured metadata). */
export interface GenerateResult {
  buffer: Buffer;
  /** e.g. width, height, seed, wallMs, mode. */
  metadata: Record<string, unknown>;
}

/**
 * Optional 2×2 sheet placement for mock sheet compositing: cell coordinates in tile units
 * (0 or 1 for a 512² sheet when tileSize is 256).
 */
export type MockSheetLayout = Record<string, { x: number; y: number }>;

export type ShapeForFrameFn = (
  frame: GeneratorFrame,
  ctx: { tileSize: number },
) => [{ x: number; y: number }, { x: number; y: number }, { x: number; y: number }];

export type TileBufferForFrameFn = (
  frame: GeneratorFrame,
  ctx: { tileSize: number; tileWidth?: number; tileHeight?: number },
) => Buffer;

/** Postprocess step id (see **`../pipeline-stages.ts`** **`POSTPROCESS_REGISTRY`**). */
export type PostprocessStepId = "chromaKey";

/**
 * Mock generator options: deterministic RGBA raster with injectable geometry.
 */
export interface MockGeneratorConfig {
  /** Default width/height when **`tileWidth`** / **`tileHeight`** omitted. */
  tileSize?: number;
  /** Raster width of one sheet cell (defaults to **`tileSize`**). */
  tileWidth?: number;
  /** Raster height of one sheet cell (defaults to **`tileSize`**). */
  tileHeight?: number;
  /** Carried in metadata for parity with fal; mock geometry ignores it unless a preset uses it. */
  seed?: number;
  /** Override triangle (or other) shape per frame; defaults to D-pad triangles from `frame.id`. */
  shapeForFrame?: ShapeForFrameFn;
  /** When set, used instead of **`shapeForFrame`** + triangle raster (e.g. character walk mocks). */
  tileBufferForFrame?: TileBufferForFrameFn;
  /** Opaque glyph color; background stays transparent. */
  fill?: { r: number; g: number; b: number; a: number };
  /**
   * **Required** for mock `generateSheet`: cell coords per `frame.id`
   * (use `sheetLayoutFromCrops` with `preset.sheet.crops`).
   */
  sheetLayout?: MockSheetLayout;
}

export type LogLevel = "DEBUG" | "INFO" | "WARN" | "ERROR";

export type LogFn = (level: LogLevel, step: string, message: string, extra?: Record<string, unknown>) => void;

/** fal-backed generator options (subscribe + download). See `generators/fal.ts`. */
export interface FalSubscribeParams {
  endpoint: string;
  prompt: string;
  /** e.g. `256x256` or `512x512` */
  imageSize: string;
  seed?: number;
  quiet?: boolean;
  falExtraInput?: Record<string, unknown>;
  /** Injected for tests (defaults to `@fal-ai/client` `fal.subscribe`). */
  falSubscribe?: FalClient["subscribe"];
  /** Injected for tests (defaults to global `fetch`). */
  fetch?: typeof fetch;
  log?: LogFn;
}

/** Single-frame entry point — **one** PNG for one preset frame. */
export type GeneratorGenerate = (
  frame: GeneratorFrame,
  config: MockGeneratorConfig | FalSubscribeParams | Record<string, unknown>,
) => Promise<GenerateResult>;

/** Optional multi-frame / sheet entry point (e.g. one fal job for a 2×2 contact sheet). */
export type GeneratorGenerateSheet = (
  frames: GeneratorFrame[],
  config: MockGeneratorConfig | FalSubscribeParams | Record<string, unknown>,
) => Promise<GenerateResult>;
