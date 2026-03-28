/**
 * Pure world ↔ screen layout math (no canvas / engine). Normative intent:
 * `.cursor/plans/project-implementation-deep-dive.md` §D.4.
 *
 * Convention: the camera position is the **top-left** of the viewport in world space.
 * Screen coordinates are relative to that viewport (0,0 = top-left of the game view).
 */

export interface Vec2 {
  readonly x: number;
  readonly y: number;
}

/** Map a world point to screen space using a top-left camera. */
export function worldToScreen(
  worldX: number,
  worldY: number,
  cameraX: number,
  cameraY: number,
): Vec2 {
  return { x: worldX - cameraX, y: worldY - cameraY };
}

/** Inverse of {@link worldToScreen} for the same camera. */
export function screenToWorld(
  screenX: number,
  screenY: number,
  cameraX: number,
  cameraY: number,
): Vec2 {
  return { x: screenX + cameraX, y: screenY + cameraY };
}

/**
 * Clamp camera top-left so the viewport (camera size) stays inside a rectangular world [0, worldW] × [0, worldH].
 * If the world is smaller than the viewport along an axis, the camera is pinned at 0 on that axis.
 */
export function clampCameraToWorldBounds(
  cameraX: number,
  cameraY: number,
  viewportWidth: number,
  viewportHeight: number,
  worldWidth: number,
  worldHeight: number,
): Vec2 {
  const maxX = Math.max(0, worldWidth - viewportWidth);
  const maxY = Math.max(0, worldHeight - viewportHeight);
  return {
    x: Math.min(Math.max(0, cameraX), maxX),
    y: Math.min(Math.max(0, cameraY), maxY),
  };
}
