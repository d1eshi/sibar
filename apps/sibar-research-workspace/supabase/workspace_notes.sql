-- Optional future Supabase sync schema for Sibar Research Workspace notes.
-- The public Vercel slice does not require this schema and makes no Supabase
-- calls unless a future implementation adds an explicit client and opt-in sync.

create extension if not exists pgcrypto;

create table if not exists public.workspace_notes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  local_note_id text not null,
  course_title text not null,
  session_title text not null,
  node_name text not null,
  mini_node_question text not null,
  source_title text not null,
  iteration_label text not null,
  body text not null,
  created_at timestamptz not null,
  created_at_date_key text not null,
  inserted_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, local_note_id)
);

alter table public.workspace_notes enable row level security;

create policy "Workspace note owners can read their notes"
  on public.workspace_notes
  for select
  using (auth.uid() = owner_id);

create policy "Workspace note owners can insert their notes"
  on public.workspace_notes
  for insert
  with check (auth.uid() = owner_id);

create policy "Workspace note owners can update their notes"
  on public.workspace_notes
  for update
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

create policy "Workspace note owners can delete their notes"
  on public.workspace_notes
  for delete
  using (auth.uid() = owner_id);

create index if not exists workspace_notes_owner_created_idx
  on public.workspace_notes (owner_id, created_at desc);
