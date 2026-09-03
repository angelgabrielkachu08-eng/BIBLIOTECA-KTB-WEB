-- Ejecutar una sola vez en el SQL Editor de Supabase.
-- Extiende las tablas existentes sin cambiar sus nombres ni relaciones.
alter table public.reservas add column if not exists dias_prestamo smallint;
alter table public.reservas add column if not exists fecha_limite date;
alter table public.reservas add constraint reservas_dias_prestamo_maximo check (dias_prestamo is null or dias_prestamo between 1 and 7);

alter table public.valoraciones add column if not exists comentario text;
alter table public.valoraciones add column if not exists estado text not null default 'Pendiente';
alter table public.valoraciones add column if not exists fecha_moderacion timestamptz;
update public.valoraciones set estado = 'Aprobada' where estado is null or estado = 'Pendiente';
