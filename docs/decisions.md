# Architecture Decisions

This document records the non-obvious architectural and product decisions behind this app and the reasoning behind them - including approaches that were fully designed and then deliberately set aside, not just the ones that shipped.

## Product philosophy

### The core metric rewards showing up, not perfection

**Decision:** the headline stat is a "showing-up streak" — the number of consecutive local days with _at least one_ habit completed — rather than a focus on how many "perfect" consecutive days a user had (completing all habits every day) or a potentially demotivating stat about weekly/monthly completion percentage (e.g. "9/28 habits done this week") if the completion rate is ever low.

**Why:** this draws directly on habit-formation research — James Clear's _Atomic Habits_ and its "never miss twice" principle, and the older "Don't Break the Chain" (Seinfeld) method — where showing up consistently matters more than performing perfectly on any given day. A streak that only requires _one_ habit to keep it alive rewards that philosophy directly, and doing so was a deliberate product choice, not just an implementation shortcut.

**Alternatives considered and rejected:** completion-rate stats (habits done / habits possible, over a week or month) were considered and rejected — they can read as failure-framed and demotivating, and they don't reward partial engagement on a day where the user did _something_ but not everything that week/month. This could be especially de-motivating if the user did very well during some of the week/month, but wasn't able to do well for the whole of the week/month. The user can't achieve a great score if they started off badly and got better towards the end of a week/month, which could detract from good effort they've put in later in the week/month.

## Data & backend

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

### Manual async handling instead of `useActionState` for editing a habit name

**Decision:** the edit-name form calls its Server Action directly inside an `onSubmit` handler (`await renameHabitAction(...)`), rather than binding it through `useActionState`/`<form action>` the way adding and completing a habit do.

**Why:** closing edit mode after a successful save needs to happen as a clear step immediately afterwards. `useActionState` gives no direct instruction to run code after the action completes — doing it that way would need a `useEffect` watching the returned state for a success flag, which is more indirection for no real benefit. Edit mode also already needs a controlled `useState` for the input (so Cancel can reset it to the original value immediately), which would sit awkwardly alongside `useActionState`'s FormData-based model. Adding and completing a habit don't have this requirement to run code after a success, so they can use `useActionState` as intended.

### Inline forms, not separate pages, for adding and editing habits

**Decision:** adding a habit uses a form pinned above the list; editing a name swaps the form in within that habit's row. Neither uses a dedicated page (e.g. `/habits/new`, `/habits/[id]/edit`).

**Why:** both are quick, single-field actions, so a full page showing a tiny form alongside a full page navigation and client-server round trip felt disproportionate to these small tasks with minimal interaction needs. Keeping them inline also means the rest of the list stays visible and interactive throughout, since the "editing" state is scoped to only one row rather than replacing the entire screen with a form.

### Rolling 7-day window, not a fixed calendar week, for the day strip

**Decision:** the 7-day completion strip always shows the previous 7 days, ending today, not a fixed Monday–Sunday week view.

**Why:** a fixed calendar week would show empty dots for future days early in the week (e.g. on a Monday, Tuesday–Sunday would all render as "empty"), with no way to visually distinguish the user not having completed any habits that day from that day not having occurred yet. Using a rolling window sidesteps that ambiguity entirely — every dot shown has already happened, with the current day being show on the far right, and the previous days that have already occurred with their results showing on the left. This also simplifies the UX as we no longer need a way in the UI to distinguish days that haven't occurred yet from days that have.

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

## Development workflow tooling

### `/commit` and `/push-pr` skills require explicit invocation - not implicitly invoked by Claude

**Decision:** both skills set `disable-model-invocation: true` in their frontmatter. This means Claude can never trigger them on its own from a natural language prompt - only explicitly typing the `/commit` or `/push-pr` command runs them. Most Claude Code skills default the other way: Claude can invoke them automatically whenever a request matches their description, with no explicit command required.

**Why:** committing, pushing to the shared GitHub remote, and opening a public pull request are hard-to-reverse, visible-to-others actions. Left auto-invocable, Claude could decide on its own — from a message as mild as "I think this potentially could be ready" - to commit, push, and open a PR without ever being explicitly asked to. `disable-model-invocation: true` is the mechanism Claude Code provides specifically for this: it turns off only Claude's ability to automatically invoke these skills, and leaves explicit skill invocations (`/commit`, `/push-pr`) fully intact. Any other future skill in this project's toolkit could potentially stay automatically executable by default, I just wanted to disable these particular skills that may have unwanted side effects if invoked accidentally to provide some level of safety.

### `/review` — a third explicitly-invoked skill, for thorough pre-PR checks

**Decision:** alongside `/commit` and `/push-pr`, a third skill, `/review`, also sets `disable-model-invocation: true`. Unlike the other two, `/review` has no side effects on the repo or GitHub — it's a read-only, findings-only check — but it's still explicit-invocation-only, reserved for a deliberate, thorough pass: diffing the branch against `main`, cross-referencing `README.md`, this file, `CLAUDE.md`, and any relevant `~/.claude/plans/*.md` files for conflicts or staleness, sweeping for dead code, and independently re-running `pnpm test`/`tsc`/`lint` rather than trusting anything claimed earlier in conversation. Quick "am I on track" sanity checks mid-work happen through ordinary conversation instead, not through this skill.

**Why:** even though `/review` doesn't push code or open PRs, keeping it explicit-invocation matches its intended cadence — a deliberate "give me the full picture" request before a commit or PR feels ready, not something that should fire on a casual comment like "I think this looks right." Keeping it findings-only (it never edits a file itself, even when it finds a stale doc or a real bug, and reports back for the developer to decide instead) keeps the same trust model as the rest of this toolkit: Claude reports, the developer decides.

### Context7 MCP is configured at user scope, not project scope

**Decision:** Context7 (an MCP server that fetches current, version-specific library documentation during development) is configured at the user level (at `~/.claude/`), instead of being added to this repo in a project-level `.mcp.json` file.

**Why:** Context7 is useful to use across every project, not just this project, and isn't specific to this app's stack — the same instinct behind other decisions in this file (e.g. streaks computed in one shared module rather than duplicated per habit and per "showing-up" streak) to have one configuration instead of two. A project-level `.mcp.json` file duplicating the same server would risk drifting out of sync with the user-level configuration over time without any benefit. If an MCP server was tied to this specific app (e.g. a Supabase MCP server scoped to this project's own database), then a project scope MCP server would be more suitable. The small trade-off is that because the user-scope configuration lives outside this repo, it won't show a clear record of using this MCP server the way that a project-scoped `.mcp.json` would. A written record is instead made visible here as well as in the README's "AI tooling" line and a short operational note in `CLAUDE.md`.
