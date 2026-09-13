import TabBar from "@/components/nav/TabBar";
import ReviewQueue, {
  type ReviewCard,
} from "@/components/review/ReviewQueue";
import surface from "@/components/layout/surface.module.css";
import { getRepository } from "@/data/repository";

export const dynamic = "force-dynamic";

export default async function ReviewPage() {
  const repo = getRepository();
  const [household, items] = await Promise.all([
    repo.getHousehold(),
    repo.listReviewItems(),
  ]);

  const cards: ReviewCard[] = items.map((i) => ({
    id: i.id,
    programName: i.programName,
    sessionLabel: i.sessionLabel,
    providerName: i.providerName,
    sourceSender: i.sourceSender,
    sourceText: i.sourceText,
    matchedSpan: i.matchedSpan,
    fields: i.fields.map((f) => ({ key: f.key, value: f.value })),
    criticalTime: i.criticalTime,
    criticalDate: i.criticalDate,
    fieldCount: i.fieldCount,
    note: i.note,
    queueStatus: i.queueStatus,
  }));

  return (
    <div className={surface.screen}>
      <div className={surface.scroll}>
        <ReviewQueue
          items={cards}
          forwardAddress={household.forwardAddress}
        />
      </div>
      <TabBar />
    </div>
  );
}
