# turex-general

Backend del ecosistema Turex usando **Supabase como BaaS** (Postgres + Auth + RLS). No hay capa de API propia: los clientes (web/mobile) hablan directamente con Supabase usando `@supabase/supabase-js`.

## Estructura

```
supabase/
├── migrations/
│   ├── 0001_init.sql   # tablas, enums, triggers
│   └── 0002_rls.sql    # RLS + policies
└── seed.sql            # rubros y tools de ejemplo
```

## Setup

1. Loguearse en la cuenta correcta: `supabase login`
2. Inicializar (si no está): `supabase init`
3. Linkear al proyecto remoto: `supabase link --project-ref <ref>`
4. Aplicar migraciones: `supabase db push`
5. (Opcional) Cargar seed: copiar `supabase/seed.sql` al SQL editor del dashboard, o `supabase db reset` en local.
6. En el dashboard: **Authentication → Providers** habilitar **Email** y **Google** (cargar Client ID/Secret de Google Cloud Console y configurar redirect URLs).

## Uso desde un cliente

```ts
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Auth
await supabase.auth.signUp({ email, password });
await supabase.auth.signInWithPassword({ email, password });
await supabase.auth.signInWithOAuth({ provider: "google" });

// Crear empresa (el trigger te agrega como OWNER automáticamente)
await supabase.from("companies").insert({ name: "Hotel X", industry_id: "..." });

// Ver tus empresas (RLS solo deja ver donde sos miembro)
await supabase
  .from("companies")
  .select("*, company_tools(*, tools(*)), company_members(*)");

// Habilitar una herramienta
await supabase.from("company_tools").insert({ company_id, tool_id });
```

## Modelo

- `industries` — rubros (hotel, restaurant, ...). Lectura pública para autenticados.
- `tools` — catálogo de herramientas por rubro. Lectura pública para autenticados.
- `companies` — empresas registradas.
- `company_members` — usuarios ↔ empresas con roles (`OWNER`/`ADMIN`/`MEMBER`).
- `company_tools` — herramientas habilitadas por empresa.

La carga de `industries` y `tools` se hace desde el dashboard (service_role) — los clientes solo leen.

## Endpoints (REST autogenerada por PostgREST)

No hace falta crear Functions para el CRUD: Supabase expone automáticamente una REST API a partir del schema. Por cada tabla con permisos hay endpoints listos.

**Base URL:** `https://<ref>.supabase.co/rest/v1`

**Headers obligatorios:**
```
apikey: <SUPABASE_ANON_KEY>
Authorization: Bearer <user_jwt>   # el que devuelve signIn
Content-Type: application/json
```

Sin `Authorization` actuás como `anon` y RLS bloquea casi todo.

| Acción | Método | URL |
|---|---|---|
| Listar | GET | `/rest/v1/companies` |
| Filtrar | GET | `/rest/v1/companies?industry_id=eq.<uuid>` |
| Uno | GET | `/rest/v1/companies?id=eq.<uuid>` |
| Crear | POST | `/rest/v1/companies` |
| Update | PATCH | `/rest/v1/companies?id=eq.<uuid>` |
| Borrar | DELETE | `/rest/v1/companies?id=eq.<uuid>` |

Lo mismo para `industries`, `tools`, `company_tools`, `company_members`.

### Cómo conocer cada endpoint sin memorizarlos

En el dashboard de Supabase:

- **API Docs** (icono `< >` en el sidebar) → muestra cada tabla con ejemplos en `bash`/`JS` listos para copiar (filtros, inserts, joins). Se actualiza solo con tu schema.
- **Table Editor** → ver/editar filas a mano.
- **SQL Editor** → probar queries crudas.

### Ejemplo curl

```bash
curl -X POST 'https://<ref>.supabase.co/rest/v1/companies' \
  -H "apikey: $ANON_KEY" \
  -H "Authorization: Bearer $USER_JWT" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d '{"name":"Hotel X","industry_id":"<uuid>"}'
```

### ¿Cuándo sí necesito Edge Functions?

Solo para lógica que **no** se puede expresar en SQL/RLS:

- Llamar APIs externas (Stripe, mailing, IA).
- Webhooks entrantes.
- Operaciones que requieren `service_role` (saltar RLS de forma controlada).
- Trabajos pesados o que combinan varios pasos atómicos complejos.

Para el CRUD del proyecto actual no hacen falta.
