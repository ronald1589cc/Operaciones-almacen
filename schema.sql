-- ============================================================
-- MODELO DE DATOS - SISTEMA DE GESTION DE INVENTARIO
-- Supabase (PostgreSQL)
-- ============================================================

create extension if not exists "pgcrypto";

-- TABLA NUEVA: profiles
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role text not null default 'operator' check (role in ('admin', 'operator')),
  created_at timestamp with time zone default now()
);
comment on table profiles is 'Perfil de negocio de cada usuario autenticado: nombre y rol (admin/operator).';

-- TABLA NUEVA: warehouse_locations
create table if not exists warehouse_locations (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  zone text,
  rack text,
  position text,
  capacity integer default 1,
  is_occupied boolean not null default false,
  created_at timestamp with time zone default now()
);
comment on table warehouse_locations is 'Mapa del almacen: zonas, racks y posiciones disponibles para asignar inventario.';

-- TABLA ORIGINAL: inventory_items
create table if not exists inventory_items (
  id uuid primary key default gen_random_uuid(),
  sku text not null unique,
  name text not null,
  description text,
  category text,
  weight numeric,
  length numeric,
  width numeric,
  height numeric,
  price numeric not null default 0,
  cost numeric not null default 0,
  supplier text,
  created_at timestamp with time zone default now()
);
comment on table inventory_items is 'Informacion maestra de cada articulo del catalogo.';

-- TABLA ORIGINAL: inventory
create table if not exists inventory (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null unique references inventory_items(id) on delete cascade,
  quantity integer not null default 0,
  location text,
  min_stock integer not null default 0,
  max_stock integer,
  updated_at timestamp with time zone default now()
);
comment on table inventory is 'Stock actual por articulo. Relacion 1 a 1 con inventory_items (unique en item_id).';

-- TABLA ORIGINAL: inventory_movements
create table if not exists inventory_movements (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references inventory_items(id) on delete cascade,
  inventory_id uuid not null references inventory(id) on delete cascade,
  movement_type text not null check (movement_type in ('Entrada', 'Salida', 'Ajuste')),
  quantity integer not null check (quantity > 0),
  reason text,
  status text not null default 'Pendiente' check (status in ('Pendiente', 'Aprobado', 'Rechazado')),
  created_at timestamp with time zone default now(),
  approved_at timestamp with time zone,
  notes text
);
comment on table inventory_movements is 'Historial de movimientos (Entrada/Salida/Ajuste). El stock solo se actualiza cuando status pasa a Aprobado.';

-- TABLA NUEVA: movement_audit_log
create table if not exists movement_audit_log (
  id uuid primary key default gen_random_uuid(),
  movement_id uuid not null references inventory_movements(id) on delete cascade,
  previous_status text,
  new_status text not null check (new_status in ('Pendiente', 'Aprobado', 'Rechazado')),
  changed_by uuid references profiles(id),
  changed_at timestamp with time zone default now(),
  notes text
);
comment on table movement_audit_log is 'Historial de cada cambio de estado de un movimiento: quien lo hizo, cuando, y de que estado a que estado.';

-- TABLA NUEVA: brands
create table if not exists brands (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamp with time zone default now()
);
comment on table brands is 'Catalogo de marcas de los articulos (ej: Nike, Adidas, Puma).';

-- TABLA NUEVA: categories
create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamp with time zone default now()
);
comment on table categories is 'Catalogo de categorias de articulos (ej: Running, Casual, Lifestyle).';

-- TABLA NUEVA: suppliers
create table if not exists suppliers (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  contact_name text,
  contact_email text,
  contact_phone text,
  created_at timestamp with time zone default now()
);
comment on table suppliers is 'Catalogo de proveedores/distribuidores, con datos de contacto.';

-- TABLA NUEVA: location_reservations
create table if not exists location_reservations (
  id uuid primary key default gen_random_uuid(),
  location_id uuid not null references warehouse_locations(id) on delete cascade,
  movement_id uuid not null references inventory_movements(id) on delete cascade,
  reservation_type text not null check (reservation_type in ('INBOUND', 'OUTBOUND')),
  status text not null default 'Reservado' check (status in ('Reservado', 'Liberado', 'Confirmado')),
  created_at timestamp with time zone default now(),
  released_at timestamp with time zone
);
comment on table location_reservations is 'Reserva de una posicion del almacen asociada a un movimiento pendiente. INBOUND reserva espacio de llegada, OUTBOUND prepara el origen antes de ejecutar el picking.';

-- INDICES DE APOYO
create index if not exists idx_inventory_items_category on inventory_items(category);
create index if not exists idx_inventory_items_supplier on inventory_items(supplier);
create index if not exists idx_inventory_movements_status on inventory_movements(status);
create index if not exists idx_inventory_movements_item on inventory_movements(item_id);
create index if not exists idx_warehouse_locations_occupied on warehouse_locations(is_occupied);
create index if not exists idx_movement_audit_log_movement on movement_audit_log(movement_id);
create index if not exists idx_location_reservations_location on location_reservations(location_id);
create index if not exists idx_location_reservations_movement on location_reservations(movement_id);
create index if not exists idx_location_reservations_status on location_reservations(status);
;

-- ============================================================
-- FUNCION AUXILIAR: is_admin()
-- Evita recursion al consultar el rol del usuario dentro de
-- politicas sobre la propia tabla profiles
-- ============================================================
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- ============================================================
-- ACTIVAR RLS EN LAS 10 TABLAS
-- ============================================================
alter table profiles enable row level security;
alter table warehouse_locations enable row level security;
alter table inventory_items enable row level security;
alter table inventory enable row level security;
alter table inventory_movements enable row level security;
alter table movement_audit_log enable row level security;
alter table brands enable row level security;
alter table categories enable row level security;
alter table suppliers enable row level security;
alter table location_reservations enable row level security;

-- ============================================================
-- POLITICAS: profiles
-- ============================================================
create policy "select_all_profiles" on profiles
  for select to authenticated using (true);

create policy "insert_own_profile" on profiles
  for insert to authenticated
  with check (id = auth.uid() and role = 'operator');

create policy "update_own_profile_no_role_change" on profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid() and role = (select role from profiles where id = auth.uid()));

create policy "admin_manage_profiles" on profiles
  for update to authenticated
  using (is_admin())
  with check (true);

create policy "admin_delete_profiles" on profiles
  for delete to authenticated using (is_admin());

-- ============================================================
-- POLITICAS: inventory_items
-- ============================================================
create policy "select_items" on inventory_items for select to authenticated using (true);
create policy "insert_items" on inventory_items for insert to authenticated with check (true);
create policy "update_items" on inventory_items for update to authenticated using (true) with check (true);
create policy "delete_items" on inventory_items for delete to authenticated using (true);

-- ============================================================
-- POLITICAS: inventory
-- ============================================================
create policy "select_inventory" on inventory for select to authenticated using (true);
create policy "insert_inventory" on inventory for insert to authenticated with check (true);
create policy "update_inventory" on inventory for update to authenticated using (true) with check (true);
create policy "delete_inventory" on inventory for delete to authenticated using (true);

-- ============================================================
-- POLITICAS: inventory_movements
-- INSERT: cualquier autenticado, pero forzado a nacer Pendiente
-- UPDATE (cambiar estado): solo admin
-- DELETE: nadie (se preserva el historial completo)
-- ============================================================
create policy "select_movements" on inventory_movements for select to authenticated using (true);
create policy "insert_movements" on inventory_movements
  for insert to authenticated
  with check (status = 'Pendiente');
create policy "admin_update_movements" on inventory_movements
  for update to authenticated
  using (is_admin())
  with check (is_admin());

-- ============================================================
-- POLITICAS: movement_audit_log
-- Solo lectura directa. La escritura quedara a cargo de una
-- funcion del sistema (security definer) en el paso 2, no de
-- politicas directas de INSERT/UPDATE/DELETE.
-- ============================================================
create policy "select_audit_log" on movement_audit_log for select to authenticated using (true);

-- ============================================================
-- POLITICAS: warehouse_locations
-- ============================================================
create policy "select_locations" on warehouse_locations for select to authenticated using (true);
create policy "insert_locations" on warehouse_locations for insert to authenticated with check (true);
create policy "update_locations" on warehouse_locations for update to authenticated using (true) with check (true);
create policy "delete_locations" on warehouse_locations for delete to authenticated using (true);

-- ============================================================
-- POLITICAS: location_reservations
-- ============================================================
create policy "select_reservations" on location_reservations for select to authenticated using (true);
create policy "insert_reservations" on location_reservations for insert to authenticated with check (true);
create policy "update_reservations" on location_reservations for update to authenticated using (true) with check (true);
create policy "delete_reservations" on location_reservations for delete to authenticated using (true);

-- ============================================================
-- POLITICAS: brands, categories, suppliers (catalogos)
-- ============================================================
create policy "select_brands" on brands for select to authenticated using (true);
create policy "insert_brands" on brands for insert to authenticated with check (true);
create policy "update_brands" on brands for update to authenticated using (true) with check (true);
create policy "delete_brands" on brands for delete to authenticated using (true);

create policy "select_categories" on categories for select to authenticated using (true);
create policy "insert_categories" on categories for insert to authenticated with check (true);
create policy "update_categories" on categories for update to authenticated using (true) with check (true);
create policy "delete_categories" on categories for delete to authenticated using (true);

create policy "select_suppliers" on suppliers for select to authenticated using (true);
create policy "insert_suppliers" on suppliers for insert to authenticated with check (true);
create policy "update_suppliers" on suppliers for update to authenticated using (true) with check (true);
create policy "delete_suppliers" on suppliers for delete to authenticated using (true);
;

-- Solo usuarios autenticados pueden ejecutar is_admin(); se revoca a anon y public
revoke execute on function public.is_admin() from public;
revoke execute on function public.is_admin() from anon;
grant execute on function public.is_admin() to authenticated;
;

-- ============================================================
-- FUNCION: approve_movement(movement_id)
-- Aprueba un movimiento PENDIENTE: actualiza stock, confirma
-- reserva de ubicacion, marca ocupacion y deja auditoria.
-- Se ejecuta en una sola transaccion (todo o nada).
-- ============================================================
create or replace function public.approve_movement(p_movement_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_movement inventory_movements%rowtype;
  v_inventory inventory%rowtype;
  v_reservation location_reservations%rowtype;
begin
  -- Solo administradores pueden aprobar
  if not is_admin() then
    raise exception 'Solo un administrador puede aprobar movimientos';
  end if;

  -- Bloquea la fila del movimiento para evitar aprobaciones dobles simultaneas
  select * into v_movement
  from inventory_movements
  where id = p_movement_id
  for update;

  if not found then
    raise exception 'Movimiento % no existe', p_movement_id;
  end if;

  if v_movement.status <> 'Pendiente' then
    raise exception 'El movimiento ya fue procesado (estado actual: %)', v_movement.status;
  end if;

  -- Bloquea la fila de inventario afectada
  select * into v_inventory
  from inventory
  where id = v_movement.inventory_id
  for update;

  -- Aplica el efecto sobre el stock segun el tipo de movimiento
  if v_movement.movement_type = 'Entrada' then
    update inventory
    set quantity = quantity + v_movement.quantity,
        updated_at = now()
    where id = v_inventory.id;

  elsif v_movement.movement_type = 'Salida' then
    if v_inventory.quantity < v_movement.quantity then
      raise exception 'Stock insuficiente: disponible %, solicitado %', v_inventory.quantity, v_movement.quantity;
    end if;
    update inventory
    set quantity = quantity - v_movement.quantity,
        updated_at = now()
    where id = v_inventory.id;

  elsif v_movement.movement_type = 'Ajuste' then
    -- Interpretacion: el Ajuste establece el stock a un valor absoluto
    -- (ej. correccion tras conteo fisico), no suma ni resta.
    update inventory
    set quantity = v_movement.quantity,
        updated_at = now()
    where id = v_inventory.id;
  end if;

  -- Cambia el estado del movimiento
  update inventory_movements
  set status = 'Aprobado',
      approved_at = now()
  where id = p_movement_id;

  -- Deja registro en la auditoria
  insert into movement_audit_log (movement_id, previous_status, new_status, changed_by, changed_at)
  values (p_movement_id, 'Pendiente', 'Aprobado', auth.uid(), now());

  -- Si existe una reserva de ubicacion asociada, se confirma
  select * into v_reservation
  from location_reservations
  where movement_id = p_movement_id and status = 'Reservado'
  limit 1;

  if found then
    update location_reservations
    set status = 'Confirmado'
    where id = v_reservation.id;

    -- INBOUND confirmado: la posicion queda ocupada.
    -- OUTBOUND confirmado: la mercaderia salio, la posicion se libera.
    if v_reservation.reservation_type = 'INBOUND' then
      update warehouse_locations set is_occupied = true where id = v_reservation.location_id;
    elsif v_reservation.reservation_type = 'OUTBOUND' then
      update warehouse_locations set is_occupied = false where id = v_reservation.location_id;
    end if;
  end if;
end;
$$;

-- ============================================================
-- FUNCION: reject_movement(movement_id)
-- Rechaza un movimiento PENDIENTE: NO toca el stock, libera
-- la reserva de ubicacion si existia, y deja auditoria.
-- ============================================================
create or replace function public.reject_movement(p_movement_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_movement inventory_movements%rowtype;
begin
  if not is_admin() then
    raise exception 'Solo un administrador puede rechazar movimientos';
  end if;

  select * into v_movement
  from inventory_movements
  where id = p_movement_id
  for update;

  if not found then
    raise exception 'Movimiento % no existe', p_movement_id;
  end if;

  if v_movement.status <> 'Pendiente' then
    raise exception 'El movimiento ya fue procesado (estado actual: %)', v_movement.status;
  end if;

  -- Cambia el estado, sin tocar inventory.quantity
  update inventory_movements
  set status = 'Rechazado'
  where id = p_movement_id;

  insert into movement_audit_log (movement_id, previous_status, new_status, changed_by, changed_at)
  values (p_movement_id, 'Pendiente', 'Rechazado', auth.uid(), now());

  -- Libera la reserva de ubicacion si existia (la posicion no llega a ocuparse)
  update location_reservations
  set status = 'Liberado', released_at = now()
  where movement_id = p_movement_id and status = 'Reservado';
end;
$$;

-- Solo usuarios autenticados pueden invocar estas funciones (la funcion
-- internamente valida ademas que sean admin antes de ejecutar el cambio)
revoke execute on function public.approve_movement(uuid) from public;
revoke execute on function public.approve_movement(uuid) from anon;
grant execute on function public.approve_movement(uuid) to authenticated;

revoke execute on function public.reject_movement(uuid) from public;
revoke execute on function public.reject_movement(uuid) from anon;
grant execute on function public.reject_movement(uuid) to authenticated;
;

alter table inventory_items add column if not exists brand text;
alter table inventory_items add column if not exists size text;
comment on column inventory_items.brand is 'Marca del articulo (ej: Nike, Adidas). Agregada al cargar datos de ejemplo.';
comment on column inventory_items.size is 'Talla del articulo (ej: 42). Agregada al cargar datos de ejemplo.';
;

insert into inventory_movements (item_id, inventory_id, movement_type, quantity, reason, status, created_at, approved_at)
select ii.id, inv.id, 'Entrada', 30, 'Carga inicial (INBOUND)', 'Pendiente', '2026-09-08'::timestamptz, null
  from inventory_items ii join inventory inv on inv.item_id = ii.id where ii.sku = 'ZAP-001'
union all
select ii.id, inv.id, 'Entrada', 50, 'Carga inicial (INBOUND)', 'Aprobado', '2026-09-08'::timestamptz, '2026-09-08'::timestamptz
  from inventory_items ii join inventory inv on inv.item_id = ii.id where ii.sku = 'ZAP-002'
union all
select ii.id, inv.id, 'Salida', 12, 'Carga inicial (OUTBOUND)', 'Aprobado', '2026-09-07'::timestamptz, '2026-09-07'::timestamptz
  from inventory_items ii join inventory inv on inv.item_id = ii.id where ii.sku = 'ZAP-003'
union all
select ii.id, inv.id, 'Salida', 8, 'Carga inicial (OUTBOUND)', 'Pendiente', '2026-09-07'::timestamptz, null
  from inventory_items ii join inventory inv on inv.item_id = ii.id where ii.sku = 'ZAP-004'
union all
select ii.id, inv.id, 'Entrada', 40, 'Carga inicial (INBOUND)', 'Aprobado', '2026-09-06'::timestamptz, '2026-09-06'::timestamptz
  from inventory_items ii join inventory inv on inv.item_id = ii.id where ii.sku = 'ZAP-005'
union all
select ii.id, inv.id, 'Salida', 15, 'Carga inicial (OUTBOUND)', 'Pendiente', '2026-09-06'::timestamptz, null
  from inventory_items ii join inventory inv on inv.item_id = ii.id where ii.sku = 'ZAP-006'
union all
select ii.id, inv.id, 'Entrada', 60, 'Carga inicial (INBOUND)', 'Aprobado', '2026-09-05'::timestamptz, '2026-09-05'::timestamptz
  from inventory_items ii join inventory inv on inv.item_id = ii.id where ii.sku = 'ZAP-007'
union all
select ii.id, inv.id, 'Salida', 10, 'Carga inicial (OUTBOUND)', 'Rechazado', '2026-09-05'::timestamptz, null
  from inventory_items ii join inventory inv on inv.item_id = ii.id where ii.sku = 'ZAP-008'
union all
select ii.id, inv.id, 'Entrada', 30, 'Carga inicial (INBOUND)', 'Pendiente', '2026-09-04'::timestamptz, null
  from inventory_items ii join inventory inv on inv.item_id = ii.id where ii.sku = 'ZAP-009'
union all
select ii.id, inv.id, 'Salida', 5, 'Carga inicial (OUTBOUND)', 'Aprobado', '2026-09-04'::timestamptz, '2026-09-04'::timestamptz
  from inventory_items ii join inventory inv on inv.item_id = ii.id where ii.sku = 'ZAP-010'
union all
select ii.id, inv.id, 'Entrada', 25, 'Carga inicial (INBOUND)', 'Aprobado', '2026-09-03'::timestamptz, '2026-09-03'::timestamptz
  from inventory_items ii join inventory inv on inv.item_id = ii.id where ii.sku = 'ZAP-011'
union all
select ii.id, inv.id, 'Salida', 7, 'Carga inicial (OUTBOUND)', 'Pendiente', '2026-09-03'::timestamptz, null
  from inventory_items ii join inventory inv on inv.item_id = ii.id where ii.sku = 'ZAP-012'
union all
select ii.id, inv.id, 'Entrada', 20, 'Carga inicial (INBOUND)', 'Aprobado', '2026-09-02'::timestamptz, '2026-09-02'::timestamptz
  from inventory_items ii join inventory inv on inv.item_id = ii.id where ii.sku = 'ZAP-013'
union all
select ii.id, inv.id, 'Salida', 4, 'Carga inicial (OUTBOUND)', 'Pendiente', '2026-09-01'::timestamptz, null
  from inventory_items ii join inventory inv on inv.item_id = ii.id where ii.sku = 'ZAP-014'
union all
select ii.id, inv.id, 'Entrada', 35, 'Carga inicial (INBOUND)', 'Pendiente', '2026-08-31'::timestamptz, null
  from inventory_items ii join inventory inv on inv.item_id = ii.id where ii.sku = 'ZAP-015'
union all
select ii.id, inv.id, 'Salida', 9, 'Carga inicial (OUTBOUND)', 'Aprobado', '2026-08-30'::timestamptz, '2026-08-30'::timestamptz
  from inventory_items ii join inventory inv on inv.item_id = ii.id where ii.sku = 'ZAP-016'
union all
select ii.id, inv.id, 'Entrada', 18, 'Carga inicial (INBOUND)', 'Pendiente', '2026-08-29'::timestamptz, null
  from inventory_items ii join inventory inv on inv.item_id = ii.id where ii.sku = 'ZAP-017'
union all
select ii.id, inv.id, 'Salida', 6, 'Carga inicial (OUTBOUND)', 'Rechazado', '2026-08-28'::timestamptz, null
  from inventory_items ii join inventory inv on inv.item_id = ii.id where ii.sku = 'ZAP-018'
union all
select ii.id, inv.id, 'Entrada', 25, 'Carga inicial (INBOUND)', 'Aprobado', '2026-08-27'::timestamptz, '2026-08-27'::timestamptz
  from inventory_items ii join inventory inv on inv.item_id = ii.id where ii.sku = 'ZAP-019'
union all
select ii.id, inv.id, 'Salida', 20, 'Carga inicial (OUTBOUND)', 'Pendiente', '2026-08-26'::timestamptz, null
  from inventory_items ii join inventory inv on inv.item_id = ii.id where ii.sku = 'ZAP-020';
;

-- CATALOGOS
insert into categories (name) values
  ('Running'), ('Casual'), ('Lifestyle')
on conflict (name) do nothing;

insert into brands (name) values
  ('Nike'), ('Adidas'), ('Puma'), ('Converse'), ('New Balance'),
  ('Vans'), ('Reebok'), ('Asics'), ('Fila'), ('Under Armour')
on conflict (name) do nothing;

insert into suppliers (name) values
  ('Proveedor Andino'), ('Importadora Lima'), ('Sport House'),
  ('Nike Peru'), ('Adidas Peru')
on conflict (name) do nothing;

-- UBICACIONES
insert into warehouse_locations (code, zone, rack, position, capacity, is_occupied) values
  ('A-03-02', 'Almacén A', 'Rack-03', 'A-03-02', 1, true),
  ('A-01-03', 'Almacén A', 'Rack-01', 'A-01-03', 1, true),
  ('B-02-01', 'Bodega B',  'Rack-02', 'B-02-01', 1, true),
  ('B-04-02', 'Bodega B',  'Rack-04', 'B-04-02', 1, true),
  ('A-05-01', 'Almacén A', 'Rack-05', 'A-05-01', 1, true),
  ('C-02-03', 'Bodega C',  'Rack-02', 'C-02-03', 1, true),
  ('A-03-04', 'Almacén A', 'Rack-03', 'A-03-04', 1, true),
  ('B-01-02', 'Bodega B',  'Rack-01', 'B-01-02', 1, true),
  ('A-05-03', 'Almacén A', 'Rack-05', 'A-05-03', 1, true),
  ('C-02-01', 'Bodega C',  'Rack-02', 'C-02-01', 1, true),
  ('A-06-02', 'Almacén A', 'Rack-06', 'A-06-02', 1, true),
  ('B-04-03', 'Bodega B',  'Rack-04', 'B-04-03', 1, true),
  ('A-03-01', 'Almacén A', 'Rack-03', 'A-03-01', 1, true),
  ('C-02-02', 'Bodega C',  'Rack-02', 'C-02-02', 1, true),
  ('A-05-04', 'Almacén A', 'Rack-05', 'A-05-04', 1, true),
  ('B-04-01', 'Bodega B',  'Rack-04', 'B-04-01', 1, true),
  ('A-01-04', 'Almacén A', 'Rack-01', 'A-01-04', 1, true),
  ('C-06-02', 'Bodega C',  'Rack-06', 'C-06-02', 1, true),
  ('A-03-03', 'Almacén A', 'Rack-03', 'A-03-03', 1, true),
  ('B-02-04', 'Bodega B',  'Rack-02', 'B-02-04', 1, true)
on conflict (code) do nothing;

-- ARTICULOS
insert into inventory_items (sku, name, category, supplier, brand, size, price, cost) values
  ('ZAP-001', 'Nike Air Max 90',        'Running',   'Proveedor Andino',  'Nike',         '42', 0, 0),
  ('ZAP-002', 'Adidas Runfalcon 3',     'Running',   'Importadora Lima',  'Adidas',       '40', 0, 0),
  ('ZAP-003', 'Puma Smash v2',          'Casual',    'Sport House',       'Puma',         '41', 0, 0),
  ('ZAP-004', 'Converse Chuck Taylor',  'Casual',    'Proveedor Andino',  'Converse',     '39', 0, 0),
  ('ZAP-005', 'New Balance 574',        'Lifestyle', 'Importadora Lima',  'New Balance',  '43', 0, 0),
  ('ZAP-006', 'Vans Old Skool',         'Casual',    'Sport House',       'Vans',         '38', 0, 0),
  ('ZAP-007', 'Nike Revolution 7',      'Running',   'Nike Peru',         'Nike',         '44', 0, 0),
  ('ZAP-008', 'Adidas Superstar',       'Casual',    'Adidas Peru',       'Adidas',       '40', 0, 0),
  ('ZAP-009', 'Reebok Club C 85',       'Casual',    'Importadora Lima',  'Reebok',       '42', 0, 0),
  ('ZAP-010', 'Asics Gel Contend',      'Running',   'Sport House',       'Asics',        '41', 0, 0),
  ('ZAP-011', 'Fila Disruptor II',      'Lifestyle', 'Proveedor Andino',  'Fila',         '39', 0, 0),
  ('ZAP-012', 'Under Armour Charged',   'Running',   'Importadora Lima',  'Under Armour', '43', 0, 0),
  ('ZAP-013', 'Nike Court Vision',      'Casual',    'Nike Peru',         'Nike',         '40', 0, 0),
  ('ZAP-014', 'Puma Future Rider',      'Lifestyle', 'Sport House',       'Puma',         '42', 0, 0),
  ('ZAP-015', 'New Balance Fresh Foam', 'Running',   'Importadora Lima',  'New Balance',  '44', 0, 0),
  ('ZAP-016', 'Vans Authentic',         'Casual',    'Sport House',       'Vans',         '37', 0, 0),
  ('ZAP-017', 'Adidas Ultraboost',      'Running',   'Adidas Peru',       'Adidas',       '42', 0, 0),
  ('ZAP-018', 'Converse Run Star',      'Lifestyle', 'Proveedor Andino',  'Converse',     '38', 0, 0),
  ('ZAP-019', 'Nike Pegasus',           'Running',   'Nike Peru',         'Nike',         '41', 0, 0),
  ('ZAP-020', 'Puma Suede Classic',     'Casual',    'Sport House',       'Puma',         '40', 0, 0)
on conflict (sku) do nothing;

-- STOCK
insert into inventory (item_id, quantity, location, min_stock)
select id, 120, 'Almacén A', 15 from inventory_items where sku = 'ZAP-001'
union all select id, 85,  'Almacén A', 10 from inventory_items where sku = 'ZAP-002'
union all select id, 60,  'Bodega B',  8  from inventory_items where sku = 'ZAP-003'
union all select id, 45,  'Bodega B',  5  from inventory_items where sku = 'ZAP-004'
union all select id, 70,  'Almacén A', 10 from inventory_items where sku = 'ZAP-005'
union all select id, 55,  'Bodega C',  7  from inventory_items where sku = 'ZAP-006'
union all select id, 90,  'Almacén A', 12 from inventory_items where sku = 'ZAP-007'
union all select id, 35,  'Bodega B',  6  from inventory_items where sku = 'ZAP-008'
union all select id, 48,  'Almacén A', 6  from inventory_items where sku = 'ZAP-009'
union all select id, 25,  'Bodega C',  5  from inventory_items where sku = 'ZAP-010'
union all select id, 32,  'Almacén A', 5  from inventory_items where sku = 'ZAP-011'
union all select id, 18,  'Bodega B',  4  from inventory_items where sku = 'ZAP-012'
union all select id, 52,  'Almacén A', 7  from inventory_items where sku = 'ZAP-013'
union all select id, 20,  'Bodega C',  5  from inventory_items where sku = 'ZAP-014'
union all select id, 15,  'Almacén A', 4  from inventory_items where sku = 'ZAP-015'
union all select id, 40,  'Bodega B',  6  from inventory_items where sku = 'ZAP-016'
union all select id, 22,  'Almacén A', 5  from inventory_items where sku = 'ZAP-017'
union all select id, 27,  'Bodega C',  5  from inventory_items where sku = 'ZAP-018'
union all select id, 8,   'Almacén A', 10 from inventory_items where sku = 'ZAP-019'
union all select id, 95,  'Bodega B',  12 from inventory_items where sku = 'ZAP-020'
on conflict (item_id) do nothing;
;

insert into inventory_movements (item_id, inventory_id, movement_type, quantity, reason, status, created_at, approved_at)
select ii.id, inv.id, 'Entrada', 30, 'Carga inicial (INBOUND)', 'Pendiente', '2026-09-08'::timestamptz, null
  from inventory_items ii join inventory inv on inv.item_id = ii.id where ii.sku = 'ZAP-001'
union all
select ii.id, inv.id, 'Entrada', 50, 'Carga inicial (INBOUND)', 'Aprobado', '2026-09-08'::timestamptz, '2026-09-08'::timestamptz
  from inventory_items ii join inventory inv on inv.item_id = ii.id where ii.sku = 'ZAP-002'
union all
select ii.id, inv.id, 'Salida', 12, 'Carga inicial (OUTBOUND)', 'Aprobado', '2026-09-07'::timestamptz, '2026-09-07'::timestamptz
  from inventory_items ii join inventory inv on inv.item_id = ii.id where ii.sku = 'ZAP-003'
union all
select ii.id, inv.id, 'Salida', 8, 'Carga inicial (OUTBOUND)', 'Pendiente', '2026-09-07'::timestamptz, null
  from inventory_items ii join inventory inv on inv.item_id = ii.id where ii.sku = 'ZAP-004'
union all
select ii.id, inv.id, 'Entrada', 40, 'Carga inicial (INBOUND)', 'Aprobado', '2026-09-06'::timestamptz, '2026-09-06'::timestamptz
  from inventory_items ii join inventory inv on inv.item_id = ii.id where ii.sku = 'ZAP-005'
union all
select ii.id, inv.id, 'Salida', 15, 'Carga inicial (OUTBOUND)', 'Pendiente', '2026-09-06'::timestamptz, null
  from inventory_items ii join inventory inv on inv.item_id = ii.id where ii.sku = 'ZAP-006'
union all
select ii.id, inv.id, 'Entrada', 60, 'Carga inicial (INBOUND)', 'Aprobado', '2026-09-05'::timestamptz, '2026-09-05'::timestamptz
  from inventory_items ii join inventory inv on inv.item_id = ii.id where ii.sku = 'ZAP-007'
union all
select ii.id, inv.id, 'Salida', 10, 'Carga inicial (OUTBOUND)', 'Rechazado', '2026-09-05'::timestamptz, null
  from inventory_items ii join inventory inv on inv.item_id = ii.id where ii.sku = 'ZAP-008'
union all
select ii.id, inv.id, 'Entrada', 30, 'Carga inicial (INBOUND)', 'Pendiente', '2026-09-04'::timestamptz, null
  from inventory_items ii join inventory inv on inv.item_id = ii.id where ii.sku = 'ZAP-009'
union all
select ii.id, inv.id, 'Salida', 5, 'Carga inicial (OUTBOUND)', 'Aprobado', '2026-09-04'::timestamptz, '2026-09-04'::timestamptz
  from inventory_items ii join inventory inv on inv.item_id = ii.id where ii.sku = 'ZAP-010'
union all
select ii.id, inv.id, 'Entrada', 25, 'Carga inicial (INBOUND)', 'Aprobado', '2026-09-03'::timestamptz, '2026-09-03'::timestamptz
  from inventory_items ii join inventory inv on inv.item_id = ii.id where ii.sku = 'ZAP-011'
union all
select ii.id, inv.id, 'Salida', 7, 'Carga inicial (OUTBOUND)', 'Pendiente', '2026-09-03'::timestamptz, null
  from inventory_items ii join inventory inv on inv.item_id = ii.id where ii.sku = 'ZAP-012'
union all
select ii.id, inv.id, 'Entrada', 20, 'Carga inicial (INBOUND)', 'Aprobado', '2026-09-02'::timestamptz, '2026-09-02'::timestamptz
  from inventory_items ii join inventory inv on inv.item_id = ii.id where ii.sku = 'ZAP-013'
union all
select ii.id, inv.id, 'Salida', 4, 'Carga inicial (OUTBOUND)', 'Pendiente', '2026-09-01'::timestamptz, null
  from inventory_items ii join inventory inv on inv.item_id = ii.id where ii.sku = 'ZAP-014'
union all
select ii.id, inv.id, 'Entrada', 35, 'Carga inicial (INBOUND)', 'Pendiente', '2026-08-31'::timestamptz, null
  from inventory_items ii join inventory inv on inv.item_id = ii.id where ii.sku = 'ZAP-015'
union all
select ii.id, inv.id, 'Salida', 9, 'Carga inicial (OUTBOUND)', 'Aprobado', '2026-08-30'::timestamptz, '2026-08-30'::timestamptz
  from inventory_items ii join inventory inv on inv.item_id = ii.id where ii.sku = 'ZAP-016'
union all
select ii.id, inv.id, 'Entrada', 18, 'Carga inicial (INBOUND)', 'Pendiente', '2026-08-29'::timestamptz, null
  from inventory_items ii join inventory inv on inv.item_id = ii.id where ii.sku = 'ZAP-017'
union all
select ii.id, inv.id, 'Salida', 6, 'Carga inicial (OUTBOUND)', 'Rechazado', '2026-08-28'::timestamptz, null
  from inventory_items ii join inventory inv on inv.item_id = ii.id where ii.sku = 'ZAP-018'
union all
select ii.id, inv.id, 'Entrada', 25, 'Carga inicial (INBOUND)', 'Aprobado', '2026-08-27'::timestamptz, '2026-08-27'::timestamptz
  from inventory_items ii join inventory inv on inv.item_id = ii.id where ii.sku = 'ZAP-019'
union all
select ii.id, inv.id, 'Salida', 20, 'Carga inicial (OUTBOUND)', 'Pendiente', '2026-08-26'::timestamptz, null
  from inventory_items ii join inventory inv on inv.item_id = ii.id where ii.sku = 'ZAP-020';
;

-- ============================================================
-- Conecta inventory con warehouse_locations por una FK real,
-- en vez de depender solo del texto libre en inventory.location.
-- Se mantiene la columna "location" (texto) como referencia
-- legible, pero la relacion real y exigible pasa a ser location_id.
-- ============================================================
alter table inventory add column if not exists location_id uuid references warehouse_locations(id);

-- Backfill: cada item ya tenia una posicion especifica en la
-- imagen original, que es la misma que se uso como "code" en
-- warehouse_locations al cargar el seed.
update inventory inv
set location_id = wl.id
from inventory_items ii
join warehouse_locations wl on wl.code = case ii.sku
  when 'ZAP-001' then 'A-03-02'
  when 'ZAP-002' then 'A-01-03'
  when 'ZAP-003' then 'B-02-01'
  when 'ZAP-004' then 'B-04-02'
  when 'ZAP-005' then 'A-05-01'
  when 'ZAP-006' then 'C-02-03'
  when 'ZAP-007' then 'A-03-04'
  when 'ZAP-008' then 'B-01-02'
  when 'ZAP-009' then 'A-05-03'
  when 'ZAP-010' then 'C-02-01'
  when 'ZAP-011' then 'A-06-02'
  when 'ZAP-012' then 'B-04-03'
  when 'ZAP-013' then 'A-03-01'
  when 'ZAP-014' then 'C-02-02'
  when 'ZAP-015' then 'A-05-04'
  when 'ZAP-016' then 'B-04-01'
  when 'ZAP-017' then 'A-01-04'
  when 'ZAP-018' then 'C-06-02'
  when 'ZAP-019' then 'A-03-03'
  when 'ZAP-020' then 'B-02-04'
end
where inv.item_id = ii.id;

-- Restriccion clave: un mismo espacio no puede estar asignado
-- a mas de un registro de inventario (resuelve "evitar dos
-- productos en el mismo espacio" a nivel de base de datos, no
-- solo de buena voluntad del frontend).
alter table inventory add constraint inventory_location_id_unique unique (location_id);
;