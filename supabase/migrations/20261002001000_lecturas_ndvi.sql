-- Serie de vigor por potrero. Es NDVI, no kilos de pasto.

create table if not exists public.lecturas_ndvi (
  id uuid primary key default gen_random_uuid(),
  potrero_id uuid not null references public.potreros (id) on delete cascade,
  fecha date not null,
  ndvi numeric not null check (ndvi > -0.2 and ndvi < 1),
  fuente text not null default 'sentinel2-pc',
  created_at timestamptz not null default now(),
  unique (potrero_id, fecha)
);

create index if not exists lecturas_ndvi_potrero_fecha_idx
  on public.lecturas_ndvi (potrero_id, fecha desc);

alter table public.lecturas_ndvi enable row level security;

drop policy if exists lecturas_ndvi_via_potrero on public.lecturas_ndvi;
create policy lecturas_ndvi_via_potrero on public.lecturas_ndvi
  for all to authenticated
  using (
    exists (
      select 1 from public.potreros p
      where p.id = lecturas_ndvi.potrero_id
        and public.is_est_member(p.establecimiento_id)
    )
  )
  with check (
    exists (
      select 1 from public.potreros p
      where p.id = lecturas_ndvi.potrero_id
        and public.is_est_member(p.establecimiento_id)
    )
  );

revoke all on table public.lecturas_ndvi from anon;
grant select, insert, update, delete on table public.lecturas_ndvi to authenticated;
