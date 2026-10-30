-- Programmes group a team's areas; each area keeps its walks over time.
create table if not exists programmes (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  name text not null,
  description text,
  created_at timestamptz not null default now()
);
alter table programmes enable row level security;
alter table areas add column if not exists programme_id uuid references programmes(id) on delete cascade;
alter table areas add column if not exists place text;
create index if not exists areas_programme on areas(programme_id);

-- SAM 3.1 "person" output for a piece, used only to blur people in the replay.
alter table chunks add column if not exists people_path text;

-- Re-identification: this dog is the same as an earlier dog on the walk, so it is counted once.
alter table dogs add column if not exists same_as integer;
-- What the person reviewing saw, in their words.
alter table dogs add column if not exists review_note text;

-- Per-stage model use, for "How this survey was made".
alter table usage_log add column if not exists stage text;
alter table usage_log add column if not exists calls integer not null default 1;
alter table usage_log add column if not exists seconds real;
create index if not exists usage_log_walk on usage_log(walk_id);
