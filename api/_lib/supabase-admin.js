import { createClient } from '@supabase/supabase-js'

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const secretKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !secretKey) {
  console.warn('Supabase admin environment variables are not configured')
}

export const supabaseAdmin = createClient(url || 'http://localhost', secretKey || 'missing', {
  auth: { persistSession: false, autoRefreshToken: false },
})

export const APP_USER_ID = process.env.APP_USER_ID || process.env.VITE_MY_USER_ID

export function ensureServerConfig() {
  if (!url || !secretKey || !APP_USER_ID) {
    throw new Error('服务端 Supabase 环境变量配置不完整')
  }
}
