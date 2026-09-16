-- Add 'document' to allowed content_type check constraint
ALTER TABLE public.keyboxes DROP CONSTRAINT IF EXISTS keyboxes_content_type_check;

ALTER TABLE public.keyboxes ADD CONSTRAINT keyboxes_content_type_check 
  CHECK (content_type IN ('text', 'url', 'code', 'document'));
