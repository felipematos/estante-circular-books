alter table public.listings add column seller_cep_prefix text not null default '';
create or replace function public.listing_set_cep() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    select left(regexp_replace(cep,'\D','','g'),5) into new.seller_cep_prefix from public.profiles where id = new.seller_id;
  else new.seller_cep_prefix := old.seller_cep_prefix; end if;
  new.seller_cep_prefix := coalesce(new.seller_cep_prefix,'');
  return new;
end $$;
create trigger listings_cep before insert or update on public.listings for each row execute function public.listing_set_cep();