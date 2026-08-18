import { HabitList } from "@/components/HabitList";
import { fetchHabits } from "@/lib/data";

export default async function Home() {
  // Learnt: A client component can't be async, e.g. it can't do an async database fetch.
  // Solution: Have a server component do the async database fetching,
  // then feed that data into a client component. The client component (which may need to be a
  // client component if it needs to use front-end React hooks like useState) can now be sync
  // instead of async. It is suggested to not use useEffect and a fetch, and to instead have the
  // server do server-side rendering. Fetch all of the habits from the database
  const habits = await fetchHabits();

  return (
    <div>
      <HabitList habits={habits} />
    </div>
  );
}
