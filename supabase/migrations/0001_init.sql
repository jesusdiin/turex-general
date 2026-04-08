-- Enums
create type company_size as enum ('MICRO', 'SMALL', 'MEDIUM');
create type company_role as enum ('OWNER', 'ADMIN', 'MEMBER');

-- updated_at trigger function
create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- industries
create table public.industries (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,
  name        text not null,
  description text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger industries_set_updated_at
before update on public.industries
for each row execute function public.handle_updated_at();

-- companies
create table public.companies (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  legal_name  text,
  tax_id      text unique,
  email       text,
  phone       text,
  size        company_size not null default 'MICRO',
  industry_id uuid not null references public.industries(id) on delete restrict,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index companies_industry_id_idx on public.companies(industry_id);

create trigger companies_set_updated_at
before update on public.companies
for each row execute function public.handle_updated_at();

-- tools
create table public.tools (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,
  name        text not null,
  description text,
  industry_id uuid not null references public.industries(id) on delete restrict,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index tools_industry_id_idx on public.tools(industry_id);

create trigger tools_set_updated_at
before update on public.tools
for each row execute function public.handle_updated_at();

-- company_tools (pivot)
create table public.company_tools (
  id         uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  tool_id    uuid not null references public.tools(id) on delete cascade,
  enabled    boolean not null default true,
  enabled_at timestamptz not null default now(),
  unique (company_id, tool_id)
);

create index company_tools_company_id_idx on public.company_tools(company_id);
create index company_tools_tool_id_idx on public.company_tools(tool_id);

-- company_members (users ↔ companies)
create table public.company_members (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  role       company_role not null default 'OWNER',
  created_at timestamptz not null default now(),
  unique (user_id, company_id)
);

create index company_members_user_id_idx on public.company_members(user_id);
create index company_members_company_id_idx on public.company_members(company_id);

-- Auto-add creator as OWNER on company insert
create or replace function public.handle_new_company()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null then
    insert into public.company_members (user_id, company_id, role)
    values (auth.uid(), new.id, 'OWNER');
  end if;
  return new;
end;
$$;

create trigger on_company_created
after insert on public.companies
for each row execute function public.handle_new_company();
