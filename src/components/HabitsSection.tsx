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
      <div className="flex justify-between items-center mb-6">
        <p className="text-[22px] font-bold text-heading">{getTodaysDateHeading(today)}</p>
        <AddHabitButton setActiveAction={setActiveAction} activeAction={activeAction} />
      </div>
      <h2 className="mb-3 text-[18px] text-heading font-bold">Habits</h2>
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
