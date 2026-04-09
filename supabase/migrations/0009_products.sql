-- Products table
create table public.products (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references public.companies(id) on delete cascade,
  name        text not null,
  description text,
  price       numeric(10,2) not null check (price >= 0),
  category    text,
  photo_url   text,
  available   boolean not null default true,
  sort_order  int not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index products_company_id_idx on public.products(company_id);
create index products_company_available_idx on public.products(company_id) where available = true;

create trigger products_set_updated_at
before update on public.products
for each row execute function public.handle_updated_at();

-- RLS
alter table public.products enable row level security;

create policy "public can read products of open companies"
on public.products for select to anon
using (exists (
  select 1 from public.companies c where c.id = company_id and c.status = 'OPEN'
));

-- Storage bucket for product photos (3 MB)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('product-photos', 'product-photos', true, 3145728, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

create policy "product photos are public readable"
on storage.objects for select to anon, authenticated
using (bucket_id = 'product-photos');
