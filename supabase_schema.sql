-- ============================================================
-- STOCKPRO — Esquema de base de datos Supabase / PostgreSQL
-- ============================================================

-- EXTENSIONES
create extension if not exists "uuid-ossp";

-- ============================================================
-- TABLA: depositos
-- ============================================================
create table depositos (
  id          uuid primary key default uuid_generate_v4(),
  nombre      text not null,
  responsable text not null,
  direccion   text,
  activo      boolean default true,
  created_at  timestamptz default now()
);

-- ============================================================
-- TABLA: categorias
-- ============================================================
create table categorias (
  id         uuid primary key default uuid_generate_v4(),
  nombre     text not null unique,
  created_at timestamptz default now()
);

-- ============================================================
-- TABLA: productos
-- ============================================================
create table productos (
  id           uuid primary key default uuid_generate_v4(),
  codigo       text not null unique,
  nombre       text not null,
  descripcion  text,
  categoria_id uuid references categorias(id),
  stock_minimo int default 0,
  activo       boolean default true,
  created_at   timestamptz default now()
);

-- ============================================================
-- TABLA: stock (stock teórico por depósito)
-- ============================================================
create table stock (
  id           uuid primary key default uuid_generate_v4(),
  producto_id  uuid references productos(id) on delete cascade,
  deposito_id  uuid references depositos(id) on delete cascade,
  cantidad     int not null default 0,
  updated_at   timestamptz default now(),
  unique(producto_id, deposito_id)
);

-- ============================================================
-- TABLA: controles_semanales (cabecera del control)
-- ============================================================
create table controles_semanales (
  id           uuid primary key default uuid_generate_v4(),
  deposito_id  uuid references depositos(id),
  semana       int not null,        -- número de semana ISO
  anio         int not null,
  fecha_carga  timestamptz default now(),
  usuario_id   uuid references auth.users(id),
  archivo_url  text,                -- path en Supabase Storage
  total_skus   int default 0,
  total_difs   int default 0,
  precision    numeric(5,2) default 0,
  estado       text default 'procesado' check (estado in ('procesado','revision','cerrado'))
);

-- ============================================================
-- TABLA: detalle_control (filas del archivo subido)
-- ============================================================
create table detalle_control (
  id              uuid primary key default uuid_generate_v4(),
  control_id      uuid references controles_semanales(id) on delete cascade,
  producto_id     uuid references productos(id),
  cantidad_teorica int not null,
  cantidad_real    int not null,
  diferencia       int generated always as (cantidad_real - cantidad_teorica) stored,
  created_at       timestamptz default now()
);

-- ============================================================
-- TABLA: transferencias (neteo entre depósitos)
-- ============================================================
create table transferencias (
  id              uuid primary key default uuid_generate_v4(),
  producto_id     uuid references productos(id),
  deposito_origen uuid references depositos(id),
  deposito_destino uuid references depositos(id),
  cantidad        int not null,
  prioridad       text default 'media' check (prioridad in ('urgente','alta','media','baja')),
  estado          text default 'pendiente' check (estado in ('pendiente','aprobada','completada','cancelada')),
  control_id      uuid references controles_semanales(id),
  usuario_id      uuid references auth.users(id),
  created_at      timestamptz default now(),
  completada_at   timestamptz
);

-- ============================================================
-- TABLA: movimientos (historial completo de trazabilidad)
-- ============================================================
create table movimientos (
  id              uuid primary key default uuid_generate_v4(),
  tipo            text not null check (tipo in ('entrada','salida','ajuste','transferencia','control')),
  producto_id     uuid references productos(id),
  deposito_id     uuid references depositos(id),
  cantidad        int not null,
  detalle         text,
  referencia_id   uuid,   -- puede apuntar a control o transferencia
  usuario_id      uuid references auth.users(id),
  created_at      timestamptz default now()
);

-- ============================================================
-- TABLA: perfiles de usuario (extiende auth.users)
-- ============================================================
create table perfiles (
  id       uuid primary key references auth.users(id) on delete cascade,
  nombre   text,
  rol      text default 'operador' check (rol in ('admin','supervisor','operador')),
  deposito_id uuid references depositos(id)   -- depósito asignado (null = todos)
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table depositos         enable row level security;
alter table productos         enable row level security;
alter table stock             enable row level security;
alter table controles_semanales enable row level security;
alter table detalle_control   enable row level security;
alter table transferencias    enable row level security;
alter table movimientos       enable row level security;
alter table perfiles          enable row level security;

-- Lectura libre para usuarios autenticados
create policy "Lectura autenticada" on depositos         for select using (auth.role() = 'authenticated');
create policy "Lectura autenticada" on productos         for select using (auth.role() = 'authenticated');
create policy "Lectura autenticada" on stock             for select using (auth.role() = 'authenticated');
create policy "Lectura autenticada" on controles_semanales for select using (auth.role() = 'authenticated');
create policy "Lectura autenticada" on detalle_control   for select using (auth.role() = 'authenticated');
create policy "Lectura autenticada" on transferencias    for select using (auth.role() = 'authenticated');
create policy "Lectura autenticada" on movimientos       for select using (auth.role() = 'authenticated');
create policy "Lectura propia"      on perfiles          for select using (auth.uid() = id);

-- Escritura: admin y supervisor
create policy "Escritura admin/supervisor" on stock for all
  using (exists (select 1 from perfiles where id = auth.uid() and rol in ('admin','supervisor')));

create policy "Escritura admin/supervisor" on controles_semanales for all
  using (exists (select 1 from perfiles where id = auth.uid() and rol in ('admin','supervisor','operador')));

create policy "Escritura admin/supervisor" on detalle_control for all
  using (exists (select 1 from perfiles where id = auth.uid() and rol in ('admin','supervisor','operador')));

create policy "Escritura admin/supervisor" on transferencias for all
  using (exists (select 1 from perfiles where id = auth.uid() and rol in ('admin','supervisor')));

create policy "Escritura movimientos" on movimientos for insert
  using (auth.role() = 'authenticated');

-- ============================================================
-- DATOS DE EJEMPLO
-- ============================================================

insert into depositos (nombre, responsable) values
  ('Depósito Norte',     'Martínez, Juan'),
  ('Depósito Sur',       'Gómez, Paula'),
  ('Depósito Centro',    'López, Andrés'),
  ('Depósito Este',      'Pérez, María'),
  ('Depósito Oeste',     'Torres, Luis'),
  ('Depósito Palermo',   'Silva, Roberto'),
  ('Depósito Avellaneda','Ruiz, Carlos'),
  ('Depósito Quilmes',   'Díaz, Federico');

insert into categorias (nombre) values
  ('Audio'),('Video'),('Telefonía'),
  ('Gaming'),('Electrodomésticos'),('Accesorios');

-- ============================================================
-- VISTAS ÚTILES
-- ============================================================

-- Vista: estado actual de cada depósito con conteo de diferencias semana actual
create or replace view v_estado_depositos as
select
  d.id,
  d.nombre,
  d.responsable,
  coalesce(cs.total_skus, 0) as total_skus,
  coalesce(cs.total_difs, 0) as total_diferencias,
  coalesce(cs.precision, 0)  as precision,
  case
    when coalesce(cs.total_difs, 0) <= 2  then 'verde'
    when coalesce(cs.total_difs, 0) <= 10 then 'amarillo'
    else 'rojo'
  end as estado_color,
  cs.semana,
  cs.anio
from depositos d
left join lateral (
  select * from controles_semanales
  where deposito_id = d.id
  order by anio desc, semana desc
  limit 1
) cs on true
where d.activo = true;

-- Vista: diferencias por producto en el último control de cada depósito
create or replace view v_diferencias_activas as
select
  d.nombre as deposito,
  p.codigo,
  p.nombre as producto,
  c.nombre as categoria,
  dc.cantidad_teorica,
  dc.cantidad_real,
  dc.diferencia,
  cs.semana,
  cs.anio,
  cs.fecha_carga
from detalle_control dc
join controles_semanales cs on dc.control_id = cs.id
join depositos d on cs.deposito_id = d.id
join productos p on dc.producto_id = p.id
join categorias c on p.categoria_id = c.id
where dc.diferencia != 0
order by abs(dc.diferencia) desc;
