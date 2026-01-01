import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://qjbfkhpvfmpqchwfbino.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFqYmZraHB2Zm1wcWNod2ZiaW5vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzU3NjAyNjcsImV4cCI6MjA1MTMzNjI2N30.Gq-fBBaZzMb-PfaLlT5WgQ_RG83iu8q'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
