import { ActiveAction, Habit } from "@/lib/types";
import { HabitSection } from "./HabitSection";
import { Dispatch, SetStateAction } from "react";

export function HabitList({
  habits,
  activeAction,
  setActiveAction,
}: {
  habits: Habit[];
  activeAction: ActiveAction;
  setActiveAction: Dispatch<SetStateAction<ActiveAction>>;
}) {
  return (
    <section>
      {
        // Habits array will be an empty array if there are no rows in the database table, so need
        // to check the length to see if it's empty or populated
        habits.length === 0 ? (
          <p className="text-center text-muted my-8">No habits added</p>
        ) : (
          <ul className="space-y-2.5">
            {habits.map((habit) => (
              <HabitSection
                key={habit.id}
                habit={habit}
                activeAction={activeAction}
                setActiveAction={setActiveAction}
              />
            ))}
          </ul>
        )
      }
    </section>
  );
}
