import './styles.css';

const root = document.querySelector<HTMLDivElement>('#game-root');
if (!root) {
  throw new Error('Missing #game-root element');
}
root.textContent = '2D game prototype';
