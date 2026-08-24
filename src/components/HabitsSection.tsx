"use client";

import { Habit } from "@/lib/types";
import { HabitList } from "./HabitList";
import { AddHabitButton } from "./AddHabitButton";
import { useState } from "react";
import { AddHabitForm } from "./AddHabitForm";

export function HabitsSection({ habits }: { habits: Habit[] }) {
  const [isEditing, setIsEditing] = useState(false);

  function toggleEditing(): void {
    setIsEditing((prevState) => !prevState);
  }

  return (
    <div>
      <div className="flex justify-end">
        <AddHabitButton toggleEditing={toggleEditing} isEditing={isEditing} />
      </div>
      <h2 className="mb-3 text-[18px] text-heading font-bold">Habits</h2>
      <AddHabitForm setIsEditing={setIsEditing} isEditing={isEditing} />
      <HabitList habits={habits} />
    </div>
  );
}
