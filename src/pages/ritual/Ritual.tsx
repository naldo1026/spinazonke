import { AnimatePresence, motion } from 'framer-motion';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useStore } from '../../store/store';
import { findEntry, nextGameWeek } from '../../store/selectors';
import { audio, useTrack } from '../../audio/audioManager';
import { joinNames, playerName } from '../../data/players';
import { Modal } from '../../components/Modal';
import { Wheel } from '../../components/Wheel';
import { wheelItems } from '../../store/selectors';
import { StepLoser } from './StepLoser';
import { StepUnlock } from './StepUnlock';
import { StepCoinToss } from './StepCoinToss';
import { StepSpin } from './StepSpin';
import { StepReveal } from './StepReveal';
import { StepDone } from './StepDone';
import styles from './Ritual.module.css';

const STEP_LABELS = ['Loser', 'Unlock', 'Coin toss', 'Spin', 'Reveal', 'Done'];

function NotStarted() {
  const gameWeeks = useStore((s) => s.gameWeeks);
  const consequences = useStore((s) => s.consequences);
  const startRitual = useStore((s) => s.startRitual);
  const next = nextGameWeek(gameWeeks);

  if (!next) {
    return (
      <div className="page">
        <h1 className="page-title">
          Season over
          <small>All 38 game weeks are in the book. Check the table on the home screen.</small>
        </h1>
        <Link to="/" className="btn btn-primary">
          Back home
        </Link>
      </div>
    );
  }

  return (
    <div className={`page ${styles.notStarted}`}>
      <span className="eyebrow">The ritual</span>
      <h1 className="page-title">Game Week {next}</h1>
      <Wheel items={wheelItems(consequences)} gameWeek={next} size="min(70vw, 300px)" />
      <p className="muted">Record the loser, pay to play, toss the coin, spin the wheel.</p>
      <button type="button" className="btn btn-primary btn-lg" onClick={() => startRitual(next)}>
        Start Game Week {next}
      </button>
    </div>
  );
}

export function Ritual() {
  const ritual = useStore((s) => s.ritualInProgress);
  const endRitual = useStore((s) => s.endRitual);
  const deleteGameWeek = useStore((s) => s.deleteGameWeek);
  const gameWeeks = useStore((s) => s.gameWeeks);
  const [cancelOpen, setCancelOpen] = useState(false);
  const dramatic = useTrack('dramatic');

  if (!ritual) return <NotStarted />;

  // Browsers block autoplay, so after a refresh mid-ritual the music needs a tap to come back.
  const unlocked = Boolean(findEntry(gameWeeks, ritual.gameWeek, ritual.loser)?.addedConsequenceIds.length);
  const musicDue = (ritual.step === 2 && unlocked) || ritual.step === 3;
  const showResume = musicDue && !dramatic.playing && dramatic.available;

  const stepKeys = STEP_LABELS.map((label, i) => ({ label, step: i + 1 })).filter(
    (s) => s.step !== 5 || ritual.revealDue,
  );
  // The coin toss stays horror. The wheel is matchday, so it keeps the normal pitch background.
  const dark = ritual.step === 3;
  const tied = gameWeeks.filter((gw) => gw.gameWeek === ritual.gameWeek).length > 1;
  // Losers who haven't finished yet. Anyone who already did keeps their entry.
  const unfinished = ritual.loser ? [ritual.loser, ...(ritual.queue ?? [])] : [];
  const plural = unfinished.length > 1;

  const cancel = (undoLoss: boolean) => {
    audio.stopAll();
    if (undoLoss) for (const loser of unfinished) deleteGameWeek(ritual.gameWeek, loser);
    setCancelOpen(false);
    endRitual();
  };

  let body;
  switch (ritual.step) {
    case 1:
      body = <StepLoser ritual={ritual} />;
      break;
    case 2:
      body = <StepUnlock ritual={ritual} />;
      break;
    case 3:
      body = <StepCoinToss ritual={ritual} />;
      break;
    case 4:
      body = <StepSpin ritual={ritual} />;
      break;
    case 5:
      body = <StepReveal ritual={ritual} />;
      break;
    default:
      body = <StepDone ritual={ritual} />;
  }

  return (
    <div className={`${styles.ritual} ${dark ? styles.dark : ''}`}>
      <div className={styles.topBar}>
        <div className={styles.topInner}>
          <span className={styles.gw}>
            GW{ritual.gameWeek}
            {tied && ritual.loser && ` · ${playerName(ritual.loser)}`}
          </span>
          <ol className={styles.pips} aria-label="Progress">
            {stepKeys.map((s) => (
              <li
                key={s.step}
                className={`${styles.pip} ${s.step === ritual.step ? styles.pipNow : ''} ${s.step < ritual.step ? styles.pipDone : ''}`}
                aria-current={s.step === ritual.step ? 'step' : undefined}
              >
                <span className="sr-only">{s.label}</span>
              </li>
            ))}
          </ol>
          <span className={styles.stepLabel}>{STEP_LABELS[ritual.step - 1]}</span>
          <span className={styles.topSpacer} />
          {showResume && (
            <button
              type="button"
              className="icon-btn"
              style={{ background: 'var(--pl-cyan)', color: 'var(--pl-purple)' }}
              onClick={() => audio.play('dramatic')}
              aria-label="Resume music"
              title="Resume music"
            >
              ♪
            </button>
          )}
          {ritual.step < 6 && (
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setCancelOpen(true)}>
              Cancel
            </button>
          )}
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={ritual.step}
          className={styles.stepWrap}
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -30 }}
          transition={{ duration: 0.25 }}
        >
          {body}
        </motion.div>
      </AnimatePresence>

      <Modal
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
        title="Cancel the ritual?"
        actions={
          ritual.loser ? (
            <>
              <button type="button" className="btn btn-ghost" onClick={() => setCancelOpen(false)}>
                Keep going
              </button>
              <button type="button" className="btn btn-cyan" onClick={() => cancel(false)}>
                Cancel, keep {plural ? 'the losses' : 'the loss'}
              </button>
              <button type="button" className="btn btn-danger" onClick={() => cancel(true)}>
                Cancel &amp; undo {plural ? 'losses' : 'loss'}
              </button>
            </>
          ) : (
            <>
              <button type="button" className="btn btn-ghost" onClick={() => setCancelOpen(false)}>
                Keep going
              </button>
              <button type="button" className="btn btn-danger" onClick={() => cancel(false)}>
                Cancel ritual
              </button>
            </>
          )
        }
      >
        {ritual.loser ? (
          <p>
            {joinNames(unfinished)}'s GW{ritual.gameWeek} {plural ? 'losses are' : 'loss is'} already recorded. Keep{' '}
            {plural ? 'them' : 'it'} or undo {plural ? 'them' : 'it'}? Anything added to the bank this week stays there.
          </p>
        ) : (
          <p>Nothing has been recorded yet.</p>
        )}
      </Modal>
    </div>
  );
}
