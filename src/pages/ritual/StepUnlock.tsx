import { useState, type FormEvent } from 'react';
import type { PlayerId, RitualState } from '../../types';
import { PLAYER_IDS } from '../../types';
import { useStore } from '../../store/store';
import { MIN_WHEEL_PRE_TOSS, wheelItems } from '../../store/selectors';
import { playerName } from '../../data/players';
import { audio } from '../../audio/audioManager';
import { Padlock } from '../../components/Padlock';
import styles from './Ritual.module.css';

export function StepUnlock({ ritual }: { ritual: RitualState }) {
  const gameWeeks = useStore((s) => s.gameWeeks);
  const consequences = useStore((s) => s.consequences);
  const addConsequence = useStore((s) => s.addConsequence);
  const setOnWheel = useStore((s) => s.setOnWheel);
  const updateRitual = useStore((s) => s.updateRitual);

  const [text, setText] = useState('');
  const [by, setBy] = useState<PlayerId | ''>('');

  const entry = gameWeeks.find((gw) => gw.gameWeek === ritual.gameWeek);
  const added = (entry?.addedConsequenceIds ?? [])
    .map((id) => consequences.find((c) => c.id === id))
    .filter((c) => c !== undefined);
  const unlocked = added.length > 0;
  const onWheel = wheelItems(consequences);
  const offWheel = consequences.filter((c) => !c.onWheel && !c.archived);
  const enough = onWheel.length >= MIN_WHEEL_PRE_TOSS;
  const loser = ritual.loser ? playerName(ritual.loser) : 'Loser';

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    addConsequence(text, by || undefined, ritual.gameWeek);
    setText('');
    if (!unlocked) {
      // This click is the user gesture browsers need before audio can start.
      audio.play('dramatic');
    }
  };

  return (
    <div className={`${styles.step} ${styles.center}`}>
      <span className="eyebrow">Step 2 · Pay to play</span>
      <h1 className={styles.title}>{unlocked ? <em>Unlocked</em> : 'The wheel is locked'}</h1>
      <Padlock open={unlocked} />
      <p className={styles.lead}>
        {unlocked
          ? 'Add more if you like. Everything added this week goes straight on the wheel.'
          : `No spin without a sacrifice. ${loser}, add at least one new consequence to the bank to unlock the wheel.`}
      </p>

      <form className={`card ${styles.form}`} onSubmit={submit}>
        <label className="field">
          <span>New consequence</span>
          <textarea
            className="textarea"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="e.g. Wear a bin bag to the pub"
            maxLength={140}
            rows={2}
          />
        </label>
        <label className="field">
          <span>Added by (optional)</span>
          <select className="select" value={by} onChange={(e) => setBy(e.target.value as PlayerId | '')}>
            <option value="">Nobody's owning up</option>
            {PLAYER_IDS.map((id) => (
              <option key={id} value={id}>
                {playerName(id)}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" className={`btn ${unlocked ? 'btn-ghost' : 'btn-primary'}`} disabled={!text.trim()}>
          {unlocked ? 'Add another' : 'Add & unlock'}
        </button>
      </form>

      {added.length > 0 && (
        <ul className={styles.chips} aria-label="Added this week">
          {added.map((c) => (
            <li key={c.id} className={styles.chip}>
              {c.text}
            </li>
          ))}
        </ul>
      )}

      <p className={styles.counter}>
        <strong>{onWheel.length}</strong> on the wheel
      </p>

      {unlocked && !enough && (
        <div className="notice" style={{ width: '100%', textAlign: 'left' }}>
          <p>
            Need at least {MIN_WHEEL_PRE_TOSS} on the wheel so the coin toss can take 3 off and still leave one. Add more
            above{offWheel.length > 0 ? ' or put some back from the bank:' : '.'}
          </p>
          {offWheel.length > 0 && (
            <ul className={styles.offList} style={{ marginTop: 10 }}>
              {offWheel.map((c) => (
                <li key={c.id}>
                  <span>{c.text}</span>
                  <button type="button" className="btn btn-green btn-sm" onClick={() => setOnWheel(c.id, true)}>
                    On wheel
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <button
        type="button"
        className="btn btn-primary btn-lg"
        disabled={!unlocked || !enough}
        onClick={() => updateRitual({ step: 3, toss: { phase: 'intro' } })}
      >
        Continue
      </button>
    </div>
  );
}
