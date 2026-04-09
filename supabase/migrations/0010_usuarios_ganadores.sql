-- Tabla usuarios_ganadores (sin relaciones)
create table public.usuarios_ganadores (
  id         uuid primary key default gen_random_uuid(),
  nombre     text not null,
  telefono   text not null,
  created_at timestamptz not null default now()
);

-- RLS
alter table public.usuarios_ganadores enable row level security;

-- Anon puede insertar
create policy "anon_insert_usuarios_ganadores"
  on public.usuarios_ganadores for insert
  to anon
  with check (true);

-- Anon puede leer
create policy "anon_select_usuarios_ganadores"
  on public.usuarios_ganadores for select
  to anon
  using (true);
