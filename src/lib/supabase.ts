import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';

// Use environment variables with fallbacks
const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL || 'https://akqwnbrikxryikjyyyov.supabase.co';
const SUPABASE_ANON_KEY = process.env.REACT_APP_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFrcXduYnJpa3hyeWlranl5eW92Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYwMzQ1NzcsImV4cCI6MjA3MTYxMDU3N30.B0Vr3ZzYYBmY6I18hzwBSzln68R6DSy777wJJnGiMug';

// Minimal SecureStore adapter implementing the storage interface Supabase expects
const secureStoreAdapter: any = {
  getItem: async (key: string) => {
    try {
      return await SecureStore.getItemAsync(key);
    } catch (e) {
      console.warn('SecureStore getItem error:', e);
      return null;
    }
  },
  setItem: async (key: string, value: string) => {
    try {
      await SecureStore.setItemAsync(key, value);
    } catch (e) {
      console.warn('SecureStore setItem error:', e);
    }
  },
  removeItem: async (key: string) => {
    try {
      await SecureStore.deleteItemAsync(key);
    } catch (e) {
      console.warn('SecureStore removeItem error:', e);
    }
  },
};

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    // Persist session securely using the OS keystore
    storage: secureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    // Not using OAuth redirects in native runtime
    detectSessionInUrl: false,
  },
});

export { supabase };
export default supabase;
