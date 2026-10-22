import { useState } from 'react';
import type { PlayerId, RevealedPhoto } from '../types';
import { PLAYER_IDS } from '../types';
import { useStore } from '../store/store';
import { playerName } from '../data/players';
import { PlayerAvatar } from '../components/PlayerCard';
import { Modal } from '../components/Modal';
import styles from './Shame.module.css';

const url = (path: string) => `${import.meta.env.BASE_URL}${path}`;

export function Shame() {
  const players = useStore((s) => s.players);
  const [open, setOpen] = useState<{ player: PlayerId; photo: RevealedPhoto } | null>(null);
  const total = PLAYER_IDS.reduce((n, id) => n + players[id].revealedPhotos.length, 0);

  return (
    <div className="page">
      <h1 className="page-title">
        Hall of Shame
        <small>Every photo that's been earned. Five losses, one photo.</small>
      </h1>

      {total === 0 && (
        <div className={`card ${styles.empty}`}>
          <h2>Clean sheet</h2>
          <p className="muted">Nobody's been eliminated yet. Give it time.</p>
        </div>
      )}

      {PLAYER_IDS.map((id) => {
        const p = players[id];
        const shown = new Set(p.revealedPhotos.map((r) => r.path));
        const hidden = p.photoPool.filter((path) => !shown.has(path)).length;
        return (
          <section key={id} className={styles.group}>
            <header className={styles.groupHead}>
              <PlayerAvatar id={id} size={40} />
              <h2>{playerName(id)}</h2>
              <span className="faint">
                {p.revealedPhotos.length} revealed{hidden > 0 ? ` · ${hidden} still in the vault` : ''}
              </span>
            </header>
            {p.revealedPhotos.length === 0 ? (
              <p className="faint">Nothing yet.</p>
            ) : (
              <ul className={styles.grid}>
                {p.revealedPhotos
                  .slice()
                  .sort((a, b) => b.gameWeek - a.gameWeek)
                  .map((r, i) => (
                    <li key={`${r.path}-${r.revealedAt}`} style={{ rotate: `${i % 2 ? 1.5 : -1.5}deg` }}>
                      <button type="button" className={styles.polaroid} onClick={() => setOpen({ player: id, photo: r })}>
                        <img src={url(r.path)} alt={`${playerName(id)}, GW${r.gameWeek}`} loading="lazy" />
                        <span>GW{r.gameWeek}</span>
                      </button>
                    </li>
                  ))}
              </ul>
            )}
          </section>
        );
      })}

      <Modal
        open={open !== null}
        onClose={() => setOpen(null)}
        title={open ? `${playerName(open.player)} · GW${open.photo.gameWeek}` : undefined}
        actions={
          <button type="button" className="btn btn-ghost" onClick={() => setOpen(null)}>
            Close
          </button>
        }
      >
        {open && <img src={url(open.photo.path)} alt="" className={styles.big} />}
      </Modal>
    </div>
  );
}
