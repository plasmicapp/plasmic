import { createClient as createClientPrimitive } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase';

export function createSupabaseClient() {
  const supabase = createClientPrimitive<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  return supabase
}