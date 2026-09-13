import { seal } from "@/lib/pii";
import { DAY, HOUR, MINUTE, SECOND } from "@/lib/time";
import type {
  CoverageBlock,
  FieldNeed,
  Household,
  HouseholdId,
  Kid,
  KidId,
  Program,
  ProgramId,
  Provider,
  ProviderId,
  RegistrationWindow,
  ReviewItem,
  ReviewItemId,
  WindowId,
} from "@/lib/types";

/* ══════════════════════════════════════════════════════════════════════════
   Fixture data, seeded from the design's sample content so the built screens
   can be compared against the handoff frame for frame.

   Window times are expressed as offsets from a caller-supplied `now` rather
   than as literal dates. Two reasons: the demo never goes stale, and the
   Race Mode window is always about to cross zero, which is the state worth
   looking at. The server resolves `now` once and hands the client absolute
   instants, so the countdown has a fixed target to derive from.
   ══════════════════════════════════════════════════════════════════════════ */

const id = <T extends string>(v: string): T => v as T;

export const HOUSEHOLD: Household = {
  id: id<HouseholdId>("hh_okafor"),
  name: "Okafor",
  timezone: "America/Los_Angeles",
  homeZip: "97202",
  forwardAddress: "okafor@in.dibs.app",
};

/* ── Kids ───────────────────────────────────────────────────────────────────
   Maya 16 of 19 (blank: Shoe, Medications, Photo release)
   Theo 19 of 19
   Juno  9 of 19
   These counts are never authored — they fall out of the field array in
   src/lib/kid-fields.ts. They are noted here only so the fixture's intent is
   legible.
   ──────────────────────────────────────────────────────────────────────── */

const NADIA = {
  name: "Nadia Okafor",
  phone: seal("503-771-2043"),
  relationship: "mom",
};
const SAM = {
  name: "Sam Reyes",
  phone: seal("971-402-1188"),
  relationship: "uncle",
};

export const KIDS: readonly Kid[] = [
  {
    id: id<KidId>("maya"),
    householdId: HOUSEHOLD.id,
    firstName: "Maya",
    lastName: "Okafor",
    preferredName: null,
    dateOfBirth: seal("2017-03-14"),
    gradeInFall: "4th",
    schoolName: "Ridgeline Elementary",
    shirtSize: "Youth M",
    shoeSize: null,
    allergies: seal("Peanut, tree nut"),
    medications: null,
    medicalNotes: seal("Carries EpiPen in backpack"),
    insuranceCarrier: "Blue Shield",
    insuranceMemberId: seal("XJK-448-2210"),
    doctorName: "Dr. Amara Osei",
    doctorPhone: seal("(503) 224-8890"),
    emergencyContact1: NADIA,
    emergencyContact2: SAM,
    authorizedPickup: "Yeni Okafor · grandma",
    swimLevel: "Level 3",
    photoRelease: null,
    sunscreenConsent: true,
    notes: null,
  },
  {
    id: id<KidId>("theo"),
    householdId: HOUSEHOLD.id,
    firstName: "Theo",
    lastName: "Okafor",
    preferredName: null,
    dateOfBirth: seal("2020-09-02"),
    gradeInFall: "1st",
    schoolName: "Ridgeline Elementary",
    shirtSize: "Youth 6/7",
    shoeSize: "13C",
    allergies: seal("None on file"),
    medications: seal("Albuterol inhaler"),
    medicalNotes: seal("Mild asthma — inhaler rides in his bag"),
    insuranceCarrier: "Blue Shield",
    insuranceMemberId: seal("XJK-448-2211"),
    doctorName: "Dr. Amara Osei",
    doctorPhone: seal("(503) 224-8890"),
    emergencyContact1: NADIA,
    emergencyContact2: SAM,
    authorizedPickup: "Yeni Okafor · grandma",
    swimLevel: "Level 1",
    photoRelease: true,
    sunscreenConsent: true,
    notes: null,
  },
  {
    id: id<KidId>("juno"),
    householdId: HOUSEHOLD.id,
    firstName: "Juno",
    lastName: "Okafor",
    preferredName: null,
    dateOfBirth: seal("2022-05-21"),
    gradeInFall: "PreK",
    schoolName: null,
    shirtSize: null,
    shoeSize: null,
    allergies: seal("Dairy"),
    medications: null,
    medicalNotes: null,
    insuranceCarrier: "Blue Shield",
    insuranceMemberId: null,
    doctorName: "Dr. Amara Osei",
    doctorPhone: seal("(503) 224-8890"),
    emergencyContact1: NADIA,
    emergencyContact2: null,
    authorizedPickup: null,
    swimLevel: null,
    photoRelease: null,
    sunscreenConsent: true,
    notes: null,
  },
];

/**
 * Which blank fields a tracked window actually needs, per kid.
 *
 * One record serves both readers: the Tracker's "Needs your info" card uses
 * `windowTitle`, `consequence` and `actionLabel`; the Kid profile's accent
 * sub-line uses `profileNote`. Because they read the same entry, the two
 * surfaces cannot drift apart — the profile can never claim a field is needed
 * by a window the tracker is not showing, or the reverse.
 *
 * A blank is listed here only when a real tracked window is blocked on it.
 * Partial completion is a normal state: no red, no nagging, no completion
 * badgering.
 */
export const FIELD_NEEDED_BY: Readonly<
  Record<string, Readonly<Record<string, FieldNeed>>>
> = {
  maya: {
    photoRelease: {
      windowTitle: "Camp Tamarack Session A",
      profileNote: "Tamarack asks for this in October",
      consequence:
        "Maya's photo release is missing. Tamarack collects it at check-in and will chase you for it in October.",
      actionLabel: "Add photo release",
      blocksCheckout: false,
    },
  },
  theo: {},
  juno: {
    insuranceMemberId: {
      windowTitle: "Camp Tamarack Session A",
      profileNote: "Camp Tamarack needs this",
      consequence:
        "Juno's insurance member ID is missing. Tamarack blocks checkout without it.",
      actionLabel: "Add insurance ID",
      blocksCheckout: true,
    },
  },
};

/* ── Providers ──────────────────────────────────────────────────────────── */

const provider = (
  key: string,
  name: string,
  kind: Provider["kind"],
): Provider => ({
  id: id<ProviderId>(key),
  name,
  website: null,
  kind,
  city: "Portland",
  state: "OR",
  zip: "97202",
  canonicalKey: `${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}|97202`,
});

export const PROVIDERS: readonly Provider[] = [
  provider("metro", "Metro Parks & Rec", "rec_dept"),
  provider("aqua", "Aqua Center North", "other"),
  provider("eastside", "Eastside Youth Soccer", "league"),
  provider("studio", "Studio Arts", "studio"),
  provider("tamarack", "Tamarack Trust", "camp"),
  provider("ridgeline", "Ridgeline Elementary", "school"),
  provider("summit", "Summit Youth", "other"),
];

/* ── Programs and windows ───────────────────────────────────────────────── */

interface Seed {
  readonly key: string;
  readonly providerKey: string;
  readonly programName: string;
  readonly sessionLabel: string | null;
  readonly kind: Program["kind"];
  readonly offsetMs: number;
  readonly kidIds: readonly string[];
  readonly isLottery: boolean;
  readonly costCents: number | null;
  readonly sessionStart: string | null;
  readonly sessionEnd: string | null;
  readonly url: string | null;
  readonly prep?: readonly (readonly [string, boolean])[];
  readonly highStakes?: boolean;
}

const SEEDS: readonly Seed[] = [
  {
    key: "wildwood-b",
    providerKey: "metro",
    programName: "Camp Wildwood",
    sessionLabel: "Session B",
    kind: "camp",
    offsetMs: 107 * SECOND,
    kidIds: ["maya", "theo"],
    isLottery: false,
    costCents: 62000,
    sessionStart: "Jun 15",
    sessionEnd: "Jun 26",
    url: "https://example.org/metro-parks/register/wildwood-session-b",
    prep: [
      ["Signed in to Metro Parks account", true],
      ["Card on file confirmed · Visa 3317", true],
      ["Session code ready · WW-B-0725", false],
    ],
    highStakes: true,
  },
  {
    key: "swim-1-fall",
    providerKey: "aqua",
    programName: "Swim Level 1",
    sessionLabel: "Fall",
    kind: "lesson",
    offsetMs: 4 * HOUR + 12 * MINUTE,
    kidIds: ["juno"],
    isLottery: false,
    costCents: 18500,
    sessionStart: "Sep 28",
    sessionEnd: "Nov 16",
    url: "https://example.org/aqua-center/swim-level-1",
  },
  {
    key: "kickers-fall",
    providerKey: "eastside",
    programName: "Little Kickers",
    sessionLabel: "Fall",
    kind: "sport",
    offsetMs: 2 * DAY,
    kidIds: ["theo"],
    isLottery: true,
    costCents: 14000,
    sessionStart: "Oct 5",
    sessionEnd: "Nov 21",
    url: "https://example.org/eastside/little-kickers",
  },
  {
    key: "clay-canvas",
    providerKey: "studio",
    programName: "Clay & Canvas half-day",
    sessionLabel: null,
    kind: "enrichment",
    offsetMs: 4 * DAY,
    kidIds: ["maya"],
    isLottery: false,
    costCents: 31000,
    sessionStart: "Jul 6",
    sessionEnd: "Jul 10",
    url: "https://example.org/studio-arts/clay-canvas",
  },
  {
    key: "tamarack-a",
    providerKey: "tamarack",
    programName: "Camp Tamarack",
    sessionLabel: "Session A",
    kind: "camp",
    offsetMs: 18 * DAY,
    kidIds: ["maya", "theo"],
    isLottery: false,
    costCents: 71000,
    sessionStart: "Jul 13",
    sessionEnd: "Jul 24",
    url: "https://example.org/tamarack/session-a",
  },
  {
    key: "chess",
    providerKey: "ridgeline",
    programName: "After-school chess",
    sessionLabel: null,
    kind: "enrichment",
    offsetMs: 23 * DAY,
    kidIds: ["juno"],
    isLottery: false,
    costCents: 9000,
    sessionStart: "Oct 20",
    sessionEnd: "Dec 15",
    url: null,
  },
  {
    key: "ski-bus",
    providerKey: "summit",
    programName: "Summit Youth ski bus",
    sessionLabel: null,
    kind: "sport",
    offsetMs: 51 * DAY,
    kidIds: ["maya"],
    isLottery: false,
    costCents: 48000,
    sessionStart: "Jan 9",
    sessionEnd: "Feb 27",
    url: null,
  },
  {
    key: "winter-break",
    providerKey: "metro",
    programName: "Metro Parks winter break camp",
    sessionLabel: null,
    kind: "camp",
    offsetMs: 60 * DAY,
    kidIds: ["maya", "theo"],
    isLottery: false,
    costCents: 32000,
    sessionStart: "Dec 21",
    sessionEnd: "Jan 1",
    url: null,
  },
  {
    key: "swim-4",
    providerKey: "aqua",
    programName: "Swim Level 4",
    sessionLabel: null,
    kind: "lesson",
    offsetMs: 79 * DAY,
    kidIds: ["juno"],
    isLottery: false,
    costCents: 18500,
    sessionStart: "Jan 12",
    sessionEnd: "Mar 2",
    url: null,
  },
  {
    key: "wildwood-a-2027",
    providerKey: "metro",
    programName: "Camp Wildwood A",
    sessionLabel: "2027",
    kind: "camp",
    offsetMs: 123 * DAY,
    kidIds: ["maya", "theo"],
    isLottery: false,
    costCents: 62000,
    sessionStart: "Jun 14",
    sessionEnd: "Jun 25",
    url: null,
  },
];

export function buildPrograms(): readonly Program[] {
  return SEEDS.map((s) => ({
    id: id<ProgramId>(s.key),
    providerId: id<ProviderId>(s.providerKey),
    householdId: HOUSEHOLD.id,
    name: s.programName,
    sessionLabel: s.sessionLabel,
    kind: s.kind,
    sessionStartDate: s.sessionStart,
    sessionEndDate: s.sessionEnd,
    dailyStartTime: null,
    dailyEndTime: null,
    locationName: null,
    locationAddress: null,
    ageMin: null,
    ageMax: null,
    gradeMin: null,
    gradeMax: null,
    costCents: s.costCents,
    costNote: null,
  }));
}

export function buildWindows(now: number): readonly RegistrationWindow[] {
  return SEEDS.map((s) => ({
    id: id<WindowId>(s.key),
    programId: id<ProgramId>(s.key),
    opensAt: new Date(now + s.offsetMs).toISOString(),
    opensAtPrecision: "exact" as const,
    closesAt: null,
    displayTimezone: "America/Los_Angeles",
    displayTimezoneLabel: "PT",
    url: s.url,
    method: s.isLottery ? ("lottery" as const) : ("online" as const),
    isLottery: s.isLottery,
    expectedCompetition: s.key === "wildwood-b" ? ("high" as const) : ("unknown" as const),
    confidence: "confirmed" as const,
    status: "upcoming" as const,
    prep: (s.prep ?? []).map(([label, done], i) => ({
      id: `${s.key}-prep-${i}`,
      label,
      done,
    })),
    kidIds: s.kidIds.map((k) => id<KidId>(k)),
    highStakes: s.highStakes ?? false,
  }));
}

/* ── Coverage ───────────────────────────────────────────────────────────── */

type CellSeed = readonly [
  "covered" | "partial" | "gap",
  string,
  string,
  boolean?,
];

const MAYA_CELLS: readonly CellSeed[] = [
  ["covered", "Wildwood B", "5 days"],
  ["covered", "Wildwood B", "5 days"],
  ["gap", "Gap", "no camp"],
  ["partial", "Clay & Canvas", "half days", true],
  ["covered", "Tamarack A", "5 days"],
  ["covered", "Tamarack A", "5 days"],
  ["gap", "Gap", "no camp"],
  ["partial", "Swim + chess", "3 days", true],
  ["covered", "Ridgeline Rec", "5 days"],
  ["gap", "Gap", "school Aug 24"],
];

const THEO_CELLS: readonly CellSeed[] = [
  ["covered", "Wildwood B", "5 days"],
  ["covered", "Wildwood B", "5 days"],
  ["gap", "Gap", "no camp"],
  ["gap", "Gap", "no camp"],
  ["covered", "Tamarack A", "5 days"],
  ["covered", "Tamarack A", "5 days"],
  ["partial", "Kickers camp", "mornings"],
  ["gap", "Gap", "no camp"],
  ["covered", "Swim intensive", "5 days"],
  ["gap", "Gap", "school Aug 24"],
];

const toCells = (seeds: readonly CellSeed[]) =>
  seeds.map(([state, label, detail, conflict]) => ({
    state,
    label,
    detail,
    conflict: conflict ?? false,
  }));

export const COVERAGE: CoverageBlock = {
  id: "summer-2027",
  householdId: HOUSEHOLD.id,
  label: "Summer coverage",
  rangeLabel: "Jun 15 – Aug 21",
  weeks: [
    "Jun 15",
    "Jun 22",
    "Jun 29",
    "Jul 6",
    "Jul 13",
    "Jul 20",
    "Jul 27",
    "Aug 3",
    "Aug 10",
    "Aug 17",
  ],
  rows: [
    { kidId: id<KidId>("maya"), kidName: "Maya", cells: toCells(MAYA_CELLS) },
    { kidId: id<KidId>("theo"), kidName: "Theo", cells: toCells(THEO_CELLS) },
  ],
  weeklyCostCents: [
    62000,
    62000,
    null,
    31000,
    71000,
    71000,
    18500,
    24000,
    78500,
    null,
  ],
  conflicts: [
    {
      week: "Week of Jul 6",
      kind: "pickup-collision",
      title: "pickup collision",
      explanation:
        "Clay & Canvas releases Maya at 12:30. Theo has no camp that week, so there is no second drop-off to build the day around.",
    },
    {
      week: "Week of Aug 3",
      kind: "dropoff-overlap",
      title: "drop-offs overlap",
      explanation:
        "Swim starts 8:45 in Sellwood; chess starts 8:30 in Ridgeline. 19 minutes apart, 24 minutes of driving.",
    },
  ],
};

/* ── Review queue ───────────────────────────────────────────────────────── */

const WILDWOOD_SOURCE =
  "Registration for Summer Session B opens Saturday, February 7 at 6:00 AM PT and is first come, first served. Sessions typically fill within the hour.";

const WILDWOOD_MATCH = "Saturday, February 7 at 6:00 AM PT";

const SWIM_SOURCE =
  "Fall swim lesson registration goes live on Tuesday, September 30 at 9:00 AM for Aqua Center members. Level 1 has eight spots per session.";

const SWIM_MATCH = "Tuesday, September 30 at 9:00 AM";

export const REVIEW_ITEMS: readonly ReviewItem[] = [
  {
    id: id<ReviewItemId>("rv-wildwood-b"),
    programName: "Camp Wildwood",
    sessionLabel: "Session B",
    providerName: "Metro Parks & Rec",
    sourceSender: "noreply@metroparks.gov",
    sourceText: WILDWOOD_SOURCE,
    matchedSpan: [
      WILDWOOD_SOURCE.indexOf(WILDWOOD_MATCH),
      WILDWOOD_SOURCE.indexOf(WILDWOOD_MATCH) + WILDWOOD_MATCH.length,
    ],
    fields: [
      { key: "Kind", value: "First come, first served", confidence: "extracted" },
      { key: "Session dates", value: "Jun 15 – Jun 26", confidence: "extracted" },
      { key: "Fits", value: "Maya, Theo", confidence: "extracted" },
      { key: "Cost", value: "$620 per kid", confidence: "extracted" },
    ],
    criticalTime: "6:00 AM PT",
    criticalDate: "Saturday, February 7",
    fieldCount: 4,
    note: "first come",
    queueStatus: "clean",
  },
  {
    id: id<ReviewItemId>("rv-swim-1"),
    programName: "Swim Level 1",
    sessionLabel: "Fall",
    providerName: "Aqua Center North",
    sourceSender: "programs@aquacenternorth.org",
    sourceText: SWIM_SOURCE,
    matchedSpan: [
      SWIM_SOURCE.indexOf(SWIM_MATCH),
      SWIM_SOURCE.indexOf(SWIM_MATCH) + SWIM_MATCH.length,
    ],
    fields: [
      { key: "Kind", value: "First come, first served", confidence: "extracted" },
      { key: "Session dates", value: "Sep 28 – Nov 16", confidence: "extracted" },
      { key: "Fits", value: "Juno", confidence: "extracted" },
      { key: "Cost", value: "$185 per kid", confidence: "extracted" },
    ],
    criticalTime: "9:00 AM PT",
    criticalDate: "Tuesday, September 30",
    fieldCount: 4,
    note: "time zone assumed PT",
    queueStatus: "needs-you",
  },
];
