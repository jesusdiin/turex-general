-- Seed data: industries y tools de ejemplo
insert into public.industries (slug, name, description) values
  ('hotel',       'Hotelería',               'Hoteles, hostales y alojamientos'),
  ('restaurant',  'Gastronomía',             'Restaurantes, bares y cafeterías'),
  ('street_food', 'Cocina tradicional',      'Fondas, puestos de antojitos y comida casera'),
  ('artesanias',  'Artesanías',              'Talleres de artesanía y manualidades'),
  ('abarrotes',   'Abarrotes y miscelánea',  'Tienditas, abarrotes y misceláneas'),
  ('belleza',     'Belleza',                 'Estéticas, barberías y salones'),
  ('taller',      'Talleres y reparaciones', 'Mecánicos, electrónica y reparaciones'),
  ('ropa',        'Ropa y calzado',          'Tiendas de ropa, calzado y accesorios'),
  ('lavanderia',  'Lavandería',              'Lavanderías y tintorerías'),
  ('talent_land',  'Talent Land',              'Talend Land')
on conflict (slug) do nothing;

insert into public.tools (slug, name, description, industry_id)
select 'hotel-reception', 'Recepción', 'Gestión de check-in/check-out', id
from public.industries where slug = 'hotel'
on conflict (slug) do nothing;

insert into public.tools (slug, name, description, industry_id)
select 'restaurant-orders', 'Comandas', 'Gestión de pedidos en mesa', id
from public.industries where slug = 'restaurant'
on conflict (slug) do nothing;

insert into public.tools (slug, name, description, industry_id)
select 'street-food-menu', 'Menú del día', 'Gestión simple de menú diario', id
from public.industries where slug = 'street_food'
on conflict (slug) do nothing;

insert into public.tools (slug, name, description, industry_id)
select 'crafts-catalog', 'Catálogo de piezas', 'Catálogo de productos artesanales', id
from public.industries where slug = 'artesanias'
on conflict (slug) do nothing;

insert into public.tools (slug, name, description, industry_id)
select 'grocery-inventory', 'Inventario básico', 'Control de productos en estante', id
from public.industries where slug = 'abarrotes'
on conflict (slug) do nothing;

insert into public.tools (slug, name, description, industry_id)
select 'beauty-bookings', 'Citas', 'Agenda de citas y servicios', id
from public.industries where slug = 'belleza'
on conflict (slug) do nothing;

insert into public.tools (slug, name, description, industry_id)
select 'workshop-orders', 'Órdenes de servicio', 'Registro de reparaciones en curso', id
from public.industries where slug = 'taller'
on conflict (slug) do nothing;

insert into public.tools (slug, name, description, industry_id)
select 'clothing-stock', 'Stock de tallas', 'Control de tallas y colores', id
from public.industries where slug = 'ropa'
on conflict (slug) do nothing;

insert into public.tools (slug, name, description, industry_id)
select 'laundry-tickets', 'Tickets de lavado', 'Seguimiento de prendas por cliente', id
from public.industries where slug = 'lavanderia'
on conflict (slug) do nothing;

insert into public.tools (slug, name, description, industry_id)
select 'talent-land-stands', 'Listados de stands', 'Gestión de stands para talentos', id
from public.industries where slug = 'talent_land'
on conflict (slug) do nothing;

