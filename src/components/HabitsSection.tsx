"use client";

import { ActiveAction, Completion, Habit } from "@/lib/types";
import { HabitList } from "./HabitList";
import { AddHabitButton } from "./AddHabitButton";
import { useState } from "react";
import { AddHabitForm } from "./AddHabitForm";
import { getTodaysDate, getTodaysDateHeading } from "@/lib/dates";

export function HabitsSection({
  habits,
  completions,
}: {
  habits: Habit[];
  completions: Completion[];
}) {
  const [activeAction, setActiveAction] = useState<ActiveAction>({ type: "none" });

  // Computed once and threaded down (as the derived todaysDate string, to HabitList) rather than
  // HabitsSection and HabitList each independently calling `new Date()` - see lib/dates.ts's
  // getTodaysDate/getTodaysDateHeading for why that matters.
  const today = new Date();

  return (
    <div>
      {/* Always one row, button pinned to the top-right - whitespace-nowrap on the date keeps it
      from ever wrapping internally, and now that the button is icon-only (a compact ~44px square,
      not a "+ Add habit" pill), both comfortably fit side by side even on narrow mobile widths. */}
      <div className="mb-6 flex items-center justify-between gap-3">
        <p className="text-[22px] font-bold text-heading whitespace-nowrap">
          {getTodaysDateHeading(today)}
        </p>
        <AddHabitButton setActiveAction={setActiveAction} activeAction={activeAction} />
      </div>
      {/* Smaller, uppercase and letter-spaced to read as a section label distinct from the 17px
      habit names beneath it - design.md's own spec has this at 18px/700/#1a3a5c, essentially the
      same size/colour/weight as the habit-name text, so it doesn't visually separate from the
      list content it's labelling. Deliberately kept in the same high-contrast heading colour
      rather than switched to a lighter/muted one for differentiation, though - the design's own
      existing "stat label" treatment (#7aaad4, the obvious thing to copy for a muted section
      label) only measures ~2.2-2.5:1 contrast against this app's actual backgrounds, well under
      WCAG AA's 4.5:1 minimum for text this size. Uppercase + tracking + a smaller size carries the
      "this is a label, not a name" distinction on its own, without trading away legibility. */}
      <h2 className="mb-3 text-[13px] font-bold text-heading uppercase tracking-[0.06em]">
        Habits
      </h2>
      <AddHabitForm activeAction={activeAction} setActiveAction={setActiveAction} />
      <HabitList
        habits={habits}
        activeAction={activeAction}
        setActiveAction={setActiveAction}
        completions={completions}
        todaysDate={getTodaysDate(today)}
      />
    </div>
  );
}
