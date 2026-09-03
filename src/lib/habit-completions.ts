import { Completion, Habit } from "./types";

// A streak stays "alive" through yesterday even if today hasn't been ticked off yet, but if
// neither today nor yesterday has a completion, there's no active streak left to count - any
// older completions belong to a streak that's already broken.
function checkIfStreakBroken(completions: Completion[], todaysDate: string): boolean {
  const yesterdaysDate = getTodaysDateMinusN(todaysDate, 1);

  const doneToday = completions.some((completion) => completion.completed_on === todaysDate);
  const doneYesterday = completions.some(
    (completion) => completion.completed_on === yesterdaysDate,
  );

  if (!doneToday && !doneYesterday) {
    return true;
  }

  return false;
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

function getConsecutiveDaysCount(completions: Completion[]): number {
  // Dedupe to one entry per distinct calendar day before anything else. This function is shared
  // between two callers: getHabitsWithStats (below), which always pre-filters to one habit's own
  // completions - at most one per day, so this dedupe is a no-op there - and Stats.tsx's app-wide
  // "daily streak", which passes the *entire* unfiltered completions list across every habit. In
  // that second case, two different habits completed on the same day produce two entries with the
  // identical date, which - without deduping - broke the loop below: it compares each entry
  // against the very next one expecting it to be exactly one calendar day earlier, and a same-day
  // duplicate isn't, so the streak was cut short right there. Confirmed directly: two habits both
  // completed on the same 3 consecutive days returned a streak of 1 instead of 3 before this fix.
  const uniqueCompletionDates = Array.from(
    new Set(completions.map((completion) => completion.completed_on)),
  );

  // Create a new array where we convert each completed_on string into a date with midnight set as
  // the time
  const completionDateObjects = uniqueCompletionDates.map((dateString) => {
    const [year, month, day] = dateString.split("-").map((string) => Number(string));
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
  let consecutiveDaysCount = 1;

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
      consecutiveDaysCount++;
    } else {
      // Completion gap between days
      break;
    }
  }

  return consecutiveDaysCount;
}

export function getStreakCount(completions: Completion[], todaysDate: string): number {
  if (completions.length === 0) {
    return 0;
  }

  // Short-circuit going through all of the completions if there haven't been completions today or
  // yesterday - if not, no point in going through the earlier completions to get a count.
  const isStreakBroken = checkIfStreakBroken(completions, todaysDate);
  if (isStreakBroken) {
    return 0;
  }

  return getConsecutiveDaysCount(completions);
}

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

function wasHabitDoneToday(completions: Completion[], habit: Habit, todaysDate: string) {
  return completions.some((completion) => {
    return habit.id === completion.habit_id && completion.completed_on === todaysDate;
  });
}

function getStreakCountForHabit(
  completions: Completion[],
  habit: Habit,
  todaysDate: string,
): number {
  // Get all of the completions for one habit
  const completionsForHabit = completions.filter((completion) => completion.habit_id === habit.id);

  return getStreakCount(completionsForHabit, todaysDate);
}

export function getHabitsWithStats(
  habits: Habit[],
  completions: Completion[],
  todaysDate: string,
): HabitWithStats[] {
  return habits.map((habit) => {
    return {
      habit,
      wasDoneToday: wasHabitDoneToday(completions, habit, todaysDate),
      streakCount: getStreakCountForHabit(completions, habit, todaysDate),
    };
  });
}

export type BestStreakStatType =
  | { state: "none" }
  | { state: "single"; bestStreakCount: number; habitName: string }
  | { state: "tied"; bestStreakCount: number; tiedHabitCount: number };

export function getBestStreakStat(
  habits: Habit[],
  completions: Completion[],
  todaysDate: string,
): BestStreakStatType {
  if (habits.length === 0 || completions.length === 0) {
    return { state: "none" };
  }

  const habitsWithStats = getHabitsWithStats(habits, completions, todaysDate);

  // Get the highest value in the array
  const maxStreak = Math.max(...habitsWithStats.map((habit) => habit.streakCount));

  // completions.length > 0 above only guarantees something was completed at some point - it
  // doesn't guarantee any habit's streak is still alive today. If every habit's streak has since
  // lapsed, maxStreak is 0 here even though real completion history exists, and falling through to
  // "single"/"tied" below would show a bare "0" and an arbitrary habit's name rather than the same
  // "nothing to show yet" treatment a brand new user with no history at all gets - which reads as a
  // bug, not a considered state. Route it to "none" too, so both cases share one message.
  if (maxStreak === 0) {
    return { state: "none" };
  }

  // Count how many of this highest value exist in the array
  const winningHabits = habitsWithStats.filter((habit) => habit.streakCount === maxStreak);
  const winningHabit = winningHabits[0];

  if (winningHabit && winningHabits.length === 1) {
    return {
      state: "single",
      bestStreakCount: maxStreak,
      habitName: winningHabit.habit.name,
    };
  }

  return {
    state: "tied",
    bestStreakCount: maxStreak,
    tiedHabitCount: winningHabits.length,
  };
}

export function getCompletedTodayCount(completions: Completion[], todaysDate: string): number {
  // In all of the completions for all habits
  // Filter and count all of the completions where the completion.completed_on === todaysDate
  return completions.filter((completion) => completion.completed_on === todaysDate).length;
}
