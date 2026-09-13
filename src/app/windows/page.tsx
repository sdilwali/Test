import TabBar from "@/components/nav/TabBar";
import TrackerList, {
  type NeedsInfo,
  type TrackerWindow,
} from "@/components/tracker/TrackerList";
import surface from "@/components/layout/surface.module.css";
import { getRepository } from "@/data/repository";
import { KID_FIELDS, computeReadiness } from "@/lib/kid-fields";

export const dynamic = "force-dynamic";

export default async function WindowsPage() {
  const repo = getRepository();
  const [household, views, kids] = await Promise.all([
    repo.getHousehold(),
    repo.listWindows(),
    repo.listKids(),
  ]);

  const windows: TrackerWindow[] = views.map((v) => ({
    id: v.window.id,
    programName: v.program.name,
    sessionLabel: v.program.sessionLabel,
    providerName: v.provider.name,
    kidNames: v.kids.map((k) => k.firstName).join(", "),
    opensAt: v.window.opensAt,
    isLottery: v.window.isLottery,
    prepDone: v.window.prep.filter((p) => p.done).length,
    prepTotal: v.window.prep.length,
  }));

  /* "Needs your info" is derived, not authored: a card appears only where a
     kid field is genuinely blank AND a tracked window is waiting on it. The
     same record drives the profile's sub-line, so the two cannot disagree. */
  const needsInfo: NeedsInfo[] = [];
  for (const kid of kids) {
    const needs = await repo.getNeededFields(kid.id);
    const readiness = computeReadiness(kid, needs);
    for (const [fieldKey, need] of Object.entries(needs)) {
      const spec = KID_FIELDS.find((f) => f.key === fieldKey);
      if (spec === undefined) continue;
      // Only while the field is actually blank, and only when the blank
      // would stop a registration — the rest stay sub-lines on the profile.
      if (!readiness.blanks.includes(spec.chipLabel)) continue;
      if (!need.blocksCheckout) continue;
      needsInfo.push({
        title: need.windowTitle,
        body: need.consequence,
        actionLabel: need.actionLabel,
        href: `/kids?kid=${kid.id}`,
      });
    }
  }

  return (
    <div className={surface.screen}>
      <div className={surface.scroll}>
        <TrackerList
          windows={windows}
          kidCount={kids.length}
          forwardAddress={household.forwardAddress}
          needsInfo={needsInfo}
        />
      </div>
      <TabBar />
    </div>
  );
}
