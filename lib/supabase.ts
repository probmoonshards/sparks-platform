import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://cumaqxnrmxjghdwznouj.supabase.co'
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN1bWFxeG5ybXhqZ2hkd3pub3VqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY1NzQzMzIsImV4cCI6MjA5MjE1MDMzMn0.ahLv7Ps_EZfKAyIjOhM-8Gmt_nWAqD0TCfXJdMA14Fc'

export const sb = createClient(SUPABASE_URL, SUPABASE_ANON)
