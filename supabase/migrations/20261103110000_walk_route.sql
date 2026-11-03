-- The phone's route during a walk recorded in Seventy: [seconds into the video, lat, lon, accuracy m] per fix.
alter table public.walks add column if not exists route jsonb;
comment on column public.walks.route is 'GPS fixes recorded with the walk: {"points": [[t_s, lat, lon, acc_m], ...]}. Null for uploaded videos.';
