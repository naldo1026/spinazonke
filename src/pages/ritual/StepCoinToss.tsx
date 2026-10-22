import { useState } from 'react';
import type { CoinSide, RitualState } from '../../types';
import { PLAYER_IDS } from '../../types';
import { useStore } from '../../store/store';
import { MIN_WHEEL_PRE_TOSS, TOSS_REMOVALS, wheelItems } from '../../store/selectors';
import { joinNames, playerName } from '../../data/players';
import { coinFlip } from '../../lib/random';
import { audio } from '../../audio/audioManager';
import { Coin } from '../../components/Coin';
import { Typewriter } from '../../components/Typewriter';
import styles from './Ritual.module.css';

function Puppet() {
  // An original creepy-puppet face. Spirals for cheeks, of course.
  return (
    <svg viewBox="0 0 100 100" className={styles.puppet} aria-hidden="true">
      <ellipse cx="50" cy="52" rx="32" ry="40" fill="#efe9e0" />
      <ellipse cx="38" cy="42" rx="6" ry="7" fill="#111" />
      <ellipse cx="62" cy="42" rx="6" ry="7" fill="#111" />
      <circle cx="39" cy="41" r="1.5" fill="#c00" />
      <circle cx="63" cy="41" r="1.5" fill="#c00" />
      <path d="M30 60a6 6 0 1 0 6-6M70 60a6 6 0 1 1-6-6" stroke="#b00018" strokeWidth="3" fill="none" />
      <path d="M40 76q10 6 20 0" stroke="#7a0010" strokeWidth="4" fill="none" strokeLinecap="round" />
      <path d="M44 74v8M56 74v8" stroke="#222" strokeWidth="2" />
    </svg>
  );
}

export function StepCoinToss({ ritual }: { ritual: RitualState }) {
  const consequences = useStore((s) => s.consequences);
  const updateRitual = useStore((s) => s.updateRitual);
  const applyCoinToss = useStore((s) => s.applyCoinToss);

  const [typed, setTyped] = useState(false);
  const [flipping, setFlipping] = useState(false);
  const [picked, setPicked] = useState<string[]>([]);

  const toss = ritual.toss ?? { phase: 'intro' as const };
  const loserId = ritual.loser!;
  const loser = playerName(loserId);
  const others = joinNames(PLAYER_IDS.filter((id) => id !== loserId));
  const onWheel = wheelItems(consequences);

  const skip = () => {
    applyCoinToss(ritual.gameWeek, { played: false, removedConsequenceIds: [] });
    updateRitual({ step: 4, toss: undefined });
  };

  const call = (side: CoinSide) => {
    // Rolled and saved before the animation, so a refresh can't re-roll it.
    const result = coinFlip();
    updateRitual({ toss: { phase: 'flip', call: side, result, winner: result === side ? 'loser' : 'others' } });
    setFlipping(true);
    audio.sfx('coin');
  };

  const confirmRemoval = () => {
    applyCoinToss(ritual.gameWeek, {
      played: true,
      call: toss.call,
      result: toss.result,
      winner: toss.winner,
      removedConsequenceIds: picked,
    });
    updateRitual({ step: 4 });
  };

  if (toss.phase === 'intro') {
    return (
      <div className={`${styles.step} ${styles.center} ${styles.saw}`}>
        <Puppet />
        <Typewriter
          text="Do you want to play a game?"
          className={styles.sawLine}
          onDone={() => setTyped(true)}
        />
        <p className={styles.lead} style={{ color: '#9a8f8f', opacity: typed ? 1 : 0, transition: 'opacity 0.6s' }}>
          {loser} calls the coin. Win it and {loser} strikes 3 consequences off this week's wheel. Lose it and {others}{' '}
          strike 3.
        </p>
        {onWheel.length < MIN_WHEEL_PRE_TOSS && (
          <p className="notice">
            Only {onWheel.length} on the wheel. The coin toss needs at least {MIN_WHEEL_PRE_TOSS}.
          </p>
        )}
        <div className={styles.actions} style={{ opacity: typed ? 1 : 0, transition: 'opacity 0.6s 0.3s' }}>
          <button
            type="button"
            className={`btn btn-lg ${styles.sawBtnPlay}`}
            disabled={!typed || onWheel.length < MIN_WHEEL_PRE_TOSS}
            onClick={() => updateRitual({ toss: { phase: 'call' } })}
          >
            Play
          </button>
          <button type="button" className={`btn btn-lg ${styles.sawBtnSkip}`} disabled={!typed} onClick={skip}>
            Skip
          </button>
        </div>
      </div>
    );
  }

  if (toss.phase === 'call') {
    return (
      <div className={`${styles.step} ${styles.center} ${styles.saw}`}>
        <span className="eyebrow" style={{ color: '#c33' }}>
          Make your choice
        </span>
        <h1 className={styles.title}>{loser}, call it.</h1>
        <Coin flipping={false} />
        <div className={styles.actions}>
          <button type="button" className={`btn btn-lg ${styles.sawBtnPlay}`} onClick={() => call('heads')}>
            Heads
          </button>
          <button type="button" className={`btn btn-lg ${styles.sawBtnPlay}`} onClick={() => call('tails')}>
            Tails
          </button>
        </div>
      </div>
    );
  }

  if (toss.phase === 'flip') {
    const loserWon = toss.winner === 'loser';
    return (
      <div className={`${styles.step} ${styles.center} ${styles.saw}`}>
        <span className="eyebrow" style={{ color: '#c33' }}>
          {loser} called {toss.call}
        </span>
        <Coin result={toss.result} flipping={flipping} onDone={() => setFlipping(false)} />
        {!flipping && (
          <>
            <p className={styles.result}>{toss.result}!</p>
            <p className={styles.lead} style={{ color: '#ddd' }}>
              {loserWon
                ? `${loser} wins the toss and picks ${TOSS_REMOVALS} to strike off.`
                : `${loser} loses the toss. ${others} pick ${TOSS_REMOVALS} to strike off.`}
            </p>
            <button
              type="button"
              className={`btn btn-lg ${styles.sawBtnPlay}`}
              onClick={() => updateRitual({ toss: { ...toss, phase: 'pick' } })}
            >
              Pick {TOSS_REMOVALS}
            </button>
          </>
        )}
      </div>
    );
  }

  // pick
  const picker = toss.winner === 'loser' ? loser : others;
  const toggle = (id: string) =>
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : p.length < TOSS_REMOVALS ? [...p, id] : p));

  return (
    <div className={`${styles.step} ${styles.center} ${styles.saw}`}>
      <span className="eyebrow" style={{ color: '#c33' }}>
        {picker} {toss.winner === 'loser' ? 'picks' : 'pick'}
      </span>
      <h1 className={styles.title}>Strike {TOSS_REMOVALS} off</h1>
      <p className={styles.lead} style={{ color: '#aaa' }}>
        They're off this week's wheel and go back to the bank. Not deleted.
      </p>
      <ul className={styles.pickList}>
        {onWheel.map((c) => {
          const on = picked.includes(c.id);
          return (
            <li key={c.id}>
              <button
                type="button"
                className={styles.pickItem}
                aria-pressed={on}
                disabled={!on && picked.length >= TOSS_REMOVALS}
                onClick={() => toggle(c.id)}
              >
                <span className={styles.pickBox}>{on ? '✕' : ''}</span>
                <span>{c.text}</span>
              </button>
            </li>
          );
        })}
      </ul>
      <button
        type="button"
        className={`btn btn-lg ${styles.sawBtnPlay}`}
        disabled={picked.length !== TOSS_REMOVALS}
        onClick={confirmRemoval}
      >
        {picked.length === TOSS_REMOVALS ? `Remove these ${TOSS_REMOVALS}` : `${picked.length} / ${TOSS_REMOVALS} picked`}
      </button>
    </div>
  );
}
