/**
 * Shared **nano-banana-2** fal input fragments for **`PipelinePreset.fal`** (`falExtrasSheet` /
 * `falExtrasPerTile`). Shapes match **`buildNanoBanana2ImageInput`** in **`generators/fal.ts`**
 * (`aspect_ratio`, `resolution`, optional `expand_prompt` / `safety_tolerance` for sheet jobs).
 */

import {
  NANO_BANANA2_DEFAULT_RESOLUTION,
  NANO_BANANA2_LOW_RESOLUTION,
} from "../../generators/fal.ts";
import type { PipelinePreset } from "../../pipeline.ts";

/** Assignable to **`PipelinePreset["fal"]`[`falExtrasSheet`]** when used as preset extras. */
export type NanoBanana2FalExtrasSheet = {
  aspect_ratio: string;
  resolution: string;
  expand_prompt?: boolean;
  safety_tolerance?: number;
} & Record<string, unknown>;

/** Assignable to **`PipelinePreset["fal"]`[`falExtrasPerTile`]** when used as preset extras. */
export type NanoBanana2FalExtrasPerTile = {
  aspect_ratio: string;
  resolution: string;
} & Record<string, unknown>;

type _SheetExtendsPipeline = NanoBanana2FalExtrasSheet extends NonNullable<
  NonNullable<PipelinePreset["fal"]>["falExtrasSheet"]
>
  ? true
  : never;
type _PerTileExtendsPipeline = NanoBanana2FalExtrasPerTile extends NonNullable<
  NonNullable<PipelinePreset["fal"]>["falExtrasPerTile"]
>
  ? true
  : never;

/** Compile-time: lib extras shapes are assignable to **`PipelinePreset['fal']`** fields. */
export type _NanoBanana2FalExtrasPipelineAssignability = [_SheetExtendsPipeline, _PerTileExtendsPipeline];

/**
 * Default sheet-side knobs used by dpad / character / isometric floor presets: **0.5K**,
 * **`expand_prompt`**, **`safety_tolerance`**.
 */
export function nanoBanana2FalExtrasSheet(opts: {
  aspectRatio: string;
  resolution?: string;
  expandPrompt?: boolean;
  safetyTolerance?: number;
}): NanoBanana2FalExtrasSheet {
  const {
    aspectRatio,
    resolution = NANO_BANANA2_LOW_RESOLUTION,
    expandPrompt = true,
    safetyTolerance = 2,
  } = opts;
  return {
    aspect_ratio: aspectRatio,
    resolution,
    expand_prompt: expandPrompt,
    safety_tolerance: safetyTolerance,
  } satisfies NanoBanana2FalExtrasSheet;
}

/** Square per-tile jobs (default **1:1** + **1K**). */
export function nanoBanana2FalExtrasPerTile(opts: {
  aspectRatio?: string;
  resolution?: string;
} = {}): NanoBanana2FalExtrasPerTile {
  const { aspectRatio = "1:1", resolution = NANO_BANANA2_DEFAULT_RESOLUTION } = opts;
  return {
    aspect_ratio: aspectRatio,
    resolution,
  } satisfies NanoBanana2FalExtrasPerTile;
}
