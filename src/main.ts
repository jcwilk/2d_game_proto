import './styles.css';

import { Actor, Animation, AnimationStrategy, Color, Scene, Sprite, vec } from 'excalibur';

import {
  CHARACTER_WALK_FRAME_IDS,
  createCharacterWalkLoader,
} from './art/atlasLoader';
import { parseFrameKeyRectManifestJson } from './art/atlasTypes';
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

const { loader, spriteRefResource, imageSources } = createCharacterWalkLoader();

void engine
  .start('main', { loader })
  .then(() => {
    const raw = spriteRefResource.data;
    if (raw == null) {
      throw new Error('Expected sprite-ref JSON after preload');
    }
    const ref = parseFrameKeyRectManifestJson(raw);
    for (let i = 0; i < imageSources.length; i++) {
      const src = imageSources[i];
      if (!src) {
        throw new Error(`Missing character ImageSource at index ${i}`);
      }
      if (!src.isLoaded()) {
        throw new Error(`Expected character frame ImageSource loaded after preload (index ${i})`);
      }
    }
    const firstKey = CHARACTER_WALK_FRAME_IDS[0];
    const firstRect = ref.frames[firstKey];
    if (!firstRect) {
      throw new Error(`Expected sprite-ref frames[${JSON.stringify(firstKey)}]`);
    }
    const displaySize = firstRect.width;
    const sprites = CHARACTER_WALK_FRAME_IDS.map((id, i) => {
      if (!ref.frames[id]) {
        throw new Error(`Missing sprite-ref frame ${JSON.stringify(id)}`);
      }
      const src = imageSources[i];
      if (!src) {
        throw new Error(`Missing character ImageSource at index ${i}`);
      }
      return Sprite.from(src, {
        destSize: { width: displaySize, height: displaySize },
      });
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
