-- Visión: foto confirmada por lote.
-- La condición también se copia a evaluaciones.
-- Si la persona marca un hallazgo serio, se copia a eventos_sanitarios.

create table if not exists public.registros_vision (
  id uuid primary key default gen_random_uuid(),
  lote_id uuid not null references public.lotes (id) on delete cascade,
  modo text not null check (modo in ('condicion', 'anomalia', 'fecal')),
  fecha date not null default current_date,
  foto_path text,
  texto_modelo text,
  texto_confirmado text,
  condicion_corporal numeric check (condicion_corporal is null or (condicion_corporal >= 1 and condicion_corporal <= 9)),
  gravedad text check (gravedad is null or gravedad in ('baja', 'seria')),
  consistencia text,
  color text,
  presencia_parasitos boolean,
  evaluacion_id uuid references public.evaluaciones (id) on delete set null,
  evento_sanitario_id uuid references public.eventos_sanitarios (id) on delete set null,
  created_by uuid,
  created_at timestamptz not null default now()
);

create index if not exists registros_vision_lote_fecha_idx
  on public.registros_vision (lote_id, fecha desc);

alter table public.registros_vision enable row level security;

drop policy if exists registros_vision_via_lote on public.registros_vision;
create policy registros_vision_via_lote on public.registros_vision
  for all to authenticated
  using (
    exists (
      select 1 from public.lotes l
      where l.id = registros_vision.lote_id
        and public.is_est_member(l.establecimiento_id)
    )
  )
  with check (
    exists (
      select 1 from public.lotes l
      where l.id = registros_vision.lote_id
        and public.is_est_member(l.establecimiento_id)
    )
  );

insert into storage.buckets (id, name, public)
values ('vision', 'vision', false)
on conflict (id) do nothing;

drop policy if exists vision_select_member on storage.objects;
create policy vision_select_member on storage.objects
  for select to authenticated
  using (
    bucket_id = 'vision'
    and exists (
      select 1 from public.lotes l
      where l.id::text = (storage.foldername(name))[1]
        and public.is_est_member(l.establecimiento_id)
    )
  );

drop policy if exists vision_insert_member on storage.objects;
create policy vision_insert_member on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'vision'
    and exists (
      select 1 from public.lotes l
      where l.id::text = (storage.foldername(name))[1]
        and public.is_est_member(l.establecimiento_id)
    )
  );

drop policy if exists vision_delete_member on storage.objects;
create policy vision_delete_member on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'vision'
    and exists (
      select 1 from public.lotes l
      where l.id::text = (storage.foldername(name))[1]
        and public.is_est_member(l.establecimiento_id)
    )
  );
