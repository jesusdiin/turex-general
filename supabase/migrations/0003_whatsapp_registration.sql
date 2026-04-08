-- Contactos que llegan por WhatsApp (no dependen de auth.users)
create table public.wa_contacts (
  id            uuid primary key default gen_random_uuid(),
  whatsapp_from text not null unique,
  display_name  text,
  phone         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create trigger wa_contacts_set_updated_at
before update on public.wa_contacts
for each row execute function public.handle_updated_at();

-- Vínculo contacto ↔ empresa (paralelo a company_members, sin auth.users)
create table public.company_contacts (
  id         uuid primary key default gen_random_uuid(),
  contact_id uuid not null references public.wa_contacts(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  role       company_role not null default 'OWNER',
  created_at timestamptz not null default now(),
  unique (contact_id, company_id)
);

create index company_contacts_contact_id_idx on public.company_contacts(contact_id);
create index company_contacts_company_id_idx on public.company_contacts(company_id);

-- Estado de conversación del flujo de registro
create table public.wa_sessions (
  wa_from    text primary key,
  step       text not null,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create trigger wa_sessions_set_updated_at
before update on public.wa_sessions
for each row execute function public.handle_updated_at();

-- Extender companies con ubicación textual y teléfono de negocio
alter table public.companies
  add column if not exists location_text text,
  add column if not exists business_phone text;

-- RLS: enable pero sin policies (solo accesibles vía service_role)
alter table public.wa_contacts     enable row level security;
alter table public.company_contacts enable row level security;
alter table public.wa_sessions     enable row level security;
