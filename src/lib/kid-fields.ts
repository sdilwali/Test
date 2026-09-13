import { revealOr } from "./pii";
import type { Kid } from "./types";

/* ══════════════════════════════════════════════════════════════════════════
   The kid profile's single source of truth.

   The handoff is explicit about this: the profile's three numbers — the
   "n of 19" count, which chips are lit, and the derived note naming the
   actual blanks — must never be able to disagree. So they are all computed
   from this one array, and none of them is authored anywhere else.

   19 fields across six sections. The order here is the render order.
   ══════════════════════════════════════════════════════════════════════════ */

export type SectionName =
  | "Basics"
  | "Sizes"
  | "Medical"
  | "Insurance"
  | "Emergency"
  | "Permissions";

export const SECTION_ORDER: readonly SectionName[] = [
  "Basics",
  "Sizes",
  "Medical",
  "Insurance",
  "Emergency",
  "Permissions",
];

export interface KidFieldSpec {
  readonly key: string;
  readonly section: SectionName;
  /** Row label on the profile. */
  readonly label: string;
  /** Short label for the "ready in race mode" chips. */
  readonly chipLabel: string;
  /** Display value, or null when the field is not set. */
  readonly read: (kid: Kid) => string | null;
}

const yesNo = (v: boolean | null): string | null =>
  v === null ? null : v ? "Yes" : "No";

const blankToNull = (v: string | null | undefined): string | null => {
  if (v === null || v === undefined) return null;
  const trimmed = v.trim();
  return trimmed === "" ? null : trimmed;
};

export const KID_FIELDS: readonly KidFieldSpec[] = [
  // ── Basics ──────────────────────────────────────────────────────────────
  {
    key: "fullName",
    section: "Basics",
    label: "Full name",
    chipLabel: "Name",
    read: (k) => blankToNull([k.firstName, k.lastName].join(" ")),
  },
  {
    key: "dateOfBirth",
    section: "Basics",
    label: "Date of birth",
    chipLabel: "DOB",
    read: (k) => {
      const iso = revealOr(k.dateOfBirth, null, "profile-render");
      return iso === null ? null : formatDobPadded(iso);
    },
  },
  {
    key: "gradeInFall",
    section: "Basics",
    label: "Grade in fall",
    chipLabel: "Grade",
    read: (k) => blankToNull(k.gradeInFall),
  },
  {
    key: "schoolName",
    section: "Basics",
    label: "School",
    chipLabel: "School",
    read: (k) => blankToNull(k.schoolName),
  },

  // ── Sizes ───────────────────────────────────────────────────────────────
  {
    key: "shirtSize",
    section: "Sizes",
    label: "Shirt",
    chipLabel: "Shirt",
    read: (k) => blankToNull(k.shirtSize),
  },
  {
    key: "shoeSize",
    section: "Sizes",
    label: "Shoe",
    chipLabel: "Shoe",
    read: (k) => blankToNull(k.shoeSize),
  },

  // ── Medical ─────────────────────────────────────────────────────────────
  {
    key: "allergies",
    section: "Medical",
    label: "Allergies",
    chipLabel: "Allergies",
    read: (k) => blankToNull(revealOr(k.allergies, null, "profile-render")),
  },
  {
    key: "medications",
    section: "Medical",
    label: "Medications",
    chipLabel: "Medications",
    read: (k) => blankToNull(revealOr(k.medications, null, "profile-render")),
  },
  {
    key: "medicalNotes",
    section: "Medical",
    label: "Medical notes",
    chipLabel: "Notes",
    read: (k) => blankToNull(revealOr(k.medicalNotes, null, "profile-render")),
  },

  // ── Insurance ───────────────────────────────────────────────────────────
  {
    key: "insuranceCarrier",
    section: "Insurance",
    label: "Carrier",
    chipLabel: "Carrier",
    read: (k) => blankToNull(k.insuranceCarrier),
  },
  {
    key: "insuranceMemberId",
    section: "Insurance",
    label: "Member ID",
    chipLabel: "Member ID",
    read: (k) =>
      blankToNull(revealOr(k.insuranceMemberId, null, "profile-render")),
  },
  {
    key: "doctorName",
    section: "Insurance",
    label: "Doctor",
    chipLabel: "Doctor",
    read: (k) => blankToNull(k.doctorName),
  },
  {
    key: "doctorPhone",
    section: "Insurance",
    label: "Doctor phone",
    chipLabel: "Doctor phone",
    read: (k) => blankToNull(revealOr(k.doctorPhone, null, "profile-render")),
  },

  // ── Emergency ───────────────────────────────────────────────────────────
  {
    key: "emergencyContact1",
    section: "Emergency",
    label: "Contact 1",
    chipLabel: "Contact 1",
    read: (k) =>
      k.emergencyContact1 === null
        ? null
        : `${k.emergencyContact1.name} · ${k.emergencyContact1.relationship}`,
  },
  {
    key: "emergencyContact2",
    section: "Emergency",
    label: "Contact 2",
    chipLabel: "Contact 2",
    read: (k) =>
      k.emergencyContact2 === null
        ? null
        : `${k.emergencyContact2.name} · ${k.emergencyContact2.relationship}`,
  },
  {
    key: "authorizedPickup",
    section: "Emergency",
    label: "Authorized pickup",
    chipLabel: "Pickup",
    read: (k) => blankToNull(k.authorizedPickup),
  },

  // ── Permissions ─────────────────────────────────────────────────────────
  {
    key: "swimLevel",
    section: "Permissions",
    label: "Swim level",
    chipLabel: "Swim",
    read: (k) => blankToNull(k.swimLevel),
  },
  {
    key: "photoRelease",
    section: "Permissions",
    label: "Photo release",
    chipLabel: "Photo release",
    read: (k) => yesNo(k.photoRelease),
  },
  {
    key: "sunscreenConsent",
    section: "Permissions",
    label: "Sunscreen consent",
    chipLabel: "Sunscreen",
    read: (k) => yesNo(k.sunscreenConsent),
  },
];

export const TOTAL_KID_FIELDS = KID_FIELDS.length; // 19

/** "2017-03-14" → "03/14/2017". Forms disagree about format; this is the
 *  zero-padded one. */
export function formatDobPadded(iso: string): string {
  const [y, m, d] = iso.split("-");
  if (y === undefined || m === undefined || d === undefined) return iso;
  return `${m}/${d}/${y}`;
}

/** "2017-03-14" → "3/14/2017". The unpadded one. Two formats is intentional:
 *  registration forms disagree, and she should not have to retype. */
export function formatDobLoose(iso: string): string {
  const [y, m, d] = iso.split("-");
  if (y === undefined || m === undefined || d === undefined) return iso;
  return `${Number(m)}/${Number(d)}/${y}`;
}

export interface KidReadiness {
  readonly setCount: number;
  readonly total: number;
  readonly chips: readonly {
    readonly key: string;
    readonly chipLabel: string;
    readonly lit: boolean;
  }[];
  readonly blanks: readonly string[];
  /** Chip labels of blanks that a tracked window actually needs. */
  readonly blocking: readonly string[];
}

/**
 * Everything the "ready in race mode" card shows, derived in one pass.
 *
 * `neededBy` maps a field key to the window that needs it — that is what
 * turns a blank from nagging into information, and it is the same source the
 * Tracker's "Needs your info" row reads from, so the two can never disagree.
 */
export function computeReadiness(
  kid: Kid,
  neededBy: Readonly<Record<string, unknown>> = {},
): KidReadiness {
  const chips = KID_FIELDS.map((f) => ({
    key: f.key,
    chipLabel: f.chipLabel,
    lit: f.read(kid) !== null,
  }));
  const blankSpecs = KID_FIELDS.filter((f) => f.read(kid) === null);
  return {
    setCount: chips.filter((c) => c.lit).length,
    total: TOTAL_KID_FIELDS,
    chips,
    blanks: blankSpecs.map((f) => f.chipLabel),
    blocking: blankSpecs
      .filter((f) => neededBy[f.key] !== undefined)
      .map((f) => f.chipLabel),
  };
}

/** Grouped for render, preserving section order and within-section order. */
export function sectionsFor(kid: Kid): readonly {
  readonly name: SectionName;
  readonly setCount: number;
  readonly total: number;
  readonly fields: readonly {
    readonly spec: KidFieldSpec;
    readonly value: string | null;
  }[];
}[] {
  return SECTION_ORDER.map((name) => {
    const fields = KID_FIELDS.filter((f) => f.section === name).map((spec) => ({
      spec,
      value: spec.read(kid),
    }));
    return {
      name,
      setCount: fields.filter((f) => f.value !== null).length,
      total: fields.length,
      fields,
    };
  });
}
