"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import styles from "./onboarding.module.css";

const TOTAL_STEPS = 3;
const COPIED_HOLD_MS = 2400;

export default function Onboarding({
  forwardAddress,
}: {
  forwardAddress: string;
}) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [addressCopied, setAddressCopied] = useState(false);
  const [firstName, setFirstName] = useState("");
  const copyTimer = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (copyTimer.current !== null) window.clearTimeout(copyTimer.current);
    },
    [],
  );

  const copyAddress = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(forwardAddress);
    } catch {
      /* Ignored: the address is on screen and selectable either way. The tag
         below only claims success when the write actually resolved. */
      return;
    }
    setAddressCopied(true);
    if (copyTimer.current !== null) window.clearTimeout(copyTimer.current);
    copyTimer.current = window.setTimeout(
      () => setAddressCopied(false),
      COPIED_HOLD_MS,
    );
  }, [forwardAddress]);

  const advance = useCallback(() => {
    if (step >= TOTAL_STEPS - 1) {
      router.push("/windows");
      return;
    }
    setStep((s) => s + 1);
  }, [step, router]);

  const trimmedName = firstName.trim();

  return (
    <main className={styles.screen}>
      <div className={styles.progress} aria-hidden="true">
        {Array.from({ length: TOTAL_STEPS }, (_, i) => (
          <span
            key={i}
            className={`${styles.segment} ${i <= step ? styles.segmentFilled : ""}`}
          />
        ))}
      </div>

      <div className={styles.step}>
        Step {step + 1} of {TOTAL_STEPS}
      </div>

      <div className={styles.content}>
        {step === 0 && (
          <>
            <h1 className={styles.title}>Your forwarding address</h1>
            <p className={styles.body}>
              Forward any camp email here and Dibs reads the window out of it —
              dates, times, lottery or first-come, which kid it fits.
            </p>

            <button
              type="button"
              className={`${styles.address} ${addressCopied ? styles.addressCopied : ""}`}
              onClick={() => void copyAddress()}
            >
              <span className={styles.addressValue}>{forwardAddress}</span>
              <span className={styles.addressTag}>
                {addressCopied ? "Copied to clipboard" : "Tap to copy"}
              </span>
            </button>

            <ol className={styles.numbered}>
              <NumberedRow n={1}>
                Copy the address and paste it into a new mail draft to
                yourself.
              </NumberedRow>
              <NumberedRow n={2}>
                Forward the camp newsletters already sitting in your inbox —
                Dibs reads them in the order they arrive.
              </NumberedRow>
              <NumberedRow n={3}>
                Anything it is unsure about waits in Review instead of
                guessing.
              </NumberedRow>
            </ol>
          </>
        )}

        {step === 1 && (
          <>
            <h1 className={styles.title}>Add your first kid</h1>
            <p className={styles.body}>
              Three fields now. Everything else you fill in later becomes
              something you can copy in one tap at 6 a.m.
            </p>

            <div style={{ marginTop: 20 }}>
              <input
                className={styles.field}
                placeholder="First name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                autoComplete="off"
              />
              <input
                className={styles.field}
                placeholder="Date of birth"
                inputMode="numeric"
                autoComplete="off"
              />
              <input
                className={styles.field}
                placeholder="Grade in fall"
                autoComplete="off"
              />
            </div>

            <p className={styles.sageNote}>
              This is the short version — shirt size, allergies and insurance
              turn into tap-to-copy chips in race mode. Add them whenever;
              Dibs will tell you which window needs which field.
            </p>
          </>
        )}

        {step === 2 && (
          <>
            <h1 className={styles.title}>Install Dibs on your phone</h1>
            <p className={styles.body}>
              This is the step that decides whether your phone wakes you before
              a window opens.
            </p>

            <div className={styles.whyCard}>
              <div className={styles.whyLabel}>Why this one matters</div>
              <p className={styles.whyBody}>
                iPhones only let installed apps wake your screen. In Safari,
                Dibs can email you — but it cannot buzz your phone at 5:58 a.m.
              </p>
            </div>

            <div className={styles.compare}>
              <div className={styles.tile}>
                <div className={styles.tileLabel}>In Safari</div>
                <div className={styles.tileHead}>Email only</div>
                <div className={styles.tileSub}>Seen when you wake up</div>
              </div>
              <div className={`${styles.tile} ${styles.tileWin}`}>
                <div className={styles.tileLabel}>Installed</div>
                <div className={styles.tileHead}>Alarm at 5:58</div>
                <div className={styles.tileSub}>
                  Two-minute warning, on screen
                </div>
              </div>
            </div>

            <ol className={styles.numbered}>
              <NumberedRow n={1}>Tap the Share button in Safari.</NumberedRow>
              <NumberedRow n={2}>Choose Add to Home Screen.</NumberedRow>
              <NumberedRow n={3}>
                Open Dibs once from the home screen and allow notifications.
              </NumberedRow>
            </ol>
          </>
        )}
      </div>

      <div className={styles.actions}>
        <button type="button" className={styles.cta} onClick={advance}>
          {step === 0 && "I mailed it to myself"}
          {step === 1 &&
            (trimmedName === ""
              ? "Save and continue"
              : `Save ${trimmedName} and continue`)}
          {step === 2 && "Show me how to install"}
        </button>
        <button type="button" className={styles.skip} onClick={advance}>
          {step === 0 && "I will do this later"}
          {step === 1 && "Add kids later"}
          {step === 2 && "Skip — email alerts only"}
        </button>
      </div>
    </main>
  );
}

function NumberedRow({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className={styles.numberedRow} style={{ listStyle: "none" }}>
      <span className={styles.numeral} aria-hidden="true">
        {n}
      </span>
      <span className={styles.numberedText}>{children}</span>
    </li>
  );
}
