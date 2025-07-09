import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://emqhpsgqbhlavzhsbcfd.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVtcWhwc2dxYmhsYXZ6aHNiY2ZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE2OTk4NDQzMDAsImV4cCI6MjAxNTQyMDMwMH0.f69Zy3NMCEVTCnG6STbLCq-R-oPxtPMCHQmINnK_g9o';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
