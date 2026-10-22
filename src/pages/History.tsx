import { useState, type FormEvent } from 'react';
import type { GameWeekEntry, PlayerId } from '../types';
import { PLAYER_IDS } from '../types';
import { useStore } from '../store/store';
import { MAX_GAME_WEEK, nextGameWeek, sortedNewestFirst } from '../store/selectors';
import { joinNames, playerName, PLAYERS } from '../data/players';
import { Leaderboard } from '../components/Leaderboard';
import { ConfirmDialog } from '../components/Modal';
import { TrashIcon } from '../components/Icons';
import styles from './History.module.css';

type Pending =
  | { kind: 'change'; gameWeek: number; from: PlayerId; to: PlayerId }
  | { kind: 'delete'; gameWeek: number; loser: PlayerId };

function tossSummary(gw: GameWeekEntry): string | null {
  const t = gw.coinToss;
  if (!t) return null;
  if (!t.played) return 'Coin toss skipped';
  const winners = t.winner === 'loser' ? playerName(gw.loser) : joinNames(PLAYER_IDS.filter((id) => id !== gw.loser));
  return `Called ${t.call}, landed ${t.result} · ${winners} struck ${t.removedConsequenceIds.length}`;
}

export function History() {
  const gameWeeks = useStore((s) => s.gameWeeks);
  const consequences = useStore((s) => s.consequences);
  const ritual = useStore((s) => s.ritualInProgress);
  const recordLoss = useStore((s) => s.recordLoss);
  const updateLoser = useStore((s) => s.updateLoser);
  const deleteGameWeek = useStore((s) => s.deleteGameWeek);

  const next = nextGameWeek(gameWeeks);
  const [gw, setGw] = useState(String(next ?? ''));
  const [loser, setLoser] = useState<PlayerId>('ronaldo');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<Pending | null>(null);

  const text = (id?: string) => (id ? (consequences.find((c) => c.id === id)?.text ?? '(deleted)') : null);

  const quickAdd = (e: FormEvent) => {
    e.preventDefault();
    const res = recordLoss(Number(gw), loser);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setError(null);
    const after = nextGameWeek(useStore.getState().gameWeeks);
    setGw(String(after ?? ''));
  };

  const confirm = () => {
    if (!pending) return;
    if (pending.kind === 'change') updateLoser(pending.gameWeek, pending.to);
    else deleteGameWeek(pending.gameWeek);
    setPending(null);
  };

  return (
    <div className="page">
      <h1 className="page-title">
        History
        <small>Every game week, newest first. Fix the legacy weeks here if the order's wrong.</small>
      </h1>

      <Leaderboard gameWeeks={gameWeeks} title="Totals" />

      <form className={`card ${styles.quick}`} onSubmit={quickAdd}>
        <h2 className="section-title">Quick add</h2>
        <p className="faint">For a week you played without the ritual. Just logs the loser.</p>
        <div className={styles.quickRow}>
          <label className="field">
            <span>GW</span>
            <input
              className="input"
              type="number"
              inputMode="numeric"
              min={1}
              max={MAX_GAME_WEEK}
              value={gw}
              onChange={(e) => {
                setGw(e.target.value);
                setError(null);
              }}
            />
          </label>
          <label className="field">
            <span>Loser</span>
            <select className="select" value={loser} onChange={(e) => setLoser(e.target.value as PlayerId)}>
              {PLAYER_IDS.map((id) => (
                <option key={id} value={id}>
                  {playerName(id)}
                </option>
              ))}
            </select>
          </label>
          <button type="submit" className="btn btn-primary" disabled={!gw}>
            Add
          </button>
        </div>
        {error && <p className="notice notice-error">{error}</p>}
      </form>

      <ol className={styles.list}>
        {sortedNewestFirst(gameWeeks).map((entry) => {
          const landed = text(entry.landedConsequenceId);
          const toss = tossSummary(entry);
          const live = ritual?.gameWeek === entry.gameWeek;
          return (
            <li key={entry.gameWeek} className={styles.row} style={{ borderLeftColor: PLAYERS[entry.loser].colour }}>
              <div className={styles.gwBadge}>
                <span>GW</span>
                <strong>{entry.gameWeek}</strong>
              </div>
              <div className={styles.body}>
                <div className={styles.head}>
                  <select
                    className={`select ${styles.loserSelect}`}
                    value={entry.loser}
                    aria-label={`GW${entry.gameWeek} loser`}
                    onChange={(e) =>
                      setPending({
                        kind: 'change',
                        gameWeek: entry.gameWeek,
                        from: entry.loser,
                        to: e.target.value as PlayerId,
                      })
                    }
                  >
                    {PLAYER_IDS.map((id) => (
                      <option key={id} value={id}>
                        {playerName(id)}
                      </option>
                    ))}
                  </select>
                  {entry.legacy && <span className="badge">Legacy</span>}
                  {entry.triggeredReveal && <span className="badge badge-pink">Eliminated</span>}
                  {live && <span className="badge badge-cyan">In progress</span>}
                </div>
                {landed && (
                  <p className={styles.landed}>
                    <span className="faint">Landed on</span> {landed}
                  </p>
                )}
                {toss && <p className={styles.detail}>{toss}</p>}
                {entry.addedConsequenceIds.length > 0 && (
                  <p className={styles.detail}>
                    Added {entry.addedConsequenceIds.length} to the bank
                  </p>
                )}
              </div>
              <button
                type="button"
                className="icon-btn"
                aria-label={`Delete GW${entry.gameWeek}`}
                title="Delete"
                onClick={() => setPending({ kind: 'delete', gameWeek: entry.gameWeek, loser: entry.loser })}
              >
                <TrashIcon size={18} />
              </button>
            </li>
          );
        })}
      </ol>

      <ConfirmDialog
        open={pending !== null}
        title={pending?.kind === 'delete' ? `Delete GW${pending.gameWeek}?` : `Change GW${pending?.gameWeek ?? ''} loser?`}
        message={
          pending?.kind === 'delete' ? (
            <p>
              {playerName(pending.loser)}'s loss comes off the table. Consequences and photos already revealed stay as
              they are.
            </p>
          ) : pending ? (
            <p>
              Move the loss from {playerName(pending.from)} to {playerName(pending.to)}? Totals and hearts recalculate.
            </p>
          ) : null
        }
        confirmLabel={pending?.kind === 'delete' ? 'Delete' : 'Change'}
        danger={pending?.kind === 'delete'}
        onConfirm={confirm}
        onCancel={() => setPending(null)}
      />
    </div>
  );
}
