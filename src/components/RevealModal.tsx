import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import type { PlayerId } from '../types';
import { playerName } from '../data/players';
import { audio } from '../audio/audioManager';
import { Anim } from './Anim';
import { Football } from './Football';
import styles from './RevealModal.module.css';

type Phase = 'var' | 'decision' | 'photo';

const VAR_MS = 3200;
const DECISION_MS = 2600;

interface Props {
  player: PlayerId;
  gameWeek: number;
  /** Already picked by the caller. null = no photos uploaded for this player. */
  photoPath: string | null;
  onClose: () => void;
  closeLabel?: string;
}

function VarScreen() {
  return (
    <div className={styles.varScreen}>
      <div className={styles.varScan} />
      <div className={styles.varBox}>
        <span className={styles.varTag}>VAR</span>
        <span className={styles.varText}>Checking</span>
        <span className={styles.varDots}>
          <i />
          <i />
          <i />
        </span>
      </div>
      <p className={styles.varSub}>Possible elimination</p>
    </div>
  );
}

/** VAR check → ELIMINATED + red card → the photo. Full screen. */
export function RevealModal({ player, gameWeek, photoPath, onClose, closeLabel = 'Continue' }: Props) {
  const [phase, setPhase] = useState<Phase>('var');
  const [loaded, setLoaded] = useState(false);
  const name = playerName(player);

  useEffect(() => {
    if (phase === 'var') {
      const t = setTimeout(() => setPhase('decision'), VAR_MS);
      return () => clearTimeout(t);
    }
    if (phase === 'decision') {
      audio.sfx('whistle');
      const t = setTimeout(() => setPhase('photo'), DECISION_MS);
      return () => clearTimeout(t);
    }
    audio.sfx('crowd');
  }, [phase]);

  return createPortal(
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-label={`${name} eliminated`}>
      {phase !== 'photo' && (
        <button type="button" className={styles.skip} onClick={() => setPhase('photo')}>
          Skip
        </button>
      )}
      <AnimatePresence mode="wait">
        {phase === 'var' && (
          <motion.div key="var" className={styles.stage} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
            <Anim name="var" loop className={styles.lottie} fallback={<VarScreen />} />
          </motion.div>
        )}

        {phase === 'decision' && (
          <motion.div
            key="decision"
            className={`${styles.stage} ${styles.decision}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className={styles.redCard}
              initial={{ y: 260, rotate: -25, opacity: 0 }}
              animate={{ y: 0, rotate: -8, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 260, damping: 16, delay: 0.15 }}
            />
            <motion.h2
              className={styles.eliminated}
              initial={{ scale: 2.4, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 18, delay: 0.5 }}
            >
              Eliminated
            </motion.h2>
            <motion.p
              className={styles.decisionSub}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1 }}
            >
              {name} is out of lives
            </motion.p>
          </motion.div>
        )}

        {phase === 'photo' && (
          <motion.div
            key="photo"
            className={`${styles.stage} ${styles.photoStage}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            {photoPath && !loaded && (
              <div className={styles.loading}>
                <Football />
              </div>
            )}
            {photoPath ? (
              <motion.div
                className={styles.frame}
                initial={{ scale: 0.6, rotate: -6, opacity: 0 }}
                animate={loaded ? { scale: 1, rotate: -2, opacity: 1 } : { scale: 0.6, rotate: -6, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 160, damping: 14 }}
              >
                <img
                  src={`${import.meta.env.BASE_URL}${photoPath}`}
                  alt={`Embarrassing photo of ${name}`}
                  onLoad={() => setLoaded(true)}
                  onError={() => setLoaded(true)}
                />
              </motion.div>
            ) : (
              <div className={styles.owed}>
                <span className={styles.owedIcon}>?</span>
                <h3>Photo owed</h3>
                <p>
                  No photos of {name} yet. Add some to <code>public/photos/{player}/</code> and the reveal will be waiting
                  on the home screen.
                </p>
              </div>
            )}
            <motion.div
              className={styles.lowerThird}
              initial={{ x: '-110%' }}
              animate={{ x: 0 }}
              transition={{ delay: 0.5, type: 'spring', stiffness: 200, damping: 24 }}
            >
              <span className={styles.ltTag}>Hall of Shame</span>
              <span className={styles.ltName}>{name}</span>
              <span className={styles.ltGw}>GW{gameWeek}</span>
            </motion.div>
            <button type="button" className="btn btn-primary btn-lg" onClick={onClose}>
              {closeLabel}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>,
    document.body,
  );
}
