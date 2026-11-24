create table public.shipping_rates (
  id uuid primary key default gen_random_uuid(),
  region text not null check (region in ('N','NE','CO','SE','S')),
  max_weight_g integer not null check (max_weight_g between 1 and 30000),
  price_cents integer not null check (price_cents between 0 and 100000),
  unique (region, max_weight_g)
);
grant select on public.shipping_rates to anon, authenticated;
grant update on public.shipping_rates to authenticated;
grant all on public.shipping_rates to service_role;
alter table public.shipping_rates enable row level security;
create policy "rates public read" on public.shipping_rates for select to anon, authenticated using (true);
create policy "rates admin update" on public.shipping_rates for update to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

insert into public.shipping_rates (region, max_weight_g, price_cents)
select r, w, p from (values
 ('SE',300,1200),('SE',500,1500),('SE',1000,1900),('SE',2000,2500),('SE',5000,3800),('SE',10000,5500),
 ('S',300,1400),('S',500,1700),('S',1000,2200),('S',2000,2900),('S',5000,4300),('S',10000,6200),
 ('CO',300,1600),('CO',500,2000),('CO',1000,2500),('CO',2000,3300),('CO',5000,4900),('CO',10000,7000),
 ('NE',300,1800),('NE',500,2200),('NE',1000,2800),('NE',2000,3700),('NE',5000,5500),('NE',10000,8000),
 ('N',300,2200),('N',500,2700),('N',1000,3400),('N',2000,4500),('N',5000,6800),('N',10000,9800)
) v(r,w,p);

create or replace function public.cep_region(_cep text) returns text language sql immutable set search_path = public as $$
  select case
    when n is null then null
    when n < 40000 then 'SE'
    when n < 66000 then 'NE'
    when n < 70000 then 'N'
    when n between 76800 and 76999 or n between 77000 and 77999 then 'N'
    when n < 80000 then 'CO'
    else 'S' end
  from (select case when length(regexp_replace(coalesce(_cep,''),'\D','','g')) >= 5
    then left(regexp_replace(_cep,'\D','','g'),5)::int end as n) x
$$;

create or replace function public.quote_shipping(_weight_g integer, _cep text) returns integer language sql stable set search_path = public as $$
  select price_cents from public.shipping_rates
  where region = public.cep_region(_cep) and max_weight_g >= _weight_g
  order by max_weight_g limit 1
$$;
grant execute on function public.cep_region(text), public.quote_shipping(integer, text) to anon, authenticated;

create or replace function public.order_set_shipping() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.shipping_cents is null then new.shipping_cents := public.quote_shipping(new.weight_g, new.ship_cep); end if;
  return new;
end $$;
create trigger orders_shipping before insert on public.orders for each row execute function public.order_set_shipping();