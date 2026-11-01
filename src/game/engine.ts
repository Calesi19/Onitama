// Pure Onitama game engine. No UI dependencies; fully deterministic given an
// injectable RNG so it can be unit-tested and simulated headlessly.
//
// Board coordinates: x = 0..4 left-to-right as seen by the blue player
// (blue sits at the bottom of the screen), y = 0..4 bottom-to-top.
// Blue's home row is y = 0 and blue's temple is (2, 0).
// Red's home row is y = 4 and red's temple is (2, 4).
// Blue advances toward +y; red advances toward -y.

import { MOVE_CARDS, getCard, orientedMoves, type Player } from './cards';

export type { Player };

export interface Pos {
  x: number;
  y: number;
}

export interface Piece {
  player: Player;
  master: boolean;
}

export type WinKind = 'capture' | 'temple';

export interface GameState {
  /** 25 cells, index = y * 5 + x. */
  board: Array<Piece | null>;
  /** Card names held by each player. */
  hands: Record<Player, [string, string]>;
  /** The neutral card beside the board. */
  sideCard: string;
  turn: Player;
  winner: Player | null;
  winKind: WinKind | null;
  /** Number of completed turns (plies). */
  plies: number;
}

export interface Move {
  card: string;
  from: Pos;
  to: Pos;
}

export const BOARD_SIZE = 5;
export const BLUE_TEMPLE: Pos = { x: 2, y: 0 };
export const RED_TEMPLE: Pos = { x: 2, y: 4 };

export function opponent(player: Player): Player {
  return player === 'blue' ? 'red' : 'blue';
}

export function templeOf(player: Player): Pos {
  return player === 'blue' ? BLUE_TEMPLE : RED_TEMPLE;
}

export function idx(pos: Pos): number {
  return pos.y * BOARD_SIZE + pos.x;
}

export function inBounds(pos: Pos): boolean {
  return pos.x >= 0 && pos.x < BOARD_SIZE && pos.y >= 0 && pos.y < BOARD_SIZE;
}

export function pieceAt(state: GameState, pos: Pos): Piece | null {
  return state.board[idx(pos)];
}

/** Deterministic PRNG (mulberry32) for tests and simulations. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffled<T>(items: T[], rng: () => number): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function startingBoard(): Array<Piece | null> {
  const board: Array<Piece | null> = new Array(25).fill(null);
  const place = (player: Player, y: number) => {
    for (let x = 0; x < BOARD_SIZE; x++) {
      board[idx({ x, y })] = { player, master: x === 2 };
    }
  };
  place('blue', 0);
  place('red', 4);
  return board;
}

/**
 * Create a new game. Deals 2 cards to each player and 1 side card from a
 * shuffled 16-card deck; the side card's stamp decides who moves first.
 * Alternatively pass an explicit 5-card deal for deterministic setups/tests:
 * [blue1, blue2, red1, red2, side].
 */
export function createGame(
  rng: () => number = Math.random,
  deal?: [string, string, string, string, string],
): GameState {
  let blue: [string, string];
  let red: [string, string];
  let side: string;
  if (deal) {
    const names = new Set(deal);
    if (names.size !== 5) throw new Error('A deal must contain 5 distinct cards');
    deal.forEach((n) => getCard(n)); // validates names
    blue = [deal[0], deal[1]];
    red = [deal[2], deal[3]];
    side = deal[4];
  } else {
    const deck = shuffled(MOVE_CARDS.map((c) => c.name), rng);
    blue = [deck[0], deck[1]];
    red = [deck[2], deck[3]];
    side = deck[4];
  }
  return {
    board: startingBoard(),
    hands: { blue, red },
    sideCard: side,
    turn: getCard(side).stamp,
    winner: null,
    winKind: null,
    plies: 0,
  };
}

/** All legal pawn moves for `player` in `state` (empty once the game is won). */
export function legalMoves(state: GameState, player: Player): Move[] {
  if (state.winner) return [];
  const moves: Move[] = [];
  for (const cardName of state.hands[player]) {
    const card = getCard(cardName);
    const offsets = orientedMoves(card, player);
    for (let y = 0; y < BOARD_SIZE; y++) {
      for (let x = 0; x < BOARD_SIZE; x++) {
        const piece = state.board[idx({ x, y })];
        if (!piece || piece.player !== player) continue;
        for (const [dx, dy] of offsets) {
          const to = { x: x + dx, y: y + dy };
          if (!inBounds(to)) continue;
          const target = state.board[idx(to)];
          if (target && target.player === player) continue; // cannot land on own pawn
          moves.push({ card: cardName, from: { x, y }, to });
        }
      }
    }
  }
  return moves;
}

export function hasLegalMoves(state: GameState, player: Player): boolean {
  return legalMoves(state, player).length > 0;
}

/** True when the player to move has no pawn moves and must use the pass rule. */
export function mustPass(state: GameState): boolean {
  return !state.winner && legalMoves(state, state.turn).length === 0;
}

function swapCardWithSide(state: GameState, player: Player, cardName: string): void {
  const hand = state.hands[player];
  const i = hand.indexOf(cardName);
  if (i === -1) throw new Error(`${player} does not hold ${cardName}`);
  const side = state.sideCard;
  state.hands[player] = (i === 0 ? [side, hand[1]] : [hand[0], side]) as [string, string];
  state.sideCard = cardName;
}

function cloneState(state: GameState): GameState {
  return {
    board: [...state.board],
    hands: { blue: [...state.hands.blue] as [string, string], red: [...state.hands.red] as [string, string] },
    sideCard: state.sideCard,
    turn: state.turn,
    winner: state.winner,
    winKind: state.winKind,
    plies: state.plies,
  };
}

/**
 * Apply a pawn move for the player to move. The move must be legal
 * (see legalMoves); throws otherwise. Returns a new state.
 * After moving, the used card is exchanged with the side card.
 */
export function applyMove(state: GameState, move: Move): GameState {
  if (state.winner) throw new Error('The game is already over');
  const player = state.turn;
  const legal = legalMoves(state, player);
  const ok = legal.some(
    (m) =>
      m.card === move.card &&
      m.from.x === move.from.x &&
      m.from.y === move.from.y &&
      m.to.x === move.to.x &&
      m.to.y === move.to.y,
  );
  if (!ok) throw new Error(`Illegal move: ${JSON.stringify(move)}`);

  const next = cloneState(state);
  const moving = pieceAt(next, move.from)!;
  const captured = pieceAt(next, move.to);
  next.board[idx(move.from)] = null;
  next.board[idx(move.to)] = moving;

  if (captured && captured.master) {
    next.winner = player;
    next.winKind = 'capture';
  } else if (moving.master) {
    const target = templeOf(opponent(player));
    if (move.to.x === target.x && move.to.y === target.y) {
      next.winner = player;
      next.winKind = 'temple';
    }
  }

  swapCardWithSide(next, player, move.card);
  next.turn = opponent(player);
  next.plies += 1;
  return next;
}

/**
 * The official pass rule: when the player to move has no legal pawn move,
 * they must still exchange one of their cards with the side card without
 * moving a pawn. Throws if a pawn move exists or the card isn't held.
 */
export function applyPass(state: GameState, cardName: string): GameState {
  if (state.winner) throw new Error('The game is already over');
  const player = state.turn;
  if (!state.hands[player].includes(cardName)) {
    throw new Error(`${player} does not hold ${cardName}`);
  }
  if (hasLegalMoves(state, player)) {
    throw new Error('Passing is only allowed when no legal pawn move exists');
  }
  const next = cloneState(state);
  swapCardWithSide(next, player, cardName);
  next.turn = opponent(player);
  next.plies += 1;
  return next;
}
