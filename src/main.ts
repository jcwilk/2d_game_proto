import './styles.css';

import { Actor, Animation, AnimationStrategy, Color, Scene, vec } from 'excalibur';

import { createGridSheetLoader, mergeGridSheetLoaders } from './art/atlasLoader';
import { parseGridFrameKeysManifestJson } from './art/atlasTypes';
import { spriteSheetFromGridImageSource } from './art/gridSpriteSheet';
import { CHROME_MOVE_SPEED, VIEWPORT_SIZE, createEngine } from './engine';
import {
  CHARACTER_WALK_FRAME_PX,
  FLOOR_SURFACE_CENTER_OFFSET_FROM_CELL_BOTTOM_PX,
  scaleToTargetWidthPx,
  TILE_FOOTPRINT_WIDTH_PX,
} from './dimensions';
import { attachDirectionalChrome, chromeMoveVelocityFromActiveDirections } from './input/directionalChrome';

const root = document.querySelector<HTMLDivElement>('#game-root');
if (!root) {
  throw new Error('Missing #game-root element');
}

const engine = createEngine({
  canvasElementId: 'game-canvas',
  suppressPlayButton: true,
});

const mainScene = new Scene();
mainScene.backgroundColor = Color.fromHex('#1a1a2e');

engine.addScene('main', mainScene);

const characterAssets = createGridSheetLoader('art/avatar-character');
const floorAssets = createGridSheetLoader('art/isometric-open-floor');
const loader = mergeGridSheetLoaders(characterAssets, floorAssets);

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
    const floorPick = Math.floor(Math.random() * floorFrameIds.length);
    const floorVariantId = floorFrameIds[floorPick] ?? 'floor_0';

    const floorRaw = floorAssets.spriteRefResource.data;
    if (floorRaw == null) {
      throw new Error('Expected isometric floor sprite-ref JSON after preload');
    }
    const floorManifest = parseGridFrameKeysManifestJson(floorRaw);
    if (!floorAssets.sheetImageSource.isLoaded()) {
      throw new Error('Expected floor sheet ImageSource loaded after preload');
    }
    const floorSpriteSheet = spriteSheetFromGridImageSource(floorAssets.sheetImageSource, floorManifest);
    const floorCell = floorManifest.frames[floorVariantId];
    if (!floorCell) {
      throw new Error(`Missing floor sprite-ref frame ${JSON.stringify(floorVariantId)}`);
    }
    const floorGraphic = floorSpriteSheet.getSprite(floorCell.column, floorCell.row);

    const leadWalkSprite = sprites[0];
    if (!leadWalkSprite) {
      throw new Error('Expected at least one walk animation frame');
    }

    const floorScale = scaleToTargetWidthPx(floorGraphic.width, TILE_FOOTPRINT_WIDTH_PX);
    const characterScale = scaleToTargetWidthPx(leadWalkSprite.width, CHARACTER_WALK_FRAME_PX);

    /**
     * Fixed world anchor: **bottom center** of the iso cell (front corner of the floor tile). Same for any entity
     * “in” this cell — see `FLOOR_SURFACE_CENTER_OFFSET_FROM_CELL_BOTTOM_PX` in `dimensions.ts`.
     */
    const cellBottomCenter = vec(VIEWPORT_SIZE / 2, VIEWPORT_SIZE * 0.52);

    /** Floor stand / rhombus centroid: `FLOOR_SURFACE_CENTER_OFFSET_FROM_CELL_BOTTOM_PX` above cell bottom (Excalibur +Y down). */
    const floorStandWorld = vec(
      cellBottomCenter.x,
      cellBottomCenter.y - FLOOR_SURFACE_CENTER_OFFSET_FROM_CELL_BOTTOM_PX,
    );

    const floorActor = new Actor({
      pos: cellBottomCenter,
      scale: vec(floorScale, floorScale),
      z: 0,
    });
    floorActor.graphics.anchor = vec(0.5, 1);
    floorActor.graphics.use(floorGraphic);
    mainScene.add(floorActor);

    const actor = new Actor({
      pos: floorStandWorld,
      scale: vec(characterScale, characterScale),
      z: 1,
    });
    actor.graphics.anchor = vec(0.5, 1);
    actor.graphics.use(walkAnim);
    mainScene.add(actor);

    /** Horizontal flip: left-facing until the player moves right again (vertical-only keeps last facing). */
    let facingRight = true;

    const chrome = attachDirectionalChrome(root);
    const chromeMoveSub = mainScene.on('preupdate', () => {
      const v = chromeMoveVelocityFromActiveDirections(chrome.getActiveDirections(), CHROME_MOVE_SPEED);
      actor.vel = vec(v.x, v.y);
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
    });

    if (import.meta.hot) {
      import.meta.hot.dispose(() => {
        chrome.detach();
        chromeMoveSub.close();
      });
    }
  })
  .catch((err: unknown) => {
    console.error('Engine failed to start', err);
  });
