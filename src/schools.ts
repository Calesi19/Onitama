// Display names for the two sides. The engine's 'blue' and 'red' stay as they
// are; only the words and marks on screen change.
import type { Player } from './game/cards';

export const SCHOOL: Record<Player, string> = { blue: 'Indigo', red: 'Vermilion' };

const COLUMNS = 'abcde';

/** Square name from Indigo's side of the table: columns a–e, rows 1–5. */
export function squareName(pos: { x: number; y: number }): string {
  return `${COLUMNS[pos.x]}${pos.y + 1}`;
}

function step(n: number, forward: string, back: string): string | null {
  if (n === 0) return null;
  return `${Math.abs(n)} ${n > 0 ? forward : back}`;
}

/** A card's moves in words, for screen readers. */
export function describeMoves(moves: ReadonlyArray<readonly [number, number]>): string {
  return moves
    .map(([dx, dy]) => [step(dy, 'forward', 'back'), step(dx, 'right', 'left')].filter(Boolean).join(' and '))
    .join('; ');
}
