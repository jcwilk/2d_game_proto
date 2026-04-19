// @vitest-environment jsdom

import { Actor, vec } from 'excalibur';
import { describe, expect, it } from 'vitest';

import {
  MONSTER_STUCK_DURATION_MS,
  STUCK_ABILITY_COOLDOWN_MS,
  getCooldownRemainingMs,
  isAbilityReady,
  isMonsterStuck,
  monsterShouldChaseAndMelee,
  stepMonsterAggroAndReAggro,
  tryApplyStuckAtWorldCoords,
} from './stuckAbility';

describe('stuckAbility', () => {
  it('monsterShouldChaseAndMelee is false while stuck even if aggro is true', () => {
    const until = 1_000;
    expect(monsterShouldChaseAndMelee(true, until, 500)).toBe(false);
    // End-exclusive stuck window: `now < until` is stuck; at `now === until` chase may resume.
    expect(monsterShouldChaseAndMelee(true, until, 1_000)).toBe(true);
  });

  it('re-aggro: inside disk while armed does not acquire aggro; leaving then re-entering does', () => {
    const aggroR2 = 100 * 100;
    // Player still inside after unstuck metaphor: aggro was cleared, re-armed
    let monsterAggro = false;
    let re = true;
    const inside = stepMonsterAggroAndReAggro(monsterAggro, re, 50 * 50, aggroR2);
    expect(inside.monsterAggro).toBe(false);
    expect(inside.reAggroArmRequired).toBe(true);

    // Step outside — primes re-aggro
    const primed = stepMonsterAggroAndReAggro(inside.monsterAggro, inside.reAggroArmRequired, 150 * 150, aggroR2);
    expect(primed.reAggroArmRequired).toBe(false);

    // Re-enter — latch aggro again
    const latched = stepMonsterAggroAndReAggro(primed.monsterAggro, primed.reAggroArmRequired, 80 * 80, aggroR2);
    expect(latched.monsterAggro).toBe(true);
  });

  it('tryApplyStuckAtWorldCoords: ok starts cooldown; repeat apply blocked until cooldown elapses', () => {
    const monster = new Actor({ pos: vec(100, 200) });
    monster.scale = vec(1, 1);
    const gw = 40;
    const gh = 80;
    const t0 = 10_000;
    const centerY = monster.pos.y - gh / 2;

    const first = tryApplyStuckAtWorldCoords({
      nowMs: t0,
      stuckCooldownUntilMs: 0,
      monsterDefeated: false,
      dropHitsMerchantBounds: false,
      dropWorldX: monster.pos.x,
      dropWorldY: centerY,
      monsterNpc: monster,
      monsterGraphicWidth: gw,
      monsterGraphicHeight: gh,
      monsterScaleX: 1,
      monsterScaleY: 1,
      playerFeetX: monster.pos.x,
      playerFeetY: monster.pos.y,
    });
    expect(first.result).toBe('ok');
    if (first.result !== 'ok') {
      return;
    }
    expect(first.monsterStuckUntilMs).toBe(t0 + MONSTER_STUCK_DURATION_MS);
    expect(first.stuckCooldownUntilMs).toBe(t0 + STUCK_ABILITY_COOLDOWN_MS);

    const second = tryApplyStuckAtWorldCoords({
      nowMs: t0 + 100,
      stuckCooldownUntilMs: first.stuckCooldownUntilMs,
      monsterDefeated: false,
      dropHitsMerchantBounds: false,
      dropWorldX: monster.pos.x,
      dropWorldY: centerY,
      monsterNpc: monster,
      monsterGraphicWidth: gw,
      monsterGraphicHeight: gh,
      monsterScaleX: 1,
      monsterScaleY: 1,
      playerFeetX: monster.pos.x,
      playerFeetY: monster.pos.y,
    });
    expect(second.result).toBe('cooldown');
  });

  it('tryApplyStuckAtWorldCoords: merchant bounds overlap yields invalid_target', () => {
    const monster = new Actor({ pos: vec(100, 200) });
    const gw = 40;
    const gh = 80;
    const r = tryApplyStuckAtWorldCoords({
      nowMs: 0,
      stuckCooldownUntilMs: 0,
      monsterDefeated: false,
      dropHitsMerchantBounds: true,
      dropWorldX: 100,
      dropWorldY: 200 - gh / 2,
      monsterNpc: monster,
      monsterGraphicWidth: gw,
      monsterGraphicHeight: gh,
      monsterScaleX: 1,
      monsterScaleY: 1,
      playerFeetX: 100,
      playerFeetY: 200,
    });
    expect(r.result).toBe('invalid_target');
  });

  it('isAbilityReady and getCooldownRemainingMs', () => {
    expect(isAbilityReady(100, 150)).toBe(false);
    expect(isAbilityReady(150, 150)).toBe(true);
    expect(getCooldownRemainingMs(100, 150)).toBe(50);
    expect(getCooldownRemainingMs(200, 150)).toBe(0);
  });

  it('isMonsterStuck mirrors until timestamp', () => {
    expect(isMonsterStuck(100, 200)).toBe(true);
    expect(isMonsterStuck(200, 200)).toBe(false);
  });
});
