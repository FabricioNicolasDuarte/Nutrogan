-- La lectura de visión no puede apuntar a una evaluación, un evento o una foto de otro lote.
-- Cada modo exige sus propios campos y deja vacíos los demás.

alter table public.registros_vision
  drop constraint if exists registros_vision_modo_columnas_check;

alter table public.registros_vision
  add constraint registros_vision_modo_columnas_check check (
    (
      modo = 'condicion'
      and condicion_corporal is not null
      and gravedad is null
      and consistencia is null
      and color is null
      and presencia_parasitos is null
      and evento_sanitario_id is null
    )
    or (
      modo = 'anomalia'
      and gravedad is not null
      and condicion_corporal is null
      and consistencia is null
      and color is null
      and presencia_parasitos is null
      and evaluacion_id is null
    )
    or (
      modo = 'fecal'
      and consistencia is not null
      and color is not null
      and presencia_parasitos is not null
      and condicion_corporal is null
      and gravedad is null
      and evaluacion_id is null
    )
  );

create or replace function public.registros_vision_integridad()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.evaluacion_id is not null and not exists (
    select 1
    from public.evaluaciones e
    where e.id = new.evaluacion_id
      and e.lote_id = new.lote_id
  ) then
    raise exception 'La evaluación no es de este lote';
  end if;

  if new.evento_sanitario_id is not null and not exists (
    select 1
    from public.eventos_sanitarios s
    where s.id = new.evento_sanitario_id
      and s.lote_id = new.lote_id
  ) then
    raise exception 'El evento sanitario no es de este lote';
  end if;

  if new.foto_path is not null
     and split_part(new.foto_path, '/', 1) is distinct from new.lote_id::text then
    raise exception 'La foto no corresponde a este lote';
  end if;

  return new;
end;
$$;

drop trigger if exists registros_vision_integridad on public.registros_vision;
create trigger registros_vision_integridad
  before insert or update on public.registros_vision
  for each row
  execute function public.registros_vision_integridad();

revoke all on function public.registros_vision_integridad() from public;
grant execute on function public.registros_vision_integridad() to authenticated;

update storage.buckets
set file_size_limit = 5242880,
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']
where id = 'vision';

revoke all on table public.registros_vision from anon;
