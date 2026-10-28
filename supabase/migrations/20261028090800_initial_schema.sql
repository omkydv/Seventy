create extension if not exists pgcrypto;

create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  token_hash text not null,
  name text,
  is_demo boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.areas (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  kind text not null default 'ward' check (kind in ('ward','village','route','camp')),
  program_marked_count int check (program_marked_count >= 0),
  program_mark_type text check (program_mark_type in ('vaccinated','sterilized')),
  notes text,
  created_at timestamptz not null default now()
);
create index areas_workspace_idx on public.areas(workspace_id);

create table public.walks (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  area_id uuid references public.areas(id) on delete set null,
  mode text not null check (mode in ('plan','check')),
  title text,
  recorded_at timestamptz,
  duration_s real,
  src_width int,
  src_height int,
  src_fps real,
  proc_fps real not null default 5,
  proc_width int,
  proc_height int,
  chunk_seconds real not null default 60,
  overlap_seconds real not null default 2,
  status text not null default 'created'
    check (status in ('created','uploading','tracking','stitching','needs_crops','reading','review','done','failed')),
  progress jsonb not null default '{}'::jsonb,
  error text,
  stats jsonb,
  is_public boolean not null default false,
  public_slug text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index walks_workspace_idx on public.walks(workspace_id, created_at desc);
create index walks_area_idx on public.walks(area_id);

create table public.chunks (
  id uuid primary key default gen_random_uuid(),
  walk_id uuid not null references public.walks(id) on delete cascade,
  idx int not null,
  start_s real not null,
  end_s real not null,
  frames int,
  storage_path text not null,
  sam_response_id text,
  status text not null default 'pending'
    check (status in ('pending','uploaded','submitted','done','failed')),
  error text,
  attempts int not null default 0,
  tracks_path text,
  objects int,
  submitted_at timestamptz,
  completed_at timestamptz,
  unique (walk_id, idx)
);

create table public.dogs (
  id uuid primary key default gen_random_uuid(),
  walk_id uuid not null references public.walks(id) on delete cascade,
  label int not null,
  first_s real,
  last_s real,
  frames int,
  mean_conf real,
  segments jsonb not null default '[]'::jsonb,
  samples jsonb not null default '[]'::jsonb,
  crops jsonb not null default '[]'::jsonb,
  ear_crop_path text,
  mark jsonb,
  mark_status text check (mark_status in ('marked','unmarked','unknown')),
  mark_kind text check (mark_kind in ('paint','collar','notch','none','unknown')),
  review_status text check (review_status in ('marked','unmarked','unknown','not_a_dog','duplicate')),
  embedding real[],
  created_at timestamptz not null default now(),
  unique (walk_id, label)
);
create index dogs_walk_idx on public.dogs(walk_id);

create table public.notes (
  id uuid primary key default gen_random_uuid(),
  walk_id uuid not null references public.walks(id) on delete cascade,
  t_start real,
  t_end real,
  speaker text,
  text text not null,
  created_at timestamptz not null default now()
);
create index notes_walk_idx on public.notes(walk_id);

create table public.matches (
  id uuid primary key default gen_random_uuid(),
  area_id uuid not null references public.areas(id) on delete cascade,
  dog_a uuid not null references public.dogs(id) on delete cascade,
  dog_b uuid not null references public.dogs(id) on delete cascade,
  similarity real,
  verdict text check (verdict in ('same','different','unsure')),
  verified_by text check (verified_by in ('model','person')),
  reason text,
  created_at timestamptz not null default now(),
  unique (dog_a, dog_b)
);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  walk_id uuid references public.walks(id) on delete cascade,
  area_id uuid references public.areas(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','running','done','failed')),
  model_response_id text,
  body jsonb,
  error text,
  created_at timestamptz not null default now()
);

create table public.usage_log (
  id bigint generated always as identity primary key,
  workspace_id uuid,
  walk_id uuid,
  model text not null,
  units real,
  unit text,
  cost_usd real,
  created_at timestamptz not null default now()
);
create index usage_log_workspace_day_idx on public.usage_log(workspace_id, created_at);

create or replace function public.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;

create trigger walks_touch before update on public.walks
for each row execute function public.touch_updated_at();

-- The browser never talks to these tables; the server uses the secret key.
alter table public.workspaces enable row level security;
alter table public.areas enable row level security;
alter table public.walks enable row level security;
alter table public.chunks enable row level security;
alter table public.dogs enable row level security;
alter table public.notes enable row level security;
alter table public.matches enable row level security;
alter table public.reports enable row level security;
alter table public.usage_log enable row level security;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('walks', 'walks', false, 52428800, array['video/mp4','image/jpeg','image/webp','application/json','application/gzip','audio/mp4','audio/wav','audio/webm']),
  ('public-media', 'public-media', true, 52428800, array['video/mp4','image/jpeg','image/webp','image/png'])
on conflict (id) do nothing;
