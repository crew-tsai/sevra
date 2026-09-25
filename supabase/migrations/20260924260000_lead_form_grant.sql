-- The public demo form could never have worked.
--
-- `leads` carries an "Anyone can submit a lead" INSERT policy for anon, and
-- anon was never granted INSERT on the table. RLS and table privileges are two
-- separate gates and both must open: Postgres refuses first, so the policy was
-- never even consulted. Every visitor who filled in "Talk to our crisis team"
-- on the marketing site got the failure toast, and `leads` has nil rows, which
-- is exactly what that looks like from the inside.
--
-- Found because Supabase announced they are ending automatic Data API grants
-- on new tables, which sent us looking at grants for the first time.
--
-- Postgres itself suggests the fix in its error hint, which is a fair sign of
-- how ordinary this mistake is:
--   HINT: Grant the required privileges to the current role with:
--         GRANT INSERT ON public.leads TO anon;

GRANT INSERT ON public.leads TO anon;

/**
 * Tables whose policies promise something the grants refuse.
 *
 * RLS is the gate people write and review; table privileges are the gate they
 * forget, and a mismatch fails closed and silently — the feature simply never
 * works, with no error anywhere but the visitor's screen. This names them.
 *
 * Reported by the heartbeat so it is caught on every client rather than on
 * whichever one somebody happened to look at.
 */
CREATE OR REPLACE FUNCTION public.policy_grant_mismatches()
RETURNS TABLE (table_name TEXT, role_name TEXT, action TEXT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH promised AS (
    SELECT
      p.tablename::TEXT AS tbl,
      r.rolname::TEXT   AS who,
      -- ALL in a policy means every write verb, so it is expanded rather than
      -- checked as a privilege that does not exist.
      unnest(CASE p.cmd
               WHEN 'ALL' THEN ARRAY['INSERT', 'UPDATE', 'DELETE']
               ELSE ARRAY[p.cmd]
             END) AS act
    FROM pg_policies p
    CROSS JOIN LATERAL unnest(p.roles) AS pr(rolename)
    JOIN pg_roles r ON r.rolname = pr.rolename
    WHERE p.schemaname = 'public'
      AND p.cmd IN ('INSERT', 'UPDATE', 'DELETE', 'ALL')
      -- service_role bypasses RLS entirely and holds blanket grants, so a
      -- policy naming it says nothing about whether anything works.
      AND r.rolname IN ('anon', 'authenticated')
  )
  SELECT tbl, who, act
  FROM promised
  WHERE NOT has_table_privilege(who, ('public.' || quote_ident(tbl))::regclass, act)
  ORDER BY tbl, who, act;
$$;

GRANT EXECUTE ON FUNCTION public.policy_grant_mismatches() TO service_role;
