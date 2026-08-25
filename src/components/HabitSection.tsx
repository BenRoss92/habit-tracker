"use client";

import { Habit } from "@/lib/types";
import { useState } from "react";
import { UpdateHabitForm } from "./UpdateHabitForm";
import { HabitItem } from "./HabitItem";

export function HabitSection({ habit }: { habit: Habit }) {
  const [isUpdating, setIsUpdating] = useState(false);

  return isUpdating ? (
    <UpdateHabitForm habit={habit} setIsUpdating={setIsUpdating} />
  ) : (
    <HabitItem habit={habit} setIsUpdating={setIsUpdating} />
  );
}
