// Error boundaries must be Client Components as the client must immediately react by swapping out
// a broken component tree for a fallback UI. Also 'retry' uses an onClick event handler which is
// only possible in a client component.
"use client";

import { useEffect } from "react";

export default function ErrorPage({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    // Logs client-side, in the browser console - distinct from fetchHabits' own console.error in
    // src/lib/data.ts, which logs server-side. 'error.digest' (attached by Next.js) is what lets a
    // client-visible occurrence be correlated back to the full server-side log entry.
    console.error(error);
  }, [error]);

  return (
    <div>
      <p>Something went wrong while loading your habits.</p>
      <button onClick={() => retry()}>Try again</button>
    </div>
  );
}
