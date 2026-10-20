-- =============================================================================
-- Migration 0002 – Übungskatalog und Abgleich der Übungsbibliothek
-- Siehe docs/DATABASE.md §3.3 und §4.
--
-- Bibliotheksübungen (source = 'library') kommen aus dem Code (src/data/exercises)
-- und werden über sync_exercise_library() abgeglichen. Eigene Übungen
-- (source = 'custom') werden vom Abgleich NIE verändert. Übungen werden nicht
-- gelöscht, sondern archiviert, damit gespeicherte Trainings erhalten bleiben.
--
-- Die Wertelisten (Kategorie, Muskeln, Geräte …) prüft die App mit Zod
-- (src/data/exercises/schema.ts). Die Datenbank prüft nur die Grundstruktur,
-- damit neue Werte im Code keine Migration erfordern.
-- =============================================================================

create table public.exercises (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  slug text not null check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  source text not null check (source in ('library', 'custom')),
  name text not null check (char_length(name) between 2 and 80),
  description text not null default '' check (char_length(description) <= 400),
  category text not null,
  training_types text[] not null check (cardinality(training_types) >= 1),
  movement_pattern text not null,
  primary_muscles text[] not null check (cardinality(primary_muscles) >= 1),
  secondary_muscles text[] not null default '{}',
  equipment text[] not null default '{}',
  difficulty smallint not null check (difficulty between 1 and 3),
  measurement text not null,
  load_params jsonb not null check (jsonb_typeof(load_params) = 'object'),
  instructions text[] not null default '{}',
  alternative_slugs text[] not null default '{}',
  hyrox_station text,
  stress_regions text[] not null default '{}',
  -- Persönliche Einstellung; wird vom Bibliotheksabgleich nie überschrieben
  preference text not null default 'neutral'
    check (preference in ('neutral', 'preferred', 'disliked', 'hidden')),
  is_archived boolean not null default false,
  -- Version der Code-Bibliothek beim letzten Abgleich (nur bei source = 'library')
  library_version integer check (library_version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint exercises_user_slug_unique unique (user_id, slug),
  constraint exercises_library_version_only_for_library
    check (source = 'library' or library_version is null)
);

comment on table public.exercises is
  'Übungskatalog je Nutzer: Bibliotheksübungen (aus dem Code abgeglichen) und eigene Übungen.';

create index exercises_user_active_idx on public.exercises (user_id) where not is_archived;

create trigger exercises_set_updated_at
  before update on public.exercises
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- Rechte und Row Level Security
-- Kein DELETE: Übungen werden archiviert (Trainingshistorie bleibt gültig).
-- -----------------------------------------------------------------------------
revoke all on public.exercises from anon, authenticated;
grant select, insert, update on public.exercises to authenticated;

alter table public.exercises enable row level security;

create policy "exercises: eigene lesen"
  on public.exercises for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "exercises: eigene anlegen"
  on public.exercises for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "exercises: eigene ändern"
  on public.exercises for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- -----------------------------------------------------------------------------
-- sync_exercise_library: gleicht die Code-Bibliothek mit den Übungen des
-- angemeldeten Nutzers ab. Läuft als security invoker → RLS gilt auch hier.
--
-- p_version   LIBRARY_VERSION aus dem Code
-- p_exercises JSON-Array mit Bibliotheksübungen (Felder in snake_case)
--
-- Ablauf (eine Transaktion):
--   1. Ist der Stand bereits aktuell → nichts tun.
--   2. Upsert über (user_id, slug); aktualisiert NUR Bibliotheksfelder, nie
--      preference, und nie Zeilen mit source = 'custom'.
--   3. Bibliotheksübungen, die im Code fehlen → is_archived = true.
-- -----------------------------------------------------------------------------
create or replace function public.sync_exercise_library(p_version integer, p_exercises jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_current integer;
  v_inserted integer := 0;
  v_updated integer := 0;
  v_archived integer := 0;
begin
  if v_user is null then
    raise exception 'Nicht angemeldet' using errcode = '42501';
  end if;
  if p_version is null or p_version < 1 then
    raise exception 'Ungültige Bibliotheksversion: %', p_version using errcode = '22023';
  end if;
  if jsonb_typeof(p_exercises) is distinct from 'array' or jsonb_array_length(p_exercises) = 0 then
    raise exception 'p_exercises muss ein nicht leeres JSON-Array sein' using errcode = '22023';
  end if;

  -- Gleichzeitige Abgleiche desselben Nutzers (z. B. Handy und Laptop) nacheinander ausführen
  perform pg_advisory_xact_lock(hashtextextended('sync_exercise_library:' || v_user::text, 0));

  select coalesce(max(e.library_version), 0)
    into v_current
    from public.exercises e
   where e.user_id = v_user and e.source = 'library';

  if v_current >= p_version then
    return jsonb_build_object('status', 'up_to_date', 'version', v_current);
  end if;

  with input as (
    select *
      from jsonb_to_recordset(p_exercises) as x(
        slug text,
        name text,
        description text,
        category text,
        training_types text[],
        movement_pattern text,
        primary_muscles text[],
        secondary_muscles text[],
        equipment text[],
        difficulty smallint,
        measurement text,
        load_params jsonb,
        instructions text[],
        alternative_slugs text[],
        hyrox_station text,
        stress_regions text[]
      )
  ),
  upserted as (
    insert into public.exercises as e (
      user_id, slug, source, name, description, category, training_types, movement_pattern,
      primary_muscles, secondary_muscles, equipment, difficulty, measurement, load_params,
      instructions, alternative_slugs, hyrox_station, stress_regions, is_archived, library_version
    )
    select
      v_user, i.slug, 'library', i.name, coalesce(i.description, ''), i.category,
      i.training_types, i.movement_pattern, i.primary_muscles,
      coalesce(i.secondary_muscles, '{}'), coalesce(i.equipment, '{}'), i.difficulty,
      i.measurement, i.load_params, coalesce(i.instructions, '{}'),
      coalesce(i.alternative_slugs, '{}'), i.hyrox_station, coalesce(i.stress_regions, '{}'),
      false, p_version
    from input i
    on conflict (user_id, slug) do update set
      name = excluded.name,
      description = excluded.description,
      category = excluded.category,
      training_types = excluded.training_types,
      movement_pattern = excluded.movement_pattern,
      primary_muscles = excluded.primary_muscles,
      secondary_muscles = excluded.secondary_muscles,
      equipment = excluded.equipment,
      difficulty = excluded.difficulty,
      measurement = excluded.measurement,
      load_params = excluded.load_params,
      instructions = excluded.instructions,
      alternative_slugs = excluded.alternative_slugs,
      hyrox_station = excluded.hyrox_station,
      stress_regions = excluded.stress_regions,
      is_archived = false,
      library_version = excluded.library_version
    where e.source = 'library'
    returning (xmax = 0) as was_inserted
  )
  select
    count(*) filter (where was_inserted),
    count(*) filter (where not was_inserted)
    into v_inserted, v_updated
    from upserted;

  update public.exercises e
     set is_archived = true,
         library_version = p_version
   where e.user_id = v_user
     and e.source = 'library'
     and not e.is_archived
     and e.slug not in (select x ->> 'slug' from jsonb_array_elements(p_exercises) x);
  get diagnostics v_archived = row_count;

  return jsonb_build_object(
    'status', 'synced',
    'version', p_version,
    'inserted', v_inserted,
    'updated', v_updated,
    'archived', v_archived
  );
end;
$$;

comment on function public.sync_exercise_library(integer, jsonb) is
  'Gleicht die Übungsbibliothek aus dem Code ab (Upsert + Archivieren). Eigene Übungen bleiben unberührt.';

revoke all on function public.sync_exercise_library(integer, jsonb) from public, anon;
grant execute on function public.sync_exercise_library(integer, jsonb) to authenticated;
