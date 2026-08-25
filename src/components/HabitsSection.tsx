"use client";

import { ActiveAction, Habit } from "@/lib/types";
import { HabitList } from "./HabitList";
import { AddHabitButton } from "./AddHabitButton";
import { useState } from "react";
import { AddHabitForm } from "./AddHabitForm";

export function HabitsSection({ habits }: { habits: Habit[] }) {
  const [activeAction, setActiveAction] = useState<ActiveAction>({ type: "none" });

  return (
    <div>
      <div className="flex justify-end">
        <AddHabitButton setActiveAction={setActiveAction} activeAction={activeAction} />
      </div>
      <h2 className="mb-3 text-[18px] text-heading font-bold">Habits</h2>
      <AddHabitForm activeAction={activeAction} setActiveAction={setActiveAction} />
      <HabitList habits={habits} activeAction={activeAction} setActiveAction={setActiveAction} />
    </div>
  );
}
