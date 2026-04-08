-- 1. Permitir a anon leer cualquier company (no solo OPEN), para que
--    Realtime pueda entregar transiciones OPEN<->CLOSED bajo RLS.
drop policy if exists "public can read open companies" on public.companies;

create policy "public can read companies"
on public.companies for select
to anon
using (true);

-- 2. REPLICA IDENTITY FULL es requerido por Realtime para:
--    - evaluar RLS sobre la fila OLD en UPDATEs
--    - entregar `oldRecord` completo al cliente
alter table public.companies replica identity full;
