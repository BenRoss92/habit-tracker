import { createClient } from "@supabase/supabase-js";

// Factory function returning a fresh Supabase client on every call, for use
// inside Server Components and Server Actions.
//
// This is a deliberately different pattern from client.ts's shared
// singleton. A browser client belongs to one user, so sharing one
// instance is safe. A server, by contrast, handles requests from many
// different users concurrently — the standard safe default is a fresh
// client per request, so no state (most importantly a logged-in user's
// session, if this app were to later add in auth) can ever leak between unrelated
// requests. This app has no login yet, so there's no session to leak
// today, but this is a pattern that's worth already being in the habit of.

// Auth persistence is explicitly disabled below for two reasons: there's
// no session to persist (no login), and Supabase's client normally falls
// back to the browser's localStorage to persist a session — which doesn't
// exist in Node.js (the server runtime), so leaving this on would risk
// warnings or errors for a feature that this app doesn't use.
export function createServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) {
    throw new Error("Missing Supabase environment variables for server-side client");
  }

  return createClient(url, key, {
    // Configures authentication behavior for this client
    auth: {
      // Disables storing auth session information
      persistSession: false,
      // Disables automatic token refreshing
      autoRefreshToken: false,
      // Disables reading auth session info from the URL - used for OAuth
      detectSessionInUrl: false,
    },
  });
}
