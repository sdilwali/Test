/* No `server-only` import here, deliberately. The schema imports this module
   for its column codec, and drizzle-kit loads the schema outside Next's
   bundler where that marker throws. The guard is not lost: this module
   imports `node:crypto`, which Next refuses to bundle into a client
   component, so a stray client-side import is still a build error — and
   `src/db/client.ts`, the only module that can reach the database, does carry
   the marker. */
import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";
import { reveal, seal, type Pii } from "@/lib/pii";

/* ══════════════════════════════════════════════════════════════════════════
   Application-level field encryption.

   Spec §9: "Encrypt Kid.medical_notes, allergies, insurance_member_id at rest
   with application-level encryption, not just disk encryption."

   Disk encryption protects against someone walking off with the drive. It
   does nothing about a leaked connection string, an over-broad service key, a
   misconfigured backup, or a support engineer running a SELECT. For a table
   holding children's medical notes and insurance IDs, that gap is the whole
   threat model — so these columns are ciphertext to Postgres, and the key
   never goes near the database.

   AES-256-GCM: authenticated, so a tampered ciphertext fails loudly rather
   than decrypting to garbage.

   Stored format, all base64url, dot-separated:

       v1.<iv>.<authTag>.<ciphertext>

   The version prefix exists so a key rotation can decrypt v1 and write v2
   without a flag day.
   ══════════════════════════════════════════════════════════════════════════ */

const VERSION = "v1";
const ALGORITHM = "aes-256-gcm";
const IV_BYTES = 12; // GCM's standard nonce length
const KEY_BYTES = 32;

let cachedKey: Buffer | null = null;

function encryptionKey(): Buffer {
  if (cachedKey !== null) return cachedKey;

  const raw = process.env["FIELD_ENCRYPTION_KEY"];
  if (raw === undefined || raw === "") {
    throw new Error(
      "FIELD_ENCRYPTION_KEY is not set. Kid medical and insurance fields " +
        "cannot be read or written without it. Generate one with: " +
        "openssl rand -base64 32",
    );
  }

  const key = Buffer.from(raw, "base64");
  if (key.length !== KEY_BYTES) {
    throw new Error(
      `FIELD_ENCRYPTION_KEY must decode to ${KEY_BYTES} bytes, got ${key.length}. ` +
        "Generate one with: openssl rand -base64 32",
    );
  }

  cachedKey = key;
  return key;
}

/** Present so tests and key rotation can drop the memoised key. */
export function resetEncryptionKeyCache(): void {
  cachedKey = null;
}

export function encryptField(plaintext: string): string {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, encryptionKey(), iv);
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  return [
    VERSION,
    iv.toString("base64url"),
    tag.toString("base64url"),
    ciphertext.toString("base64url"),
  ].join(".");
}

export function decryptField(stored: string): string {
  const parts = stored.split(".");
  const [version, ivPart, tagPart, ctPart] = parts;

  if (
    parts.length !== 4 ||
    version === undefined ||
    ivPart === undefined ||
    tagPart === undefined ||
    ctPart === undefined
  ) {
    throw new Error("Encrypted field is malformed: expected v1.<iv>.<tag>.<ct>");
  }
  if (version !== VERSION) {
    throw new Error(`Unknown field-encryption version "${version}"`);
  }

  const decipher = createDecipheriv(
    ALGORITHM,
    encryptionKey(),
    Buffer.from(ivPart, "base64url"),
  );
  decipher.setAuthTag(Buffer.from(tagPart, "base64url"));

  /* GCM raises on a bad tag, which is what we want: a tampered or
     wrong-key ciphertext must fail, never decrypt to plausible garbage. */
  return Buffer.concat([
    decipher.update(Buffer.from(ctPart, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}

/* ── The seam with the PII type ───────────────────────────────────────────
   These are what the Drizzle custom column type calls. Note the shape: the
   database side speaks ciphertext `string`, and the application side speaks
   `Pii<string>`. There is no path through this file that hands a plaintext
   string to the application, which is what keeps the seal intact from the
   row all the way to the render.
   ─────────────────────────────────────────────────────────────────────── */

export function sealFromStored(stored: string): Pii<string> {
  return seal(decryptField(stored));
}

export function storedFromSealed(value: Pii<string>): string {
  return encryptField(reveal(value, "encrypt-at-rest"));
}

/**
 * Constant-time comparison, for the rare case of matching an encrypted value
 * without revealing it. Note that GCM is randomised — the same plaintext
 * encrypts differently every time — so this compares *plaintexts* after
 * decryption rather than ciphertexts, and is not a substitute for an index.
 */
export function fieldEquals(stored: string, candidate: string): boolean {
  const a = Buffer.from(decryptField(stored), "utf8");
  const b = Buffer.from(candidate, "utf8");
  return a.length === b.length && timingSafeEqual(a, b);
}
