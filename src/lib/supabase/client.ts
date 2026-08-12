import { createClient } from "@supabase/supabase-js";

// Shared browser client, created once and reused everywhere in the app.
//
// A single shared instance is the normal pattern for browser-side Supabase
// clients: the browser only ever belongs to one user at a time, so there's
// no risk of one request's state leaking into another the way there is on
// a server handling many concurrent users (see server.ts for that case).
// It's also cheaper to create the client once than on every render.
//
// Runtime (not just compile-time) check: TypeScript can't verify these env
// vars are actually set at runtime, only that they're typed as
// `string | undefined`. Checking here — instead of a non-null assertion
// (`url!`) — turns a missing env var into a clear error message instead of
// a confusing failure inside createClient().
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!url || !key) {
  throw new Error("Missing Supabase environment variables");
}

export const supabase = createClient(url, key);
