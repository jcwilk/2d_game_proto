import type { Actor } from 'excalibur';

import {
  MONSTER_STUCK_DURATION_MS,
  NPC_ATTACK_RANGE_WORLD_PX,
  STUCK_ABILITY_COOLDOWN_MS,
  playerCanAttackNpc,
  worldPointInNpcBounds,
} from './npcCombat';

export { MONSTER_STUCK_DURATION_MS, STUCK_ABILITY_COOLDOWN_MS };

export type StuckApplyResult = 'ok' | 'miss' | 'cooldown' | 'invalid_target' | 'defeated';

export function isMonsterStuck(nowMs: number, monsterStuckUntilMs: number): boolean {
  return nowMs < monsterStuckUntilMs;
}

export function isAbilityReady(nowMs: number, stuckCooldownUntilMs: number): boolean {
  return nowMs >= stuckCooldownUntilMs;
}

export function getCooldownRemainingMs(nowMs: number, stuckCooldownUntilMs: number): number {
  return Math.max(0, stuckCooldownUntilMs - nowMs);
}

/** Chase + enemy melee from the monster run only when this is true (see specs/drag-stun-hud.md §2). */
export function monsterShouldChaseAndMelee(
  monsterAggro: boolean,
  monsterStuckUntilMs: number,
  nowMs: number,
): boolean {
  return monsterAggro && !isMonsterStuck(nowMs, monsterStuckUntilMs);
}

/**
 * One simulation step for re-aggro latch + aggro acquisition (spec §4).
 * Call after updating `distSqM` for the current frame.
 */
export function stepMonsterAggroAndReAggro(
  monsterAggro: boolean,
  reAggroArmRequired: boolean,
  distSqM: number,
  aggroR2: number,
): { monsterAggro: boolean; reAggroArmRequired: boolean } {
  let re = reAggroArmRequired;
  let aggro = monsterAggro;
  if (re && distSqM > aggroR2) {
    re = false;
  }
  if (!aggro && !re && distSqM <= aggroR2) {
    aggro = true;
  }
  return { monsterAggro: aggro, reAggroArmRequired: re };
}

export type TryApplyStuckAtWorldCoordsArgs = {
  nowMs: number;
  stuckCooldownUntilMs: number;
  monsterDefeated: boolean;
  /** True when the drop point lies inside the merchant’s sprite bounds (spec §1 — refuse non-monster). */
  dropHitsMerchantBounds: boolean;
  dropWorldX: number;
  dropWorldY: number;
  monsterNpc: Actor;
  monsterGraphicWidth: number;
  monsterGraphicHeight: number;
  monsterScaleX: number;
  monsterScaleY: number;
  playerFeetX: number;
  playerFeetY: number;
};

export type TryApplyStuckAtWorldCoordsOk = {
  result: 'ok';
  monsterAggro: false;
  monsterStuckUntilMs: number;
  reAggroArmRequired: true;
  stuckCooldownUntilMs: number;
};

export type TryApplyStuckAtWorldCoordsOther = {
  result: Exclude<StuckApplyResult, 'ok'>;
};

export type TryApplyStuckAtWorldCoordsResult = TryApplyStuckAtWorldCoordsOk | TryApplyStuckAtWorldCoordsOther;

/**
 * Discriminated outcome for HUD / game logic (wor-39p4). Only `'ok'` starts cooldown (spec §6).
 */
export function tryApplyStuckAtWorldCoords(args: TryApplyStuckAtWorldCoordsArgs): TryApplyStuckAtWorldCoordsResult {
  if (args.monsterDefeated) {
    return { result: 'defeated' };
  }
  if (args.dropHitsMerchantBounds) {
    return { result: 'invalid_target' };
  }
  if (!isAbilityReady(args.nowMs, args.stuckCooldownUntilMs)) {
    return { result: 'cooldown' };
  }

  const inBounds = worldPointInNpcBounds(
    args.dropWorldX,
    args.dropWorldY,
    args.monsterNpc,
    args.monsterGraphicWidth,
    args.monsterGraphicHeight,
    args.monsterScaleX,
    args.monsterScaleY,
  );
  if (!inBounds) {
    return { result: 'miss' };
  }

  const inPlayerRange = playerCanAttackNpc(
    args.playerFeetX,
    args.playerFeetY,
    args.monsterNpc.pos.x,
    args.monsterNpc.pos.y,
    NPC_ATTACK_RANGE_WORLD_PX,
  );
  if (!inPlayerRange) {
    return { result: 'miss' };
  }

  return {
    result: 'ok',
    monsterAggro: false,
    monsterStuckUntilMs: args.nowMs + MONSTER_STUCK_DURATION_MS,
    reAggroArmRequired: true,
    stuckCooldownUntilMs: args.nowMs + STUCK_ABILITY_COOLDOWN_MS,
  };
}
