-- Status operativo del negocio (abierto/cerrado)
alter table public.companies
  add column status text not null default 'OPEN'
  check (status in ('OPEN', 'CLOSED'));
