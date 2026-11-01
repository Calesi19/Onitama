import { useState } from 'react';
import GameScreen from './components/GameScreen';

type Screen = 'home' | 'rules' | 'game';

export default function App() {
  const [screen, setScreen] = useState<Screen>('home');

  if (screen === 'game') {
    return <GameScreen onHome={() => setScreen('home')} />;
  }

  if (screen === 'rules') {
    return (
      <div className="page">
        <div className="game-topbar">
          <button type="button" className="text-btn" onClick={() => setScreen('home')}>
            ‹ Back
          </button>
          <span className="game-title">HOW TO PLAY</span>
          <span className="topbar-spacer" />
        </div>
        <div className="rules">
          <h2>The goal</h2>
          <p>
            Win in one of two ways: capture your opponent's <strong>master</strong> (the crowned
            pawn) — the <em>Way of the Stone</em> — or move your own master onto your opponent's{' '}
            <strong>temple</strong> square, the marked square in the centre of their home row — the{' '}
            <em>Way of the Stream</em>.
          </p>
          <h2>Setup</h2>
          <p>
            Each player has five pawns on their home row: four students and the master in the
            centre, on the temple. Five move cards are drawn from the sixteen: two for each player,
            face up, and one to the side. The coloured stamp on the side card decides who moves
            first.
          </p>
          <h2>Your turn</h2>
          <p>
            Choose one of your two cards, then move one of your pawns exactly as the card's grid
            shows — the centre square is your pawn, the coloured squares are where it can go. You
            may jump over other pawns, but you can't land on one of your own. Land on an opposing
            pawn to capture it.
          </p>
          <p>
            After moving, <strong>swap the card you used with the side card</strong>. Cards always
            rotate 180° when they cross the table, so a card you give away will face your opponent.
          </p>
          <h2>If you can't move</h2>
          <p>
            If neither card lets any of your pawns move, you must still exchange one of your cards
            with the side card, without moving a pawn. The game will prompt you when this happens.
          </p>
          <h2>Pass and play</h2>
          <p>
            One phone, two players, sitting opposite each other. Blue plays from the bottom of the
            screen, Red from the top — Red's cards are turned to face the Red player. A game takes
            about ten minutes.
          </p>
          <button type="button" className="primary-btn big" onClick={() => setScreen('game')}>
            Start a game
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page home">
      <div className="home-seal" aria-hidden>
        鬼
      </div>
      <h1 className="home-title">ONITAMA</h1>
      <p className="home-sub">A duel of masters on a 5×5 shrine board.</p>
      <p className="home-desc">
        Five pawns, sixteen move cards, two ways to win. Capture the opposing master, or guide
        yours into their temple.
      </p>
      <div className="home-actions">
        <button type="button" className="primary-btn big" onClick={() => setScreen('game')}>
          New game
        </button>
        <button type="button" className="secondary-btn big" onClick={() => setScreen('rules')}>
          How to play
        </button>
      </div>
      <p className="home-foot">Pass-and-play · one phone · two players</p>
    </div>
  );
}
