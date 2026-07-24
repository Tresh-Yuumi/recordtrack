import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
export const MY_USER_ID = import.meta.env.VITE_MY_USER_ID

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
