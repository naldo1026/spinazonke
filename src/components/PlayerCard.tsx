import type { PlayerId } from '../types';
import { PLAYERS } from '../data/players';
import { Hearts } from './Hearts';
import styles from './PlayerCard.module.css';

interface Props {
  id: PlayerId;
  losses: number;
  hearts: number;
  photosRevealed: number;
  /** Turns the card into a big pick button (ritual step 1). */
  onSelect?: () => void;
  selected?: boolean;
  breakingIndex?: number;
  badge?: string;
}

export function PlayerAvatar({ id, size = 52 }: { id: PlayerId; size?: number }) {
  const p = PLAYERS[id];
  return (
    <span
      className={styles.avatar}
      style={{ width: size, height: size, fontSize: size * 0.5, background: p.colour, color: p.ink }}
      aria-hidden="true"
    >
      {p.name[0]}
    </span>
  );
}

export function PlayerCard({ id, losses, hearts, photosRevealed, onSelect, selected, breakingIndex, badge }: Props) {
  const p = PLAYERS[id];
  const body = (
    <>
      <div className={styles.stripe} style={{ background: p.colour }} />
      <div className={styles.top}>
        <PlayerAvatar id={id} />
        <div className={styles.nameBlock}>
          <h3 className={styles.name}>{p.name}</h3>
          <Hearts filled={hearts} breakingIndex={breakingIndex} />
        </div>
        {badge && <span className={`badge badge-pink ${styles.badge}`}>{badge}</span>}
      </div>
      <dl className={styles.stats}>
        <div>
          <dt>Losses</dt>
          <dd>{losses}</dd>
        </div>
        <div>
          <dt>Lives</dt>
          <dd>{hearts}</dd>
        </div>
        <div>
          <dt>Photos</dt>
          <dd>{photosRevealed}</dd>
        </div>
      </dl>
    </>
  );

  if (onSelect) {
    return (
      <button
        type="button"
        className={`${styles.card} ${styles.selectable} ${selected ? styles.selected : ''}`}
        onClick={onSelect}
        aria-pressed={selected}
        style={{ ['--accent' as string]: p.colour }}
      >
        {body}
      </button>
    );
  }
  return (
    <article className={styles.card} style={{ ['--accent' as string]: p.colour }}>
      {body}
    </article>
  );
}
