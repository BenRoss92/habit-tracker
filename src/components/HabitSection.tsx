"use client";

import { ActiveAction, Habit } from "@/lib/types";
import { Dispatch, SetStateAction } from "react";
import { UpdateHabitForm } from "./UpdateHabitForm";
import { HabitItem } from "./HabitItem";
import { DeleteHabitForm } from "./DeleteHabitForm";

export function HabitSection({
  habit,
  activeAction,
  setActiveAction,
  wasDoneToday,
}: {
  habit: Habit;
  activeAction: ActiveAction;
  setActiveAction: Dispatch<SetStateAction<ActiveAction>>;
  wasDoneToday: boolean;
}) {
  if (activeAction.type === "deleting" && activeAction.habitId === habit.id) {
    return <DeleteHabitForm habit={habit} setActiveAction={setActiveAction} />;
  }

  if (activeAction.type === "editing" && activeAction.habitId === habit.id) {
    return <UpdateHabitForm habit={habit} setActiveAction={setActiveAction} />;
  }

  return (
    <HabitItem
      habit={habit}
      activeAction={activeAction}
      setActiveAction={setActiveAction}
      wasDoneToday={wasDoneToday}
    />
  );
}
