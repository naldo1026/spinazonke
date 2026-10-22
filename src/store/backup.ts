import type { AppState } from '../types';
import { validateAppState, type ValidationResult } from './validate';

export function backupFilename(date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `spinazonke-backup-${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}.json`;
}

export function downloadBackup(state: AppState): void {
  const { ritualInProgress: _, ...data } = state;
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = backupFilename();
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function readBackup(file: File): Promise<ValidationResult> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(await file.text());
  } catch {
    return { ok: false, error: "That file isn't valid JSON." };
  }
  return validateAppState(parsed);
}
