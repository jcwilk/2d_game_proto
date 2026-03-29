import './styles.css';

import { Actor, Animation, AnimationStrategy, Color, Scene, vec } from 'excalibur';

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

    for (let gx = 0; gx < gridSize; gx++) {
      for (let gy = 0; gy < gridSize; gy++) {
        const variantIndex = Math.floor(Math.random() * floorGraphics.length);
        const floorGraphic = floorGraphics[variantIndex] ?? floorGraphic0;
        const offset = vec(
          (gx - gy) * isoHalfW,
          (gx + gy - 2 * centerG) * isoHalfH,
        );
        const floorActor = new Actor({
          pos: cellBottomCenter.add(offset),
          scale: vec(floorScale, floorScale),
          z: gx + gy,
        });
        floorActor.graphics.anchor = vec(0.5, 1);
        floorActor.graphics.use(floorGraphic);
        mainScene.add(floorActor);
      }
    }

    const actor = new Actor({
      pos: cellBottomCenter,
      scale: vec(characterScale, characterScale),
      z: floorZMax + 1,
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
