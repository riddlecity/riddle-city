import { createClient as createSupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://sjmlatcjkqsuvpkoapnz.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNqbWxhdGNqa3FzdXZwa29hcG56Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE0ODcwOTEsImV4cCI6MjA2NzA2MzA5MX0.Z62aiYbccNo_WO31vWNHtMag-M-WiuKDguQirOQwS7c';

export function createClient() {
  return createSupabaseClient(supabaseUrl, supabaseAnonKey);
}
