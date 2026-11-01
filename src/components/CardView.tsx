import { getCard, orientedMoves, type Player } from '../game/cards';
import { GLYPHS, MARKS } from '../art/generated';
import { SchoolSeal } from '../art/marks';
import { SCHOOL, describeMoves } from '../schools';

interface Props {
  name: string;
  /** The player whose perspective the move grid is drawn from (the holder). */
  holder: Player;
  /** Rotate the whole card 180 degrees on screen (for the red player's side). */
  flipped?: boolean;
  selected?: boolean;
  usable?: boolean;
  /** The side card: lying in the tray of the player who takes it next. */
  resting?: boolean;
  onClick?: () => void;
}

/**
 * A move card: a paper tablet with the stance's name and brush glyph over a
 * 5x5 field of ink dots. The open ring is the piece; filled dots are where it
 * can go, drawn in the card's canonical orientation (forward = up on the card).
 * When the card sits on red's side of the table the whole card is flipped,
 * exactly like the physical game. On a computer, where one person faces the
 * screen, the card stays upright and only its dots turn (see index.css).
 */
export default function CardView({ name, holder, flipped, selected, usable, resting, onClick }: Props) {
  const card = getCard(name);
  const moves = orientedMoves(card, 'blue'); // canonical (blue) orientation
  const filled = new Set(moves.map(([dx, dy]) => `${dx},${dy}`));

  const dots = [];
  for (let row = 0; row < 5; row++) {
    for (let col = 0; col < 5; col++) {
      const dx = col - 2;
      const dy = 2 - row;
      const cx = col * 10 + 5;
      const cy = row * 10 + 5;
      if (dx === 0 && dy === 0) {
        dots.push(<circle key={`${col}-${row}`} className="card-piece" cx={cx} cy={cy} r={3.3} />);
      } else if (filled.has(`${dx},${dy}`)) {
        dots.push(
          <path
            key={`${col}-${row}`}
            className="card-move"
            d={MARKS.blot}
            transform={`translate(${cx - 4.2} ${cy - 4.2}) scale(0.084)`}
          />,
        );
      } else {
        dots.push(<circle key={`${col}-${row}`} className="card-speck" cx={cx} cy={cy} r={0.9} />);
      }
    }
  }

  const state = resting
    ? `Resting, passes to ${SCHOOL[holder]} after their move.`
    : `Held by ${SCHOOL[holder]}.${selected ? ' Chosen.' : ''}${usable === false ? ' No move available.' : ''}`;
  const label = `${name}. ${state} Moves: ${describeMoves(moves)}.`;

  const face = (
    <>
      <svg className="card-glyph" viewBox="0 0 64 64" aria-hidden>
        <path d={GLYPHS[name]} />
      </svg>
      <span className="card-name">{name}</span>
      <SchoolSeal player={card.stamp} className="card-seal" />
      <svg className="card-field" viewBox="0 0 50 50" aria-hidden>
        <g className="card-dots">{dots}</g>
      </svg>
      {resting && <span className="card-next">Next</span>}
    </>
  );

  const shared = {
    className: `card${selected ? ' selected' : ''}${usable === false ? ' unusable' : ''}${resting ? ' resting' : ''}`,
    'data-card': name,
    'data-facing': flipped ? 'red' : 'blue',
  };

  if (!onClick) {
    return (
      <div {...shared} role="img" aria-label={label}>
        {face}
      </div>
    );
  }

  return (
    <button {...shared} type="button" onClick={onClick} aria-label={label} aria-pressed={!!selected} aria-disabled={usable === false}>
      {face}
    </button>
  );
}
