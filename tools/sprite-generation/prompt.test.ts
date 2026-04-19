import { describe, expect, it } from "vitest";

import {
  buildPrompt,
  buildSheetPrompt,
  DEFAULT_CHROMA_KEY_HEX,
  DPAD_FRAME_COMPOSITION,
  DPAD_FRAME_STYLE,
  DPAD_SHEET_COMPOSITION,
  DPAD_SHEET_STYLE,
  DPAD_SHEET_SUBJECT,
  interpolatePromptTemplate,
} from "./prompt.ts";

describe("sprite-generation prompt", () => {
  it("interpolatePromptTemplate fills tileSize, sheetSize, sheetWidth/Height, chromaKeyHex", () => {
    const s = interpolatePromptTemplate("a{tileSize}b{sheetSize}c{sheetWidth}d{sheetHeight}e{chromaKeyHex}f", {
      tileSize: 256,
      sheetSize: 512,
      sheetWidth: 400,
      sheetHeight: 100,
      chromaKeyHex: "#AABBCC",
    });
    expect(s).toBe("a256b512c400d100e#AABBCCf");
  });

  it("buildPrompt: custom style/composition/subject fragments appear in output", () => {
    const out = buildPrompt({
      tileSize: 128,
      chromaKeyHex: "#00FFAA",
      style: "Retro {tileSize}px RPG sprite. ",
      composition: "Background {chromaKeyHex} flat, no gradients. ",
      subject: "One sword icon pointing north.",
      suffix: " No API calls here.",
    });
    expect(out).toContain("Retro 128px RPG sprite.");
    expect(out).toContain("#00FFAA");
    expect(out).toContain("no gradients");
    expect(out).toContain("One sword icon pointing north.");
    expect(out).toContain("No API calls here.");
  });

  it("buildPrompt: default chroma and dpad suffix include chroma-safe HUD rules", () => {
    const out = buildPrompt({
      tileSize: 256,
      chromaKeyHex: undefined,
      style: DPAD_FRAME_STYLE,
      composition: DPAD_FRAME_COMPOSITION,
      subject: "TEST_SUBJECT_LINE.",
    });
    expect(out).toContain(DEFAULT_CHROMA_KEY_HEX);
    expect(out).toContain("subtle soft shading");
    expect(out).toContain("keep the glyph edge crisp");
    expect(out).toContain("TEST_SUBJECT_LINE.");
  });

  it("buildSheetPrompt matches dpad 1×4 strip wording for same inputs", () => {
    const chroma = "#FF00FF";
    const expected =
      `1×4 horizontal stylized 2D HUD direction strip on one 400×100px canvas: four equal square panels in a single row. ` +
      `Entire image background is one flat solid screen color ${chroma} (pure magenta), full bleed, no gradients. ` +
      `One triangle per panel: same material, palette, and stylistic treatment in all four — muted natural colors, subtle bevel or soft cel-shade OK; ` +
      `not ${chroma} on the glyphs. Triangles small, optically centered, generous margin; ` +
      `no text, no pinwheel, no extra arrows beyond the four directions. ` +
      DPAD_SHEET_SUBJECT;

    const got = buildSheetPrompt({
      sheetWidth: 400,
      sheetHeight: 100,
      chromaKeyHex: chroma,
      style: DPAD_SHEET_STYLE,
      composition: DPAD_SHEET_COMPOSITION,
      subject: DPAD_SHEET_SUBJECT,
    });
    expect(got).toBe(expected);
  });

  it("buildSheetPrompt: alternate style/composition/subject fragments", () => {
    const out = buildSheetPrompt({
      sheetSize: 1024,
      chromaKeyHex: "#112233",
      style: "4x4 sheet on {sheetSize}px. ",
      composition: "BG {chromaKeyHex} solid. ",
      subject: "Panel order A B C D.",
    });
    expect(out).toContain("4x4 sheet on 1024px.");
    expect(out).toContain("#112233");
    expect(out).toContain("Panel order A B C D.");
  });
});
