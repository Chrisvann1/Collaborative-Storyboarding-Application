//Create Supabase client

import { createClient } from "@supabase/supabase-js"; 

//Key amd URL established here
export const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_API_KEY!
)