"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import surface from "@/components/layout/surface.module.css";
import styles from "./review.module.css";

export interface ReviewCard {
  readonly id: string;
  readonly programName: string;
  readonly sessionLabel: string | null;
  readonly providerName: string;
  readonly sourceSender: string;
  readonly sourceText: string;
  readonly matchedSpan: readonly [number, number];
  readonly fields: readonly { readonly key: string; readonly value: string }[];
  readonly criticalTime: string;
  readonly criticalDate: string;
  readonly fieldCount: number;
  readonly note: string;
  readonly queueStatus: "clean" | "needs-you";
}

export interface ReviewQueueProps {
  readonly items: readonly ReviewCard[];
  readonly forwardAddress: string;
}

/** How long the verified state holds before the queue advances. Long enough
 *  to register as confirmation, short enough not to feel like a wait. */
const VERIFIED_HOLD_MS = 950;

export default function ReviewQueue({
  items,
  forwardAddress,
}: ReviewQueueProps) {
  const [index, setIndex] = useState(0);
  const [verified, setVerified] = useState(false);
  const [confirmedCount, setConfirmedCount] = useState(0);
  const advanceTimer = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (advanceTimer.current !== null) {
        window.clearTimeout(advanceTimer.current);
      }
    },
    [],
  );

  const confirm = useCallback(() => {
    if (verified) return;
    setVerified(true);
    advanceTimer.current = window.setTimeout(() => {
      setVerified(false);
      setConfirmedCount((n) => n + 1);
      setIndex((i) => i + 1);
    }, VERIFIED_HOLD_MS);
  }, [verified]);

  const skip = useCallback(() => {
    setIndex((i) => i + 1);
  }, []);

  const item = items[index];
  const remaining = items.length - index;

  if (item === undefined) {
    return (
      <>
        <h1 className={surface.title}>Review</h1>
        <p className={surface.subline}>
          {confirmedCount === 0
            ? "Queue clear"
            : `Queue clear · ${confirmedCount} ${confirmedCount === 1 ? "window" : "windows"} confirmed today`}
        </p>
        <div className={styles.empty}>
          <div className={styles.emptyTitle}>Queue is clear</div>
          <p className={styles.emptyBody}>Forward the next camp email to</p>
          <span className={styles.emptyAddress}>{forwardAddress}</span>
        </div>
      </>
    );
  }

  const rest = items.slice(index + 1);
  const before = item.sourceText.slice(0, item.matchedSpan[0]);
  const matched = item.sourceText.slice(item.matchedSpan[0], item.matchedSpan[1]);
  const after = item.sourceText.slice(item.matchedSpan[1]);

  return (
    <>
      <h1 className={surface.title}>Review</h1>
      <p className={`${surface.subline} tnum`}>
        {remaining} {remaining === 1 ? "window" : "windows"} waiting · forwarded
        this week
      </p>

      <div className={styles.card}>
        <div className={styles.readLabel}>Read from email</div>
        <h2 className={styles.programName}>
          {[item.programName, item.sessionLabel].filter(Boolean).join(" · ")}
        </h2>
        <div className={styles.providerName}>{item.providerName}</div>

        <div className={styles.source}>
          <div className={styles.sourceLabel}>
            Source · {item.sourceSender}
          </div>
          <p className={styles.sourceText}>
            {before}
            <mark className={styles.match}>{matched}</mark>
            {after}
          </p>
        </div>

        <div className={styles.fields}>
          {item.fields.map((f) => (
            <div key={f.key} className={styles.fieldRow}>
              <span className={styles.fieldKey}>{f.key}</span>
              <span className={`${styles.fieldValue} tnum`}>{f.value}</span>
            </div>
          ))}
        </div>

        {/* The confirm control and the critical field are the same element.
            One tap files the window, and that tap lands on the time. */}
        <button
          type="button"
          className={`${styles.critical} ${verified ? styles.criticalVerified : ""}`}
          onClick={confirm}
          aria-label={`Confirm the window opens ${item.criticalTime} on ${item.criticalDate}`}
        >
          <div className={`${styles.criticalTime} tnum`}>
            {item.criticalTime}
          </div>
          <div className={styles.criticalDate}>{item.criticalDate}</div>
          <div className={styles.criticalAction}>
            <span className={styles.tick} aria-hidden="true">
              ✓
            </span>
            {verified
              ? "Confirmed · added to the tracker"
              : "Tap this time to confirm the window"}
          </div>
        </button>

        {item.queueStatus === "needs-you" && !verified && (
          <p className={styles.caveat}>{item.note}</p>
        )}

        <div className={styles.secondary}>
          <button type="button" className={styles.secondaryBtn}>
            Correct the time
          </button>
          <button
            type="button"
            className={`${styles.secondaryBtn} ${styles.notMine}`}
            onClick={skip}
          >
            Not mine
          </button>
        </div>
      </div>

      {rest.length > 0 && (
        <>
          <div className={styles.alsoLabel}>Also waiting</div>
          {rest.map((q) => (
            <div key={q.id} className={styles.queueRow}>
              <span>
                <span className={styles.queueName}>
                  {q.providerName} · {q.programName}
                </span>
                <span className={`${styles.queueMeta} tnum`}>
                  Read {q.fieldCount} fields · {q.note}
                </span>
              </span>
              <span
                className={`${styles.queueTag} ${q.queueStatus === "clean" ? styles.tagClean : styles.tagNeedsYou}`}
              >
                {q.queueStatus === "clean" ? "clean" : "needs you"}
              </span>
            </div>
          ))}
        </>
      )}
    </>
  );
}
