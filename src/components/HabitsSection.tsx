"use client";

import { ActiveAction, Completion, Habit } from "@/lib/types";
import { HabitList } from "./HabitList";
import { AddHabitButton } from "./AddHabitButton";
import { useState } from "react";
import { AddHabitForm } from "./AddHabitForm";
import { getTodaysDate, getTodaysDateHeading } from "@/lib/dates";
import { Stats } from "./Stats";

export function HabitsSection({
  habits,
  completions,
}: {
  habits: Habit[];
  completions: Completion[];
}) {
  const [activeAction, setActiveAction] = useState<ActiveAction>({ type: "none" });

  // Computed once each and threaded down (today as a Date for the heading, todaysDate as the
  // derived string for HabitList/Stats) rather than every consumer independently calling
  // `new Date()`/`getTodaysDate()` - see lib/dates.ts's getTodaysDate/getTodaysDateHeading for why
  // that matters.
  const today = new Date();
  const todaysDate = getTodaysDate(today);

  return (
    // flex flex-col + a viewport-capped max-height turns this into a single-scroll-region "app
    // shell": the header row and Stats footer below are flex-shrink-0 (always rendered at their
    // natural size), and the middle wrapper (Habits label + AddHabitForm + HabitList) is the only
    // flex child that shrinks and scrolls internally once there's no room left. max-h is a ceiling,
    // not a fixed height - when the habit list is short enough to fit, this div's actual height is
    // just its content's natural height (exactly today's behaviour, nothing scrolls anywhere); the
    // cap only engages once a long enough habit list would otherwise push the page taller than the
    // viewport. That's deliberate: this app assumes a small number of habits day-to-day (see
    // docs/decisions.md's loading.tsx entry), so the common case should render identically to
    // before, with this only stepping in for the uncommon long-list case. The alternative -
    // page-level scrolling with no cap here, today's behaviour - would scroll the date heading and
    // "Add habit" button off-screen while browsing a long list, and scroll the stats footer (the
    // app's own motivational feedback - streaks, today's progress) out of view too, exactly the
    // two things worth always keeping visible. This intentionally avoids the alternative of
    // *sticky* positioning instead of a capped/scrolling flex column: sticky elements stick
    // relative to the page's own scroll, which would either need an offset hand-tuned to body's
    // py-8 + this card's p-6 padding just to avoid the header/footer visually breaking out of the
    // card's rounded border as the page scrolls past them, or (nested inside an unconstrained
    // page) would leave the whole page scrollable *and* introduce a second inner scroll region -
    // the classic mobile "which region does my scroll gesture apply to" ambiguity. Capping this
    // div's own height instead keeps the page itself from ever needing to scroll at all (see the
    // arithmetic in this session's commit message/PR description for why that's guaranteed), so
    // there's only ever the one scrollable region, active only when actually needed.
    //
    // calc(100dvh-7rem): 7rem is every bit of fixed vertical padding between the viewport edge and
    // this div - body's py-8 (2rem top + 2rem bottom = 4rem) plus this card's own p-6 in
    // layout.tsx (1.5rem top + 1.5rem bottom = 3rem) = 7rem total. dvh (dynamic viewport height),
    // not vh, specifically to stay correct on mobile browsers whose address bar shows/hides and
    // changes the *visual* viewport height as the page scrolls - vh alone doesn't track that and
    // is a well-known source of mobile overscroll bugs.
    <div className="flex max-h-[calc(100dvh-7rem)] flex-col">
      {/* Always one row, button pinned to the top-right - whitespace-nowrap on the date keeps it
      from ever wrapping internally, and now that the button is icon-only (a compact ~44px square,
      not a "+ Add habit" pill), both comfortably fit side by side even on narrow mobile widths.
      shrink-0: see this component's own comment above - this row always renders at its natural
      size, never squeezed to make room for the scrollable list below it. */}
      <div className="mb-6 flex shrink-0 items-center justify-between gap-3">
        <p className="text-[22px] font-bold text-heading whitespace-nowrap">
          {getTodaysDateHeading(today)}
        </p>
        <AddHabitButton setActiveAction={setActiveAction} activeAction={activeAction} />
      </div>
      {/* The scrollable middle region - min-h-0 overrides a flex item's default min-height: auto,
      which would otherwise stop this from ever shrinking below its own content's natural height
      and silently defeat overflow-y-auto entirely (a well-known flexbox gotcha, not a redundant
      class). */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        {/* Smaller, uppercase and letter-spaced to read as a section label distinct from the 17px
        habit names beneath it - design.md's own spec has this at 18px/700/#1a3a5c, essentially the
        same size/colour/weight as the habit-name text, so it doesn't visually separate from the
        list content it's labelling. Deliberately kept in the same high-contrast heading colour
        rather than switched to a lighter/muted one for differentiation, though - the design's own
        existing "stat label" treatment (#7aaad4, the obvious thing to copy for a muted section
        label) only measures ~2.2-2.5:1 contrast against this app's actual backgrounds, well under
        WCAG AA's 4.5:1 minimum for text this size. Uppercase + tracking + a smaller size carries
        the "this is a label, not a name" distinction on its own, without trading away legibility. */}
        <h2 className="mb-3 text-[13px] font-bold text-heading uppercase tracking-[0.06em]">
          Habits
        </h2>
        <AddHabitForm activeAction={activeAction} setActiveAction={setActiveAction} />
        <HabitList
          habits={habits}
          activeAction={activeAction}
          setActiveAction={setActiveAction}
          completions={completions}
          todaysDate={todaysDate}
        />
      </div>
      <Stats habits={habits} completions={completions} todaysDate={todaysDate} />
    </div>
  );
}
