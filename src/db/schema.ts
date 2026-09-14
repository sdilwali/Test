import { relations } from "drizzle-orm";
import {
  boolean,
  customType,
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  time,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { sealFromStored, storedFromSealed } from "./crypto";
import type { Pii } from "@/lib/pii";

/* ══════════════════════════════════════════════════════════════════════════
   Postgres schema.

   The central table is registration_window. Everything else exists to answer
   a question about one: who is it for, what do I need in hand, did I get it.

   Two decisions worth knowing before reading:

   1. Encrypted columns are typed `Pii<string>`, not `string`. The custom type
      below encrypts on the way to the driver and seals on the way back, so a
      query cannot hand plaintext to application code even by accident — the
      seal is applied by the column, not by a convention someone has to
      remember at each call site.

   2. provider_intel carries no household or kid identifier, by construction.
      It is the compounding asset (spec §2) and it stays clean of personal
      data: a provider key, a normalised program name, a ZIP, and a date.
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * A text column that is ciphertext in Postgres and a sealed value in
 * TypeScript. Used for the fields the spec names for encryption at rest, plus
 * the ones a registration form asks for that must never reach a log or an
 * analytics payload.
 */
const encryptedText = customType<{ data: Pii<string>; driverData: string }>({
  dataType() {
    return "text";
  },
  toDriver(value: Pii<string>): string {
    return storedFromSealed(value);
  },
  fromDriver(value: string): Pii<string> {
    return sealFromStored(value);
  },
});

/* ── Enums ──────────────────────────────────────────────────────────────── */

export const adultRole = pgEnum("adult_role", ["owner", "member"]);

export const providerKind = pgEnum("provider_kind", [
  "rec_dept",
  "camp",
  "league",
  "school",
  "studio",
  "other",
]);

export const programKind = pgEnum("program_kind", [
  "camp",
  "sport",
  "class",
  "lesson",
  "enrichment",
  "other",
]);

export const opensAtPrecision = pgEnum("opens_at_precision", [
  "exact",
  "day",
  "month",
  "unknown",
]);

export const registrationMethod = pgEnum("registration_method", [
  "online",
  "lottery",
  "in_person",
  "phone",
  "email",
  "unknown",
]);

export const competition = pgEnum("competition", [
  "low",
  "medium",
  "high",
  "unknown",
]);

export const confidence = pgEnum("confidence", [
  "confirmed",
  "extracted",
  "predicted",
]);

export const windowStatus = pgEnum("window_status", [
  "upcoming",
  "open",
  "closed",
  "registered",
  "waitlisted",
  "missed",
  "skipped",
]);

export const enrollmentStatus = pgEnum("enrollment_status", [
  "interested",
  "registered",
  "waitlisted",
  "declined",
]);

export const parseStatus = pgEnum("parse_status", [
  "pending",
  "parsed",
  "needs_review",
  "confirmed",
  "rejected",
  "no_signal",
]);

/** How an InboxItem arrived. Forwarding is the primary path, but paste and
 *  screenshot need no domain and no webhook — parents screenshot texts and
 *  group-chat messages, and those go through the same extractor. */
export const inboxSource = pgEnum("inbox_source", [
  "inbound-email",
  "paste",
  "screenshot-ocr",
]);

export const alertChannel = pgEnum("alert_channel", ["push", "sms", "email"]);

export const alertTier = pgEnum("alert_tier", [
  "T14",
  "T3",
  "T1",
  "T1H",
  "T10M",
  "OPEN",
]);

export const alertStatus = pgEnum("alert_status", [
  "scheduled",
  "sent",
  "failed",
  "cancelled",
]);

export const coverageState = pgEnum("coverage_state", [
  "covered",
  "partial",
  "gap",
]);

export const intelSource = pgEnum("intel_source", ["email", "user_confirmed"]);

/* ── Household ──────────────────────────────────────────────────────────── */

export const households = pgTable("household", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  /** IANA zone. Load-bearing: extraction resolves relative dates against it. */
  timezone: text("timezone").notNull().default("America/Los_Angeles"),
  /** Needed for the provider-intel flywheel. */
  homeZip: text("home_zip"),
  /** e.g. "u_7fk2p9@in.dibs.app". Unique and immutable once issued — it is
   *  pasted into mail clients and forwarding rules we do not control. */
  forwardAddress: text("forward_address").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const adults = pgTable(
  "adult",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    householdId: uuid("household_id")
      .notNull()
      .references(() => households.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    email: text("email").notNull(),
    phone: text("phone"),
    role: adultRole("role").notNull().default("member"),
    /** Web Push subscription (endpoint + p256dh + auth). */
    pushSubscription: jsonb("push_subscription"),
    smsOptIn: boolean("sms_opt_in").notNull().default(false),
    /** Quiet hours suppress T14/T3/T1 only. T1H, T10M and OPEN always fire —
     *  the whole point is the 5:52 a.m. alarm. */
    quietHoursStart: time("quiet_hours_start"),
    quietHoursEnd: time("quiet_hours_end"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [uniqueIndex("adult_household_email_idx").on(t.householdId, t.email)],
);

/* ── Kid ────────────────────────────────────────────────────────────────────
   The union of the build spec's Kid and the design's 19 profile fields.
   ──────────────────────────────────────────────────────────────────────── */

export const kids = pgTable(
  "kid",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    householdId: uuid("household_id")
      .notNull()
      .references(() => households.id, { onDelete: "cascade" }),

    // Basics
    firstName: text("first_name").notNull(),
    lastName: text("last_name").notNull(),
    preferredName: text("preferred_name"),
    dateOfBirth: encryptedText("date_of_birth"),
    gradeInFall: text("grade_in_fall"),
    schoolName: text("school_name"),

    // Sizes
    shirtSize: text("shirt_size"),
    shoeSize: text("shoe_size"),

    // Medical — named by spec §9 for encryption at rest
    allergies: encryptedText("allergies"),
    medications: encryptedText("medications"),
    medicalNotes: encryptedText("medical_notes"),

    // Insurance — member ID named by spec §9
    insuranceCarrier: text("insurance_carrier"),
    insuranceMemberId: encryptedText("insurance_member_id"),
    doctorName: text("doctor_name"),
    doctorPhone: encryptedText("doctor_phone"),

    // Emergency
    emergencyContact1Name: text("emergency_contact_1_name"),
    emergencyContact1Phone: encryptedText("emergency_contact_1_phone"),
    emergencyContact1Relationship: text("emergency_contact_1_relationship"),
    emergencyContact2Name: text("emergency_contact_2_name"),
    emergencyContact2Phone: encryptedText("emergency_contact_2_phone"),
    emergencyContact2Relationship: text("emergency_contact_2_relationship"),
    authorizedPickup: text("authorized_pickup"),

    // Permissions
    swimLevel: text("swim_level"),
    photoRelease: boolean("photo_release"),
    sunscreenConsent: boolean("sunscreen_consent"),

    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("kid_household_idx").on(t.householdId)],
);

/* ── Provider and Program ───────────────────────────────────────────────── */

export const providers = pgTable(
  "provider",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    website: text("website"),
    kind: providerKind("kind").notNull().default("other"),
    city: text("city"),
    state: text("state"),
    zip: text("zip"),
    /** Normalised name+zip. Dedupes the same rec department across every
     *  household that forwards its mail, which is what makes the intel
     *  aggregate possible at all. */
    canonicalKey: text("canonical_key").notNull(),
    createdByHouseholdId: uuid("created_by_household_id").references(
      () => households.id,
      { onDelete: "set null" },
    ),
  },
  (t) => [uniqueIndex("provider_canonical_key_idx").on(t.canonicalKey)],
);

export const programs = pgTable(
  "program",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    providerId: uuid("provider_id")
      .notNull()
      .references(() => providers.id, { onDelete: "cascade" }),
    /** Null means shared/canonical rather than authored by one household. */
    householdId: uuid("household_id").references(() => households.id, {
      onDelete: "cascade",
    }),
    name: text("name").notNull(),
    /** e.g. "Session B". Rendered beside the program name in Race Mode, and
     *  compacted to "B" in tracker rows. */
    sessionLabel: text("session_label"),
    kind: programKind("kind").notNull().default("other"),
    sessionStartDate: date("session_start_date"),
    sessionEndDate: date("session_end_date"),
    dailyStartTime: time("daily_start_time"),
    dailyEndTime: time("daily_end_time"),
    locationName: text("location_name"),
    locationAddress: text("location_address"),
    ageMin: integer("age_min"),
    ageMax: integer("age_max"),
    gradeMin: integer("grade_min"),
    gradeMax: integer("grade_max"),
    costCents: integer("cost_cents"),
    costNote: text("cost_note"),
    notes: text("notes"),
  },
  (t) => [index("program_provider_idx").on(t.providerId)],
);

/* ── InboxItem ──────────────────────────────────────────────────────────── */

export const inboxItems = pgTable(
  "inbox_item",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    householdId: uuid("household_id")
      .notNull()
      .references(() => households.id, { onDelete: "cascade" }),
    source: inboxSource("source").notNull().default("inbound-email"),
    fromAddress: text("from_address"),
    subject: text("subject"),
    receivedAt: timestamp("received_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    /** Forwarding chrome is stripped before extraction, but the raw copy is
     *  kept — re-parsing a mangled forward is impossible without it. */
    rawText: text("raw_text"),
    rawHtml: text("raw_html"),
    attachments: jsonb("attachments"),
    /** A parse failure must never silently drop the email: the row still
     *  lands, as needs_review, and the parent is told something arrived that
     *  could not be read. */
    parseStatus: parseStatus("parse_status").notNull().default("pending"),
    /** Raw model output, kept for debugging and re-parsing against a newer
     *  prompt or model. */
    extraction: jsonb("extraction"),
    modelVersion: text("model_version"),
  },
  (t) => [
    index("inbox_item_household_idx").on(t.householdId, t.receivedAt),
    index("inbox_item_parse_status_idx").on(t.parseStatus),
  ],
);

/* ── RegistrationWindow — the central table ─────────────────────────────── */

export const registrationWindows = pgTable(
  "registration_window",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    programId: uuid("program_id")
      .notNull()
      .references(() => programs.id, { onDelete: "cascade" }),
    /** The absolute instant. Every countdown derives from this; nothing
     *  anywhere stores a duration. */
    opensAt: timestamp("opens_at", { withTimezone: true }).notNull(),
    opensAtPrecision: opensAtPrecision("opens_at_precision")
      .notNull()
      .default("exact"),
    closesAt: timestamp("closes_at", { withTimezone: true }),
    /** The provider's zone, not the household's — a window that opens
     *  "6:00 AM PT" must render as PT wherever the parent happens to be. */
    displayTimezone: text("display_timezone")
      .notNull()
      .default("America/Los_Angeles"),
    displayTimezoneLabel: text("display_timezone_label").notNull().default("PT"),
    url: text("url"),
    method: registrationMethod("method").notNull().default("unknown"),
    isLottery: boolean("is_lottery").notNull().default(false),
    expectedCompetition: competition("expected_competition")
      .notNull()
      .default("unknown"),
    confidence: confidence("confidence").notNull().default("extracted"),
    sourceInboxItemId: uuid("source_inbox_item_id").references(
      () => inboxItems.id,
      { onDelete: "set null" },
    ),
    status: windowStatus("status").notNull().default("upcoming"),
    /** Parent-marked. Turns on the SMS tiers where SMS is configured. */
    highStakes: boolean("high_stakes").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    /** Spec §6: required for the scheduler sweep. */
    index("registration_window_opens_at_status_idx").on(t.opensAt, t.status),
    index("registration_window_program_idx").on(t.programId),
  ],
);

/** Which kids a window is being tracked for. */
export const windowKids = pgTable(
  "window_kid",
  {
    windowId: uuid("window_id")
      .notNull()
      .references(() => registrationWindows.id, { onDelete: "cascade" }),
    kidId: uuid("kid_id")
      .notNull()
      .references(() => kids.id, { onDelete: "cascade" }),
  },
  (t) => [uniqueIndex("window_kid_pk").on(t.windowId, t.kidId)],
);

/**
 * Prep is structured rows, not the spec's free-text `prep_notes`, because the
 * design needs per-item state and an "n of 3" counter that turns sage at
 * complete. Checked off during the T14 window, read in Race Mode.
 */
export const prepItems = pgTable(
  "prep_item",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    windowId: uuid("window_id")
      .notNull()
      .references(() => registrationWindows.id, { onDelete: "cascade" }),
    label: text("label").notNull(),
    done: boolean("done").notNull().default(false),
    position: integer("position").notNull().default(0),
  },
  (t) => [index("prep_item_window_idx").on(t.windowId, t.position)],
);

/**
 * A kid field a specific window is waiting on.
 *
 * One row drives both the Tracker's "Needs your info" card and the Kid
 * profile's accent sub-line, so the two surfaces cannot disagree about what
 * is blocking what. `blocksCheckout` separates a blank that stops a
 * registration from one the provider merely collects later — only the former
 * earns a card on the home screen.
 */
export const windowFieldRequirements = pgTable(
  "window_field_requirement",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    windowId: uuid("window_id")
      .notNull()
      .references(() => registrationWindows.id, { onDelete: "cascade" }),
    /** Matches a key in src/lib/kid-fields.ts. */
    fieldKey: text("field_key").notNull(),
    blocksCheckout: boolean("blocks_checkout").notNull().default(false),
    /** Short form, for the profile row's sub-line. */
    profileNote: text("profile_note"),
    /** The consequence, not the task — what makes the card worth tapping. */
    consequence: text("consequence"),
    actionLabel: text("action_label"),
  },
  (t) => [
    uniqueIndex("window_field_requirement_idx").on(t.windowId, t.fieldKey),
  ],
);

/* ── Enrollment ─────────────────────────────────────────────────────────── */

export const enrollments = pgTable(
  "enrollment",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    kidId: uuid("kid_id")
      .notNull()
      .references(() => kids.id, { onDelete: "cascade" }),
    programId: uuid("program_id")
      .notNull()
      .references(() => programs.id, { onDelete: "cascade" }),
    status: enrollmentStatus("status").notNull().default("interested"),
    costCents: integer("cost_cents"),
    confirmationRef: text("confirmation_ref"),
    registeredAt: timestamp("registered_at", { withTimezone: true }),
    waitlistPosition: integer("waitlist_position"),
  },
  (t) => [uniqueIndex("enrollment_kid_program_idx").on(t.kidId, t.programId)],
);

/* ── Alerts ─────────────────────────────────────────────────────────────── */

export const alerts = pgTable(
  "alert",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    registrationWindowId: uuid("registration_window_id")
      .notNull()
      .references(() => registrationWindows.id, { onDelete: "cascade" }),
    adultId: uuid("adult_id")
      .notNull()
      .references(() => adults.id, { onDelete: "cascade" }),
    fireAt: timestamp("fire_at", { withTimezone: true }).notNull(),
    channel: alertChannel("channel").notNull(),
    tier: alertTier("tier").notNull(),
    status: alertStatus("status").notNull().default("scheduled"),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    /** Populated on failure so a dropped alert is diagnosable rather than
     *  merely absent. A missed alert is worse than no product. */
    failureReason: text("failure_reason"),
  },
  (t) => [
    /** Spec §6: required for the dispatcher, and for the overdue sweep that
     *  pages when a row sits past fire_at still "scheduled". */
    index("alert_fire_at_status_idx").on(t.fireAt, t.status),
    uniqueIndex("alert_window_adult_tier_channel_idx").on(
      t.registrationWindowId,
      t.adultId,
      t.tier,
      t.channel,
    ),
  ],
);

/* ── Coverage ───────────────────────────────────────────────────────────── */

export const coverageBlocks = pgTable("coverage_block", {
  id: uuid("id").primaryKey().defaultRandom(),
  householdId: uuid("household_id")
    .notNull()
    .references(() => households.id, { onDelete: "cascade" }),
  label: text("label").notNull(),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  /* Weeks are derived from the range, never stored. */
});

/* ── ProviderIntel — the compounding asset ──────────────────────────────────
   Populated from day one, surfaced later. Note what is absent: no household
   id, no kid id, no adult id. Aggregate observations are stored with a
   provider key and a ZIP only, which is what keeps the asset clean of
   personal data and shareable across households.
   ──────────────────────────────────────────────────────────────────────── */

export const providerIntel = pgTable(
  "provider_intel",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    providerCanonicalKey: text("provider_canonical_key").notNull(),
    programNameNormalized: text("program_name_normalized").notNull(),
    observedYear: integer("observed_year").notNull(),
    observedOpensAt: timestamp("observed_opens_at", {
      withTimezone: true,
    }).notNull(),
    observedSource: intelSource("observed_source").notNull(),
    zip: text("zip"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("provider_intel_lookup_idx").on(
      t.providerCanonicalKey,
      t.programNameNormalized,
      t.observedYear,
    ),
    index("provider_intel_zip_idx").on(t.zip),
  ],
);

/* ── Relations ──────────────────────────────────────────────────────────── */

export const householdRelations = relations(households, ({ many }) => ({
  adults: many(adults),
  kids: many(kids),
  inboxItems: many(inboxItems),
  coverageBlocks: many(coverageBlocks),
}));

export const kidRelations = relations(kids, ({ one, many }) => ({
  household: one(households, {
    fields: [kids.householdId],
    references: [households.id],
  }),
  enrollments: many(enrollments),
  windowKids: many(windowKids),
}));

export const providerRelations = relations(providers, ({ many }) => ({
  programs: many(programs),
}));

export const programRelations = relations(programs, ({ one, many }) => ({
  provider: one(providers, {
    fields: [programs.providerId],
    references: [providers.id],
  }),
  windows: many(registrationWindows),
  enrollments: many(enrollments),
}));

export const registrationWindowRelations = relations(
  registrationWindows,
  ({ one, many }) => ({
    program: one(programs, {
      fields: [registrationWindows.programId],
      references: [programs.id],
    }),
    sourceInboxItem: one(inboxItems, {
      fields: [registrationWindows.sourceInboxItemId],
      references: [inboxItems.id],
    }),
    prep: many(prepItems),
    windowKids: many(windowKids),
    fieldRequirements: many(windowFieldRequirements),
    alerts: many(alerts),
  }),
);

export const windowKidRelations = relations(windowKids, ({ one }) => ({
  window: one(registrationWindows, {
    fields: [windowKids.windowId],
    references: [registrationWindows.id],
  }),
  kid: one(kids, { fields: [windowKids.kidId], references: [kids.id] }),
}));

export const alertRelations = relations(alerts, ({ one }) => ({
  window: one(registrationWindows, {
    fields: [alerts.registrationWindowId],
    references: [registrationWindows.id],
  }),
  adult: one(adults, { fields: [alerts.adultId], references: [adults.id] }),
}));
