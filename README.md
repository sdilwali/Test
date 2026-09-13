# Dibs

Never miss a kids' activity registration window.

A mobile-first PWA that tracks **registration windows** for kids' activities —
summer camps, youth sports, rec-center sessions, swim lessons — warns the
household's signup parent before one opens, and hands her a single screen with
the direct link and every field a registration form asks for, pre-loaded and
one tap from the clipboard.

The central object is the `RegistrationWindow`, not a calendar event. The
problem is a race, not a schedule.

## Running it

```bash
npm install
npm run dev          # http://localhost:3000
```

```bash
npm run build && npm start
npm run typecheck
```

Open `/windows`. The Race Mode window (`Camp Wildwood Session B`) is seeded to
open **107 seconds after page load**, so the zero crossing is always about two
minutes away — that is the state worth looking at.

## What is built

All six surfaces from the design handoff, against typed fixtures:

| Route | Surface |
| --- | --- |
| `/windows` | Tracker — five urgency groups, proximity ruler, needs-your-info |
| `/race/[windowId]` | Race Mode — countdown, zero crossing, copy chips, outcomes |
| `/coverage` | Coverage grid — weeks × kids, hatched gaps, conflicts, cost |
| `/review` | Review queue — source audit, confirm-by-tapping-the-time |
| `/kids` | Kid profile — 19 fields, derived readiness card |
| `/onboarding` | Three steps: address, first kid, install to home screen |

## Three constraints the code enforces

**Kid PII cannot reach a model API.** `src/lib/pii.ts` is a typed boundary in
both directions. Sensitive fields are sealed in an opaque box — `Pii<string>`
is *not* assignable to `string`, so it cannot be concatenated into a prompt or
spread into a request body — and extraction accepts only `ExtractionInput`, a
nominal type constructible solely from an inbound email. Reading a sealed value
requires an explicit `reveal(value, reason)` against a closed set of render-side
reasons, which makes every unwrap greppable. Sealed values are also deliberately
not serialisable across the server/client boundary, so display strings are
resolved server-side and plain text is what reaches the browser.

**The countdown is derived from the window's real instant, never decremented.**
A counter drifts while the tab is backgrounded and desyncs if the device clock
moves. `useSecondsUntil` recomputes from `opensAt` every tick and resyncs on
`visibilitychange` and `focus`.

**Numbers that describe the same thing come from one source.** The kid
profile's field count, its lit chips, and its derived "3 blanks: …" note all
fall out of the array in `src/lib/kid-fields.ts`. The tracker's "Needs your
info" card and the profile's accent sub-line read the same `FieldNeed` record,
so they cannot claim different things about what is blocking what. The coverage
grid's gap count, weekly totals and summer total are all computed from the
cells.

## What is not built

This is the front end against fixtures. The data seam is `DibsRepository`
(`src/data/repository.ts`); every surface reads through it and nothing else, so
swapping Postgres in is a change to that file and its implementation, not to
any screen.

Not yet present, roughly in spec order:

- **Ingestion** — inbound email webhook, `InboxItem` storage, the 60-second
  auto-reply. Needs a domain with DNS on `in.<domain>` plus Postmark or
  Cloudflare Email Routing.
- **Extraction** — the Anthropic call behind `ExtractionInput`. The boundary
  and the review queue that consumes its output exist; the call does not.
  Worth using structured outputs (`output_config.format`) rather than asking
  the model in prose to return bare JSON.
- **Alerts** — the six-tier chain (T14 → OPEN), durable scheduling, push and
  SMS. This has no design yet; the handoff lists notification copy as
  undesigned.
- **Auth, household sharing, billing, persistence.** Prep checkboxes, review
  confirmations and profile edits are component state and reset on reload.
- **A service worker.** The manifest and iOS meta tags make the app
  installable, which is what onboarding step 3 sells, but web push additionally
  needs a service worker, VAPID keys and a backend to push from — that lands
  with alerts, not before.

## Notes on the design handoff

Built to `design_handoff_dibs_app/README.md` and the screen recording. Three
places where the sources disagreed and the recording won:

- The handoff text says Maya is **17 of 19** fields; the recording shows **16
  of 19** with three blanks listed. 19 − 3 = 16, so the recording is
  self-consistent. The count is derived, not authored, so it follows the data.
- The tracker sub-line reads **"11 tracked"** in the design but the sample set
  contains ten windows. The count is derived, so it currently reads 10.
- The design shows one "Needs your info" card. Two kid fields have notes
  attached, so `FieldNeed.blocksCheckout` distinguishes a blank that stops a
  registration (a tracker card) from one a provider collects later (a quiet
  sub-line on the profile only).

Spec-versus-design conflicts were resolved in the design's favour, with the kid
model taking the union of both field sets — the spec's `preferredName` and
`notes` alongside the design's `shoeSize`, `medications` and
`sunscreenConsent`. Prep is structured rows rather than the spec's free-text
`prep_notes`, because the design needs per-item state and an "n of 3" counter.
