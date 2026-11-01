import { useMemo, useState } from 'react';
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
import CardView from './CardView';

interface Props {
  onHome: () => void;
}

const key = (p: Pos) => `${p.x},${p.y}`;

function TempleMark({ color }: { color: string }) {
  return (
    <svg className="temple-mark" viewBox="0 0 40 28" aria-hidden>
      <path d="M4 6 Q20 -2 36 6 L34 10 Q20 3 6 10 Z" fill={color} />
      <rect x="9" y="10" width="4" height="14" fill={color} />
      <rect x="27" y="10" width="4" height="14" fill={color} />
      <rect x="6" y="14" width="28" height="3" fill={color} />
    </svg>
  );
}

function Pawn({ player, master }: { player: Player; master: boolean }) {
  return (
    <div className={`pawn ${player}${master ? ' master' : ''}`}>
      {master && (
        <svg className="crown" viewBox="0 0 24 14" aria-hidden>
          <path d="M2 12 L4 4 L8.5 9 L12 2 L15.5 9 L20 4 L22 12 Z" fill="currentColor" />
        </svg>
      )}
      <div className="pawn-face">{master ? '主' : ''}</div>
    </div>
  );
}

export default function GameScreen({ onHome }: Props) {
  const [game, setGame] = useState<GameState>(() => createGame());
  const [selCard, setSelCard] = useState<string | null>(null);
  const [selFrom, setSelFrom] = useState<Pos | null>(null);
  const [lastMove, setLastMove] = useState<{ from: Pos; to: Pos } | null>(null);

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
    setGame(applyMove(game, move));
    setLastMove({ from: move.from, to: move.to });
    clearSelection();
  }

  function doPass(cardName: string) {
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

  const status = (() => {
    if (game.winner) return '';
    const name = turn === 'blue' ? 'Blue' : 'Red';
    if (passNeeded) return `${name} has no legal moves — tap one of your cards to exchange it with the side card.`;
    if (selCard && selFrom) return 'Tap a highlighted square to move.';
    if (selCard) return `Now tap one of your pawns to move with ${selCard}.`;
    if (selFrom) return 'Now tap the card to use for that pawn.';
    return `${name} to move — tap a card or a pawn.`;
  })();

  const capturedBy = (player: Player) => {
    const foe = opponent(player);
    const remaining = game.board.filter((p) => p?.player === foe).length;
    return 5 - remaining;
  };

  const playerPanel = (player: Player) => {
    const isTurn = turn === player && !game.winner;
    const captured = capturedBy(player);
    return (
      <div
        className={`player-panel ${player}${isTurn ? ' active' : ''}`}
        style={player === 'red' ? { transform: 'rotate(180deg)' } : undefined}
      >
        <div className="panel-label">
          <span className={`dot ${player}`} />
          {player === 'blue' ? 'Blue' : 'Red'}
          {isTurn && <span className="to-move">to move</span>}
          {captured > 0 && (
            <span className="captured" title={`Captured ${captured} opposing pawn${captured > 1 ? 's' : ''}`}>
              {Array.from({ length: captured }).map((_, i) => (
                <span key={i} className={`mini-pawn ${opponent(player)}`} />
              ))}
            </span>
          )}
        </div>
        <div className="hand">
          {game.hands[player].map((cardName) => (
            <CardView
              key={cardName}
              name={cardName}
              holder={player}
              selected={isTurn && selCard === cardName}
              usable={player !== turn ? false : passNeeded ? true : moves.some((m) => m.card === cardName)}
              onClick={() => onCardTap(player, cardName)}
            />
          ))}
        </div>
      </div>
    );
  };

  const rows = [];
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
      rows.push(
        <button
          key={key(pos)}
          type="button"
          className={`cell${isTemple ? ' temple' : ''}${isSelected ? ' selected' : ''}${isLast ? ' last' : ''}`}
          onClick={() => onSquareTap(pos)}
          aria-label={`square ${x + 1},${y + 1}`}
        >
          {isTemple && <TempleMark color={templeOwner === 'blue' ? 'var(--blue)' : 'var(--red)'} />}
          {piece && <Pawn player={piece.player} master={piece.master} />}
          {dest && <span className={`dest-marker${piece ? ' capture' : ''}`} />}
          {!dest && isMovable && piece && !isSelected && <span className="movable-marker" />}
        </button>,
      );
    }
  }

  return (
    <div className="game-screen">
      <div className="game-topbar">
        <button type="button" className="text-btn" onClick={onHome}>‹ Home</button>
        <span className="game-title">ONITAMA</span>
        <button type="button" className="text-btn" onClick={newGame}>Restart</button>
      </div>

      {playerPanel('red')}

      <div className="table-row">
        <div className="board">{rows}</div>
        <div className="side-column">
          <div className="side-label">Side card</div>
          <CardView name={game.sideCard} holder={turn} flipped={turn === 'red'} />
          <div className="side-note">goes to {turn === 'blue' ? 'Blue' : 'Red'}</div>
        </div>
      </div>

      <div className={`status-bar ${turn}`} aria-live="polite">
        <span className={`dot ${turn}`} />
        {status}
      </div>

      {playerPanel('blue')}

      {game.winner && (
        <div className="win-overlay">
          <div className="win-card">
            <div className={`win-title ${game.winner}`}>
              {game.winner === 'blue' ? 'Blue' : 'Red'} wins
            </div>
            <div className="win-kind">
              {game.winKind === 'capture'
                ? 'Way of the Stone — the opposing master was captured.'
                : 'Way of the Stream — the master reached the opposing temple.'}
            </div>
            <div className="win-actions">
              <button type="button" className="primary-btn" onClick={newGame}>Play again</button>
              <button type="button" className="secondary-btn" onClick={onHome}>Home</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
