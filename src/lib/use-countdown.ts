"use client";

import { useEffect, useState } from "react";
import { secondsUntil } from "./time";

/**
 * Seconds remaining until `opensAtIso`, recomputed from the absolute instant
 * on every tick.
 *
 * Two things this deliberately does not do:
 *
 * - It never decrements a counter. A counter drifts while the tab is
 *   backgrounded and desyncs if the device clock moves; at 5:58 a.m. a
 *   countdown that is thirty seconds optimistic is worse than none.
 * - It returns `null` until after mount, so the server and the first client
 *   render agree. The caller renders the static opens-at time in that gap
 *   rather than a number that would immediately contradict itself.
 *
 * It also resyncs the moment the tab becomes visible again, which is the
 * common case: she locked her phone at T-minus-ten and came back at T-minus-
 * one.
 */
export function useSecondsUntil(opensAtIso: string): number | null {
  const [secs, setSecs] = useState<number | null>(null);

  useEffect(() => {
    const sync = () => setSecs(secondsUntil(opensAtIso));
    sync();

    const timer = window.setInterval(sync, 1000);
    document.addEventListener("visibilitychange", sync);
    window.addEventListener("focus", sync);

    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", sync);
      window.removeEventListener("focus", sync);
    };
  }, [opensAtIso]);

  return secs;
}

/** Whether the viewer has asked for reduced motion. `false` until mounted. */
export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReduced(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  return reduced;
}
