CREATE TABLE public.wash_job_addons (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    wash_job_id uuid NOT NULL REFERENCES public.wash_jobs(id) ON DELETE CASCADE,
    addon_id uuid REFERENCES public.addons(id) ON DELETE SET NULL,
    addon_name_snapshot text NOT NULL,
    price_snapshot numeric(10, 2) NOT NULL CHECK (price_snapshot >= 0),
    CONSTRAINT wash_job_addons_job_addon_unique UNIQUE (wash_job_id, addon_id)
);

CREATE INDEX wash_job_addons_addon_id_idx
    ON public.wash_job_addons (addon_id);

ALTER TABLE public.wash_job_addons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view addons for their own wash jobs"
    ON public.wash_job_addons
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1
            FROM public.wash_jobs AS job
            WHERE job.id = wash_job_addons.wash_job_id
              AND job.user_id = auth.uid()
        )
    );

REVOKE ALL ON public.wash_job_addons FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.wash_job_addons TO authenticated;

REVOKE INSERT ON public.wash_jobs FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.create_wash_job_with_addons(
    p_user_id uuid,
    p_car_type text,
    p_wash_type text,
    p_washer_name text,
    p_license_plate text,
    p_base_price numeric,
    p_addon_ids uuid[] DEFAULT ARRAY[]::uuid[]
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_wash_job_id uuid;
    v_addon_ids uuid[] := COALESCE(p_addon_ids, ARRAY[]::uuid[]);
    v_addon_count integer;
    v_addon_total numeric;
BEGIN
    IF auth.uid() IS NULL OR auth.uid() <> p_user_id THEN
        RAISE EXCEPTION 'Cannot create a wash job for another user'
            USING ERRCODE = '42501';
    END IF;

    IF p_base_price IS NULL OR p_base_price < 0 THEN
        RAISE EXCEPTION 'Base price must be greater than or equal to zero'
            USING ERRCODE = '23514';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM unnest(v_addon_ids) AS requested(addon_id)
        WHERE requested.addon_id IS NULL
    ) OR cardinality(v_addon_ids) <> (
        SELECT count(DISTINCT requested.addon_id)
        FROM unnest(v_addon_ids) AS requested(addon_id)
    ) THEN
        RAISE EXCEPTION 'Addon IDs must be non-null and unique'
            USING ERRCODE = '23514';
    END IF;

    PERFORM addon.id
    FROM public.addons AS addon
    WHERE addon.user_id = p_user_id
      AND addon.id = ANY(v_addon_ids)
    FOR SHARE;

    SELECT count(*)::integer, COALESCE(sum(addon.price), 0)
    INTO v_addon_count, v_addon_total
    FROM public.addons AS addon
    WHERE addon.user_id = p_user_id
      AND addon.id = ANY(v_addon_ids);

    IF v_addon_count <> cardinality(v_addon_ids) THEN
        RAISE EXCEPTION 'One or more addons do not exist or do not belong to this user'
            USING ERRCODE = '23503';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM public.addons AS addon
        WHERE addon.user_id = p_user_id
          AND addon.id = ANY(v_addon_ids)
          AND addon.price < 0
    ) THEN
        RAISE EXCEPTION 'Addon prices must be greater than or equal to zero'
            USING ERRCODE = '23514';
    END IF;

    INSERT INTO public.wash_jobs (
        user_id, car_type, wash_type, washer_name, license_plate, price
    )
    VALUES (
        p_user_id,
        p_car_type,
        p_wash_type,
        p_washer_name,
        p_license_plate,
        round(p_base_price, 2) + v_addon_total
    )
    RETURNING id INTO v_wash_job_id;

    INSERT INTO public.wash_job_addons (
        wash_job_id, addon_id, addon_name_snapshot, price_snapshot
    )
    SELECT v_wash_job_id, addon.id, addon.name, addon.price
    FROM public.addons AS addon
    WHERE addon.user_id = p_user_id
      AND addon.id = ANY(v_addon_ids);

    RETURN v_wash_job_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_wash_job_with_addons(
    uuid, text, text, text, text, numeric, uuid[]
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_wash_job_with_addons(
    uuid, text, text, text, text, numeric, uuid[]
) TO authenticated;
