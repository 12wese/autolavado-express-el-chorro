-- Crear enum para estados del lavado
CREATE TYPE public.wash_status AS ENUM ('pending', 'in_progress', 'completed');

-- Crear tabla de trabajos de lavado
CREATE TABLE public.wash_jobs (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users NOT NULL,
    car_type TEXT NOT NULL,
    wash_type TEXT NOT NULL,
    washer_name TEXT NOT NULL,
    status wash_status NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.wash_jobs ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Users can view their own wash jobs"
ON public.wash_jobs FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own wash jobs"
ON public.wash_jobs FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own wash jobs"
ON public.wash_jobs FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own wash jobs"
ON public.wash_jobs FOR DELETE
USING (auth.uid() = user_id);

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_wash_jobs_updated_at
BEFORE UPDATE ON public.wash_jobs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();