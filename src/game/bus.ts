import Phaser from 'phaser';

export interface HudState {
  score: number;
  hits: number;
  totalTargets: number;
  attemptsLeft: number;
  totalAttempts: number;
}

export interface ResultState {
  win: boolean;
  score: number;
  attemptsUsed: number;
}

/**
 * Tiny typed bridge between the Phaser scene and the React HUD.
 * Topics (scene -> react only; UI commands go through requestRestart()):
 *  - 'hud'    (HudState)    emitted on every state change
 *  - 'result' (ResultState) emitted once when the level ends
 */
export const bus = new Phaser.Events.EventEmitter();
