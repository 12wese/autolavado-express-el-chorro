CREATE INDEX wash_jobs_business_plate_created_idx
    ON public.wash_jobs (
        business_id,
        (upper(regexp_replace(coalesce(license_plate, ''), '[[:space:]-]', '', 'g'))),
        created_at DESC
    );

CREATE OR REPLACE FUNCTION public.find_recent_wash_jobs_by_plate(
    p_business_id uuid,
    p_plate text
)
RETURNS TABLE (
    id uuid,
    license_plate text,
    car_type text,
    wash_type text,
    status public.wash_status,
    created_at timestamptz,
    price numeric
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = pg_catalog, public
AS $$
    SELECT
        job.id,
        job.license_plate,
        job.car_type,
        job.wash_type,
        job.status,
        job.created_at,
        job.price
    FROM public.wash_jobs AS job
    WHERE job.business_id = p_business_id
      AND p_plate IS NOT NULL
      AND btrim(p_plate) <> ''
      AND upper(regexp_replace(coalesce(job.license_plate, ''), '[[:space:]-]', '', 'g'))
          = upper(regexp_replace(btrim(p_plate), '[[:space:]-]', '', 'g'))
    ORDER BY job.created_at DESC
    LIMIT 10;
$$;

REVOKE ALL ON FUNCTION public.find_recent_wash_jobs_by_plate(uuid, text)
    FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.find_recent_wash_jobs_by_plate(uuid, text)
    TO authenticated;
