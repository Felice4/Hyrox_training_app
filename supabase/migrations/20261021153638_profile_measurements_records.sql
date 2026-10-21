-- =============================================================================
-- Migration 0003 – Körperwerte, Bestleistungen, Speichern des Profils
-- Siehe docs/DATABASE.md §3.1, §3.4, §3.11 und §5.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- profiles: bisherige HYROX-Bestzeit (optional, 30 min – 4 h)
-- -----------------------------------------------------------------------------
alter table public.profiles
  add column hyrox_best_time_sec integer check (hyrox_best_time_sec between 1800 and 14400);

-- -----------------------------------------------------------------------------
-- body_measurements: Körpergewicht und weitere Messwerte im Zeitverlauf
-- Höchstens ein Eintrag pro Tag (erneutes Speichern aktualisiert ihn).
-- -----------------------------------------------------------------------------
create table public.body_measurements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  measured_on date not null,
  weight_kg numeric(5, 2) check (weight_kg between 30 and 250),
  body_fat_pct numeric(4, 1) check (body_fat_pct between 3 and 60),
  waist_cm numeric(5, 1) check (waist_cm between 40 and 200),
  chest_cm numeric(5, 1) check (chest_cm between 50 and 200),
  arm_cm numeric(5, 1) check (arm_cm between 15 and 70),
  thigh_cm numeric(5, 1) check (thigh_cm between 30 and 120),
  notes text check (char_length(notes) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint body_measurements_one_per_day unique (user_id, measured_on),
  constraint body_measurements_has_value check (
    num_nonnulls(weight_kg, body_fat_pct, waist_cm, chest_cm, arm_cm, thigh_cm) > 0
  )
);

comment on table public.body_measurements is 'Körpermesswerte im Zeitverlauf (max. ein Eintrag pro Tag).';

create trigger body_measurements_set_updated_at
  before update on public.body_measurements
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- personal_records: aktuelle Bestleistung je Übung, Art und Bedingung
-- Die Leistungsentwicklung entsteht aus den Trainingssätzen, nicht aus dieser Tabelle.
-- session_id erhält seinen Fremdschlüssel mit der Trainings-Migration (Schritt 2.7).
-- -----------------------------------------------------------------------------
create table public.personal_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  exercise_id uuid not null references public.exercises (id) on delete restrict,
  record_type text not null check (
    record_type in ('max_weight', 'estimated_1rm', 'max_reps', 'best_time', 'max_distance', 'best_pace')
  ),
  context jsonb not null default '{}' check (jsonb_typeof(context) = 'object'),
  context_key text not null default '',
  value numeric(10, 2) not null check (value > 0),
  unit text not null check (unit in ('kg', 'reps', 'sec', 'm', 'sec_per_km')),
  achieved_at timestamptz not null default now(),
  session_id uuid,
  source text not null check (source in ('session', 'manual')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint personal_records_unique unique (user_id, exercise_id, record_type, context_key),
  constraint personal_records_manual_without_session check (source = 'session' or session_id is null)
);

comment on table public.personal_records is
  'Bestleistungen je Übung unter gleichen Bedingungen (context_key), aus Trainings oder manuell.';

create trigger personal_records_set_updated_at
  before update on public.personal_records
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- Rechte und Row Level Security
-- -----------------------------------------------------------------------------
revoke all on public.body_measurements from anon, authenticated;
revoke all on public.personal_records from anon, authenticated;
grant select, insert, update, delete on public.body_measurements to authenticated;
grant select, insert, update, delete on public.personal_records to authenticated;

alter table public.body_measurements enable row level security;
alter table public.personal_records enable row level security;

create policy "body_measurements: eigene lesen"
  on public.body_measurements for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "body_measurements: eigene anlegen"
  on public.body_measurements for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "body_measurements: eigene ändern"
  on public.body_measurements for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "body_measurements: eigene löschen"
  on public.body_measurements for delete to authenticated
  using ((select auth.uid()) = user_id);

create policy "personal_records: eigene lesen"
  on public.personal_records for select to authenticated
  using ((select auth.uid()) = user_id);
-- Die Übung muss ebenfalls dem Nutzer gehören
create policy "personal_records: eigene anlegen"
  on public.personal_records for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.exercises e
      where e.id = exercise_id and e.user_id = (select auth.uid())
    )
  );
create policy "personal_records: eigene ändern"
  on public.personal_records for update to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.exercises e
      where e.id = exercise_id and e.user_id = (select auth.uid())
    )
  );
-- Nur manuell eingetragene Bestleistungen dürfen gelöscht werden
create policy "personal_records: eigene manuelle löschen"
  on public.personal_records for delete to authenticated
  using ((select auth.uid()) = user_id and source = 'manual');

-- -----------------------------------------------------------------------------
-- save_profile: speichert Onboarding bzw. Profiländerungen in EINER Transaktion.
-- security invoker → RLS gilt. Idempotent: erneutes Speichern ändert nur Werte.
--
-- p = {
--   profile:      { display_name, birth_date, height_cm, sex, training_level, … },
--   goals:        { weight_hypertrophy, weight_strength, weight_endurance, weight_hyrox },
--   measurement:  { measured_on, weight_kg, body_fat_pct } | null,
--   preferences:  { preferred: [slug…], disliked: [slug…] }       (optional),
--   records:      [{ exercise_slug, record_type, context, context_key, unit, value|null }] (optional)
-- }
-- Präferenzen: genannte Übungen werden bevorzugt/unbeliebt, bisher bevorzugte/unbeliebte,
-- die fehlen, werden neutral; „ausgeblendet" bleibt unverändert.
-- Bestleistungen: value = null entfernt einen MANUELLEN Eintrag; Einträge aus Trainings
-- werden von Hand nie überschrieben.
-- -----------------------------------------------------------------------------
create or replace function public.save_profile(p jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_profile jsonb := p -> 'profile';
  v_goals jsonb := p -> 'goals';
  v_measurement jsonb := p -> 'measurement';
  v_preferred text[];
  v_disliked text[];
  v_record jsonb;
  v_exercise_id uuid;
  v_first_completion boolean;
  v_rows integer;
  v_records_saved integer := 0;
  v_records_removed integer := 0;
  v_records_skipped integer := 0;
begin
  if v_user is null then
    raise exception 'Nicht angemeldet' using errcode = '42501';
  end if;
  if jsonb_typeof(v_profile) is distinct from 'object' or jsonb_typeof(v_goals) is distinct from 'object' then
    raise exception 'profile und goals sind erforderlich' using errcode = '22023';
  end if;

  select not exists (
    select 1 from public.profiles pr
     where pr.user_id = v_user and pr.onboarding_completed_at is not null
  ) into v_first_completion;

  -- Profil -------------------------------------------------------------------
  insert into public.profiles as pr (
    user_id, display_name, birth_date, height_cm, sex, training_level, hyrox_experience,
    strength_experience, endurance_experience, fitness_notes, hyrox_best_time_sec,
    training_days_per_week, preferred_weekdays, default_duration_min, available_equipment,
    limitation_regions, limitation_notes, onboarding_completed_at
  ) values (
    v_user,
    v_profile ->> 'display_name',
    (v_profile ->> 'birth_date')::date,
    (v_profile ->> 'height_cm')::numeric,
    v_profile ->> 'sex',
    v_profile ->> 'training_level',
    v_profile ->> 'hyrox_experience',
    v_profile ->> 'strength_experience',
    v_profile ->> 'endurance_experience',
    v_profile ->> 'fitness_notes',
    (v_profile ->> 'hyrox_best_time_sec')::integer,
    (v_profile ->> 'training_days_per_week')::smallint,
    array(select jsonb_array_elements_text(v_profile -> 'preferred_weekdays')::smallint),
    coalesce((v_profile ->> 'default_duration_min')::smallint, 60),
    array(select jsonb_array_elements_text(v_profile -> 'available_equipment')),
    array(select jsonb_array_elements_text(v_profile -> 'limitation_regions')),
    v_profile ->> 'limitation_notes',
    now()
  )
  on conflict (user_id) do update set
    display_name = excluded.display_name,
    birth_date = excluded.birth_date,
    height_cm = excluded.height_cm,
    sex = excluded.sex,
    training_level = excluded.training_level,
    hyrox_experience = excluded.hyrox_experience,
    strength_experience = excluded.strength_experience,
    endurance_experience = excluded.endurance_experience,
    fitness_notes = excluded.fitness_notes,
    hyrox_best_time_sec = excluded.hyrox_best_time_sec,
    training_days_per_week = excluded.training_days_per_week,
    preferred_weekdays = excluded.preferred_weekdays,
    default_duration_min = excluded.default_duration_min,
    available_equipment = excluded.available_equipment,
    limitation_regions = excluded.limitation_regions,
    limitation_notes = excluded.limitation_notes,
    onboarding_completed_at = coalesce(pr.onboarding_completed_at, excluded.onboarding_completed_at);

  -- Ziele --------------------------------------------------------------------
  insert into public.training_goals as g (
    user_id, weight_hypertrophy, weight_strength, weight_endurance, weight_hyrox
  ) values (
    v_user,
    (v_goals ->> 'weight_hypertrophy')::smallint,
    (v_goals ->> 'weight_strength')::smallint,
    (v_goals ->> 'weight_endurance')::smallint,
    (v_goals ->> 'weight_hyrox')::smallint
  )
  on conflict (user_id) do update set
    weight_hypertrophy = excluded.weight_hypertrophy,
    weight_strength = excluded.weight_strength,
    weight_endurance = excluded.weight_endurance,
    weight_hyrox = excluded.weight_hyrox;

  -- Körperwerte (ein Eintrag pro Tag) -----------------------------------------
  if jsonb_typeof(v_measurement) = 'object' then
    insert into public.body_measurements as bm (measured_on, weight_kg, body_fat_pct)
    values (
      (v_measurement ->> 'measured_on')::date,
      (v_measurement ->> 'weight_kg')::numeric,
      (v_measurement ->> 'body_fat_pct')::numeric
    )
    on conflict (user_id, measured_on) do update set
      weight_kg = coalesce(excluded.weight_kg, bm.weight_kg),
      body_fat_pct = coalesce(excluded.body_fat_pct, bm.body_fat_pct);
  end if;

  -- Präferenzen --------------------------------------------------------------
  if jsonb_typeof(p -> 'preferences') = 'object' then
    v_preferred := array(select jsonb_array_elements_text(p -> 'preferences' -> 'preferred'));
    v_disliked := array(select jsonb_array_elements_text(p -> 'preferences' -> 'disliked'));
    if v_preferred && v_disliked then
      raise exception 'Eine Übung kann nicht zugleich bevorzugt und unbeliebt sein'
        using errcode = '22023';
    end if;

    update public.exercises e
       set preference = case
             when e.slug = any (v_preferred) then 'preferred'
             when e.slug = any (v_disliked) then 'disliked'
             else 'neutral'
           end
     where e.user_id = v_user
       and (e.slug = any (v_preferred) or e.slug = any (v_disliked)
            or e.preference in ('preferred', 'disliked'))
       and e.preference is distinct from case
             when e.slug = any (v_preferred) then 'preferred'
             when e.slug = any (v_disliked) then 'disliked'
             else 'neutral'
           end;
  end if;

  -- Manuelle Bestleistungen --------------------------------------------------
  for v_record in
    select * from jsonb_array_elements(coalesce(p -> 'records', '[]'::jsonb))
  loop
    v_exercise_id := (
      select e.id from public.exercises e
       where e.user_id = v_user and e.slug = v_record ->> 'exercise_slug'
    );
    if v_exercise_id is null then
      v_records_skipped := v_records_skipped + 1;
      continue;
    end if;

    if jsonb_typeof(v_record -> 'value') is distinct from 'number' then
      delete from public.personal_records r
       where r.user_id = v_user
         and r.exercise_id = v_exercise_id
         and r.record_type = v_record ->> 'record_type'
         and r.context_key = coalesce(v_record ->> 'context_key', '')
         and r.source = 'manual';
      get diagnostics v_rows = row_count;
      v_records_removed := v_records_removed + v_rows;
    else
      insert into public.personal_records as r (
        exercise_id, record_type, context, context_key, value, unit, achieved_at, source
      ) values (
        v_exercise_id,
        v_record ->> 'record_type',
        coalesce(v_record -> 'context', '{}'::jsonb),
        coalesce(v_record ->> 'context_key', ''),
        (v_record ->> 'value')::numeric,
        v_record ->> 'unit',
        now(),
        'manual'
      )
      on conflict (user_id, exercise_id, record_type, context_key) do update set
        value = excluded.value,
        unit = excluded.unit,
        context = excluded.context,
        achieved_at = case when r.value is distinct from excluded.value
                           then excluded.achieved_at else r.achieved_at end
      where r.source = 'manual';
      get diagnostics v_rows = row_count;
      v_records_saved := v_records_saved + v_rows;
    end if;
  end loop;

  return jsonb_build_object(
    'status', 'saved',
    'first_completion', v_first_completion,
    'records_saved', v_records_saved,
    'records_removed', v_records_removed,
    'records_skipped', v_records_skipped
  );
end;
$$;

comment on function public.save_profile(jsonb) is
  'Speichert Profil, Ziele, Körperwerte, Präferenzen und manuelle Bestleistungen atomar.';

revoke all on function public.save_profile(jsonb) from public, anon;
grant execute on function public.save_profile(jsonb) to authenticated;
