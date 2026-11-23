INSERT INTO auth.users (
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data
)
VALUES (
    '90000000-0000-0000-0000-000000000001',
    'authenticated',
    'authenticated',
    'seed-admin@example.test',
    '',
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"display_name":"Administrador de prueba"}'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.businesses (id, name, created_by_user_id)
VALUES (
    '90000000-0000-0000-0000-000000000002',
    'Autolavado Express El Chorro',
    '90000000-0000-0000-0000-000000000001'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.business_memberships (id, business_id, user_id, role, status)
VALUES (
    '90000000-0000-0000-0000-000000000003',
    '90000000-0000-0000-0000-000000000002',
    '90000000-0000-0000-0000-000000000001',
    'admin',
    'active'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.washers (
    id, user_id, name, business_id, created_by_user_id
)
VALUES (
    '90000000-0000-0000-0000-000000000004',
    '90000000-0000-0000-0000-000000000001',
    'Carlos Pérez',
    '90000000-0000-0000-0000-000000000002',
    '90000000-0000-0000-0000-000000000001'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.service_prices (
    user_id, created_by_user_id, business_id, car_type, wash_type, price
)
VALUES
    (
        '90000000-0000-0000-0000-000000000001',
        '90000000-0000-0000-0000-000000000001',
        '90000000-0000-0000-0000-000000000002',
        'Automóvil', 'Lavada General', 15000
    ),
    (
        '90000000-0000-0000-0000-000000000001',
        '90000000-0000-0000-0000-000000000001',
        '90000000-0000-0000-0000-000000000002',
        'Automóvil', 'Lavada Sencilla', 10000
    ),
    (
        '90000000-0000-0000-0000-000000000001',
        '90000000-0000-0000-0000-000000000001',
        '90000000-0000-0000-0000-000000000002',
        'Moto', 'Lavada', 8000
    ),
    (
        '90000000-0000-0000-0000-000000000001',
        '90000000-0000-0000-0000-000000000001',
        '90000000-0000-0000-0000-000000000002',
        'Moto', 'Lavada + Desengrasada', 12000
    )
ON CONFLICT (business_id, car_type, wash_type)
DO UPDATE SET price = EXCLUDED.price;

INSERT INTO public.addons (
    id, user_id, created_by_user_id, business_id, name, price
)
VALUES
    (
        '90000000-0000-0000-0000-000000000005',
        '90000000-0000-0000-0000-000000000001',
        '90000000-0000-0000-0000-000000000001',
        '90000000-0000-0000-0000-000000000002',
        'Cera líquida', 5000
    ),
    (
        '90000000-0000-0000-0000-000000000006',
        '90000000-0000-0000-0000-000000000001',
        '90000000-0000-0000-0000-000000000001',
        '90000000-0000-0000-0000-000000000002',
        'Desengrase de motor', 4000
    )
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.wash_jobs (
    id, user_id, created_by_user_id, business_id, washer_id,
    car_type, wash_type, washer_name, license_plate, price, created_at
)
VALUES
    (
        '90000000-0000-0000-0000-000000000007',
        '90000000-0000-0000-0000-000000000001',
        '90000000-0000-0000-0000-000000000001',
        '90000000-0000-0000-0000-000000000002',
        '90000000-0000-0000-0000-000000000004',
        'Automóvil', 'Lavada General', 'Carlos Pérez', 'ABC-123', 20000,
        now() - interval '2 hours'
    ),
    (
        '90000000-0000-0000-0000-000000000008',
        '90000000-0000-0000-0000-000000000001',
        '90000000-0000-0000-0000-000000000001',
        '90000000-0000-0000-0000-000000000002',
        '90000000-0000-0000-0000-000000000004',
        'Moto', 'Lavada + Desengrasada', 'Carlos Pérez', 'DEF-456', 16000,
        now() - interval '90 minutes'
    ),
    (
        '90000000-0000-0000-0000-000000000009',
        '90000000-0000-0000-0000-000000000001',
        '90000000-0000-0000-0000-000000000001',
        '90000000-0000-0000-0000-000000000002',
        '90000000-0000-0000-0000-000000000004',
        'Automóvil', 'Lavada General', 'Carlos Pérez', 'GHI-789', 20000,
        now() - interval '1 day'
    ),
    (
        '90000000-0000-0000-0000-000000000010',
        '90000000-0000-0000-0000-000000000001',
        '90000000-0000-0000-0000-000000000001',
        '90000000-0000-0000-0000-000000000002',
        NULL,
        'Moto', 'Lavada', 'Sin asignar', 'JKL-012', 8000,
        now() - interval '30 minutes'
    )
ON CONFLICT (id) DO NOTHING;

UPDATE public.wash_jobs
SET status = 'in_progress'
WHERE id = '90000000-0000-0000-0000-000000000008'
  AND status = 'pending';

UPDATE public.wash_jobs
SET status = 'in_progress'
WHERE id = '90000000-0000-0000-0000-000000000009'
  AND status = 'pending';

UPDATE public.wash_jobs
SET status = 'completed'
WHERE id = '90000000-0000-0000-0000-000000000009'
  AND status = 'in_progress';

INSERT INTO public.wash_job_addons (
    wash_job_id, addon_id, addon_name_snapshot, price_snapshot
)
VALUES
    (
        '90000000-0000-0000-0000-000000000007',
        '90000000-0000-0000-0000-000000000005',
        'Cera líquida', 5000
    ),
    (
        '90000000-0000-0000-0000-000000000008',
        '90000000-0000-0000-0000-000000000006',
        'Desengrase de motor', 4000
    ),
    (
        '90000000-0000-0000-0000-000000000009',
        '90000000-0000-0000-0000-000000000005',
        'Cera líquida', 5000
    )
ON CONFLICT (wash_job_id, addon_id) DO NOTHING;
