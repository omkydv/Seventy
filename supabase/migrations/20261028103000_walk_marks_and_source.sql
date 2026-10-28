alter table public.walks
  add column target_mark text not null default 'vaccination' check (target_mark in ('vaccination','sterilization')),
  add column mark_types text[] not null default array['paint']::text[],
  add column source_name text,
  add column area_name text;

alter table public.dogs
  add column reading_ms int,
  add column best_crop jsonb;

create index chunks_walk_status_idx on public.chunks(walk_id, status);
