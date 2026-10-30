-- =============================================================================
-- Migration 0006 – Tagesform-Check-ins
-- Siehe docs/DATABASE.md §3.5 und §5.
--
-- Vier einfache Skalen 1–5 (höher = besser). Der Score (Mittelwert) wird in der App
-- berechnet (src/domain/readiness) und hier nur gespeichert. Keine medizinischen Aussagen.
-- =============================================================================

create table public.readiness_checkins (
  -- ID vom Client: wiederholtes Speichern desselben Check-ins ist idempotent
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  checked_at timestamptz not null,
  energy smallint not null check (energy between 1 and 5),
  -- 1 = starker Muskelkater, 5 = keiner (damit überall „höher = besser" gilt)
  soreness smallint not null check (soreness between 1 and 5),
  sleep_quality smallint not null check (sleep_quality between 1 and 5),
  recovery smallint not null check (recovery between 1 and 5),
  score numeric(3, 2) not null check (score between 1 and 5),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.readiness_checkins is 'Tagesform-Check-ins vor dem Training (Skalen 1–5).';

create index readiness_checkins_user_checked_idx
  on public.readiness_checkins (user_id, checked_at desc);

create trigger readiness_checkins_set_updated_at
  before update on public.readiness_checkins
  for each row execute function public.set_updated_at();

-- Trainings können sich auf den Check-in des Tages beziehen
alter table public.workout_sessions
  add column readiness_checkin_id uuid references public.readiness_checkins (id) on delete set null;

-- -----------------------------------------------------------------------------
-- Rechte und Row Level Security
-- -----------------------------------------------------------------------------
revoke all on public.readiness_checkins from anon, authenticated;
grant select, insert, update, delete on public.readiness_checkins to authenticated;

alter table public.readiness_checkins enable row level security;

create policy "readiness_checkins: eigene lesen"
  on public.readiness_checkins for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "readiness_checkins: eigene anlegen"
  on public.readiness_checkins for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "readiness_checkins: eigene ändern"
  on public.readiness_checkins for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "readiness_checkins: eigene löschen"
  on public.readiness_checkins for delete to authenticated
  using ((select auth.uid()) = user_id);

-- -----------------------------------------------------------------------------
-- save_workout_session (neue Fassung): zusätzlich readiness_checkin_id speichern.
-- Sonst unverändert zu Migration 0005.
-- -----------------------------------------------------------------------------
create or replace function public.save_workout_session(p jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_session jsonb := p -> 'session';
  v_session_id uuid;
  v_exercise jsonb;
  v_set jsonb;
  v_record jsonb;
  v_exercise_id uuid;
  v_replaced_id uuid;
  v_exercise_ids uuid[] := '{}';
  v_set_ids uuid[] := '{}';
  v_new_records jsonb := '[]'::jsonb;
  v_rows integer;
  v_planned_id uuid;
  v_checkin_id uuid;
begin
  if v_user is null then
    raise exception 'Nicht angemeldet' using errcode = '42501';
  end if;
  if jsonb_typeof(v_session) is distinct from 'object' or v_session ->> 'id' is null then
    raise exception 'session mit id ist erforderlich' using errcode = '22023';
  end if;
  v_session_id := (v_session ->> 'id')::uuid;
  v_planned_id := (v_session ->> 'planned_workout_id')::uuid;
  v_checkin_id := (v_session ->> 'readiness_checkin_id')::uuid;

  -- Session -------------------------------------------------------------------
  insert into public.workout_sessions as s (
    id, started_at, ended_at, active_duration_sec, status, focus, intensity, session_rpe,
    notes, workout_snapshot, generator_version, training_load, planned_workout_id,
    readiness_checkin_id
  ) values (
    v_session_id,
    (v_session ->> 'started_at')::timestamptz,
    (v_session ->> 'ended_at')::timestamptz,
    (v_session ->> 'active_duration_sec')::integer,
    v_session ->> 'status',
    v_session ->> 'focus',
    v_session ->> 'intensity',
    (v_session ->> 'session_rpe')::smallint,
    v_session ->> 'notes',
    v_session -> 'workout_snapshot',
    v_session ->> 'generator_version',
    coalesce((v_session ->> 'training_load')::integer, 0),
    v_planned_id,
    v_checkin_id
  )
  on conflict (id) do update set
    started_at = excluded.started_at,
    ended_at = excluded.ended_at,
    active_duration_sec = excluded.active_duration_sec,
    status = excluded.status,
    focus = excluded.focus,
    intensity = excluded.intensity,
    session_rpe = excluded.session_rpe,
    notes = excluded.notes,
    workout_snapshot = excluded.workout_snapshot,
    generator_version = excluded.generator_version,
    training_load = excluded.training_load,
    planned_workout_id = excluded.planned_workout_id,
    readiness_checkin_id = excluded.readiness_checkin_id
  where s.user_id = v_user;
  get diagnostics v_rows = row_count;
  if v_rows = 0 then
    raise exception 'Session gehört einem anderen Nutzer' using errcode = '42501';
  end if;

  -- Übungen und Sätze -----------------------------------------------------------
  for v_exercise in select * from jsonb_array_elements(coalesce(p -> 'exercises', '[]'::jsonb))
  loop
    v_exercise_id := (
      select e.id from public.exercises e
       where e.user_id = v_user and e.slug = v_exercise ->> 'exercise_slug'
    );
    if v_exercise_id is null then
      raise exception 'Übung nicht gefunden: %', v_exercise ->> 'exercise_slug' using errcode = '22023';
    end if;
    v_replaced_id := (
      select e.id from public.exercises e
       where e.user_id = v_user and e.slug = v_exercise ->> 'replaced_exercise_slug'
    );

    insert into public.session_exercises as se (
      id, session_id, exercise_id, exercise_name, position, block, role, status,
      replaced_exercise_id, notes
    ) values (
      (v_exercise ->> 'id')::uuid,
      v_session_id,
      v_exercise_id,
      v_exercise ->> 'exercise_name',
      (v_exercise ->> 'position')::smallint,
      v_exercise ->> 'block',
      v_exercise ->> 'role',
      v_exercise ->> 'status',
      v_replaced_id,
      v_exercise ->> 'notes'
    )
    on conflict (id) do update set
      exercise_id = excluded.exercise_id,
      exercise_name = excluded.exercise_name,
      position = excluded.position,
      block = excluded.block,
      role = excluded.role,
      status = excluded.status,
      replaced_exercise_id = excluded.replaced_exercise_id,
      notes = excluded.notes
    where se.user_id = v_user and se.session_id = excluded.session_id;
    v_exercise_ids := v_exercise_ids || (v_exercise ->> 'id')::uuid;

    for v_set in select * from jsonb_array_elements(coalesce(v_exercise -> 'sets', '[]'::jsonb))
    loop
      insert into public.session_sets as ss (
        id, session_exercise_id, set_number, set_type,
        target_reps, target_weight_kg, target_distance_m, target_duration_sec, target_calories,
        reps, weight_kg, distance_m, duration_sec, calories, rpe, completed, completed_at
      ) values (
        (v_set ->> 'id')::uuid,
        (v_exercise ->> 'id')::uuid,
        (v_set ->> 'set_number')::smallint,
        v_set ->> 'set_type',
        (v_set ->> 'target_reps')::smallint,
        (v_set ->> 'target_weight_kg')::numeric,
        (v_set ->> 'target_distance_m')::numeric,
        (v_set ->> 'target_duration_sec')::integer,
        (v_set ->> 'target_calories')::smallint,
        (v_set ->> 'reps')::smallint,
        (v_set ->> 'weight_kg')::numeric,
        (v_set ->> 'distance_m')::numeric,
        (v_set ->> 'duration_sec')::integer,
        (v_set ->> 'calories')::smallint,
        (v_set ->> 'rpe')::numeric,
        coalesce((v_set ->> 'completed')::boolean, false),
        (v_set ->> 'completed_at')::timestamptz
      )
      on conflict (id) do update set
        set_number = excluded.set_number,
        set_type = excluded.set_type,
        target_reps = excluded.target_reps,
        target_weight_kg = excluded.target_weight_kg,
        target_distance_m = excluded.target_distance_m,
        target_duration_sec = excluded.target_duration_sec,
        target_calories = excluded.target_calories,
        reps = excluded.reps,
        weight_kg = excluded.weight_kg,
        distance_m = excluded.distance_m,
        duration_sec = excluded.duration_sec,
        calories = excluded.calories,
        rpe = excluded.rpe,
        completed = excluded.completed,
        completed_at = excluded.completed_at
      where ss.user_id = v_user and ss.session_exercise_id = excluded.session_exercise_id;
      v_set_ids := v_set_ids || (v_set ->> 'id')::uuid;
    end loop;
  end loop;

  -- Was nicht mehr im Payload steht, gehört nicht mehr zur Session
  delete from public.session_sets ss
   using public.session_exercises se
   where ss.session_exercise_id = se.id
     and se.session_id = v_session_id
     and not (ss.id = any (v_set_ids));
  delete from public.session_exercises se
   where se.session_id = v_session_id
     and not (se.id = any (v_exercise_ids));

  -- Geplante Einheit als erledigt markieren ------------------------------------------
  if v_planned_id is not null then
    update public.planned_workouts pw
       set status = 'completed',
           completed_session_id = v_session_id
     where pw.id = v_planned_id
       and pw.user_id = v_user;
  end if;

  -- Bestleistungen (nur wenn besser) -----------------------------------------------
  for v_record in select * from jsonb_array_elements(coalesce(p -> 'records', '[]'::jsonb))
  loop
    v_exercise_id := (
      select e.id from public.exercises e
       where e.user_id = v_user and e.slug = v_record ->> 'exercise_slug'
    );
    continue when v_exercise_id is null;

    insert into public.personal_records as r (
      exercise_id, record_type, context, context_key, value, unit, achieved_at, session_id, source
    ) values (
      v_exercise_id,
      v_record ->> 'record_type',
      coalesce(v_record -> 'context', '{}'::jsonb),
      coalesce(v_record ->> 'context_key', ''),
      (v_record ->> 'value')::numeric,
      v_record ->> 'unit',
      coalesce((v_record ->> 'achieved_at')::timestamptz, now()),
      v_session_id,
      'session'
    )
    on conflict (user_id, exercise_id, record_type, context_key) do update set
      value = excluded.value,
      unit = excluded.unit,
      context = excluded.context,
      achieved_at = excluded.achieved_at,
      session_id = excluded.session_id,
      source = 'session'
    where case
            when r.record_type in ('best_time', 'best_pace') then excluded.value < r.value
            else excluded.value > r.value
          end;
    get diagnostics v_rows = row_count;
    if v_rows > 0 then
      v_new_records := v_new_records || jsonb_build_array(v_record);
    end if;
  end loop;

  return jsonb_build_object(
    'status', 'saved',
    'session_id', v_session_id,
    'new_records', v_new_records
  );
end;
$$;

comment on function public.save_workout_session(jsonb) is
  'Speichert ein Training mit Übungen, Sätzen, neuen Bestleistungen, Bezug zur geplanten Einheit und zum Tagesform-Check-in atomar und idempotent.';
