import { ActiveAction, Completion, Habit } from "@/lib/types";
import { HabitSection } from "./HabitSection";
import { Dispatch, SetStateAction } from "react";
import { getTodaysDate } from "@/lib/dates";

type HabitWithCompletion = Habit & {
  wasDoneToday: boolean;
};

export function HabitList({
  habits,
  activeAction,
  setActiveAction,
  completions,
}: {
  habits: Habit[];
  activeAction: ActiveAction;
  setActiveAction: Dispatch<SetStateAction<ActiveAction>>;
  completions: Completion[];
}) {
  function getHabitsWithCompletions(): HabitWithCompletion[] {
    const todaysDate = getTodaysDate();

    return habits.map((habit) => {
      return {
        ...habit,
        wasDoneToday: completions.some((completion) => {
          return habit.id === completion.habit_id && completion.completed_on === todaysDate;
        }),
      };
    });
  }

  const habitsWithCompletions = getHabitsWithCompletions();

  return (
    <section>
      {
        // Habits array will be an empty array if there are no rows in the database table, so need
        // to check the length to see if it's empty or populated
        habitsWithCompletions.length === 0 ? (
          <p className="text-center text-muted my-8">No habits added</p>
        ) : (
          <ul className="space-y-2.5">
            {habitsWithCompletions.map((habit) => {
              return (
                <HabitSection
                  key={habit.id}
                  habit={habit}
                  activeAction={activeAction}
                  setActiveAction={setActiveAction}
                  wasDoneToday={habit.wasDoneToday}
                />
              );
            })}
          </ul>
        )
      }
    </section>
  );
}
