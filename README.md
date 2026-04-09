### 2. README para el Back-end (TypeScript/Supabase)
**Repositorio:** `jesusdiin/turex-general`
frontend: https://github.com/RonaldoAO/frontend_turex_negocio
backend: https://github.com/jesusdiin/turex-general
```markdown
# TUREX - Backend: Inteligencia de Negocio y Gestión via WhatsApp


## 📌 Visión General
Este es el motor central de **TUREX**. Se encarga de la orquestación de datos, la lógica de gamificación y, lo más importante, la democratización tecnológica para el micro-negocio local mediante una interfaz invisible basada en **Inteligencia Artificial Conversacional**.

## ⚙️ Funcionalidades Core
* **Agente de IA (WhatsApp Business API):** Gestión total del negocio mediante lenguaje natural. El artesano o cocinera administra inventarios, disponibilidad y ventas enviando audios o mensajes de texto.
* **Motor de Visibilidad Inteligente:** Algoritmo que balancea el flujo de turistas. Si un negocio alcanza su capacidad operativa, la IA redistribuye la visibilidad para proteger la calidad del servicio y la reputación del local.
* **Gestión de Activos Digitales:** Lógica de validación para el sistema de recompensas y misiones del turista.
* **Soberanía de Datos:** Registro preciso de la derrama económica local para generar métricas de impacto real.

## 🛠️ Arquitectura Técnica
* **Lenguaje:** TypeScript (Node.js)
* **Base de Datos:** PostgreSQL (vía Supabase)
* **Servicios Cloud:** Supabase (Auth, Edge Functions, Realtime)
* **IA Engine:** Integración con LLMs (OpenAI/Anthropic) para el procesamiento de lenguaje natural en WhatsApp.

## 📊 Estrategia de Retención (Oaxaca 2026)
El backend está configurado para el puente logístico:
* **19 Julio:** Final Mundial (Pico de demanda).
* **20 Julio:** Inicio Guelaguetza (Activación TUREX).
La infraestructura soporta la carga masiva de transacciones durante esta ventana de oro cultural.


---

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
