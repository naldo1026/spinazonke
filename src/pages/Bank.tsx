import { useState, type FormEvent } from 'react';
import type { Consequence, PlayerId } from '../types';
import { PLAYER_IDS } from '../types';
import { useStore } from '../store/store';
import { MIN_WHEEL_PRE_TOSS, wheelItems } from '../store/selectors';
import { playerName } from '../data/players';
import { Wheel } from '../components/Wheel';
import { ConfirmDialog } from '../components/Modal';
import { EditIcon, TrashIcon } from '../components/Icons';
import styles from './Bank.module.css';

function Row({ c }: { c: Consequence }) {
  const setOnWheel = useStore((s) => s.setOnWheel);
  const editConsequence = useStore((s) => s.editConsequence);
  const archiveConsequence = useStore((s) => s.archiveConsequence);
  const restoreConsequence = useStore((s) => s.restoreConsequence);
  const deleteConsequence = useStore((s) => s.deleteConsequence);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(c.text);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const save = (e: FormEvent) => {
    e.preventDefault();
    if (draft.trim()) editConsequence(c.id, draft);
    setEditing(false);
  };

  const meta = [
    c.createdBy ? `Added by ${playerName(c.createdBy)}` : null,
    `Landed ${c.timesLanded}×`,
  ].filter(Boolean);

  return (
    <li className={`${styles.row} ${c.archived ? styles.archived : ''}`}>
      {!c.archived && (
        <label className="switch" title={c.onWheel ? 'On the wheel' : 'Off the wheel'}>
          <input
            type="checkbox"
            checked={c.onWheel}
            onChange={(e) => setOnWheel(c.id, e.target.checked)}
            aria-label={`${c.text}: on the wheel`}
          />
          <span />
        </label>
      )}
      <div className={styles.main}>
        {editing ? (
          <form onSubmit={save} className={styles.editForm}>
            <input
              className="input"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              maxLength={140}
              autoFocus
              aria-label="Consequence text"
            />
            <button type="submit" className="btn btn-green btn-sm">
              Save
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => {
                setDraft(c.text);
                setEditing(false);
              }}
            >
              Cancel
            </button>
          </form>
        ) : (
          <>
            <p className={styles.text}>{c.text}</p>
            <p className={styles.meta}>{meta.join(' · ')}</p>
          </>
        )}
      </div>
      {!editing && (
        <div className={styles.rowActions}>
          {!c.archived && (
            <button type="button" className="icon-btn" onClick={() => setEditing(true)} aria-label="Edit" title="Edit">
              <EditIcon size={18} />
            </button>
          )}
          {c.archived ? (
            <>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => restoreConsequence(c.id)}>
                Restore
              </button>
              <button
                type="button"
                className="icon-btn"
                onClick={() => setConfirmDelete(true)}
                aria-label="Delete forever"
                title="Delete forever"
              >
                <TrashIcon size={18} />
              </button>
            </>
          ) : (
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => archiveConsequence(c.id)}>
              Archive
            </button>
          )}
        </div>
      )}
      <ConfirmDialog
        open={confirmDelete}
        title="Delete forever?"
        message={
          <p>
            “{c.text}” will be gone for good. Past game weeks that landed on it will show it as deleted. Archiving is
            usually enough.
          </p>
        }
        confirmLabel="Delete"
        danger
        onConfirm={() => {
          setConfirmDelete(false);
          deleteConsequence(c.id);
        }}
        onCancel={() => setConfirmDelete(false)}
      />
    </li>
  );
}

export function Bank() {
  const consequences = useStore((s) => s.consequences);
  const addConsequence = useStore((s) => s.addConsequence);
  const [text, setText] = useState('');
  const [by, setBy] = useState<PlayerId | ''>('');
  const [showArchived, setShowArchived] = useState(false);

  const onWheel = wheelItems(consequences);
  const offWheel = consequences.filter((c) => !c.onWheel && !c.archived);
  const archived = consequences.filter((c) => c.archived);

  const add = (e: FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    addConsequence(text, by || undefined);
    setText('');
  };

  return (
    <div className="page">
      <h1 className="page-title">
        Consequence bank
        <small>Every consequence ever made. Toggle what's on the wheel.</small>
      </h1>

      <div className={styles.top}>
        <form className={`card ${styles.addForm}`} onSubmit={add}>
          <h2 className="section-title">Add one</h2>
          <label className="field">
            <span>Consequence</span>
            <textarea
              className="textarea"
              value={text}
              onChange={(e) => setText(e.target.value)}
              maxLength={140}
              rows={2}
              placeholder="e.g. Hoover the whole flat"
            />
          </label>
          <label className="field">
            <span>Added by (optional)</span>
            <select className="select" value={by} onChange={(e) => setBy(e.target.value as PlayerId | '')}>
              <option value="">—</option>
              {PLAYER_IDS.map((id) => (
                <option key={id} value={id}>
                  {playerName(id)}
                </option>
              ))}
            </select>
          </label>
          <button type="submit" className="btn btn-primary" disabled={!text.trim()}>
            Add to bank & wheel
          </button>
        </form>

        <section className={`card ${styles.preview}`} aria-label="Wheel preview">
          <Wheel items={onWheel} size="min(70vw, 280px)" />
          <p className={styles.count}>
            <strong>{onWheel.length}</strong> on the wheel
          </p>
          {onWheel.length < MIN_WHEEL_PRE_TOSS && (
            <p className="notice">Need at least {MIN_WHEEL_PRE_TOSS} on the wheel before a spin.</p>
          )}
        </section>
      </div>

      <section className={styles.section}>
        <h2 className="section-title">On the wheel ({onWheel.length})</h2>
        {onWheel.length === 0 ? (
          <p className="faint">Nothing on the wheel.</p>
        ) : (
          <ul className={styles.list}>
            {onWheel.map((c) => (
              <Row key={c.id} c={c} />
            ))}
          </ul>
        )}
      </section>

      <section className={styles.section}>
        <h2 className="section-title">In the bank ({offWheel.length})</h2>
        {offWheel.length === 0 ? (
          <p className="faint">Everything's on the wheel. Coin-toss removals end up here.</p>
        ) : (
          <ul className={styles.list}>
            {offWheel.map((c) => (
              <Row key={c.id} c={c} />
            ))}
          </ul>
        )}
      </section>

      {archived.length > 0 && (
        <section className={styles.section}>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowArchived((v) => !v)}>
            {showArchived ? 'Hide' : 'Show'} archived ({archived.length})
          </button>
          {showArchived && (
            <ul className={styles.list}>
              {archived.map((c) => (
                <Row key={c.id} c={c} />
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
