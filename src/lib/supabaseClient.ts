import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim()
const supabasePublishableKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim()

export const supabaseConfigurationError =
  !supabaseUrl || !supabasePublishableKey
    ? 'Supabase 尚未完成設定，請確認 VITE_SUPABASE_URL 與 VITE_SUPABASE_PUBLISHABLE_KEY。'
    : null

export const supabase = supabaseConfigurationError
  ? null
  : createClient(supabaseUrl, supabasePublishableKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })

export function getSupabaseClient() {
  if (!supabase) {
    throw new Error(supabaseConfigurationError ?? 'Supabase 尚未完成設定。')
  }
  return supabase
}
