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
} from "./prompt.mjs";

describe("sprite-generation prompt", () => {
  it("interpolatePromptTemplate fills tileSize, sheetSize, chromaKeyHex", () => {
    const s = interpolatePromptTemplate("a{tileSize}b{sheetSize}c{chromaKeyHex}d", {
      tileSize: 256,
      sheetSize: 512,
      chromaKeyHex: "#AABBCC",
    });
    expect(s).toBe("a256b512c#AABBCCd");
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

  it("buildPrompt: default chroma and dpad suffix include prohibitions and crisp-pixel rules", () => {
    const out = buildPrompt({
      tileSize: 256,
      chromaKeyHex: undefined,
      style: DPAD_FRAME_STYLE,
      composition: DPAD_FRAME_COMPOSITION,
      subject: "TEST_SUBJECT_LINE.",
    });
    expect(out).toContain(DEFAULT_CHROMA_KEY_HEX);
    expect(out).toContain("no gradients inside the shape");
    expect(out).toContain("no soft glow");
    expect(out).toContain("TEST_SUBJECT_LINE.");
  });

  it("buildSheetPrompt matches dpad monolith sheet wording for same inputs", () => {
    const sheetSize = 512;
    const chroma = "#FF00FF";
    const expected =
      `2x2 pixel art contact sheet on one ${sheetSize}px canvas: four equal panels. ` +
      `Entire image background is one flat solid screen color ${chroma} (pure magenta), full bleed, no gradients. ` +
      `One solid filled triangle per panel (same triangle ink color everywhere, not ${chroma}); triangles small, optically centered in each panel, generous margin; no text, no shadows, no hardware, no pinwheel. ` +
      DPAD_SHEET_SUBJECT;

    const got = buildSheetPrompt({
      sheetSize,
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
