import { describe, expect, it } from "vitest";

import type { SpriteRefGridFrameKeys } from "../sprite-ref.ts";
import { createPreset as createArmadillo } from "./monster-armadillo/monster-armadillo.ts";
import { createPreset as createBladeFairy } from "./monster-blade-fairy/monster-blade-fairy.ts";
import { createPreset as createStrawberryJellyfish } from "./monster-strawberry-jellyfish/monster-strawberry-jellyfish.ts";
import {
  MONSTER_WALK_KIND,
  MONSTER_WALK_MANIFEST_PRESET_ID,
  TILE_HEIGHT,
  TILE_SIZE,
} from "./lib/monster-walk-preset.ts";

describe("presets/monster walk variants (shared character_monster_walk)", () => {
  const variants = [
    { id: "monster-armadillo", create: createArmadillo },
    { id: "monster-strawberry-jellyfish", create: createStrawberryJellyfish },
    { id: "monster-blade-fairy", create: createBladeFairy },
  ] as const;

  for (const v of variants) {
    it(`${v.id}: gridFrameKeys preset matches shared monster walk contract`, () => {
      const p = v.create({ outBase: `/tmp/${v.id}-out` });
      expect(p.presetId).toBe(MONSTER_WALK_MANIFEST_PRESET_ID);
      expect(p.kind).toBe(MONSTER_WALK_KIND);
      expect(p.frames.map((f) => f.id)).toEqual(["walk_0", "walk_1", "walk_2", "walk_3"]);
      expect(p.tileSize).toBe(TILE_SIZE);
      expect(p.tileHeight).toBe(TILE_HEIGHT);
      expect(p.spriteRef.kind).toBe("gridFrameKeys");
      const spriteRef = p.spriteRef as SpriteRefGridFrameKeys;
      expect(spriteRef.sheetImageRelativePath).toBe(`art/${v.id}/sheet.png`);
      expect(p.fal?.sheetRewrite?.enabled).toBe(true);
    });
  }

  it("throws without outBase for each variant", () => {
    expect(() => createArmadillo({} as Parameters<typeof createArmadillo>[0])).toThrow(/outBase/);
    expect(() => createStrawberryJellyfish({} as Parameters<typeof createStrawberryJellyfish>[0])).toThrow(
      /outBase/,
    );
    expect(() => createBladeFairy({} as Parameters<typeof createBladeFairy>[0])).toThrow(/outBase/);
  });
});
