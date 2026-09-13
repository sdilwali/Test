import { formatDobLoose, formatDobPadded } from "./kid-fields";
import { reveal } from "./pii";
import type { Kid } from "./types";

/* ══════════════════════════════════════════════════════════════════════════
   Race Mode's tap-to-copy chips.

   Assembled client-side from the household's own records. This is the one
   place kid PII is unsealed in bulk, under the `race-mode-copy` reason, and
   it never leaves the device: chips are written to the clipboard, not to a
   network call.

   Two date-of-birth formats is deliberate, not redundancy — registration
   forms disagree about padding, and retyping a DOB at 5:59 a.m. is exactly
   the friction this screen exists to remove.
   ══════════════════════════════════════════════════════════════════════════ */

export interface RaceChip {
  readonly label: string;
  readonly value: string;
}

export function chipsForKid(kid: Kid): readonly RaceChip[] {
  const chips: RaceChip[] = [];
  const push = (label: string, value: string | null | undefined): void => {
    if (value !== null && value !== undefined && value.trim() !== "") {
      chips.push({ label, value: value.trim() });
    }
  };

  const dob = kid.dateOfBirth === null ? null : reveal(kid.dateOfBirth, "race-mode-copy");
  if (dob !== null) {
    push("DOB", formatDobPadded(dob));
    push("DOB · M/D/YYYY", formatDobLoose(dob));
  }

  const gradeSchool = [kid.gradeInFall, kid.schoolName]
    .filter((v): v is string => v !== null && v !== "")
    .join(" · ");
  push("Grade · school", gradeSchool);

  push("Shirt", kid.shirtSize);
  push("Shoe", kid.shoeSize);
  push(
    "Allergies",
    kid.allergies === null ? null : reveal(kid.allergies, "race-mode-copy"),
  );
  push(
    "Medications",
    kid.medications === null ? null : reveal(kid.medications, "race-mode-copy"),
  );

  const memberId =
    kid.insuranceMemberId === null
      ? null
      : reveal(kid.insuranceMemberId, "race-mode-copy");
  push(
    "Insurance",
    [kid.insuranceCarrier, memberId]
      .filter((v): v is string => v !== null && v !== "")
      .join(" · "),
  );

  const docPhone =
    kid.doctorPhone === null ? null : reveal(kid.doctorPhone, "race-mode-copy");
  push(
    "Doctor",
    [kid.doctorName, docPhone]
      .filter((v): v is string => v !== null && v !== "")
      .join(" · "),
  );

  if (kid.emergencyContact1 !== null) {
    push(
      "Emergency 1",
      `${kid.emergencyContact1.name} · ${reveal(kid.emergencyContact1.phone, "race-mode-copy")}`,
    );
  }
  if (kid.emergencyContact2 !== null) {
    push(
      "Emergency 2",
      `${kid.emergencyContact2.name} · ${reveal(kid.emergencyContact2.phone, "race-mode-copy")}`,
    );
  }

  push("Swim level", kid.swimLevel);
  push("Pickup", kid.authorizedPickup);

  return chips;
}
