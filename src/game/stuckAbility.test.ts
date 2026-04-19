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
  it('spec §2 chase: monsterShouldChaseAndMelee is false while stuck (chase velocity gated off)', () => {
    const until = 1_000;
    expect(monsterShouldChaseAndMelee(true, until, 500)).toBe(false);
    // End-exclusive stuck window: `now < until` is stuck; at `now === until` chase may resume.
    expect(monsterShouldChaseAndMelee(true, until, 1_000)).toBe(true);
  });

  it('spec §2 chase: no chase/melee block when aggro is false (velocity zero path in main loop)', () => {
    expect(monsterShouldChaseAndMelee(false, 0, 500)).toBe(false);
    expect(monsterShouldChaseAndMelee(false, 9_999, 500)).toBe(false);
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

  it('spec §4 re-aggro: distSqM exactly at aggro radius² does not prime (strictly outside required)', () => {
    const aggroR2 = 100 * 100;
    const onEdge = stepMonsterAggroAndReAggro(false, true, aggroR2, aggroR2);
    expect(onEdge.monsterAggro).toBe(false);
    expect(onEdge.reAggroArmRequired).toBe(true);
  });

  it('spec §4 timeline: after stuck apply aggro stays off while armed and inside until player leaves disk', () => {
    const aggroR2 = 100 * 100;
    // Successful stuck: monsterAggro cleared, re-armed (mirrors tryApplyStuckAtWorldCoords 'ok')
    let monsterAggro = false;
    let re = true;
    const inside1 = 50 * 50;
    const inside2 = 99 * 99;
    const s1 = stepMonsterAggroAndReAggro(monsterAggro, re, inside1, aggroR2);
    const s2 = stepMonsterAggroAndReAggro(s1.monsterAggro, s1.reAggroArmRequired, inside2, aggroR2);
    expect(s1.monsterAggro).toBe(false);
    expect(s1.reAggroArmRequired).toBe(true);
    expect(s2.monsterAggro).toBe(false);
    expect(s2.reAggroArmRequired).toBe(true);
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
    expect(first.monsterAggro).toBe(false);
    expect(first.reAggroArmRequired).toBe(true);
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

    const afterCd = tryApplyStuckAtWorldCoords({
      nowMs: first.stuckCooldownUntilMs,
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
    expect(afterCd.result).toBe('ok');
  });

  it('spec §6: cooldown blocks activation (tryApply returns cooldown branch)', () => {
    const monster = new Actor({ pos: vec(100, 200) });
    const gw = 40;
    const gh = 80;
    const centerY = monster.pos.y - gh / 2;
    const r = tryApplyStuckAtWorldCoords({
      nowMs: 5_000,
      stuckCooldownUntilMs: 6_000,
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
    expect(r.result).toBe('cooldown');
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

  it('tryApplyStuckAtWorldCoords: defeated yields defeated', () => {
    const monster = new Actor({ pos: vec(100, 200) });
    const r = tryApplyStuckAtWorldCoords({
      nowMs: 0,
      stuckCooldownUntilMs: 0,
      monsterDefeated: true,
      dropHitsMerchantBounds: false,
      dropWorldX: 100,
      dropWorldY: 200 - 40,
      monsterNpc: monster,
      monsterGraphicWidth: 40,
      monsterGraphicHeight: 80,
      monsterScaleX: 1,
      monsterScaleY: 1,
      playerFeetX: 100,
      playerFeetY: 200,
    });
    expect(r.result).toBe('defeated');
  });

  it('tryApplyStuckAtWorldCoords: miss when drop outside monster sprite bounds', () => {
    const monster = new Actor({ pos: vec(100, 200) });
    monster.scale = vec(1, 1);
    const gw = 40;
    const gh = 80;
    const r = tryApplyStuckAtWorldCoords({
      nowMs: 0,
      stuckCooldownUntilMs: 0,
      monsterDefeated: false,
      dropHitsMerchantBounds: false,
      dropWorldX: 10_000,
      dropWorldY: 10_000,
      monsterNpc: monster,
      monsterGraphicWidth: gw,
      monsterGraphicHeight: gh,
      monsterScaleX: 1,
      monsterScaleY: 1,
      playerFeetX: monster.pos.x,
      playerFeetY: monster.pos.y,
    });
    expect(r.result).toBe('miss');
  });

  it('tryApplyStuckAtWorldCoords: miss when in bounds but player feet out of NPC_ATTACK_RANGE', () => {
    const monster = new Actor({ pos: vec(100, 200) });
    monster.scale = vec(1, 1);
    const gw = 40;
    const gh = 80;
    const centerY = monster.pos.y - gh / 2;
    const r = tryApplyStuckAtWorldCoords({
      nowMs: 0,
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
      playerFeetX: monster.pos.x + 10_000,
      playerFeetY: monster.pos.y,
    });
    expect(r.result).toBe('miss');
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
