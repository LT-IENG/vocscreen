-- 词映 VocScreen - Supabase 数据表 + RLS 策略
-- 在 Supabase Dashboard → SQL Editor → New Query 粘贴执行

-- ============================================
-- 1. profiles 表（用户名映射）
-- ============================================
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  username    text unique not null,
  created_at  timestamptz default now()
);

alter table public.profiles enable row level security;

create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);
create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id);
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);

-- ============================================
-- 2. notebooks 表（生词本）
-- ============================================
create table if not exists public.notebooks (
  id          text primary key,
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  is_default  boolean default false,
  created_at  timestamptz default now()
);

alter table public.notebooks enable row level security;

create policy "notebooks_user_crud" on public.notebooks
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ============================================
-- 3. captured_words 表（已捕获单词）
-- ============================================
create table if not exists public.captured_words (
  id            text primary key,
  user_id       uuid not null references auth.users(id) on delete cascade,
  notebook_id   text,
  word_entry_id text,
  spelling      text not null,
  lemma         text not null,
  source        jsonb,
  status        text default 'new',
  captured_at   timestamptz default now(),
  learned_at    timestamptz
);

alter table public.captured_words enable row level security;

create policy "captured_words_user_crud" on public.captured_words
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index on public.captured_words (user_id);
create index on public.captured_words (notebook_id);

-- ============================================
-- 4. review_schedules 表（复习计划）
-- ============================================
create table if not exists public.review_schedules (
  id                    text primary key,
  user_id               uuid not null references auth.users(id) on delete cascade,
  captured_word_id      text not null,
  intervals             jsonb not null,
  current_interval_index integer default 0,
  last_review_at        timestamptz,
  next_review_at        timestamptz not null,
  review_count          integer default 0,
  consecutive_pass      integer default 0,
  ease                  real default 2.5,
  status                text default 'new',
  learn_stage           text default 'completed'
);

alter table public.review_schedules enable row level security;

create policy "review_schedules_user_crud" on public.review_schedules
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index on public.review_schedules (user_id);
create index on public.review_schedules (next_review_at);

-- ============================================
-- 5. 触发器：注册时自动创建 profile
-- ============================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, username)
  values (new.id, new.raw_user_meta_data->>'username')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================
-- 6. 开启邮箱验证（Dashboard 操作）
-- ============================================
-- 这一步需要在 Dashboard 操作：
-- Authentication → Providers → Email → 开启 "Confirm email"
-- 注册后用户会收到验证邮件，点击链接后才能登录
