
create type public.app_role as enum ('admin','user');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  phone text not null default '',
  account_type text not null default 'pf' check (account_type in ('pf','pj')),
  document text not null default '',
  store_name text not null default '',
  pix_key text not null default '',
  cep text not null default '',
  street text not null default '',
  number text not null default '',
  complement text not null default '',
  district text not null default '',
  city text not null default '',
  state text not null default '',
  is_seller boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;
create policy "own profile read" on public.profiles for select to authenticated using (auth.uid() = id);
create policy "own profile insert" on public.profiles for insert to authenticated with check (auth.uid() = id);
create policy "own profile update" on public.profiles for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;
create policy "own roles read" on public.user_roles for select to authenticated using (auth.uid() = user_id);

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name) values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', ''));
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- seller is complete when all required fields present
create or replace function public.profile_set_seller()
returns trigger language plpgsql set search_path = public as $$
begin
  new.updated_at := now();
  new.is_seller := length(trim(new.full_name)) > 2 and length(regexp_replace(new.document,'\D','','g')) in (11,14)
    and length(regexp_replace(new.phone,'\D','','g')) >= 10 and length(regexp_replace(new.cep,'\D','','g')) = 8
    and length(trim(new.street)) > 0 and length(trim(new.number)) > 0 and length(trim(new.city)) > 0
    and length(trim(new.state)) = 2 and length(trim(new.pix_key)) > 0
    and (new.account_type = 'pf' or length(trim(new.store_name)) > 0);
  return new;
end $$;
create trigger profiles_seller before insert or update on public.profiles for each row execute function public.profile_set_seller();

create table public.listings (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null,
  seller_name text not null default '',
  title text not null check (length(title) between 2 and 160),
  price_cents integer not null check (price_cents between 100 and 1000000),
  weight_g integer not null check (weight_g between 20 and 10000),
  cover_path text not null,
  status text not null default 'active' check (status in ('active','sold','paused')),
  expires_at timestamptz not null default now() + interval '30 days',
  created_at timestamptz not null default now()
);
create index listings_search on public.listings (status, expires_at);
grant select on public.listings to anon;
grant select, insert, update, delete on public.listings to authenticated;
grant all on public.listings to service_role;
alter table public.listings enable row level security;
create policy "public active listings" on public.listings for select to anon, authenticated using (status = 'active' and expires_at > now());
create policy "seller reads own" on public.listings for select to authenticated using (auth.uid() = seller_id);
create policy "seller inserts" on public.listings for insert to authenticated with check (auth.uid() = seller_id);
create policy "seller updates" on public.listings for update to authenticated using (auth.uid() = seller_id) with check (auth.uid() = seller_id);
create policy "seller deletes" on public.listings for delete to authenticated using (auth.uid() = seller_id and status <> 'sold');

create or replace function public.listing_before_write()
returns trigger language plpgsql security definer set search_path = public as $$
declare p public.profiles;
begin
  if tg_op = 'INSERT' then
    select * into p from public.profiles where id = new.seller_id;
    if p.id is null or not p.is_seller then raise exception 'Complete seu cadastro de vendedor antes de anunciar'; end if;
    new.seller_name := case when p.account_type = 'pj' then p.store_name
      else split_part(trim(p.full_name),' ',1) || coalesce(' ' || nullif(left(split_part(trim(p.full_name),' ',2),1),'') || '.', '') end;
    new.status := 'active';
    new.expires_at := now() + interval '30 days';
    new.created_at := now();
  else
    -- sellers cannot mark sold themselves nor set arbitrary expiry
    if new.status = 'sold' and old.status <> 'sold' and current_setting('app.order', true) is distinct from 'on' then raise exception 'Status inválido'; end if;
    if old.status = 'sold' and new.status <> 'sold' and current_setting('app.order', true) is distinct from 'on' then raise exception 'Livro já vendido'; end if;
    if new.expires_at <> old.expires_at and new.expires_at > now() + interval '30 days 1 minute' then raise exception 'Validade inválida'; end if;
    new.seller_id := old.seller_id; new.seller_name := old.seller_name; new.created_at := old.created_at;
  end if;
  return new;
end $$;
create trigger listings_bw before insert or update on public.listings for each row execute function public.listing_before_write();

create or replace function public.renew_listing(_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.listings set expires_at = now() + interval '30 days', status = case when status='paused' then 'active' else status end
  where id = _id and seller_id = auth.uid() and status <> 'sold';
  if not found then raise exception 'Anúncio não encontrado'; end if;
end $$;

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id),
  buyer_id uuid not null,
  seller_id uuid not null,
  title text not null,
  cover_path text not null,
  weight_g integer not null,
  price_cents integer not null,
  platform_fee_cents integer not null,
  shipping_cents integer,
  gateway_fee_cents integer,
  status text not null default 'pending_payment' check (status in ('pending_payment','paid','shipped','delivered','cancelled')),
  payout_status text not null default 'pending' check (payout_status in ('pending','paid')),
  payout_at timestamptz,
  tracking_code text not null default '',
  buyer_name text not null, buyer_phone text not null default '',
  ship_cep text not null, ship_street text not null, ship_number text not null, ship_complement text not null default '',
  ship_district text not null default '', ship_city text not null, ship_state text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select on public.orders to authenticated;
grant all on public.orders to service_role;
alter table public.orders enable row level security;
create policy "parties read orders" on public.orders for select to authenticated
  using (auth.uid() = buyer_id or auth.uid() = seller_id or public.has_role(auth.uid(),'admin'));

create or replace function public.create_order(_listing_id uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare l public.listings; p public.profiles; oid uuid;
begin
  select * into l from public.listings where id = _listing_id for update;
  if l.id is null or l.status <> 'active' or l.expires_at <= now() then raise exception 'Este anúncio não está mais disponível'; end if;
  if l.seller_id = auth.uid() then raise exception 'Você não pode comprar seu próprio livro'; end if;
  select * into p from public.profiles where id = auth.uid();
  if p.id is null or length(trim(p.full_name)) < 3 or length(regexp_replace(p.cep,'\D','','g')) <> 8 or length(trim(p.street))=0
     or length(trim(p.number))=0 or length(trim(p.city))=0 or length(trim(p.state))<>2 then
    raise exception 'Complete seu endereço de entrega no perfil';
  end if;
  perform set_config('app.order','on',true);
  update public.listings set status='sold' where id = l.id;
  insert into public.orders (listing_id,buyer_id,seller_id,title,cover_path,weight_g,price_cents,platform_fee_cents,
    buyer_name,buyer_phone,ship_cep,ship_street,ship_number,ship_complement,ship_district,ship_city,ship_state)
  values (l.id,auth.uid(),l.seller_id,l.title,l.cover_path,l.weight_g,l.price_cents, round(l.price_cents*0.20)::int,
    p.full_name,p.phone,p.cep,p.street,p.number,p.complement,p.district,p.city,p.state)
  returning id into oid;
  return oid;
end $$;

create or replace function public.update_order_status(_order_id uuid, _status text, _tracking text default null)
returns void language plpgsql security definer set search_path = public as $$
declare o public.orders;
begin
  select * into o from public.orders where id = _order_id for update;
  if o.id is null then raise exception 'Pedido não encontrado'; end if;
  if _status = 'cancelled' then
    if o.status <> 'pending_payment' or (auth.uid() <> o.buyer_id and auth.uid() <> o.seller_id and not public.has_role(auth.uid(),'admin')) then raise exception 'Não é possível cancelar'; end if;
    perform set_config('app.order','on',true);
    update public.listings set status='active', expires_at = greatest(expires_at, now() + interval '7 days') where id = o.listing_id;
  elsif _status = 'shipped' then
    if o.status <> 'paid' or auth.uid() <> o.seller_id then raise exception 'Não é possível marcar como enviado'; end if;
  elsif _status = 'delivered' then
    if o.status <> 'shipped' or auth.uid() <> o.buyer_id then raise exception 'Não é possível confirmar entrega'; end if;
  elsif _status = 'paid' then
    if o.status <> 'pending_payment' or not public.has_role(auth.uid(),'admin') then raise exception 'Somente administradores'; end if;
  else raise exception 'Status inválido'; end if;
  update public.orders set status=_status, tracking_code = coalesce(nullif(trim(_tracking),''), tracking_code), updated_at=now() where id=_order_id;
end $$;

create or replace function public.mark_payout(_order_id uuid, _gateway_fee_cents integer)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.has_role(auth.uid(),'admin') then raise exception 'Somente administradores'; end if;
  if _gateway_fee_cents < 0 then raise exception 'Valor inválido'; end if;
  update public.orders set payout_status='paid', payout_at=now(), gateway_fee_cents=_gateway_fee_cents, updated_at=now()
  where id=_order_id and status in ('paid','shipped','delivered') and payout_status='pending';
  if not found then raise exception 'Pedido não elegível para repasse'; end if;
end $$;

create or replace function public.admin_payout_info(_seller_id uuid)
returns table(full_name text, store_name text, document text, pix_key text)
language sql stable security definer set search_path = public as $$
  select full_name, store_name, document, pix_key from public.profiles where id = _seller_id and public.has_role(auth.uid(),'admin')
$$;

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  buyer_id uuid not null, seller_id uuid not null,
  listing_title text not null, buyer_name text not null default '', seller_name text not null default '',
  last_message_at timestamptz not null default now(),
  unique (listing_id, buyer_id)
);
grant select on public.conversations to authenticated;
grant all on public.conversations to service_role;
alter table public.conversations enable row level security;
create policy "participants read conv" on public.conversations for select to authenticated using (auth.uid() in (buyer_id, seller_id));

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null,
  body text not null check (length(trim(body)) between 1 and 1000),
  created_at timestamptz not null default now()
);
grant select, insert on public.messages to authenticated;
grant all on public.messages to service_role;
alter table public.messages enable row level security;
create policy "participants read msgs" on public.messages for select to authenticated
  using (exists (select 1 from public.conversations c where c.id = conversation_id and auth.uid() in (c.buyer_id,c.seller_id)));
create policy "participants send" on public.messages for insert to authenticated
  with check (sender_id = auth.uid() and exists (select 1 from public.conversations c where c.id = conversation_id and auth.uid() in (c.buyer_id,c.seller_id)));

create or replace function public.touch_conversation() returns trigger language plpgsql security definer set search_path = public as $$
begin update public.conversations set last_message_at = new.created_at where id = new.conversation_id; return new; end $$;
create trigger messages_touch after insert on public.messages for each row execute function public.touch_conversation();

create or replace function public.start_conversation(_listing_id uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare l public.listings; cid uuid; bn text;
begin
  select * into l from public.listings where id = _listing_id;
  if l.id is null then raise exception 'Anúncio não encontrado'; end if;
  if l.seller_id = auth.uid() then raise exception 'Este anúncio é seu'; end if;
  select id into cid from public.conversations where listing_id = l.id and buyer_id = auth.uid();
  if cid is not null then return cid; end if;
  select coalesce(nullif(split_part(trim(full_name),' ',1),''),'Comprador') into bn from public.profiles where id = auth.uid();
  insert into public.conversations (listing_id,buyer_id,seller_id,listing_title,buyer_name,seller_name)
  values (l.id, auth.uid(), l.seller_id, l.title, coalesce(bn,'Comprador'), l.seller_name) returning id into cid;
  return cid;
end $$;

revoke execute on function public.create_order(uuid), public.update_order_status(uuid,text,text), public.mark_payout(uuid,integer), public.renew_listing(uuid), public.start_conversation(uuid), public.admin_payout_info(uuid) from anon, public;
grant execute on function public.create_order(uuid), public.update_order_status(uuid,text,text), public.mark_payout(uuid,integer), public.renew_listing(uuid), public.start_conversation(uuid), public.admin_payout_info(uuid), public.has_role(uuid, public.app_role) to authenticated;

create policy "cover upload own folder" on storage.objects for insert to authenticated
  with check (bucket_id = 'covers' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "cover delete own" on storage.objects for delete to authenticated
  using (bucket_id = 'covers' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "cover public read" on storage.objects for select to anon, authenticated using (bucket_id = 'covers');
