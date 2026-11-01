import type { Player } from '../game/cards';
import { MARKS } from './generated';

/** School crest: a ring for Vermilion, a diamond for Indigo. Colour is never the only cue. */
export function Crest({ player, x = 50, y = 50, size = 26 }: { player: Player; x?: number; y?: number; size?: number }) {
  if (player === 'red') {
    return <circle cx={x} cy={y} r={size * 0.76} fill="none" stroke="currentColor" strokeWidth={size * 0.42} />;
  }
  return <path d={`M${x} ${y - size}L${x + size} ${y}L${x} ${y + size}L${x - size} ${y}Z`} fill="currentColor" />;
}

/** A hanko: round for Vermilion, square for Indigo, with the crest carved out. */
export function SchoolSeal({ player, className = '' }: { player: Player; className?: string }) {
  return (
    <svg className={`seal seal-${player} ${className}`} viewBox="0 0 100 100" aria-hidden>
      <path className="seal-face" d={player === 'red' ? MARKS.sealRound : MARKS.seal} />
      <g className="seal-cut">
        <Crest player={player} />
      </g>
    </svg>
  );
}

/** The game's own seal: a torii cut from a vermilion block, one stone beneath it. */
export function LogoSeal({ className = '' }: { className?: string }) {
  return (
    <svg className={`logo-seal ${className}`} viewBox="0 0 100 100" aria-hidden>
      <path className="logo-face" d={MARKS.seal} />
      <path className="logo-cut" d={MARKS.sealCut} />
    </svg>
  );
}

export function Torii({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 64 64" aria-hidden>
      <path d={MARKS.torii} fill="currentColor" />
    </svg>
  );
}

export function BrushRule({ variant = 'strokeA', className = '' }: { variant?: 'strokeA' | 'strokeB'; className?: string }) {
  return (
    <svg className={`brush-rule ${className}`} viewBox="0 0 400 14" preserveAspectRatio="none" aria-hidden>
      <path d={MARKS[variant]} fill="currentColor" />
    </svg>
  );
}

/**
 * Students are river stones; the Master is a tall tablet whose tip points at
 * the enemy. The school reads from colour, crest and which way the tip points.
 */
export function Piece({ player, master }: { player: Player; master: boolean }) {
  const shape = master ? MARKS.master : MARKS.student;
  // Vermilion's Master points down the screen, toward Indigo.
  const turned = master && player === 'red';
  const turn = turned ? 'rotate(180 50 50)' : '';
  const crestY = master ? (turned ? 43 : 57) : 50;
  return (
    <svg className={`piece piece-${player}${master ? ' piece-master' : ''}`} viewBox="0 0 100 106" aria-hidden>
      <path className="piece-shadow" d={shape} transform={`translate(0 5) ${turn}`} />
      <path className="piece-body" d={shape} transform={turn} />
      <g className="piece-crest">
        <Crest player={player} y={crestY} size={master ? 19 : 16} />
      </g>
    </svg>
  );
}
