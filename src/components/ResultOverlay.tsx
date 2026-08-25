import { useEffect, useState } from 'react';
import { bus, type ResultState } from '../game/bus';

interface ResultOverlayProps {
  onRestart: () => void;
}

export default function ResultOverlay({ onRestart }: ResultOverlayProps) {
  const [result, setResult] = useState<ResultState | null>(null);

  useEffect(() => {
    const onResult = (r: ResultState) => setResult(r);
    const onHud = () => setResult(null);
    bus.on('result', onResult);
    bus.on('hud', onHud);
    return () => {
      bus.off('result', onResult);
      bus.off('hud', onHud);
    };
  }, []);

  if (!result) return null;

  return (
    <div
      className="absolute inset-0 z-20 grid place-items-center p-4"
      style={{ backgroundColor: 'rgba(20,20,20,0.82)' }}
    >
      <div className="animate-pop w-[min(90vw,420px)] border border-[var(--dark)] bg-[var(--carbon)] shadow-[8px_8px_0_0_rgba(0,0,0,0.45)]">
        <div className="flex items-center justify-between border-b border-[var(--dark)] bg-[var(--ash)] px-[12px] py-[7px]">
          <span className="text-[11px] tracking-[0.22em] text-[var(--carbon)]">
            {result.win ? 'RUN_COMPLETE.EXE' : 'RUN_OVER.EXE'}
          </span>
        </div>

        <div className="px-[18px] pb-[18px] pt-[16px]">
          <div className="flex items-baseline justify-between">
            <span className="text-[11px] tracking-[0.18em] text-[var(--ash)]">SCORE</span>
            <span className="text-[34px] leading-none text-[var(--amber)]">
              {String(result.score).padStart(3, '0')}
            </span>
          </div>

          <div className="mt-[12px] flex items-center justify-between text-[11px] tracking-[0.14em] text-[var(--smoke)]">
            <span>FLICKS USED</span>
            <span className="text-[var(--enamel)]">{result.attemptsUsed}</span>
          </div>

          {!result.win && (
            <p className="mt-[12px] text-[11px] leading-[16px] text-[var(--clay)]">
              Run finished. Line up the angle and charge longer.
            </p>
          )}

          <button
            type="button"
            onClick={onRestart}
            className="mt-[18px] w-full border border-[var(--dark)] py-[10px] text-[12px] tracking-[0.25em] text-[var(--enamel)] transition-colors hover:border-[var(--amber)] hover:bg-[var(--amber)] hover:text-[var(--black)] active:translate-y-px"
          >
            PLAY AGAIN<span className="blink-block">_</span>
          </button>
        </div>
      </div>
    </div>
  );
}
