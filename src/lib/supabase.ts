import { createClient } from '@supabase/supabase-js';

// Storage 접근용 클라이언트 (클라이언트/서버 공용, anon key 사용)
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);