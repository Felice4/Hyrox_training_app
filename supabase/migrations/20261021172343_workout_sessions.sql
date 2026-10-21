-- =============================================================================
-- Migration 0004 – Absolvierte Trainings: Sessions, Übungen, Sätze
-- Siehe docs/DATABASE.md §3.8–3.10 und §5.
--
-- Alle IDs kommen vom Client (crypto.randomUUID). Dadurch ist save_workout_session
-- idempotent: Wiederholtes Speichern (Doppelklick, Netzfehler) überschreibt denselben
-- Datensatz statt neue anzulegen.
-- =============================================================================

create table public.workout_sessions (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  -- planned_workout_id / readiness_checkin_id folgen mit Migration 0005 / 0006
  started_at timestamptz not null,
  ended_at timestamptz not null,
  active_duration_sec integer not null check (active_duration_sec between 0 and 86400),
  status text not null check (status in ('completed', 'partial')),
  focus text not null check (focus in ('hyrox', 'strength', 'endurance', 'full_body', 'mixed', 'recovery')),
  intensity text not null check (intensity in ('easy', 'moderate', 'hard')),
  session_rpe smallint check (session_rpe between 1 and 10),
  notes text check (char_length(notes) <= 2000),
  -- Ursprünglich geplantes Workout (zum Vergleich Plan ↔ Ist)
  workout_snapshot jsonb not null check (jsonb_typeof(workout_snapshot) = 'object'),
  generator_version text,
  -- Belastung nach sRPE-Methode: RPE × aktive Minuten (berechnet in der App)
  training_load integer not null default 0 check (training_load >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint workout_sessions_time_order check (ended_at >= started_at)
);

comment on table public.workout_sessions is 'Absolvierte (auch teilweise) Trainings.';

create index workout_sessions_user_started_idx on public.workout_sessions (user_id, started_at desc);

create trigger workout_sessions_set_updated_at
  before update on public.workout_sessions
  for each row execute function public.set_updated_at();

create table public.session_exercises (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  session_id uuid not null references public.workout_sessions (id) on delete cascade,
  exercise_id uuid not null references public.exercises (id) on delete restrict,
  -- Name zum Zeitpunkt des Trainings (bleibt lesbar, falls die Übung umbenannt wird)
  exercise_name text not null check (char_length(exercise_name) between 1 and 120),
  position smallint not null check (position >= 0),
  block text not null check (block in ('warmup', 'main', 'accessory', 'conditioning', 'cooldown')),
  role text,
  status text not null check (status in ('completed', 'partial', 'skipped')),
  replaced_exercise_id uuid references public.exercises (id) on delete restrict,
  notes text check (char_length(notes) <= 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index session_exercises_session_idx on public.session_exercises (session_id);
create index session_exercises_exercise_idx on public.session_exercises (exercise_id);

create trigger session_exercises_set_updated_at
  before update on public.session_exercises
  for each row execute function public.set_updated_at();

create table public.session_sets (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  session_exercise_id uuid not null references public.session_exercises (id) on delete cascade,
  set_number smallint not null check (set_number >= 1),
  set_type text not null check (set_type in ('warmup', 'working', 'interval', 'round')),
  -- Vorgabe
  target_reps smallint check (target_reps between 0 and 1000),
  target_weight_kg numeric(6, 2) check (target_weight_kg between 0 and 500),
  target_distance_m numeric(8, 1) check (target_distance_m between 0 and 100000),
  target_duration_sec integer check (target_duration_sec between 0 and 86400),
  target_calories smallint check (target_calories between 0 and 5000),
  -- Tatsächlich absolviert
  reps smallint check (reps between 0 and 1000),
  weight_kg numeric(6, 2) check (weight_kg between 0 and 500),
  distance_m numeric(8, 1) check (distance_m between 0 and 100000),
  duration_sec integer check (duration_sec between 0 and 86400),
  calories smallint check (calories between 0 and 5000),
  rpe numeric(3, 1) check (rpe between 1 and 10),
  completed boolean not null default false,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index session_sets_exercise_idx on public.session_sets (session_exercise_id);

create trigger session_sets_set_updated_at
  before update on public.session_sets
  for each row execute function public.set_updated_at();

-- Bestleistungen aus Trainings verweisen auf die Session (aus Migration 0003 vorbereitet)
alter table public.personal_records
  add constraint personal_records_session_fk
  foreign key (session_id) references public.workout_sessions (id) on delete set null;

-- -----------------------------------------------------------------------------
-- Rechte und Row Level Security
-- Kind-Tabellen prüfen zusätzlich, dass der Elterndatensatz demselben Nutzer gehört.
-- -----------------------------------------------------------------------------
revoke all on public.workout_sessions from anon, authenticated;
revoke all on public.session_exercises from anon, authenticated;
revoke all on public.session_sets from anon, authenticated;
grant select, insert, update, delete on public.workout_sessions to authenticated;
grant select, insert, update, delete on public.session_exercises to authenticated;
grant select, insert, update, delete on public.session_sets to authenticated;

alter table public.workout_sessions enable row level security;
alter table public.session_exercises enable row level security;
alter table public.session_sets enable row level security;

create policy "workout_sessions: eigene lesen"
  on public.workout_sessions for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "workout_sessions: eigene anlegen"
  on public.workout_sessions for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "workout_sessions: eigene ändern"
  on public.workout_sessions for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "workout_sessions: eigene löschen"
  on public.workout_sessions for delete to authenticated
  using ((select auth.uid()) = user_id);

create policy "session_exercises: eigene lesen"
  on public.session_exercises for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "session_exercises: eigene anlegen"
  on public.session_exercises for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and exists (select 1 from public.workout_sessions s
                 where s.id = session_id and s.user_id = (select auth.uid()))
    and exists (select 1 from public.exercises e
                 where e.id = exercise_id and e.user_id = (select auth.uid()))
  );
create policy "session_exercises: eigene ändern"
  on public.session_exercises for update to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and exists (select 1 from public.workout_sessions s
                 where s.id = session_id and s.user_id = (select auth.uid()))
    and exists (select 1 from public.exercises e
                 where e.id = exercise_id and e.user_id = (select auth.uid()))
  );
create policy "session_exercises: eigene löschen"
  on public.session_exercises for delete to authenticated
  using ((select auth.uid()) = user_id);

create policy "session_sets: eigene lesen"
  on public.session_sets for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "session_sets: eigene anlegen"
  on public.session_sets for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and exists (select 1 from public.session_exercises se
                 where se.id = session_exercise_id and se.user_id = (select auth.uid()))
  );
create policy "session_sets: eigene ändern"
  on public.session_sets for update to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and exists (select 1 from public.session_exercises se
                 where se.id = session_exercise_id and se.user_id = (select auth.uid()))
  );
create policy "session_sets: eigene löschen"
  on public.session_sets for delete to authenticated
  using ((select auth.uid()) = user_id);

-- -----------------------------------------------------------------------------
-- save_workout_session: speichert ein Training komplett in EINER Transaktion.
-- Idempotent über die Client-IDs. Übungen/Sätze dieser Session, die im Payload
-- fehlen, werden entfernt. Bestleistungen werden nur übernommen, wenn sie besser
-- sind als der bisherige Wert (Zeiten: niedriger, sonst höher).
--
-- p = {
--   session:   { id, started_at, ended_at, active_duration_sec, status, focus, intensity,
--                session_rpe, notes, workout_snapshot, generator_version, training_load },
--   exercises: [{ id, exercise_slug, exercise_name, position, block, role, status,
--                 replaced_exercise_slug, notes,
--                 sets: [{ id, set_number, set_type, target_*, reps, weight_kg, distance_m,
--                          duration_sec, calories, rpe, completed, completed_at }] }],
--   records:   [{ exercise_slug, record_type, context, context_key, value, unit, achieved_at }]
-- }
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
begin
  if v_user is null then
    raise exception 'Nicht angemeldet' using errcode = '42501';
  end if;
  if jsonb_typeof(v_session) is distinct from 'object' or v_session ->> 'id' is null then
    raise exception 'session mit id ist erforderlich' using errcode = '22023';
  end if;
  v_session_id := (v_session ->> 'id')::uuid;

  -- Session -------------------------------------------------------------------
  insert into public.workout_sessions as s (
    id, started_at, ended_at, active_duration_sec, status, focus, intensity, session_rpe,
    notes, workout_snapshot, generator_version, training_load
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
    coalesce((v_session ->> 'training_load')::integer, 0)
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
    training_load = excluded.training_load
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
  'Speichert ein Training mit Übungen, Sätzen und neuen Bestleistungen atomar und idempotent.';

revoke all on function public.save_workout_session(jsonb) from public, anon;
grant execute on function public.save_workout_session(jsonb) to authenticated;
