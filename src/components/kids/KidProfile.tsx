"use client";

import { useState } from "react";
import surface from "@/components/layout/surface.module.css";
import styles from "./profile.module.css";

export interface ProfileField {
  readonly key: string;
  readonly label: string;
  readonly value: string | null;
  /** Short note, present only when a tracked window needs this blank. */
  readonly need: string | null;
}

export interface ProfileSection {
  readonly name: string;
  readonly setCount: number;
  readonly total: number;
  readonly fields: readonly ProfileField[];
}

export interface KidRecord {
  readonly id: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly setCount: number;
  readonly total: number;
  readonly chips: readonly {
    readonly key: string;
    readonly chipLabel: string;
    readonly lit: boolean;
  }[];
  readonly blanks: readonly string[];
  readonly blocking: readonly string[];
  readonly sections: readonly ProfileSection[];
}

export default function KidProfile({
  kids,
  initialKidId,
}: {
  kids: readonly KidRecord[];
  initialKidId: string | null;
}) {
  const [activeId, setActiveId] = useState(
    initialKidId ?? kids[0]?.id ?? "",
  );
  const kid = kids.find((k) => k.id === activeId) ?? kids[0];

  if (kid === undefined) return null;

  return (
    <>
      <h1 className={surface.title}>
        {kid.firstName} {kid.lastName}
      </h1>

      {kids.length > 1 && (
        <div className={styles.kidTabs} role="tablist">
          {kids.map((k) => (
            <button
              key={k.id}
              type="button"
              role="tab"
              aria-selected={k.id === kid.id}
              className={`${styles.kidTab} ${k.id === kid.id ? styles.kidTabActive : ""}`}
              onClick={() => setActiveId(k.id)}
            >
              {k.firstName}
            </button>
          ))}
        </div>
      )}

      <div className={styles.ready}>
        <div className={styles.readyHead}>
          <span className={styles.readyLabel}>Ready in race mode</span>
          <span className={`${styles.readyCount} tnum`}>
            {kid.setCount} of {kid.total} fields
          </span>
        </div>

        <div className={styles.chipRow}>
          {kid.chips.map((c) => (
            <span
              key={c.key}
              className={`${styles.chip} ${c.lit ? "" : styles.chipDim}`}
            >
              {c.chipLabel}
            </span>
          ))}
        </div>

        <p className={styles.readyNote}>
          <ReadyNote blanks={kid.blanks} blocking={kid.blocking} />
        </p>
      </div>

      {kid.sections.map((section) => (
        <div key={section.name}>
          <div className={styles.sectionHead}>
            <span className={styles.sectionName}>{section.name}</span>
            <span
              className={`${styles.sectionCount} ${section.setCount === section.total ? styles.sectionCountDone : ""} tnum`}
            >
              {section.setCount}/{section.total}
            </span>
          </div>
          {section.fields.map((f) => (
            /* A stand-in for the real edit sheet. The actual field editors —
               date picker, phone entry, insurance-card scan — are called out
               as undesigned in the handoff and still need drawing. */
            <button key={f.key} type="button" className={styles.fieldRow}>
              <span className={styles.fieldKey}>{f.label}</span>
              <span className={styles.fieldRight}>
                <span
                  className={`${styles.fieldValue} ${f.value === null ? styles.fieldUnset : ""} tnum`}
                >
                  {f.value ?? "Not set"}
                </span>
                {f.value === null && f.need !== null && (
                  <span className={styles.fieldNeed}>{f.need}</span>
                )}
              </span>
            </button>
          ))}
        </div>
      ))}
    </>
  );
}

/**
 * "3 blanks: Shoe, Medications, Photo release. Photo release is needed by a
 * window you are tracking."
 *
 * Derived from the same array as the count and the chips, so it can never
 * name a blank the chips show as lit.
 */
function ReadyNote({
  blanks,
  blocking,
}: {
  blanks: readonly string[];
  blocking: readonly string[];
}) {
  if (blanks.length === 0) {
    return <>Everything a form asks for is on file. Nothing to look up.</>;
  }

  const blockingText =
    blocking.length === 0 ? null : (
      <>
        {" "}
        <span className={styles.readyNoteBlocking}>
          {joinNames(blocking)}{" "}
          {blocking.length === 1 ? "is" : "are"} needed by a window you are
          tracking.
        </span>
      </>
    );

  return (
    <>
      {blanks.length} {blanks.length === 1 ? "blank" : "blanks"}:{" "}
      {joinNames(blanks)}.{blockingText}
    </>
  );
}

function joinNames(names: readonly string[]): string {
  if (names.length <= 2) return names.join(" and ");
  return `${names.slice(0, -1).join(", ")}, ${names[names.length - 1]}`;
}
