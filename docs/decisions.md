# Architecture Decisions

This document records the non-obvious architectural and product decisions behind this app and the reasoning behind them - including approaches that were fully designed and then deliberately set aside, not just the ones that shipped.

## Product philosophy

### The core metric rewards showing up, not perfection

**Decision:** the headline stat is a "showing-up streak" — the number of consecutive local days with _at least one_ habit completed — rather than a focus on how many "perfect" consecutive days a user had (completing all habits every day) or a potentially demotivating stat about weekly/monthly completion percentage (e.g. "9/28 habits done this week") if the completion rate is ever low.

**Why:** this draws directly on habit-formation research — James Clear's _Atomic Habits_ and its "never miss twice" principle, and the older "Don't Break the Chain" (Seinfeld) method — where showing up consistently matters more than performing perfectly on any given day. A streak that only requires _one_ habit to keep it alive rewards that philosophy directly, and doing so was a deliberate product choice, not just an implementation shortcut.

**Alternatives considered and rejected:** completion-rate stats (habits done / habits possible, over a week or month) were considered and rejected — they can read as failure-framed and demotivating, and they don't reward partial engagement on a day where the user did _something_ but not everything that week/month. This could be especially de-motivating if the user did very well during some of the week/month, but wasn't able to do well for the whole of the week/month. The user can't achieve a great score if they started off badly and got better towards the end of a week/month, which could detract from good effort they've put in later in the week/month.

## Data & backend

### `app/page.tsx` is force-dynamic (`revalidate = 0`), never statically cached

**Decision:** `app/page.tsx` exports `revalidate = 0`, so the homepage's Supabase query reruns on every single request rather than being cached as static HTML.

**Why:** without it, Next.js's App Router default applies - a Server Component with no dynamic APIs in use gets prerendered once at build time and served as static HTML from then on (confirmed via `pnpm build`'s route output: `○ (Static) prerendered as static content`). That surfaced as a real bug during manual production testing: a habit added directly via the Supabase dashboard didn't appear on the deployed site even after reloading, because the page was still serving the exact HTML generated at the last Vercel build - nothing had told Next.js to regenerate it.

The eventual CRUD Server Actions will each call `revalidatePath('/')` after a successful mutation, which correctly busts a static page's cache for changes made _through the app_. But that only covers in-app mutations - any data change from outside the app (a manual Supabase dashboard edit, a script, a future admin tool) can never trigger `revalidatePath`, since that only runs from code paths inside this Next.js app. `revalidate = 0` is the only setting that stays correct regardless of how the data changed, which matters for an app whose entire dataset currently lives in one shared, directly-editable Supabase table. Given this is a low-traffic personal app, the cost of never caching the homepage is negligible, so this is expected to stay in place even once the CRUD Server Actions exist and their own `revalidatePath` calls would otherwise be enough on their own - not just a stopgap for the current no-CRUD-yet state. Worth revisiting only if this app ever saw enough real traffic for a per-request Supabase round-trip to become a genuine latency/cost concern.

### RLS policies alone aren't enough - explicit Table-Level Grants are also needed for `anon`

**Decision:** both tables have RLS enabled with a permissive "allow all" policy for the `anon` role (`USING (TRUE) WITH CHECK (TRUE)`, covering all four operations), **and** an explicit `GRANT SELECT, INSERT, UPDATE, DELETE ON <table> TO anon` alongside each policy. Both layers are required together - neither one alone is enough for `anon` to read or write these tables.

**Why:** RLS and grants control two different things. RLS policies decide which _rows_ a role can see or modify once it's already allowed to touch the table at all (`USING` for existing rows, `WITH CHECK` for incoming writes) - they can't grant access to a table `anon` has no underlying SQL privilege on in the first place. Table-Level Grants are that underlying privilege. Normally Supabase's "Automatically expose new tables" project setting grants this automatically for new tables, but that setting is explicitly disabled on this project for more granular, deliberate control over what `anon` can touch - which means the grant has to be written out explicitly here instead of relying on the default. Skipping it while only adding the RLS policy would silently fail every query from the app's `anon`-scoped Supabase client (e.g. `createHabit`'s insert), even though the RLS policy itself looks completely permissive and correct on its own.

### Hard delete, not soft delete

**Decision:** deleting a habit permanently removes it and all its completions (`ON DELETE CASCADE`). There's no archive/trash state or recovery path.

**Why:** soft delete exists to support undo, audit trails, or "still visible to other users" rules — none of which apply here. This is a single-user personal app with no requirement to recover a deleted habit, and adding a soft-delete flag would mean every future query needs an "is this still live" filter. At the small scale of a personal portfolio projectaccounts, this safety net is not critical.

### Streaks and stats computed in TypeScript, not SQL

**Decision:** all streak/stat logic lives in one shared, pure TypeScript module (`lib/streaks.ts`, `lib/dates.ts`), not in SQL views or Postgres RPC functions.

**Why:** it is easy to unit test with Jest in a fast, offline loop. No database round-trip is needed to test an edge case. It also guarantees a single implementation: a habit's own streak and the app-wide "showing-up" streak are the exact same function with different inputs, rather than two versions that could quietly drift apart.

### Validation lives only in the Server Action (Zod), never in HTML attributes

**Decision:** input validation (name length, non-empty, etc.) happens exclusively via Zod inside each Server Action. No `required`/`maxLength` HTML attributes are used to duplicate the rule client-side.

**Why:** a Next.js Server Action isn't a private implementation detail — it compiles to a real, independently callable HTTP endpoint. Anyone can call it directly (via browser devtools, `curl` or a copied `fetch`) completely bypassing the form and any HTML validation on it, so client-side validation is never a substitute for server-side checks, only ever a convenience layered on top. Given this, a second copy of the same validation rule in HTML is redundant. The Zod validation library specifically also closes a real runtime gap that a plain type assertion misses: `formData.get('name')` returns `string | File | null`, and the TypeScript type assertion `as string` can't check what type gets returned at runtime, so a missing field (`null`, distinct from an empty string) would throw an uncaught error instead of failing cleanly. `z.string().trim().min(1).max(100)` via `.safeParse()` handles all of those cases explicitly.

## UI & client interactivity

### Non-optimistic updates everywhere, including completion toggling

**Decision:** every mutation — add, edit, delete, and marking a habit done/not-done — waits for the Server Action to confirm before the UI changes. Nothing updates instantly with a rollback-on-failure path.

**Why:** an optimistic version of the toggle was fully designed first (see below) before being set aside in favor of simplicity. For a personal, single-user app, instant responsiveness on a single button click wasn't worth the complexity it required. The explicit fallback plan is to revisit optimistic updates (hand-rolled state or React's `useOptimistic`) if the non-optimistic wait ever feels laggy in real production use — the goal was to not pay the complexity cost before it's proven necessary.

**A useful side effect:** because the toggle button disables itself while its request is pending, each habit's toggle gets same-habit double-submit protection for free, with no manual per-habit locking code required.

**The optimistic design that was set aside:** before deciding on the non-optimistic approach above, a full optimistic-UI design was worked out: a per-habit pending status lock, a targeted per-habit rollback on failure, and a stacked multi-error toast system (`HabitList` holding an array of `{ id, message }` errors, one dismissible `ErrorToast` per failure, so simultaneous failures on different habits wouldn't overwrite each other). In that design, no dedicated "Retry" button was needed either — ticking or unticking the checkbox again is already an easy way for a user to retry toggling a habit completion, so a separate 'retry' button is not needed. This design wasn't discarded so much as shelved: it's the documented starting point if optimistic toggling is revisited later.

**What shipped instead:** since every mutation is now non-optimistic, there's nothing needed to roll back to and no toast system needed in the current design. All errors — add, edit, delete, and toggle alike — render inline next to the action that failed: for add/edit, the typed text is preserved, an inline error message appears under the input, and the button re-enables so the user can resubmit (edit specifically stays open in edit mode rather than leaving edit mode on failure).

### ~~Adding a habit doesn't lock the rest of the habit list~~ — superseded, see "Only one add/edit/delete action open at a time" below

**Decision (as shipped, then reversed):** while `AddHabitForm`'s submission was pending, only the add-habit form's own controls (input, submit, cancel) and the header "Add habit" trigger button were disabled. Existing habit cards - their checkboxes, edit icons, and delete icons - stayed fully interactive; nothing about them was blocked while a new habit was being added. `docs/design/add-habit-form-states.html`'s pending-state mockup matched this - the habit cards rendered normally there, with no dimming, and only the form and header button appeared disabled.

**Why it was chosen initially:** the same independence principle as the toggle decision above applies across features, not just within one. Adding a new habit and acting on a different, existing habit touch unrelated rows, with no shared server-side state between them - there's no correctness reason to block one while the other is in flight. Blocking them anyway would add friction for no benefit, and would require exactly the kind of shared "is anything pending" coordination the toggle design deliberately avoided by keeping each mutation's pending state local and independent (see above - no manual `pendingHabitIds` bookkeeping needed).

**Why it was reversed:** once editing and deleting existed alongside adding - three different actions, each opening its own inline form/confirmation in the same list - the calculus changed. The correctness argument above (unrelated rows, no shared server state) still holds, but a _UX_ argument took priority instead: a user could otherwise have the add-habit form open, click a different habit's edit icon, and end up with two inline forms open in the same list at once - or open edit on one habit and delete on another simultaneously. Nothing about that is server-incorrect, but it's confusing to look at and easy to lose track of which form's Cancel does what. See the new decision below for what replaced this.

### Only one add/edit/delete action open at a time, enforced by a single shared value

**Decision:** `HabitsSection` owns one piece of state, `activeAction` (`{ type: "none" } | { type: "adding" } | { type: "editing"; habitId } | { type: "deleting"; habitId }`), threaded down to `AddHabitButton`, `AddHabitForm`, and every habit row. Every control that can open a form - the header "Add habit" button, and each habit's edit and delete icons - disables whenever `activeAction` is anything other than `"none"`. Opening any one of them (add, edit a specific habit, delete a specific habit) is the only thing that can set `activeAction`, and only Cancel or a successful/failed-then-resolved submission sets it back to `"none"`.

**Why:** this supersedes the "doesn't lock" decision above once three separate actions (add, edit, delete) could each open their own inline UI in the same list - see that entry for the reasoning behind the reversal. A single shared value was chosen over three independent per-control "am I disabled" booleans (one for add, one per habit's edit state, one per habit's delete state) because a value only one place can set can only ever describe one thing happening at a time - that's the actual enforcement mechanism, not a rule layered on top of independent state that each control would have to remember to check against the others. It also removes an entire class of bug: with independent booleans, nothing would stop two different habits from independently entering "editing" at once, or add and edit being open simultaneously, other than remembering to wire up cross-checks between them by hand.

### Confirm before deleting, not immediate deletion on the trash icon

**Decision:** clicking a habit's delete icon doesn't delete anything immediately - it opens `DeleteHabitForm`, an inline confirmation card in that habit's row (habit name, a permanence warning, and explicit Delete/Cancel buttons) in place of the habit row. The actual `deleteHabit` Server Action only runs once Delete is clicked inside that confirmation.

**Why:** deletion is the one mutation in this app with no undo path (see "Hard delete, not soft delete" above - it cascades to all of that habit's completion history too). A single mis-click on an icon-only button permanently destroying data with no confirmation step is a real risk worth guarding against, unlike add/edit, where a mistake is trivially fixable by editing again. This wasn't spelled out as a distinct component in the original plan (`HabitItem`'s delete was described as a plain action), but follows the same reasoning already applied elsewhere in this app: irreversible actions get an explicit extra step, reversible ones don't.

### Manual async handling instead of `useActionState` for adding, editing, and deleting a habit

**Decision:** `AddHabitForm`, `UpdateHabitForm`, and `DeleteHabitForm` all call their Server Action (`createHabit`/`updateHabit`/`deleteHabit`) directly inside an `onSubmit` handler, rather than binding it through `useActionState`/`<form action>`. The plan originally called for `AddHabitForm` specifically to use `useActionState`, reserving manual invocation for the not-yet-built edit-name form only - that plan has been deliberately changed, and all three forms use manual invocation.

**Why:** two reasons, one shared across all three forms and one specific to adding. Shared: closing the form after a successful save needs to happen as a clear step immediately afterwards - each form resets `activeAction`/its own local input state/`error` on success, the same category of post-success step every one of the three needs. `useActionState` gives no direct instruction to run code after the action completes - doing it that way would need a `useEffect` watching the returned state for a success flag, which is more indirection for no real benefit. Specific to adding: `createHabit` takes a single plain `habitName: string` argument rather than `(prevState, formData)`, since the only data being sent is one string - binding through `useActionState`/`<form action>` would mean extracting that string back out of a `FormData` object for no benefit over just passing it directly, given there's only one field. The same reasoning extends to `updateHabit(habitId, habitName)` and `deleteHabit(habitId)`, both plain-argument functions for the same reason.

### Never clear a form's typed value on error - only on success

**Decision:** if a Server Action call fails for any reason - a validation error (empty name, name over 75 characters), or a database error - the value the user typed stays in the input. It's only ever cleared after a _successful_ submission. This is a general rule, not specific to one kind of error: none of the three forms special-case which error occurred before deciding whether to keep or clear their state. `DeleteHabitForm` has no typed input to preserve, but follows the same rule in spirit - a failed deletion keeps the confirmation card open (not silently reverting to the plain habit row) so the user can see what went wrong and retry, rather than having to click the delete icon again from scratch.

**Why:** clearing the input on error forces the user to reconstruct what they typed from memory, which is strictly worse when the fix is simple - e.g. a too-long name just needs trimming down, but a cleared input means retyping the whole thing from scratch while trying to remember the exact wording they had. Preserving the value also matches near-universal form convention: an email/password/address form doesn't wipe a field just because it failed validation - clearing on error is the surprising choice, not the expected one. Applying this as one general rule (rather than deciding per error type) keeps the behaviour predictable and avoids ending up with some errors clearing the input and others not, for no principled reason.

### Inline forms, not separate pages, for adding and editing habits

**Decision:** adding a habit uses a form pinned above the list; editing a name swaps the form in within that habit's row. Neither uses a dedicated page (e.g. `/habits/new`, `/habits/[id]/edit`).

**Why:** both are quick, single-field actions, so a full page showing a tiny form alongside a full page navigation and client-server round trip felt disproportionate to these small tasks with minimal interaction needs. Keeping them inline also means the rest of the list stays visible and interactive throughout, since the "editing" state is scoped to only one row rather than replacing the entire screen with a form.

### Rolling 7-day window, not a fixed calendar week, for the day strip

**Decision:** the 7-day completion strip always shows the previous 7 days, ending today, not a fixed Monday–Sunday week view.

**Why:** a fixed calendar week would show empty dots for future days early in the week (e.g. on a Monday, Tuesday–Sunday would all render as "empty"), with no way to visually distinguish the user not having completed any habits that day from that day not having occurred yet. Using a rolling window sidesteps that ambiguity entirely — every dot shown has already happened, with the current day being show on the far right, and the previous days that have already occurred with their results showing on the left. This also simplifies the UX as we no longer need a way in the UI to distinguish days that haven't occurred yet from days that have.

### `HabitsSection` introduced to hold add-habit orchestration state; `HabitList` stays a plain, stateless list

**Decision:** the plan originally described `HabitList` itself as the stateful composing component that would group the header, `AddHabitForm`, and the list together ("groups `StatsSummary`, `DayStrip`, `AddHabitForm`, and one `HabitItem` per habit... `HabitList` doesn't need `'use client'` at all"). The actual implementation instead introduces a separate `HabitsSection` component (`"use client"`) to hold that orchestrating role - owning the shared `activeAction` state (originally a simpler `isEditing` boolean before editing/deleting existed alongside adding - see "Only one add/edit/delete action open at a time" above) and rendering `AddHabitButton`, `AddHabitForm`, and `HabitList` together - while `HabitList` itself stays exactly the plain, stateless, prop-driven list the plan describes for that name specifically.

**Why:** once the "Add habit" trigger button (in the page header) and the add-habit form (inside the habits section) needed to share state - specifically so the button can disable itself while the form is open/pending - that shared state had to live in a common ancestor of both. `HabitList` was never that common ancestor conceptually (it's specifically "the list of existing habits," not "the whole page's interactive area"), and keeping it stateless matches the plan's own stated goal for it. Introducing `HabitsSection` as a distinct orchestrating layer keeps `HabitList` reusable and easy to reason about in isolation (still no `'use client'` needed, still just renders whatever `habits` prop it's given) while giving the button and form one shared place to coordinate.

### `AddHabitForm` styled with `tailwind-variants`, not a hand-rolled class-lookup object

**Decision:** `AddHabitForm`'s per-state styling (idle/error/pending, across the form card, input, and submit button) uses `tailwind-variants`' `slots` API, not a hand-written `Record<State, string>` object.

**Why:** the form has multiple elements that all need different classes for the same shared state - exactly the scenario `tailwind-variants`' `slots` feature is purpose-built for (one recipe, several named slots, each with its own classes per variant), rather than a general "map a value to a class string" pattern with no purpose-built tool behind it. It also bundles its own conflict-safe merging, which guards against a real pitfall a hand-rolled object wouldn't: combining a shared base string with per-state overrides risks two conflicting classes for the same CSS property ending up in the same string, with no guarantee about which one the browser applies. `class-variance-authority` (the more widely-known alternative) was considered too, but it's built around one element per recipe - using it here would mean one `cva()` call per slot, without the shared multi-slot definition `tailwind-variants` provides.

### Icons come from `@tabler/icons-react`, not hand-copied inline SVG or the mockups' CDN webfont

**Decision:** icons in the app (the add-habit button's plus icon, the pending spinner, the error message's alert icon) are rendered via `@tabler/icons-react` components (`IconPlus`, `IconLoader2`, `IconAlertCircle`), not copied-in raw `<svg>` markup and not the Tabler Icons webfont the design mockups load from a CDN (see "Design mockups are full standalone HTML documents..." below).

**Why:** the design mockups already committed to the Tabler icon set, so using `@tabler/icons-react` guarantees the app's icons are pixel-identical to the mockups rather than an approximation from hand-copied SVG paths, which are easy to get subtly wrong (stroke width, viewBox) and tedious to keep in sync as the design evolves. Each icon is a tree-shakeable React component - only the specific icons actually imported end up in the bundle - which is also why the mockups' own CDN webfont approach was ruled out for the real app: a webfont ships its entire icon set regardless of how many are used, and (like the Nunito CDN link) is an external request the app avoids in favor of self-hosting, consistent with the existing typeface decision.

## Visual design

### Blue palette for day-dots and streak badges, not the originally-planned amber/green

**Decision:** both the day-strip's completion dots and the habit streak badges use a single blue palette, scaled by intensity — `#dbeeff` (lightest) → `#5aaad4`/`#93c5e8` (mid) → `#1a6bbf`/`#1a55a0` (strongest, with white text) — rather than the amber (streak badges) and amber/green (day-dots) originally sketched out during planning. A 0-streak badge is a transparent pill with just a `#b8d4f0` border, not a filled grey.

**Why:** this came out of iterating on the visual design directly (see `docs/design/habit-tracker-main.html` and `docs/design/design.md`, and the "design iterated via Claude.ai chats" entry below) rather than the initial planning pass - a single-hue progression reads as more cohesive across the whole dashboard (day-strip, streak badges, borders, "today" ring all draw from the same blue family) than mixing in a second and third hue would have. The 🔥 emoji at streak-3 was kept from the original plan - it's still the "on a real roll" signal, just paired with the strongest blue instead of amber.

### Day-dot fill is proportional, not three fixed states

**Decision:** each day-strip dot fills like a pie chart, in proportion to the fraction of habits completed that day (e.g. 1 of 3 habits done fills roughly a third of the circle), rather than snapping to one of three fixed empty/half/full states as originally planned. A day where _all_ habits are done still gets the distinct full-circle-plus-⭐ treatment, so "perfect" days remain visually distinct from "just happens to be 100% today by coincidence of only having one habit."

**Why:** a proportional fill scales correctly regardless of how many habits exist - three fixed states either compress meaningfully different completion levels together (2 of 5 vs 4 of 5 would both just be "half") or need more than three states to stay accurate as habit count grows. The plan's original three-state version was written before habits with varying counts were considered in this much depth.

### Legend row under the day-strip

**Decision:** a small legend renders directly beneath the day-strip, explaining what each dot state means: a filled circle with a star ("All habits completed"), a partial wedge ("Some habits completed"), an empty outline ("Nothing completed"), and a blue-ringed outline ("Today"). This is a new UI element not in the original component plan - part of `DayStrip`, not a separate component.

**Why:** the proportional pie-fill (above) is expressive but not self-explanatory at a glance - a legend costs one small line of UI and removes any doubt about what a given dot's fill level or outline means, especially for the "today" ring, which could otherwise be mistaken for another fill state.

### Nunito as the app's typeface

**Decision:** the app adopts Nunito (Google Fonts, weights 400/500/600/700) as its typeface throughout, to be wired up via `next/font/google` when building UI, replacing whatever default Next.js currently ships with.

**Why:** matches `docs/design/design.md`'s Typography section and `docs/design/habit-tracker-main.html`, both of which commit to Nunito consistently. Using `next/font/google` (rather than the mockups' CDN `<link>`) keeps the font self-hosted and avoids a render-blocking external request, consistent with Next.js's own recommended approach.

### Design mockups are full standalone HTML documents, loading fonts/icons from a CDN the app itself doesn't use

**Decision:** `docs/design/habit-tracker-main.html` and `docs/design/add-habit-form-states.html` are complete, self-contained `<!DOCTYPE html>` documents (with a real `<head>`, a Nunito Google Fonts `<link>`, and a Tabler Icons webfont CDN `<link>`), not bare markup fragments. The app itself doesn't link to either CDN.

**Why:** the mockups originally rendered correctly inside the Claude.ai conversation that generated them, but lost their font styling once downloaded and opened as local files directly in a browser - Claude.ai's own preview environment apparently supplies enough surrounding page structure for font inheritance to work, which a bare markup fragment opened via `file://` in a real browser doesn't get for free. Two things needed fixing: the files needed a real `<head>` so their `<link>` stylesheets reliably load at all when opened standalone, and interactive elements (buttons, inputs) needed an explicit `font-family` declaration rather than relying on inheriting one from `body`/a universal `*` selector - browsers don't apply the document's font to form elements by default, an easy-to-miss CSS default until exactly this kind of file gets opened on its own. The mockups also now load Tabler Icons from a CDN purely so their icons render correctly standalone - the app itself doesn't and shouldn't link to that CDN either, for the same reasoning already used for Nunito above: a self-hosted load avoids a render-blocking external request, so translating an icon from a mockup into the app means copying it in as an inline SVG (already done for the add-habit button's plus icon), not linking the same icon-font CDN into production.

### No dark mode; unused `@theme` tokens removed

**Decision:** the Next.js scaffold's dark-mode media query and the `--color-background`/`--color-foreground`/`--font-mono` theme tokens it enabled are dropped, along with the unused Geist Mono font. `--background`/`--foreground` stay as plain `:root` variables consumed directly by `body`, not exposed as Tailwind color tokens.

**Why:** `docs/design/habit-tracker-main.html` and `docs/design/add-habit-form-states.html` only specify a light appearance, and nothing in the app used `bg-background`, `text-foreground`, or `font-mono` - keeping them was unused surface area left over from scaffolding, not an intentional feature.

### "Any habits done" / "day streak" wording for the showing-up streak stat

**Decision:** the showing-up streak's stat card reads **"Any habits done"** (label) → the streak count → **"day streak"** (subtitle), rather than the earlier "Daily Streak" / "days active" wording.

**Why:** "Daily Streak" / "days active" doesn't tell a user whether the streak requires _all_ habits done that day or just _one_ - which matters a lot given the core metric was deliberately designed to reward showing up, not perfection (see above), not just a wording detail. Leading with "Any habits done" as the label states the actual rule explicitly, right where a user's eye lands first, without needing a tooltip or extra UI - the label and subtitle read as one sentence ("Any habits done: 6, day streak").

## Testing strategy

### Given/When/Then naming in plain Jest/RTL, not Gherkin/Cucumber

**Decision:** BDD is showcased through explicit Given/When/Then naming in nested `describe`/`it` blocks (e.g. `describe("given an error occurred")` → `describe("when the user clicks 'Try again'")` → `it("then tries again")`), written directly in the existing Jest/RTL test files - not through Gherkin `.feature` files and a library like `jest-cucumber`. This applies specifically to component/UI tests describing end-user-observable behaviour; data-layer tests (e.g. `fetchHabits()`'s success/failure contract in `data.test.ts`) stay as plain descriptive unit tests, since their caller is other code, not an end user, so there's no user-perspective behaviour to phrase as Given/When/Then.

**Why:** the same reasoning already applied to the Playwright decision below - real Gherkin/Cucumber tooling adds genuine machinery (a new dependency, a `.feature` file plus a separate step-definition file per behaviour, and a layer of indirection between the human-readable scenario and the code that runs it) for a solo project where the person reading the acceptance criteria and the person writing the step definitions are the same person. Given/When/Then naming inside the existing test files gets the same readability and the same "this test describes a user behaviour, not an implementation detail" discipline, without a second file format or extra tooling to maintain. Worth revisiting if this project ever needs non-technical stakeholders to read/write scenarios independently of the test code - the actual use case Gherkin's separation is designed for, which doesn't apply here.

### No end-to-end (Playwright) tests for the initial build

**Decision:** testing relies on Jest/React Testing Library unit and component tests, plus a deliberate manual verification pass (especially around the toggle failure path), not an automated E2E suite.

**Why:** Playwright would add real value in exactly the area most discussed above — the true end-to-end behavior of a mutation hitting a real server with real network timing, which Jest mocks can only approximate. But it also needs its own infrastructure to be safe: a separate Supabase project so test runs don't pollute real production habit data, plus wiring a CI pipeline to run a live version of the app against it. For a personal, single-user app already covered by unit tests on the logic/components/actions and a manual check of potentially the trickiest failure path, this infrastructure cost may not be needed yet. This has been noted here as a reasonable future addition if the app grows, but has not been deemed as a day-one requirement.

### `loading.tsx` shown during the initial fetch and on every retry

**Decision:** `app/loading.tsx` renders a simple loading message while `fetchHabits()` is in flight — both on the very first page load and every time `error.tsx`'s "Try again" button re-triggers the fetch.

**Why:** the original reasoning against a first-load skeleton still holds on its own: the dataset is small by design — likely a small number of habits and potentially in the low hundreds of completion rows per a year — so the server fetch is near-instant, and a skeleton for that case alone would add complexity without much visible benefit. But once `error.tsx`'s retry button existed, a real gap opened: clicking "Try again" left the user staring at the same error message with no feedback that a request was actually in flight, which would be especially confusing if the retry failed and showed the identical error screen again. `loading.tsx` closes that gap for free via the App Router's file convention — no extra wiring needed beyond the file existing — so keeping it was preferred over building retry-specific loading feedback some other way.

## Continuous integration

### CI added before every vertical slice is finished, not after

**Decision:** `.github/workflows/ci.yml` was built and shipped while the app still only has one working slice (viewing habits) - habit creation/editing/deletion and streaks (README.md's "Development approach") don't exist yet.

**Why:** this is deliberate, not drift. The goal is to get one full vertical slice - UI through to the database - working in production as early as possible, both because that's the point of vertical slice delivery and Agile (deliver something a real user could get value from as soon as possible, not wait for every feature to land at once) and because a single slice running for real in production is what actually surfaces infrastructure risk: deployment config, environment variables, build failures, version mismatches between local and CI (see the pnpm version entry below for a real example this caught). Finding and fixing that class of problem now, while the codebase is still small and there's only one slice to debug, is far cheaper than finding it later once several features are built on top of an infrastructure layer that was never actually exercised. Once CI is in place, every feature slice built after this one gets its checks enforced automatically from the moment it's written, rather than CI being retrofitted after a backlog of untested features already exists.

### Node version pinned in three separate places - `.nvmrc`, `engines.node`, and the CI workflow's `runtime` input

**Decision:** the Node.js major version (24) is pinned in three different files rather than one: `.nvmrc` at the repo root, `engines.node` in `package.json`, and the `runtime: node@24` input on the `pnpm/setup@v2` step in `.github/workflows/ci.yml`. All three are kept at major-version-only granularity (`24`, `24.x`, `node@24`), not an exact patch like `24.18.0`.

**Why:** each one is read by a different tool, for a different purpose, and no single file is read by all three - so one file wasn't an option:

- `.nvmrc` is read only by `nvm`, and only locally, when running `nvm use` with no argument (or via an opt-in shell hook, not yet configured, that would auto-switch on `cd`). It has no effect on pnpm, CI, or Vercel.
- `engines.node` is read by pnpm on every `pnpm install`/`pnpm <script>` (a hard error, not just a warning, if the currently-active Node doesn't satisfy it, since this is the project's own `engines` field rather than a dependency's) and by Vercel at deploy time to pick the actual Node major version production builds and serverless functions run on, overriding whatever's set in the Vercel dashboard's Project Settings. Neither of these actually installs a matching Node - they only check or select among what's already available.
- `runtime: node@24` is the one entry of the three that actually provisions Node: it's what tells `pnpm/setup@v2` to download and install that Node version onto the GitHub Actions runner and put it on `PATH` for every later step (lint, `tsc`, `jest`, `pnpm build`). Without it, `pnpm/setup@v2` would still install pnpm fine (pnpm v11+ ships as a self-contained binary needing no Node), but the job would run on whatever Node the `ubuntu-latest` runner image happens to ship that week - a version nobody chose, that drifts whenever GitHub updates the image, and that pnpm's own `engines.node` check would only ever catch after the fact rather than correct.

Major-version-only (rather than pinning the exact patch, e.g. `24.18.0`) was chosen so all three keep receiving Node's own patch/security updates automatically. A full major bump (e.g. 24 → 26) still requires deliberately editing all three files together, which is the point - it stops local dev, CI, and the Vercel production build from silently drifting apart on which Node version is actually running the app, since before this none of the three had any pinned Node version recorded anywhere at all.

### pnpm pinned to 11.22.0, not the original 11.13.0

**Decision:** `packageManager` in `package.json` is `pnpm@11.22.0` (with its full integrity hash), not the `11.13.0` the project started on.

**Why:** the first real CI run on this workflow failed - pnpm 11.13.0 turned out not to be compatible with Node 24 in the GitHub Actions environment. `pnpm/setup@v2` reads the pnpm version to install directly from this `packageManager` field (there's no separate pnpm-version input in `ci.yml` to keep in sync), so bumping this one field is what actually fixes CI - no workflow file change was needed alongside it. The version was updated locally first via `corepack use pnpm@11.22.0`, which is also what regenerated the integrity hash now recorded here.

### CI workflow tested locally with `act` before pushing

**Decision:** `.github/workflows/ci.yml` is run locally, via the `act` CLI (installed with Homebrew, backed by Docker), before pushing a change to it - rather than pushing straight to a PR and iterating on real GitHub Actions runs.

**Why:** a workflow file has no equivalent of `tsc --noEmit` - the only way to know whether the YAML is well-formed and each step actually does what's intended is to run it. Iterating via real pushes means round-tripping through a commit, a push, and a wait for the Actions runner for every small fix, and burns real Actions minutes on runs that are only there to catch a typo. `act` simulates the same trigger (`act pull_request`) in a local Docker container, giving the same fast local feedback loop already used for the rest of this project (`pnpm lint`/`tsc`/`test` before committing) rather than treating the CI config itself as the one thing that only gets tested in production.

No separate secrets/vars file is needed to run it: the build step reads `vars.NEXT_PUBLIC_SUPABASE_URL`/`vars.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (see the CI hardening entry below for why these are `vars`, not `secrets`), and `act` accepts any dotenv-format file as its variables source via `--var-file` - so the existing `.env.local` (already used for `pnpm dev`) is reused directly: `act pull_request --var-file .env.local`. This is also why `.gitignore` has no `.secrets` entry: this project's workflow has no `secrets.*` reference at all right now, so there's nothing for a `.secrets` file to hold - only `.env.local`, which the existing `.env*` pattern already covers.

### CI hardening: repository `vars` (not `secrets`) for public build values, least-privilege permissions, cancel-in-progress, a timeout

**Decision:** `ci.yml`'s build step reads `NEXT_PUBLIC_SUPABASE_URL`/`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` from `vars.*` (repository variables), not `secrets.*`. The workflow also declares `permissions: contents: read` at the top level, a `concurrency` group that cancels a superseded run when a new commit lands on the same PR, and `timeout-minutes: 10` on the job.

**Why:** `NEXT_PUBLIC_`-prefixed values are inlined into the client-side JS bundle by Next.js itself, so they're already visible to every visitor regardless of how they're stored in CI - a Supabase publishable key plays the same public-by-design role the old "anon key" did. Storing values that are meant to be public as GitHub _secrets_ masks them in logs for no real reason and misrepresents their sensitivity to anyone reading this file later; repository _variables_ are the correct place for them, keeping `secrets` reserved for something that would actually be a problem if leaked (e.g. a future Supabase service-role key). The other three settings follow GitHub's own security-hardening guidance for a workflow that never needs to push, comment, or write anything: `permissions: contents: read` limits the `GITHUB_TOKEN` to the minimum this job actually uses instead of inheriting whatever the repo/org default happens to be; `concurrency` avoids paying for two runs when a second push arrives before the first run on the same PR finishes; and `timeout-minutes: 10` stops a hang from silently consuming Actions quota, given GitHub's own default job timeout is 360 minutes.

### `/commit` and `/push-pr` skills require explicit invocation - not implicitly invoked by Claude

**Decision:** both skills set `disable-model-invocation: true` in their frontmatter. This means Claude can never trigger them on its own from a natural language prompt - only explicitly typing the `/commit` or `/push-pr` command runs them. Most Claude Code skills default the other way: Claude can invoke them automatically whenever a request matches their description, with no explicit command required.

**Why:** committing, pushing to the shared GitHub remote, and opening a public pull request are hard-to-reverse, visible-to-others actions. Left auto-invocable, Claude could decide on its own — from a message as mild as "I think this potentially could be ready" - to commit, push, and open a PR without ever being explicitly asked to. `disable-model-invocation: true` is the mechanism Claude Code provides specifically for this: it turns off only Claude's ability to automatically invoke these skills, and leaves explicit skill invocations (`/commit`, `/push-pr`) fully intact. Any other future skill in this project's toolkit could potentially stay automatically executable by default, I just wanted to disable these particular skills that may have unwanted side effects if invoked accidentally to provide some level of safety.

### `/review` — a third explicitly-invoked skill, for thorough pre-PR checks

**Decision:** alongside `/commit` and `/push-pr`, a third skill, `/review`, also sets `disable-model-invocation: true`. Unlike the other two, `/review` has no side effects on the repo or GitHub — it's a read-only, findings-only check — but it's still explicit-invocation-only, reserved for a deliberate, thorough pass: diffing the branch against `main`, cross-referencing `README.md`, this file, `CLAUDE.md`, and any relevant `~/.claude/plans/*.md` files for conflicts or staleness, sweeping for dead code, and independently re-running `pnpm test`/`tsc`/`lint` rather than trusting anything claimed earlier in conversation. Quick "am I on track" sanity checks mid-work happen through ordinary conversation instead, not through this skill.

**Why:** even though `/review` doesn't push code or open PRs, keeping it explicit-invocation matches its intended cadence — a deliberate "give me the full picture" request before a commit or PR feels ready, not something that should fire on a casual comment like "I think this looks right." Keeping it findings-only (it never edits a file itself, even when it finds a stale doc or a real bug, and reports back for the developer to decide instead) keeps the same trust model as the rest of this toolkit: Claude reports, the developer decides.

### Visual design iterated via Claude.ai chats, captured as static reference files

**Decision:** the app's visual design (colors, spacing, iconography, layout) was worked out iteratively in Claude.ai design conversations, not designed directly in code or logged decision-by-decision in this file. The result is captured as three files under `docs/design/`, checked into the repo and kept in sync as the design evolves (see `CLAUDE.md`'s Design section): `design.md` (a structured written spec - colour palette, typography, layout measurements, per-state property tables - covering the whole app), `habit-tracker-main.html` (a static HTML/CSS mockup of the main dashboard), and `add-habit-form-states.html` (a static HTML/CSS mockup of the add-habit form's three states: idle, validation error, submission pending). This started as a single mockup file and grew into three as the design itself grew past what one HTML file could clearly hold - most notably once the add-habit form needed its own dedicated states that don't fit alongside the main dashboard mockup.

**Why:** fine-grained visual choices (exact border widths, which of several blue variants to use where) don't carry the same lasting technical weight as the architectural and product decisions this file otherwise records, and logging each one individually here would dilute the more substantial entries a reviewer actually needs to understand this codebase. The handful of visual decisions that do have real product/UX weight - the color palette, the proportional day-dot fill, the streak-stat wording - are recorded above, under Visual design; everything else lives in the reference file itself, the same way `README.md`'s "AI tooling" line and the Context7/`/commit`/`/push-pr`/`/review` entries already disclose _how_ work got done, not just what shipped.

**Why `design.md` exists as a markdown spec, not a third HTML mockup:** a human and Claude Code read a design reference differently. A human opens the HTML mockups in a browser and takes in the whole composed picture at a glance - overall layout, spacing, how elements sit together - which is exactly what HTML/CSS is good at showing and a table of values can't convey. Claude Code reads files as raw text rather than rendering them, so pulling one specific fact out of HTML (e.g. "what's the streak badge's border color at 2?") means parsing CSS selectors, matching them to the right markup, and reasoning through cascade and any inline style overrides - `add-habit-form-states.html` has several of these, e.g. `style="border-color:#d93025"` overriding `.add-form`'s default border for one specific state. That's slower, costs more context, and leaves more room to misread which rule actually wins for a given element in a given state. `design.md`'s tables hold exactly the same facts in a directly-lookupable form instead - one row per property, one column per state, no CSS reasoning required - and its structure (grouped by property: color, size, weight) already matches the actual task of translating a value into a Tailwind class, rather than needing an extra decomposition step from a CSS rule first. The two formats complement rather than duplicate each other: the HTML mockups are the source of truth for overall visual composition and feel; `design.md` is the fast, unambiguous source of truth for one specific value once you already know what you're building.

### Context7 MCP is configured at user scope, not project scope

**Decision:** Context7 (an MCP server that fetches current, version-specific library documentation during development) is configured at the user level (at `~/.claude/`), instead of being added to this repo in a project-level `.mcp.json` file.

**Why:** Context7 is useful to use across every project, not just this project, and isn't specific to this app's stack — the same instinct behind other decisions in this file (e.g. streaks computed in one shared module rather than duplicated per habit and per "showing-up" streak) to have one configuration instead of two. A project-level `.mcp.json` file duplicating the same server would risk drifting out of sync with the user-level configuration over time without any benefit. If an MCP server was tied to this specific app (e.g. a Supabase MCP server scoped to this project's own database), then a project scope MCP server would be more suitable. The small trade-off is that because the user-scope configuration lives outside this repo, it won't show a clear record of using this MCP server the way that a project-scoped `.mcp.json` would. A written record is instead made visible here as well as in the README's "AI tooling" line and a short operational note in `CLAUDE.md`.
