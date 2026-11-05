-- =============================================================================
-- Migration 0007 – Skill-Ziele
-- Siehe docs/SKILLS.md und docs/DATABASE.md §3.13.
--
-- Skills und Stufen stehen im Code (src/data/skills). Hier liegen nur die Auswahl des
-- Nutzers, der Status, die Zahl der geschafften Stufen und deren Verlauf (mit Datum).
-- Meilensteine brauchen keine Tabelle – sie werden aus Bestleistungen berechnet.
-- =============================================================================

create table public.skill_goals (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  skill_slug text not null check (skill_slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  -- active = wird trainiert (höchstens 3), later = gemerkt, achieved = alle Stufen geschafft
  status text not null check (status in ('active', 'later', 'achieved')),
  -- Anzahl geschaffter Stufen; trainiert wird Stufe completed_stages + 1
  completed_stages smallint not null default 0 check (completed_stages between 0 and 20),
  activated_at timestamptz,
  achieved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, skill_slug),
  constraint skill_goals_achieved_has_date check (status <> 'achieved' or achieved_at is not null)
);

comment on table public.skill_goals is 'Gewählte Skill-Ziele mit Status und Fortschritt (Inhalte im Code).';

create trigger skill_goals_set_updated_at
  before update on public.skill_goals
  for each row execute function public.set_updated_at();

-- Höchstens drei aktive Ziele gleichzeitig (docs/SKILLS.md §2.6)
create function public.skill_goals_check_active_limit()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.status = 'active' and (
    select count(*) from public.skill_goals g
     where g.user_id = new.user_id
       and g.status = 'active'
       and g.skill_slug <> new.skill_slug
  ) >= 3 then
    raise exception 'Höchstens drei aktive Ziele' using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger skill_goals_active_limit
  before insert or update of status on public.skill_goals
  for each row execute function public.skill_goals_check_active_limit();

-- Verlauf: wann welche Stufe geschafft wurde (für Fortschritt und Abzeichen)
create table public.skill_stage_log (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  skill_slug text not null,
  stage smallint not null check (stage between 1 and 20),
  achieved_at timestamptz not null default now(),
  -- assessment = bei der Einstufung angegeben, manual = von Hand bestätigt,
  -- session = automatisch im Training erkannt (Schritt 5.4)
  source text not null check (source in ('assessment', 'manual', 'session')),
  session_id uuid references public.workout_sessions (id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (user_id, skill_slug, stage),
  foreign key (user_id, skill_slug)
    references public.skill_goals (user_id, skill_slug) on delete cascade
);

comment on table public.skill_stage_log is 'Geschaffte Stufen je Skill-Ziel mit Datum und Herkunft.';

-- Größe des Skill-Blocks im Training (docs/SKILLS.md §2.2)
alter table public.profiles
  add column skill_block text not null default 'normal'
    check (skill_block in ('off', 'small', 'normal'));

-- -----------------------------------------------------------------------------
-- Rechte und Row Level Security
-- -----------------------------------------------------------------------------
revoke all on public.skill_goals, public.skill_stage_log from anon, authenticated;
grant select, insert, update, delete on public.skill_goals, public.skill_stage_log to authenticated;
revoke all on function public.skill_goals_check_active_limit() from public, anon, authenticated;

alter table public.skill_goals enable row level security;
alter table public.skill_stage_log enable row level security;

create policy "skill_goals: eigene lesen"
  on public.skill_goals for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "skill_goals: eigene anlegen"
  on public.skill_goals for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "skill_goals: eigene ändern"
  on public.skill_goals for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "skill_goals: eigene löschen"
  on public.skill_goals for delete to authenticated
  using ((select auth.uid()) = user_id);

create policy "skill_stage_log: eigene lesen"
  on public.skill_stage_log for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "skill_stage_log: eigene anlegen"
  on public.skill_stage_log for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "skill_stage_log: eigene ändern"
  on public.skill_stage_log for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "skill_stage_log: eigene löschen"
  on public.skill_stage_log for delete to authenticated
  using ((select auth.uid()) = user_id);

-- -----------------------------------------------------------------------------
-- set_skill_progress: Status und Stufe eines Ziels atomar setzen.
-- Legt das Ziel bei Bedarf an, trägt fehlende Stufen 1…p_completed_stages in den
-- Verlauf ein (vorhandene Einträge behalten ihr Datum) und entfernt Einträge über
-- der neuen Stufe (Korrektur nach unten). Wiederholter Aufruf ändert nichts mehr.
-- -----------------------------------------------------------------------------
create function public.set_skill_progress(
  p_skill_slug text,
  p_status text,
  p_completed_stages integer,
  p_source text,
  p_session_id uuid default null
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then
    raise exception 'Nicht angemeldet' using errcode = '42501';
  end if;

  insert into public.skill_goals as g (skill_slug, status, completed_stages, activated_at, achieved_at)
  values (
    p_skill_slug,
    p_status,
    p_completed_stages,
    case when p_status = 'active' then now() end,
    case when p_status = 'achieved' then now() end
  )
  on conflict (user_id, skill_slug) do update set
    status = excluded.status,
    completed_stages = excluded.completed_stages,
    activated_at = case
      when excluded.status = 'active' then coalesce(g.activated_at, now())
      else g.activated_at
    end,
    achieved_at = case
      when excluded.status = 'achieved' then coalesce(g.achieved_at, now())
      else null
    end;

  delete from public.skill_stage_log l
   where l.user_id = v_user
     and l.skill_slug = p_skill_slug
     and l.stage > p_completed_stages;

  insert into public.skill_stage_log (skill_slug, stage, source, session_id)
  select p_skill_slug, s, p_source, p_session_id
    from generate_series(1, p_completed_stages) s
  on conflict (user_id, skill_slug, stage) do nothing;
end;
$$;

revoke all on function public.set_skill_progress(text, text, integer, text, uuid) from public, anon;
grant execute on function public.set_skill_progress(text, text, integer, text, uuid) to authenticated;

comment on function public.set_skill_progress(text, text, integer, text, uuid) is
  'Setzt Status und geschaffte Stufen eines Skill-Ziels und führt den Stufenverlauf nach.';
