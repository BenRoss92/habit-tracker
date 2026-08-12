-- Habits and their daily completions.
-- Make these tables secure-by-default, but allow the anonymous role full access because this app
-- has
-- no user accounts and therefore no different user roles - only the one anon role which needs to
-- have access to all operations and these tables.
-- No auth/accounts — every row is part of
-- one shared dataset, so RLS policies below intentionally allow full access
-- to the anon role rather than scoping by user.
CREATE TABLE habits(
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE completions(
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  habit_id uuid NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
  completed_on date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (habit_id, completed_on)
);

-- Add Row Level Security to the 'habits' table
-- RLS is enabled explicitly (rather than left disabled) as the standard
-- secure-by-default pattern, even though the policies below permit
-- everything — see docs/decisions.md.
ALTER TABLE habits ENABLE ROW LEVEL SECURITY;

ALTER TABLE completions ENABLE ROW LEVEL SECURITY;

-- Create a policy that allows the 'anon' user role to do all operations (reading, writing
-- and updating) on the 'habits' table
-- Policy name - doesn't do anything, is just a human readable label. So others can understand what
-- the policy does. Can also be used as to reference an existing policy for changing/deleting it
-- 'on habits' - on the habits table
-- 'for all' - apply this policy to all 4 operations (read, insert, update, delete).
-- 'to anon' - to the 'anon' user role
-- 'using (true)' - always access access to data currently in the database. Controls access to rows
-- that already exist (deals with the past). Decides whether a user is allowed to read, modify or
-- delete data. '(true)' - tells PostgreSQL to skip the security check for this step; always
-- return true and always allow the operation.
-- 'with check (true)' - always accept new or modified data. Tells PostgreSQL there should be no security
-- rules for incoming data - please blindly save whatever data the user submits without checking its
-- content first.
CREATE POLICY "Allow all access to habits" ON habits
  FOR ALL TO anon
  USING (TRUE)
  WITH CHECK (TRUE);

CREATE POLICY "Allow all access to completions" ON completions
  FOR ALL TO anon
  USING (TRUE)
  WITH CHECK (TRUE);

-- I have explicitly enabled Row-Level Security Table-Level Grants in the production Supabase
-- settings, for granular level security.
-- Row-Level Security specifies whether my 'anon' user can see and interact with certain
-- rows in a table. But it can't allow/disallow the user from interacting with an entire table - this is what Table-Level Grants do. And because of the settings I've applied in Supabase, this is why I also need to give
-- a Table-Level Grant to the user.
-- Table-Level Grant - e.g. the anon role is allowed to run SELECT commands on the habits table.
-- Protects whether or not a user can use a whole table.
-- Row-Level Security - The user will by default get zero rows back from their query. You need to
-- explicitly allow all rows for one or more operations to be returned for that user. Protects
-- whether or not a user can use certain rows.
-- "Automatically expose new tables" is disabled at the project level (see
-- docs/decisions.md), so table-level grants to anon must be explicit here —
-- RLS policies alone don't grant the underlying SQL privileges.
GRANT SELECT, INSERT, UPDATE, DELETE ON habits TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON completions TO anon;
