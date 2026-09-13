"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  DAY,
  formatShortDate,
  formatTimeUntil,
  msUntil,
  urgencyGroupFor,
} from "@/lib/time";
import surface from "@/components/layout/surface.module.css";
import styles from "./tracker.module.css";

export interface TrackerWindow {
  readonly id: string;
  readonly programName: string;
  readonly sessionLabel: string | null;
  readonly providerName: string;
  readonly kidNames: string;
  readonly opensAt: string;
  readonly isLottery: boolean;
  readonly prepDone: number;
  readonly prepTotal: number;
}

export interface NeedsInfo {
  readonly title: string;
  readonly body: string;
  readonly actionLabel: string;
  readonly href: string;
}

export interface TrackerListProps {
  readonly windows: readonly TrackerWindow[];
  readonly kidCount: number;
  readonly forwardAddress: string;
  readonly needsInfo: readonly NeedsInfo[];
}

const RULER_TICKS = 14;
const RULER_DAYS = 90;

export default function TrackerList({
  windows,
  kidCount,
  forwardAddress,
  needsInfo,
}: TrackerListProps) {
  /* Grouping and every relative time depend on "now", which the server cannot
     know for the client's clock. Rendering them only after mount keeps the
     first paint identical on both sides; the absolute dates below are stable
     either way, so nothing important is missing in that first frame. */
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    const sync = () => setNow(Date.now());
    sync();
    const timer = window.setInterval(sync, 1000);
    document.addEventListener("visibilitychange", sync);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", sync);
    };
  }, []);

  if (windows.length === 0) {
    return <EmptyTracker forwardAddress={forwardAddress} />;
  }

  const clock = now ?? Date.parse(windows[0]?.opensAt ?? "") - 1;

  const openNow = windows.filter(
    (w) => urgencyGroupFor(w.opensAt, clock) === "open-now",
  );
  const thisWeek = windows.filter(
    (w) => urgencyGroupFor(w.opensAt, clock) === "this-week",
  );
  const thisMonth = windows.filter(
    (w) => urgencyGroupFor(w.opensAt, clock) === "this-month",
  );
  const later = windows.filter(
    (w) => urgencyGroupFor(w.opensAt, clock) === "later",
  );

  const next = windows[0];
  const nextIn = next === undefined ? null : formatTimeUntil(msUntil(next.opensAt, clock));

  return (
    <>
      <div className={surface.header}>
        <div>
          <h1 className={surface.title}>Windows</h1>
          <p className={`${surface.subline} tnum`}>
            {windows.length} tracked · {kidCount} kids
            {nextIn === null ? "" : ` · next in ${nextIn}`}
          </p>
        </div>
        <Ruler windows={windows} now={clock} />
      </div>

      {openNow.length > 0 && (
        <>
          <div className={surface.groupLabel}>Open now</div>
          {openNow.map((w, i) =>
            i === 0 ? (
              <RaceCard key={w.id} w={w} now={clock} />
            ) : (
              <OpenRow key={w.id} w={w} now={clock} />
            ),
          )}
        </>
      )}

      {thisWeek.length > 0 && (
        <>
          <div className={surface.groupLabel}>This week</div>
          {thisWeek.map((w) => (
            <WeekRow key={w.id} w={w} now={clock} />
          ))}
        </>
      )}

      {thisMonth.length > 0 && (
        <>
          <div className={surface.groupLabel}>This month</div>
          {thisMonth.map((w) => (
            <MonthRow key={w.id} w={w} />
          ))}
        </>
      )}

      {later.length > 0 && (
        <>
          <div className={surface.groupLabel}>Later</div>
          {later.map((w) => (
            <LaterRow key={w.id} w={w} />
          ))}
        </>
      )}

      {needsInfo.map((n) => (
        <div key={n.title} className={styles.needsCard}>
          <div className={styles.needsLabel}>Needs your info</div>
          <div className={styles.needsTitle}>{n.title}</div>
          <p className={styles.needsBody}>{n.body}</p>
          <Link href={n.href} className={styles.needsAction}>
            {n.actionLabel}
          </Link>
        </div>
      ))}

      <p className={surface.footerNote}>
        Forward a confirmation or a newsletter to{" "}
        <span className={surface.footerAddress}>{forwardAddress}</span> and it
        lands in Review.
      </p>
    </>
  );
}

/* ── Ruler ──────────────────────────────────────────────────────────────── */

function Ruler({
  windows,
  now,
}: {
  windows: readonly TrackerWindow[];
  now: number;
}) {
  const bucketMs = (RULER_DAYS * DAY) / RULER_TICKS;
  const counts = new Array<number>(RULER_TICKS).fill(0);

  for (const w of windows) {
    const delta = msUntil(w.opensAt, now);
    if (delta < 0) continue;
    const bucket = Math.floor(delta / bucketMs);
    if (bucket < RULER_TICKS) {
      counts[bucket] = (counts[bucket] ?? 0) + 1;
    }
  }

  const max = Math.max(1, ...counts);

  return (
    <div className={styles.ruler} aria-hidden="true">
      {counts.map((count, i) => {
        const height = i === 0 ? 34 : Math.max(3, Math.round((count / max) * 26));
        const tone =
          i === 0 ? styles.tickToday : i <= 3 ? styles.tickSoon : "";
        return (
          <span
            key={i}
            className={`${styles.tick} ${tone}`}
            style={{ height }}
          />
        );
      })}
    </div>
  );
}

/* ── Rows ───────────────────────────────────────────────────────────────── */

/**
 * List rows use the compact form — "Camp Wildwood B", not "Camp Wildwood
 * Session B". At tracker density the word "Session" is the first thing that
 * pushes a title onto a second line, and it carries nothing: the session
 * letter is the part she is scanning for. Race Mode, which has the room and
 * needs the precision, keeps the full label.
 */
const fullName = (w: TrackerWindow) =>
  [w.programName, w.sessionLabel?.replace(/^Session\s+/i, "")]
    .filter(Boolean)
    .join(" ");

const kindLabel = (w: TrackerWindow) => (w.isLottery ? "lottery" : "first come");

function RaceCard({ w, now }: { w: TrackerWindow; now: number }) {
  return (
    <Link href={`/race/${w.id}`} className={styles.raceCard}>
      <div className={styles.openTop}>
        <span className={styles.raceTitle}>{fullName(w)}</span>
        <span className={styles.raceCountdown}>
          <span className="tnum">{formatTimeUntil(msUntil(w.opensAt, now))}</span>
          <span className={styles.countdownCaption}>until open</span>
        </span>
      </div>
      <div className={styles.openMeta}>
        {w.providerName} · {w.kidNames}
      </div>
      <div className={styles.raceFooter}>
        <span className={styles.raceEnter}>Enter race mode →</span>
        {w.prepTotal > 0 && (
          <span className={`${styles.racePrep} tnum`}>
            prep {w.prepDone} of {w.prepTotal}
          </span>
        )}
      </div>
    </Link>
  );
}

function OpenRow({ w, now }: { w: TrackerWindow; now: number }) {
  return (
    <Link href={`/race/${w.id}`} className={styles.openRow}>
      <div className={styles.openTop}>
        <span className={styles.openTitle}>{fullName(w)}</span>
        <span className={styles.openCountdown}>
          <span className="tnum">{formatTimeUntil(msUntil(w.opensAt, now))}</span>
          <span className={styles.countdownCaption}>{kindLabel(w)}</span>
        </span>
      </div>
      <div className={styles.openMeta}>
        {w.providerName} · {w.kidNames}
      </div>
    </Link>
  );
}

function WeekRow({ w, now }: { w: TrackerWindow; now: number }) {
  return (
    <Link href={`/race/${w.id}`} className={styles.weekRow}>
      <span>
        <span className={styles.weekTitle}>{fullName(w)}</span>
        <span className={styles.weekMeta}>
          {w.providerName} · {w.kidNames}
        </span>
      </span>
      <span className={styles.weekRight}>
        <span className={styles.weekTime}>
          {formatTimeUntil(msUntil(w.opensAt, now))}
        </span>
        <span className={styles.weekKind}>{kindLabel(w)}</span>
      </span>
    </Link>
  );
}

function MonthRow({ w }: { w: TrackerWindow }) {
  return (
    <Link href={`/race/${w.id}`} className={styles.monthRow}>
      <span>
        <span className={styles.monthTitle}>{fullName(w)}</span>
        <span className={styles.monthMeta}>
          {w.providerName} · {w.kidNames}
        </span>
      </span>
      <span className={`${styles.monthDate} tnum`}>
        {formatShortDate(w.opensAt)}
      </span>
    </Link>
  );
}

function LaterRow({ w }: { w: TrackerWindow }) {
  return (
    <Link href={`/race/${w.id}`} className={styles.laterRow}>
      <span className={styles.laterTitle}>{fullName(w)}</span>
      <span className={`${styles.laterDate} tnum`}>
        {formatShortDate(w.opensAt)}
      </span>
    </Link>
  );
}

/* ── Empty ──────────────────────────────────────────────────────────────── */

function EmptyTracker({ forwardAddress }: { forwardAddress: string }) {
  return (
    <>
      <h1 className={surface.title}>Windows</h1>
      <div className={styles.empty}>
        <div className={styles.emptyTitle}>Nothing tracked yet</div>
        <p className={styles.emptyBody}>
          Forward a camp or league email and Dibs reads the window out of it —
          dates, times, lottery or first-come, which kid it fits.
        </p>
        <span className={styles.emptyAddress}>{forwardAddress}</span>
      </div>
    </>
  );
}
