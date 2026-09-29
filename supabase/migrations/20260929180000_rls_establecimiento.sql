-- Nutrogan — helpers + RLS multi-tenant (establecimiento)
-- Aplicar en Supabase SQL Editor o: supabase db push
-- Revisar en Studio antes de prod: no fuerza DROP de policies existentes.

-- 1) Helper: ¿el usuario autenticado es miembro del establecimiento?
create or replace function public.is_est_member(est_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.miembros_establecimiento m
    where m.establecimiento_id = est_id
      and m.usuario_id = auth.uid()
  );
$$;

revoke all on function public.is_est_member(uuid) from public;
grant execute on function public.is_est_member(uuid) to authenticated;

-- 2) Helper: rol del usuario en el establecimiento
create or replace function public.est_role(est_id uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select m.rol
  from public.miembros_establecimiento m
  where m.establecimiento_id = est_id
    and m.usuario_id = auth.uid()
  limit 1;
$$;

revoke all on function public.est_role(uuid) from public;
grant execute on function public.est_role(uuid) to authenticated;

-- 3) Policies por tabla con establecimiento_id
-- Patrón: SELECT/INSERT/UPDATE/DELETE si is_est_member(establecimiento_id)
-- Tablas objetivo (ajustar nombres de columna si difieren en el proyecto cloud):

do $$
declare
  t text;
  tables text[] := array[
    'lotes',
    'potreros',
    'fuentes_de_agua',
    'registros_lluvia',
    'dietas',
    'inventario_items',
    'notificaciones_programadas',
    'invitaciones_equipo'
  ];
begin
  foreach t in array tables
  loop
    if to_regclass('public.' || t) is null then
      raise notice 'skip missing table %', t;
      continue;
    end if;

    execute format('alter table public.%I enable row level security', t);

    execute format('drop policy if exists %I on public.%I', t || '_select_member', t);
    execute format(
      'create policy %I on public.%I for select to authenticated using (public.is_est_member(establecimiento_id))',
      t || '_select_member', t
    );

    execute format('drop policy if exists %I on public.%I', t || '_insert_member', t);
    execute format(
      'create policy %I on public.%I for insert to authenticated with check (public.is_est_member(establecimiento_id))',
      t || '_insert_member', t
    );

    execute format('drop policy if exists %I on public.%I', t || '_update_member', t);
    execute format(
      'create policy %I on public.%I for update to authenticated using (public.is_est_member(establecimiento_id)) with check (public.is_est_member(establecimiento_id))',
      t || '_update_member', t
    );

    execute format('drop policy if exists %I on public.%I', t || '_delete_member', t);
    execute format(
      'create policy %I on public.%I for delete to authenticated using (public.is_est_member(establecimiento_id))',
      t || '_delete_member', t
    );
  end loop;
end $$;

-- 4) miembros_establecimiento: ver solo filas de establecimientos donde sos miembro
do $$
begin
  if to_regclass('public.miembros_establecimiento') is null then
    return;
  end if;
  alter table public.miembros_establecimiento enable row level security;
  drop policy if exists miembros_select_self_est on public.miembros_establecimiento;
  create policy miembros_select_self_est on public.miembros_establecimiento
    for select to authenticated
    using (public.is_est_member(establecimiento_id));
  drop policy if exists miembros_admin_write on public.miembros_establecimiento;
  create policy miembros_admin_write on public.miembros_establecimiento
    for all to authenticated
    using (public.est_role(establecimiento_id) = 'admin')
    with check (public.est_role(establecimiento_id) = 'admin');
end $$;

-- 5) perfiles_usuarios: cada uno ve/edita el suyo
do $$
begin
  if to_regclass('public.perfiles_usuarios') is null then
    return;
  end if;
  alter table public.perfiles_usuarios enable row level security;
  drop policy if exists perfiles_select_own on public.perfiles_usuarios;
  create policy perfiles_select_own on public.perfiles_usuarios
    for select to authenticated using (id = auth.uid());
  drop policy if exists perfiles_update_own on public.perfiles_usuarios;
  create policy perfiles_update_own on public.perfiles_usuarios
    for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
end $$;

-- 6) Tablas hijas por lote_id (sin establecimiento_id directo)
-- evaluaciones, eventos_*, consumos, movimientos_de_lotes → vía lote.establecimiento_id
do $$
declare
  child text;
  children text[] := array[
    'evaluaciones',
    'eventos_sanitarios',
    'eventos_reproductivos',
    'consumos_de_dieta',
    'movimientos_de_lotes'
  ];
begin
  foreach child in array children
  loop
    if to_regclass('public.' || child) is null then
      raise notice 'skip missing child %', child;
      continue;
    end if;
    execute format('alter table public.%I enable row level security', child);
    execute format('drop policy if exists %I on public.%I', child || '_via_lote', child);
    execute format(
      $f$
      create policy %I on public.%I for all to authenticated
      using (
        exists (
          select 1 from public.lotes l
          where l.id = %I.lote_id and public.is_est_member(l.establecimiento_id)
        )
      )
      with check (
        exists (
          select 1 from public.lotes l
          where l.id = %I.lote_id and public.is_est_member(l.establecimiento_id)
        )
      )
      $f$,
      child || '_via_lote', child, child, child
    );
  end loop;
end $$;

-- 7) inventario_movimientos vía item
do $$
begin
  if to_regclass('public.inventario_movimientos') is null then
    return;
  end if;
  alter table public.inventario_movimientos enable row level security;
  drop policy if exists inv_mov_via_item on public.inventario_movimientos;
  create policy inv_mov_via_item on public.inventario_movimientos
    for all to authenticated
    using (
      exists (
        select 1 from public.inventario_items i
        where (i.id = inventario_movimientos.item_id or i.id = inventario_movimientos.inventario_item_id)
          and public.is_est_member(i.establecimiento_id)
      )
    )
    with check (
      exists (
        select 1 from public.inventario_items i
        where (i.id = inventario_movimientos.item_id or i.id = inventario_movimientos.inventario_item_id)
          and public.is_est_member(i.establecimiento_id)
      )
    );
exception
  when undefined_column then
    raise notice 'inventario_movimientos: ajustar columnas item_id / inventario_item_id en Studio';
end $$;

-- Nota: analisis_de_agua, dietas_items, alimentos — revisar FKs en Studio y añadir policies análogas.
-- Edge functions usan service_role y bypasean RLS.
