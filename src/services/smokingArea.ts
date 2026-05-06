import { supabase } from '@/lib/supabase';
import { SmokingArea } from '@/types/smoking';

export async function fetchSmokingAreas(): Promise<SmokingArea[]> {
  const { data, error } = await supabase
    .from('smoking_areas')
    .select(`
      *,
      smoking_area_images (*)
    `)
    .eq('status', 'approved');

  if (error) throw error;

  return data;
}