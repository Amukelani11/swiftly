-- Add Smart Float fields to profiles table
-- Run this in your Supabase SQL Editor

-- Add Smart Float columns to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS declared_float DECIMAL(8,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS float_last_updated TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS is_online BOOLEAN DEFAULT FALSE;

-- Add comment for documentation
COMMENT ON COLUMN public.profiles.declared_float IS 'Provider declared cash float for order fulfillment';
COMMENT ON COLUMN public.profiles.float_last_updated IS 'When provider last updated their float';
COMMENT ON COLUMN public.profiles.is_online IS 'Whether provider is online and accepting orders';

-- Verify the columns were added
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'profiles'
AND column_name IN ('declared_float', 'float_last_updated', 'is_online')
ORDER BY ordinal_position;


