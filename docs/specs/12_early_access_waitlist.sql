create extension if not exists pgcrypto;

create table if not exists public.early_access_leads (
  id uuid primary key default gen_random_uuid(),
  email_original text not null check (char_length(email_original) <= 254),
  email_canonical text not null check (char_length(email_canonical) <= 254),
  x_handle text check (x_handle is null or x_handle ~ '^[a-z0-9_]{1,15}$'),
  created_at timestamptz not null default now()
);

create unique index if not exists early_access_leads_email_canonical_idx
  on public.early_access_leads (email_canonical);

alter table public.early_access_leads enable row level security;

revoke all on table public.early_access_leads from public;
revoke all on table public.early_access_leads from anon;
revoke all on table public.early_access_leads from authenticated;
