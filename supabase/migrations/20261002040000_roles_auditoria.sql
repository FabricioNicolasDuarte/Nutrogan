-- Cuatro roles y bitácora de acciones.
-- superadmin ve y gestiona la auditoría. El resto no.

alter type public.app_role add value if not exists 'superadmin';
alter type public.app_role add value if not exists 'administrador';
alter type public.app_role add value if not exists 'peon';
