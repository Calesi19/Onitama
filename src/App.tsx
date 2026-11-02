import { useRef, useState } from 'react';
import { ISLAND, MARKS } from './art/generated';
import { BrushRule, LogoSeal, Piece, SchoolSeal } from './art/marks';
import CardView from './components/CardView';
import GameScreen from './components/GameScreen';
import { useNightDojo } from './theme';

type Screen = 'home' | 'rules' | 'game';

function NightToggle() {
  const { night, toggle } = useNightDojo();
  return (
    <button type="button" className="link-btn" onClick={toggle}>
      {night ? 'Light the room' : 'Night dojo'}
    </button>
  );
}

function Island() {
  return (
    <svg className="island" viewBox="0 90 400 190" preserveAspectRatio="xMidYMax slice" aria-hidden>
      <path className="island-far" d={ISLAND.far} />
      <path className="island-near" d={ISLAND.near} />
      <path className="island-water" d={ISLAND.water} />
      <g className="island-arch" transform="translate(178 203) scale(0.42)">
        <path d={ISLAND.arch} />
      </g>
    </svg>
  );
}

const RULE_PAGES = 6;

function Rules({ onBack, onPlay }: { onBack: () => void; onPlay: () => void }) {
  const pagesRef = useRef<HTMLDivElement>(null);
  const [page, setPage] = useState(0);
  const lastPage = page === RULE_PAGES - 1;

  const trackPage = () => {
    const pages = pagesRef.current;
    if (pages) setPage(Math.round(pages.scrollLeft / pages.clientWidth));
  };

  const turnTo = (next: number) => {
    const pages = pagesRef.current;
    if (!pages) return;
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    pages.scrollTo({ left: next * pages.clientWidth, behavior: still ? 'auto' : 'smooth' });
  };

  return (
    <main className="rules">
      <nav className="rules-top">
        <button type="button" className="link-btn" onClick={onBack}>Back</button>
        <NightToggle />
      </nav>

      <div className="rules-pages" ref={pagesRef} onScroll={trackPage}>
        <section className="rules-page">
          <h1 className="rules-title">The rules of the duel</h1>
          <p className="rules-lead">Two schools. One small board. Every technique you show can be turned against you.</p>
          <BrushRule className="rules-rule" />
          <h2><span>One</span> Two ways to win</h2>
          <div className="ways">
            <div className="way">
              <svg viewBox="0 0 100 100" aria-hidden><path d={MARKS.stone} /></svg>
              <h3>Way of the Stone</h3>
              <p>Capture the enemy Master.</p>
            </div>
            <div className="way">
              <svg viewBox="0 0 100 100" aria-hidden><path d={MARKS.stream} /></svg>
              <h3>Way of the Stream</h3>
              <p>Walk your own Master onto the enemy's Temple Arch.</p>
            </div>
          </div>
        </section>

        <section className="rules-page">
          <h2><span>Two</span> The two schools</h2>
          <ul className="legend">
            <li>
              <span className="legend-pieces" aria-hidden><Piece player="blue" master /><Piece player="blue" master={false} /></span>
              <span><strong>Indigo</strong> carries a diamond and sits at the bottom of the screen.</span>
            </li>
            <li>
              <span className="legend-pieces" aria-hidden><Piece player="red" master /><Piece player="red" master={false} /></span>
              <span><strong>Vermilion</strong> carries a ring and sits at the top.</span>
            </li>
          </ul>
          <p>
            The pointed tablet is the Master, who starts on the school's Temple Arch. The round stones are the four
            Students beside it.
          </p>
          <p>
            Five of the sixteen stance cards are dealt: two to each school and one to rest. The seal on the resting card
            says who begins: <SchoolSeal player="red" className="inline-seal" /> Vermilion,{' '}
            <SchoolSeal player="blue" className="inline-seal" /> Indigo.
          </p>
        </section>

        <section className="rules-page">
          <h2><span>Three</span> A turn</h2>
          <div className="turn-demo">
            <CardView name="Crane" holder="blue" />
            <p>
              Choose one of your two cards and one of your pieces. The open ring is your piece; each filled dot is a
              square it may reach. Crane steps one forward, or one back on either diagonal.
            </p>
          </div>
          <p>
            You may jump over any piece, but you cannot land on your own. Land on an enemy piece and it is captured.
          </p>
        </section>

        <section className="rules-page">
          <h2><span>Four</span> The card crosses</h2>
          <p>
            This is the heart of the game. The card you used crosses the table and lies in front of your rival, turned
            to face them. They take it up when they next move. In the same moment, the card that was waiting for you
            comes into your hand.
          </p>
          <p>Before you strike, look at what you are about to give away.</p>
        </section>

        <section className="rules-page">
          <h2><span>Five</span> When no move exists</h2>
          <p>
            If neither of your cards offers a legal move, no piece moves, but you must still give up one card. The game
            will tell you when this happens.
          </p>
        </section>

        <section className="rules-page">
          <h2><span>Six</span> Sitting down</h2>
          <p>
            Lay the phone flat between two players. Each school's cards and messages face the player sitting on that
            side. On a computer the screen stays upright instead, and only the dots on Vermilion's cards are turned, to
            match the way it moves. A duel takes about ten minutes.
          </p>
        </section>

      </div>

      <footer className="rules-foot">
        <button type="button" className="link-btn" disabled={page === 0} onClick={() => turnTo(page - 1)}>Previous</button>
        <p className="rules-count" aria-live="polite">Page {page + 1} of {RULE_PAGES}</p>
        {lastPage ? (
          <button type="button" className="btn btn-ink rules-next" onClick={onPlay}>Begin the duel</button>
        ) : (
          <button type="button" className="btn btn-ink rules-next" onClick={() => turnTo(page + 1)}>Next</button>
        )}
      </footer>
    </main>
  );
}

export default function App() {
  const [screen, setScreen] = useState<Screen>('home');

  if (screen === 'game') {
    return <GameScreen onHome={() => setScreen('home')} />;
  }

  if (screen === 'rules') {
    return <Rules onBack={() => setScreen('home')} onPlay={() => setScreen('game')} />;
  }

  return (
    <main className="home">
      <header className="home-top">
        <LogoSeal className="home-seal" />
        <NightToggle />
      </header>
      <div className="home-body">
        <h1 className="home-title">Onitama</h1>
        <BrushRule className="home-rule" />
        <p className="home-lead">Two schools meet on a sacred island. What you use, your rival inherits.</p>
        <div className="home-actions">
          <button type="button" className="btn btn-ink" onClick={() => setScreen('game')}>Begin the duel</button>
          <button type="button" className="btn btn-quiet" onClick={() => setScreen('rules')}>The rules</button>
        </div>
      </div>
      <Island />
      <p className="home-foot">One phone, two players, seated face to face.</p>
    </main>
  );
}
