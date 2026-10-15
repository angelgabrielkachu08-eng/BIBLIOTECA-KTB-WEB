create table if not exists public.lector_notas (
  id uuid primary key default gen_random_uuid(),
  owner_uid uuid not null references auth.users(id) on delete cascade,
  tipo text not null check (tipo in ('diccionario', 'cita')),
  contenido text not null check (length(btrim(contenido)) between 1 and 8000),
  palabra text,
  id_libro text,
  libro_titulo text,
  libro_autor text,
  libro_portada text,
  created_at timestamptz not null default now()
);

create index if not exists lector_notas_owner_created_idx
  on public.lector_notas (owner_uid, created_at desc);

alter table public.lector_notas enable row level security;

drop policy if exists "Readers can view their own notes" on public.lector_notas;
create policy "Readers can view their own notes"
  on public.lector_notas for select to authenticated
  using (auth.uid() = owner_uid);

drop policy if exists "Readers can save their own notes" on public.lector_notas;
create policy "Readers can save their own notes"
  on public.lector_notas for insert to authenticated
  with check (auth.uid() = owner_uid);

drop policy if exists "Readers can delete their own notes" on public.lector_notas;
create policy "Readers can delete their own notes"
  on public.lector_notas for delete to authenticated
  using (auth.uid() = owner_uid);

grant select, insert, delete on public.lector_notas to authenticated;
