/* ══════════════════════════════════════════════════════════════════════════
   Time.

   One rule governs this file: the countdown is always derived from the
   window's real opens-at instant, never from a decrementing counter. A
   counter drifts when the tab is backgrounded and desyncs when the device
   clock moves — and a countdown that is wrong at 5:58 a.m. is worse than no
   countdown at all.
   ══════════════════════════════════════════════════════════════════════════ */

export const SECOND = 1000;
export const MINUTE = 60 * SECOND;
export const HOUR = 60 * MINUTE;
export const DAY = 24 * HOUR;

export function msUntil(iso: string, now: number = Date.now()): number {
  return new Date(iso).getTime() - now;
}

/** Whole seconds remaining, floored at zero. */
export function secondsUntil(iso: string, now: number = Date.now()): number {
  return Math.max(0, Math.ceil(msUntil(iso, now) / SECOND));
}

/** `MM:SS`, the Race Mode face. Minutes are not capped at 59 — a 90-minute
 *  window reads "90:00" rather than silently wrapping. */
export function formatCountdown(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const mm = Math.floor(s / 60);
  const ss = s % 60;
  return `${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
}

/**
 * The tracker's time-until string. Deliberately different shapes at
 * different distances — that difference is part of how urgency is encoded.
 *
 *   under an hour  →  "01:47"      (ticking, tabular)
 *   under a day    →  "4h 12m"
 *   under a month  →  "in 3 days"
 *   beyond         →  handled by the caller as an absolute date
 */
export function formatTimeUntil(ms: number): string {
  if (ms <= 0) return "open now";
  if (ms < HOUR) return formatCountdown(ms / SECOND);
  if (ms < DAY) {
    const h = Math.floor(ms / HOUR);
    const m = Math.floor((ms % HOUR) / MINUTE);
    return `${h}h ${m}m`;
  }
  const days = Math.round(ms / DAY);
  return days === 1 ? "tomorrow" : `in ${days} days`;
}

/** "Oct 1", "Nov 12" — the absolute form used once a window is far enough out
 *  that a relative string stops meaning anything. */
export function formatShortDate(iso: string, timeZone?: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    ...(timeZone === undefined ? {} : { timeZone }),
  });
}

/** "Saturday, February 7" — the review queue's date line. */
export function formatLongDate(iso: string, timeZone?: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    ...(timeZone === undefined ? {} : { timeZone }),
  });
}

/** "6:00 AM" in the provider's zone. The zone label is rendered separately
 *  and is never dropped — a wrong time costs a season. */
export function formatClockTime(iso: string, timeZone: string): string {
  return new Date(iso)
    .toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      timeZone,
    })
    .replace(/ /g, " ");
}

export type UrgencyGroup =
  | "open-now"
  | "this-week"
  | "this-month"
  | "later";

/**
 * Which band a window falls into.
 *
 * "Open now" holds windows that are already open AND those opening inside a
 * day — because a window that opens in four hours belongs with the race, not
 * with next week's planning. This is the grouping the tracker's structural
 * hierarchy hangs off.
 */
export function urgencyGroupFor(
  opensAtIso: string,
  now: number = Date.now(),
): UrgencyGroup {
  const ms = msUntil(opensAtIso, now);
  if (ms <= DAY) return "open-now";
  if (ms <= 7 * DAY) return "this-week";
  if (ms <= 31 * DAY) return "this-month";
  return "later";
}
