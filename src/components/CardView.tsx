import { getCard, orientedMoves, type Player } from '../game/cards';

interface Props {
  name: string;
  /** The player whose perspective the move grid is drawn from (the holder). */
  holder: Player;
  /** Rotate the whole card 180 degrees on screen (for the red player's side). */
  flipped?: boolean;
  selected?: boolean;
  usable?: boolean;
  onClick?: () => void;
}

/**
 * A move card drawn as a mini 5x5 grid. The centre cell is the pawn; filled
 * cells are the squares it can move to, drawn from the holder's perspective
 * (forward = up on the card). When the card sits on red's side of the table
 * the whole card is flipped, exactly like the physical game.
 */
export default function CardView({ name, holder, flipped, selected, usable, onClick }: Props) {
  const card = getCard(name);
  const moves = orientedMoves(card, 'blue'); // canonical (blue) orientation
  const filled = new Set(moves.map(([dx, dy]) => `${dx},${dy}`));
  // Like the printed cards, the move squares carry the card's own stamp colour.
  const color = card.stamp === 'blue' ? 'var(--blue)' : 'var(--red)';

  const cells = [];
  for (let row = 0; row < 5; row++) {
    for (let col = 0; col < 5; col++) {
      const dx = col - 2;
      const dy = 2 - row;
      const isCenter = dx === 0 && dy === 0;
      const isMove = filled.has(`${dx},${dy}`);
      cells.push(
        <div
          key={`${col}-${row}`}
          className={`card-cell${isCenter ? ' center' : ''}${isMove ? ' move' : ''}`}
          style={isMove ? { background: color } : undefined}
        />,
      );
    }
  }

  return (
    <button
      type="button"
      className={`move-card${selected ? ' selected' : ''}${usable === false ? ' unusable' : ''}`}
      style={{ transform: flipped ? 'rotate(180deg)' : undefined, ['--holder' as string]: color }}
      onClick={onClick}
      aria-label={`${name} move card`}
    >
      <div className="card-grid">{cells}</div>
      <div className="card-name">{name}</div>
      <div
        className="card-stamp"
        title={`${card.stamp === 'blue' ? 'Blue' : 'Red'} starts when this is the side card`}
        style={{ background: card.stamp === 'blue' ? 'var(--blue)' : 'var(--red)' }}
      />
    </button>
  );
}
