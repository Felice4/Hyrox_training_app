-- =============================================================================
-- Migration 0012 – Wochenplan im Wettkampfmodus
-- Siehe docs/RACE_PREP.md §4 und docs/DATABASE.md §3.6.
--
-- replace_week_plan speichert zusätzlich die Art der Wettkampf-Einheit
-- (planned_workouts.race_session_type, Migration 0011), z. B. „compromised_run“.
-- Sonst unverändert zu Migration 0005.
-- =============================================================================

-- p = { week_start, today, generator_version, notes,
--       workouts: [{ scheduled_date, focus, target_duration_min, intensity, workout,
--                    explanation, race_session_type? }] }
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
      workout, explanation, source, race_session_type
    ) values (
      v_plan_id,
      v_date,
      'planned',
      v_workout ->> 'focus',
      (v_workout ->> 'target_duration_min')::smallint,
      v_workout ->> 'intensity',
      v_workout -> 'workout',
      array(select jsonb_array_elements_text(coalesce(v_workout -> 'explanation', '[]'::jsonb))),
      'week_plan',
      -- Prüfung über den Check von planned_workouts.race_session_type
      v_workout ->> 'race_session_type'
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
  'Legt einen Wochenplan an bzw. ersetzt nur offene, zukünftige Einheiten (inkl. Art der Wettkampf-Einheit).';

revoke all on function public.replace_week_plan(jsonb) from public, anon;
grant execute on function public.replace_week_plan(jsonb) to authenticated;
