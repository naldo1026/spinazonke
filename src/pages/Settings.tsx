import { useRef, useState, type ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import type { AppState } from '../types';
import { PLAYER_IDS } from '../types';
import { snapshot, useStore } from '../store/store';
import { downloadBackup, readBackup } from '../store/backup';
import { PHOTO_MANIFEST } from '../data/photos';
import { playerName } from '../data/players';
import { audio, type Track } from '../audio/audioManager';
import { ConfirmDialog } from '../components/Modal';
import styles from './Settings.module.css';

export function Settings() {
  const settings = useStore((s) => s.settings);
  const setMuted = useStore((s) => s.setMuted);
  const setVolume = useStore((s) => s.setVolume);
  const importState = useStore((s) => s.importState);
  const resetAll = useStore((s) => s.resetAll);
  const navigate = useNavigate();

  const fileRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState<AppState | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [resetStage, setResetStage] = useState<0 | 1 | 2>(0);

  const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const res = await readBackup(file);
    if (res.ok) setImporting(res.state);
    else setMessage({ ok: false, text: res.error });
  };

  const test = (track: Track) => {
    audio.play(track);
    setTimeout(() => audio.stop(track), 4000);
  };

  return (
    <div className="page">
      <h1 className="page-title">Settings</h1>

      <section className={`card ${styles.section}`}>
        <h2 className="section-title">Sound</h2>
        <label className={styles.toggleRow}>
          <span>Mute everything</span>
          <span className="switch">
            <input type="checkbox" checked={settings.muted} onChange={(e) => setMuted(e.target.checked)} />
            <span />
          </span>
        </label>
        <label className="field">
          <span>Volume · {Math.round(settings.volume * 100)}%</span>
          <input
            type="range"
            min={0}
            max={100}
            value={Math.round(settings.volume * 100)}
            onChange={(e) => setVolume(Number(e.target.value) / 100)}
            className={styles.range}
          />
        </label>
        <div className="row">
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => test('dramatic')}>
            Test dramatic
          </button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => test('clown')}>
            Test clown
          </button>
        </div>
        <p className="faint">
          Tracks live in <code>public/audio/</code> as <code>dramatic.mp3</code> and <code>clown.mp3</code>. If a test
          is silent, the file isn't there yet.
        </p>
      </section>

      <section className={`card ${styles.section}`}>
        <h2 className="section-title">Backup</h2>
        <p className="muted">
          Everything lives in this browser only. Export now and then so a cleared cache doesn't wipe the season.
        </p>
        <div className="row">
          <button type="button" className="btn btn-cyan" onClick={() => downloadBackup(snapshot())}>
            Export JSON
          </button>
          <button type="button" className="btn btn-ghost" onClick={() => fileRef.current?.click()}>
            Import JSON
          </button>
          <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={onFile} />
        </div>
        {message && <p className={`notice ${message.ok ? '' : 'notice-error'}`}>{message.text}</p>}
      </section>

      <section className={`card ${styles.section}`}>
        <h2 className="section-title">Photos found</h2>
        <ul className={styles.photoCounts}>
          {PLAYER_IDS.map((id) => (
            <li key={id}>
              <strong>{PHOTO_MANIFEST[id].length}</strong> {playerName(id)}
            </li>
          ))}
        </ul>
        <p className="faint">
          Drop images into <code>public/photos/&lt;player&gt;/</code> and restart <code>npm run dev</code> (or run{' '}
          <code>npm run photos</code>).
        </p>
      </section>

      <section className={`card ${styles.section} ${styles.danger}`}>
        <h2 className="section-title">Danger zone</h2>
        <p className="muted">
          Reset wipes everything and goes back to the starting point: GW1–7 seeded, example consequences, no photos
          revealed.
        </p>
        <button type="button" className="btn btn-danger" onClick={() => setResetStage(1)}>
          Reset all data
        </button>
      </section>

      <ConfirmDialog
        open={importing !== null}
        title="Overwrite everything?"
        message={
          importing && (
            <p>
              The backup has {importing.gameWeeks.length} game weeks and {importing.consequences.length} consequences.
              It replaces everything in this browser, including any ritual in progress.
            </p>
          )
        }
        confirmLabel="Import"
        danger
        onConfirm={() => {
          if (importing) importState(importing);
          audio.stopAll();
          setImporting(null);
          setMessage({ ok: true, text: 'Backup imported.' });
        }}
        onCancel={() => setImporting(null)}
      />

      <ConfirmDialog
        open={resetStage === 1}
        title="Reset all data?"
        message={<p>Every game week, consequence and revealed photo goes. Export a backup first if in doubt.</p>}
        confirmLabel="Yes, reset"
        danger
        onConfirm={() => setResetStage(2)}
        onCancel={() => setResetStage(0)}
      />
      <ConfirmDialog
        open={resetStage === 2}
        title="Really?"
        message={<p>There's no undo. Last chance.</p>}
        confirmLabel="Wipe it"
        danger
        onConfirm={() => {
          audio.stopAll();
          resetAll();
          setResetStage(0);
          navigate('/');
        }}
        onCancel={() => setResetStage(0)}
      />
    </div>
  );
}
