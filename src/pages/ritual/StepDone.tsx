import { Link, useNavigate } from 'react-router-dom';
import type { RitualState } from '../../types';
import { PLAYER_IDS } from '../../types';
import { useStore } from '../../store/store';
import { joinNames, playerName } from '../../data/players';
import { audio } from '../../audio/audioManager';
import { PlayerAvatar } from '../../components/PlayerCard';
import styles from './Ritual.module.css';

export function StepDone({ ritual }: { ritual: RitualState }) {
  const gameWeeks = useStore((s) => s.gameWeeks);
  const consequences = useStore((s) => s.consequences);
  const endRitual = useStore((s) => s.endRitual);
  const navigate = useNavigate();

  const entry = gameWeeks.find((gw) => gw.gameWeek === ritual.gameWeek);
  const text = (id: string) => consequences.find((c) => c.id === id)?.text ?? '(deleted)';
  const loserId = ritual.loser!;
  const toss = entry?.coinToss;

  const finish = () => {
    audio.stopAll();
    endRitual();
    navigate('/');
  };

  let tossLine = 'Skipped';
  if (toss?.played) {
    const winners =
      toss.winner === 'loser' ? playerName(loserId) : joinNames(PLAYER_IDS.filter((id) => id !== loserId));
    tossLine = `Called ${toss.call}, landed ${toss.result}. ${winners} struck 3 off.`;
  }

  return (
    <div className={`${styles.step} ${styles.center}`}>
      <span className="eyebrow">Full time</span>
      <h1 className={styles.title}>
        GW{ritual.gameWeek} <em>done</em>
      </h1>

      <article className={`card ${styles.summary}`}>
        <header className={styles.summaryHead}>
          <PlayerAvatar id={loserId} size={48} />
          <div>
            <span className="eyebrow" style={{ color: 'var(--pl-green)' }}>
              Loser
            </span>
            <h2>{playerName(loserId)}</h2>
          </div>
        </header>
        <dl style={{ margin: 0 }}>
          <div className={styles.summaryRow}>
            <dt>Consequence</dt>
            <dd className={styles.bigConsequence}>
              {entry?.landedConsequenceId ? text(entry.landedConsequenceId) : 'No spin recorded'}
            </dd>
          </div>
          <div className={styles.summaryRow}>
            <dt>Coin toss</dt>
            <dd>{tossLine}</dd>
          </div>
          {toss?.played && toss.removedConsequenceIds.length > 0 && (
            <div className={styles.summaryRow}>
              <dt>Struck off (back in the bank)</dt>
              <dd>
                {toss.removedConsequenceIds.map((id) => (
                  <div key={id} className={styles.struck}>
                    {text(id)}
                  </div>
                ))}
              </dd>
            </div>
          )}
          {entry && entry.addedConsequenceIds.length > 0 && (
            <div className={styles.summaryRow}>
              <dt>Added to the bank</dt>
              <dd>
                {entry.addedConsequenceIds.map((id) => (
                  <div key={id}>{text(id)}</div>
                ))}
              </dd>
            </div>
          )}
          {ritual.revealDue && (
            <div className={styles.summaryRow}>
              <dt>Elimination</dt>
              <dd>
                {ritual.reveal?.path ? (
                  <>
                    Photo revealed. It's in the <Link to="/shame">Hall of Shame</Link>.
                  </>
                ) : (
                  'Photo owed. Add photos and reveal it from the home screen.'
                )}
              </dd>
            </div>
          )}
        </dl>
      </article>

      <button type="button" className="btn btn-primary btn-lg" onClick={finish}>
        Back to home
      </button>
    </div>
  );
}
