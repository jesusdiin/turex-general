-- Bucket público para fotos de negocios
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'company-photos',
  'company-photos',
  true,
  5 * 1024 * 1024,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

-- Lectura pública del bucket (es directorio público)
create policy "company photos are public readable"
on storage.objects for select
to anon, authenticated
using (bucket_id = 'company-photos');

-- Columna en companies con las URLs públicas, máximo 5
alter table public.companies
  add column photo_urls text[] not null default '{}'::text[];

alter table public.companies
  add constraint companies_photo_urls_max_5
  check (array_length(photo_urls, 1) is null or array_length(photo_urls, 1) <= 5);
