import { createClient } from '@supabase/supabase-js';

const urlFromEnv = (import.meta as any)?.env?.VITE_SUPABASE_URL as string | undefined;
const keyFromEnv = (import.meta as any)?.env?.VITE_SUPABASE_ANON_KEY as string | undefined;

// Fallback to embedded keys to keep app functional if envs aren't set during local/dev.
const SUPABASE_URL: string = urlFromEnv || 'https://orqhorofghearqussxbe.supabase.co';
const SUPABASE_ANON_KEY: string = keyFromEnv || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ycWhvcm9mZ2hlYXJxdXNzeGJlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE2ODE5MjEsImV4cCI6MjA3NzI1NzkyMX0.KymiSiXpSLKKT0Vq3vbv_QCTwJpJUlMA-DLos_C2OPY';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);


