import type { Block } from './types';

export function pageTitle(page: Pick<Block, 'text'>): string {
  return page.text.trim() || 'Sin título';
}

const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sept', 'oct', 'nov', 'dic'];

/** Short Spanish relative time, e.g. "Hace 5 min", "Ayer", "3 mar". */
export function relativeTime(timestamp: number, now: number = Date.now()): string {
  const minutes = Math.floor((now - timestamp) / 60_000);
  if (minutes < 1) return 'Ahora';
  if (minutes < 60) return `Hace ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Hace ${hours} h`;

  const date = new Date(timestamp);
  const today = new Date(now);
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const days = Math.ceil((startOfToday - timestamp) / 86_400_000);
  if (days <= 1) return 'Ayer';
  if (days < 7) return `Hace ${days} días`;
  const label = `${date.getDate()} ${MONTHS[date.getMonth()]}`;
  return date.getFullYear() === today.getFullYear() ? label : `${label} ${date.getFullYear()}`;
}

/** What changed when a text input went from `before` to `after`. */
export function textChange(before: string, after: string): { start: number; inserted: string; removed: number } {
  let start = 0;
  const max = Math.min(before.length, after.length);
  while (start < max && before[start] === after[start]) start++;
  let end = 0;
  while (
    end < max - start &&
    before[before.length - 1 - end] === after[after.length - 1 - end]
  ) {
    end++;
  }
  return {
    start,
    inserted: after.slice(start, after.length - end),
    removed: before.length - end - start,
  };
}

/** Compact age for lists: "ahora", "5 min", "3 h", "2 d", "4 sem". */
export function shortAge(timestamp: number, now: number = Date.now()): string {
  const minutes = Math.floor((now - timestamp) / 60_000);
  if (minutes < 1) return 'ahora';
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} d`;
  return `${Math.floor(days / 7)} sem`;
}
