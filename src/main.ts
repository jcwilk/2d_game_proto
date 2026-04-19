import './styles.css';

import { Actor, Animation, AnimationStrategy, Color, Scene, vec } from 'excalibur';

/** Scene character classification — player and NPC kinds (proximity UI, follow-on tickets). */
export const CharacterKind = {
  player: 'player',
  merchant: 'merchant',
  monster: 'monster',
} as const;
export type CharacterKind = (typeof CharacterKind)[keyof typeof CharacterKind];

/** Spawned monster NPC — world position readable for proximity UI (e.g. ticket 2gp-real). */
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
import {
  MONSTER_PROXIMITY_RANGE_WORLD_PX,
  attachMonsterExclamationOverlay,
} from './ui/monsterExclamationOverlay';
import { attachMerchantProximityMenu } from './ui/merchantProximityMenu';

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
const monsterAssets = createGridSheetLoader('art/monster-character');
const floorAssets = createGridSheetLoader('art/isometric-open-floor');
const loader = mergeGridSheetLoaders(
  characterAssets,
  merchantAssets,
  monsterAssets,
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

    const monsterRaw = monsterAssets.spriteRefResource.data;
    if (monsterRaw == null) {
      throw new Error('Expected monster sprite-ref JSON after preload');
    }
    const monsterManifest = parseGridFrameKeysManifestJson(monsterRaw);
    if (!monsterAssets.sheetImageSource.isLoaded()) {
      throw new Error('Expected monster sheet ImageSource loaded after preload');
    }
    const monsterSpriteSheet = spriteSheetFromGridImageSource(monsterAssets.sheetImageSource, monsterManifest);
    const monsterIdleCell = monsterManifest.frames['walk_0'];
    if (!monsterIdleCell) {
      throw new Error('Expected monster sprite-ref frame "walk_0" (idle)');
    }
    const monsterIdleGraphic = monsterSpriteSheet.getSprite(monsterIdleCell.column, monsterIdleCell.row);
    const monsterCharacterScale = scaleToTargetWidthPx(monsterIdleGraphic.width, CHARACTER_WALK_FRAME_PX);
    const monsterSpriteHeightWorld = monsterIdleGraphic.height * monsterCharacterScale;
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
    const merchantFacesRight = merchantPos.x <= cellBottomCenter.x;
    const merchantActor = new Actor({
      pos: merchantPos,
      scale: vec(merchantFacesRight ? merchantCharacterScale : -merchantCharacterScale, merchantCharacterScale),
      z: isoCharacterZFromWorldPos(merchantPos),
    });
    merchantActor.graphics.anchor = vec(0.5, 1);
    merchantActor.graphics.use(merchantIdleGraphic);
    mainScene.add(merchantActor);

    /** Stationary monster NPC — opposite quadrant from merchant so both stay readable on the grid. */
    const monsterGx = 2;
    const monsterGy = 7;
    const monsterPos = gridCellBottomCenter(monsterGx, monsterGy);
    const monsterFacesRight = monsterPos.x <= cellBottomCenter.x;
    monsterActor = new Actor({
      pos: monsterPos,
      scale: vec(monsterFacesRight ? monsterCharacterScale : -monsterCharacterScale, monsterCharacterScale),
      z: isoCharacterZFromWorldPos(monsterPos),
    });
    monsterActor.graphics.anchor = vec(0.5, 1);
    monsterActor.graphics.use(monsterIdleGraphic);
    mainScene.add(monsterActor);

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

    /** World-space proximity for merchant UI — center-to-center using `Actor.pos` (feet anchor), same as monster proximity. */
    const MERCHANT_PROXIMITY_RADIUS = 220;
    let merchantPulseEnd = 0;

    const chrome = attachDirectionalChrome(root);
    const keyboard = attachKeyboardDirections();
    const merchantMenu = attachMerchantProximityMenu(mainScene, {
      canvas: gameCanvas,
      viewportSize: VIEWPORT_SIZE,
      proximityRadius: MERCHANT_PROXIMITY_RADIUS,
      getPlayerFeet: () => ({ x: actor.pos.x, y: actor.pos.y }),
      getMerchantFeet: () => ({ x: merchantActor.pos.x, y: merchantActor.pos.y }),
      getMerchantMenuAnchorLogical: () => {
        const spriteTopY = merchantActor.pos.y - merchantIdleGraphic.height * merchantCharacterScale;
        return { x: merchantActor.pos.x, y: spriteTopY - 10 };
      },
      onAction: (action) => {
        console.log(`[merchant] ${action}`);
        merchantPulseEnd = performance.now() + 260;
      },
    });

    const monsterExclamation = attachMonsterExclamationOverlay({
      canvas: gameCanvas,
      viewportSize: VIEWPORT_SIZE,
      rangeWorldPx: MONSTER_PROXIMITY_RANGE_WORLD_PX,
      getPlayerPos: () => ({ x: actor.pos.x, y: actor.pos.y }),
      getMonster: () => monsterActor,
      getMonsterLabelWorldPos: () => {
        const m = monsterActor;
        if (!m) {
          return null;
        }
        return {
          x: m.pos.x,
          y: m.pos.y - monsterSpriteHeightWorld - monsterExclamationAboveHeadPx,
        };
      },
    });

    const chromeMoveSub = mainScene.on('preupdate', () => {
      const merged = mergeActiveDirections(chrome.getActiveDirections(), keyboard.getActiveDirections());
      const v = chromeMoveVelocityFromActiveDirections(merged, CHROME_MOVE_SPEED);
      actor.vel = vec(v.x, v.y);
      actor.z = isoCharacterZFromWorldPos(actor.pos);
      const now = performance.now();
      const pulse = now < merchantPulseEnd;
      const mScale = merchantCharacterScale * (pulse ? 1.1 : 1);
      merchantActor.scale = vec(merchantFacesRight ? mScale : -mScale, mScale);
      if (v.x > 0) {
        facingRight = true;
      } else if (v.x < 0) {
        facingRight = false;
      }
      actor.scale = vec(facingRight ? characterScale : -characterScale, characterScale);
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
    });

    if (import.meta.hot) {
      import.meta.hot.dispose(() => {
        merchantMenu.close();
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
