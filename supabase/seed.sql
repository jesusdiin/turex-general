-- Seed data: industries y tools de ejemplo
insert into public.industries (slug, name, description) values
  ('hotel',      'Hotelería',  'Hoteles, hostales y alojamientos'),
  ('restaurant', 'Gastronomía','Restaurantes, bares y cafeterías')
on conflict (slug) do nothing;

insert into public.tools (slug, name, description, industry_id)
select 'hotel-reception', 'Recepción', 'Gestión de check-in/check-out', id
from public.industries where slug = 'hotel'
on conflict (slug) do nothing;

insert into public.tools (slug, name, description, industry_id)
select 'restaurant-orders', 'Comandas', 'Gestión de pedidos en mesa', id
from public.industries where slug = 'restaurant'
on conflict (slug) do nothing;
