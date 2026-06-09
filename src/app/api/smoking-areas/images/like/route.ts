import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
  try {
    const { image_id } = await request.json();

    if (!image_id) {
      return NextResponse.json({ error: 'Missing required field (image_id)' }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!supabaseUrl) {
      return NextResponse.json(
        { error: '서버 환경 변수(NEXT_PUBLIC_SUPABASE_URL)가 설정되지 않았습니다.' },
        { status: 500 }
      );
    }

    // 서버 사이드 관리용 Supabase 클라이언트 (SERVICE_ROLE_KEY 미설정 시 ANON_KEY 폴백)
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const supabaseServer = createClient(supabaseUrl, serviceKey);

    // 1. 대상 사진 조회
    const { data: image, error: fetchError } = await supabaseServer
      .from('smoking_area_images')
      .select('id, smoking_area_id, like_count')
      .eq('id', image_id)
      .single();

    if (fetchError || !image) {
      return NextResponse.json({ error: '대상 사진을 찾을 수 없습니다.' }, { status: 404 });
    }

    // 2. 좋아요 수 증가
    const newLikeCount = (image.like_count ?? 0) + 1;
    const { error: updateError } = await supabaseServer
      .from('smoking_area_images')
      .update({ like_count: newLikeCount })
      .eq('id', image_id);

    if (updateError) {
      console.error('Error updating like count:', updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // 3. 좋아요 수가 가장 많은 사진을 대표사진(is_primary)으로 재선정
    //    (동점일 경우 먼저 등록된 사진 우선)
    const { data: areaImages, error: listError } = await supabaseServer
      .from('smoking_area_images')
      .select('id, is_primary, like_count, created_at')
      .eq('smoking_area_id', image.smoking_area_id)
      .order('like_count', { ascending: false })
      .order('created_at', { ascending: true });

    if (listError || !areaImages || areaImages.length === 0) {
      console.error('Error fetching area images for primary re-election:', listError);
      return NextResponse.json({ error: '대표사진 갱신에 실패했습니다.' }, { status: 500 });
    }

    const newPrimaryId = areaImages[0].id;
    const currentPrimaryIds = areaImages.filter((img) => img.is_primary).map((img) => img.id);

    if (!(currentPrimaryIds.length === 1 && currentPrimaryIds[0] === newPrimaryId)) {
      // 기존 대표사진 해제 후 새 대표사진 지정
      const { error: demoteError } = await supabaseServer
        .from('smoking_area_images')
        .update({ is_primary: false })
        .eq('smoking_area_id', image.smoking_area_id)
        .eq('is_primary', true);

      if (demoteError) {
        console.error('Error demoting previous primary image:', demoteError);
        return NextResponse.json({ error: demoteError.message }, { status: 500 });
      }

      const { error: promoteError } = await supabaseServer
        .from('smoking_area_images')
        .update({ is_primary: true })
        .eq('id', newPrimaryId);

      if (promoteError) {
        console.error('Error promoting new primary image:', promoteError);
        return NextResponse.json({ error: promoteError.message }, { status: 500 });
      }
    }

    return NextResponse.json({
      id: image_id,
      like_count: newLikeCount,
      primary_image_id: newPrimaryId,
    });
  } catch (err) {
    console.error('Unexpected error in image like POST:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
