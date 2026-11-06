-- =============================================================================
-- Migration 0009 – HYROX-Simulationen mit Zwischenzeiten
-- Siehe docs/SIMULATION.md und docs/DATABASE.md §3.15.
--
-- Eine Simulation wird als normales Training gespeichert (save_workout_session,
-- je Abschnitt eine Übung mit Zeit). Diese Tabelle hält zusätzlich Format, Division
-- und die Zwischenzeiten in Sekunden – für schnelle Vergleiche über alle Simulationen,
-- auch ältere als der geladene Trainingsverlauf.
-- =============================================================================

create table public.hyrox_simulations (
  session_id uuid primary key references public.workout_sessions (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  format text not null check (format in ('full', 'half_1', 'half_2', 'short')),
  division text not null check (division in ('open_men', 'open_women', 'pro_men', 'pro_women')),
  started_at timestamptz not null,
  total_sec integer not null check (total_sec > 0),
  -- Zeit je Abschnitt (Lauf, Station, Lauf, …) in Sekunden; Roxzone steckt im Lauf
  splits integer[] not null
    check (cardinality(splits) between 1 and 16 and 0 < all (splits)),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.hyrox_simulations is
  'HYROX-Simulationen: Format, Division und Zwischenzeiten je Abschnitt (gehört zu einem gespeicherten Training).';

create index hyrox_simulations_user_started_idx
  on public.hyrox_simulations (user_id, started_at desc);

create trigger hyrox_simulations_set_updated_at
  before update on public.hyrox_simulations
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- Rechte und Row Level Security
-- Anlegen/Ändern nur für eigene Trainings (die Fremdschlüsselprüfung allein
-- kennt keine Row Level Security).
-- -----------------------------------------------------------------------------
revoke all on public.hyrox_simulations from anon, authenticated;
grant select, insert, update, delete on public.hyrox_simulations to authenticated;

alter table public.hyrox_simulations enable row level security;

create policy "hyrox_simulations: eigene lesen"
  on public.hyrox_simulations for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "hyrox_simulations: eigene anlegen"
  on public.hyrox_simulations for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.workout_sessions s
       where s.id = session_id and s.user_id = (select auth.uid())
    )
  );
create policy "hyrox_simulations: eigene ändern"
  on public.hyrox_simulations for update to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.workout_sessions s
       where s.id = session_id and s.user_id = (select auth.uid())
    )
  );
create policy "hyrox_simulations: eigene löschen"
  on public.hyrox_simulations for delete to authenticated
  using ((select auth.uid()) = user_id);
