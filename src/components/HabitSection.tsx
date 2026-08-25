"use client";

import { ActiveAction, Habit } from "@/lib/types";
import { Dispatch, SetStateAction } from "react";
import { UpdateHabitForm } from "./UpdateHabitForm";
import { HabitItem } from "./HabitItem";

export function HabitSection({
  habit,
  activeAction,
  setActiveAction,
}: {
  habit: Habit;
  activeAction: ActiveAction;
  setActiveAction: Dispatch<SetStateAction<ActiveAction>>;
}) {
  // If we're in type: 'editing' mode and the ID inside of the activeAction object matches the
  // current habit.id, then show the UpdateHabitForm. Otherwise, show the HabitItem.
  return activeAction.type === "editing" && activeAction.habitId === habit.id ? (
    <UpdateHabitForm habit={habit} setActiveAction={setActiveAction} />
  ) : (
    <HabitItem habit={habit} activeAction={activeAction} setActiveAction={setActiveAction} />
  );
}
