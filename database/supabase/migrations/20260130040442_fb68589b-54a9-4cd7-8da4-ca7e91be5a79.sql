-- Add price column to wash_jobs table
ALTER TABLE public.wash_jobs ADD COLUMN price DECIMAL(10, 2) NOT NULL DEFAULT 0;