-- =============================================================================
-- Migration 0014 – Kampfsport-Drills
-- Siehe docs/COMBAT.md und docs/DATABASE.md §3.3.
--
-- Kampfsport-Drills sind Übungen der Kategorie „combat“ in public.exercises – so
-- funktionieren Trainingsmodus, Verlauf, Statistik und Export ohne Sonderwege.
-- Neu: zu welchen Kampfsportarten ein Drill gehört und (bei BJJ) Gi/NoGi.
-- Die Wertelisten prüft wie bisher die App (Zod); die Datenbank nur die Grundstruktur.
-- =============================================================================

alter table public.exercises
  add column combat_sports text[] not null default '{}',
  add column gi_mode text check (gi_mode in ('gi', 'nogi', 'both'));

comment on column public.exercises.combat_sports is
  'Kampfsportarten des Drills (nur Kategorie combat), z. B. {bjj, mma}.';
comment on column public.exercises.gi_mode is
  'BJJ: mit Gi, ohne Gi (NoGi) oder beides; sonst null.';

-- -----------------------------------------------------------------------------
-- sync_exercise_library (neue Fassung): übernimmt zusätzlich combat_sports und
-- gi_mode. Ablauf und Regeln unverändert (siehe Migration 0002).
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
        stress_regions text[],
        combat_sports text[],
        gi_mode text
      )
  ),
  upserted as (
    insert into public.exercises as e (
      user_id, slug, source, name, description, category, training_types, movement_pattern,
      primary_muscles, secondary_muscles, equipment, difficulty, measurement, load_params,
      instructions, alternative_slugs, hyrox_station, stress_regions, combat_sports, gi_mode,
      is_archived, library_version
    )
    select
      v_user, i.slug, 'library', i.name, coalesce(i.description, ''), i.category,
      i.training_types, i.movement_pattern, i.primary_muscles,
      coalesce(i.secondary_muscles, '{}'), coalesce(i.equipment, '{}'), i.difficulty,
      i.measurement, i.load_params, coalesce(i.instructions, '{}'),
      coalesce(i.alternative_slugs, '{}'), i.hyrox_station, coalesce(i.stress_regions, '{}'),
      coalesce(i.combat_sports, '{}'), i.gi_mode,
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
      combat_sports = excluded.combat_sports,
      gi_mode = excluded.gi_mode,
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
