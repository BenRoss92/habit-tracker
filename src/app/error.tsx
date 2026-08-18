// Error boundaries must be Client Components as the client must immediately react by swapping out
// a broken component tree for a fallback UI. Also 'retry' uses an onClick event handler which is
// only possible in a client component.
"use client";

export default function ErrorPage({
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <div>
      <p>Something went wrong while loading your habits.</p>
      <button onClick={() => retry()}>Try again</button>
    </div>
  );
}
