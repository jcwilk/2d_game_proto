import './styles.css';

import { Color, Scene } from 'excalibur';

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

void engine.start('main').catch((err: unknown) => {
  console.error('Engine failed to start', err);
});
