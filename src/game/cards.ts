// Onitama base-game move cards (16).
//
// Move offsets are given from the card holder's perspective, as printed on the
// physical card facing the player who holds it: dx > 0 is to the holder's
// right, dy > 0 is forward (toward the opponent). The engine rotates offsets
// 180 degrees for the red player, whose forward is the opposite direction.
//
// Move grids were verified against the card diagrams rendered in the
// onitamago reference implementation (pkg.go.dev/github.com/andersfylling/
// onitamago), decoded from its published card masks, and cross-checked against
// rulebook/review prose for Tiger, Mantis, Goose, Dragon, Frog and Rabbit.
// Stamp (starting-player) colors follow the published distribution: eight
// blue, eight red; left-leaning cards carry blue stamps and right-leaning
// cards red stamps (e.g. Goose is blue, its mirror Rooster is red).

export type Player = 'blue' | 'red';

export interface MoveCard {
  name: string;
  stamp: Player;
  moves: ReadonlyArray<readonly [number, number]>; // [dx, dy]
}

export const MOVE_CARDS: MoveCard[] = [
  { name: 'Tiger',    stamp: 'blue', moves: [[0, 2], [0, -1]] },
  { name: 'Dragon',   stamp: 'red',  moves: [[-2, 1], [2, 1], [-1, -1], [1, -1]] },
  { name: 'Crab',     stamp: 'blue', moves: [[0, 1], [-2, 0], [2, 0]] },
  { name: 'Elephant', stamp: 'red',  moves: [[-1, 1], [1, 1], [-1, 0], [1, 0]] },
  { name: 'Monkey',   stamp: 'blue', moves: [[-1, 1], [1, 1], [-1, -1], [1, -1]] },
  { name: 'Mantis',   stamp: 'red',  moves: [[-1, 1], [1, 1], [0, -1]] },
  { name: 'Crane',    stamp: 'blue', moves: [[0, 1], [-1, -1], [1, -1]] },
  { name: 'Boar',     stamp: 'red',  moves: [[0, 1], [-1, 0], [1, 0]] },
  { name: 'Frog',     stamp: 'blue', moves: [[-1, 1], [-2, 0], [1, -1]] },
  { name: 'Rabbit',   stamp: 'red',  moves: [[1, 1], [2, 0], [-1, -1]] },
  { name: 'Eel',      stamp: 'blue', moves: [[-1, 1], [1, 0], [-1, -1]] },
  { name: 'Goose',    stamp: 'blue', moves: [[-1, 1], [-1, 0], [1, 0], [1, -1]] },
  { name: 'Horse',    stamp: 'blue', moves: [[0, 1], [-1, 0], [0, -1]] },
  { name: 'Rooster',  stamp: 'red',  moves: [[1, 1], [-1, 0], [1, 0], [-1, -1]] },
  { name: 'Ox',       stamp: 'red',  moves: [[0, 1], [1, 0], [0, -1]] },
  { name: 'Cobra',    stamp: 'red',  moves: [[1, 1], [-1, 0], [1, -1]] },
];

export const CARD_BY_NAME: ReadonlyMap<string, MoveCard> = new Map(
  MOVE_CARDS.map((c) => [c.name, c]),
);

export function getCard(name: string): MoveCard {
  const card = CARD_BY_NAME.get(name);
  if (!card) throw new Error(`Unknown move card: ${name}`);
  return card;
}

/**
 * The card's move offsets as seen by `player`. Cards are printed from blue's
 * perspective (blue sits at the bottom and moves toward +y); red's offsets
 * are the same grid rotated 180 degrees.
 */
export function orientedMoves(
  card: MoveCard,
  player: Player,
): Array<readonly [number, number]> {
  if (player === 'blue') return card.moves.map(([dx, dy]) => [dx, dy] as const);
  const neg = (n: number) => (n === 0 ? 0 : -n); // avoid -0
  return card.moves.map(([dx, dy]) => [neg(dx), neg(dy)] as const);
}
