import {
  COVERAGE,
  FIELD_NEEDED_BY,
  HOUSEHOLD,
  KIDS,
  PROVIDERS,
  REVIEW_ITEMS,
  buildPrograms,
  buildWindows,
} from "./fixtures";
import type {
  CoverageBlock,
  FieldNeed,
  Household,
  Kid,
  KidId,
  RegistrationWindow,
  ReviewItem,
  WindowId,
  WindowView,
} from "@/lib/types";

/* ══════════════════════════════════════════════════════════════════════════
   The data seam.

   Every surface reads through this interface and nothing else, so the fixture
   implementation below can be replaced by Postgres without any screen
   changing. The methods are async for exactly that reason — they are a
   network call in waiting, not a convenience.

   Note what is absent: there is no method that returns kid data in a shape
   suitable for sending anywhere. Sensitive fields stay sealed (src/lib/pii.ts)
   all the way to the component that renders them.
   ══════════════════════════════════════════════════════════════════════════ */

export interface DibsRepository {
  getHousehold(): Promise<Household>;
  listKids(): Promise<readonly Kid[]>;
  getKid(kidId: KidId): Promise<Kid | null>;
  /** Blank fields a tracked window is actually waiting on, keyed by field. */
  getNeededFields(kidId: KidId): Promise<Readonly<Record<string, FieldNeed>>>;
  listWindows(): Promise<readonly WindowView[]>;
  getWindow(windowId: WindowId): Promise<WindowView | null>;
  setPrepItem(
    windowId: WindowId,
    prepItemId: string,
    done: boolean,
  ): Promise<void>;
  getCoverage(): Promise<CoverageBlock>;
  listReviewItems(): Promise<readonly ReviewItem[]>;
}

/**
 * Fixture-backed implementation.
 *
 * `now` is resolved once per instance so that every window in a single render
 * counts down against the same clock, and so the server hands the client
 * absolute instants rather than durations.
 */
export class FixtureRepository implements DibsRepository {
  private readonly windows: RegistrationWindow[];
  private readonly programs = buildPrograms();

  constructor(now: number = Date.now()) {
    this.windows = [...buildWindows(now)];
  }

  async getHousehold(): Promise<Household> {
    return HOUSEHOLD;
  }

  async listKids(): Promise<readonly Kid[]> {
    return KIDS;
  }

  async getKid(kidId: KidId): Promise<Kid | null> {
    return KIDS.find((k) => k.id === kidId) ?? null;
  }

  async getNeededFields(
    kidId: KidId,
  ): Promise<Readonly<Record<string, FieldNeed>>> {
    return FIELD_NEEDED_BY[kidId] ?? {};
  }

  async listWindows(): Promise<readonly WindowView[]> {
    return this.windows
      .map((w) => this.join(w))
      .filter((v): v is WindowView => v !== null)
      .sort(
        (a, b) =>
          new Date(a.window.opensAt).getTime() -
          new Date(b.window.opensAt).getTime(),
      );
  }

  async getWindow(windowId: WindowId): Promise<WindowView | null> {
    const w = this.windows.find((x) => x.id === windowId);
    return w === undefined ? null : this.join(w);
  }

  async setPrepItem(
    windowId: WindowId,
    prepItemId: string,
    done: boolean,
  ): Promise<void> {
    const i = this.windows.findIndex((w) => w.id === windowId);
    const w = this.windows[i];
    if (w === undefined) return;
    this.windows[i] = {
      ...w,
      prep: w.prep.map((p) => (p.id === prepItemId ? { ...p, done } : p)),
    };
  }

  async getCoverage(): Promise<CoverageBlock> {
    return COVERAGE;
  }

  async listReviewItems(): Promise<readonly ReviewItem[]> {
    return REVIEW_ITEMS;
  }

  private join(window: RegistrationWindow): WindowView | null {
    const program = this.programs.find((p) => p.id === window.programId);
    if (program === undefined) return null;
    const provider = PROVIDERS.find((p) => p.id === program.providerId);
    if (provider === undefined) return null;
    return {
      window,
      program,
      provider,
      kids: KIDS.filter((k) => window.kidIds.includes(k.id)),
    };
  }
}

/** Resolved per request. Swapping in a real database is a change here only. */
export function getRepository(now?: number): DibsRepository {
  return new FixtureRepository(now);
}
