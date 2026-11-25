# Arquitectura en 5 Capas y Trazabilidad del Sistema

El sistema **Autolavado Express El Chorro** está estructurado bajo una **arquitectura desacoplada en 5 capas**, integrando desarrollo web/móvil híbrido, Backend as a Service (BaaS) y Web Semántica.

## Diagrama de Arquitectura y Flujo General

```mermaid
flowchart TD
    U(["👤 Usuario (Administrador / Cajero / Lavador)"])

    subgraph C1["1. Capa de Presentación (frontend/src/pages & components)"]
        direction LR
        P1["React + TypeScript + Vite"]
        P2["Login / Tablero Kanban"]
        P3["Estadísticas / Historial / APK Capacitor"]
    end

    subgraph C2["2. Capa de Aplicación / Flujo de Procesos (frontend/src/hooks & contexts)"]
        direction LR
        A1["Registro del lavado y asignación"]
        A2["Coordinación de casos de uso"]
        A3["Flujo: Pendiente → En proceso → Terminado → Entregado"]
    end

    subgraph C3["3. Capa de Lógica de Negocio (frontend/src/lib & backend/supabase)"]
        direction LR
        L1["Reglas del sistema y validaciones"]
        L2["Cálculo de comisiones 40% / 60%"]
        L3["Permisos por rol y control de estados"]
    end

    subgraph C4["4. Capa de API y Servicios (backend/supabase/functions)"]
        direction LR
        S1["Supabase API (PostgREST + Auth)"]
        S2["Edge Function: recognize-plate (Visión IA Gemini)"]
        S3["Edge Function: fuseki-proxy (SPARQL 1.1)"]
    end

    subgraph C5["5. Capa de Datos y Seguridad (backend/supabase/migrations & Fuseki)"]
        direction LR
        D1["PostgreSQL + Políticas RLS"]
        D2["Tablas de lavados, usuarios, tarifas e historial"]
        D3["Grafo Semántico RDF (Apache Jena Fuseki TDB2)"]
    end

    U -->|"1. Solicitud / Acción"| C1
    C1 -->|"2. Invoca caso de uso"| C2
    C2 -->|"3. Aplica reglas y cálculos"| C3
    C3 -->|"4. Petición HTTPS / JWT"| C4
    C4 -->|"5. Persistencia / Consulta"| C5

    C5 -.->|"Respuesta de datos"| C4
    C4 -.->|"JSON / Resultados"| C1
    C1 -.->|"Interfaz actualizada"| U
```

---

## Trazabilidad por Capas y Ubicación en el Repositorio

| Capa | Responsabilidad Principal | Componentes y Funcionalidades | Ubicación en el Proyecto |
| :--- | :--- | :--- | :--- |
| **1. Capa de Presentación** | Interfaz gráfica web y móvil con la que interactúa el usuario final. | • Interfaz en **React + TypeScript + Tailwind**<br>• Vistas de Login, Tablero Kanban, Estadísticas e Historial<br>• Empaquetado móvil Android (**Capacitor APK**) y despliegue en **Vercel** | `frontend/src/pages/`<br>`frontend/src/components/`<br>`frontend/android/` |
| **2. Capa de Aplicación / Flujo de Procesos** | Orquestación de los casos de uso y transición operativa del servicio. | • Registro de vehículos y asignación de lavador (QR / manual)<br>• Seguimiento del trabajo en tiempo real<br>• Máquina de estados: `Pendiente` → `En proceso` → `Terminado` → `Entregado` | `frontend/src/hooks/`<br>`frontend/src/contexts/` |
| **3. Capa de Lógica de Negocio** | Aplicación de reglas financieras, validaciones y control de acceso. | • Cálculo automático de reparto (**40% lavador / 60% negocio**)<br>• Cálculo de totales, tarifas por tipo de vehículo e indicadores KPI<br>• Validación de transiciones de estado y permisos por rol (`admin`, `staff`) | `frontend/src/lib/`<br>`backend/supabase/migrations/` *(funciones RPC)* |
| **4. Capa de API y Servicios** | Comunicación segura mediante protocolos HTTP/REST y servicios externos. | • **Supabase API (PostgREST)** para operaciones CRUD y **Supabase Auth** (JWT)<br>• **Edge Function `recognize-plate`**: integración con **Gemini Vision IA** para lectura de placas<br>• **Edge Function `fuseki-proxy`**: puente SPARQL hacia el grafo semántico | `frontend/src/integrations/supabase/`<br>`backend/supabase/functions/recognize-plate/`<br>`backend/supabase/functions/fuseki-proxy/` |
| **5. Capa de Datos y Seguridad** | Almacenamiento persistente, integridad referencial y aislamiento de datos. | • Base de datos relacional **PostgreSQL** (`wash_jobs`, `washers`, `service_prices`, `businesses`, `wash_job_status_history`)<br>• Seguridad a nivel de fila (**Row-Level Security - RLS**) por negocio<br>• Base de conocimiento **RDF / TDB2** en **Apache Jena Fuseki** | `backend/supabase/migrations/*.sql`<br>`autolavado_semantico.ttl` |

---

## Flujo General de Trazabilidad

* **Flujo de Ejecución (Ida):**
  `Usuario` $\rightarrow$ `1. Presentación` $\rightarrow$ `2. Aplicación / Procesos` $\rightarrow$ `3. Lógica de Negocio` $\rightarrow$ `4. API y Servicios` $\rightarrow$ `5. Datos y Seguridad`
* **Flujo de Respuesta (Retorno):**
  `5. Datos y Seguridad` $\rightarrow$ `4. API y Servicios` $\rightarrow$ `1. Presentación` $\rightarrow$ `Usuario`
