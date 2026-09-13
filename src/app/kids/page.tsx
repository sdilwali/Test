import TabBar from "@/components/nav/TabBar";
import KidProfile, { type KidRecord } from "@/components/kids/KidProfile";
import surface from "@/components/layout/surface.module.css";
import { getRepository } from "@/data/repository";
import { computeReadiness, sectionsFor } from "@/lib/kid-fields";

export const dynamic = "force-dynamic";

/**
 * Kid records hold sealed PII, which is not serialisable across the
 * server/client boundary by design. Display values are resolved here under
 * the `profile-render` reveal, and the client gets plain strings.
 */
export default async function KidsPage({
  searchParams,
}: {
  searchParams: Promise<{ kid?: string }>;
}) {
  const { kid: requestedKid } = await searchParams;
  const repo = getRepository();
  const kids = await repo.listKids();

  const records: KidRecord[] = await Promise.all(
    kids.map(async (kid) => {
      const needs = await repo.getNeededFields(kid.id);
      const readiness = computeReadiness(kid, needs);
      return {
        id: kid.id,
        firstName: kid.firstName,
        lastName: kid.lastName,
        setCount: readiness.setCount,
        total: readiness.total,
        chips: readiness.chips.map((c) => ({ ...c })),
        blanks: [...readiness.blanks],
        blocking: [...readiness.blocking],
        sections: sectionsFor(kid).map((s) => ({
          name: s.name,
          setCount: s.setCount,
          total: s.total,
          fields: s.fields.map((f) => ({
            key: f.spec.key,
            label: f.spec.label,
            value: f.value,
            need: needs[f.spec.key]?.profileNote ?? null,
          })),
        })),
      };
    }),
  );

  const initialKidId =
    requestedKid !== undefined && records.some((r) => r.id === requestedKid)
      ? requestedKid
      : null;

  return (
    <div className={surface.screen}>
      <div className={surface.scroll}>
        <KidProfile kids={records} initialKidId={initialKidId} />
      </div>
      <TabBar />
    </div>
  );
}
