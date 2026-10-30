-- The SAM 3.1 "person" job for each piece, used only to blur people.
alter table chunks add column if not exists people_response_id text;
-- Repeats found inside one walk have no area.
alter table matches alter column area_id drop not null;
