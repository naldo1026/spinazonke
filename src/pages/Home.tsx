import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import type { PlayerId } from '../types';
import { PLAYER_IDS } from '../types';
import { useStore } from '../store/store';
import { heartsLeft, lossesByPlayer, nextGameWeek, owedReveals } from '../store/selectors';
import { playerName } from '../data/players';
import { PlayerCard } from '../components/PlayerCard';
import { Leaderboard } from '../components/Leaderboard';
import { RevealModal } from '../components/RevealModal';
import styles from './Home.module.css';

interface Revealing {
  player: PlayerId;
  gameWeek: number;
  path: string | null;
}

export function Home() {
  const gameWeeks = useStore((s) => s.gameWeeks);
  const players = useStore((s) => s.players);
  const ritual = useStore((s) => s.ritualInProgress);
  const startRitual = useStore((s) => s.startRitual);
  const revealPhoto = useStore((s) => s.revealPhoto);
  const navigate = useNavigate();
  const [revealing, setRevealing] = useState<Revealing | null>(null);

  const losses = useMemo(() => lossesByPlayer(gameWeeks), [gameWeeks]);
  const owed = useMemo(() => owedReveals({ players, gameWeeks }), [players, gameWeeks]);
  const next = nextGameWeek(gameWeeks);

  const start = () => {
    if (!ritual && next) startRitual(next);
    navigate('/spin');
  };

  const reveal = (player: PlayerId, gameWeek: number) => {
    const path = revealPhoto(player, gameWeek);
    setRevealing({ player, gameWeek, path });
  };

  return (
    <div className="page">
      <section className={styles.hero}>
        <div className={styles.heroText}>
          <span className="eyebrow">{ritual ? 'Ritual in progress' : next ? 'Up next' : 'Full time'}</span>
          <h1 className={styles.heroTitle}>
            {ritual ? (
              <>
                Game Week <em>{ritual.gameWeek}</em>
              </>
            ) : next ? (
              <>
                Game Week <em>{next}</em>
              </>
            ) : (
              <>Season over</>
            )}
          </h1>
          <p className="muted">
            {ritual
              ? 'Pick up where you left off.'
              : next
                ? "Somebody's spinning tonight. Record the loser, pay to play, then face the wheel."
                : "GW38 is in the book. Here's who ended up on top."}
          </p>
        </div>
        {(ritual || next) && (
          <motion.button
            type="button"
            className={`btn btn-primary btn-lg ${styles.startBtn}`}
            onClick={start}
            whileTap={{ scale: 0.96 }}
          >
            {ritual ? `Resume Game Week ${ritual.gameWeek}` : `Start Game Week ${next}`}
          </motion.button>
        )}
      </section>

      {!ritual &&
        owed.map((o) => (
          <section key={o.player} className={styles.owed}>
            <span className={styles.owedCard} aria-hidden="true" />
            <div>
              <h3>{playerName(o.player)} owes a photo</h3>
              <p className="muted">Eliminated in GW{o.gameWeek} and the reveal never happened.</p>
            </div>
            <button type="button" className="btn btn-danger btn-sm" onClick={() => reveal(o.player, o.gameWeek)}>
              Reveal
            </button>
          </section>
        ))}

      <section className={styles.cards} aria-label="Players">
        {PLAYER_IDS.map((id) => {
          const hearts = heartsLeft(losses[id]);
          return (
            <PlayerCard
              key={id}
              id={id}
              losses={losses[id]}
              hearts={hearts}
              photosRevealed={players[id].revealedPhotos.length}
              badge={hearts === 1 ? 'Final heart' : undefined}
            />
          );
        })}
      </section>

      <Leaderboard gameWeeks={gameWeeks} />

      <nav className={styles.quick}>
        <Link to="/bank" className="btn btn-ghost btn-sm">
          Consequence bank
        </Link>
        <Link to="/history" className="btn btn-ghost btn-sm">
          History
        </Link>
        <Link to="/shame" className="btn btn-ghost btn-sm">
          Hall of Shame
        </Link>
      </nav>

      {revealing && (
        <RevealModal
          player={revealing.player}
          gameWeek={revealing.gameWeek}
          photoPath={revealing.path}
          closeLabel="Done"
          onClose={() => setRevealing(null)}
        />
      )}
    </div>
  );
}
