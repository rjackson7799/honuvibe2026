-- Replace the demo verification path with expiring, attempt-limited OTPs.
BEGIN;
ALTER TABLE public.email_otps ADD COLUMN IF NOT EXISTS consumed_at timestamptz;

CREATE OR REPLACE FUNCTION public.issue_discovery_email_otp(p_lead_id uuid, p_code_hash text)
RETURNS uuid LANGUAGE plpgsql SECURITY INVOKER SET search_path = ''
AS $$
DECLARE v_id uuid; v_recent integer;
BEGIN
  PERFORM 1 FROM public.leads WHERE id = p_lead_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Lead not found'; END IF;
  IF EXISTS (SELECT 1 FROM public.email_otps WHERE lead_id = p_lead_id
      AND created_at > now() - interval '60 seconds') THEN
    RETURN NULL;
  END IF;
  SELECT count(*) INTO v_recent FROM public.email_otps WHERE lead_id = p_lead_id
    AND created_at > now() - interval '1 hour';
  IF v_recent >= 3 THEN RETURN NULL; END IF;
  UPDATE public.email_otps SET consumed_at = now() WHERE lead_id = p_lead_id AND consumed_at IS NULL;
  INSERT INTO public.email_otps(lead_id, code_hash, expires_at)
    VALUES (p_lead_id, p_code_hash, now() + interval '10 minutes') RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.verify_discovery_email_otp(p_lead_id uuid, p_code_hash text)
RETURNS boolean LANGUAGE plpgsql SECURITY INVOKER SET search_path = ''
AS $$
DECLARE v_otp public.email_otps%ROWTYPE;
BEGIN
  PERFORM 1 FROM public.leads WHERE id = p_lead_id FOR UPDATE;
  IF NOT FOUND THEN RETURN false; END IF;
  SELECT * INTO v_otp FROM public.email_otps WHERE lead_id = p_lead_id
    AND consumed_at IS NULL ORDER BY created_at DESC LIMIT 1 FOR UPDATE;
  IF NOT FOUND OR v_otp.expires_at <= now() OR v_otp.attempts >= 5 THEN RETURN false; END IF;
  UPDATE public.email_otps SET attempts = attempts + 1 WHERE id = v_otp.id;
  IF v_otp.code_hash IS DISTINCT FROM p_code_hash THEN RETURN false; END IF;
  UPDATE public.email_otps SET consumed_at = now() WHERE id = v_otp.id;
  UPDATE public.leads SET email_verified = true,
    lifecycle = CASE WHEN lifecycle IN ('new', 'in_progress', 'review') THEN 'verified' ELSE lifecycle END
    WHERE id = p_lead_id;
  RETURN true;
END;
$$;
REVOKE ALL ON FUNCTION public.issue_discovery_email_otp(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.verify_discovery_email_otp(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.issue_discovery_email_otp(uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.verify_discovery_email_otp(uuid, text) TO service_role;
COMMIT;
