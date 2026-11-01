import { describe, expect, it } from 'vitest';
import { MOVE_CARDS, getCard, orientedMoves } from './cards';
import {
  applyMove,
  applyPass,
  createGame,
  hasLegalMoves,
  idx,
  legalMoves,
  mulberry32,
  mustPass,
  pieceAt,
  type GameState,
  type Piece,
  type Player,
} from './engine';

function emptyBoard(): Array<Piece | null> {
  return new Array(25).fill(null);
}

function put(board: Array<Piece | null>, player: Player, master: boolean, x: number, y: number) {
  board[idx({ x, y })] = { player, master };
}

function customState(partial: Partial<GameState>): GameState {
  return {
    board: emptyBoard(),
    hands: { blue: ['Boar', 'Crab'], red: ['Ox', 'Horse'] },
    sideCard: 'Tiger',
    turn: 'blue',
    winner: null,
    winKind: null,
    plies: 0,
    ...partial,
  };
}

describe('card data', () => {
  it('has the 16 base-game cards with unique names', () => {
    expect(MOVE_CARDS).toHaveLength(16);
    expect(new Set(MOVE_CARDS.map((c) => c.name)).size).toBe(16);
  });

  it('has eight blue stamps and eight red stamps', () => {
    expect(MOVE_CARDS.filter((c) => c.stamp === 'blue')).toHaveLength(8);
    expect(MOVE_CARDS.filter((c) => c.stamp === 'red')).toHaveLength(8);
  });

  it('encodes the verified move grids', () => {
    const moves = (name: string) => getCard(name).moves.map(([x, y]) => `${x},${y}`).sort();
    expect(moves('Tiger')).toEqual(['0,-1', '0,2']);
    expect(moves('Dragon')).toEqual(['-1,-1', '-2,1', '1,-1', '2,1']);
    expect(moves('Frog')).toEqual(['-1,1', '-2,0', '1,-1']);
    expect(moves('Rabbit')).toEqual(['-1,-1', '1,1', '2,0']);
    expect(moves('Crab')).toEqual(['-2,0', '0,1', '2,0']);
    expect(moves('Mantis')).toEqual(['-1,1', '0,-1', '1,1']);
    expect(moves('Goose')).toEqual(['-1,0', '-1,1', '1,-1', '1,0']);
    expect(moves('Rooster')).toEqual(['-1,-1', '-1,0', '1,0', '1,1']);
    expect(moves('Crane')).toEqual(['-1,-1', '0,1', '1,-1']);
    expect(moves('Cobra')).toEqual(['-1,0', '1,-1', '1,1']);
    expect(moves('Elephant')).toEqual(['-1,0', '-1,1', '1,0', '1,1']);
    expect(moves('Monkey')).toEqual(['-1,-1', '-1,1', '1,-1', '1,1']);
  });
});

describe('setup', () => {
  it('deals 2 cards to each player and 1 side card, all distinct', () => {
    for (let seed = 1; seed <= 25; seed++) {
      const s = createGame(mulberry32(seed));
      const all = [...s.hands.blue, ...s.hands.red, s.sideCard];
      expect(s.hands.blue).toHaveLength(2);
      expect(s.hands.red).toHaveLength(2);
      expect(new Set(all).size).toBe(5);
      all.forEach((n) => expect(() => getCard(n)).not.toThrow());
    }
  });

  it('sets up pawns with masters on the temple squares', () => {
    const s = createGame(mulberry32(7));
    expect(pieceAt(s, { x: 2, y: 0 })).toEqual({ player: 'blue', master: true });
    expect(pieceAt(s, { x: 2, y: 4 })).toEqual({ player: 'red', master: true });
    expect(s.board.filter((p) => p?.player === 'blue')).toHaveLength(5);
    expect(s.board.filter((p) => p?.player === 'red')).toHaveLength(5);
    expect(s.board.filter(Boolean)).toHaveLength(10);
  });

  it('the side card stamp decides the starting player', () => {
    // Tiger has a blue stamp, Dragon a red stamp.
    const blueFirst = createGame(mulberry32(1), ['Boar', 'Crab', 'Ox', 'Horse', 'Tiger']);
    expect(blueFirst.turn).toBe('blue');
    expect(blueFirst.sideCard).toBe('Tiger');
    const redFirst = createGame(mulberry32(1), ['Boar', 'Crab', 'Ox', 'Horse', 'Dragon']);
    expect(redFirst.turn).toBe('red');
    for (let seed = 1; seed <= 25; seed++) {
      const s = createGame(mulberry32(seed));
      expect(s.turn).toBe(getCard(s.sideCard).stamp);
    }
  });
});

describe('legal move generation', () => {
  it('generates the opening moves for a known deal', () => {
    // Blue has Boar + Crab, red has Ox + Horse, side is Tiger (blue starts).
    const s = createGame(mulberry32(1), ['Boar', 'Crab', 'Ox', 'Horse', 'Tiger']);
    const moves = legalMoves(s, 'blue');
    // Boar: each of the 5 blue pawns can step forward (y 0 -> 1) = 5;
    // sideways Boar steps are blocked by neighbouring own pawns except the
    // two corner pawns step inward onto own pawns too, so only forwards count.
    // Crab: forward step for all 5 pawns = 5; the ( +/-2, 0 ) jumps land on own
    // pawns from x=0,1,3,4 except none are free on the home row... all blocked.
    expect(moves.filter((m) => m.card === 'Boar')).toHaveLength(5);
    expect(moves.filter((m) => m.card === 'Crab')).toHaveLength(5);
    expect(moves).toHaveLength(10);
    expect(moves.every((m) => m.to.y === 1)).toBe(true);
  });

  it('rotates card offsets 180 degrees for red', () => {
    const tiger = getCard('Tiger');
    expect(orientedMoves(tiger, 'blue')).toEqual([[0, 2], [0, -1]]);
    expect(orientedMoves(tiger, 'red')).toEqual([[0, -2], [0, 1]]);
    const frog = getCard('Frog');
    expect(orientedMoves(frog, 'red')).toEqual([[1, -1], [2, 0], [-1, 1]]);
  });

  it('generates red moves toward -y from the red home row', () => {
    const s = createGame(mulberry32(1), ['Boar', 'Crab', 'Ox', 'Horse', 'Dragon']);
    expect(s.turn).toBe('red');
    const moves = legalMoves(s, 'red');
    expect(moves.length).toBeGreaterThan(0);
    expect(moves.every((m) => m.from.y === 4 && m.to.y === 3)).toBe(true);
  });

  it('never lets a pawn land on its own pawn', () => {
    const board = emptyBoard();
    put(board, 'blue', true, 2, 0);
    put(board, 'blue', false, 2, 1); // directly in front of the master
    put(board, 'red', true, 2, 4);
    const s = customState({ board, hands: { blue: ['Boar', 'Crab'], red: ['Ox', 'Horse'] } });
    const moves = legalMoves(s, 'blue');
    // Master cannot move forward onto its own student with Boar or Crab.
    expect(moves.some((m) => m.from.x === 2 && m.from.y === 0 && m.to.x === 2 && m.to.y === 1)).toBe(false);
    // Boar sideways from the master is fine (empty squares).
    expect(moves.some((m) => m.from.x === 2 && m.from.y === 0 && m.to.x === 1 && m.to.y === 0)).toBe(true);
  });

  it('never generates moves off the board', () => {
    const board = emptyBoard();
    put(board, 'blue', false, 0, 0);
    put(board, 'blue', true, 4, 4);
    put(board, 'red', true, 2, 4);
    const s = customState({ board, hands: { blue: ['Dragon', 'Tiger'], red: ['Ox', 'Horse'] } });
    const moves = legalMoves(s, 'blue');
    expect(moves.every((m) => m.to.x >= 0 && m.to.x <= 4 && m.to.y >= 0 && m.to.y <= 4)).toBe(true);
    // Dragon from (0,0): only (+2,+1) is on-board... (+1,-1) and (-1,-1) are off,
    // (-2,+1) is off. Tiger from (0,0): (0,2) on-board, (0,-1) off.
    const fromCorner = moves.filter((m) => m.from.x === 0 && m.from.y === 0);
    expect(fromCorner.map((m) => `${m.card}:${m.to.x},${m.to.y}`).sort()).toEqual([
      'Dragon:2,1',
      'Tiger:0,2',
    ]);
  });
});

describe('applying moves', () => {
  it('moves the pawn and swaps the used card with the side card', () => {
    const s = createGame(mulberry32(1), ['Boar', 'Crab', 'Ox', 'Horse', 'Tiger']);
    const next = applyMove(s, { card: 'Boar', from: { x: 2, y: 0 }, to: { x: 2, y: 1 } });
    expect(pieceAt(next, { x: 2, y: 1 })).toEqual({ player: 'blue', master: true });
    expect(pieceAt(next, { x: 2, y: 0 })).toBeNull();
    // Blue gave Boar to the side and received Tiger.
    expect(next.sideCard).toBe('Boar');
    expect(next.hands.blue).toEqual(['Tiger', 'Crab']);
    expect(next.hands.red).toEqual(['Ox', 'Horse']);
    expect(next.turn).toBe('red');
    expect(next.plies).toBe(1);
    // Original state is untouched.
    expect(s.sideCard).toBe('Tiger');
    expect(pieceAt(s, { x: 2, y: 0 })).toEqual({ player: 'blue', master: true });
  });

  it('captures an opponent pawn by landing on it', () => {
    const board = emptyBoard();
    put(board, 'blue', false, 2, 2);
    put(board, 'blue', true, 0, 0);
    put(board, 'red', false, 2, 3);
    put(board, 'red', true, 4, 4);
    const s = customState({ board });
    const next = applyMove(s, { card: 'Boar', from: { x: 2, y: 2 }, to: { x: 2, y: 3 } });
    expect(pieceAt(next, { x: 2, y: 3 })).toEqual({ player: 'blue', master: false });
    expect(next.board.filter((p) => p?.player === 'red')).toHaveLength(1); // only red master remains
    expect(next.winner).toBeNull();
  });

  it('wins by capturing the opponent master (Way of the Stone)', () => {
    const board = emptyBoard();
    put(board, 'blue', false, 2, 2);
    put(board, 'blue', true, 0, 0);
    put(board, 'red', true, 2, 3);
    const s = customState({ board });
    const next = applyMove(s, { card: 'Boar', from: { x: 2, y: 2 }, to: { x: 2, y: 3 } });
    expect(next.winner).toBe('blue');
    expect(next.winKind).toBe('capture');
    expect(legalMoves(next, 'red')).toHaveLength(0);
  });

  it('wins by moving the master onto the opponent temple (Way of the Stream)', () => {
    const board = emptyBoard();
    put(board, 'blue', true, 2, 3);
    put(board, 'red', true, 4, 4);
    const s = customState({ board });
    const next = applyMove(s, { card: 'Boar', from: { x: 2, y: 3 }, to: { x: 2, y: 4 } });
    expect(next.winner).toBe('blue');
    expect(next.winKind).toBe('temple');
  });

  it('does not win when a student reaches the opponent temple', () => {
    const board = emptyBoard();
    put(board, 'blue', false, 2, 3);
    put(board, 'blue', true, 0, 0);
    put(board, 'red', true, 4, 4);
    const s = customState({ board });
    const next = applyMove(s, { card: 'Boar', from: { x: 2, y: 3 }, to: { x: 2, y: 4 } });
    expect(next.winner).toBeNull();
  });

  it('rejects illegal moves', () => {
    const s = createGame(mulberry32(1), ['Boar', 'Crab', 'Ox', 'Horse', 'Tiger']);
    expect(() => applyMove(s, { card: 'Boar', from: { x: 2, y: 0 }, to: { x: 2, y: 2 } })).toThrow();
    expect(() => applyMove(s, { card: 'Ox', from: { x: 2, y: 4 }, to: { x: 2, y: 3 } })).toThrow();
  });
});

describe('forced pass rule', () => {
  function stuckState(): GameState {
    // Blue fills the entire top row; with Boar and Crab every target square is
    // either off the board or occupied by a blue pawn, so blue cannot move.
    const board = emptyBoard();
    put(board, 'blue', true, 0, 4);
    put(board, 'blue', false, 1, 4);
    put(board, 'blue', false, 2, 4);
    put(board, 'blue', false, 3, 4);
    put(board, 'blue', false, 4, 4);
    put(board, 'red', true, 2, 0);
    return customState({
      board,
      hands: { blue: ['Boar', 'Crab'], red: ['Ox', 'Horse'] },
      sideCard: 'Tiger',
      turn: 'blue',
    });
  }

  it('detects when the player to move has no legal moves', () => {
    const s = stuckState();
    expect(hasLegalMoves(s, 'blue')).toBe(false);
    expect(mustPass(s)).toBe(true);
  });

  it('exchanges a card with the side card without moving a pawn', () => {
    const s = stuckState();
    const boardBefore = JSON.stringify(s.board);
    const next = applyPass(s, 'Crab');
    expect(next.sideCard).toBe('Crab');
    expect(next.hands.blue).toEqual(['Boar', 'Tiger']);
    expect(JSON.stringify(next.board)).toBe(boardBefore);
    expect(next.turn).toBe('red');
    expect(next.winner).toBeNull();
  });

  it('forbids passing while a pawn move exists', () => {
    const s = createGame(mulberry32(1), ['Boar', 'Crab', 'Ox', 'Horse', 'Tiger']);
    expect(mustPass(s)).toBe(false);
    expect(() => applyPass(s, 'Boar')).toThrow();
  });

  it('forbids passing with a card the player does not hold', () => {
    const s = stuckState();
    expect(() => applyPass(s, 'Ox')).toThrow();
  });
});

describe('scripted full games', () => {
  it('random capture-greedy games reach a win without errors', () => {
    for (let seed = 1; seed <= 12; seed++) {
      const rng = mulberry32(seed * 1000 + 17);
      let s = createGame(rng);
      let guard = 0;
      while (!s.winner && guard < 2000) {
        const moves = legalMoves(s, s.turn);
        if (moves.length === 0) {
          const hand = s.hands[s.turn];
          s = applyPass(s, hand[Math.floor(rng() * hand.length)]);
        } else {
          const captures = moves.filter((m) => {
            const t = pieceAt(s, m.to);
            return t && t.player !== s.turn;
          });
          const pool = captures.length > 0 && rng() < 0.8 ? captures : moves;
          s = applyMove(s, pool[Math.floor(rng() * pool.length)]);
        }
        // Invariants: always exactly 5 cards in play, hands of 2.
        expect(s.hands.blue).toHaveLength(2);
        expect(s.hands.red).toHaveLength(2);
        const inPlay = new Set([...s.hands.blue, ...s.hands.red, s.sideCard]);
        expect(inPlay.size).toBe(5);
        guard++;
      }
      expect(s.winner).not.toBeNull();
      expect(s.winKind === 'capture' || s.winKind === 'temple').toBe(true);
      expect(s.plies).toBe(guard);
    }
  });
});
