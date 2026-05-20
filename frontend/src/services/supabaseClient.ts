/**
 * Frontend Supabase client — tarayici tarafinda auth islemleri.
 * VITE_SUPABASE_URL ve VITE_SUPABASE_ANON_KEY env var'lari gerekir.
 */

import { createClient } from '@supabase/supabase-js';
import { getEnv } from './envHelper';

const supabaseUrl = getEnv('VITE_SUPABASE_URL');
const supabaseAnonKey = getEnv('VITE_SUPABASE_ANON_KEY');

export const supabase = createClient(
  supabaseUrl || 'http://localhost:8000',
  supabaseAnonKey || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.placeholder',
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  }
);
