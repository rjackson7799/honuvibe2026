-- Private means unlisted, not invitation-only. Pricing and capacity checks stay mandatory.
-- 1v1 engagements are also private, but staff assign their single seat, so
-- they are never self-enrollable even if both prices are zero.
BEGIN;
CREATE OR REPLACE FUNCTION public.enroll_in_free_course(p_course_id uuid, p_locale text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_course public.courses%ROWTYPE;
  v_enrollment public.enrollments%ROWTYPE;
  v_count integer;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO v_course FROM public.courses WHERE id = p_course_id FOR UPDATE;
  IF NOT FOUND OR NOT coalesce(v_course.is_published, false)
     OR v_course.status IN ('in-progress', 'completed', 'archived')
     OR v_course.course_type = '1v1' THEN
    RAISE EXCEPTION 'Course is not available for enrollment';
  END IF;
  IF coalesce(v_course.price_usd, 0) <> 0 OR coalesce(v_course.price_jpy, 0) <> 0
     OR (v_course.price_usd IS NULL AND v_course.price_jpy IS NULL) THEN
    RAISE EXCEPTION 'This course requires checkout';
  END IF;
  SELECT * INTO v_enrollment FROM public.enrollments
    WHERE user_id = v_user_id AND course_id = p_course_id;
  IF FOUND THEN
    IF v_enrollment.status IN ('active', 'completed') THEN
      RETURN jsonb_build_object('success', true, 'alreadyEnrolled', true, 'courseSlug', v_course.slug);
    END IF;
    RAISE EXCEPTION 'Please contact support to restore this enrollment';
  END IF;
  SELECT count(*) INTO v_count FROM public.enrollments
    WHERE course_id = p_course_id AND status IN ('active', 'completed');
  IF v_course.max_enrollment IS NOT NULL AND v_count >= v_course.max_enrollment THEN
    RAISE EXCEPTION 'Course is full';
  END IF;
  INSERT INTO public.enrollments(user_id, course_id, amount_paid, currency, status, partner_id)
    VALUES (v_user_id, p_course_id, 0, CASE WHEN p_locale = 'ja' THEN 'jpy' ELSE 'usd' END,
      'active', v_course.partner_id);
  UPDATE public.courses SET current_enrollment = v_count + 1 WHERE id = p_course_id;
  RETURN jsonb_build_object('success', true, 'alreadyEnrolled', false, 'courseSlug', v_course.slug);
END;
$$;
REVOKE ALL ON FUNCTION public.enroll_in_free_course(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.enroll_in_free_course(uuid, text) TO authenticated;

COMMIT;
