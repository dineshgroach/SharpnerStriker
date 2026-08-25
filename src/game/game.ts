import Phaser from 'phaser';
import { GameScene, WORLD_WIDTH, WORLD_HEIGHT } from './scenes/GameScene';
import { physicsConfig } from './physics/physicsConfig';
import { setCanvasZoom } from './scale';

/**
 * Sizes the canvas to the host element at native device pixels and zooms the
 * camera so the world (WORLD_WIDTH x WORLD_HEIGHT) letterboxes like FIT mode.
 * Rendering at device resolution keeps the page texture pixel-sharp instead
 * of letting the browser blur a CSS-scaled canvas.
 */
function fitCanvasToScreen(game: Phaser.Game, host: HTMLElement) {
  const dpr = window.devicePixelRatio || 1;
  const cssW = host.clientWidth;
  const cssH = host.clientHeight;
  if (cssW === 0 || cssH === 0) {
    requestAnimationFrame(() => fitCanvasToScreen(game, host));
    return;
  }

  const canvasW = Math.round(cssW * dpr);
  const canvasH = Math.round(cssH * dpr);
  const zoom = Math.min(canvasW / WORLD_WIDTH, canvasH / WORLD_HEIGHT);

  // Set before resize() so RESIZE handlers (e.g. the scene's texture re-render)
  // already see the new zoom.
  setCanvasZoom(zoom);

  game.scale.resize(canvasW, canvasH);

  // Pin the canvas to the host: absolute positioning makes it fill the host
  // exactly, so it is always centered regardless of ScaleManager margins.
  const canvas = game.canvas;
  canvas.style.position = 'absolute';
  canvas.style.left = '0px';
  canvas.style.top = '0px';
  canvas.style.marginLeft = '0px';
  canvas.style.marginTop = '0px';
  canvas.style.width = `${cssW}px`;
  canvas.style.height = `${cssH}px`;

  // Center the camera on the world so the letterbox is symmetric.
  const scene = game.scene.getScene('GameScene');
  if (scene) {
    scene.cameras.main.setZoom(zoom);
    scene.cameras.main.centerOn(WORLD_WIDTH / 2, WORLD_HEIGHT / 2);
  }
}

export function createGame(parent: HTMLElement): Phaser.Game {
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: WORLD_WIDTH,
    height: WORLD_HEIGHT,
    backgroundColor: '#141414',
    scale: {
      mode: Phaser.Scale.NONE,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: WORLD_WIDTH,
      height: WORLD_HEIGHT,
    },
    physics: {
      default: 'matter',
      matter: {
        gravity: physicsConfig.gravity,
      },
    },
  });

  const fit = () => fitCanvasToScreen(game, parent);
  window.addEventListener('resize', fit);
  game.events.once(Phaser.Core.Events.DESTROY, () => {
    window.removeEventListener('resize', fit);
  });

  fit();
  game.scene.add('GameScene', GameScene, true);

  return game;
}

/**
 * Directly restarts the level on this game's scene. Called imperatively from
 * the React HUD — no shared event bus involved, so a stale or destroyed game
 * instance can never swallow the request.
 */
export function requestRestart(game: Phaser.Game | null): void {
  if (!game) return;
  const scene = game.scene.getScene('GameScene');
  if (scene && scene.sys.isActive()) {
    (scene as GameScene).restartLevel();
  }
}