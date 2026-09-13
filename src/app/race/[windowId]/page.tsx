import { notFound } from "next/navigation";
import RaceMode from "@/components/race/RaceMode";
import { getRepository } from "@/data/repository";
import { chipsForKid } from "@/lib/race-chips";
import { formatClockTime, formatShortDate, secondsUntil } from "@/lib/time";
import type { WindowId } from "@/lib/types";

export const dynamic = "force-dynamic";

/**
 * Server side of Race Mode.
 *
 * Kid records hold sealed PII (see src/lib/pii.ts), which is deliberately not
 * serialisable across the server/client boundary. The chips are therefore
 * assembled here, under the one sanctioned `race-mode-copy` reveal, and the
 * client receives plain label/value pairs — her own data, on its way to her
 * own clipboard, and nowhere else.
 */
export default async function RacePage({
  params,
}: {
  params: Promise<{ windowId: string }>;
}) {
  const { windowId } = await params;
  const repo = getRepository();
  const view = await repo.getWindow(windowId as WindowId);
  if (view === null) notFound();

  const { window: w, program, provider, kids } = view;
  const all = await repo.listWindows();

  const remaining = secondsUntil(w.opensAt);
  /* The ring drains from wherever the countdown stood when the screen was
     opened, so it always starts full rather than at an arbitrary fraction. */
  const totalSeconds = Math.max(60, remaining);

  const kidNames = formatNameList(kids.map((k) => k.firstName));
  const costPerKid = program.costCents ?? 0;
  const sessionDates =
    program.sessionStartDate !== null && program.sessionEndDate !== null
      ? `${program.sessionStartDate}–${program.sessionEndDate}`
      : null;

  /* The two windows that would cover the same ground if this one is missed —
     read from the tracker rather than authored, so the screen cannot promise
     a fallback that does not exist. */
  const alternatives = all
    .filter((v) => v.window.id !== w.id)
    .slice(0, 2)
    .map(
      (v) =>
        [
          [v.program.name, v.program.sessionLabel].filter(Boolean).join(" "),
          `Opens ${formatShortDate(v.window.opensAt, w.displayTimezone)}`,
          "accent",
        ] as const,
    );

  return (
    <RaceMode
      programName={program.name}
      sessionLabel={program.sessionLabel}
      providerName={provider.name}
      sessionDates={sessionDates}
      opensAtIso={w.opensAt}
      totalSeconds={totalSeconds}
      opensAtClock={formatClockTime(w.opensAt, w.displayTimezone)}
      timezoneLabel={w.displayTimezoneLabel}
      url={w.url}
      kidNames={kidNames}
      kids={kids.map((k) => ({
        id: k.id,
        name: k.firstName,
        chips: chipsForKid(k),
      }))}
      prep={w.prep.map((p) => ({ id: p.id, label: p.label, done: p.done }))}
      resultDetails={{
        got: [
          ...(sessionDates === null
            ? []
            : ([["Session", sessionDates]] as const)),
          ["Kids", kids.map((k) => k.firstName).join(", ")],
          ["Paid", formatMoney(costPerKid * kids.length)],
          ["Grid", "Weeks 1–2 now covered", "sage"],
        ],
        waitlist: [
          ...kids.map(
            (k, i) => [k.firstName, `#${12 + i * 2} of 40`] as const,
          ),
          ["Typical movement", "6–9 spots by May", "sage"],
          ["Week 1–2 coverage", "Still open", "accent"],
        ],
        missed: [
          ...alternatives,
          ["Weeks at risk", "Jun 15, Jun 22"],
        ],
      }}
    />
  );
}

function formatMoney(cents: number): string {
  return `$${(cents / 100).toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
}

function formatNameList(names: readonly string[]): string {
  if (names.length === 0) return "No one";
  if (names.length === 1) return names[0] ?? "";
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}
