-- Ejecutar una vez en el SQL Editor de Supabase.
-- Crea el espacio público de portadas y PDFs de Biblioteca KTB.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('biblioteca-archivos', 'biblioteca-archivos', true, 52428800, array['application/pdf','image/jpeg','image/png','image/webp'])
on conflict (id) do update set public = true;

create policy "lectura publica archivos biblioteca"
on storage.objects for select
using (bucket_id = 'biblioteca-archivos');

create policy "administradores cargan archivos biblioteca"
on storage.objects for insert
with check (
  bucket_id = 'biblioteca-archivos'
  and exists (
    select 1 from public.usuarios
    where id_rol = 1 and lower(email) = lower(auth.jwt() ->> 'email')
  )
);

create policy "administradores actualizan archivos biblioteca"
on storage.objects for update
using (
  bucket_id = 'biblioteca-archivos'
  and exists (
    select 1 from public.usuarios
    where id_rol = 1 and lower(email) = lower(auth.jwt() ->> 'email')
  )
);
