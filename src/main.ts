import './styles.css';

import { Color, Scene } from 'excalibur';

import { createSampleAtlasLoader } from './art/atlasLoader';
import { parsePackedAtlasOrderedJson } from './art/atlasTypes';
import { createEngine } from './engine';

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
  })
  .catch((err: unknown) => {
    console.error('Engine failed to start', err);
  });
