import { ActiveAction, Completion, Habit } from "@/lib/types";
import { HabitSection } from "./HabitSection";
import { Dispatch, SetStateAction, useEffect } from "react";
import { getTodaysDate } from "@/lib/dates";

// A wrapper, not a merge (Habit & {...}) - wasDoneToday/streakCount are derived, computed-per-
// render presentation values, not persisted columns, unlike Habit itself (a direct mirror of the
// habits table row - see lib/types.ts). Keeping them as sibling fields here, rather than spread
// into the habit object, means each value lives in exactly one place once this gets destructured
// and passed down as separate props, rather than being readable both via habit.wasDoneToday and a
// second, redundant wasDoneToday prop carrying the same value.
type HabitWithStats = {
  habit: Habit;
  wasDoneToday: boolean;
  streakCount: number;
};

function getStreakCount(completionsForHabit: Completion[]): number {
  // Create a new array where we convert each completed_on string into a date with midnight set as
  // the time
  const completionDateObjects = completionsForHabit.map((completion) => {
    const [year, month, day] = completion.completed_on.split("-").map((string) => Number(string));
    if (!year || !month || !day) {
      throw new Error("completed_on saved in the wrong format");
    }

    // Converted to a date with midnight time set (start of the day)
    return new Date(year, month - 1, day);
  });

  // Sort this array in descending order
  completionDateObjects.sort((a, b) => b.getTime() - a.getTime());

  // The most recent completion (index 0) is guaranteed to be today or yesterday by the check
  // above, so it always counts as the first day of the streak.
  let streakCount = 1;

  // Walk through the rest of the sorted array, checking whether each entry is exactly one
  // calendar day before the previous one - the first gap ends the streak.
  for (let index = 0; index < completionDateObjects.length - 1; index++) {
    const completedDay = completionDateObjects[index]!;
    const previousCompletedDay = completionDateObjects[index + 1];

    // What we'd expect the next (older) entry to be if there's no gap - one day before
    // completedDay. Built from a fresh Date rather than mutating completedDay/previousCompletedDay
    // in place, since completedDay is read again as the previous iteration's previousCompletedDay,
    // and mutating either would corrupt a comparison a later iteration still needs.
    const expectedPreviousDay = new Date(completedDay);
    expectedPreviousDay.setDate(completedDay.getDate() - 1);

    if (previousCompletedDay?.getTime() === expectedPreviousDay.getTime()) {
      streakCount++;
    } else {
      // Completion gap between days
      break;
    }
  }

  return streakCount;
}

// A streak stays "alive" through yesterday even if today hasn't been ticked off yet, but if
// neither today nor yesterday has a completion, there's no active streak left to count - any
// older completions belong to a streak that's already broken.
function checkIfStreakBroken(completionsForHabit: Completion[], todaysDate: string): boolean {
  const yesterdaysDate = getTodaysDateMinusN(todaysDate, 1);

  const doneToday = completionsForHabit.some(
    (completion) => completion.completed_on === todaysDate,
  );
  const doneYesterday = completionsForHabit.some(
    (completion) => completion.completed_on === yesterdaysDate,
  );

  if (!doneToday && !doneYesterday) {
    return true;
  }

  return false;
}

function getWasDoneToday(completions: Completion[], habit: Habit, todaysDate: string) {
  return completions.some((completion) => {
    return habit.id === completion.habit_id && completion.completed_on === todaysDate;
  });
}

function getTodaysDateMinusN(todaysDate: string, n: number): string {
  // Convert todays date string into an actual local time date at midnight
  const [year, month, day] = todaysDate.split("-").map((string) => Number(string));

  if (!year || !month || !day) {
    throw new Error("completed_on saved in the wrong format");
  }

  // new Date(year, month - 1, day) already sets the time to local midnight, so there's no need
  // for a separate setHours(0, 0, 0, 0) call afterwards.
  const completionDate = new Date(year, month - 1, day);
  completionDate.setDate(completionDate.getDate() - n);

  // Add a leading '0' to any month/day number less than 2 digits long, and add +1 to the month
  // number, since getMonth() returns a 0-indexed month - matching getTodaysDate() in lib/dates.ts.
  const resultYear = completionDate.getFullYear().toString();
  const resultMonth = (completionDate.getMonth() + 1).toString().padStart(2, "0");
  const resultDay = completionDate.getDate().toString().padStart(2, "0");

  return `${resultYear}-${resultMonth}-${resultDay}`;
}

function getStreakCountForHabit(
  completions: Completion[],
  habit: Habit,
  todaysDate: string,
): number {
  // Get all of the completions for one habit
  const completionsForHabit = completions.filter((completion) => completion.habit_id === habit.id);

  // Check whether the array is empty - if yes, stop the logic.
  if (completionsForHabit.length === 0) {
    return 0;
  }

  const isStreakBroken = checkIfStreakBroken(completionsForHabit, todaysDate);
  if (isStreakBroken) {
    return 0;
  }

  const streakCount = getStreakCount(completionsForHabit);
  return streakCount;
}

function getHabitsWithStats(habits: Habit[], completions: Completion[]): HabitWithStats[] {
  const todaysDate = getTodaysDate();

  return habits.map((habit) => {
    return {
      habit,
      wasDoneToday: getWasDoneToday(completions, habit, todaysDate),
      streakCount: getStreakCountForHabit(completions, habit, todaysDate),
    };
  });
}

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

  // Return an array with the habits with completions and streaks in one array
  const habitsWithStats = getHabitsWithStats(habits, completions);

  return (
    <section>
      {
        // Habits array will be an empty array if there are no rows in the database table, so need
        // to check the length to see if it's empty or populated
        habitsWithStats.length === 0 ? (
          <p className="text-center text-muted my-8">No habits added</p>
        ) : (
          <ul className="space-y-2.5">
            {habitsWithStats.map(({ habit, wasDoneToday, streakCount }) => {
              return (
                <HabitSection
                  key={habit.id}
                  habit={habit}
                  activeAction={activeAction}
                  setActiveAction={setActiveAction}
                  wasDoneToday={wasDoneToday}
                  streakCount={streakCount}
                />
              );
            })}
          </ul>
        )
      }
    </section>
  );
}
