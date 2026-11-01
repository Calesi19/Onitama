# Onitama

A pass-and-play hotseat implementation of the Onitama board game: a single
Vite + React + TypeScript single-page app with **no server, no backend, no
sockets**. One device, two players sitting opposite each other. Installable
as a PWA and fully playable offline after the first load.

**This is a local build only** — it is not deployed anywhere yet. When it is,
the Vite `base` is `'./'` (relative), so the same build works under any
GitHub Pages path.

## The game

5×5 shrine board. Each player (Red and Blue) commands five pawns — a master
and four students — starting on their home row with the master on the temple
square. Sixteen move cards exist; each game deals two to each player plus one
side card whose stamp colour decides who starts.

- **Win** by capturing the opposing master (*Way of the Stone*) or by moving
  your master onto the opposing temple square (*Way of the Stream*).
- **A turn:** pick one of your two cards, move one pawn by one of its offsets
  (offsets are from the card holder's perspective — cards rotate 180° when
  they change sides), then swap the used card with the side card.
- Landing on an opposing pawn captures it; you can't land on your own pawn.
- **Forced pass:** if neither card gives you a legal move, you exchange one
  of your cards with the side card without moving (official rule).

Blue plays from the bottom of the screen; Red's panel at the top is rotated
180° to face the Red player, just like the physical game.

## Card data source

The 16 cards' move grids and starting-player stamps were verified against the
[onitamago](https://pkg.go.dev/github.com/andersfylling/onitamago) open-source
reference implementation (card bitboards) and cross-checked against the
official rulebook (Arcane Wonders) for setup, the pass rule, and both win
conditions. Individual cards were spot-checked against published card photos
and reviews (Tiger, Mantis, Goose/Rooster). The data lives in
`src/game/cards.ts`, expressed as `[dx, dy]` offsets from the holder's
perspective (dy+ = forward). All art and styling in this build are original —
only card names and move data (rule data) are used.

## Develop

```sh
npm install
npm run dev       # dev server
npm test          # engine test suite (Vitest)
npm run typecheck # tsc --noEmit
npm run build     # typecheck + production build into dist/
```

## Layout

```
index.html                  entry page (relative asset paths)
public/
  manifest.webmanifest      PWA manifest
  sw.js                     hand-rolled offline service worker
  icon-192.png, icon-512.png  original icons (two masters facing off)
src/
  main.tsx                  React entry + service worker registration
  App.tsx                   home and How to Play screens
  index.css                 dojo styling (rice paper, ink, vermillion/indigo)
  components/
    GameScreen.tsx          board, hands, side card, pass + win flows
    CardView.tsx            mini 5x5 move-card rendering
  game/
    cards.ts                the 16 move cards (verified data) + rotation
    engine.ts               pure game engine (no UI dependencies)
    engine.test.ts          22 tests: setup, move generation incl. red
                            rotation, captures, both wins, forced pass,
                            card swap, and scripted full games played to a
                            win through the engine API
```
