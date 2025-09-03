-- Fix admin permissions for profiles table
-- Run this in your Supabase SQL editor

-- Add policy to allow service role to manage all profiles
CREATE POLICY "Service role can manage all profiles" ON public.profiles
  FOR ALL USING (
    auth.role() = 'service_role'
  );

-- Grant necessary permissions (if not already granted)
GRANT ALL ON public.profiles TO service_role;

-- Test the policy by checking current policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'profiles';


