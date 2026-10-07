-- Public Storage bucket for exercise photos (imported from free-exercise-db by
-- scripts/import-exercise-images.mjs). Anyone can view the images; only the
-- server's secret key can upload, so no write policies are needed.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('exercise-images', 'exercise-images', true, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = true;
