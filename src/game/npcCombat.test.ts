// @vitest-environment jsdom

import { Actor, vec } from 'excalibur';
import { describe, expect, it } from 'vitest';

import {
  MERCHANT_FOLLOW_AFTER_HUG_MS,
  MERCHANT_HUG_HEAL_AMOUNT,
  npcFeetAnchorBounds,
  playerCanAttackNpc,
  worldPointInNpcBounds,
} from './npcCombat';

describe('npcCombat', () => {
  it('worldPointInNpcBounds is true inside feet-anchored sprite box', () => {
    const a = new Actor({ pos: vec(100, 200) });
    a.scale = vec(2, 2);
    const gw = 32;
    const gh = 80;
    expect(worldPointInNpcBounds(100, 200 - 20, a, gw, gh, 2, 2)).toBe(true);
    expect(worldPointInNpcBounds(100, 201, a, gw, gh, 2, 2)).toBe(false);
  });

  it('npcFeetAnchorBounds matches hit test corners', () => {
    const a = new Actor({ pos: vec(50, 120) });
    a.scale = vec(1, 1);
    const b = npcFeetAnchorBounds(a, 40, 100, 1, 1);
    expect(b.bottom).toBe(120);
    expect(b.top).toBe(20);
    expect(b.left).toBe(30);
    expect(b.right).toBe(70);
  });

  it('playerCanAttackNpc respects radius', () => {
    expect(playerCanAttackNpc(0, 0, 200, 0, 150)).toBe(false);
    expect(playerCanAttackNpc(0, 0, 100, 0, 150)).toBe(true);
  });

  it('merchant hug tuning constants are positive', () => {
    expect(MERCHANT_HUG_HEAL_AMOUNT).toBeGreaterThan(0);
    expect(MERCHANT_FOLLOW_AFTER_HUG_MS).toBeGreaterThan(0);
  });
});
