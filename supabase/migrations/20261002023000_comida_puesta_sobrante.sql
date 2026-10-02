-- El uso guarda cuánto se puso y cuánto sobró.
-- Lo que sale del stock es la diferencia. El tipo queda en Uso o Compra,
-- que es lo que lee la decisión del lote.

alter table public.inventario_movimientos
  add column if not exists cantidad_puesta numeric,
  add column if not exists cantidad_sobrante numeric;

alter table public.inventario_movimientos
  drop constraint if exists inventario_movimientos_comida_check;

alter table public.inventario_movimientos
  add constraint inventario_movimientos_comida_check check (
    (cantidad_puesta is null or cantidad_puesta >= 0)
    and (cantidad_sobrante is null or cantidad_sobrante >= 0)
    and (
      cantidad_puesta is null
      or cantidad_sobrante is null
      or cantidad_sobrante <= cantidad_puesta
    )
  );

update public.inventario_movimientos
set tipo_movimiento = 'Uso'
where lower(tipo_movimiento) = 'consumo';

update public.inventario_movimientos
set tipo_movimiento = 'Compra'
where lower(tipo_movimiento) = 'ingreso';

drop function if exists public.registrar_movimiento_inventario(uuid, numeric);

create function public.registrar_movimiento_inventario(
  p_item_id uuid,
  p_cantidad numeric,
  p_lote_id uuid default null,
  p_tipo_movimiento text default null,
  p_costo_total numeric default null,
  p_observaciones text default null,
  p_cantidad_puesta numeric default null,
  p_cantidad_sobrante numeric default null
) returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_tipo text;
  v_costo numeric;
begin
  if not exists (select 1 from public.inventario_items where id = p_item_id) then
    raise exception 'Item de inventario no encontrado';
  end if;

  if p_cantidad_puesta is not null and p_cantidad_puesta < 0 then
    raise exception 'Lo puesto no puede ser negativo';
  end if;
  if p_cantidad_sobrante is not null and p_cantidad_sobrante < 0 then
    raise exception 'Lo que sobró no puede ser negativo';
  end if;
  if p_cantidad_puesta is not null
     and p_cantidad_sobrante is not null
     and p_cantidad_sobrante > p_cantidad_puesta then
    raise exception 'No puede sobrar más de lo que se puso';
  end if;

  v_tipo := coalesce(
    nullif(btrim(p_tipo_movimiento), ''),
    case when p_cantidad < 0 then 'Uso' when p_cantidad > 0 then 'Compra' else 'Uso' end
  );

  update public.inventario_items
  set stock_actual = stock_actual + p_cantidad,
      updated_at = now()
  where id = p_item_id;

  if p_costo_total is null and p_cantidad < 0 then
    select abs(p_cantidad) * precio_unitario into v_costo
    from public.inventario_items
    where id = p_item_id;
  else
    v_costo := p_costo_total;
  end if;

  insert into public.inventario_movimientos (
    item_id, lote_id, cantidad, fecha, tipo_movimiento, costo_total,
    observaciones, cantidad_puesta, cantidad_sobrante
  ) values (
    p_item_id, p_lote_id, p_cantidad, now(), v_tipo, v_costo,
    p_observaciones, p_cantidad_puesta, p_cantidad_sobrante
  );
end;
$$;

revoke all on function public.registrar_movimiento_inventario(uuid, numeric, uuid, text, numeric, text, numeric, numeric) from public;
grant execute on function public.registrar_movimiento_inventario(uuid, numeric, uuid, text, numeric, text, numeric, numeric) to authenticated;

notify pgrst, 'reload schema';
