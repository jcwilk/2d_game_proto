/**
 * Map logical game coordinates (0…VIEWPORT_SIZE, same as Excalibur world pixels with fixed camera at origin)
 * to CSS **client** pixel positions for DOM overlays.
 *
 * Uses the canvas element’s `getBoundingClientRect()` so scaling is **HiDPI-safe** (logical resolution
 * maps uniformly into the displayed canvas bounds).
 */
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
