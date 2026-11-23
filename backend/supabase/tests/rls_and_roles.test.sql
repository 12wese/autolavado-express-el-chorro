BEGIN;

SELECT plan(17);

INSERT INTO auth.users (
    id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data
)
VALUES
    (
        '00000000-0000-0000-0000-000000000001',
        'authenticated', 'authenticated', 'admin-a@example.test', 'Veget777#',
        now(), '{"provider":"email","providers":["email"]}', '{}'
    ),
    (
        '00000000-0000-0000-0000-000000000002',
        'authenticated', 'authenticated', 'admin-b@example.test', 'Veget777#',
        now(), '{"provider":"email","providers":["email"]}', '{}'
    ),
    (
        '00000000-0000-0000-0000-000000000003',
        'authenticated', 'authenticated', 'washer-a@example.test', 'Veget777#',
        now(), '{"provider":"email","providers":["email"]}', '{}'
    ),
    (
        '00000000-0000-0000-0000-000000000004',
        'authenticated', 'authenticated', 'new-admin@example.test', '',
        now(), '{"provider":"email","providers":["email"]}', '{}'
    );

INSERT INTO public.businesses (id, name, created_by_user_id)
VALUES
    (
        '10000000-0000-0000-0000-000000000001',
        'Negocio A', '00000000-0000-0000-0000-000000000001'
    ),
    (
        '10000000-0000-0000-0000-000000000002',
        'Negocio B', '00000000-0000-0000-0000-000000000002'
    );

INSERT INTO public.business_memberships (id, business_id, user_id, role, status)
VALUES
    (
        '20000000-0000-0000-0000-000000000001',
        '10000000-0000-0000-0000-000000000001',
        '00000000-0000-0000-0000-000000000001', 'admin', 'active'
    ),
    (
        '20000000-0000-0000-0000-000000000002',
        '10000000-0000-0000-0000-000000000002',
        '00000000-0000-0000-0000-000000000002', 'admin', 'active'
    ),
    (
        '20000000-0000-0000-0000-000000000003',
        '10000000-0000-0000-0000-000000000001',
        '00000000-0000-0000-0000-000000000003', 'washer', 'active'
    );

INSERT INTO public.washers (
    id, user_id, name, business_id, membership_id, created_by_user_id
)
VALUES (
    '30000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001',
    'Lavador A',
    '10000000-0000-0000-0000-000000000001',
    '20000000-0000-0000-0000-000000000003',
    '00000000-0000-0000-0000-000000000001'
);

INSERT INTO public.wash_jobs (
    id, user_id, created_by_user_id, business_id, washer_id,
    car_type, wash_type, washer_name, license_plate
)
VALUES
    (
        '40000000-0000-0000-0000-000000000001',
        '00000000-0000-0000-0000-000000000001',
        '00000000-0000-0000-0000-000000000001',
        '10000000-0000-0000-0000-000000000001',
        '30000000-0000-0000-0000-000000000001',
        'sedan', 'basico', 'Lavador A', 'TEST-A'
    ),
    (
        '40000000-0000-0000-0000-000000000002',
        '00000000-0000-0000-0000-000000000002',
        '00000000-0000-0000-0000-000000000002',
        '10000000-0000-0000-0000-000000000002',
        NULL,
        'sedan', 'basico', 'Sin asignar', 'TEST-B'
    );

INSERT INTO public.addons (id, user_id, created_by_user_id, business_id, name, price)
VALUES
    (
        '50000000-0000-0000-0000-000000000001',
        '00000000-0000-0000-0000-000000000001',
        '00000000-0000-0000-0000-000000000001',
        '10000000-0000-0000-0000-000000000001',
        'Cera A', 5
    ),
    (
        '50000000-0000-0000-0000-000000000002',
        '00000000-0000-0000-0000-000000000002',
        '00000000-0000-0000-0000-000000000002',
        '10000000-0000-0000-0000-000000000002',
        'Cera B', 7
    );

INSERT INTO public.wash_job_addons (
    wash_job_id, addon_id, addon_name_snapshot, price_snapshot
)
VALUES
    (
        '40000000-0000-0000-0000-000000000001',
        '50000000-0000-0000-0000-000000000001', 'Cera A', 5
    ),
    (
        '40000000-0000-0000-0000-000000000002',
        '50000000-0000-0000-0000-000000000002', 'Cera B', 7
    );

SET LOCAL ROLE authenticated;
SELECT set_config(
    'request.jwt.claim.sub',
    '00000000-0000-0000-0000-000000000001',
    true
);

SELECT ok(
    public.is_business_admin('10000000-0000-0000-0000-000000000001'),
    'el admin tiene permisos de administración en su negocio'
);
SELECT is(
    (SELECT count(*) FROM public.wash_jobs),
    1::bigint,
    'el admin no puede leer lavados de otro negocio'
);
SELECT is(
    (
        SELECT count(*)
        FROM public.find_recent_wash_jobs_by_plate(
            '10000000-0000-0000-0000-000000000001',
            'TESTA'
        )
    ),
    1::bigint,
    'el historial normaliza placas y devuelve la del negocio activo'
);
SELECT is(
    (
        SELECT count(*)
        FROM public.find_recent_wash_jobs_by_plate(
            '10000000-0000-0000-0000-000000000002',
            'TESTB'
        )
    ),
    0::bigint,
    'el historial respeta RLS al consultar otro negocio'
);
SELECT is(
    (SELECT count(*) FROM public.wash_job_addons),
    1::bigint,
    'el admin no puede leer adiciones de lavados de otro negocio'
);
SELECT lives_ok(
    $$INSERT INTO public.addons (
        user_id, created_by_user_id, business_id, name, price
    ) VALUES (
        '00000000-0000-0000-0000-000000000001',
        '00000000-0000-0000-0000-000000000001',
        '10000000-0000-0000-0000-000000000001',
        'Pulido A', 10
    )$$,
    'el admin puede crear adiciones en su negocio'
);
SELECT ok(
    NOT has_function_privilege(
        'anon',
        'public.create_wash_job_with_addons(uuid, uuid, text, text, text, numeric, uuid[])',
        'EXECUTE'
    ),
    'anon no puede ejecutar la RPC de creación de lavados'
);
SELECT ok(
    has_function_privilege(
        'authenticated',
        'public.create_wash_job_with_addons(uuid, uuid, text, text, text, numeric, uuid[])',
        'EXECUTE'
    ),
    'authenticated puede invocar la RPC protegida de creación de lavados'
);

SELECT set_config(
    'request.jwt.claim.sub',
    '00000000-0000-0000-0000-000000000003',
    true
);

SELECT ok(
    public.is_assigned_washer(
        '10000000-0000-0000-0000-000000000001',
        '30000000-0000-0000-0000-000000000001'
    ),
    'el lavador reconoce su asignación activa'
);
SELECT is(
    (SELECT count(*) FROM public.wash_jobs),
    1::bigint,
    'el lavador solo puede leer su lavado asignado'
);
SELECT is(
    (
        SELECT count(*)
        FROM public.find_recent_wash_jobs_by_plate(
            '10000000-0000-0000-0000-000000000001',
            'TESTA'
        )
    ),
    1::bigint,
    'el RPC conserva el alcance RLS para lavadores asignados'
);
SELECT is(
    (SELECT count(*) FROM public.wash_job_addons),
    1::bigint,
    'el lavador solo puede leer adiciones de su lavado asignado'
);
SELECT throws_ok(
    $$INSERT INTO public.addons (
        user_id, created_by_user_id, business_id, name, price
    ) VALUES (
        '00000000-0000-0000-0000-000000000003',
        '00000000-0000-0000-0000-000000000003',
        '10000000-0000-0000-0000-000000000001',
        'No autorizado', 1
    )$$,
    '42501',
    NULL,
    'el lavador no puede administrar el catálogo de adiciones'
);
SELECT throws_ok(
    $$SELECT public.create_wash_job_with_addons(
        '10000000-0000-0000-0000-000000000001',
        NULL,
        'sedan',
        'basico',
        'TEST-W',
        10,
        ARRAY[]::uuid[]
    )$$,
    '42501',
    NULL,
    'el lavador no puede crear lavados mediante la RPC de admin'
);

SELECT set_config(
    'request.jwt.claim.sub',
    '00000000-0000-0000-0000-000000000004',
    true
);
SELECT lives_ok(
    $$SELECT public.create_business_for_current_user('Negocio de prueba')$$,
    'un usuario autenticado puede crear su negocio mediante la RPC autorizada'
);
SELECT is(
    (
        SELECT count(*)
        FROM public.business_memberships
        WHERE user_id = '00000000-0000-0000-0000-000000000004'
    ),
    1::bigint,
    'la creación asigna una membresía admin visible al nuevo propietario'
);
SELECT is(
    (SELECT count(*) FROM public.businesses),
    1::bigint,
    'el nuevo propietario puede leer el negocio creado bajo RLS'
);

SELECT * FROM finish();
ROLLBACK;
