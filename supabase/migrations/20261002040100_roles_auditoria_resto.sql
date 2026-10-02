-- Se aplica después de agregar los valores del enum.

update public.miembros_establecimiento
set rol = 'administrador'::public.app_role
where rol = 'admin'::public.app_role;

update public.miembros_establecimiento
set rol = 'peon'::public.app_role
where rol = 'operario'::public.app_role;

update public.miembros_establecimiento m
set rol = 'superadmin'::public.app_role
from auth.users u
where m.usuario_id = u.id
  and lower(u.email) = 'fabricioduarteoficial@gmail.com';

update public.perfiles_usuarios p
set rol = m.rol::text
from public.miembros_establecimiento m
where p.id = m.usuario_id;

create or replace function public.es_gestor(est_id uuid)
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
      and m.rol in ('superadmin', 'administrador', 'admin')
  );
$$;

revoke all on function public.es_gestor(uuid) from public;
grant execute on function public.es_gestor(uuid) to authenticated;

drop policy if exists miembros_admin_write on public.miembros_establecimiento;
create policy miembros_admin_write on public.miembros_establecimiento
  for all to authenticated
  using (public.es_gestor(establecimiento_id))
  with check (public.es_gestor(establecimiento_id));

create or replace function public.miembros_rol_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return new;
  end if;
  if new.rol = 'superadmin'::public.app_role
     and not exists (
       select 1 from public.miembros_establecimiento
       where usuario_id = auth.uid() and rol = 'superadmin'::public.app_role
     ) then
    raise exception 'Solo un superadmin puede asignar ese rol';
  end if;
  return new;
end;
$$;

drop trigger if exists miembros_rol_guard on public.miembros_establecimiento;
create trigger miembros_rol_guard
  before insert or update of rol on public.miembros_establecimiento
  for each row execute function public.miembros_rol_guard();

create or replace function public.crear_usuario_secreto(
  p_email text, p_password text, p_nombre text, p_rol text, p_est_id uuid
) returns void
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  new_uid uuid;
  rol_ok public.app_role;
begin
  if not exists (
    select 1 from public.miembros_establecimiento
    where usuario_id = auth.uid()
      and rol in ('superadmin', 'administrador', 'admin')
  ) then
    raise exception 'ACCESO DENEGADO: Solo administradores pueden crear usuarios.';
  end if;

  rol_ok := p_rol::public.app_role;
  if rol_ok = 'superadmin'::public.app_role and not exists (
    select 1 from public.miembros_establecimiento
    where usuario_id = auth.uid() and rol = 'superadmin'::public.app_role
  ) then
    raise exception 'Solo un superadmin puede crear otro superadmin.';
  end if;

  if exists (select 1 from auth.users where email = p_email) then
    raise exception 'El usuario ya existe.';
  end if;

  new_uid := gen_random_uuid();

  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, recovery_token, email_change_token_new, email_change
  ) values (
    '00000000-0000-0000-0000-000000000000',
    new_uid, 'authenticated', 'authenticated', p_email,
    crypt(p_password, gen_salt('bf')), now(),
    '{"provider": "email", "providers": ["email"]}',
    jsonb_build_object('nombre', p_nombre),
    now(), now(), '', '', '', ''
  );

  insert into auth.identities (
    id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
  ) values (
    gen_random_uuid(), new_uid,
    jsonb_build_object('sub', new_uid::text, 'email', p_email),
    'email', new_uid::text, now(), now(), now()
  );

  insert into public.perfiles_usuarios (id, email, nombre_completo, rol, establecimiento_activo_id)
  values (new_uid, p_email, p_nombre, rol_ok::text, p_est_id)
  on conflict (id) do update
  set nombre_completo = excluded.nombre_completo, rol = excluded.rol;

  insert into public.miembros_establecimiento (usuario_id, establecimiento_id, rol)
  values (new_uid, p_est_id, rol_ok)
  on conflict (usuario_id, establecimiento_id) do update
  set rol = excluded.rol;
end;
$$;

create table if not exists public.auditoria (
  id uuid primary key default gen_random_uuid(),
  establecimiento_id uuid,
  usuario_id uuid,
  email text,
  accion text not null,
  tabla text,
  registro_id text,
  detalle text,
  created_at timestamptz not null default now()
);

create index if not exists auditoria_est_fecha_idx
  on public.auditoria (establecimiento_id, created_at desc);

alter table public.auditoria enable row level security;

drop policy if exists auditoria_super_select on public.auditoria;
create policy auditoria_super_select on public.auditoria
  for select to authenticated
  using (
    exists (
      select 1 from public.miembros_establecimiento m
      where m.usuario_id = auth.uid()
        and m.rol = 'superadmin'::public.app_role
        and (
          auditoria.establecimiento_id is null
          or m.establecimiento_id = auditoria.establecimiento_id
        )
    )
  );

revoke all on public.auditoria from anon;
grant select on public.auditoria to authenticated;

create or replace function public.registrar_auditoria()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  est uuid;
  rid text;
  fila jsonb;
begin
  if tg_op = 'DELETE' then
    fila := to_jsonb(old);
  else
    fila := to_jsonb(new);
  end if;

  if tg_table_name in (
    'evaluaciones', 'eventos_sanitarios', 'eventos_reproductivos',
    'movimientos_de_lotes', 'registros_vision', 'situaciones_lote', 'consumos_de_dieta'
  ) then
    select l.establecimiento_id into est
    from public.lotes l
    where l.id = (fila->>'lote_id')::uuid;
  elsif tg_table_name = 'inventario_movimientos' then
    select i.establecimiento_id into est
    from public.inventario_items i
    where i.id = (fila->>'item_id')::uuid;
  elsif tg_table_name = 'analisis_de_agua' then
    select f.establecimiento_id into est
    from public.fuentes_de_agua f
    where f.id = (fila->>'fuente_id')::uuid;
  else
    begin
      est := (fila->>'establecimiento_id')::uuid;
    exception when invalid_text_representation then
      est := null;
    end;
  end if;

  rid := fila->>'id';

  insert into public.auditoria (establecimiento_id, usuario_id, email, accion, tabla, registro_id)
  values (
    est,
    auth.uid(),
    nullif(auth.jwt()->>'email', ''),
    lower(tg_op),
    tg_table_name,
    rid
  );

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

do $$
declare
  t text;
  tables text[] := array[
    'lotes', 'potreros', 'evaluaciones', 'eventos_sanitarios', 'eventos_reproductivos',
    'movimientos_de_lotes', 'registros_lluvia', 'registros_vision', 'situaciones_lote',
    'inventario_items', 'inventario_movimientos', 'analisis_de_agua', 'fuentes_de_agua',
    'consumos_de_dieta', 'miembros_establecimiento'
  ];
begin
  foreach t in array tables loop
    if to_regclass('public.' || t) is null then
      continue;
    end if;
    execute format('drop trigger if exists auditoria_%I on public.%I', t, t);
    execute format(
      'create trigger auditoria_%I after insert or update or delete on public.%I for each row execute function public.registrar_auditoria()',
      t, t
    );
  end loop;
end $$;

create or replace function public.registrar_acceso(p_accion text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  est uuid;
begin
  if auth.uid() is null then
    return;
  end if;
  if p_accion not in ('login', 'logout') then
    raise exception 'Acción de acceso no válida';
  end if;
  select m.establecimiento_id into est
  from public.miembros_establecimiento m
  where m.usuario_id = auth.uid()
  order by (m.rol = 'superadmin'::public.app_role) desc
  limit 1;

  insert into public.auditoria (establecimiento_id, usuario_id, email, accion, tabla, detalle)
  values (est, auth.uid(), nullif(auth.jwt()->>'email', ''), p_accion, 'sesion', p_accion);
end;
$$;

revoke all on function public.registrar_acceso(text) from public;
grant execute on function public.registrar_acceso(text) to authenticated;

notify pgrst, 'reload schema';
