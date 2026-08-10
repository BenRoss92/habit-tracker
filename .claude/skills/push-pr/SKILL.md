---
description: Push the current branch and open a pull request. Only invoke this explicitly as /push-pr — never automatically.
disable-model-invocation: true
allowed-tools: Bash(git branch *) Bash(git log *) Bash(git push *) Bash(gh pr view *) Bash(gh pr create *)
---

## Current state

- Branch: !`git branch --show-current`
- Commits ahead of main: !`git log main..HEAD --oneline`
- Existing PR for this branch: !`gh pr view --json url,title 2>/dev/null || echo "none"`

## Instructions

1. If the current branch (above) is `main` or `master`, stop and tell the user to run `/commit` first — it creates a feature branch automatically.
2. If there are no commits ahead of `main` (empty list above), stop — nothing to push.
3. Push the branch: `git push -u origin <branch>`.
4. If a PR already exists for this branch (see "Existing PR" above), report its URL and stop — don't create a duplicate.
5. Otherwise, open one with `gh pr create`:
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
6. Report the PR URL.

No confirmation prompt before pushing or opening the PR — invoking `/push-pr` at all is the explicit go-ahead for this run.
