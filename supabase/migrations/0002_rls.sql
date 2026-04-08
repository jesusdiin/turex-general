-- Enable RLS on all business tables
alter table public.industries     enable row level security;
alter table public.tools          enable row level security;
alter table public.companies      enable row level security;
alter table public.company_members enable row level security;
alter table public.company_tools  enable row level security;

-- Helper: is the current user a member of the given company (with optional roles)
create or replace function public.is_company_member(_company_id uuid, _roles company_role[] default null)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.company_members m
    where m.company_id = _company_id
      and m.user_id = auth.uid()
      and (_roles is null or m.role = any(_roles))
  );
$$;

-- ---------- industries ----------
-- Lectura para cualquier autenticado; escritura solo service_role (sin policies = denegado a anon/authenticated)
create policy "industries are readable by authenticated"
on public.industries for select
to authenticated
using (true);

-- ---------- tools ----------
create policy "tools are readable by authenticated"
on public.tools for select
to authenticated
using (true);

-- ---------- companies ----------
create policy "members can read their companies"
on public.companies for select
to authenticated
using (public.is_company_member(id));

create policy "any authenticated user can create a company"
on public.companies for insert
to authenticated
with check (true);

create policy "owners/admins can update their company"
on public.companies for update
to authenticated
using (public.is_company_member(id, array['OWNER','ADMIN']::company_role[]))
with check (public.is_company_member(id, array['OWNER','ADMIN']::company_role[]));

create policy "owners can delete their company"
on public.companies for delete
to authenticated
using (public.is_company_member(id, array['OWNER']::company_role[]));

-- ---------- company_members ----------
create policy "users can read their memberships"
on public.company_members for select
to authenticated
using (
  user_id = auth.uid()
  or public.is_company_member(company_id)
);

create policy "owners can add members"
on public.company_members for insert
to authenticated
with check (public.is_company_member(company_id, array['OWNER']::company_role[]));

create policy "owners can update members"
on public.company_members for update
to authenticated
using (public.is_company_member(company_id, array['OWNER']::company_role[]))
with check (public.is_company_member(company_id, array['OWNER']::company_role[]));

create policy "owners can remove members or users can leave"
on public.company_members for delete
to authenticated
using (
  user_id = auth.uid()
  or public.is_company_member(company_id, array['OWNER']::company_role[])
);

-- ---------- company_tools ----------
create policy "members can read company tools"
on public.company_tools for select
to authenticated
using (public.is_company_member(company_id));

create policy "owners/admins can manage company tools - insert"
on public.company_tools for insert
to authenticated
with check (public.is_company_member(company_id, array['OWNER','ADMIN']::company_role[]));

create policy "owners/admins can manage company tools - update"
on public.company_tools for update
to authenticated
using (public.is_company_member(company_id, array['OWNER','ADMIN']::company_role[]))
with check (public.is_company_member(company_id, array['OWNER','ADMIN']::company_role[]));

create policy "owners/admins can manage company tools - delete"
on public.company_tools for delete
to authenticated
using (public.is_company_member(company_id, array['OWNER','ADMIN']::company_role[]));
