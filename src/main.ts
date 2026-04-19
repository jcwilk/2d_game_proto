import './styles.css';

import {
  Actor,
  Animation,
  AnimationStrategy,
  Color,
  Graphic,
  PointerButton,
  Scene,
  vec,
} from 'excalibur';

/** Scene character classification — player and NPC kinds (proximity UI, follow-on tickets). */
export const CharacterKind = {
  player: 'player',
  merchant: 'merchant',
  monster: 'monster',
} as const;
export type CharacterKind = (typeof CharacterKind)[keyof typeof CharacterKind];

/**
 * First living hostile NPC, or `undefined` when all are defeated — world position readable for proximity UI
 * (e.g. ticket 2gp-real). Updated each frame when multiple monsters exist.
 */
export let monsterActor: Actor | undefined;

import { createGridSheetLoader, mergeGridSheetLoaders } from './art/atlasLoader';
import { parseGridFrameKeysManifestJson } from './art/atlasTypes';
import { spriteSheetFromGridImageSource } from './art/gridSpriteSheet';
import { CHROME_MOVE_SPEED, VIEWPORT_SIZE, createEngine } from './engine';
import {
  CHARACTER_WALK_FRAME_PX,
  FLOOR_FORESHORTENED_HEIGHT_PX,
  scaleToTargetWidthPx,
  TILE_FOOTPRINT_WIDTH_PX,
} from './dimensions';
import {
  attachDirectionalChrome,
  chromeMoveVelocityFromActiveDirections,
  mergeActiveDirections,
} from './input/directionalChrome';
import { attachKeyboardDirections } from './input/keyboardDirections';
import { subscribePointerInput } from './input/pointer';
import {
  ENEMY_ATTACK_COOLDOWN_MS,
  ENEMY_CHASE_SPEED_WORLD_PX,
  ENEMY_DAMAGE_TO_PLAYER,
  ENEMY_MELEE_RANGE_WORLD_PX,
  MONSTER_AGGRO_RADIUS_WORLD_PX,
  NPC_ATTACK_DAMAGE,
  NPC_ATTACK_RANGE_WORLD_PX,
  NPC_DEFAULT_MAX_HP,
  PLAYER_DEFAULT_MAX_HP,
  playerCanAttackNpc,
  worldPointInNpcBounds,
} from './game/npcCombat';
import {
  isAbilityReady,
  monsterShouldChaseAndMelee,
  stepMonsterAggroAndReAggro,
  tryApplyStuckAtWorldCoords,
} from './game/stuckAbility';
import { distanceSquared, isWithinProximity } from './proximity/worldDistance';
import {
  MONSTER_PROXIMITY_RANGE_WORLD_PX,
  attachMonsterExclamationOverlay,
} from './ui/monsterExclamationOverlay';
import { attachMerchantProximityMenu } from './ui/merchantProximityMenu';
import { attachNpcHpBarOverlay } from './ui/npcHpBarOverlay';
import { attachStuckOrbHud, loadStuckOrbSpriteRef } from './ui/stuckOrbHud';

const root = document.querySelector<HTMLDivElement>('#game-root');
if (!root) {
  throw new Error('Missing #game-root element');
}

const gameCanvas = document.querySelector<HTMLCanvasElement>('#game-canvas');
if (!gameCanvas) {
  throw new Error('Missing #game-canvas element');
}

const engine = createEngine({
  canvasElementId: 'game-canvas',
  suppressPlayButton: true,
});

const mainScene = new Scene();
mainScene.backgroundColor = Color.fromHex('#1a1a2e');

engine.addScene('main', mainScene);

const characterAssets = createGridSheetLoader('art/avatar-character');
const merchantAssets = createGridSheetLoader('art/merchant-character');
const monsterCharacterAssets = createGridSheetLoader('art/monster-character');
const monsterArmadilloAssets = createGridSheetLoader('art/monster-armadillo');
const monsterStrawberryJellyfishAssets = createGridSheetLoader('art/monster-strawberry-jellyfish');
const monsterBladeFairyAssets = createGridSheetLoader('art/monster-blade-fairy');
const floorAssets = createGridSheetLoader('art/isometric-open-floor');
const loader = mergeGridSheetLoaders(
  characterAssets,
  merchantAssets,
  monsterCharacterAssets,
  monsterArmadilloAssets,
  monsterStrawberryJellyfishAssets,
  monsterBladeFairyAssets,
  floorAssets,
);

void engine
  .start('main', { loader })
  .then(() => {
    const raw = characterAssets.spriteRefResource.data;
    if (raw == null) {
      throw new Error('Expected sprite-ref JSON after preload');
    }
    const gridManifest = parseGridFrameKeysManifestJson(raw);
    if (!characterAssets.sheetImageSource.isLoaded()) {
      throw new Error('Expected character sheet ImageSource loaded after preload');
    }
    const spriteSheet = spriteSheetFromGridImageSource(characterAssets.sheetImageSource, gridManifest);
    /** Walk cycle frame keys in sheet order: first frame is idle, then walk phases. */
    const walkFrameIds = ['walk_0', 'walk_1', 'walk_2', 'walk_3'] as const;
    const sprites = walkFrameIds.map((id) => {
      const cell = gridManifest.frames[id];
      if (!cell) {
        throw new Error(`Missing sprite-ref frame ${JSON.stringify(id)}`);
      }
      return spriteSheet.getSprite(cell.column, cell.row);
    });
    const walkAnim = new Animation({
      frames: sprites.map((graphic) => ({ graphic })),
      frameDuration: 110,
      strategy: AnimationStrategy.Loop,
    });
    walkAnim.pause();
    walkAnim.goToFrame(0);

    const floorFrameIds = ['floor_0', 'floor_1', 'floor_2', 'floor_3'] as const;

    const floorRaw = floorAssets.spriteRefResource.data;
    if (floorRaw == null) {
      throw new Error('Expected isometric floor sprite-ref JSON after preload');
    }
    const floorManifest = parseGridFrameKeysManifestJson(floorRaw);
    if (!floorAssets.sheetImageSource.isLoaded()) {
      throw new Error('Expected floor sheet ImageSource loaded after preload');
    }
    const floorSpriteSheet = spriteSheetFromGridImageSource(floorAssets.sheetImageSource, floorManifest);
    const floorGraphics = floorFrameIds.map((id) => {
      const cell = floorManifest.frames[id];
      if (!cell) {
        throw new Error(`Missing floor sprite-ref frame ${JSON.stringify(id)}`);
      }
      return floorSpriteSheet.getSprite(cell.column, cell.row);
    });
    const floorGraphic0 = floorGraphics[0];
    if (!floorGraphic0) {
      throw new Error('Expected at least one floor graphic');
    }

    const leadWalkSprite = sprites[0];
    if (!leadWalkSprite) {
      throw new Error('Expected at least one walk animation frame');
    }

    const floorScale = scaleToTargetWidthPx(floorGraphic0.width, TILE_FOOTPRINT_WIDTH_PX);
    const characterScale = scaleToTargetWidthPx(leadWalkSprite.width, CHARACTER_WALK_FRAME_PX);

    const merchantRaw = merchantAssets.spriteRefResource.data;
    if (merchantRaw == null) {
      throw new Error('Expected merchant sprite-ref JSON after preload');
    }
    const merchantManifest = parseGridFrameKeysManifestJson(merchantRaw);
    if (!merchantAssets.sheetImageSource.isLoaded()) {
      throw new Error('Expected merchant sheet ImageSource loaded after preload');
    }
    const merchantSpriteSheet = spriteSheetFromGridImageSource(merchantAssets.sheetImageSource, merchantManifest);
    const merchantIdleCell = merchantManifest.frames['walk_0'];
    if (!merchantIdleCell) {
      throw new Error('Expected merchant sprite-ref frame "walk_0" (idle)');
    }
    const merchantIdleGraphic = merchantSpriteSheet.getSprite(merchantIdleCell.column, merchantIdleCell.row);
    const merchantCharacterScale = scaleToTargetWidthPx(merchantIdleGraphic.width, CHARACTER_WALK_FRAME_PX);

    type MonsterKind = 'fairy' | 'armadillo' | 'jellyfish' | 'bladeFairy';

    interface MonsterRuntime {
      kind: MonsterKind;
      actor: Actor;
      idleGraphic: Graphic;
      characterScale: number;
      hp: number;
      defeated: boolean;
      aggro: boolean;
      /** After stuck, leave aggro radius before chase can resume (per NPC; same rules as single-monster flow). */
      reAggroArmRequired: boolean;
      stuckUntilMs: number;
      hitPulseEnd: number;
      lastAttackOnPlayer: number;
      facesRight: boolean;
    }

    function loadMonsterFromAssets(
      assets: ReturnType<typeof createGridSheetLoader>,
      kind: MonsterKind,
    ): Pick<MonsterRuntime, 'idleGraphic' | 'characterScale'> {
      const raw = assets.spriteRefResource.data;
      if (raw == null) {
        throw new Error(`Expected sprite-ref JSON after preload (${kind})`);
      }
      const manifest = parseGridFrameKeysManifestJson(raw);
      if (!assets.sheetImageSource.isLoaded()) {
        throw new Error(`Expected monster sheet ImageSource loaded after preload (${kind})`);
      }
      const sheet = spriteSheetFromGridImageSource(assets.sheetImageSource, manifest);
      const idleCell = manifest.frames['walk_0'];
      if (!idleCell) {
        throw new Error(`Expected sprite-ref frame "walk_0" (idle) for ${kind}`);
      }
      const idleGraphic = sheet.getSprite(idleCell.column, idleCell.row);
      const characterScale = scaleToTargetWidthPx(idleGraphic.width, CHARACTER_WALK_FRAME_PX);
      return { idleGraphic, characterScale };
    }

    const monsterFairy = loadMonsterFromAssets(monsterCharacterAssets, 'fairy');
    const monsterArmadillo = loadMonsterFromAssets(monsterArmadilloAssets, 'armadillo');
    const monsterJellyfish = loadMonsterFromAssets(monsterStrawberryJellyfishAssets, 'jellyfish');
    const monsterBlade = loadMonsterFromAssets(monsterBladeFairyAssets, 'bladeFairy');

    /** Logical px gap above sprite top for the “!” (clears head at current scale). */
    const monsterExclamationAboveHeadPx = 12;

    /**
     * Shared world anchor: **bottom midpoint of the art cell** (cell edge), +Y down — same for floor and character
     * so horizontal footprint aligns; feet vs. rhombus are handled by art insets (`dimensions.ts`).
     */
    const cellBottomCenter = vec(VIEWPORT_SIZE / 2, VIEWPORT_SIZE * 0.52);

    /** Diamond isometric: half footprint width and half foreshortened height per grid step (`dimensions.ts`). */
    const isoHalfW = TILE_FOOTPRINT_WIDTH_PX / 2;
    const isoHalfH = FLOOR_FORESHORTENED_HEIGHT_PX / 2;
    const gridSize = 9;
    const centerG = (gridSize - 1) / 2;
    const floorZMax = (gridSize - 1) * 2;

    function gridCellBottomCenter(gx: number, gy: number): typeof cellBottomCenter {
      return cellBottomCenter.add(
        vec((gx - gy) * isoHalfW, (gx + gy - 2 * centerG) * isoHalfH),
      );
    }

    /**
     * Isometric depth **gx + gy** from world position (inverse of {@link gridCellBottomCenter}). Matches floor tile
     * `z` ordering so figures “farther forward” on the grid draw on top. Continuous in `pos` for smooth player motion.
     */
    function isoDepthSumFromWorld(pos: typeof cellBottomCenter): number {
      const oy = pos.y - cellBottomCenter.y;
      return oy / isoHalfH + 2 * centerG;
    }

    /**
     * Actor `z` for standing figures: always above every floor tile (`z ≤ floorZMax`), with sub-order from
     * {@link isoDepthSumFromWorld} so the player can pass behind NPCs.
     */
    function isoCharacterZFromWorldPos(pos: typeof cellBottomCenter): number {
      const depthScale = 0.01;
      return floorZMax + 1 + isoDepthSumFromWorld(pos) * depthScale;
    }

    for (let gx = 0; gx < gridSize; gx++) {
      for (let gy = 0; gy < gridSize; gy++) {
        const variantIndex = Math.floor(Math.random() * floorGraphics.length);
        const floorGraphic = floorGraphics[variantIndex] ?? floorGraphic0;
        const floorActor = new Actor({
          pos: gridCellBottomCenter(gx, gy),
          scale: vec(floorScale, floorScale),
          z: gx + gy,
        });
        floorActor.graphics.anchor = vec(0.5, 1);
        floorActor.graphics.use(floorGraphic);
        mainScene.add(floorActor);
      }
    }

    /** Stationary merchant NPC — a few isometric steps from spawn so the player can walk over. */
    const merchantGx = 7;
    const merchantGy = 2;
    const merchantPos = gridCellBottomCenter(merchantGx, merchantGy);
    let merchantFacesRight = merchantPos.x <= cellBottomCenter.x;
    const merchantActor = new Actor({
      pos: merchantPos,
      scale: vec(merchantFacesRight ? merchantCharacterScale : -merchantCharacterScale, merchantCharacterScale),
      z: isoCharacterZFromWorldPos(merchantPos),
    });
    merchantActor.graphics.anchor = vec(0.5, 1);
    merchantActor.graphics.use(merchantIdleGraphic);
    mainScene.add(merchantActor);

    /** Hostile NPCs — one per monster preset; same chase / aggro / stuck rules for now. */
    const monsterSpawns: { gx: number; gy: number; graphic: Graphic; scale: number; kind: MonsterKind }[] = [
      { gx: 2, gy: 7, graphic: monsterFairy.idleGraphic, scale: monsterFairy.characterScale, kind: 'fairy' },
      { gx: 1, gy: 6, graphic: monsterArmadillo.idleGraphic, scale: monsterArmadillo.characterScale, kind: 'armadillo' },
      {
        gx: 3,
        gy: 6,
        graphic: monsterJellyfish.idleGraphic,
        scale: monsterJellyfish.characterScale,
        kind: 'jellyfish',
      },
      { gx: 2, gy: 6, graphic: monsterBlade.idleGraphic, scale: monsterBlade.characterScale, kind: 'bladeFairy' },
    ];

    const monsters: MonsterRuntime[] = monsterSpawns.map((s) => {
      const pos = gridCellBottomCenter(s.gx, s.gy);
      const facesRight = pos.x <= cellBottomCenter.x;
      const a = new Actor({
        pos,
        scale: vec(facesRight ? s.scale : -s.scale, s.scale),
        z: isoCharacterZFromWorldPos(pos),
      });
      a.graphics.anchor = vec(0.5, 1);
      a.graphics.use(s.graphic);
      mainScene.add(a);
      return {
        kind: s.kind,
        actor: a,
        idleGraphic: s.graphic,
        characterScale: s.scale,
        hp: NPC_DEFAULT_MAX_HP,
        defeated: false,
        aggro: false,
        reAggroArmRequired: false,
        stuckUntilMs: 0,
        hitPulseEnd: 0,
        lastAttackOnPlayer: 0,
        facesRight,
      };
    });

    monsterActor = monsters[0]?.actor;

    const actor = new Actor({
      pos: cellBottomCenter,
      scale: vec(characterScale, characterScale),
      z: isoCharacterZFromWorldPos(cellBottomCenter),
    });
    actor.graphics.anchor = vec(0.5, 1);
    actor.graphics.use(walkAnim);
    mainScene.add(actor);

    /** Horizontal flip: left-facing until the player moves right again (vertical-only keeps last facing). */
    let facingRight = true;

    let merchantHp = NPC_DEFAULT_MAX_HP;
    const npcMaxHp = NPC_DEFAULT_MAX_HP;

    let playerHp = PLAYER_DEFAULT_MAX_HP;
    const playerMaxHp = PLAYER_DEFAULT_MAX_HP;
    /** Stuck ability cooldown until this time; only advanced on successful apply (`'ok'`). */
    let stuckCooldownUntilMs = 0;

    let lastMerchantAttackOnPlayer = 0;
    let playerHitPulseEnd = 0;

    /** While true, shopkeeper shows Talk / Trade / Hug when in range. Set false after the player attacks him. */
    let merchantPeaceful = true;
    let merchantDefeated = false;

    const MERCHANT_MENU_PROXIMITY_RADIUS = 220;

    let merchantHitPulseEnd = 0;

    /** Brief lunge toward target on attack (world px/s). */
    let attackLungeEnd = 0;
    let attackLungeVel = vec(0, 0);

    function anyMonsterAlive(): boolean {
      return monsters.some((m) => !m.defeated);
    }

    function syncMonsterActorExport(): void {
      monsterActor = monsters.find((m) => !m.defeated)?.actor;
    }

    const chrome = attachDirectionalChrome(root);
    const keyboard = attachKeyboardDirections();

    let stuckOrbHud: ReturnType<typeof attachStuckOrbHud> | undefined;
    void loadStuckOrbSpriteRef()
      .then((orbRef) => {
        const hit = root.querySelector<HTMLElement>('#game-stuck-orb');
        const sprite = hit?.querySelector<HTMLElement>('.game-stuck-orb-sprite');
        if (!hit || !sprite) {
          console.error('Missing #game-stuck-orb or .game-stuck-orb-sprite');
          return;
        }
        stuckOrbHud = attachStuckOrbHud(orbRef, {
          hitTarget: hit,
          spriteElement: sprite,
          getCanvas: () => gameCanvas,
          viewportSize: VIEWPORT_SIZE,
          isAbilityReady: () =>
            playerHp > 0 && anyMonsterAlive() && isAbilityReady(performance.now(), stuckCooldownUntilMs),
          onDrop: (wx, wy) => {
            const now = performance.now();
            const msx = Math.abs(merchantActor.scale.x);
            const msy = Math.abs(merchantActor.scale.y);
            const dropHitsMerchant =
              !merchantDefeated &&
              worldPointInNpcBounds(
                wx,
                wy,
                merchantActor,
                merchantIdleGraphic.width,
                merchantIdleGraphic.height,
                msx,
                msy,
              );
            let best: MonsterRuntime | undefined;
            let bestD = Number.POSITIVE_INFINITY;
            for (const m of monsters) {
              if (m.defeated) continue;
              const sx = Math.abs(m.actor.scale.x);
              const sy = Math.abs(m.actor.scale.y);
              if (
                worldPointInNpcBounds(
                  wx,
                  wy,
                  m.actor,
                  m.idleGraphic.width,
                  m.idleGraphic.height,
                  sx,
                  sy,
                ) &&
                playerCanAttackNpc(
                  actor.pos.x,
                  actor.pos.y,
                  m.actor.pos.x,
                  m.actor.pos.y,
                  NPC_ATTACK_RANGE_WORLD_PX,
                )
              ) {
                const d = distanceSquared(wx, wy, m.actor.pos.x, m.actor.pos.y);
                if (d < bestD) {
                  bestD = d;
                  best = m;
                }
              }
            }
            if (best == null) {
              return { result: 'miss' as const };
            }
            const r = tryApplyStuckAtWorldCoords({
              nowMs: now,
              stuckCooldownUntilMs,
              monsterDefeated: false,
              dropHitsMerchantBounds: dropHitsMerchant,
              dropWorldX: wx,
              dropWorldY: wy,
              monsterNpc: best.actor,
              monsterGraphicWidth: best.idleGraphic.width,
              monsterGraphicHeight: best.idleGraphic.height,
              monsterScaleX: Math.abs(best.actor.scale.x),
              monsterScaleY: Math.abs(best.actor.scale.y),
              playerFeetX: actor.pos.x,
              playerFeetY: actor.pos.y,
            });
            if (r.result === 'ok') {
              best.aggro = r.monsterAggro;
              best.stuckUntilMs = r.monsterStuckUntilMs;
              best.reAggroArmRequired = r.reAggroArmRequired;
              stuckCooldownUntilMs = r.stuckCooldownUntilMs;
            }
            return r;
          },
        });
      })
      .catch((err: unknown) => {
        console.error('Stuck orb HUD failed to initialize', err);
      });

    function merchantSpriteTopLogicalY(): number {
      const sy = Math.abs(merchantActor.scale.y);
      return merchantActor.pos.y - merchantIdleGraphic.height * sy;
    }

    function playerSpriteTopLogicalY(): number {
      const sy = Math.abs(actor.scale.y);
      return actor.pos.y - leadWalkSprite!.height * sy;
    }

    const npcHpBars = attachNpcHpBarOverlay({
      canvas: gameCanvas,
      viewportSize: VIEWPORT_SIZE,
      entries: [
        {
          id: 'merchant',
          getHp: () => merchantHp,
          getMaxHp: () => npcMaxHp,
          isActive: () => !merchantDefeated,
          getAnchorLogical: () => ({
            x: merchantActor.pos.x,
            y: merchantSpriteTopLogicalY() - 8,
          }),
        },
        ...monsters.map((m, i) => ({
          id: `monster-${i}`,
          getHp: () => m.hp,
          getMaxHp: () => npcMaxHp,
          isActive: () => !m.defeated,
          getAnchorLogical: () => {
            const sy = Math.abs(m.actor.scale.y);
            return {
              x: m.actor.pos.x,
              y: m.actor.pos.y - m.idleGraphic.height * sy - 8,
            };
          },
        })),
        {
          id: 'player',
          getHp: () => playerHp,
          getMaxHp: () => playerMaxHp,
          isActive: () => true,
          getAnchorLogical: () => ({
            x: actor.pos.x,
            y: playerSpriteTopLogicalY() - 10,
          }),
        },
      ],
    });

    const merchantMenu = attachMerchantProximityMenu(mainScene, {
      canvas: gameCanvas,
      viewportSize: VIEWPORT_SIZE,
      proximityRadius: MERCHANT_MENU_PROXIMITY_RADIUS,
      getPlayerFeet: () => ({ x: actor.pos.x, y: actor.pos.y }),
      getMerchantFeet: () => ({ x: merchantActor.pos.x, y: merchantActor.pos.y }),
      getMerchantMenuAnchorLogical: () => {
        const spriteTopY = merchantActor.pos.y - merchantIdleGraphic.height * Math.abs(merchantActor.scale.y);
        return { x: merchantActor.pos.x, y: spriteTopY - 10 };
      },
      getPeacefulWithMerchant: () => merchantPeaceful,
      getMerchantAlive: () => !merchantDefeated,
      onAction: (action) => {
        console.log(`[merchant] ${action}`);
        merchantHitPulseEnd = performance.now() + 260;
      },
    });

    const pointerSub = subscribePointerInput(engine, {
      onDown: (ev) => {
        if (playerHp <= 0) {
          return;
        }
        if (ev.button === PointerButton.Middle || ev.button === PointerButton.Right) {
          return;
        }
        const wx = ev.worldPos.x;
        const wy = ev.worldPos.y;
        const px = actor.pos.x;
        const py = actor.pos.y;

        type Target =
          | { tag: 'merchant'; cx: number; cy: number }
          | { tag: 'monster'; monster: MonsterRuntime; cx: number; cy: number };
        const hits: Target[] = [];

        const msx = Math.abs(merchantActor.scale.x);
        const msy = Math.abs(merchantActor.scale.y);
        if (
          !merchantDefeated &&
          worldPointInNpcBounds(wx, wy, merchantActor, merchantIdleGraphic.width, merchantIdleGraphic.height, msx, msy) &&
          playerCanAttackNpc(px, py, merchantActor.pos.x, merchantActor.pos.y, NPC_ATTACK_RANGE_WORLD_PX) &&
          merchantHp > 0
        ) {
          const mcy = merchantActor.pos.y - (merchantIdleGraphic.height * msy) / 2;
          hits.push({ tag: 'merchant', cx: merchantActor.pos.x, cy: mcy });
        }

        for (const m of monsters) {
          if (m.defeated || m.hp <= 0) continue;
          const nsx = Math.abs(m.actor.scale.x);
          const nsy = Math.abs(m.actor.scale.y);
          if (
            worldPointInNpcBounds(wx, wy, m.actor, m.idleGraphic.width, m.idleGraphic.height, nsx, nsy) &&
            playerCanAttackNpc(px, py, m.actor.pos.x, m.actor.pos.y, NPC_ATTACK_RANGE_WORLD_PX)
          ) {
            const ncy = m.actor.pos.y - (m.idleGraphic.height * nsy) / 2;
            hits.push({ tag: 'monster', monster: m, cx: m.actor.pos.x, cy: ncy });
          }
        }

        if (hits.length === 0) {
          return;
        }

        hits.sort(
          (a, b) =>
            distanceSquared(wx, wy, a.cx, a.cy) - distanceSquared(wx, wy, b.cx, b.cy),
        );
        const target = hits[0]!;
        const targetActor = target.tag === 'merchant' ? merchantActor : target.monster.actor;
        const toTarget = vec(targetActor.pos.x - px, targetActor.pos.y - py);
        if (toTarget.size > 1e-6) {
          attackLungeVel = toTarget.normalize().scale(380);
        } else {
          attackLungeVel = vec(facingRight ? 380 : -380, 0);
        }
        attackLungeEnd = performance.now() + 130;

        if (target.tag === 'merchant') {
          merchantPeaceful = false;
          merchantHp = Math.max(0, merchantHp - NPC_ATTACK_DAMAGE);
          merchantHitPulseEnd = performance.now() + 220;
          if (merchantHp <= 0) {
            merchantActor.kill();
            merchantDefeated = true;
          }
        } else {
          const m = target.monster;
          m.hp = Math.max(0, m.hp - NPC_ATTACK_DAMAGE);
          m.hitPulseEnd = performance.now() + 220;
          if (m.hp <= 0) {
            m.actor.kill();
            m.defeated = true;
            syncMonsterActorExport();
          }
        }
      },
    });

    const monsterExclamation = attachMonsterExclamationOverlay({
      canvas: gameCanvas,
      viewportSize: VIEWPORT_SIZE,
      rangeWorldPx: MONSTER_PROXIMITY_RANGE_WORLD_PX,
      getPlayerPos: () => ({ x: actor.pos.x, y: actor.pos.y }),
      getMonsters: () => monsters.filter((m) => !m.defeated).map((m) => m.actor),
      getMonsterLabelWorldPos: () => {
        const px = actor.pos.x;
        const py = actor.pos.y;
        let best: MonsterRuntime | undefined;
        let bestD = Number.POSITIVE_INFINITY;
        for (const m of monsters) {
          if (m.defeated) continue;
          if (!isWithinProximity(px, py, m.actor.pos.x, m.actor.pos.y, MONSTER_PROXIMITY_RANGE_WORLD_PX)) {
            continue;
          }
          const d = distanceSquared(px, py, m.actor.pos.x, m.actor.pos.y);
          if (d < bestD) {
            bestD = d;
            best = m;
          }
        }
        if (!best) {
          return null;
        }
        const hWorld = best.idleGraphic.height * Math.abs(best.actor.scale.y);
        return {
          x: best.actor.pos.x,
          y: best.actor.pos.y - hWorld - monsterExclamationAboveHeadPx,
        };
      },
    });

    const chromeMoveSub = mainScene.on('preupdate', () => {
      const now = performance.now();
      const px = actor.pos.x;
      const py = actor.pos.y;
      const aggroR2 = MONSTER_AGGRO_RADIUS_WORLD_PX * MONSTER_AGGRO_RADIUS_WORLD_PX;
      const meleeR2 = ENEMY_MELEE_RANGE_WORLD_PX * ENEMY_MELEE_RANGE_WORLD_PX;
      const playerDead = playerHp <= 0;

      for (const m of monsters) {
        if (m.defeated || playerDead) {
          m.actor.vel = vec(0, 0);
          continue;
        }
        const distSqM = distanceSquared(px, py, m.actor.pos.x, m.actor.pos.y);
        const aggroStep = stepMonsterAggroAndReAggro(m.aggro, m.reAggroArmRequired, distSqM, aggroR2);
        m.aggro = aggroStep.monsterAggro;
        m.reAggroArmRequired = aggroStep.reAggroArmRequired;

        const chaseMelee = monsterShouldChaseAndMelee(m.aggro, m.stuckUntilMs, now);
        if (chaseMelee) {
          const mdx = px - m.actor.pos.x;
          const mdy = py - m.actor.pos.y;
          if (distSqM > 1) {
            const toPlayer = vec(mdx, mdy).normalize();
            m.actor.vel = toPlayer.scale(ENEMY_CHASE_SPEED_WORLD_PX);
            m.facesRight = mdx > 0;
          } else {
            m.actor.vel = vec(0, 0);
          }
          if (distSqM <= meleeR2 && now - m.lastAttackOnPlayer >= ENEMY_ATTACK_COOLDOWN_MS) {
            playerHp = Math.max(0, playerHp - ENEMY_DAMAGE_TO_PLAYER);
            m.lastAttackOnPlayer = now;
            playerHitPulseEnd = now + 200;
          }
        } else {
          m.actor.vel = vec(0, 0);
        }
      }

      if (!merchantDefeated && !playerDead) {
        if (!merchantPeaceful) {
          const edx = px - merchantActor.pos.x;
          const edy = py - merchantActor.pos.y;
          const distSqE = distanceSquared(px, py, merchantActor.pos.x, merchantActor.pos.y);
          if (distSqE > 1) {
            const toPlayer = vec(edx, edy).normalize();
            merchantActor.vel = toPlayer.scale(ENEMY_CHASE_SPEED_WORLD_PX);
            merchantFacesRight = edx > 0;
          } else {
            merchantActor.vel = vec(0, 0);
          }
          if (distSqE <= meleeR2 && now - lastMerchantAttackOnPlayer >= ENEMY_ATTACK_COOLDOWN_MS) {
            playerHp = Math.max(0, playerHp - ENEMY_DAMAGE_TO_PLAYER);
            lastMerchantAttackOnPlayer = now;
            playerHitPulseEnd = now + 200;
          }
        } else {
          merchantActor.vel = vec(0, 0);
        }
      } else {
        merchantActor.vel = vec(0, 0);
      }

      const lungeActive = now < attackLungeEnd;
      const merged = mergeActiveDirections(chrome.getActiveDirections(), keyboard.getActiveDirections());
      let v = lungeActive
        ? attackLungeVel
        : chromeMoveVelocityFromActiveDirections(merged, CHROME_MOVE_SPEED);
      if (playerDead) {
        v = vec(0, 0);
      }
      actor.vel = vec(v.x, v.y);
      actor.z = isoCharacterZFromWorldPos(actor.pos);
      if (!merchantDefeated) {
        merchantActor.z = isoCharacterZFromWorldPos(merchantActor.pos);
      }
      for (const m of monsters) {
        if (!m.defeated) {
          m.actor.z = isoCharacterZFromWorldPos(m.actor.pos);
        }
      }

      if (!merchantDefeated) {
        const merchantPulse = now < merchantHitPulseEnd;
        const mScale = merchantCharacterScale * (merchantPulse ? 1.1 : 1);
        merchantActor.scale = vec(merchantFacesRight ? mScale : -mScale, mScale);
      }
      for (const m of monsters) {
        if (!m.defeated) {
          const monsterPulse = now < m.hitPulseEnd;
          const monScale = m.characterScale * (monsterPulse ? 1.08 : 1);
          m.actor.scale = vec(m.facesRight ? monScale : -monScale, monScale);
        }
      }
      const playerPulse = now < playerHitPulseEnd;
      const pScale = characterScale * (playerPulse ? 1.06 : 1);
      if (v.x > 0) {
        facingRight = true;
      } else if (v.x < 0) {
        facingRight = false;
      }
      actor.scale = vec(facingRight ? pScale : -pScale, pScale);
      const moving = v.x * v.x + v.y * v.y > 1;
      if (moving) {
        if (!walkAnim.isPlaying) {
          walkAnim.play();
        }
      } else {
        walkAnim.pause();
        walkAnim.goToFrame(0);
      }
      monsterExclamation.sync();
      npcHpBars.sync();
    });

    if (import.meta.hot) {
      import.meta.hot.dispose(() => {
        stuckOrbHud?.detach();
        merchantMenu.close();
        pointerSub.unsubscribe();
        npcHpBars.close();
        monsterExclamation.close();
        chrome.detach();
        keyboard.detach();
        chromeMoveSub.close();
      });
    }
  })
  .catch((err: unknown) => {
    console.error('Engine failed to start', err);
  });
