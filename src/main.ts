import './styles.css';

import { Actor, Animation, AnimationStrategy, Color, Scene, vec } from 'excalibur';

import { createGridSheetLoader } from './art/atlasLoader';
import { parseGridFrameKeysManifestJson } from './art/atlasTypes';
import { spriteSheetFromGridImageSource } from './art/gridSpriteSheet';
import { CHROME_MOVE_SPEED, VIEWPORT_SIZE, createEngine } from './engine';
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

const { loader, spriteRefResource, sheetImageSource } = createGridSheetLoader('art/avatar-character');

void engine
  .start('main', { loader })
  .then(() => {
    const raw = spriteRefResource.data;
    if (raw == null) {
      throw new Error('Expected sprite-ref JSON after preload');
    }
    const gridManifest = parseGridFrameKeysManifestJson(raw);
    if (!sheetImageSource.isLoaded()) {
      throw new Error('Expected character sheet ImageSource loaded after preload');
    }
    const spriteSheet = spriteSheetFromGridImageSource(sheetImageSource, gridManifest);
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

    const actor = new Actor({
      pos: vec(VIEWPORT_SIZE / 2, VIEWPORT_SIZE / 2),
      scale: vec(1, 1),
    });
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
      actor.scale = vec(facingRight ? 1 : -1, 1);
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
