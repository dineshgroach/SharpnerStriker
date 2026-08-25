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
  // Fluid but much smaller floor for phones: was clamp(22.5px, ...) which never shrank below 22.5px and overlapped the page.
  fontSize: 'clamp(11px, 0.95vw + 7.5px, 30px)',
};

const btnCls =
  'pointer-events-auto whitespace-nowrap border border-[var(--dark)] bg-[var(--carbon)]/85 px-[0.5em] py-[0.34em] leading-none text-[0.48em] tracking-[0.11em] text-[var(--cement)] transition-colors hover:border-[var(--amber)] hover:bg-[var(--amber)] hover:text-[var(--black)] active:translate-y-px sm:px-[0.55em] sm:py-[0.4em] sm:text-[0.52em]';

function Cell({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-[0.18em] border-l border-[var(--dark)] px-[0.46em] py-[0.36em] first:border-l-0 sm:gap-[0.22em] sm:px-[0.62em] sm:py-[0.44em]">
      <span className="text-[0.42em] tracking-[0.18em] text-[var(--ash)] sm:text-[0.46em] sm:tracking-[0.22em]">{label}</span>
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
        className="pointer-events-none absolute inset-x-0 top-0 z-10 flex flex-wrap items-start justify-between gap-x-[0.6em] gap-y-[0.45em] p-[0.5em] sm:p-[0.8em]"
        style={hudScale}
      >
        <div className="flex min-w-0 flex-1 flex-col items-start gap-[0.38em] sm:gap-[0.5em]" style={{ fontSize: '0.8em' }}>
          <div className="flex max-w-full flex-wrap items-start gap-y-1">
            <span className="bg-[var(--aluminum)] px-[0.34em] py-[0.22em] text-[0.9em] leading-none text-[var(--soot)] sm:text-[1.02em]">
              SHARPENER FLICK
            </span>
            <sup className="ml-[0.24em] mt-[0.1em] text-[0.42em] text-[var(--ash)] sm:text-[0.44em]">
              v1.0
            </sup>
          </div>

          <div
            className="flex max-w-full flex-wrap border border-[var(--dark)] bg-[var(--carbon)]/85"
            style={{ fontSize: 'clamp(11px, 1.18em, 1.5em)' }}
          >
            <Cell label="SCORE">
              <span className="text-[0.68em] leading-none text-[var(--amber)] sm:text-[0.74em]">
                {String(hud.score).padStart(3, '0')}
              </span>
            </Cell>
            <Cell label="PAGES">
              <span className="text-[0.68em] leading-none text-[var(--enamel)] sm:text-[0.74em]">
                {hud.hits}/{hud.totalTargets}
              </span>
            </Cell>
            <Cell label="FLICKS">
              <div className="flex flex-wrap gap-[0.14em] pt-[0.1em] sm:gap-[0.16em] sm:pt-[0.14em]">
                {Array.from({ length: hud.totalAttempts }).map((_, i) => (
                  <span
                    key={i}
                    className={`h-[0.42em] w-[0.42em] sm:h-[0.48em] sm:w-[0.48em] ${
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

        <div className="flex max-w-full shrink-0 flex-wrap items-start justify-end gap-[0.28em] sm:gap-[0.32em]">
          <button type="button" onClick={() => setMuted(!sfx.toggle())} className={btnCls}>
            {muted ? '[SOUND OFF]' : '[SOUND ON]'}
          </button>
          <button type="button" onClick={onRestart} className={btnCls}>
            [RESET]
          </button>
        </div>
      </div>

      {/* Bottom hints: row on desktop, stacked centered on phones to avoid overlapping the page */}
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 z-10 hidden justify-between gap-x-3 px-3 pb-[10px] text-[var(--clay)] sm:flex sm:px-4"
        style={{ fontSize: 'clamp(9px, 0.6vw + 5px, 12px)' }}
      >
        <span className="truncate">{'AIM with POINTER · HOLD to CHARGE · RELEASE to FLICK'}</span>
        <span className="shrink-0">{'LAND ON an IMAGE to SCORE'}</span>
      </div>
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex flex-col items-center gap-0 px-2 pb-[6px] text-center leading-none text-[var(--clay)] sm:hidden"
        style={{ fontSize: '8.5px', letterSpacing: '0.06em' }}
      >
        <span>{'AIM · HOLD · FLICK'}</span>
        <span className="opacity-80">{'LAND ON IMAGE to SCORE'}</span>
      </div>
    </>
  );
}
