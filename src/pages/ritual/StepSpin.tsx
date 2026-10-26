import { useCallback, useEffect, useRef, useState } from 'react';
import type { RitualState } from '../../types';
import { useStore } from '../../store/store';
import { findEntry, MIN_WHEEL_PRE_TOSS, wheelItems } from '../../store/selectors';
import { playerName } from '../../data/players';
import { randomFloat, randomInt, randomRange } from '../../lib/random';
import { targetRotation } from '../../lib/wheelMath';
import { celebrate } from '../../lib/celebrate';
import { audio } from '../../audio/audioManager';
import { Wheel } from '../../components/Wheel';
import { Anim, hasLottie } from '../../components/Anim';
import styles from './Ritual.module.css';

type Phase = 'ready' | 'spinning' | 'landed';

const SPIN_MS = 10_000;

export function StepSpin({ ritual }: { ritual: RitualState }) {
  const consequences = useStore((s) => s.consequences);
  const gameWeeks = useStore((s) => s.gameWeeks);
  const updateRitual = useStore((s) => s.updateRitual);

  // Anything already decided (refresh, or navigating away mid-spin) shows as landed.
  const [phase, setPhase] = useState<Phase>(ritual.spin ? 'landed' : 'ready');
  const [rotation, setRotation] = useState(ritual.spin?.rotation ?? 0);
  const finished = useRef(Boolean(ritual.spin?.committed));
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const items = ritual.spin
    ? ritual.spin.segmentIds.map((id) => consequences.find((c) => c.id === id)).filter((c) => c !== undefined)
    : wheelItems(consequences);
  const entry = findEntry(gameWeeks, ritual.gameWeek, ritual.loser);
  const minimum = entry?.coinToss?.played ? 1 : MIN_WHEEL_PRE_TOSS;
  const landed = ritual.spin ? consequences.find((c) => c.id === ritual.spin!.targetId) : undefined;
  const loser = ritual.loser ? playerName(ritual.loser) : 'The loser';

  const finish = useCallback((fanfare: boolean) => {
    if (finished.current) return;
    finished.current = true;
    clearTimeout(timer.current);
    const { ritualInProgress: r, commitSpin, updateRitual: update } = useStore.getState();
    if (!r?.spin || !r.loser) return;
    commitSpin({ gameWeek: r.gameWeek, loser: r.loser }, r.spin.targetId);
    update({ spin: { ...r.spin, committed: true } });
    setPhase('landed');
    if (fanfare) {
      audio.stop('clown');
      audio.sfx('celebrate');
      celebrate();
    }
  }, []);

  // Restored with a result that was never committed: count it now, no fanfare.
  useEffect(() => {
    if (ritual.spin && !ritual.spin.committed) finish(false);
    return () => {
      clearTimeout(timer.current);
      audio.stop('clown');
    };
    // Mount/unmount only.
  }, []);

  const spin = () => {
    const n = items.length;
    if (n < minimum) return;
    const index = randomInt(n);
    const final = targetRotation(index, n, randomRange(6, 9), randomFloat() - 0.5);
    const durationMs = SPIN_MS;
    // Saved before the wheel moves, so refreshing can't re-roll it.
    updateRitual({
      spin: { segmentIds: items.map((c) => c.id), targetId: items[index].id, rotation: final, durationMs, committed: false },
    });
    audio.stop('dramatic');
    audio.play('clown');
    // This click is the user gesture the pointer ticks need.
    audio.unlock();
    setPhase('spinning');
    // Let the transition style land before the rotation changes.
    requestAnimationFrame(() => requestAnimationFrame(() => setRotation(final)));
    // Backup in case transitionend never fires (e.g. tab in the background).
    timer.current = setTimeout(() => finish(true), durationMs + 800);
  };

  return (
    <div className={`${styles.step} ${styles.center}`}>
      <span className="eyebrow">Step 4 · The wheel of fate</span>
      <h1 className={styles.title}>
        {phase === 'landed' ? (
          <>
            The wheel <em>has spoken</em>
          </>
        ) : (
          <>
            {loser}, <em>face the wheel</em>
          </>
        )}
      </h1>

      <Wheel
        items={items}
        gameWeek={ritual.gameWeek}
        rotation={rotation}
        durationMs={phase === 'spinning' ? (ritual.spin?.durationMs ?? SPIN_MS) : 0}
        onSpinEnd={() => finish(true)}
        highlightId={phase === 'landed' ? ritual.spin?.targetId : undefined}
      />

      {phase === 'ready' && (
        <>
          {items.length < minimum ? (
            <p className="notice">
              Need at least {minimum} on the wheel to spin. Add or re-enable some in the Bank.
            </p>
          ) : (
            <p className="muted">{items.length} fates on the wheel. No take-backs. No mercy.</p>
          )}
          <button
            type="button"
            className={`btn btn-primary btn-lg ${styles.spinBtn}`}
            disabled={items.length < minimum}
            onClick={spin}
          >
            Spin
          </button>
        </>
      )}

      {phase === 'spinning' && <p className="muted">No going back now…</p>}

      {phase === 'landed' && landed && (
        <>
          {hasLottie('confetti') && <Anim name="confetti" className={styles.confettiLottie} fallback={null} />}
          <div className={styles.lowerThird}>
            <div className={styles.ltTop}>
              <span>VAR check complete · {loser} must</span>
              <span>GW{ritual.gameWeek}</span>
            </div>
            <div className={styles.ltMain}>{landed.text}</div>
            <div className={styles.ltStripe} />
          </div>
          <button
            type="button"
            className="btn btn-primary btn-lg"
            onClick={() => updateRitual({ step: ritual.revealDue ? 5 : 6 })}
          >
            {ritual.revealDue ? 'One more thing…' : 'Continue'}
          </button>
        </>
      )}
    </div>
  );
}
