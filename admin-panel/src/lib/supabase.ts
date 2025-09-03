import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://akqwnbrikxryikjyyyov.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFrcXduYnJpa3hyeWlranl5eW92Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYwMzQ1NzcsImV4cCI6MjA3MTYxMDU3N30.B0Vr3ZzYYBmY6I18hzwBSzln68R6DSy777wJJnGiMug'

// For admin panel, use service role key for full access
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

// Server-only: debug logging and service-role client should never run in the browser
const isServer = typeof window === 'undefined'

if (isServer && process.env.NODE_ENV === 'development') {
  console.log('🔧 Supabase Configuration:')
  console.log('URL:', supabaseUrl)
  console.log('Service Role Key exists:', !!supabaseServiceKey)
  console.log('Service Role Key length:', supabaseServiceKey?.length || 0)
  console.log('Using service role:', !!supabaseServiceKey)
}

// Create a server client using the service role when available (server-only)
export const supabaseServer = isServer && supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey, { auth: { autoRefreshToken: false, persistSession: false } })
  : null

// Create an anon/public client for browser usage
export const supabaseAnon = createClient(supabaseUrl, supabaseAnonKey)

// Default `supabase` export: prefer server client when running on server and service key is present,
// otherwise fall back to anon client. This prevents embedding the service role into client bundles.
export const supabase = (isServer && supabaseServer) ? supabaseServer : supabaseAnon

export interface DocumentVerification {
  id: string
  document_type: 'id' | 'address' | 'drivers_license'
  is_verified: boolean
  verified_at: string | null
  verified_by: string | null
}

export interface User {
  id: string
  email: string
  full_name: string | null
  phone: string | null
  role: 'customer' | 'provider' | 'admin'
  provider_type: 'personal_shopper' | 'tasker' | null
  verification_status: 'pending' | 'approved' | 'rejected'
  documents_verified: boolean
  drivers_license_url: string | null
  vehicle_type: 'car' | 'motorbike' | null
  vehicle_license_plate: string | null
  vehicle_make: string | null
  vehicle_model: string | null
  vehicle_year: number | null
  vehicle_verified: boolean
  hourly_rate: number | null
  experience_years: number | null
  city: string | null
  province: string | null
  address: string | null
  id_document_url: string | null
  proof_of_address_url: string | null
  bio: string | null
  profile_picture_url: string | null
  created_at: string
  updated_at: string
  // Add document verification details
  document_verifications?: DocumentVerification[]
}

