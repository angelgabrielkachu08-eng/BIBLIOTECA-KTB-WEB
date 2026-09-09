-- Ejecutar una vez en el SQL Editor de Supabase.
-- Todo registro nuevo en Auth (Google u otro proveedor) recibe automáticamente el rol de usuario/lector.
create or replace function public.crear_perfil_lector_automatico()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  rol_lector bigint;
  nombre_lector text;
  apellido_lector text;
begin
  select id_rol into rol_lector
  from public.roles
  where lower(nombre) in ('usuario', 'lector', 'user')
  order by id_rol
  limit 1;

  rol_lector := coalesce(rol_lector, 2);
  nombre_lector := coalesce(nullif(new.raw_user_meta_data ->> 'given_name', ''), nullif(split_part(coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', ''), ' ', 1), ''), 'Lector');
  apellido_lector := nullif(trim(regexp_replace(coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', ''), '^\\S+\\s*', '')), '');

  insert into public.usuarios (nombre, apellido, email, id_rol)
  select nombre_lector, apellido_lector, lower(new.email), rol_lector
  where new.email is not null
    and not exists (select 1 from public.usuarios where lower(email) = lower(new.email));
  return new;
end;
$$;

drop trigger if exists alta_automatica_lector on auth.users;
create trigger alta_automatica_lector
after insert on auth.users
for each row execute procedure public.crear_perfil_lector_automatico();

-- Completa también los perfiles de Auth que ya existan y aún no estén en usuarios.
insert into public.usuarios (nombre, apellido, email, id_rol)
select coalesce(nullif(split_part(coalesce(u.raw_user_meta_data ->> 'full_name', u.raw_user_meta_data ->> 'name', ''), ' ', 1), ''), 'Lector'),
       nullif(trim(regexp_replace(coalesce(u.raw_user_meta_data ->> 'full_name', u.raw_user_meta_data ->> 'name', ''), '^\\S+\\s*', '')), ''),
       lower(u.email),
       coalesce((select id_rol from public.roles where lower(nombre) in ('usuario', 'lector', 'user') order by id_rol limit 1), 2)
from auth.users u
where u.email is not null
  and not exists (select 1 from public.usuarios p where lower(p.email) = lower(u.email));
