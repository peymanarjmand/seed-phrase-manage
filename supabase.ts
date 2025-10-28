import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://orqhorofghearqussxbe.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ycWhvcm9mZ2hlYXJxdXNzeGJlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE2ODE5MjEsImV4cCI6MjA3NzI1NzkyMX0.KymiSiXpSLKKT0Vq3vbv_QCTwJpJUlMA-DLos_C2OPY';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error('Missing Supabase configuration.');
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);


