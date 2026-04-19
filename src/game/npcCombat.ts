import type { Actor } from 'excalibur';

import { distanceSquared } from '../proximity/worldDistance';

/** Max distance from player feet to NPC feet to allow a melee attack (world px). */
export const NPC_ATTACK_RANGE_WORLD_PX = 200;

/** Player enters this radius (feet-to-feet) → monster becomes hostile and chases. */
export const MONSTER_AGGRO_RADIUS_WORLD_PX = 280;

/** Hostile NPC chase speed (world px/s) — tune below the player move cap so the player can kite. */
export const ENEMY_CHASE_SPEED_WORLD_PX = 125;

/** Enemy feet-to-player-feet distance to land a melee hit on the player. */
export const ENEMY_MELEE_RANGE_WORLD_PX = 88;

/** Damage enemies deal to the player per hit. */
export const ENEMY_DAMAGE_TO_PLAYER = 9;

/** Minimum ms between enemy melee hits on the player (per enemy). */
export const ENEMY_ATTACK_COOLDOWN_MS = 850;

/** Default HP for merchant / monster until a fuller combat system exists. */
export const NPC_DEFAULT_MAX_HP = 100;

export const PLAYER_DEFAULT_MAX_HP = 100;

/** Damage per successful player attack on an NPC. */
export const NPC_ATTACK_DAMAGE = 14;

/**
 * Axis-aligned bounds for an actor with bottom-center anchor and a single graphic size (idle frame).
 * `scaleX` / `scaleY` should match `Math.abs(actor.scale.x)` / `Math.abs(actor.scale.y)`.
 */
export function npcFeetAnchorBounds(
  actor: Actor,
  graphicWidth: number,
  graphicHeight: number,
  scaleX: number,
  scaleY: number,
): { left: number; right: number; top: number; bottom: number } {
  const halfW = (graphicWidth * scaleX) / 2;
  const h = graphicHeight * scaleY;
  return {
    left: actor.pos.x - halfW,
    right: actor.pos.x + halfW,
    top: actor.pos.y - h,
    bottom: actor.pos.y,
  };
}

export function worldPointInNpcBounds(
  worldX: number,
  worldY: number,
  actor: Actor,
  graphicWidth: number,
  graphicHeight: number,
  scaleX: number,
  scaleY: number,
): boolean {
  const b = npcFeetAnchorBounds(actor, graphicWidth, graphicHeight, scaleX, scaleY);
  return worldX >= b.left && worldX <= b.right && worldY >= b.top && worldY <= b.bottom;
}

export function playerCanAttackNpc(
  playerFeetX: number,
  playerFeetY: number,
  npcFeetX: number,
  npcFeetY: number,
  rangePx: number = NPC_ATTACK_RANGE_WORLD_PX,
): boolean {
  return distanceSquared(playerFeetX, playerFeetY, npcFeetX, npcFeetY) <= rangePx * rangePx;
}
