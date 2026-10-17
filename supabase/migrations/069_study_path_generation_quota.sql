-- Reserve spending before calling the model. Failed/abandoned attempts retain
-- their reservation: a timeout does not prove that the provider did no work.
BEGIN;
CREATE TABLE public.study_path_generation_usage (
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  usage_date date NOT NULL,
  attempts integer NOT NULL CHECK (attempts BETWEEN 1 AND 3),
  PRIMARY KEY (user_id, usage_date)
);
ALTER TABLE public.study_path_generation_usage ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.study_path_generation_usage FROM anon, authenticated;
GRANT ALL ON public.study_path_generation_usage TO service_role;

-- Preserve today's already-recorded use when deploying the new counter.
INSERT INTO public.study_path_generation_usage(user_id, usage_date, attempts)
SELECT user_id, (generated_at AT TIME ZONE 'UTC')::date, least(count(*)::integer, 3)
FROM public.study_paths
WHERE generated_at >= date_trunc('day', now() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC'
GROUP BY user_id, (generated_at AT TIME ZONE 'UTC')::date;

CREATE FUNCTION public.reserve_study_path_generation(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql SECURITY INVOKER SET search_path = ''
AS $$
DECLARE v_attempts integer;
BEGIN
  INSERT INTO public.study_path_generation_usage(user_id, usage_date, attempts)
    VALUES (p_user_id, (now() AT TIME ZONE 'UTC')::date, 1)
  ON CONFLICT (user_id, usage_date) DO UPDATE
    SET attempts = public.study_path_generation_usage.attempts + 1
    WHERE public.study_path_generation_usage.attempts < 3
  RETURNING attempts INTO v_attempts;
  RETURN v_attempts IS NOT NULL;
END;
$$;
REVOKE ALL ON FUNCTION public.reserve_study_path_generation(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_study_path_generation(uuid) TO service_role;
COMMIT;
