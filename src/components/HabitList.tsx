import { ActiveAction, Completion, Habit } from "@/lib/types";
import { HabitSection } from "./HabitSection";
import { Dispatch, SetStateAction, useEffect } from "react";
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
  // Clears activeAction back to "none" only once the habit actually being deleted is confirmed
  // gone from the fresh habits array - not the instant DeleteHabitForm's request resolves.
  // revalidatePath's data refresh is a separate, later round trip from the delete request
  // resolving, so clearing activeAction immediately (DeleteHabitForm's old behaviour) let
  // HabitSection fall back to rendering a normal HabitItem from still-stale props - a real
  // "deleted habit briefly reappears as undeleted" flash. This has to live here rather than in
  // DeleteHabitForm/HabitSection, since only HabitList has visibility into the full habits array
  // to check whether the habit is actually gone yet. This is a legitimate use of useEffect
  // (rather than a derived value, like the toggle's isPending): activeAction is state owned by
  // HabitsSection, external to this component, so clearing it is a real side effect reacting to
  // a prop change, not something that can be computed during render.
  useEffect(() => {
    if (
      activeAction.type === "deleting" &&
      !habits.some((habit) => habit.id === activeAction.habitId)
    ) {
      setActiveAction({ type: "none" });
    }
  }, [habits, activeAction, setActiveAction]);

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
