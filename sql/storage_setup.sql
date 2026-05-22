-- Supabase Storage Bucket & RLS Policies Setup for order_images

-- 1. Create the 'order_images' bucket if it does not exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('order_images', 'order_images', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Configure RLS Policies for the 'order_images' bucket
-- Note: In Supabase, the 'storage.objects' table contains all files.
-- We apply policies to this table filtered by bucket_id.

-- Drop existing policies if they exist to avoid duplicate errors
DROP POLICY IF EXISTS "Allow public read access to order_images" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to upload order_images" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to update order_images" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to delete order_images" ON storage.objects;

-- Policy A: Allow anyone (public/anonymous/authenticated) to read/view images
CREATE POLICY "Allow public read access to order_images"
ON storage.objects FOR SELECT
USING (bucket_id = 'order_images');

-- Policy B: Allow authenticated store owners to upload (insert) files
CREATE POLICY "Allow authenticated users to upload order_images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'order_images');

-- Policy C: Allow authenticated store owners to update files
CREATE POLICY "Allow authenticated users to update order_images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'order_images');

-- Policy D: Allow authenticated store owners to delete their files
CREATE POLICY "Allow authenticated users to delete order_images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'order_images');
