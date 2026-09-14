import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import {
  decryptField,
  encryptField,
  resetEncryptionKeyCache,
  sealFromStored,
  storedFromSealed,
} from "./crypto";
import { reveal, seal } from "@/lib/pii";

/* These cover children's medical notes and insurance IDs, so the failure
   modes matter more than the happy path: a tampered or wrong-key ciphertext
   must throw rather than decrypt to something plausible. */

const KEY_A = Buffer.alloc(32, 1).toString("base64");
const KEY_B = Buffer.alloc(32, 2).toString("base64");
const PLAINTEXT = "Carries EpiPen in backpack";

describe("field encryption", () => {
  before(() => {
    process.env["FIELD_ENCRYPTION_KEY"] = KEY_A;
    resetEncryptionKeyCache();
  });

  after(() => {
    delete process.env["FIELD_ENCRYPTION_KEY"];
    resetEncryptionKeyCache();
  });

  test("round-trips", () => {
    assert.equal(decryptField(encryptField(PLAINTEXT)), PLAINTEXT);
  });

  test("stores ciphertext, not plaintext", () => {
    assert.ok(!encryptField(PLAINTEXT).includes("EpiPen"));
  });

  test("is versioned, so a key rotation can read old rows", () => {
    assert.ok(encryptField(PLAINTEXT).startsWith("v1."));
  });

  test("is randomised — equal plaintexts do not produce equal ciphertexts", () => {
    assert.notEqual(encryptField(PLAINTEXT), encryptField(PLAINTEXT));
  });

  test("the column codec preserves the seal in both directions", () => {
    const stored = storedFromSealed(seal(PLAINTEXT));
    assert.equal(reveal(sealFromStored(stored), "profile-render"), PLAINTEXT);
  });

  test("rejects a tampered ciphertext", () => {
    const parts = encryptField(PLAINTEXT).split(".");
    parts[3] = Buffer.from("tampered").toString("base64url");
    assert.throws(() => decryptField(parts.join(".")));
  });

  test("rejects a forged auth tag", () => {
    const parts = encryptField(PLAINTEXT).split(".");
    parts[2] = Buffer.alloc(16, 7).toString("base64url");
    assert.throws(() => decryptField(parts.join(".")));
  });

  test("rejects malformed input", () => {
    assert.throws(() => decryptField("not-even-close"));
  });

  test("rejects an unknown version", () => {
    const parts = encryptField(PLAINTEXT).split(".");
    parts[0] = "v99";
    assert.throws(() => decryptField(parts.join(".")));
  });

  test("does not decrypt under the wrong key", () => {
    const stored = encryptField(PLAINTEXT);
    process.env["FIELD_ENCRYPTION_KEY"] = KEY_B;
    resetEncryptionKeyCache();
    assert.throws(() => decryptField(stored));
    process.env["FIELD_ENCRYPTION_KEY"] = KEY_A;
    resetEncryptionKeyCache();
  });

  test("fails loudly when no key is configured", () => {
    delete process.env["FIELD_ENCRYPTION_KEY"];
    resetEncryptionKeyCache();
    assert.throws(() => encryptField(PLAINTEXT), /FIELD_ENCRYPTION_KEY/);
    process.env["FIELD_ENCRYPTION_KEY"] = KEY_A;
    resetEncryptionKeyCache();
  });

  test("rejects a key of the wrong length", () => {
    process.env["FIELD_ENCRYPTION_KEY"] = Buffer.alloc(16, 1).toString("base64");
    resetEncryptionKeyCache();
    assert.throws(() => encryptField(PLAINTEXT), /32 bytes/);
    process.env["FIELD_ENCRYPTION_KEY"] = KEY_A;
    resetEncryptionKeyCache();
  });
});
