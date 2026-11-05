-- =============================================================================
-- Migration 0008 – Eigene Meilensteine und Änderungen an Standard-Meilensteinen
-- Siehe docs/DATABASE.md §3.14 und docs/SKILLS.md §4.
--
-- Eine Zeile ist entweder
--   - eine Änderung eines Standard-Meilensteins aus dem Code (builtin_slug gesetzt;
--     name/metric = null bedeutet „wie im Standard"), oder
--   - ein eigener Meilenstein (builtin_slug = null; name, area, metric Pflicht).
-- Der Aufbau von `metric` wird in der App per Zod geprüft (src/data/skills/schema.ts).
-- =============================================================================

create table public.user_milestones (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  builtin_slug text check (builtin_slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text check (char_length(name) between 3 and 60),
  area text check (area in ('pull', 'strength', 'run', 'erg', 'hyrox', 'other')),
  metric jsonb check (metric is null or jsonb_typeof(metric) = 'object'),
  hidden boolean not null default false,
  -- „Ab heute neu zählen": Werte vor diesem Zeitpunkt zählen nicht
  counted_from timestamptz,
  -- Stand von Hand (Einheit wie der Meilenstein: Wdh., kg oder Sekunden)
  manual_value numeric check (manual_value > 0),
  manual_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_milestones_builtin_unique unique (user_id, builtin_slug),
  constraint user_milestones_custom_complete
    check (builtin_slug is not null or (name is not null and area is not null and metric is not null)),
  constraint user_milestones_manual_pair check ((manual_value is null) = (manual_at is null))
);

comment on table public.user_milestones is
  'Eigene Meilensteine und Änderungen an Standard-Meilensteinen (Ziel, Name, Ausblenden, neu zählen, Hand-Eintrag).';

create trigger user_milestones_set_updated_at
  before update on public.user_milestones
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- Rechte und Row Level Security
-- -----------------------------------------------------------------------------
revoke all on public.user_milestones from anon, authenticated;
grant select, insert, update, delete on public.user_milestones to authenticated;

alter table public.user_milestones enable row level security;

create policy "user_milestones: eigene lesen"
  on public.user_milestones for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "user_milestones: eigene anlegen"
  on public.user_milestones for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "user_milestones: eigene ändern"
  on public.user_milestones for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "user_milestones: eigene löschen"
  on public.user_milestones for delete to authenticated
  using ((select auth.uid()) = user_id);
