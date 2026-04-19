/**
 * Shared **character_monster_walk** strip preset: same geometry, manifest `preset` / `kind`, and
 * pipeline behavior as the original **`monster-character`**; only identity prompts differ per asset.
 *
 * @see `../monster-character/monster-character.ts`
 */

import type { GeneratorFrame } from "../../generators/types.ts";
import { renderCharacterWalkMockTileBuffer } from "../../generators/mock.ts";
import { buildRecipeId } from "../../manifest.ts";
import type { PipelinePreset } from "../../pipeline.ts";
import type { CreatePresetOptsBase } from "../../preset-contract.ts";
import {
  buildCharacterWalkStripSpritePrompt,
  CHARACTER_FALSPRITE_SHEET_REWRITE_SYSTEM_PROMPT as CHARACTER_WALK_REWRITE_SYSTEM_BASE,
  CHARACTER_WALK_FRAME_COMPOSITION,
  CHARACTER_WALK_FRAME_PROMPT_SUFFIX,
  CHARACTER_WALK_SHEET_COMPOSITION,
  CHARACTER_WALK_SHEET_STYLE,
} from "../../prompt.ts";
import {
  CHARACTER_WALK_FRAME_HEIGHT_PX,
  CHARACTER_WALK_FRAME_PX,
  CHROMA_TOLERANCE_DEFAULT,
  CHARACTER_CHROMA_FRINGE_EDGE_DIST,
  CHARACTER_CHROMA_SPILL_MAX_DIST,
  DEFAULT_CHARACTER_FAL_ENDPOINT,
  defaultCharacterFalPipelinePartial,
} from "./character-defaults.ts";
import { createCharacterStripPreset } from "./character-preset.ts";

/** Manifest `preset` and `buildRecipeId` segment — shared by all monster walk variants. */
export const MONSTER_WALK_MANIFEST_PRESET_ID = "character_monster_walk";

/** Manifest `kind` — shared by all monster walk variants. */
export const MONSTER_WALK_KIND = "character_monster_walk";

export const DEFAULT_STRATEGY = "sheet";

export const TILE_SIZE = CHARACTER_WALK_FRAME_PX;

export const TILE_HEIGHT = CHARACTER_WALK_FRAME_HEIGHT_PX;

export { CHROMA_TOLERANCE_DEFAULT };
export { CHARACTER_CHROMA_FRINGE_EDGE_DIST };
export { CHARACTER_CHROMA_SPILL_MAX_DIST };

export const DEFAULT_FAL_ENDPOINT = DEFAULT_CHARACTER_FAL_ENDPOINT;

const _frameIds = ["walk_0", "walk_1", "walk_2", "walk_3"] as const;

export type MonsterWalkIdentity = {
  /**
   * Per-frame `promptVariant` strings (full text for each of the four walk beats), same order as
   * **`walk_0`…`walk_3`**.
   */
  readonly framePromptVariants: readonly [string, string, string, string];
  /** Prepended to every per-tile / frame style prompt (creature silhouette + art direction). */
  readonly frameStyle: string;
  /** Full-sheet subject for fal (four-beat strip choreography + identity). */
  readonly sheetSubject: string;
  /** User seed for sheet rewrite (single consistent silhouette). */
  readonly sheetRewriteUserSeed: string;
};

export function buildMonsterWalkFrames(identity: MonsterWalkIdentity): readonly GeneratorFrame[] {
  return Object.freeze(
    _frameIds.map((id, i) => ({
      id,
      outSubdir: id,
      promptVariant: identity.framePromptVariants[i]!,
    })),
  );
}

export function monsterWalkRecipeId(
  mode: "mock" | "generate",
  strategy?: "per-tile" | "sheet",
): string {
  return buildRecipeId({
    preset: MONSTER_WALK_MANIFEST_PRESET_ID,
    mode,
    ...(mode === "generate" ? { strategy } : {}),
  });
}

/** OpenRouter system prompt: base falsprite rules + isometric staging (shared across monsters). */
export const MONSTER_WALK_SHEET_REWRITE_SYSTEM_PROMPT =
  CHARACTER_WALK_REWRITE_SYSTEM_BASE +
  " Staging: describe the character and motion as seen from a fixed isometric three-quarter camera (oblique, front plus one side readable — not a flat side profile). The performer should occupy the frame as if centered on the vertical midline: **top of head** near **10%** down from the top, **ground contact** near **20%** up from the bottom (same vertical bands as the pipeline mock, not equal 10% top and bottom)." +
  " Backdrop (match isometric floor strip rewrites): do **not** mention chroma keys, greenscreen, matting, or bright magenta/fuchsia as the background — one calm uniform flat backdrop only; **no** gutters, divider lines, or vertical bands between columns; **no** pink/purple glow or colored halos at the figure outline or along interior vertical boundaries." +
  " Layout: all four beats are **side by side** in one horizontal line — never choreograph as two horizontal rows of four poses (no upper/lower register).";

export interface CreateMonsterWalkPresetOpts extends CreatePresetOptsBase {
  pngFilename?: string;
  /** Vendored preset module path for provenance (e.g. `tools/.../monster-armadillo/monster-armadillo.ts`). */
  provenanceTool: string;
  /** Site-root-relative art prefix (e.g. `art/monster-armadillo`). */
  artUrlPrefix: string;
  identity: MonsterWalkIdentity;
  createPresetErrorLabel: string;
}

export function createMonsterWalkPreset(opts: CreateMonsterWalkPresetOpts): PipelinePreset {
  if (typeof opts?.outBase !== "string" || !opts.outBase.trim()) {
    throw new Error(
      `${opts.createPresetErrorLabel}: outBase (non-empty string, absolute output directory) is required`,
    );
  }

  const frames = buildMonsterWalkFrames(opts.identity);

  const spriteRefJsonRelativePath = opts.spriteRefJsonRelativePath ?? "sprite-ref.json";
  const provenanceVersion = opts.provenanceVersion ?? 1;

  const falBase = defaultCharacterFalPipelinePartial();

  return createCharacterStripPreset({
    outBase: opts.outBase,
    presetId: MONSTER_WALK_MANIFEST_PRESET_ID,
    kind: MONSTER_WALK_KIND,
    frames: [...frames],
    prompt: {
      frameStyle: opts.identity.frameStyle,
      frameComposition: CHARACTER_WALK_FRAME_COMPOSITION,
      sheetStyle: CHARACTER_WALK_SHEET_STYLE,
      sheetComposition: CHARACTER_WALK_SHEET_COMPOSITION,
      sheetSubject: opts.identity.sheetSubject,
      sheetRewriteUserPrompt: opts.identity.sheetRewriteUserSeed,
      sheetPromptBuilder: (ctx) =>
        buildCharacterWalkStripSpritePrompt(
          ctx.rewrittenBase ?? opts.identity.sheetSubject,
          ctx.sheetWidth,
          ctx.sheetHeight,
        ),
      framePromptSuffix: CHARACTER_WALK_FRAME_PROMPT_SUFFIX,
    },
    renderMockTileBuffer: (frame, ctx) =>
      renderCharacterWalkMockTileBuffer(
        frame,
        ctx.tileWidth ?? TILE_SIZE,
        ctx.tileHeight ?? TILE_HEIGHT,
      ),
    spriteRef: {
      kind: "gridFrameKeys",
      jsonRelativePath: spriteRefJsonRelativePath,
      sheetImageRelativePath: `${opts.artUrlPrefix.replace(/\/$/, "")}/sheet.png`,
    },
    specsNaming: "sheet.png + sprite-ref.json (gridFrameKeys); no per-frame walk_* tiles",
    provenanceTool: opts.provenanceTool,
    provenanceVersion,
    fal: {
      ...falBase,
      sheetRewrite: {
        enabled: true,
        systemPrompt: MONSTER_WALK_SHEET_REWRITE_SYSTEM_PROMPT,
      },
    },
  });
}
