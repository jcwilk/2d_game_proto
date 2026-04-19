/**
 * Map logical game coordinates (0…VIEWPORT_SIZE — the Excalibur canvas’s internal square) to CSS **client**
 * pixel positions for DOM overlays.
 *
 * With a **moving camera**, world positions must be converted to this logical space first using
 * {@link worldPointToOverlayLogical} (camera focal point = Excalibur `camera.pos`, centered viewport).
 *
 * Uses the canvas element’s `getBoundingClientRect()` so scaling is **HiDPI-safe** (logical resolution
 * maps uniformly into the displayed canvas bounds).
 */

import { screenToWorld } from '../camera/math';

/** Viewport-centered camera: logical (0,0) is top-left of the canvas; center is (viewportSize/2, viewportSize/2). */
export function worldPointToOverlayLogical(
  worldX: number,
  worldY: number,
  cameraFocusX: number,
  cameraFocusY: number,
  viewportSize: number,
): { x: number; y: number } {
  const half = viewportSize / 2;
  return {
    x: worldX - cameraFocusX + half,
    y: worldY - cameraFocusY + half,
  };
}

/**
 * Map a **client** pointer position to **world** coordinates (same space as {@link Actor.pos}) for a
 * viewport-centered camera.
 */
export function clientPointToWorldPoint(
  clientX: number,
  clientY: number,
  canvas: HTMLCanvasElement,
  viewportSize: number,
  cameraFocusX: number,
  cameraFocusY: number,
): { x: number; y: number } | null {
  const rect = canvas.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) {
    return null;
  }
  const sx = ((clientX - rect.left) / rect.width) * viewportSize;
  const sy = ((clientY - rect.top) / rect.height) * viewportSize;
  const half = viewportSize / 2;
  const cameraTopLeftX = cameraFocusX - half;
  const cameraTopLeftY = cameraFocusY - half;
  return screenToWorld(sx, sy, cameraTopLeftX, cameraTopLeftY);
}

export function logicalGamePointToClientPoint(
  logicalX: number,
  logicalY: number,
  canvasRect: DOMRectReadOnly,
  viewportSize: number,
): { x: number; y: number } {
  const sx = canvasRect.width / viewportSize;
  const sy = canvasRect.height / viewportSize;
  return {
    x: canvasRect.left + logicalX * sx,
    y: canvasRect.top + logicalY * sy,
  };
}
