// currentDate defaults to `new Date()` (evaluated fresh per call, so this still works correctly
// under jest's fake timers), because this function genuinely has two real call patterns:
//
// - Called WITH an explicit Date: HabitsSection reads `today` once per render and passes it here,
//   then threads the result down to HabitList as its `todaysDate` prop (for wasDoneToday/streak
//   calculations) - so every render-time consumer of "today" agrees with each other, rather than
//   each site independently calling `new Date()` and risking two different values if a render
//   happened to straddle midnight.
// - Called with NO argument: HabitItem's toggle handler calls getTodaysDate() fresh at click time,
//   deliberately getting the real-world date at the moment the user clicks rather than whatever
//   was true when the component last rendered - a completion should be recorded against the
//   actual day it happened, even if the page had been open since before midnight.
//
// A single shared "now" computed once and reused everywhere (a Context, a module-level singleton)
// would get the first case right but silently break the second - see docs/decisions.md's "'today'
// is read fresh at some call sites and threaded as a shared value at others" entry.
export function getTodaysDate(currentDate: Date = new Date()): string {
  const year = currentDate.getFullYear().toString();
  // Add a leading '0' at the beginning of any month or day numbers that are less than 2 digits
  // long. E.g. '2' as a month or day value should become '02'.
  // Add +1 to the current month number, as the first month given by this method starts at 0, not
  // 1.
  const month = (currentDate.getMonth() + 1).toString().padStart(2, "0");
  const day = currentDate.getDate().toString().padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// Unlike getTodaysDate above, currentDate here is required, not optional - HabitsSection is the
// only real caller, and it always has a `today` on hand to pass in already (computed once, for
// getTodaysDate above). There's no second call site anywhere that needs a fresh real-time default,
// so a default here would just be dead code inviting an accidental no-argument call later.
export function getTodaysDateHeading(currentDate: Date): string {
  // Use en-US instead of en-GB as I want to keep all of the shortened month names at 3 letters
  // each, e.g. 'Jul' and 'Sep' instead of 'Jul' and 'Sept'.
  const dayName = currentDate.toLocaleDateString("en-US", { weekday: "long" });

  const dayDate = currentDate.getDate();

  const monthName = currentDate.toLocaleDateString("en-US", { month: "short" });

  return `${dayName}, ${dayDate} ${monthName}`;
}
