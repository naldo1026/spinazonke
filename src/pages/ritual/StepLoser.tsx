import { useMemo, useState } from 'react';
import type { PlayerId, RitualState } from '../../types';
import { PLAYER_IDS } from '../../types';
import { useStore } from '../../store/store';
import { heartsLeft, lossesByPlayer, MAX_GAME_WEEK } from '../../store/selectors';
import { playerName } from '../../data/players';
import { PlayerCard } from '../../components/PlayerCard';
import styles from './Ritual.module.css';

export function StepLoser({ ritual }: { ritual: RitualState }) {
  const gameWeeks = useStore((s) => s.gameWeeks);
  const players = useStore((s) => s.players);
  const recordLoss = useStore((s) => s.recordLoss);
  const updateRitual = useStore((s) => s.updateRitual);

  const [gw, setGw] = useState(String(ritual.gameWeek));
  const [pick, setPick] = useState<PlayerId | null>(null);
  const [error, setError] = useState<string | null>(null);

  const losses = useMemo(() => lossesByPlayer(gameWeeks), [gameWeeks]);

  const confirm = () => {
    if (!pick) return;
    const gameWeek = Number(gw);
    const res = recordLoss(gameWeek, pick);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    updateRitual({ gameWeek, loser: pick, revealDue: res.eliminated });
  };

  // Loss recorded: show the heart going.
  if (ritual.loser) {
    const id = ritual.loser;
    const total = losses[id];
    const before = heartsLeft(total - 1);
    return (
      <div className={`${styles.step} ${styles.center}`}>
        <span className="eyebrow">Step 1 · Recorded</span>
        <h1 className={styles.title}>
          {playerName(id)} takes the <em>L</em>
        </h1>
        <div className={styles.lossCard}>
          <PlayerCard
            id={id}
            losses={total}
            hearts={before - 1}
            breakingIndex={before - 1}
            photosRevealed={players[id].revealedPhotos.length}
          />
        </div>
        {ritual.revealDue ? (
          <>
            <p className={styles.teaser}>That was the final heart.</p>
            <p className={styles.lead}>Something's coming after the spin. Hearts refill once it's done.</p>
          </>
        ) : (
          <p className={styles.lead}>
            {before - 1} {before - 1 === 1 ? 'heart' : 'hearts'} left before the photo comes out.
          </p>
        )}
        <button type="button" className="btn btn-primary btn-lg" onClick={() => updateRitual({ step: 2 })}>
          Continue
        </button>
      </div>
    );
  }

  return (
    <div className={`${styles.step} ${styles.center}`}>
      <span className="eyebrow">Step 1</span>
      <h1 className={styles.title}>Who lost?</h1>
      <label className={styles.gwField}>
        <span className="muted">Game week</span>
        <input
          className="input"
          type="number"
          inputMode="numeric"
          min={1}
          max={MAX_GAME_WEEK}
          value={gw}
          onChange={(e) => {
            setGw(e.target.value);
            setError(null);
          }}
        />
      </label>
      <div className={styles.cards}>
        {PLAYER_IDS.map((id) => (
          <PlayerCard
            key={id}
            id={id}
            losses={losses[id]}
            hearts={heartsLeft(losses[id])}
            photosRevealed={players[id].revealedPhotos.length}
            selected={pick === id}
            onSelect={() => {
              setPick(id);
              setError(null);
            }}
            badge={heartsLeft(losses[id]) === 1 ? 'Final heart' : undefined}
          />
        ))}
      </div>
      {error && <p className="notice notice-error">{error}</p>}
      <button type="button" className="btn btn-primary btn-lg" disabled={!pick} onClick={confirm}>
        {pick ? `${playerName(pick)} lost GW${gw}` : 'Pick the loser'}
      </button>
    </div>
  );
}
