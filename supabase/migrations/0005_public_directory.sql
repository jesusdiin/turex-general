-- Lectura pública (anon) del directorio de negocios abiertos
create policy "public can read open companies"
on public.companies for select
to anon
using (status = 'OPEN');

-- Anon también necesita leer industries para joinear el rubro
create policy "industries are readable by anon"
on public.industries for select
to anon
using (true);

-- Realtime: publicar cambios de companies para que el mobile escuche status
alter publication supabase_realtime add table public.companies;
