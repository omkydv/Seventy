update storage.buckets
set allowed_mime_types = array['video/mp4','image/jpeg','image/webp','application/json','application/gzip','audio/mp4','audio/wav','audio/webm','text/plain']
where id = 'walks';
