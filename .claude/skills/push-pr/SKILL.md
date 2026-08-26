---
description: Push the current branch and open a pull request. Only invoke this explicitly as /push-pr — never automatically.
disable-model-invocation: true
allowed-tools: Bash(git branch *) Bash(git log *) Bash(git push *) Bash(gh pr view *) Bash(gh pr create *) Bash(pnpm run validate) Bash(pnpm tsc --noEmit) Bash(pnpm test) Bash(pnpm build) Bash(export PATH=*)
---

## Current state

- Branch: !`git branch --show-current`
- Commits ahead of main: !`git log main..HEAD --oneline`
- Existing PR for this branch: !`gh pr view --json url,title 2>/dev/null || echo "none"`

## Instructions

1. If the current branch (above) is `main` or `master`, stop and tell the user to run `/commit` first — it creates a feature branch automatically.
2. If there are no commits ahead of `main` (empty list above), stop — nothing to push.
3. **Run the same checks CI runs, locally, before pushing anything** — this applies whether about to open a brand-new PR or push more commits to an existing one, since CI re-runs on every push either way. Run each of the following, matching `.github/workflows/ci.yml` step-for-step:

   ```bash
   pnpm run validate
   pnpm tsc --noEmit
   pnpm test
   pnpm build
   ```

   `pnpm build` doesn't need extra env vars locally — `.env.local` (already used for `pnpm dev`) covers what CI separately sources from repo `vars.*`.

   If any of these fail with a `dyld` / library-not-found error mentioning `/usr/local/Cellar/node`, that's this machine's broken Homebrew Node shadowing the correct nvm-managed one — prepend the nvm Node bin dir to `PATH` (`export PATH="$(ls -d ~/.nvm/versions/node/*/bin | sort -V | tail -1):$PATH"`) and retry rather than treating it as a real failure.

   If anything genuinely fails: **stop — do not push, do not create or update the PR.** Report exactly what failed (the actual command output, not a summary) and fix it before retrying `/push-pr` from the top, the same way any other work in this project gets fixed before committing. Don't push knowingly-broken code just because `/push-pr` was invoked — the point of this step is that CI should never be the first place a check fails.

4. Push the branch: `git push -u origin <branch>`.
5. If a PR already exists for this branch (see "Existing PR" above), report its URL and stop — don't create a duplicate.
6. Otherwise, open one with `gh pr create`:
   - **Title**: one line, Conventional-Commits-style (e.g. `feat: add streak calculation`) if the branch has one clear primary change; a short plain descriptive title if it spans several unrelated commits.
   - **Body**, structured as:
     - `## Summary` — 2–4 bullets: what changed and why, synthesized from the branch's commit messages, not copied verbatim.
     - `## Context` — include only when the motivation isn't obvious from the summary alone.
     - `## Test plan` — a checklist of how the change was verified (tests run, manual checks).
   - No footer or attribution line.
   - Pass the body via a HEREDOC for correct formatting:
     ```bash
     gh pr create --title "..." --body "$(cat <<'EOF'
     ## Summary
     - ...

     ## Test plan
     - [ ] ...
     EOF
     )"
     ```
7. Report the PR URL.

No confirmation prompt before pushing or opening the PR once step 3 has passed — invoking `/push-pr` at all is the explicit go-ahead for this run. A failure in step 3 is the one thing that's allowed to stop this skill short of completing.
