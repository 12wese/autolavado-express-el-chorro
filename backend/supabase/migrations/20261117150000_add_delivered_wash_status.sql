ALTER TYPE public.wash_status ADD VALUE IF NOT EXISTS 'delivered';

CREATE OR REPLACE FUNCTION public.enforce_wash_status_transition()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
    IF TG_OP = 'INSERT' AND NEW.status::text <> 'pending' THEN
        RAISE EXCEPTION 'A wash job must start in pending status'
            USING ERRCODE = '23514';
    ELSIF TG_OP = 'UPDATE'
       AND NEW.status IS DISTINCT FROM OLD.status
       AND NOT (
           (OLD.status::text = 'pending' AND NEW.status::text = 'in_progress')
           OR (OLD.status::text = 'in_progress' AND NEW.status::text = 'completed')
           OR (OLD.status::text = 'completed' AND NEW.status::text = 'delivered')
       ) THEN
        RAISE EXCEPTION 'Invalid wash status transition: % -> %', OLD.status, NEW.status
            USING ERRCODE = '23514';
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_wash_status_transition ON public.wash_jobs;

CREATE TRIGGER enforce_wash_status_transition
BEFORE INSERT OR UPDATE OF status ON public.wash_jobs
FOR EACH ROW
EXECUTE FUNCTION public.enforce_wash_status_transition();
