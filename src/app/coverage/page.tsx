import TabBar from "@/components/nav/TabBar";
import styles from "@/components/coverage/coverage.module.css";
import surface from "@/components/layout/surface.module.css";
import { getRepository } from "@/data/repository";
import { cx } from "@/lib/cx";
import type { CoverageState } from "@/lib/types";

const CELL_CLASS: Record<CoverageState, string | undefined> = {
  covered: styles.covered,
  partial: styles.partial,
  gap: styles.gap,
};

export const dynamic = "force-dynamic";

export default async function CoveragePage() {
  const repo = getRepository();
  const block = await repo.getCoverage();

  /* Every number on this screen is derived from the cells, never authored —
     the gap count, the weekly totals and the summer total have to agree with
     what the grid actually shows. */
  const uncoveredWeeks = block.weeks.filter((_, i) =>
    block.rows.some((r) => r.cells[i]?.state === "gap"),
  ).length;

  const totalCents = block.weeklyCostCents.reduce<number>(
    (sum, c) => sum + (c ?? 0),
    0,
  );

  return (
    <div className={surface.screen}>
      <div className={surface.scrollFlush}>
        <div className={styles.head}>
          <h1 className={surface.title}>{block.label}</h1>
          <div className={styles.stats}>
            <span className={`${styles.gapCount} tnum`}>
              {uncoveredWeeks} {uncoveredWeeks === 1 ? "week" : "weeks"}{" "}
              uncovered
            </span>
            <span className={styles.range}>{block.rangeLabel}</span>
          </div>
        </div>

        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr className={styles.weekHead}>
                <th className={styles.kidHead} scope="col">
                  <span className="srOnly">Kid</span>
                </th>
                {block.weeks.map((week) => (
                  <th key={week} scope="col" className={styles.weekLabel}>
                    {week}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row) => (
                <tr key={row.kidId} className={styles.row}>
                  <th scope="row" className={styles.kidCell}>
                    <span className={styles.kidName}>{row.kidName}</span>
                  </th>
                  {row.cells.map((cell, i) => (
                    <td
                      key={`${row.kidId}-${block.weeks[i] ?? i}`}
                      className={cx(styles.cell, CELL_CLASS[cell.state])}
                    >
                      <span className={styles.cellLabel}>{cell.label}</span>
                      <span className={styles.cellSub}>{cell.detail}</span>
                      {cell.conflict && (
                        <span className={styles.conflictFlag}>
                          !<span className="srOnly"> conflict</span>
                        </span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className={styles.costRow}>
                <th scope="row" className={styles.kidCell}>
                  <span className={styles.costLabel}>Cost</span>
                </th>
                {block.weeklyCostCents.map((cents, i) => (
                  <td
                    key={block.weeks[i] ?? i}
                    className={cx(styles.costCell, cents === null && styles.costEmpty, "tnum")}
                  >
                    {cents === null ? "—" : formatMoney(cents)}
                  </td>
                ))}
              </tr>
            </tfoot>
          </table>
        </div>

        <div className={styles.total}>
          <span className={styles.totalLabel}>Summer total</span>
          <span className={`${styles.totalValue} tnum`}>
            {formatMoney(totalCents)}
          </span>
        </div>

        {block.conflicts.length > 0 && (
          <div className={styles.conflicts}>
            <div className={styles.conflictsLabel}>
              {block.conflicts.length}{" "}
              {block.conflicts.length === 1 ? "conflict" : "conflicts"}
            </div>
            {block.conflicts.map((c) => (
              <div key={c.week} className={styles.conflictRow}>
                <span className={styles.conflictFlag} style={{ position: "static", flex: "0 0 auto", marginTop: 2 }}>
                  !
                </span>
                <span>
                  <span className={styles.conflictTitle}>
                    {c.week} · {c.title}
                  </span>
                  <p className={styles.conflictBody}>{c.explanation}</p>
                </span>
              </div>
            ))}
          </div>
        )}

        <div className={styles.legend}>
          <Legend swatchClass={CELL_CLASS.covered} label="Covered" />
          <Legend swatchClass={CELL_CLASS.partial} label="Partial" />
          <Legend swatchClass={CELL_CLASS.gap} label="Gap" />
          <span className={styles.legendItem}>
            <span
              className={styles.swatch}
              style={{ background: "var(--accent-400)" }}
            />
            Conflict
          </span>
        </div>

      </div>
      <TabBar />
    </div>
  );
}

function Legend({
  swatchClass,
  label,
}: {
  swatchClass: string | undefined;
  label: string;
}) {
  return (
    <span className={styles.legendItem}>
      <span className={cx(styles.swatch, swatchClass)} />
      {label}
    </span>
  );
}

function formatMoney(cents: number): string {
  return `$${(cents / 100).toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
}
