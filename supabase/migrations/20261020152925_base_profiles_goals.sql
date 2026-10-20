-- =============================================================================
-- Migration 0001 – Basis: updated_at-Trigger, Profil, Trainingsziele
-- Siehe docs/DATABASE.md §3.1 und §3.2.
-- Sicherheit: RLS auf jeder Tabelle; Zugriff nur für angemeldete Nutzer auf eigene Zeilen.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Gemeinsamer Trigger: setzt updated_at bei jeder Änderung
-- -----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- profiles: Körperdaten, Trainingshintergrund, Trainingsbedingungen (1 Zeile je Nutzer)
-- Felder sind bis zum Abschluss des Onboardings (Schritt 2.5) optional.
-- -----------------------------------------------------------------------------
create table public.profiles (
  user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  display_name text check (char_length(display_name) between 1 and 50),
  birth_date date check (birth_date >= date '1920-01-01'),
  height_cm numeric(5, 1) check (height_cm between 100 and 250),
  sex text check (sex in ('female', 'male', 'diverse')),
  training_level text check (training_level in ('beginner', 'intermediate', 'advanced')),
  hyrox_experience text check (hyrox_experience in ('none', 'some', 'competed')),
  strength_experience text check (strength_experience in ('none', 'under_1y', '1_3y', 'over_3y')),
  endurance_experience text check (endurance_experience in ('none', 'under_1y', '1_3y', 'over_3y')),
  fitness_notes text check (char_length(fitness_notes) <= 2000),
  training_days_per_week smallint check (training_days_per_week between 1 and 7),
  -- ISO-Wochentage: 1 = Montag … 7 = Sonntag
  preferred_weekdays smallint[] not null default '{}'
    check (preferred_weekdays <@ array[1, 2, 3, 4, 5, 6, 7]::smallint[]),
  default_duration_min smallint not null default 60 check (default_duration_min between 20 and 150),
  -- Werte aus den Wertelisten im Code (src/data/…)
  available_equipment text[] not null default '{}',
  limitation_regions text[] not null default '{}',
  limitation_notes text check (char_length(limitation_notes) <= 2000),
  onboarding_completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is 'Profil des Nutzers (1:1 zu auth.users).';

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- training_goals: Gewichtung der vier Hauptziele (1 Zeile je Nutzer)
-- Werte 0–100; der Generator normalisiert, die Summe muss nicht 100 sein.
-- -----------------------------------------------------------------------------
create table public.training_goals (
  user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  weight_hypertrophy smallint not null default 25 check (weight_hypertrophy between 0 and 100),
  weight_strength smallint not null default 25 check (weight_strength between 0 and 100),
  weight_endurance smallint not null default 25 check (weight_endurance between 0 and 100),
  weight_hyrox smallint not null default 25 check (weight_hyrox between 0 and 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint training_goals_weights_positive
    check (weight_hypertrophy + weight_strength + weight_endurance + weight_hyrox > 0)
);

comment on table public.training_goals is 'Gewichtung der Trainingsziele (1:1 zu auth.users).';

create trigger training_goals_set_updated_at
  before update on public.training_goals
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- Zugriffsrechte und Row Level Security
-- anon (nicht angemeldet) erhält keinerlei Zugriff.
-- Löschen ist nicht vorgesehen; das Profil verschwindet nur mit dem Konto (on delete cascade).
-- -----------------------------------------------------------------------------
revoke all on public.profiles from anon, authenticated;
revoke all on public.training_goals from anon, authenticated;
grant select, insert, update on public.profiles to authenticated;
grant select, insert, update on public.training_goals to authenticated;

alter table public.profiles enable row level security;
alter table public.training_goals enable row level security;

create policy "profiles: eigene Zeile lesen"
  on public.profiles for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "profiles: eigene Zeile anlegen"
  on public.profiles for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "profiles: eigene Zeile ändern"
  on public.profiles for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "training_goals: eigene Zeile lesen"
  on public.training_goals for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "training_goals: eigene Zeile anlegen"
  on public.training_goals for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "training_goals: eigene Zeile ändern"
  on public.training_goals for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
