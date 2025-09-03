import { createClient } from '@supabase/supabase-js';

// Use environment variables for admin panel
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://akqwnbrikxryikjyyyov.supabase.co';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFrcXduYnJpa3hyeWlranl5eW92Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYwMzQ1NzcsImV4cCI6MjA3MTYxMDU3N30.B0Vr3ZzYYBmY6I18hzwBSzln68R6DSy777wJJnGiMug';

// For storage operations, we need service role key
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFrcXduYnJpa3hyeWlranl5eW92Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjAzNDU3NywiZXhwIjoyMDcxNjEwNTc3fQ.sw-1uz2zU7k077XjYJjvZjZy-0cHIIY1EPF_bfZvg1o';

// For admin panel, use localStorage instead of expo-secure-store
const localStorageAdapter: any = {
  getItem: (key: string) => {
    if (typeof window === 'undefined') return null;
    try {
      return localStorage.getItem(key);
    } catch (e) {
      console.warn('localStorage getItem error:', e);
      return null;
    }
  },
  setItem: (key: string, value: string) => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(key, value);
    } catch (e) {
      console.warn('localStorage setItem error:', e);
    }
  },
  removeItem: (key: string) => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.removeItem(key);
    } catch (e) {
      console.warn('localStorage removeItem error:', e);
    }
  },
};

// Use service role key for storage operations
const STORAGE_KEY = SUPABASE_SERVICE_ROLE_KEY;

console.log('🔧 Supabase Configuration:')
console.log('🔧 URL:', SUPABASE_URL)
console.log('🔧 Anon Key exists:', !!SUPABASE_ANON_KEY)
console.log('🔧 Service Role Key exists:', !!SUPABASE_SERVICE_ROLE_KEY)
console.log('🔧 Using storage key type:', SUPABASE_SERVICE_ROLE_KEY ? 'service_role' : 'anon')

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    storage: localStorageAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});

// Separate client for storage operations with service role permissions
const supabaseStorage = createClient(SUPABASE_URL, STORAGE_KEY, {
  auth: {
    storage: localStorageAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});

console.log('✅ Supabase clients created successfully')

export { supabaseAdmin, supabaseStorage };
export default supabaseAdmin;
