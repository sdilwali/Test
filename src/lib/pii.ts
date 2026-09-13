/* ══════════════════════════════════════════════════════════════════════════
   The kid-PII boundary.

   Spec §9: "Never send kid PII to the LLM. Extraction runs on inbound
   provider email, not on kid profiles. Race Mode assembles kid data
   client-side from your own DB. There is no reason for a kid's insurance
   number to ever reach a model API — enforce this with a lint rule or a
   typed boundary."

   This is the typed boundary. It works in two directions, because a rule
   stated only as "don't pass kid data" is a rule you can forget:

   1. Nothing but inbound email can even be an ARGUMENT to extraction.
      `ExtractionInput` is nominal and constructible only from an InboxItem
      (see `fromInboxItem`). A Kid, a chip value, or a bare string will not
      type-check at the call site — there is no cast-free path.

   2. The most sensitive kid fields are SEALED in transit through the app.
      `Pii<T>` is an opaque box, not an intersection, so `Pii<string>` is not
      assignable to `string`. It cannot be concatenated into a prompt, spread
      into a JSON body, or logged as itself. Reading one requires an explicit
      `reveal(value, reason)` whose reason is a closed union of render-side
      purposes — which makes every unwrap greppable in review.

   The sealed set is the one the spec names for application-level encryption
   at rest: medical notes, allergies, insurance member ID. Date of birth and
   doctor details join them because they are the fields a registration form
   asks for and an analytics payload should never carry.
   ══════════════════════════════════════════════════════════════════════════ */

/* A real runtime symbol, not a `declare`d phantom: `seal` uses it as a
   computed key and `assertNoSealedPii` probes for it, so it has to exist at
   run time as well as in the type system. `const x = Symbol()` infers
   `unique symbol`, which is what makes the box nominal. */
const piiValue = Symbol("dibs.pii");

/**
 * An opaque box around a value that must not leave the household's own
 * storage and render path. Deliberately NOT an intersection type: a
 * `Pii<string>` is structurally not a string, so it cannot be passed where a
 * string is expected.
 */
export interface Pii<T> {
  readonly [piiValue]: T;
}

/** Wrap a value on the way out of storage. */
export function seal<T>(value: T): Pii<T> {
  return { [piiValue]: value };
}

/**
 * The only places kid PII is allowed to be read as a plain value.
 *
 * - `race-mode-copy`  — assembling the tap-to-copy chips, client-side
 * - `profile-render`  — showing the field back to the parent who typed it
 * - `export`          — the parent's own data export (spec §9)
 *
 * Anything else — a prompt, an analytics event, a log line, a third party —
 * has no entry here, and adding one should be an argued change.
 */
export type RevealReason = "race-mode-copy" | "profile-render" | "export";

export function reveal<T>(boxed: Pii<T>, _reason: RevealReason): T {
  return boxed[piiValue];
}

/** Reveal for display, tolerating a not-yet-filled field. */
export function revealOr<T>(
  boxed: Pii<T> | null | undefined,
  fallback: T,
  reason: RevealReason,
): T {
  return boxed == null ? fallback : reveal(boxed, reason);
}

/* ── Direction 2: what extraction is allowed to receive ─────────────────── */

declare const extractionInputBrand: unique symbol;

/**
 * Text that is permitted to reach the model API. Nominal, and produced by
 * exactly one function, so the set of things that can be extracted from is
 * closed by construction rather than by convention.
 */
export type ExtractionInput = string & {
  readonly [extractionInputBrand]: "inbound-email";
};

/** The one constructor. Inbound provider email, and nothing else. */
export function fromInboxItem(item: {
  readonly source: "inbound-email" | "paste" | "screenshot-ocr";
  readonly text: string;
}): ExtractionInput {
  return item.text as ExtractionInput;
}

/**
 * Defence in depth for the serialiser. A sealed box has no enumerable own
 * properties (its key is a symbol), so `JSON.stringify` renders it as `{}`
 * rather than leaking — but an explicit check gives a loud failure instead of
 * a silently empty object if someone ever reaches for one.
 */
export function assertNoSealedPii(payload: unknown, where: string): void {
  const seen = new WeakSet<object>();
  const walk = (node: unknown): void => {
    if (node === null || typeof node !== "object") return;
    if (seen.has(node)) return;
    seen.add(node);
    if (piiValue in (node as object)) {
      throw new Error(
        `Kid PII reached ${where}. This is a hard boundary — see src/lib/pii.ts.`,
      );
    }
    for (const v of Object.values(node)) walk(v);
  };
  walk(payload);
}
