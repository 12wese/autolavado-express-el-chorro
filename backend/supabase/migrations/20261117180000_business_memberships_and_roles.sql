CREATE TABLE public.profiles (
    id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    display_name text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.businesses (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    created_by_user_id uuid NOT NULL REFERENCES auth.users(id),
    legacy_owner_user_id uuid UNIQUE REFERENCES auth.users(id),
    status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.business_memberships (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    invited_email text,
    role text NOT NULL CHECK (role IN ('admin', 'washer')),
    status text NOT NULL DEFAULT 'active' CHECK (status IN ('invited', 'active', 'suspended')),
    invited_by_user_id uuid REFERENCES auth.users(id),
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT business_memberships_id_business_unique UNIQUE (id, business_id),
    CONSTRAINT business_memberships_identity_check CHECK (
        user_id IS NOT NULL OR (status = 'invited' AND invited_email IS NOT NULL)
    )
);

CREATE OR REPLACE FUNCTION public.handle_new_auth_user_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
    INSERT INTO public.profiles (id, display_name)
    VALUES (
        NEW.id,
        COALESCE(
            NULLIF(NEW.raw_user_meta_data ->> 'display_name', ''),
            NULLIF(NEW.raw_user_meta_data ->> 'full_name', ''),
            NULLIF(NEW.raw_user_meta_data ->> 'name', '')
        )
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created_profile
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user_profile();

CREATE UNIQUE INDEX business_memberships_business_user_unique
    ON public.business_memberships (business_id, user_id)
    WHERE user_id IS NOT NULL;

CREATE UNIQUE INDEX business_memberships_business_invited_email_unique
    ON public.business_memberships (business_id, lower(btrim(invited_email)))
    WHERE status = 'invited' AND user_id IS NULL AND invited_email IS NOT NULL;

ALTER TABLE public.wash_jobs
    ADD COLUMN business_id uuid REFERENCES public.businesses(id),
    ADD COLUMN washer_id uuid,
    ADD COLUMN created_by_user_id uuid REFERENCES auth.users(id);

ALTER TABLE public.washers
    ADD COLUMN business_id uuid REFERENCES public.businesses(id),
    ADD COLUMN membership_id uuid,
    ADD COLUMN active boolean NOT NULL DEFAULT true,
    ADD COLUMN created_by_user_id uuid REFERENCES auth.users(id);

ALTER TABLE public.service_prices
    ADD COLUMN business_id uuid REFERENCES public.businesses(id),
    ADD COLUMN created_by_user_id uuid REFERENCES auth.users(id);

ALTER TABLE public.addons
    ADD COLUMN business_id uuid REFERENCES public.businesses(id),
    ADD COLUMN created_by_user_id uuid REFERENCES auth.users(id);

ALTER TABLE public.wash_job_status_history
    ADD COLUMN actor_user_id uuid REFERENCES auth.users(id);

INSERT INTO public.profiles (id, display_name)
SELECT
    users.id,
    COALESCE(
        NULLIF(users.raw_user_meta_data ->> 'display_name', ''),
        NULLIF(users.raw_user_meta_data ->> 'full_name', ''),
        NULLIF(users.raw_user_meta_data ->> 'name', '')
    )
FROM auth.users AS users
ON CONFLICT (id) DO NOTHING;

WITH legacy_owners AS (
    SELECT user_id FROM public.wash_jobs
    UNION
    SELECT user_id FROM public.washers
    UNION
    SELECT user_id FROM public.service_prices
    UNION
    SELECT user_id FROM public.addons
)
INSERT INTO public.businesses (name, created_by_user_id, legacy_owner_user_id)
SELECT
    COALESCE(
        NULLIF(users.raw_user_meta_data ->> 'business_name', ''),
        NULLIF(users.raw_user_meta_data ->> 'display_name', ''),
        NULLIF(users.raw_user_meta_data ->> 'full_name', ''),
        'Autolavado'
    ),
    users.id,
    users.id
FROM legacy_owners
JOIN auth.users AS users ON users.id = legacy_owners.user_id
ON CONFLICT (legacy_owner_user_id) DO NOTHING;

INSERT INTO public.business_memberships (business_id, user_id, role, status)
SELECT business.id, business.legacy_owner_user_id, 'admin', 'active'
FROM public.businesses AS business
WHERE business.legacy_owner_user_id IS NOT NULL
ON CONFLICT (business_id, user_id) WHERE user_id IS NOT NULL DO NOTHING;

UPDATE public.wash_jobs AS job
SET business_id = business.id,
    created_by_user_id = job.user_id
FROM public.businesses AS business
WHERE business.legacy_owner_user_id = job.user_id;

UPDATE public.washers AS washer
SET business_id = business.id,
    created_by_user_id = washer.user_id
FROM public.businesses AS business
WHERE business.legacy_owner_user_id = washer.user_id;

UPDATE public.service_prices AS service_price
SET business_id = business.id,
    created_by_user_id = service_price.user_id
FROM public.businesses AS business
WHERE business.legacy_owner_user_id = service_price.user_id;

UPDATE public.addons AS addon
SET business_id = business.id,
    created_by_user_id = addon.user_id
FROM public.businesses AS business
WHERE business.legacy_owner_user_id = addon.user_id;

WITH unambiguous_washers AS (
    SELECT
        job.id AS wash_job_id,
        (array_agg(washer.id))[1] AS washer_id
    FROM public.wash_jobs AS job
    JOIN public.washers AS washer
      ON washer.business_id = job.business_id
     AND lower(btrim(washer.name)) = lower(btrim(job.washer_name))
    GROUP BY job.id
    HAVING count(*) = 1
)
UPDATE public.wash_jobs AS job
SET washer_id = unambiguous_washers.washer_id
FROM unambiguous_washers
WHERE job.id = unambiguous_washers.wash_job_id;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM public.wash_jobs WHERE business_id IS NULL)
       OR EXISTS (SELECT 1 FROM public.washers WHERE business_id IS NULL)
       OR EXISTS (SELECT 1 FROM public.service_prices WHERE business_id IS NULL)
       OR EXISTS (SELECT 1 FROM public.addons WHERE business_id IS NULL) THEN
        RAISE EXCEPTION 'Business backfill incomplete; resolve legacy owners before continuing';
    END IF;
END;
$$;

ALTER TABLE public.wash_jobs ALTER COLUMN business_id SET NOT NULL;
ALTER TABLE public.wash_jobs ALTER COLUMN created_by_user_id SET NOT NULL;
ALTER TABLE public.washers ALTER COLUMN business_id SET NOT NULL;
ALTER TABLE public.washers ALTER COLUMN created_by_user_id SET NOT NULL;
ALTER TABLE public.service_prices ALTER COLUMN business_id SET NOT NULL;
ALTER TABLE public.service_prices ALTER COLUMN created_by_user_id SET NOT NULL;
ALTER TABLE public.addons ALTER COLUMN business_id SET NOT NULL;
ALTER TABLE public.addons ALTER COLUMN created_by_user_id SET NOT NULL;

ALTER TABLE public.washers
    ADD CONSTRAINT washers_id_business_unique UNIQUE (id, business_id),
    ADD CONSTRAINT washers_membership_business_fkey
        FOREIGN KEY (membership_id, business_id)
        REFERENCES public.business_memberships (id, business_id);

ALTER TABLE public.wash_jobs
    ADD CONSTRAINT wash_jobs_washer_business_fkey
        FOREIGN KEY (washer_id, business_id)
        REFERENCES public.washers (id, business_id);

ALTER TABLE public.service_prices
    DROP CONSTRAINT IF EXISTS service_prices_user_id_car_type_wash_type_key;

CREATE UNIQUE INDEX service_prices_business_car_wash_unique
    ON public.service_prices (business_id, car_type, wash_type);

CREATE INDEX wash_jobs_business_status_created_idx
    ON public.wash_jobs (business_id, status, created_at DESC);
CREATE INDEX wash_jobs_business_washer_idx
    ON public.wash_jobs (business_id, washer_id);
CREATE INDEX washers_business_idx ON public.washers (business_id);
CREATE INDEX service_prices_business_idx ON public.service_prices (business_id);
CREATE INDEX addons_business_idx ON public.addons (business_id);
CREATE INDEX business_memberships_user_status_idx
    ON public.business_memberships (user_id, status);
CREATE INDEX wash_job_status_history_actor_idx
    ON public.wash_job_status_history (actor_user_id);

CREATE OR REPLACE FUNCTION public.is_active_business_member(p_business_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.business_memberships AS membership
        JOIN public.businesses AS business ON business.id = membership.business_id
        WHERE membership.business_id = p_business_id
          AND membership.user_id = auth.uid()
          AND membership.status = 'active'
          AND business.status = 'active'
    );
$$;

CREATE OR REPLACE FUNCTION public.is_business_admin(p_business_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.business_memberships AS membership
        JOIN public.businesses AS business ON business.id = membership.business_id
        WHERE membership.business_id = p_business_id
          AND membership.user_id = auth.uid()
          AND membership.role = 'admin'
          AND membership.status = 'active'
          AND business.status = 'active'
    );
$$;

CREATE OR REPLACE FUNCTION public.is_assigned_washer(
    p_business_id uuid,
    p_washer_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
    SELECT p_washer_id IS NOT NULL AND EXISTS (
        SELECT 1
        FROM public.washers AS washer
        JOIN public.business_memberships AS membership
          ON membership.id = washer.membership_id
         AND membership.business_id = washer.business_id
        WHERE washer.id = p_washer_id
          AND washer.business_id = p_business_id
          AND washer.active
          AND membership.user_id = auth.uid()
          AND membership.role = 'washer'
          AND membership.status = 'active'
    );
$$;

CREATE OR REPLACE FUNCTION public.prevent_business_id_change()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
BEGIN
    IF NEW.business_id IS DISTINCT FROM OLD.business_id THEN
        RAISE EXCEPTION 'business_id cannot be changed after record creation'
            USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER wash_jobs_business_id_immutable
BEFORE UPDATE OF business_id ON public.wash_jobs
FOR EACH ROW EXECUTE FUNCTION public.prevent_business_id_change();
CREATE TRIGGER washers_business_id_immutable
BEFORE UPDATE OF business_id ON public.washers
FOR EACH ROW EXECUTE FUNCTION public.prevent_business_id_change();
CREATE TRIGGER service_prices_business_id_immutable
BEFORE UPDATE OF business_id ON public.service_prices
FOR EACH ROW EXECUTE FUNCTION public.prevent_business_id_change();
CREATE TRIGGER addons_business_id_immutable
BEFORE UPDATE OF business_id ON public.addons
FOR EACH ROW EXECUTE FUNCTION public.prevent_business_id_change();

CREATE OR REPLACE FUNCTION public.validate_washer_membership()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
BEGIN
    IF NEW.membership_id IS NOT NULL AND NOT EXISTS (
        SELECT 1
        FROM public.business_memberships AS membership
        WHERE membership.id = NEW.membership_id
          AND membership.business_id = NEW.business_id
          AND membership.role = 'washer'
    ) THEN
        RAISE EXCEPTION 'Washer must reference a washer membership in the same business'
            USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER washers_membership_role_check
BEFORE INSERT OR UPDATE OF membership_id, business_id ON public.washers
FOR EACH ROW EXECUTE FUNCTION public.validate_washer_membership();

CREATE OR REPLACE FUNCTION public.create_business_for_current_user(p_name text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
    v_business_id uuid;
    v_user_id uuid := auth.uid();
    v_name text := btrim(p_name);
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
    END IF;
    IF v_name IS NULL OR length(v_name) < 2 OR length(v_name) > 120 THEN
        RAISE EXCEPTION 'Business name must contain between 2 and 120 characters'
            USING ERRCODE = '23514';
    END IF;

    INSERT INTO public.profiles (id)
    VALUES (v_user_id)
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.businesses (name, created_by_user_id)
    VALUES (v_name, v_user_id)
    RETURNING id INTO v_business_id;

    INSERT INTO public.business_memberships (business_id, user_id, role, status)
    VALUES (v_business_id, v_user_id, 'admin', 'active');

    RETURN v_business_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.accept_pending_business_memberships()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, auth
AS $$
DECLARE
    v_user_id uuid := auth.uid();
    v_email text;
    v_email_confirmed_at timestamptz;
    v_accepted integer;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
    END IF;

    SELECT lower(users.email), users.email_confirmed_at
    INTO v_email, v_email_confirmed_at
    FROM auth.users AS users
    WHERE users.id = v_user_id;

    IF v_email IS NULL OR v_email_confirmed_at IS NULL THEN
        RETURN 0;
    END IF;

    UPDATE public.business_memberships AS membership
    SET user_id = v_user_id,
        status = 'active'
    WHERE membership.user_id IS NULL
      AND membership.status = 'invited'
      AND lower(btrim(membership.invited_email)) = v_email
      AND NOT EXISTS (
          SELECT 1
          FROM public.business_memberships AS existing
          WHERE existing.business_id = membership.business_id
            AND existing.user_id = v_user_id
      );
    GET DIAGNOSTICS v_accepted = ROW_COUNT;
    RETURN v_accepted;
END;
$$;

CREATE OR REPLACE FUNCTION public.invite_business_washer(
    p_business_id uuid,
    p_name text,
    p_email text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
    v_membership_id uuid;
    v_washer_id uuid;
    v_email text := lower(btrim(p_email));
    v_name text := btrim(p_name);
BEGIN
    IF NOT public.is_business_admin(p_business_id) THEN
        RAISE EXCEPTION 'Business admin membership required'
            USING ERRCODE = '42501';
    END IF;
    IF v_name IS NULL OR length(v_name) < 1 OR length(v_name) > 100
       OR v_email IS NULL OR length(v_email) > 320 OR position('@' IN v_email) < 2 THEN
        RAISE EXCEPTION 'Valid washer name and email are required'
            USING ERRCODE = '23514';
    END IF;

    INSERT INTO public.business_memberships (
        business_id, invited_email, role, status, invited_by_user_id
    )
    VALUES (p_business_id, v_email, 'washer', 'invited', auth.uid())
    RETURNING id INTO v_membership_id;

    INSERT INTO public.washers (business_id, membership_id, user_id, created_by_user_id, name)
    VALUES (p_business_id, v_membership_id, auth.uid(), auth.uid(), v_name)
    RETURNING id INTO v_washer_id;

    RETURN v_washer_id;
END;
$$;

DROP FUNCTION IF EXISTS public.create_wash_job_with_addons(
    uuid, text, text, text, text, numeric, uuid[]
);

CREATE OR REPLACE FUNCTION public.create_wash_job_with_addons(
    p_business_id uuid,
    p_washer_id uuid,
    p_car_type text,
    p_wash_type text,
    p_license_plate text,
    p_base_price numeric,
    p_addon_ids uuid[] DEFAULT ARRAY[]::uuid[]
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
    v_user_id uuid := auth.uid();
    v_wash_job_id uuid;
    v_washer_name text := 'Sin asignar';
    v_addon_ids uuid[] := COALESCE(p_addon_ids, ARRAY[]::uuid[]);
    v_addon_count integer;
    v_addon_total numeric;
BEGIN
    IF v_user_id IS NULL OR NOT public.is_business_admin(p_business_id) THEN
        RAISE EXCEPTION 'Business admin membership required'
            USING ERRCODE = '42501';
    END IF;
    IF p_base_price IS NULL OR p_base_price < 0 THEN
        RAISE EXCEPTION 'Base price must be greater than or equal to zero'
            USING ERRCODE = '23514';
    END IF;
    IF p_washer_id IS NOT NULL THEN
        SELECT washer.name INTO v_washer_name
        FROM public.washers AS washer
        WHERE washer.id = p_washer_id
          AND washer.business_id = p_business_id
          AND washer.active
        FOR SHARE;
        IF NOT FOUND THEN
            RAISE EXCEPTION 'Washer does not belong to this business or is inactive'
                USING ERRCODE = '23503';
        END IF;
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
    WHERE addon.business_id = p_business_id
      AND addon.id = ANY(v_addon_ids)
    FOR SHARE;

    SELECT count(*)::integer, COALESCE(sum(addon.price), 0)
    INTO v_addon_count, v_addon_total
    FROM public.addons AS addon
    WHERE addon.business_id = p_business_id
      AND addon.id = ANY(v_addon_ids);
    IF v_addon_count <> cardinality(v_addon_ids) THEN
        RAISE EXCEPTION 'One or more addons do not belong to this business'
            USING ERRCODE = '23503';
    END IF;
    IF EXISTS (
        SELECT 1
        FROM public.addons AS addon
        WHERE addon.business_id = p_business_id
          AND addon.id = ANY(v_addon_ids)
          AND addon.price < 0
    ) THEN
        RAISE EXCEPTION 'Addon prices cannot be negative'
            USING ERRCODE = '23514';
    END IF;

    INSERT INTO public.wash_jobs (
        user_id, created_by_user_id, business_id, washer_id, car_type,
        wash_type, washer_name, license_plate, price, status
    )
    VALUES (
        v_user_id, v_user_id, p_business_id, p_washer_id, p_car_type,
        p_wash_type, v_washer_name, p_license_plate,
        round(p_base_price, 2) + v_addon_total, 'pending'
    )
    RETURNING id INTO v_wash_job_id;

    INSERT INTO public.wash_job_addons (
        wash_job_id, addon_id, addon_name_snapshot, price_snapshot
    )
    SELECT v_wash_job_id, addon.id, addon.name, addon.price
    FROM public.addons AS addon
    WHERE addon.business_id = p_business_id
      AND addon.id = ANY(v_addon_ids);

    RETURN v_wash_job_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.advance_wash_job_status(
    p_business_id uuid,
    p_wash_job_id uuid,
    p_new_status public.wash_status
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
    IF NOT public.is_business_admin(p_business_id)
       AND NOT EXISTS (
           SELECT 1
           FROM public.wash_jobs AS job
           WHERE job.id = p_wash_job_id
             AND job.business_id = p_business_id
             AND public.is_assigned_washer(job.business_id, job.washer_id)
       ) THEN
        RAISE EXCEPTION 'Admin membership or assignment to this wash job required'
            USING ERRCODE = '42501';
    END IF;

    UPDATE public.wash_jobs AS job
    SET status = p_new_status
    WHERE job.id = p_wash_job_id
      AND job.business_id = p_business_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Wash job not found in this business'
            USING ERRCODE = 'P0002';
    END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.record_wash_job_status_history()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO public.wash_job_status_history (
            wash_job_id, user_id, actor_user_id, old_status, new_status
        )
        VALUES (NEW.id, NEW.user_id, auth.uid(), NULL, NEW.status);
    ELSIF NEW.status IS DISTINCT FROM OLD.status THEN
        INSERT INTO public.wash_job_status_history (
            wash_job_id, user_id, actor_user_id, old_status, new_status
        )
        VALUES (NEW.id, NEW.user_id, auth.uid(), OLD.status, NEW.status);
    END IF;
    RETURN NEW;
END;
$$;

DROP POLICY IF EXISTS "Users can view their own wash jobs" ON public.wash_jobs;
DROP POLICY IF EXISTS "Users can create their own wash jobs" ON public.wash_jobs;
DROP POLICY IF EXISTS "Users can update their own wash jobs" ON public.wash_jobs;
DROP POLICY IF EXISTS "Users can delete their own wash jobs" ON public.wash_jobs;

CREATE POLICY "Business members can view authorized wash jobs"
    ON public.wash_jobs FOR SELECT TO authenticated
    USING (
        public.is_business_admin(business_id)
        OR public.is_assigned_washer(business_id, washer_id)
    );
CREATE POLICY "Business admins can update wash jobs"
    ON public.wash_jobs FOR UPDATE TO authenticated
    USING (public.is_business_admin(business_id))
    WITH CHECK (public.is_business_admin(business_id));
CREATE POLICY "Business admins can delete wash jobs"
    ON public.wash_jobs FOR DELETE TO authenticated
    USING (public.is_business_admin(business_id));

DROP POLICY IF EXISTS "Users can view their own washers" ON public.washers;
DROP POLICY IF EXISTS "Users can create their own washers" ON public.washers;
DROP POLICY IF EXISTS "Users can update their own washers" ON public.washers;
DROP POLICY IF EXISTS "Users can delete their own washers" ON public.washers;

CREATE POLICY "Business admins and assigned washers can view washer profiles"
    ON public.washers FOR SELECT TO authenticated
    USING (
        public.is_business_admin(business_id)
        OR public.is_assigned_washer(business_id, id)
    );
CREATE POLICY "Business admins can update washer profiles"
    ON public.washers FOR UPDATE TO authenticated
    USING (public.is_business_admin(business_id))
    WITH CHECK (public.is_business_admin(business_id));
CREATE POLICY "Business admins can delete washer profiles"
    ON public.washers FOR DELETE TO authenticated
    USING (public.is_business_admin(business_id));

DROP POLICY IF EXISTS "Users can view their own service prices" ON public.service_prices;
DROP POLICY IF EXISTS "Users can create their own service prices" ON public.service_prices;
DROP POLICY IF EXISTS "Users can update their own service prices" ON public.service_prices;
DROP POLICY IF EXISTS "Users can delete their own service prices" ON public.service_prices;

CREATE POLICY "Business admins can manage service prices"
    ON public.service_prices FOR ALL TO authenticated
    USING (public.is_business_admin(business_id))
    WITH CHECK (public.is_business_admin(business_id));

DROP POLICY IF EXISTS "Users can view their own addons" ON public.addons;
DROP POLICY IF EXISTS "Users can create their own addons" ON public.addons;
DROP POLICY IF EXISTS "Users can update their own addons" ON public.addons;
DROP POLICY IF EXISTS "Users can delete their own addons" ON public.addons;

CREATE POLICY "Business admins can manage addons"
    ON public.addons FOR ALL TO authenticated
    USING (public.is_business_admin(business_id))
    WITH CHECK (public.is_business_admin(business_id));

DROP POLICY IF EXISTS "Users can view addons for their own wash jobs"
    ON public.wash_job_addons;
CREATE POLICY "Business members can view authorized wash job addons"
    ON public.wash_job_addons FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1
            FROM public.wash_jobs AS job
            WHERE job.id = wash_job_addons.wash_job_id
              AND (
                  public.is_business_admin(job.business_id)
                  OR public.is_assigned_washer(job.business_id, job.washer_id)
              )
        )
    );

DROP POLICY IF EXISTS "Users can view their own wash job status history"
    ON public.wash_job_status_history;
CREATE POLICY "Business members can view authorized wash job status history"
    ON public.wash_job_status_history FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1
            FROM public.wash_jobs AS job
            WHERE job.id = wash_job_status_history.wash_job_id
              AND (
                  public.is_business_admin(job.business_id)
                  OR public.is_assigned_washer(job.business_id, job.washer_id)
              )
        )
    );

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_memberships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own profile and business admins can read member profiles"
    ON public.profiles FOR SELECT TO authenticated
    USING (
        id = auth.uid()
        OR EXISTS (
            SELECT 1
            FROM public.business_memberships AS membership
            WHERE membership.user_id = profiles.id
              AND public.is_business_admin(membership.business_id)
        )
    );
CREATE POLICY "Users can update their own profile"
    ON public.profiles FOR UPDATE TO authenticated
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid());

CREATE POLICY "Active business members can view their businesses"
    ON public.businesses FOR SELECT TO authenticated
    USING (public.is_active_business_member(id));
CREATE POLICY "Business admins can update their businesses"
    ON public.businesses FOR UPDATE TO authenticated
    USING (public.is_business_admin(id))
    WITH CHECK (public.is_business_admin(id));

CREATE POLICY "Members can view their own memberships and business admins can view members"
    ON public.business_memberships FOR SELECT TO authenticated
    USING (
        (user_id = auth.uid() AND status = 'active')
        OR public.is_business_admin(business_id)
    );

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wash_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.washers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.addons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wash_job_addons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wash_job_status_history ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.profiles, public.businesses, public.business_memberships,
    public.wash_jobs, public.washers, public.service_prices, public.addons,
    public.wash_job_addons, public.wash_job_status_history
FROM PUBLIC, anon, authenticated;

GRANT SELECT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT, UPDATE ON public.businesses TO authenticated;
GRANT SELECT ON public.business_memberships TO authenticated;
GRANT SELECT, UPDATE, DELETE ON public.wash_jobs TO authenticated;
GRANT SELECT, UPDATE, DELETE ON public.washers TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.service_prices, public.addons TO authenticated;
GRANT SELECT ON public.wash_job_addons, public.wash_job_status_history TO authenticated;

REVOKE ALL ON FUNCTION public.is_active_business_member(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_business_admin(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_assigned_washer(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.create_business_for_current_user(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.accept_pending_business_memberships() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.invite_business_washer(uuid, text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.create_wash_job_with_addons(
    uuid, uuid, text, text, text, numeric, uuid[]
) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.advance_wash_job_status(
    uuid, uuid, public.wash_status
) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.is_active_business_member(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_business_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_assigned_washer(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_business_for_current_user(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.accept_pending_business_memberships() TO authenticated;
GRANT EXECUTE ON FUNCTION public.invite_business_washer(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_wash_job_with_addons(
    uuid, uuid, text, text, text, numeric, uuid[]
) TO authenticated;
GRANT EXECUTE ON FUNCTION public.advance_wash_job_status(
    uuid, uuid, public.wash_status
) TO authenticated;
