import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://qjbfkhpvfmpqchwfbino.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFqYmZraHB2Zm1wcWNod2ZiaW5vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcyNjI4ODksImV4cCI6MjA4MjgzODg4OX0.b-Dw12fvmsl0lUFPZOOA9XMd6soLU3ToDO8l07Fqe6E'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
