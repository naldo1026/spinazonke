import type { GameWeekEntry } from '../types';
import { PLAYERS } from '../data/players';
import { leaderboard } from '../store/selectors';
import { PlayerAvatar } from './PlayerCard';
import styles from './Leaderboard.module.css';

export function Leaderboard({ gameWeeks, title = 'Table' }: { gameWeeks: GameWeekEntry[]; title?: string }) {
  const rows = leaderboard(gameWeeks);
  const max = Math.max(1, ...rows.map((r) => r.losses));
  return (
    <section className={`card ${styles.board}`} aria-label="Loss table">
      <header className={styles.head}>
        <h2 className="section-title">{title}</h2>
        <span className="faint">Most losses at GW38 is the season's biggest loser</span>
      </header>
      <ol className={styles.list}>
        {rows.map((row, i) => (
          <li key={row.id} className={`${styles.row} ${row.biggestLoser ? styles.biggest : ''}`}>
            <span className={styles.pos}>{i + 1}</span>
            <PlayerAvatar id={row.id} size={32} />
            <span className={styles.name}>{PLAYERS[row.id].name}</span>
            <span>{row.biggestLoser && <span className="badge badge-pink">Biggest loser</span>}</span>
            <span className={styles.bar} aria-hidden="true">
              <span style={{ width: `${(row.losses / max) * 100}%`, background: PLAYERS[row.id].colour }} />
            </span>
            <span className={styles.losses}>
              {row.losses}
              <small>L</small>
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}
