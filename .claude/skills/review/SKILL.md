---
description: Thorough review of the current branch — checks the diff against main (and PR body if open) for correctness, cross-references README.md/docs/decisions.md/CLAUDE.md/relevant ~/.claude/plans/*.md files for conflicts, staleness, and deviations, sweeps for dead code and opinionated style issues, and independently runs tests/types/lint. Findings only, nothing is auto-fixed. Only invoke this explicitly as /review — never automatically; for a quick "am I on track" sanity check, just ask in conversation instead.
disable-model-invocation: true
allowed-tools: Bash(git branch *) Bash(git log *) Bash(git diff *) Bash(git status *) Bash(gh pr view *) Bash(grep *) Bash(ls *) Bash(pnpm test *) Bash(pnpm tsc *) Bash(pnpm lint *) Bash(pnpm install *)
---

## Current state

- Branch: !`git branch --show-current`
- Commits ahead of main: !`git log main..HEAD --oneline`
- Working tree status: !`git status --short`
- Diff vs main (stat): !`git diff main...HEAD --stat`
- Open PR for this branch: !`gh pr view --json number,title,url,body 2>/dev/null || echo "none"`
- Plan files mentioning this project: !`grep -l -i "habit-tracker" ~/.claude/plans/*.md 2>/dev/null | xargs ls -t 2>/dev/null || echo "none found"`

## Instructions

This is the thorough review command — run it when a full check is wanted, not a quick sanity read (for that, just ask in conversation instead). Nothing here gets fixed automatically; report findings and let the user decide what to change.

1. If there are no commits ahead of `main` and no staged/unstaged changes, say so and stop.
2. **Get the real diff.** `git diff main...HEAD` (plus `git diff` / `git diff --cached` for anything not yet committed) — read changed files in full where the stat/diff alone doesn't give enough context. Don't rely on anything claimed earlier in the conversation about what changed or whether checks passed.
3. **Read the standing docs**: `README.md`, `docs/decisions.md`, `CLAUDE.md`.
4. **Read the relevant plan file(s)** from the list above. If more than one matches, read all of them — later ones may extend or supersede earlier ones rather than replace them outright.
5. **Cross-reference all of the above against each other and against the actual code:**
   - Flag conflicts — two docs asserting different things about the same decision.
   - Flag staleness — a doc describing a past state that current code has since moved past (e.g. a "current state" note that predates work already shipped).
   - Flag omissions — a real decision made in code/commits that never made it into `docs/decisions.md`, breaking that file's job as the full record.
   - For each, suggest the specific edit — exact text or section to add/change — but do not make the edit.
6. **Check build-order sequencing** against the plan's numbered Build Order, if present. Flag anything done meaningfully out of that sequence — not an error, just a callout so it's a deliberate choice, not drift.
7. **Check for scope creep** — any changed file that doesn't obviously belong to this branch's/PR's stated purpose.
8. **Sweep for dead code and cruft**: unused exports, orphaned files/components nothing imports, commented-out code, leftover debug statements (a `console.log` used for debugging rather than deliberate logging), stale TODOs.
9. **Opinionated code review**, beyond what any doc explicitly states — naming, duplication, error-handling shape, test coverage gaps, anything that reads as a footgun even if no written rule forbids it. Same bar as a real PR review from a senior engineer, not just a docs-compliance check.
10. **Verify for real, not from memory:**
    - `pnpm test`
    - `pnpm tsc --noEmit`
    - `pnpm lint`
    - If `package.json` changed, confirm `pnpm-lock.yaml` matches: `pnpm install --frozen-lockfile` (this only checks, it doesn't mutate `node_modules` beyond a normal install)
    - If any of these fail with a `dyld` / library-not-found error mentioning `/usr/local/Cellar/node`, that's this machine's broken Homebrew Node shadowing the correct nvm-managed one — prepend the nvm Node bin dir to `PATH` (`export PATH="$(ls -d ~/.nvm/versions/node/*/bin | sort -V | tail -1):$PATH"`) and retry rather than reporting a false failure. Note the `sort -V` — a plain `ls | tail -1` sorts lexicographically and would pick `v8.x` over `v24.x`.
11. **Report back** as:
    - A checklist: Completed vs. Deviations/missed requirements, against the docs and plan file(s).
    - Doc-consistency findings, each with a suggested concrete edit.
    - Code-review findings: bugs, dead code, style/quality issues — ranked most-important first.
    - Test/type/lint/lockfile results, stated plainly (pass/fail, not summarized away).
