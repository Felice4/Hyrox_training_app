-- =============================================================================
-- Migration 0011 – Wettkampfvorbereitung
-- Siehe docs/RACE_PREP.md und docs/DATABASE.md §3.17.
--
-- Ein Wettkampf mit Datum und Variante (Format, Kategorie, Wertung). Die Phasen
-- (Aufbau, Spezifisch, Entlastung, Tapering …) werden nicht gespeichert, sondern im
-- Code aus plan_start und race_date berechnet. Höchstens ein aktiver Wettkampf.
-- =============================================================================

create table public.races (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 120),
  race_date date not null,
  -- Montag, ab dem der Phasenplan zählt (beim Anlegen festgelegt)
  plan_start date not null,
  format text not null check (format in ('single', 'double', 'relay')),
  category text not null check (category in ('open', 'pro')),
  gender text not null check (gender in ('men', 'women', 'mixed')),
  days_per_week smallint not null check (days_per_week between 3 and 5),
  weekdays smallint[] not null default '{}'
    check (weekdays <@ array[1, 2, 3, 4, 5, 6, 7]::smallint[]),
  target_time_sec integer check (target_time_sec between 1200 and 18000),
  status text not null default 'active' check (status in ('active', 'completed', 'cancelled')),
  result_time_sec integer check (result_time_sec between 600 and 36000),
  result_session_id uuid references public.workout_sessions (id) on delete set null,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Pro gibt es nicht als Staffel, Mixed nicht als Singles; Mixed Doubles nur Open
  constraint races_variant check (
    not (format = 'relay' and category = 'pro')
    and not (format = 'single' and gender = 'mixed')
    and not (format = 'double' and gender = 'mixed' and category = 'pro')
  ),
  constraint races_plan_start_monday check (extract(isodow from plan_start) = 1),
  constraint races_plan_before_race check (plan_start <= race_date)
);

comment on table public.races is
  'Wettkämpfe mit Datum und Variante; die Trainingsphasen werden im Code berechnet.';

-- Höchstens ein aktiver Wettkampf je Nutzer (docs/RACE_PREP.md)
create unique index races_one_active_idx on public.races (user_id) where status = 'active';
create index races_user_date_idx on public.races (user_id, race_date desc);

create trigger races_set_updated_at
  before update on public.races
  for each row execute function public.set_updated_at();

-- Art der Einheit im Wettkampfmodus (Schritt 6.3b); null = normale Einheit
alter table public.planned_workouts
  add column race_session_type text
    check (race_session_type in (
      'compromised_run', 'run_intervals', 'easy_run', 'station_strength', 'simulation', 'activation'
    ));

-- -----------------------------------------------------------------------------
-- Rechte und Row Level Security
-- -----------------------------------------------------------------------------
revoke all on public.races from anon, authenticated;
grant select, insert, update, delete on public.races to authenticated;

alter table public.races enable row level security;

create policy "races: eigene lesen"
  on public.races for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "races: eigene anlegen"
  on public.races for insert to authenticated
  with check ((select auth.uid()) = user_id and result_session_id is null);
create policy "races: eigene ändern"
  on public.races for update to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and (
      result_session_id is null
      or exists (
        select 1 from public.workout_sessions s
         where s.id = result_session_id and s.user_id = (select auth.uid())
      )
    )
  );
create policy "races: eigene löschen"
  on public.races for delete to authenticated
  using ((select auth.uid()) = user_id);
