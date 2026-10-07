-- "19 mentions on this incident" needs a count the page no longer holds.
--
-- It used to be derived by grouping every mention in the workspace in the
-- browser, which only worked because the browser had them all. Now that the
-- feed fetches a page at a time, the count comes from the database -- for the
-- handful of incidents on the current page, not the whole table.
CREATE OR REPLACE FUNCTION public.mention_counts_by_incident(p_ids UUID[])
RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT coalesce(jsonb_object_agg(incident_id, n), '{}'::jsonb)
    FROM (SELECT incident_id, count(*) AS n
            FROM social_mentions
           WHERE incident_id = ANY(p_ids)
           GROUP BY incident_id) t;
$$;

GRANT EXECUTE ON FUNCTION public.mention_counts_by_incident(UUID[]) TO authenticated;
