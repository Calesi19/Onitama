import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import {
  applyMove,
  applyPass,
  createGame,
  legalMoves,
  opponent,
  pieceAt,
  templeOf,
  type GameState,
  type Move,
  type Pos,
} from '../game/engine';
import type { Player } from '../game/cards';
import { MARKS } from '../art/generated';
import { BrushRule, Piece, SchoolSeal, Torii } from '../art/marks';
import { SCHOOL, squareName } from '../schools';
import { useNightDojo } from '../theme';
import CardView from './CardView';
import { useDuelMotion } from './useDuelMotion';

interface Props {
  onHome: () => void;
}

const key = (p: Pos) => `${p.x},${p.y}`;

/** Percent offsets for a mark placed on the board, from the top-left corner. */
const cellStyle = (p: Pos) => ({ left: `${p.x * 20}%`, top: `${(4 - p.y) * 20}%` });

function useModal() {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);
  return ref;
}

function DuelMenu({ facing, onClose, onRestart, onHome }: { facing: Player; onClose: () => void; onRestart: () => void; onHome: () => void }) {
  const ref = useModal();
  const { night, toggle } = useNightDojo();
  return (
    <dialog ref={ref} className="sheet" data-facing={facing} aria-label="Duel menu" onClose={onClose}>
      <p className="sheet-title">The duel is paused</p>
      <BrushRule variant="strokeB" className="sheet-rule" />
      <button type="button" className="sheet-item" onClick={onClose}>Return to the table</button>
      <button type="button" className="sheet-item" onClick={toggle}>{night ? 'Light the room' : 'Night dojo'}</button>
      <button type="button" className="sheet-item" onClick={onRestart}>Begin anew</button>
      <button type="button" className="sheet-item" onClick={onHome}>Leave the duel</button>
    </dialog>
  );
}

function Rite({ game, onAgain, onHome }: { game: GameState; onAgain: () => void; onHome: () => void }) {
  const ref = useModal();
  const winner = game.winner!;
  const stone = game.winKind === 'capture';
  return (
    <dialog
      ref={ref}
      className="rite"
      data-facing={winner}
      aria-labelledby="rite-way"
      aria-describedby="rite-line"
      onCancel={(e) => e.preventDefault()}
    >
      <div className="rite-inner">
        <svg className={`rite-seal rite-seal-${winner}`} viewBox="0 0 100 100" aria-hidden>
          <path className="rite-face" d={winner === 'red' ? MARKS.sealRound : MARKS.seal} />
          <path
            className="rite-cut"
            d={stone ? MARKS.stone : MARKS.stream}
            transform="translate(23 23) scale(0.54)"
          />
        </svg>
        <p className="rite-school">{SCHOOL[winner]} prevails</p>
        <h2 className="rite-way" id="rite-way">{stone ? 'Way of the Stone' : 'Way of the Stream'}</h2>
        <p className="rite-line" id="rite-line">
          {stone ? 'The enemy Master has fallen.' : 'The Master stands beneath the enemy Arch.'}
        </p>
        <BrushRule className="rite-rule" />
        <div className="rite-actions">
          <button type="button" className="btn btn-ink" onClick={onAgain}>Duel again</button>
          <button type="button" className="btn btn-quiet" onClick={onHome}>Leave the table</button>
        </div>
      </div>
    </dialog>
  );
}

export default function GameScreen({ onHome }: Props) {
  const [game, setGame] = useState<GameState>(() => createGame());
  const [selCard, setSelCard] = useState<string | null>(null);
  const [selFrom, setSelFrom] = useState<Pos | null>(null);
  const [lastMove, setLastMove] = useState<{ from: Pos; to: Pos } | null>(null);
  const [menuFor, setMenuFor] = useState<Player | null>(null);
  const [cursor, setCursor] = useState<Pos>({ x: 2, y: 0 });
  const tableRef = useRef<HTMLDivElement>(null);
  const motion = useDuelMotion(game, lastMove, tableRef);

  // Each new game is a fresh deal: remounting replays the opening ink.
  const deal = useRef({ count: 0, game });
  if (game !== deal.current.game) {
    if (game.plies === 0) deal.current.count += 1;
    deal.current.game = game;
  }

  const turn = game.turn;
  const moves = useMemo(() => legalMoves(game, turn), [game, turn]);
  const passNeeded = !game.winner && moves.length === 0;

  const destinations = useMemo(() => {
    if (!selCard || !selFrom) return new Map<string, Move>();
    const map = new Map<string, Move>();
    for (const m of moves) {
      if (m.card === selCard && m.from.x === selFrom.x && m.from.y === selFrom.y) {
        map.set(key(m.to), m);
      }
    }
    return map;
  }, [moves, selCard, selFrom]);

  const movablePawns = useMemo(() => {
    if (!selCard) return new Set<string>();
    return new Set(moves.filter((m) => m.card === selCard).map((m) => key(m.from)));
  }, [moves, selCard]);

  function clearSelection() {
    setSelCard(null);
    setSelFrom(null);
  }

  function doMove(move: Move) {
    motion.snapshot();
    setGame(applyMove(game, move));
    setLastMove({ from: move.from, to: move.to });
    clearSelection();
  }

  function doPass(cardName: string) {
    motion.snapshot();
    setGame(applyPass(game, cardName));
    setLastMove(null);
    clearSelection();
  }

  function onCardTap(player: Player, cardName: string) {
    if (game.winner || player !== turn) return;
    if (passNeeded) {
      doPass(cardName);
      return;
    }
    if (selCard === cardName) {
      setSelCard(null);
      return;
    }
    setSelCard(cardName);
    // If a pawn is selected but cannot use this card, release it.
    if (selFrom && !moves.some((m) => m.card === cardName && m.from.x === selFrom.x && m.from.y === selFrom.y)) {
      setSelFrom(null);
    }
  }

  function onSquareTap(pos: Pos) {
    if (game.winner || passNeeded) return;
    const dest = destinations.get(key(pos));
    if (dest) {
      doMove(dest);
      return;
    }
    const piece = pieceAt(game, pos);
    if (piece && piece.player === turn) {
      const cardsForPawn = [...new Set(moves.filter((m) => m.from.x === pos.x && m.from.y === pos.y).map((m) => m.card))];
      if (cardsForPawn.length === 0) return; // this pawn cannot move this turn
      setSelFrom(pos);
      if (selCard && cardsForPawn.includes(selCard)) return;
      if (cardsForPawn.length === 1) setSelCard(cardsForPawn[0]);
      else if (selCard) setSelCard(null);
    } else {
      setSelFrom(null);
    }
  }

  function newGame() {
    setGame(createGame());
    setLastMove(null);
    clearSelection();
  }

  function onBoardKey(e: KeyboardEvent<HTMLDivElement>) {
    const step = { ArrowUp: [0, 1], ArrowDown: [0, -1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] }[e.key];
    if (!step) return;
    e.preventDefault();
    const next = { x: Math.min(4, Math.max(0, cursor.x + step[0])), y: Math.min(4, Math.max(0, cursor.y + step[1])) };
    setCursor(next);
    e.currentTarget.querySelector<HTMLElement>(`[data-cell="${key(next)}"]`)?.focus();
  }

  const status = (() => {
    if (game.winner) return '';
    if (passNeeded) return 'No legal move: give up a card.';
    if (selCard && selFrom) return 'Place it on an ink mark.';
    if (selCard) return `${selCard}: now choose a piece.`;
    if (selFrom) return 'Now choose its card.';
    return 'Choose a card or piece.';
  })();

  const capturedBy = (player: Player) => {
    const foe = opponent(player);
    const remaining = game.board.filter((p) => p?.player === foe).length;
    return 5 - remaining;
  };

  const seat = (player: Player) => {
    const isTurn = turn === player && !game.winner;
    const captured = capturedBy(player);
    return (
      <section className={`seat seat-${player}${isTurn ? ' active' : ''}`} aria-label={`${SCHOOL[player]} school`}>
        <div className="rail">
          <SchoolSeal player={player} className="rail-seal" />
          <p className="rail-text">
            <span className="rail-school">{SCHOOL[player]}</span>
            <span className="rail-status">{isTurn ? status : game.winner ? '' : 'Waits.'}</span>
          </p>
          {captured > 0 && (
            <span className="taken" role="img" aria-label={`${captured} taken`}>
              {Array.from({ length: captured }).map((_, i) => (
                <SchoolSeal key={i} player={opponent(player)} className="taken-mark" />
              ))}
            </span>
          )}
          <button type="button" className="rail-menu" aria-label="Open the duel menu" onClick={() => setMenuFor(player)}>
            <span aria-hidden />
          </button>
          <BrushRule className="rail-rule" />
        </div>
        <div className="hand">
          {game.hands[player].map((cardName) => (
            <CardView
              key={cardName}
              name={cardName}
              holder={player}
              flipped={player === 'red'}
              selected={isTurn && selCard === cardName}
              usable={player !== turn ? undefined : passNeeded ? true : moves.some((m) => m.card === cardName)}
              onClick={() => onCardTap(player, cardName)}
            />
          ))}
          <div className="tray">
            {turn === player && <CardView key={game.sideCard} name={game.sideCard} holder={player} flipped={player === 'red'} resting />}
          </div>
        </div>
      </section>
    );
  };

  const cells = [];
  for (let y = 4; y >= 0; y--) {
    for (let x = 0; x < 5; x++) {
      const pos = { x, y };
      const piece = pieceAt(game, pos);
      const isTemple = (x === templeOf('blue').x && y === templeOf('blue').y) || (x === templeOf('red').x && y === templeOf('red').y);
      const templeOwner: Player = y === 0 ? 'blue' : 'red';
      const dest = destinations.get(key(pos));
      const isSelected = selFrom && selFrom.x === x && selFrom.y === y;
      const isMovable = movablePawns.has(key(pos));
      const isLast = lastMove && ((lastMove.from.x === x && lastMove.from.y === y) || (lastMove.to.x === x && lastMove.to.y === y));
      const contents = piece ? `${SCHOOL[piece.player]} ${piece.master ? 'Master' : 'Student'}` : 'empty';
      const hint = dest ? (piece ? ' Take this piece.' : ' Move here.') : isSelected ? ' Selected.' : isMovable ? ' Can move.' : '';
      cells.push(
        <button
          key={key(pos)}
          type="button"
          data-cell={key(pos)}
          tabIndex={cursor.x === x && cursor.y === y ? 0 : -1}
          className={`cell${isTemple ? ` temple temple-${templeOwner}${piece ? ' held' : ''}` : ''}${isSelected ? ' selected' : ''}${isLast ? ' last' : ''}`}
          onClick={() => onSquareTap(pos)}
          onFocus={() => setCursor(pos)}
          aria-label={`${squareName(pos)}${isTemple ? `, ${SCHOOL[templeOwner]} Temple Arch` : ''}: ${contents}.${hint}`}
        >
          {isTemple && <Torii className="temple-arch" />}
          {isSelected && (
            <svg className="ring ring-chosen" viewBox="0 0 100 100" aria-hidden><path d={MARKS.enso} /></svg>
          )}
          {piece && <Piece player={piece.player} master={piece.master} />}
          {dest && !piece && (
            <svg className="blot" viewBox="0 0 100 100" aria-hidden><path d={MARKS.blot} /></svg>
          )}
          {dest && piece && (
            <svg className="ring ring-take" viewBox="0 0 100 100" aria-hidden>
              <path d={MARKS.enso} />
              <path d={MARKS.enso} transform="rotate(150 50 50) translate(50 50) scale(0.62) translate(-50 -50)" />
            </svg>
          )}
          {!dest && isMovable && piece && !isSelected && <span className="can-move" />}
        </button>,
      );
    }
  }

  const live = selCard || selFrom ? status : motion.announcement || status;

  return (
    <div className={`duel${game.plies === 0 ? ' opening' : ''}`} key={deal.current.count} ref={tableRef}>
      {seat('red')}

      <div className="board" role="group" aria-label="Board, five by five. Arrow keys move between squares." onKeyDown={onBoardKey}>
        <svg className="board-lines" viewBox="0 0 500 500" aria-hidden><path d={MARKS.grid} /></svg>
        <div className="cells">{cells}</div>
        {lastMove && (
          <svg className="ink-path" viewBox="0 0 5 5" aria-hidden key={`${key(lastMove.from)}-${key(lastMove.to)}-${game.plies}`}>
            <path
              pathLength={1}
              d={`M${lastMove.from.x + 0.5} ${4.5 - lastMove.from.y}L${lastMove.to.x + 0.5} ${4.5 - lastMove.to.y}`}
            />
          </svg>
        )}
        {motion.capture && (
          <div className="taken-fx" style={cellStyle(motion.capture.at)} key={motion.capture.id} onAnimationEnd={(e) => e.target === e.currentTarget && motion.clearCapture()}>
            <svg className="splash" viewBox="0 0 100 100" aria-hidden><path d={MARKS.splash} /></svg>
            <Piece player={motion.capture.piece.player} master={motion.capture.piece.master} />
          </div>
        )}
      </div>

      {seat('blue')}

      {motion.trail && (
        <svg className="trail" aria-hidden key={motion.trail.id}>
          <path pathLength={1} d={motion.trail.d} onAnimationEnd={motion.clearTrail} />
        </svg>
      )}

      <p className="sr-only" aria-live="polite">{live}</p>

      {menuFor && (
        <DuelMenu
          facing={menuFor}
          onClose={() => setMenuFor(null)}
          onRestart={() => {
            setMenuFor(null);
            newGame();
          }}
          onHome={onHome}
        />
      )}

      {game.winner && <Rite game={game} onAgain={newGame} onHome={onHome} />}
    </div>
  );
}
