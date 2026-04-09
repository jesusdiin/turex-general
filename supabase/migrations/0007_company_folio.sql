-- Folio amigable único por empresa (TRX-XXXXX en Crockford base32)

create sequence if not exists public.company_folio_seq
  start with 1
  increment by 1
  no cycle;

create or replace function public.to_crockford_base32(n bigint, min_len int default 5)
returns text
language plpgsql
immutable
as $$
declare
  alphabet constant text := '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
  out text := '';
  rem int;
begin
  if n < 0 then
    raise exception 'negative input not supported';
  end if;
  if n = 0 then
    out := '0';
  end if;
  while n > 0 loop
    rem := (n % 32)::int;
    out := substr(alphabet, rem + 1, 1) || out;
    n := n / 32;
  end loop;
  return lpad(out, min_len, '0');
end;
$$;

create or replace function public.generate_company_folio()
returns text
language sql
as $$
  select 'TRX-' || public.to_crockford_base32(nextval('public.company_folio_seq'), 5);
$$;

alter table public.companies
  add column folio text;

update public.companies
set folio = public.generate_company_folio()
where folio is null;

alter table public.companies
  alter column folio set default public.generate_company_folio(),
  alter column folio set not null,
  add constraint companies_folio_key unique (folio);
