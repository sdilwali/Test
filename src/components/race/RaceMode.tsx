"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { cx } from "@/lib/cx";
import { formatCountdown } from "@/lib/time";
import { usePrefersReducedMotion, useSecondsUntil } from "@/lib/use-countdown";
import type { RaceChip } from "@/lib/race-chips";
import styles from "./race.module.css";

/* ══════════════════════════════════════════════════════════════════════════
   The signature surface.

   Phases run pre → x0 → x1 → x2 → open, then optionally to a result. The
   crossing is the one orchestrated moment in the product and its timings are
   fixed by the design: x1 at 780ms, x2 at 1620ms, settled at 2500ms. Under
   reduced motion it skips straight to `open` with no interpolation, and the
   open state is fully legible statically.
   ══════════════════════════════════════════════════════════════════════════ */

export type Phase =
  | "pre"
  | "x0"
  | "x1"
  | "x2"
  | "open"
  | "got"
  | "waitlist"
  | "missed";

export interface RaceKid {
  readonly id: string;
  readonly name: string;
  readonly chips: readonly RaceChip[];
}

export interface RaceModeProps {
  readonly programName: string;
  readonly sessionLabel: string | null;
  readonly providerName: string;
  readonly sessionDates: string | null;
  readonly opensAtIso: string;
  /** Window length in seconds, for the progress ring's fraction. */
  readonly totalSeconds: number;
  readonly opensAtClock: string;
  readonly timezoneLabel: string;
  readonly url: string | null;
  readonly kids: readonly RaceKid[];
  readonly prep: readonly { readonly id: string; readonly label: string; readonly done: boolean }[];
  readonly resultDetails: {
    readonly got: readonly (readonly [string, string, ("sage" | "accent")?])[];
    readonly waitlist: readonly (readonly [string, string, ("sage" | "accent")?])[];
    readonly missed: readonly (readonly [string, string, ("sage" | "accent")?])[];
  };
  readonly kidNames: string;
}

const RING_CIRCUMFERENCE = 855;
const NEAR_THRESHOLD_SECONDS = 60;
const COPY_CONFIRM_MS = 3200;

export default function RaceMode(props: RaceModeProps) {
  const {
    programName,
    sessionLabel,
    providerName,
    sessionDates,
    opensAtIso,
    totalSeconds,
    opensAtClock,
    timezoneLabel,
    url,
    kids,
    prep: initialPrep,
    resultDetails,
    kidNames,
  } = props;

  const reduced = usePrefersReducedMotion();
  const secs = useSecondsUntil(opensAtIso);

  const [phase, setPhase] = useState<Phase>("pre");
  const [activeKidId, setActiveKidId] = useState(kids[0]?.id ?? "");
  const [prep, setPrep] = useState(initialPrep);
  const [copied, setCopied] = useState<RaceChip | null>(null);

  const crossingTimers = useRef<number[]>([]);
  const copyTimer = useRef<number | null>(null);
  const hasCrossed = useRef(false);

  /* ── The crossing ─────────────────────────────────────────────────────── */

  const cross = useCallback(() => {
    crossingTimers.current.forEach(window.clearTimeout);
    crossingTimers.current = [];

    if (reduced) {
      setPhase("open");
      return;
    }

    setPhase("x0");
    crossingTimers.current = [
      window.setTimeout(() => setPhase("x1"), 780),
      window.setTimeout(() => setPhase("x2"), 1620),
      window.setTimeout(() => setPhase("open"), 2500),
    ];
  }, [reduced]);

  useEffect(() => {
    if (secs === null || hasCrossed.current) return;
    if (secs > 0) return;
    hasCrossed.current = true;
    cross();
  }, [secs, cross]);

  useEffect(
    () => () => {
      crossingTimers.current.forEach(window.clearTimeout);
      if (copyTimer.current !== null) window.clearTimeout(copyTimer.current);
    },
    [],
  );

  /* ── Copy ─────────────────────────────────────────────────────────────── */

  const copyChip = useCallback(async (chip: RaceChip) => {
    try {
      await navigator.clipboard.writeText(chip.value);
    } catch {
      /* Clipboard can be refused (insecure context, denied permission). The
         confirmation must still tell the truth, so fall back to a selection
         the parent can copy by hand rather than claiming success. */
      const ta = document.createElement("textarea");
      ta.value = chip.value;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand("copy");
      } finally {
        document.body.removeChild(ta);
      }
    }
    setCopied(chip);
    if (copyTimer.current !== null) window.clearTimeout(copyTimer.current);
    copyTimer.current = window.setTimeout(
      () => setCopied(null),
      COPY_CONFIRM_MS,
    );
  }, []);

  const selectKid = useCallback((kidId: string) => {
    setActiveKidId(kidId);
    /* Switching tabs clears the confirmation — a "copied" bar left over from
       the other kid is exactly the ambiguity this screen exists to remove. */
    setCopied(null);
    if (copyTimer.current !== null) window.clearTimeout(copyTimer.current);
  }, []);

  const togglePrep = useCallback((id: string) => {
    setPrep((rows) =>
      rows.map((r) => (r.id === id ? { ...r, done: !r.done } : r)),
    );
  }, []);

  /* ── Derived ──────────────────────────────────────────────────────────── */

  const isPre = phase === "pre" || phase === "x0" || phase === "x1" || phase === "x2";
  /* Past the first beat of the crossing: numerals, ring and captions all
     clear out together to make room for "Window open". */
  const crossing = phase === "x1" || phase === "x2";
  const isOpenish = phase === "open" || phase === "got" || phase === "waitlist" || phase === "missed";
  const isResult = phase === "got" || phase === "waitlist" || phase === "missed";
  const ctaUnlocked = phase === "x2" || isOpenish;

  const displaySecs = secs ?? totalSeconds;
  const near = displaySecs <= NEAR_THRESHOLD_SECONDS;
  const countdownText = phase === "pre" ? formatCountdown(displaySecs) : "00:00";
  const ringOffset =
    RING_CIRCUMFERENCE *
    (1 - Math.max(0, Math.min(1, displaySecs / Math.max(1, totalSeconds))));

  const prepDone = prep.filter((p) => p.done).length;
  const activeKid = kids.find((k) => k.id === activeKidId) ?? kids[0];

  const providerLine = [providerName, sessionDates]
    .filter((v): v is string => v !== null && v !== "")
    .join(" · ");

  return (
    <main
      className={cx(
        styles.screen,
        isOpenish && styles.screenOpen,
        phase === "open" && styles.screenPinned,
      )}
      data-phase={phase}
    >
      <div className={styles.topBar}>
        <Link href="/windows" className={styles.back}>
          ← Tracker
        </Link>
        <span className={styles.raceLabel}>Race mode</span>
      </div>

      {!isResult && (
        <>
          <h1 className={styles.programName}>{programName}</h1>
          <div className={styles.programMeta}>
            {sessionLabel !== null && (
              <span className={styles.sessionName}>{sessionLabel}</span>
            )}
            <span className={styles.providerLine}>{providerLine}</span>
          </div>
        </>
      )}

      {isPre && (
        <>
          <div className={styles.countdownBlock}>
            <svg
              className={cx(styles.ring, crossing && styles.ringHidden)}
              viewBox="0 0 300 300"
              aria-hidden="true"
            >
              <circle className={styles.ringTrack} cx="150" cy="150" r="136" />
              <circle
                className={`${styles.ringProgress} ${near ? styles.ringProgressNear : ""}`}
                cx="150"
                cy="150"
                r="136"
                strokeDasharray={RING_CIRCUMFERENCE}
                strokeDashoffset={phase === "pre" ? ringOffset : 0}
              />
            </svg>

            <span
              className={cx(
                styles.countdownLabel,
                crossing && styles.captionGone,
              )}
            >
              {near ? "Registration opens in" : "Opens in"}
            </span>

            <div
              className={[
                "numerals",
                styles.numerals,
                near ? styles.numeralsNear : "",
                phase === "x0" ? styles.numeralsX0 : "",
                crossing ? styles.numeralsGone : "",
              ]
                .filter(Boolean)
                .join(" ")}
              /* The countdown is announced on a slow cadence rather than every
                 second, so a screen reader is useful instead of relentless. */
              role="timer"
              aria-live="off"
            >
              {countdownText}
            </div>
            <span className={cx(styles.units, crossing && styles.captionGone)}>
              minutes · seconds
            </span>

            <span
              className={cx(styles.windowOpen, crossing && styles.windowOpenIn)}
              aria-hidden={phase === "pre" || phase === "x0"}
            >
              Window open
            </span>
          </div>

          <div
            className={cx(styles.prep, crossing && styles.prepCollapsed)}
          >
            <div className={styles.prepHeader}>
              <span className={styles.prepLabel}>Prep</span>
              <span
                className={`${styles.prepCount} ${prepDone === prep.length ? styles.prepCountDone : ""} tnum`}
              >
                {prepDone} of {prep.length}
              </span>
            </div>
            {prep.map((row) => (
              <button
                key={row.id}
                type="button"
                className={styles.prepRow}
                aria-pressed={row.done}
                onClick={() => togglePrep(row.id)}
              >
                <span
                  className={`${styles.prepMark} ${row.done ? styles.prepMarkDone : ""}`}
                  aria-hidden="true"
                >
                  ✓
                </span>
                <span
                  className={`${styles.prepText} ${row.done ? styles.prepTextDone : ""}`}
                >
                  {row.label}
                </span>
              </button>
            ))}
          </div>
        </>
      )}

      {!isResult && (
        <CtaButton
          unlocked={ctaUnlocked}
          url={url}
          countdownText={countdownText}
          providerName={providerName}
          sessionLabel={sessionLabel}
        />
      )}

      {phase === "open" && activeKid !== undefined && (
        <div className={styles.openScroll}>
          <div className={styles.copyHint}>
            <span className={styles.copyHintLabel}>Tap a field to copy</span>
            <span className={styles.openAt}>
              open {opensAtClock} {timezoneLabel}
            </span>
          </div>

          {kids.length > 1 && (
            <div className={styles.kidTabs} role="tablist">
              {kids.map((k) => (
                <button
                  key={k.id}
                  type="button"
                  role="tab"
                  aria-selected={k.id === activeKid.id}
                  className={`${styles.kidTab} ${k.id === activeKid.id ? styles.kidTabActive : ""}`}
                  onClick={() => selectKid(k.id)}
                >
                  {k.name}
                </button>
              ))}
            </div>
          )}

          <div className={styles.chips}>
            {activeKid.chips.map((chip) => {
              const isCopied = copied?.label === chip.label;
              return (
                <button
                  key={chip.label}
                  type="button"
                  className={`${styles.chip} ${isCopied ? styles.chipCopied : ""}`}
                  onClick={() => void copyChip(chip)}
                >
                  <span className={styles.chipBody}>
                    <span className={styles.chipLabel}>{chip.label}</span>
                    <span className={`${styles.chipValue} tnum`}>
                      {chip.value}
                    </span>
                  </span>
                  <span className={styles.chipState}>
                    {isCopied ? "copied" : "copy"}
                  </span>
                </button>
              );
            })}
          </div>

          <div
            className={`${styles.copyBar} ${copied !== null ? styles.copyBarActive : ""}`}
            aria-live="polite"
          >
            {copied === null
              ? "Copied text appears here"
              : `Copied · ${copied.value}`}
          </div>

          <div className={styles.outcomes}>
            <button
              type="button"
              className={`${styles.outcome} ${styles.outcomeGot}`}
              onClick={() => setPhase("got")}
            >
              I got it
            </button>
            <button
              type="button"
              className={`${styles.outcome} ${styles.outcomeWait}`}
              onClick={() => setPhase("waitlist")}
            >
              Waitlisted
            </button>
            <button
              type="button"
              className={`${styles.outcome} ${styles.outcomeMissed}`}
              onClick={() => setPhase("missed")}
            >
              Missed
            </button>
          </div>
        </div>
      )}

      {isResult && (
        <Result
          phase={phase}
          programName={programName}
          sessionLabel={sessionLabel}
          kidNames={kidNames}
          details={resultDetails}
          onUndo={() => setPhase("open")}
        />
      )}
    </main>
  );
}

/* ── CTA ──────────────────────────────────────────────────────────────────
   Locked, the element is genuinely `disabled` and is a <button>. Unlocked, it
   becomes an <a> that opens the registration page in a new tab. The swap is
   the point: before zero there is no target to mis-tap into.
   ─────────────────────────────────────────────────────────────────────── */

function CtaButton({
  unlocked,
  url,
  countdownText,
  providerName,
  sessionLabel,
}: {
  unlocked: boolean;
  url: string | null;
  countdownText: string;
  providerName: string;
  sessionLabel: string | null;
}) {
  const sub = [providerName, sessionLabel]
    .filter((v): v is string => v !== null && v !== "")
    .join(" · ");

  if (!unlocked) {
    return (
      <button type="button" className={styles.cta} disabled>
        <span className={`${styles.ctaLabel} tnum`}>
          Opens in {countdownText}
        </span>
        <span className={styles.ctaSub}>button unlocks at zero</span>
      </button>
    );
  }

  return (
    <a
      className={`${styles.cta} ${styles.ctaOpen}`}
      href={url ?? "#"}
      target="_blank"
      rel="noopener noreferrer"
    >
      <span className={styles.ctaLabel}>Open registration page</span>
      <span className={styles.ctaSub}>{sub}</span>
    </a>
  );
}

/* ── Result ──────────────────────────────────────────────────────────────── */

const RESULT_COPY = {
  got: {
    mark: "✓",
    markBg: "var(--sage-400)",
    markFg: "var(--on-sage)",
    titleFg: "var(--sage-300)",
    title: "You got it",
    detailTitle: "Registered",
    primary: "See week 1 and 2 on the grid",
    primaryHref: "/coverage",
    primaryClass: styles.resultPrimarySage,
    undo: "Not yet — I tapped this too early",
  },
  waitlist: {
    mark: "~",
    markBg: "var(--accent-rule)",
    markFg: "var(--accent-300)",
    titleFg: "var(--accent-300)",
    title: "Waitlisted",
    detailTitle: "Your position",
    primary: "Track Session C · opens Feb 18",
    primaryHref: "/windows",
    primaryClass: styles.resultPrimaryAccent,
    undo: "Actually I got in — undo",
  },
  missed: {
    mark: "—",
    markBg: "var(--mark-missed)",
    markFg: "var(--ink-3)",
    titleFg: "var(--ink)",
    title: "Window closed",
    detailTitle: "Covers the same weeks",
    primary: "Add both to the tracker",
    primaryHref: "/windows",
    primaryClass: styles.resultPrimaryAccent,
    undo: "I actually registered — undo",
  },
} as const;

function Result({
  phase,
  programName,
  sessionLabel,
  kidNames,
  details,
  onUndo,
}: {
  phase: "got" | "waitlist" | "missed";
  programName: string;
  sessionLabel: string | null;
  kidNames: string;
  details: RaceModeProps["resultDetails"];
  onUndo: () => void;
}) {
  const c = RESULT_COPY[phase];
  const full = [programName, sessionLabel].filter(Boolean).join(" ");

  const body =
    phase === "got"
      ? `${kidNames} ${kidNames.includes(",") || kidNames.includes(" and ") ? "are" : "is"} registered for ${full}. Dibs filed the confirmation and updated the summer grid.`
      : phase === "waitlist"
        ? `${sessionLabel ?? "The session"} filled while you were in checkout. Dibs is watching this waitlist and will alert you the moment a spot drops.`
        : `${sessionLabel ?? "The session"} filled at 6:04 a.m. Two other windows cover the same two weeks and have not opened yet.`;

  return (
    <div className={styles.result}>
      <div
        className={styles.resultMark}
        style={{ background: c.markBg, color: c.markFg }}
        aria-hidden="true"
      >
        {c.mark}
      </div>
      <h1 className={styles.resultTitle} style={{ color: c.titleFg }}>
        {c.title}
      </h1>
      <p className={styles.resultBody}>{body}</p>

      <div className={styles.detailCard}>
        <div className={styles.detailTitle}>{c.detailTitle}</div>
        {details[phase].map(([key, value, tone]) => (
          <div key={key} className={styles.detailRow}>
            <span className={styles.detailKey}>{key}</span>
            <span
              className={`${styles.detailValue} tnum`}
              style={
                tone === "sage"
                  ? { color: "var(--sage-400)" }
                  : tone === "accent"
                    ? { color: "var(--accent-400)" }
                    : undefined
              }
            >
              {value}
            </span>
          </div>
        ))}
      </div>

      <div className={styles.resultActions}>
        <Link
          href={c.primaryHref}
          className={`${styles.resultPrimary} ${c.primaryClass}`}
        >
          {c.primary}
        </Link>
        {/* No confirmation dialog anywhere on this screen. The undo is the
            safety net, and it returns to the open state. */}
        <button type="button" className={styles.undo} onClick={onUndo}>
          {c.undo}
        </button>
      </div>
    </div>
  );
}
