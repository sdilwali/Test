import type { Pii } from "./pii";

/* ══════════════════════════════════════════════════════════════════════════
   Domain model.

   The central object is the RegistrationWindow, not a calendar event. Every
   other type exists to answer a question about a window: who is it for, what
   do I need in hand, did I get it.

   Vocabulary is fixed (spec §6, design brief §6): window, opens, closes,
   lottery, waitlist, prep. Never item, entry, event, task.
   ══════════════════════════════════════════════════════════════════════════ */

export type HouseholdId = string & { readonly __brand: "HouseholdId" };
export type KidId = string & { readonly __brand: "KidId" };
export type ProviderId = string & { readonly __brand: "ProviderId" };
export type ProgramId = string & { readonly __brand: "ProgramId" };
export type WindowId = string & { readonly __brand: "WindowId" };
export type ReviewItemId = string & { readonly __brand: "ReviewItemId" };

/* ── Household ──────────────────────────────────────────────────────────── */

export interface Household {
  readonly id: HouseholdId;
  readonly name: string;
  /** IANA zone. Load-bearing: a window that opens 6:00 AM PT must render in
   *  the provider's zone with the zone shown, since a wrong time costs a
   *  season. */
  readonly timezone: string;
  /** Needed for the provider-intel flywheel. */
  readonly homeZip: string;
  /** Immutable, e.g. "okafor@in.dibs.app". Shown prominently, one-tap copy. */
  readonly forwardAddress: string;
}

export interface Adult {
  readonly id: string;
  readonly householdId: HouseholdId;
  readonly name: string;
  readonly email: string;
  readonly phone: string | null;
  readonly role: "owner" | "member";
  readonly smsOptIn: boolean;
  /** Quiet hours never suppress T1H, T10M or OPEN — the whole point is the
   *  5:52 a.m. alarm. */
  readonly quietHoursStart: string | null;
  readonly quietHoursEnd: string | null;
}

/* ── Kid ────────────────────────────────────────────────────────────────────
   The union of the build spec's Kid and the design's 19 profile fields. The
   spec contributes preferredName, notes and the structured emergency-contact
   parts; the design contributes shoeSize, medications and sunscreenConsent.

   Sealed fields are the ones the spec names for application-level encryption
   at rest, plus the ones a registration form asks for that must never reach
   a model or an analytics payload. See src/lib/pii.ts.
   ──────────────────────────────────────────────────────────────────────── */

export interface EmergencyContact {
  readonly name: string;
  readonly phone: Pii<string>;
  readonly relationship: string;
}

export interface Kid {
  readonly id: KidId;
  readonly householdId: HouseholdId;

  // Basics
  readonly firstName: string;
  readonly lastName: string;
  readonly preferredName: string | null;
  readonly dateOfBirth: Pii<string> | null; // ISO yyyy-mm-dd
  readonly gradeInFall: string | null;
  readonly schoolName: string | null;

  // Sizes
  readonly shirtSize: string | null;
  readonly shoeSize: string | null;

  // Medical
  readonly allergies: Pii<string> | null;
  readonly medications: Pii<string> | null;
  readonly medicalNotes: Pii<string> | null;

  // Insurance
  readonly insuranceCarrier: string | null;
  readonly insuranceMemberId: Pii<string> | null;
  readonly doctorName: string | null;
  readonly doctorPhone: Pii<string> | null;

  // Emergency
  readonly emergencyContact1: EmergencyContact | null;
  readonly emergencyContact2: EmergencyContact | null;
  readonly authorizedPickup: string | null;

  // Permissions
  readonly swimLevel: string | null;
  readonly photoRelease: boolean | null;
  readonly sunscreenConsent: boolean | null;

  readonly notes: string | null;
}

/**
 * A blank kid field that a tracked window is actually waiting on.
 *
 * Surfaced in two places from this one record, so the Tracker's card and the
 * profile's sub-line can never disagree about what is blocking what.
 */
export interface FieldNeed {
  /** The window doing the blocking, e.g. "Camp Tamarack Session A". */
  readonly windowTitle: string;
  /** Short form, for the profile row's accent sub-line. */
  readonly profileNote: string;
  /** The consequence, not the task — this is what makes it worth tapping. */
  readonly consequence: string;
  readonly actionLabel: string;
  /**
   * Whether this blank stops a registration going through.
   *
   * Only blocking needs earn a card on the Tracker; everything else stays a
   * quiet sub-line on the profile. A form the provider collects later is not
   * a reason to put a box on her home screen.
   */
  readonly blocksCheckout: boolean;
}

/* ── Provider and Program ───────────────────────────────────────────────── */

export type ProviderKind =
  | "rec_dept"
  | "camp"
  | "league"
  | "school"
  | "studio"
  | "other";

export interface Provider {
  readonly id: ProviderId;
  readonly name: string;
  readonly website: string | null;
  readonly kind: ProviderKind;
  readonly city: string | null;
  readonly state: string | null;
  readonly zip: string | null;
  /** Normalised name+zip, for dedupe across households and for ProviderIntel. */
  readonly canonicalKey: string;
}

export type ProgramKind =
  | "camp"
  | "sport"
  | "class"
  | "lesson"
  | "enrichment"
  | "other";

export interface Program {
  readonly id: ProgramId;
  readonly providerId: ProviderId;
  /** null = shared/canonical rather than household-authored. */
  readonly householdId: HouseholdId | null;
  readonly name: string;
  /** e.g. "Session B" — rendered beside the program name in Race Mode. */
  readonly sessionLabel: string | null;
  readonly kind: ProgramKind;
  readonly sessionStartDate: string | null;
  readonly sessionEndDate: string | null;
  readonly dailyStartTime: string | null;
  readonly dailyEndTime: string | null;
  readonly locationName: string | null;
  readonly locationAddress: string | null;
  readonly ageMin: number | null;
  readonly ageMax: number | null;
  readonly gradeMin: number | null;
  readonly gradeMax: number | null;
  readonly costCents: number | null;
  readonly costNote: string | null;
}

/* ── RegistrationWindow — the central object ────────────────────────────── */

export type OpensAtPrecision = "exact" | "day" | "month" | "unknown";
export type RegistrationMethod =
  | "online"
  | "lottery"
  | "in_person"
  | "phone"
  | "email"
  | "unknown";
export type Competition = "low" | "medium" | "high" | "unknown";
export type Confidence = "confirmed" | "extracted" | "predicted";
export type WindowStatus =
  | "upcoming"
  | "open"
  | "closed"
  | "registered"
  | "waitlisted"
  | "missed"
  | "skipped";

/**
 * Prep is structured, not free text. The design shows tappable checklist rows
 * with persisted state and an "n of 3" counter that turns sage at complete;
 * the spec's `prep_notes` string cannot carry that.
 */
export interface PrepItem {
  readonly id: string;
  readonly label: string;
  readonly done: boolean;
}

export interface RegistrationWindow {
  readonly id: WindowId;
  readonly programId: ProgramId;
  /** Absolute instant. The countdown is always derived from this, never from
   *  a decrementing counter, so backgrounding and clock drift cannot desync
   *  it. */
  readonly opensAt: string; // ISO 8601 with offset
  readonly opensAtPrecision: OpensAtPrecision;
  readonly closesAt: string | null;
  /** The zone to display the time in — the provider's, not the household's. */
  readonly displayTimezone: string;
  readonly displayTimezoneLabel: string; // e.g. "PT"
  readonly url: string | null;
  readonly method: RegistrationMethod;
  readonly isLottery: boolean;
  readonly expectedCompetition: Competition;
  readonly confidence: Confidence;
  readonly status: WindowStatus;
  readonly prep: readonly PrepItem[];
  /** Which kids this window is for. */
  readonly kidIds: readonly KidId[];
  /** Parent marked this one as high-stakes — turns on SMS tiers. */
  readonly highStakes: boolean;
}

/** A window joined to everything the UI needs to render a row. */
export interface WindowView {
  readonly window: RegistrationWindow;
  readonly program: Program;
  readonly provider: Provider;
  readonly kids: readonly Kid[];
}

/* ── Enrollment ─────────────────────────────────────────────────────────── */

export interface Enrollment {
  readonly id: string;
  readonly kidId: KidId;
  readonly programId: ProgramId;
  readonly status: "interested" | "registered" | "waitlisted" | "declined";
  readonly costCents: number | null;
  readonly confirmationRef: string | null;
  readonly registeredAt: string | null;
  readonly waitlistPosition: number | null;
}

/* ── Review queue ───────────────────────────────────────────────────────── */

export interface ExtractedField {
  readonly key: string;
  readonly value: string;
  readonly confidence: Confidence;
  /** Set when the extractor had to assume something, e.g. a time zone. */
  readonly caveat?: string;
}

/**
 * What the system read out of one forwarded email, awaiting confirmation.
 * Nothing reaches the tracker without this step: a wrong date costs the
 * parent a season, so the confirm step is the product's integrity, not
 * friction to optimise away.
 */
export interface ReviewItem {
  readonly id: ReviewItemId;
  readonly programName: string;
  readonly sessionLabel: string | null;
  readonly providerName: string;
  readonly sourceSender: string;
  /** The raw email sentence the extraction came from. */
  readonly sourceText: string;
  /** Character offsets into sourceText of the span that produced the time,
   *  so the parent can audit the read without leaving the card. */
  readonly matchedSpan: readonly [number, number];
  readonly fields: readonly ExtractedField[];
  /** The critical field. Confirming the window IS tapping this time. */
  readonly criticalTime: string; // e.g. "6:00 AM PT"
  readonly criticalDate: string; // e.g. "Saturday, February 7"
  readonly fieldCount: number;
  readonly note: string; // e.g. "first come" / "time zone assumed PT"
  readonly queueStatus: "clean" | "needs-you";
}

/* ── Coverage ───────────────────────────────────────────────────────────── */

export type CoverageState = "covered" | "partial" | "gap";

export interface CoverageCell {
  readonly state: CoverageState;
  /** Uppercase top label, e.g. "WILDWOOD B" or "GAP". */
  readonly label: string;
  /** Bottom-anchored sub-label, e.g. "5 days" / "no camp". */
  readonly detail: string;
  readonly conflict: boolean;
}

export interface CoverageConflict {
  readonly week: string;
  readonly kind: "pickup-collision" | "dropoff-overlap" | "uncovered";
  readonly title: string;
  readonly explanation: string;
}

export interface CoverageBlock {
  readonly id: string;
  readonly householdId: HouseholdId;
  readonly label: string; // "Summer coverage"
  readonly rangeLabel: string; // "Jun 15 – Aug 21"
  readonly weeks: readonly string[]; // "Jun 15", "Jun 22", …
  readonly rows: readonly {
    readonly kidId: KidId;
    readonly kidName: string;
    readonly cells: readonly CoverageCell[];
  }[];
  /** Per-week totals in cents; null renders as an em dash in faint ink. */
  readonly weeklyCostCents: readonly (number | null)[];
  readonly conflicts: readonly CoverageConflict[];
}

/* ── Alerts ─────────────────────────────────────────────────────────────── */

export type AlertTier = "T14" | "T3" | "T1" | "T1H" | "T10M" | "OPEN";
export type AlertChannel = "push" | "sms" | "email";

export interface Alert {
  readonly id: string;
  readonly windowId: WindowId;
  readonly adultId: string;
  readonly fireAt: string;
  readonly channel: AlertChannel;
  readonly tier: AlertTier;
  readonly status: "scheduled" | "sent" | "failed" | "cancelled";
  readonly sentAt: string | null;
}

/* ── ProviderIntel — the compounding asset ──────────────────────────────────
   Populated from day one, surfaced later. Stored with ZIP and provider key
   only: never a household or kid identifier, so the aggregate stays clean of
   personal data.
   ──────────────────────────────────────────────────────────────────────── */

export interface ProviderIntel {
  readonly id: string;
  readonly providerCanonicalKey: string;
  readonly programNameNormalized: string;
  readonly observedYear: number;
  readonly observedOpensAt: string;
  readonly observedSource: "email" | "user_confirmed";
  readonly zip: string;
}
