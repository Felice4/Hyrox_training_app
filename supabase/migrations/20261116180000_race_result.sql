-- =============================================================================
-- Migration 0013 – Ergebnis eines Wettkampfs
-- Siehe docs/RACE_PREP.md §7 und docs/DATABASE.md §3.17.
--
-- Optionale Zwischenzeiten (wie bei der Simulation: Lauf, Station, Lauf, …) und die
-- Funktion complete_race: Ergebnis speichern, Wettkampf abschließen und – nur bei
-- Singles – die HYROX-Bestzeit im Profil verbessern. Alles in einer Transaktion.
-- =============================================================================

alter table public.races
  add column result_splits integer[]
    check (
      result_splits is null
      or (cardinality(result_splits) between 1 and 16 and 0 < all (result_splits))
    );

comment on column public.races.result_splits is
  'Optionale Zwischenzeiten in Sekunden in Rennreihenfolge (Lauf 1, Station 1, …).';

-- p = { race_id, today, result_time_sec, splits? }
create or replace function public.complete_race(p jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_race public.races;
  v_today date := (p ->> 'today')::date;
  v_time integer := (p ->> 'result_time_sec')::integer;
  v_splits integer[];
  v_previous integer;
  v_new_best boolean := false;
begin
  if v_user is null then
    raise exception 'Nicht angemeldet' using errcode = '42501';
  end if;
  if v_today is null or v_time is null then
    raise exception 'today und result_time_sec sind erforderlich' using errcode = '22023';
  end if;
  if jsonb_typeof(p -> 'splits') = 'array' and jsonb_array_length(p -> 'splits') > 0 then
    v_splits := array(select jsonb_array_elements_text(p -> 'splits')::integer);
  end if;

  -- RLS: nur eigene Wettkämpfe sichtbar
  select * into v_race from public.races r
   where r.id = (p ->> 'race_id')::uuid and r.user_id = v_user
   for update;
  if not found then
    raise exception 'Wettkampf nicht gefunden' using errcode = 'P0002';
  end if;
  if v_race.status <> 'active' then
    raise exception 'Der Wettkampf ist nicht mehr aktiv' using errcode = '22023';
  end if;
  if v_today < v_race.race_date then
    raise exception 'Das Ergebnis kann erst ab dem Wettkampftag eingetragen werden'
      using errcode = '22023';
  end if;

  update public.races set
    status = 'completed',
    result_time_sec = v_time,
    result_splits = v_splits,
    completed_at = now()
  where id = v_race.id;

  -- Bestzeit nur bei Singles (Doubles und Staffel sind nicht vergleichbar)
  if v_race.format = 'single' and v_time between 1800 and 14400 then
    select pr.hyrox_best_time_sec into v_previous
      from public.profiles pr where pr.user_id = v_user;
    if found and (v_previous is null or v_time < v_previous) then
      update public.profiles set hyrox_best_time_sec = v_time where user_id = v_user;
      v_new_best := true;
    end if;
  end if;

  return jsonb_build_object(
    'status', 'completed',
    'new_best', v_new_best,
    'previous_best_sec', v_previous
  );
end;
$$;

comment on function public.complete_race(jsonb) is
  'Speichert das Ergebnis, schließt den Wettkampf ab und verbessert bei Singles die HYROX-Bestzeit.';

revoke all on function public.complete_race(jsonb) from public, anon;
grant execute on function public.complete_race(jsonb) to authenticated;
