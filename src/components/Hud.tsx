import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { bus, type HudState } from '../game/bus';
import { sfx } from '../game/audio';

interface HudProps {
  onRestart: () => void;
}

const emptyHud: HudState = {
  score: 0,
  hits: 0,
  totalTargets: 0,
  attemptsLeft: 0,
  totalAttempts: 0,
};

const hudScale: CSSProperties = {
  // General responsive: scales with vmin so it tracks page zoom (zoom = min(vw,vh)).
  // Keeps original 40.5px max on 27" but shrinks on 1800x1320, 14" and phones to prevent FLICKS overlap.
  fontSize: 'clamp(11px, 1.15vmin + 0.55vw + 0.35vh + 4px, 40.5px)',
};

const btnCls =
  'pointer-events-auto border border-[var(--dark)] bg-[var(--carbon)]/85 px-[0.55em] py-[0.4em] leading-none text-[0.52em] tracking-[0.12em] text-[var(--cement)] transition-colors hover:border-[var(--amber)] hover:bg-[var(--amber)] hover:text-[var(--black)] active:translate-y-px';

function Cell({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-[0.22em] border-l border-[var(--dark)] px-[0.62em] py-[0.44em] first:border-l-0">
      <span className="text-[0.46em] tracking-[0.22em] text-[var(--ash)]">{label}</span>
      {children}
    </div>
  );
}

export default function Hud({ onRestart }: HudProps) {
  const [hud, setHud] = useState<HudState>(emptyHud);
  const [muted, setMuted] = useState(!sfx.enabled);

  useEffect(() => {
    const onUpdate = (s: HudState) => setHud(s);
    bus.on('hud', onUpdate);
    return () => {
      bus.off('hud', onUpdate);
    };
  }, []);

  return (
    <>
      <div
        className="hud-root pointer-events-none absolute inset-x-0 top-0 z-10 flex flex-wrap items-start justify-between gap-x-[0.6em] gap-y-[0.45em] p-[0.8em]"
        style={hudScale}
      >
        <div className="flex flex-col items-start gap-[0.5em]" style={{ fontSize: '0.8em' }}>
          <div className="flex items-start">
            <span className="bg-[var(--aluminum)] px-[0.34em] py-[0.22em] text-[1.02em] leading-none text-[var(--soot)]">
              SHARPENER FLICK
            </span>
            <sup className="ml-[0.24em] mt-[0.1em] text-[0.44em] text-[var(--ash)]">
              v1.0
            </sup>
          </div>

          <div className="flex border border-[var(--dark)] bg-[var(--carbon)]/85" style={{ fontSize: '1.5em' }}>
            <Cell label="SCORE">
              <span className="text-[0.74em] leading-none text-[var(--amber)]">
                {String(hud.score).padStart(3, '0')}
              </span>
            </Cell>
            <Cell label="PAGES">
              <span className="text-[0.74em] leading-none text-[var(--enamel)]">
                {hud.hits}/{hud.totalTargets}
              </span>
            </Cell>
            <Cell label="FLICKS">
              <div className="flex gap-[0.16em] pt-[0.14em]">
                {Array.from({ length: hud.totalAttempts }).map((_, i) => (
                  <span
                    key={i}
                    className={`h-[0.48em] w-[0.48em] ${
                      i < hud.attemptsLeft
                        ? 'bg-[var(--amber)]'
                        : 'border border-[var(--smoke)] bg-transparent'
                    }`}
                  />
                ))}
              </div>
            </Cell>
          </div>
        </div>

        <div className="flex items-start gap-[0.32em]">
          <button type="button" onClick={() => setMuted(!sfx.toggle())} className={btnCls}>
            {muted ? '[SOUND OFF]' : '[SOUND ON]'}
          </button>
          <button type="button" onClick={onRestart} className={btnCls}>
            [RESET]
          </button>
        </div>
      </div>

      <div
        className="pointer-events-none absolute bottom-[12px] left-[16px] z-10 text-[var(--clay)]"
        style={{ fontSize: 'clamp(10px, 0.75vw + 5px, 15px)' }}
      >
        {'AIM with POINTER · HOLD to CHARGE · RELEASE to FLICK'}
      </div>

      <div
        className="pointer-events-none absolute bottom-[12px] right-[16px] z-10 text-[var(--clay)]"
        style={{ fontSize: 'clamp(10px, 0.75vw + 5px, 15px)' }}
      >
        {'LAND ON an IMAGE to SCORE'}
      </div>
    </>
  );
}
