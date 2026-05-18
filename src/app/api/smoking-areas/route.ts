import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

// 1시간(3600초)마다 백그라운드에서 데이터를 주기적으로 업데이트하고,
// 그 전까지는 서버에 캐싱된(저장된) 데이터를 즉시 반환합니다.
export const revalidate = 3600;

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('smoking_areas')
      .select(`
        *,
        smoking_area_images (*)
      `)
      .eq('status', 'approved');

    if (error) {
      console.error('Error fetching smoking areas:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error('Unexpected error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
