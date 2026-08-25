import { useCallback, useEffect, useRef } from 'react';
import type Phaser from 'phaser';
import Hud from './components/Hud';
import ResultOverlay from './components/ResultOverlay';

// Dynamic import — lets React (Hud/ResultOverlay) paint before the ~1.7 MB Phaser
// chunk downloads. Improves FCP on slow GitHub Pages connections.
type GameModule = typeof import('./game/game');

export default function App() {
  const hostRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const gameModuleRef = useRef<GameModule | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let cancelled = false;
    void import('./game/game').then((mod) => {
      if (cancelled || !hostRef.current) return;
      gameModuleRef.current = mod;
      const game = mod.createGame(host);
      gameRef.current = game;
    });
    return () => {
      cancelled = true;
      const g = gameRef.current;
      gameRef.current = null;
      gameModuleRef.current = null;
      if (g) g.destroy(true);
    };
  }, []);

  const handleRestart = useCallback(() => {
    if (gameModuleRef.current) {
      gameModuleRef.current.requestRestart(gameRef.current);
    }
  }, []);

  return (
    <div className="relative h-full w-full select-none">
      <div ref={hostRef} className="absolute inset-0" />
      <Hud onRestart={handleRestart} />
      <ResultOverlay onRestart={handleRestart} />
    </div>
  );
}
