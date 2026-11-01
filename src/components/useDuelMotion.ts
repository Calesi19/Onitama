import { useLayoutEffect, useRef, useState, type RefObject } from 'react';
import { pieceAt, type GameState, type Piece, type Pos } from '../game/engine';
import { SCHOOL, squareName } from '../schools';

// Everything here is presentation. It watches the game state and animates the
// difference between two turns; it never writes to the state it watches.

const EASE_TRAVEL = 'cubic-bezier(0.65, 0.05, 0.36, 1)';
const PIECE_MS = 300;
const CARD_MS = 400;
/** The card sets off while the piece is still landing. */
const CARD_DELAY_MS = 170;
const FLIGHT_STEPS = 10;
/** Matches .card.resting: a card in the tray lies a little askew. */
const REST_TILT = -2.5;

export interface CaptureMark {
  id: number;
  at: Pos;
  piece: Piece;
}

export interface CardTrail {
  id: number;
  d: string;
}

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Matches the computers block in index.css: cards stay upright, only their dots turn. */
const uprightTable = () => window.matchMedia('(hover: hover) and (pointer: fine)').matches;

const centre = (r: DOMRect) => ({ x: r.left + r.width / 2, y: r.top + r.height / 2 });

export function useDuelMotion(game: GameState, lastMove: { from: Pos; to: Pos } | null, root: RefObject<HTMLElement>) {
  const before = useRef(new Map<string, DOMRect>());
  const previous = useRef(game);
  const nextId = useRef(1);
  const [capture, setCapture] = useState<CaptureMark | null>(null);
  const [trail, setTrail] = useState<CardTrail | null>(null);
  const [announcement, setAnnouncement] = useState('');

  /** Call just before the game changes, so cards can fly from where they really were. */
  function snapshot() {
    const rects = new Map<string, DOMRect>();
    root.current?.querySelectorAll<HTMLElement>('[data-card]').forEach((el) => {
      rects.set(el.dataset.card!, el.getBoundingClientRect());
    });
    before.current = rects;
  }

  useLayoutEffect(() => {
    const prev = previous.current;
    previous.current = game;
    const table = root.current;
    if (!table || prev === game) return;
    if (game.plies === 0) {
      setCapture(null);
      setTrail(null);
      setAnnouncement('');
      return;
    }

    const reduced = reducedMotion();
    const mover = prev.turn;
    const movedPiece = lastMove ? pieceAt(prev, lastMove.from) : null;
    const taken = lastMove ? pieceAt(prev, lastMove.to) : null;

    if (lastMove) {
      const el = table.querySelector<HTMLElement>(`[data-cell="${lastMove.to.x},${lastMove.to.y}"] .piece`);
      const from = table.querySelector(`[data-cell="${lastMove.from.x},${lastMove.from.y}"]`)?.getBoundingClientRect();
      const to = table.querySelector(`[data-cell="${lastMove.to.x},${lastMove.to.y}"]`)?.getBoundingClientRect();
      if (el && from && to) {
        if (reduced) {
          el.animate({ opacity: [0, 1] }, { duration: 200 });
        } else {
          el.style.zIndex = '5';
          const flight = el.animate(
            [
              { transform: `translate(${from.left - to.left}px, ${from.top - to.top}px)` },
              { transform: 'none' },
            ],
            { duration: PIECE_MS, easing: EASE_TRAVEL },
          );
          flight.onfinish = () => (el.style.zIndex = '');
        }
      }
    }

    if (taken) setCapture({ id: nextId.current++, at: lastMove!.to, piece: taken });

    table.querySelectorAll<HTMLElement>('[data-card]').forEach((el) => {
      const name = el.dataset.card!;
      const from = before.current.get(name);
      if (!from) return;
      const to = el.getBoundingClientRect();
      const a = centre(from);
      const b = centre(to);
      if (Math.hypot(a.x - b.x, a.y - b.y) < 2) return;

      if (reduced) {
        el.animate({ opacity: [0, 1] }, { duration: 200 });
        return;
      }

      const crossing = name === game.sideCard;
      const facingRed = el.dataset.facing === 'red';
      // The used card makes a half turn on its way across; the waiting card
      // is already facing its new holder and only slides.
      const upright = uprightTable();
      const endTurn = upright ? 0 : facingRed ? 180 : crossing ? 360 : 0;
      const tilt = el.classList.contains('resting') ? REST_TILT : 0;
      const startTurn = crossing ? endTurn - (upright ? 0 : 180) : endTurn + REST_TILT;
      const delay = crossing ? CARD_DELAY_MS : CARD_DELAY_MS + 60;
      const dx = a.x - b.x;
      const dy = a.y - b.y;

      el.style.zIndex = crossing ? '30' : '20';

      // Travel on a curve pulled toward the middle of the table, so a card on
      // its side stays on screen.
      const view = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
      const pull = crossing ? 0.9 : 0;
      const control = {
        x: dx / 2 + (view.x - (a.x + b.x) / 2) * pull,
        y: dy / 2 + (view.y - (a.y + b.y) / 2) * pull,
      };
      const frames: Keyframe[] = [];
      for (let i = 0; i <= FLIGHT_STEPS; i++) {
        const t = i / FLIGHT_STEPS;
        const x = (1 - t) * (1 - t) * dx + 2 * t * (1 - t) * control.x;
        const y = (1 - t) * (1 - t) * dy + 2 * t * (1 - t) * control.y;
        const turn = startTurn + (endTurn + tilt - startTurn) * t;
        const scale = 1 + (crossing ? 0.05 : 0) * Math.sin(t * Math.PI);
        frames.push({ transform: `translate(${x}px, ${y}px) rotate(${turn}deg) scale(${scale})` });
      }
      const flight = el.animate(frames, {
        duration: crossing ? CARD_MS : CARD_MS - 60,
        delay,
        easing: EASE_TRAVEL,
        fill: 'backwards',
      });
      flight.onfinish = () => (el.style.zIndex = '');

      if (crossing && upright) {
        // The card can't turn here, so its technique does.
        el.querySelector('.card-dots')?.animate(
          { rotate: facingRed ? ['0deg', '180deg'] : ['180deg', '360deg'] },
          { duration: CARD_MS, delay, easing: EASE_TRAVEL, fill: 'backwards' },
        );
      }

      if (crossing) {
        // A brushed line across the table, so the eye can follow the card.
        const qx = b.x + control.x;
        const qy = b.y + control.y;
        setTrail({ id: nextId.current++, d: `M${a.x} ${a.y}Q${qx} ${qy} ${b.x} ${b.y}` });
      }
    });

    // A forced pass remounts the card that held focus; keep the keyboard on the table.
    if (document.activeElement === document.body) {
      table.querySelector<HTMLElement>('[data-cell][tabindex="0"]')?.focus({ preventScroll: true });
    }

    const who = SCHOOL[mover];
    const next = SCHOOL[game.turn];
    if (game.winner) {
      setAnnouncement('');
    } else if (lastMove && movedPiece) {
      const piece = movedPiece.master ? 'Master' : 'Student';
      const took = taken ? `, taking a ${SCHOOL[taken.player]} Student` : '';
      setAnnouncement(
        `${who} ${piece} moved from ${squareName(lastMove.from)} to ${squareName(lastMove.to)}${took}. ${game.sideCard} crosses to ${next}. ${next} to move.`,
      );
    } else {
      setAnnouncement(`${who} had no move and gave up ${game.sideCard}. ${next} to move.`);
    }
  }, [game, lastMove, root]);

  return {
    snapshot,
    capture,
    clearCapture: () => setCapture(null),
    trail,
    clearTrail: () => setTrail(null),
    announcement,
  };
}
