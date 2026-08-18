-- Create keyboxes table
create table if not exists public.keyboxes (
  id uuid default gen_random_uuid() primary key,
  access_key varchar(6) not null unique,
  content_type varchar(10) not null check (content_type in ('text', 'url', 'code')),
  content text not null check (char_length(content) <= 5000),
  created_at timestamptz default now() not null,
  expires_at timestamptz not null
);

-- Create indexes
create index if not exists idx_keyboxes_expires_at on public.keyboxes (expires_at);

-- Create failed_attempts table for rate limiting
create table if not exists public.failed_attempts (
  ip_hash text primary key,
  attempts int not null default 1,
  last_attempt timestamptz default now() not null
);

-- Enable Row Level Security (RLS)
alter table public.keyboxes enable row level security;
alter table public.failed_attempts enable row level security;

-- No RLS policies are created, meaning only the service role key can access/modify the tables.
