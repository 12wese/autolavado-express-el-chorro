-- Lavadores: cada uno con un token único para su código QR.
CREATE TABLE public.washers (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users NOT NULL,
    name TEXT NOT NULL,
    qr_token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(12), 'hex'),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.washers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own washers"
ON public.washers FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own washers"
ON public.washers FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own washers"
ON public.washers FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own washers"
ON public.washers FOR DELETE
USING (auth.uid() = user_id);

-- Matriz de precios: un precio por combinación de tipo de auto + tipo de lavado.
CREATE TABLE public.service_prices (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users NOT NULL,
    car_type TEXT NOT NULL,
    wash_type TEXT NOT NULL,
    price DECIMAL(10, 2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, car_type, wash_type)
);

ALTER TABLE public.service_prices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own service prices"
ON public.service_prices FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own service prices"
ON public.service_prices FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own service prices"
ON public.service_prices FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own service prices"
ON public.service_prices FOR DELETE
USING (auth.uid() = user_id);

CREATE TRIGGER update_service_prices_updated_at
BEFORE UPDATE ON public.service_prices
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Adiciones opcionales (pulido, encerado, etc.), cada una con su propio precio.
CREATE TABLE public.addons (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users NOT NULL,
    name TEXT NOT NULL,
    price DECIMAL(10, 2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.addons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own addons"
ON public.addons FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own addons"
ON public.addons FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own addons"
ON public.addons FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own addons"
ON public.addons FOR DELETE
USING (auth.uid() = user_id);
