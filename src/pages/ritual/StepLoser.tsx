import { useMemo, useState } from 'react';
import type { PlayerId, RitualState } from '../../types';
import { PLAYER_IDS } from '../../types';
import { useStore } from '../../store/store';
import { findEntry, heartsLeft, lossesByPlayer, MAX_GAME_WEEK } from '../../store/selectors';
import { joinNames, playerName } from '../../data/players';
import { PlayerCard } from '../../components/PlayerCard';
import styles from './Ritual.module.css';

export function StepLoser({ ritual }: { ritual: RitualState }) {
  const gameWeeks = useStore((s) => s.gameWeeks);
  const players = useStore((s) => s.players);
  const recordLoss = useStore((s) => s.recordLoss);
  const updateRitual = useStore((s) => s.updateRitual);

  const [gw, setGw] = useState(String(ritual.gameWeek));
  // More than one pick means a tie: they take turns, in the order picked.
  const [picks, setPicks] = useState<PlayerId[]>([]);
  const [error, setError] = useState<string | null>(null);

  const losses = useMemo(() => lossesByPlayer(gameWeeks), [gameWeeks]);

  const toggle = (id: PlayerId) => {
    setPicks((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
    setError(null);
  };

  const confirm = () => {
    if (picks.length === 0) return;
    const gameWeek = Number(gw);
    const res = recordLoss(gameWeek, picks);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    const [loser, ...queue] = picks;
    updateRitual({
      gameWeek,
      loser,
      queue: queue.length > 0 ? queue : undefined,
      revealDue: res.eliminated.includes(loser),
    });
  };

  // Loss recorded: show the heart going.
  if (ritual.loser) {
    const ids = [ritual.loser, ...(ritual.queue ?? [])];
    const tied = ids.length > 1;
    const eliminated = ids.filter((id) => findEntry(gameWeeks, ritual.gameWeek, id)?.triggeredReveal);
    const left = heartsLeft(losses[ritual.loser] - 1) - 1;
    return (
      <div className={`${styles.step} ${styles.center}`}>
        <span className="eyebrow">Step 1 · Recorded</span>
        <h1 className={styles.title}>
          {joinNames(ids)} {tied ? 'take' : 'takes'} the <em>L</em>
        </h1>
        <div className={styles.lossCards}>
          {ids.map((id) => {
            const before = heartsLeft(losses[id] - 1);
            return (
              <div key={id} className={styles.lossCard}>
                <PlayerCard
                  id={id}
                  losses={losses[id]}
                  hearts={before - 1}
                  breakingIndex={before - 1}
                  photosRevealed={players[id].revealedPhotos.length}
                />
              </div>
            );
          })}
        </div>
        {eliminated.length > 0 ? (
          <>
            <p className={styles.teaser}>
              {tied ? `That was the final heart for ${joinNames(eliminated)}.` : 'That was the final heart.'}
            </p>
            <p className={styles.lead}>Something's coming after the spin. Hearts refill once it's done.</p>
          </>
        ) : (
          !tied && (
            <p className={styles.lead}>
              {left} {left === 1 ? 'heart' : 'hearts'} left before the photo comes out.
            </p>
          )
        )}
        {tied && (
          <p className={styles.lead}>
            A tie, so everyone faces the wheel. {playerName(ids[0])} goes first, then {joinNames(ids.slice(1))}. Each of
            you pays to play, tosses the coin and spins.
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
      <p className="muted">Tied for last? Pick everyone who tied.</p>
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
            selected={picks.includes(id)}
            onSelect={() => toggle(id)}
            badge={heartsLeft(losses[id]) === 1 ? 'Final heart' : undefined}
          />
        ))}
      </div>
      {error && <p className="notice notice-error">{error}</p>}
      <button type="button" className="btn btn-primary btn-lg" disabled={picks.length === 0} onClick={confirm}>
        {picks.length > 0 ? `${joinNames(picks)} lost GW${gw}` : 'Pick the loser'}
      </button>
    </div>
  );
}
