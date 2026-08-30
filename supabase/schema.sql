-- RedToot Supabase schema
-- Optional future backend for the unified Arabic social discovery platform.
-- Keep service_role keys out of the frontend. Use RLS for all public tables.

create extension if not exists pgcrypto;

do $$ begin create type public.profile_status as enum ('pending', 'approved', 'rejected', 'suspended', 'blocked'); exception when duplicate_object then null; end $$;
do $$ begin create type public.profile_type as enum ('person', 'celebrity', 'creator', 'business', 'store', 'community', 'gamer', 'podcast', 'channel', 'bot'); exception when duplicate_object then null; end $$;
do $$ begin create type public.gender_type as enum ('male', 'female', 'other', 'not_specified'); exception when duplicate_object then null; end $$;
do $$ begin create type public.subscription_plan as enum ('free', 'vip', 'pro', 'royal'); exception when duplicate_object then null; end $$;
do $$ begin create type public.workflow_status as enum ('pending', 'approved', 'rejected', 'active', 'canceled', 'expired', 'resolved'); exception when duplicate_object then null; end $$;

create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin', false);
$$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.platforms (
  id bigserial primary key,
  name text not null unique,
  display_name_ar text not null,
  display_name_en text not null,
  icon text not null default 'link',
  color text not null default '#d71920',
  base_url text not null default '',
  is_active boolean not null default true,
  sort_order int not null default 100,
  created_at timestamptz not null default now()
);

create table if not exists public.categories (
  id bigserial primary key,
  name text not null unique,
  slug text not null unique,
  display_name_ar text not null,
  icon text not null default 'folder',
  is_active boolean not null default true,
  sort_order int not null default 100,
  created_at timestamptz not null default now()
);

create table if not exists public.countries (
  id bigserial primary key,
  code text not null unique,
  slug text not null unique,
  name_ar text not null,
  name_en text not null,
  is_active boolean not null default true
);

create table if not exists public.regions (
  id bigserial primary key,
  country_id bigint not null references public.countries(id) on delete cascade,
  slug text not null,
  name_ar text not null,
  unique(country_id, slug)
);

create table if not exists public.cities (
  id bigserial primary key,
  country_id bigint not null references public.countries(id) on delete cascade,
  region_id bigint references public.regions(id) on delete set null,
  slug text not null,
  name_ar text not null,
  unique(country_id, slug)
);

create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  display_name text not null check (char_length(display_name) between 2 and 80),
  slug text not null unique check (slug ~ '^[a-z0-9-]{2,120}$'),
  bio text not null default '' check (char_length(bio) <= 500),
  profile_type public.profile_type not null default 'person',
  gender public.gender_type not null default 'not_specified',
  country_id bigint references public.countries(id) on delete set null,
  region_id bigint references public.regions(id) on delete set null,
  city_id bigint references public.cities(id) on delete set null,
  category_id bigint references public.categories(id) on delete set null,
  avatar_url text not null default '',
  cover_url text not null default '',
  status public.profile_status not null default 'approved',
  is_verified boolean not null default false,
  verified_at timestamptz,
  is_vip boolean not null default false,
  vip_expires_at timestamptz,
  is_pro boolean not null default false,
  pro_expires_at timestamptz,
  is_featured boolean not null default false,
  featured_expires_at timestamptz,
  membership_level public.subscription_plan not null default 'free',
  membership_priority int not null default 0,
  completeness_score int not null default 0 check (completeness_score between 0 and 100),
  trend_score int not null default 0 check (trend_score >= 0),
  views_count int not null default 0 check (views_count >= 0),
  clicks_count int not null default 0 check (clicks_count >= 0),
  favorites_count int not null default 0 check (favorites_count >= 0),
  shares_count int not null default 0 check (shares_count >= 0),
  reports_count int not null default 0 check (reports_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz not null default now(),
  bumped_at timestamptz not null default now()
);

create table if not exists public.social_links (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  platform_id bigint not null references public.platforms(id) on delete restrict,
  username text not null check (char_length(username) between 1 and 120),
  profile_url text not null check (profile_url ~ '^https://'),
  is_primary boolean not null default false,
  followers_count int check (followers_count is null or followers_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(profile_id, platform_id)
);

create table if not exists public.profile_views (
  id bigserial primary key,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  viewer_hash text,
  referrer text,
  user_agent text,
  created_at timestamptz not null default now()
);

create table if not exists public.link_clicks (
  id bigserial primary key,
  social_link_id uuid not null references public.social_links(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  platform_id bigint not null references public.platforms(id) on delete restrict,
  user_id uuid references auth.users(id) on delete set null,
  visitor_hash text,
  created_at timestamptz not null default now()
);

create table if not exists public.favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(user_id, profile_id)
);

create table if not exists public.collections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 2 and 80),
  description text not null default '' check (char_length(description) <= 300),
  is_public boolean not null default false,
  slug text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.collection_items (
  collection_id uuid not null references public.collections(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (collection_id, profile_id)
);

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  reporter_email text,
  reason text not null check (char_length(reason) between 3 and 500),
  status public.workflow_status not null default 'pending',
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);

create table if not exists public.verification_requests (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  document_url text not null check (document_url ~ '^https://'),
  status public.workflow_status not null default 'pending',
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  profile_id uuid references public.profiles(id) on delete cascade,
  plan public.subscription_plan not null,
  status public.workflow_status not null default 'pending',
  starts_at timestamptz,
  ends_at timestamptz,
  payment_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists profiles_status_score_idx on public.profiles (status, trend_score desc);
create index if not exists profiles_status_created_idx on public.profiles (status, created_at desc);
create index if not exists profiles_status_views_idx on public.profiles (status, views_count desc);
create index if not exists profiles_platform_idx on public.social_links (platform_id, created_at desc);
create index if not exists profiles_location_idx on public.profiles (country_id, city_id, status);
create index if not exists profile_views_recent_idx on public.profile_views (profile_id, created_at desc);
create index if not exists link_clicks_recent_idx on public.link_clicks (profile_id, created_at desc);

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at before update on public.profiles for each row execute function public.set_updated_at();
drop trigger if exists social_links_set_updated_at on public.social_links;
create trigger social_links_set_updated_at before update on public.social_links for each row execute function public.set_updated_at();
drop trigger if exists collections_set_updated_at on public.collections;
create trigger collections_set_updated_at before update on public.collections for each row execute function public.set_updated_at();
drop trigger if exists subscriptions_set_updated_at on public.subscriptions;
create trigger subscriptions_set_updated_at before update on public.subscriptions for each row execute function public.set_updated_at();

alter table public.platforms enable row level security;
alter table public.categories enable row level security;
alter table public.countries enable row level security;
alter table public.regions enable row level security;
alter table public.cities enable row level security;
alter table public.profiles enable row level security;
alter table public.social_links enable row level security;
alter table public.profile_views enable row level security;
alter table public.link_clicks enable row level security;
alter table public.favorites enable row level security;
alter table public.collections enable row level security;
alter table public.collection_items enable row level security;
alter table public.reports enable row level security;
alter table public.verification_requests enable row level security;
alter table public.subscriptions enable row level security;

create policy "Public can read taxonomy" on public.platforms for select to anon, authenticated using (is_active = true);
create policy "Public can read categories" on public.categories for select to anon, authenticated using (is_active = true);
create policy "Public can read countries" on public.countries for select to anon, authenticated using (is_active = true);
create policy "Public can read regions" on public.regions for select to anon, authenticated using (true);
create policy "Public can read cities" on public.cities for select to anon, authenticated using (true);

create policy "Public can read approved profiles" on public.profiles for select to anon, authenticated using (status = 'approved' or public.is_admin() or (select auth.uid()) = user_id);
create policy "Public can create safe approved profiles" on public.profiles for insert to anon, authenticated
with check (
  status = 'approved'
  and is_verified = false
  and is_vip = false
  and is_pro = false
  and is_featured = false
  and membership_level = 'free'
  and membership_priority = 0
  and views_count = 0
  and clicks_count = 0
  and favorites_count = 0
  and shares_count = 0
  and reports_count = 0
  and (user_id is null or user_id = (select auth.uid()))
);
create policy "Owners can update editable profile fields" on public.profiles for update to authenticated
using ((select auth.uid()) = user_id or public.is_admin())
with check ((select auth.uid()) = user_id or public.is_admin());
create policy "Admins can delete profiles" on public.profiles for delete to authenticated using (public.is_admin());

create policy "Public can read approved social links" on public.social_links for select to anon, authenticated
using (exists (select 1 from public.profiles p where p.id = profile_id and p.status = 'approved'));
create policy "Owners can manage social links" on public.social_links for all to authenticated
using (exists (select 1 from public.profiles p where p.id = profile_id and (p.user_id = (select auth.uid()) or public.is_admin())))
with check (exists (select 1 from public.profiles p where p.id = profile_id and (p.user_id = (select auth.uid()) or public.is_admin())));

create policy "Anyone can write profile view events" on public.profile_views for insert to anon, authenticated with check (true);
create policy "Anyone can write click events" on public.link_clicks for insert to anon, authenticated with check (true);
create policy "Admins can read analytics events" on public.profile_views for select to authenticated using (public.is_admin());
create policy "Admins can read click events" on public.link_clicks for select to authenticated using (public.is_admin());

create policy "Users can read own favorites" on public.favorites for select to authenticated using ((select auth.uid()) = user_id);
create policy "Users can create own favorites" on public.favorites for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Users can remove own favorites" on public.favorites for delete to authenticated using ((select auth.uid()) = user_id);

create policy "Users can read own collections or public collections" on public.collections for select to anon, authenticated using (is_public = true or (select auth.uid()) = user_id);
create policy "Users can manage own collections" on public.collections for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Public can read public collection items" on public.collection_items for select to anon, authenticated
using (exists (select 1 from public.collections c where c.id = collection_id and (c.is_public = true or c.user_id = (select auth.uid()))));
create policy "Users can manage own collection items" on public.collection_items for all to authenticated
using (exists (select 1 from public.collections c where c.id = collection_id and c.user_id = (select auth.uid())))
with check (exists (select 1 from public.collections c where c.id = collection_id and c.user_id = (select auth.uid())));

create policy "Users and guests can create reports" on public.reports for insert to anon, authenticated with check (status = 'pending');
create policy "Admins can manage reports" on public.reports for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "Users can create verification requests" on public.verification_requests for insert to authenticated with check ((select auth.uid()) = user_id and status = 'pending');
create policy "Users can read own verification requests" on public.verification_requests for select to authenticated using ((select auth.uid()) = user_id or public.is_admin());
create policy "Admins can manage verification requests" on public.verification_requests for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "Users can read own subscriptions" on public.subscriptions for select to authenticated using ((select auth.uid()) = user_id or public.is_admin());
create policy "Admins can manage subscriptions" on public.subscriptions for all to authenticated using (public.is_admin()) with check (public.is_admin());

insert into public.platforms (name, display_name_ar, display_name_en, icon, color, base_url, sort_order) values
('snapchat', 'سناب شات', 'Snapchat', 'snapchat', '#fffc00', 'https://snapchat.com/add/', 10),
('instagram', 'انستغرام', 'Instagram', 'instagram', '#e4405f', 'https://instagram.com/', 20),
('tiktok', 'تيك توك', 'TikTok', 'tiktok', '#111111', 'https://tiktok.com/@', 30),
('x', 'إكس', 'X', 'x-twitter', '#111111', 'https://x.com/', 40),
('youtube', 'يوتيوب', 'YouTube', 'youtube', '#ff0000', 'https://youtube.com/@', 50),
('telegram', 'تيليجرام', 'Telegram', 'telegram', '#229ed9', 'https://t.me/', 60),
('whatsapp', 'واتساب', 'WhatsApp', 'whatsapp', '#25d366', 'https://wa.me/', 70),
('jaco', 'جاكو', 'Jaco', 'link', '#c70039', '', 80),
('discord', 'ديسكورد', 'Discord', 'discord', '#5865f2', 'https://discord.gg/', 90),
('threads', 'ثريدز', 'Threads', 'threads', '#111111', 'https://threads.net/@', 100),
('linkedin', 'لينكدإن', 'LinkedIn', 'linkedin', '#0a66c2', 'https://linkedin.com/in/', 110),
('twitch', 'تويتش', 'Twitch', 'twitch', '#9146ff', 'https://twitch.tv/', 120)
on conflict (name) do update set
display_name_ar = excluded.display_name_ar,
display_name_en = excluded.display_name_en,
icon = excluded.icon,
color = excluded.color,
base_url = excluded.base_url,
sort_order = excluded.sort_order;

insert into public.categories (name, slug, display_name_ar, icon, sort_order) values
('general', 'general', 'عام', 'folder', 10),
('entertainment', 'entertainment', 'ترفيه', 'theater-masks', 20),
('fun', 'fun', 'ضحك وناسه', 'laugh', 30),
('groups', 'groups', 'قروبات', 'users', 40),
('technology', 'technology', 'تقنية', 'cpu', 50),
('business', 'business', 'أعمال', 'briefcase', 60),
('education', 'education', 'تعليم', 'book-open', 70),
('sports', 'sports', 'رياضة', 'futbol', 80),
('gaming', 'gaming', 'ألعاب', 'gamepad', 90),
('travel', 'travel', 'سفر', 'plane', 100),
('cars', 'cars', 'سيارات', 'car', 110),
('food', 'food', 'طعام', 'utensils', 120),
('fashion', 'fashion', 'موضة', 'shirt', 130),
('religion', 'religion', 'محتوى ديني', 'mosque', 140),
('celebrities', 'celebrities', 'مشاهير', 'star', 150),
('communities', 'communities', 'مجتمعات', 'people-group', 160)
on conflict (name) do update set display_name_ar = excluded.display_name_ar, slug = excluded.slug, icon = excluded.icon, sort_order = excluded.sort_order;

insert into public.countries (code, slug, name_ar, name_en) values
('SA', 'saudi-arabia', 'السعودية', 'Saudi Arabia'),
('KW', 'kuwait', 'الكويت', 'Kuwait'),
('AE', 'united-arab-emirates', 'الإمارات', 'United Arab Emirates'),
('QA', 'qatar', 'قطر', 'Qatar'),
('BH', 'bahrain', 'البحرين', 'Bahrain'),
('OM', 'oman', 'عمان', 'Oman'),
('EG', 'egypt', 'مصر', 'Egypt'),
('JO', 'jordan', 'الأردن', 'Jordan'),
('MA', 'morocco', 'المغرب', 'Morocco')
on conflict (code) do update set slug = excluded.slug, name_ar = excluded.name_ar, name_en = excluded.name_en;
