import './styles.css';

import { Actor, Color, Scene, vec } from 'excalibur';

import { createSampleAtlasLoader } from './art/atlasLoader';
import { spriteSheetFromPackedImageSource } from './art/packedSpriteSheet';
import { parsePackedAtlasOrderedJson } from './art/atlasTypes';
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

const { loader, atlasJsonResource, atlasImageSource } = createSampleAtlasLoader();

void engine
  .start('main', { loader })
  .then(() => {
    const atlas = parsePackedAtlasOrderedJson(atlasJsonResource.data);
    if (!atlasImageSource.isLoaded()) {
      throw new Error('Expected atlas ImageSource to be loaded after preload');
    }
    if (atlas.sourceViews.length < 1) {
      throw new Error('Expected at least one packed atlas frame');
    }
    const sheet = spriteSheetFromPackedImageSource(atlasImageSource, atlas);
    const sprite = sheet.getSprite(0, 0);
    const actor = new Actor({
      pos: vec(VIEWPORT_SIZE / 2, VIEWPORT_SIZE / 2),
      scale: vec(64, 64),
    });
    actor.graphics.use(sprite);
    mainScene.add(actor);

    const chrome = attachDirectionalChrome(root);
    const chromeMoveSub = mainScene.on('preupdate', () => {
      const v = chromeMoveVelocityFromActiveDirections(chrome.getActiveDirections(), CHROME_MOVE_SPEED);
      actor.vel = vec(v.x, v.y);
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
