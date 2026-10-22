import { useEffect } from 'react';
import type { RitualState } from '../../types';
import { useStore } from '../../store/store';
import { RevealModal } from '../../components/RevealModal';
import { Football } from '../../components/Football';
import styles from './Ritual.module.css';

export function StepReveal({ ritual }: { ritual: RitualState }) {
  const updateRitual = useStore((s) => s.updateRitual);

  // Pick the photo once and keep it in the ritual so a refresh shows the same one.
  // Reads fresh state because StrictMode runs this effect twice in dev.
  useEffect(() => {
    const { ritualInProgress: r, revealPhoto, updateRitual: update } = useStore.getState();
    if (!r || r.reveal || !r.loser) return;
    update({ reveal: { path: revealPhoto(r.loser, r.gameWeek) } });
  }, []);

  if (!ritual.reveal || !ritual.loser) {
    return (
      <div className={`${styles.step} ${styles.center}`}>
        <Football />
      </div>
    );
  }

  return (
    <RevealModal
      player={ritual.loser}
      gameWeek={ritual.gameWeek}
      photoPath={ritual.reveal.path}
      onClose={() => updateRitual({ step: 6 })}
    />
  );
}
