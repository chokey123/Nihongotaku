begin;

create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_profile (
    id,
    display_name,
    role,
    created_by,
    updated_by
  )
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)),
    'user',
    new.id,
    new.id
  )
  on conflict (id) do update
  set
    display_name = coalesce(public.user_profile.display_name, excluded.display_name),
    updated_by = excluded.updated_by,
    updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_create_profile on auth.users;

create trigger on_auth_user_created_create_profile
after insert on auth.users
for each row execute procedure public.handle_new_user_profile();

commit;
