CREATE TABLE public.wash_job_status_history (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    wash_job_id uuid NOT NULL REFERENCES public.wash_jobs(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    old_status public.wash_status,
    new_status public.wash_status NOT NULL,
    changed_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX wash_job_status_history_job_changed_at_idx
    ON public.wash_job_status_history (wash_job_id, changed_at);

ALTER TABLE public.wash_job_status_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own wash job status history"
    ON public.wash_job_status_history
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

GRANT SELECT ON public.wash_job_status_history TO authenticated;

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
BEFORE INSERT OR UPDATE ON public.wash_jobs
FOR EACH ROW
EXECUTE FUNCTION public.enforce_wash_status_transition();

CREATE OR REPLACE FUNCTION public.record_wash_job_status_history()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO public.wash_job_status_history (
            wash_job_id, user_id, old_status, new_status
        )
        VALUES (NEW.id, NEW.user_id, NULL, NEW.status);
    ELSIF NEW.status IS DISTINCT FROM OLD.status THEN
        INSERT INTO public.wash_job_status_history (
            wash_job_id, user_id, old_status, new_status
        )
        VALUES (NEW.id, NEW.user_id, OLD.status, NEW.status);
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS record_wash_job_status_history ON public.wash_jobs;

CREATE TRIGGER record_wash_job_status_history
AFTER INSERT OR UPDATE ON public.wash_jobs
FOR EACH ROW
EXECUTE FUNCTION public.record_wash_job_status_history();
