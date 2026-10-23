-- =============================================================================
-- Migration 0005 – Wochenpläne und geplante Einheiten
-- Siehe docs/DATABASE.md §3.6, §3.7 und §5.
--
-- Grundsatz: Vergangene und erledigte Einheiten werden durch eine Neuplanung NIE
-- verändert. replace_week_plan ersetzt nur geplante Einheiten ab heute.
-- =============================================================================

create table public.week_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  -- Montag der Kalenderwoche
  week_start date not null check (extract(isodow from week_start) = 1),
  generator_version text,
  notes text check (char_length(notes) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint week_plans_one_per_week unique (user_id, week_start)
);

comment on table public.week_plans is 'Ein Wochenplan je Kalenderwoche (Montag = week_start).';

create trigger week_plans_set_updated_at
  before update on public.week_plans
  for each row execute function public.set_updated_at();

create table public.planned_workouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  week_plan_id uuid references public.week_plans (id) on delete set null,
  scheduled_date date not null,
  -- Ursprüngliches Datum, falls verschoben
  original_date date,
  status text not null default 'planned' check (status in ('planned', 'completed', 'skipped')),
  focus text not null check (focus in ('hyrox', 'strength', 'endurance', 'full_body', 'mixed', 'recovery')),
  target_duration_min smallint not null check (target_duration_min between 10 and 240),
  intensity text not null check (intensity in ('easy', 'moderate', 'hard')),
  -- Erzeugtes Workout (GeneratedWorkout); null = nur Schwerpunkt geplant
  workout jsonb check (workout is null or jsonb_typeof(workout) = 'object'),
  explanation text[] not null default '{}',
  source text not null default 'week_plan' check (source in ('week_plan', 'manual')),
  completed_session_id uuid references public.workout_sessions (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.planned_workouts is 'Geplante Trainingseinheiten (aus dem Wochenplan oder spontan).';

create index planned_workouts_user_date_idx on public.planned_workouts (user_id, scheduled_date);

create trigger planned_workouts_set_updated_at
  before update on public.planned_workouts
  for each row execute function public.set_updated_at();

-- Absolvierte Trainings können sich auf eine geplante Einheit beziehen
alter table public.workout_sessions
  add column planned_workout_id uuid references public.planned_workouts (id) on delete set null;

-- -----------------------------------------------------------------------------
-- Rechte und Row Level Security
-- -----------------------------------------------------------------------------
revoke all on public.week_plans from anon, authenticated;
revoke all on public.planned_workouts from anon, authenticated;
grant select, insert, update, delete on public.week_plans to authenticated;
grant select, insert, update, delete on public.planned_workouts to authenticated;

alter table public.week_plans enable row level security;
alter table public.planned_workouts enable row level security;

create policy "week_plans: eigene lesen"
  on public.week_plans for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "week_plans: eigene anlegen"
  on public.week_plans for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "week_plans: eigene ändern"
  on public.week_plans for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "week_plans: eigene löschen"
  on public.week_plans for delete to authenticated
  using ((select auth.uid()) = user_id);

create policy "planned_workouts: eigene lesen"
  on public.planned_workouts for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "planned_workouts: eigene anlegen"
  on public.planned_workouts for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and (week_plan_id is null or exists (
      select 1 from public.week_plans wp
       where wp.id = week_plan_id and wp.user_id = (select auth.uid())))
  );
create policy "planned_workouts: eigene ändern"
  on public.planned_workouts for update to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and (week_plan_id is null or exists (
      select 1 from public.week_plans wp
       where wp.id = week_plan_id and wp.user_id = (select auth.uid())))
  );
-- Erledigte Einheiten bleiben erhalten (Historie)
create policy "planned_workouts: eigene offene löschen"
  on public.planned_workouts for delete to authenticated
  using ((select auth.uid()) = user_id and status <> 'completed');

-- -----------------------------------------------------------------------------
-- replace_week_plan: legt den Wochenplan an bzw. ersetzt dessen OFFENE, zukünftige
-- Einheiten. Erledigte, ausgefallene und vergangene Einheiten bleiben unverändert.
--
-- p = { week_start, today, generator_version, notes,
--       workouts: [{ scheduled_date, focus, target_duration_min, intensity, workout, explanation }] }
-- `today` ist das lokale Datum des Geräts (Zeitzone des Nutzers).
-- -----------------------------------------------------------------------------
create or replace function public.replace_week_plan(p jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_week_start date := (p ->> 'week_start')::date;
  v_today date := (p ->> 'today')::date;
  v_plan_id uuid;
  v_workout jsonb;
  v_date date;
  v_removed integer;
  v_inserted integer := 0;
begin
  if v_user is null then
    raise exception 'Nicht angemeldet' using errcode = '42501';
  end if;
  if v_week_start is null or v_today is null or extract(isodow from v_week_start) <> 1 then
    raise exception 'week_start (Montag) und today sind erforderlich' using errcode = '22023';
  end if;

  insert into public.week_plans as wp (week_start, generator_version, notes)
  values (v_week_start, p ->> 'generator_version', p ->> 'notes')
  on conflict (user_id, week_start) do update set
    generator_version = excluded.generator_version,
    notes = excluded.notes
  returning wp.id into v_plan_id;

  -- Nur offene Einheiten ab heute ersetzen – Vergangenheit bleibt unangetastet
  delete from public.planned_workouts pw
   where pw.user_id = v_user
     and pw.week_plan_id = v_plan_id
     and pw.status = 'planned'
     and pw.scheduled_date >= v_today;
  get diagnostics v_removed = row_count;

  for v_workout in select * from jsonb_array_elements(coalesce(p -> 'workouts', '[]'::jsonb))
  loop
    v_date := (v_workout ->> 'scheduled_date')::date;
    if v_date < v_today or v_date < v_week_start or v_date > v_week_start + 6 then
      raise exception 'Datum % liegt nicht in der Woche ab heute', v_date using errcode = '22023';
    end if;
    insert into public.planned_workouts (
      week_plan_id, scheduled_date, status, focus, target_duration_min, intensity,
      workout, explanation, source
    ) values (
      v_plan_id,
      v_date,
      'planned',
      v_workout ->> 'focus',
      (v_workout ->> 'target_duration_min')::smallint,
      v_workout ->> 'intensity',
      v_workout -> 'workout',
      array(select jsonb_array_elements_text(coalesce(v_workout -> 'explanation', '[]'::jsonb))),
      'week_plan'
    );
    v_inserted := v_inserted + 1;
  end loop;

  return jsonb_build_object(
    'status', 'saved',
    'week_plan_id', v_plan_id,
    'removed', v_removed,
    'inserted', v_inserted
  );
end;
$$;

comment on function public.replace_week_plan(jsonb) is
  'Legt einen Wochenplan an bzw. ersetzt nur offene, zukünftige Einheiten.';

revoke all on function public.replace_week_plan(jsonb) from public, anon;
grant execute on function public.replace_week_plan(jsonb) to authenticated;

-- -----------------------------------------------------------------------------
-- save_workout_session (neue Fassung): zusätzlich planned_workout_id speichern und
-- die geplante Einheit als erledigt markieren. Sonst unverändert zu Migration 0004.
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
begin
  if v_user is null then
    raise exception 'Nicht angemeldet' using errcode = '42501';
  end if;
  if jsonb_typeof(v_session) is distinct from 'object' or v_session ->> 'id' is null then
    raise exception 'session mit id ist erforderlich' using errcode = '22023';
  end if;
  v_session_id := (v_session ->> 'id')::uuid;
  v_planned_id := (v_session ->> 'planned_workout_id')::uuid;

  -- Session -------------------------------------------------------------------
  insert into public.workout_sessions as s (
    id, started_at, ended_at, active_duration_sec, status, focus, intensity, session_rpe,
    notes, workout_snapshot, generator_version, training_load, planned_workout_id
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
    v_planned_id
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
    planned_workout_id = excluded.planned_workout_id
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
  'Speichert ein Training mit Übungen, Sätzen, neuen Bestleistungen und Bezug zur geplanten Einheit atomar und idempotent.';
