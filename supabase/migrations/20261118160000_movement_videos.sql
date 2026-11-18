-- =============================================================================
-- Migration 0016 – Videos des Movement Lab
-- Siehe docs/MOVEMENT.md §6 und docs/DATABASE.md §6.
--
-- Privater Speicher-Bucket für die Übungsvideos. Die Videos sind Inhalte der
-- Bibliothek (keine Nutzerdaten): Lesen dürfen angemeldete Nutzer – Registrierung ist
-- deaktiviert, also nur das manuell angelegte Konto. Schreiben, Ändern und Löschen
-- hat bewusst KEINE Policy: Videos lädt nur der Entwickler über die Supabase-CLI hoch
-- (Dienstrolle, umgeht RLS). In der App kann niemand Videos hochladen.
-- =============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('movement-videos', 'movement-videos', false, 10485760, array['video/mp4'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "Movement-Videos: angemeldete Nutzer dürfen lesen"
  on storage.objects
  for select
  to authenticated
  using (bucket_id = 'movement-videos');
