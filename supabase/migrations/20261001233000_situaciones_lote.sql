-- Situaciones libres del lote. El texto no diagnostica.
-- pedir_revision es la persona diciendo que la decisión y la alerta lo tomen en cuenta.

create table if not exists public.situaciones_lote (
  id uuid primary key default gen_random_uuid(),
  lote_id uuid not null references public.lotes (id) on delete cascade,
  fecha date not null default current_date,
  ambito text not null check (ambito in ('sanidad', 'potrero', 'comida', 'hacienda', 'agua', 'otro')),
  tipo text not null check (char_length(btrim(tipo)) between 1 and 80),
  detalle text,
  pedir_revision boolean not null default false,
  created_by uuid,
  created_at timestamptz not null default now()
);

create index if not exists situaciones_lote_lote_fecha_idx
  on public.situaciones_lote (lote_id, fecha desc);

alter table public.situaciones_lote enable row level security;

drop policy if exists situaciones_lote_via_lote on public.situaciones_lote;
create policy situaciones_lote_via_lote on public.situaciones_lote
  for all to authenticated
  using (
    exists (
      select 1 from public.lotes l
      where l.id = situaciones_lote.lote_id
        and public.is_est_member(l.establecimiento_id)
    )
  )
  with check (
    exists (
      select 1 from public.lotes l
      where l.id = situaciones_lote.lote_id
        and public.is_est_member(l.establecimiento_id)
    )
  );

revoke all on table public.situaciones_lote from anon;
grant select, insert, update, delete on table public.situaciones_lote to authenticated;
