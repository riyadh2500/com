-- Run this in Supabase SQL Editor
-- https://supabase.com/dashboard/project/krqnzzhcxaroeffzqoox/sql

create table if not exists public.chat_sessions (
  id         text primary key,
  user_id    uuid references auth.users(id) on delete cascade not null,
  title      text not null,
  created_at timestamptz default now()
);

create table if not exists public.messages (
  id         bigserial primary key,
  session_id text references public.chat_sessions(id) on delete cascade not null,
  user_id    uuid references auth.users(id) on delete cascade not null,
  role       text not null check (role in ('user','assistant')),
  content    text not null,
  created_at timestamptz default now()
);

alter table public.chat_sessions enable row level security;
alter table public.messages      enable row level security;

create policy "own sessions" on public.chat_sessions for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own messages" on public.messages for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists idx_sessions_user    on public.chat_sessions(user_id, created_at desc);
create index if not exists idx_messages_session on public.messages(session_id, created_at asc);
