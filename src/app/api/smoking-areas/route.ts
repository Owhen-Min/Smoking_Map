import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

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
      .eq('status', 'approved')
      // 대표사진(is_primary)이 항상 첫 번째로 오도록 정렬, 이후 등록순
      .order('is_primary', { referencedTable: 'smoking_area_images', ascending: false })
      .order('created_at', { referencedTable: 'smoking_area_images', ascending: true });

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

export async function PATCH(request: Request) {
  try {
    const { id, lat, lng, address } = await request.json();

    if (!id || lat === undefined || lng === undefined) {
      return NextResponse.json({ error: 'Missing required fields (id, lat, lng)' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('smoking_areas')
      .update({
        lat: parseFloat(lat),
        lng: parseFloat(lng),
        address,
        last_updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select();

    if (error) {
      console.error('Error updating smoking area:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data || data.length === 0) {
      return NextResponse.json({
        error: '수정 권한이 없거나 대상 흡연구역을 찾을 수 없습니다. Supabase RLS(Row Level Security) UPDATE 정책이 활성화되어 있는지 확인해 주세요.'
      }, { status: 403 });
    }

    return NextResponse.json(data[0]);
  } catch (err) {
    console.error('Unexpected error in PATCH:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { name, lat, lng, address, description } = await request.json();

    if (!name || lat === undefined || lng === undefined || !address) {
      return NextResponse.json({ error: 'Missing required fields (name, lat, lng, address)' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('smoking_areas')
      .insert({
        name,
        lat: parseFloat(lat),
        lng: parseFloat(lng),
        address,
        description,
        source: 'user',
        accuracy: 'low',
        status: 'approved',
        last_updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating smoking area report:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error('Unexpected error in POST:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}



