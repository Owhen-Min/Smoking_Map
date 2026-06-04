import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
  try {
    const { smoking_area_id, image_url_hd, image_url_sd, is_primary } = await request.json();

    // 1. 필수 입력값 검증
    if (!smoking_area_id || !image_url_hd || !image_url_sd) {
      return NextResponse.json(
        { error: '필수 필드가 누락되었습니다. (smoking_area_id, image_url_hd, image_url_sd)' },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!supabaseUrl) {
      return NextResponse.json(
        { error: '서버 환경 변수(NEXT_PUBLIC_SUPABASE_URL)가 설정되지 않았습니다.' },
        { status: 500 }
      );
    }

    // 2. 이미지 URL 보안 검증 (허용된 버킷 경로로 시작하는지 검사)
    const allowedPrefix = `${supabaseUrl.replace(/\/$/, '')}/storage/v1/object/public/smoking-areas/`;
    if (!image_url_hd.startsWith(allowedPrefix) || !image_url_sd.startsWith(allowedPrefix)) {
      return NextResponse.json(
        { error: '허용되지 않은 이미지 URL 경로입니다. 우리 서비스의 스토리지 경로만 허용됩니다.' },
        { status: 400 }
      );
    }

    // 3. 서버 사이드 관리용 Supabase 클라이언트 초기화
    // 환경변수에 SUPABASE_SERVICE_ROLE_KEY가 등록되어 있으면 DB RLS를 우회하여 안전하게 쓸 수 있습니다.
    // 등록되어 있지 않다면 NEXT_PUBLIC_SUPABASE_ANON_KEY를 사용해 폴백합니다.
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const supabaseServer = createClient(supabaseUrl, serviceKey);

    // 4. DB 테이블에 레코드 삽입
    const { data, error } = await supabaseServer
      .from('smoking_area_images')
      .insert({
        smoking_area_id,
        image_url_hd,
        image_url_sd,
        is_primary: !!is_primary,
      })
      .select()
      .single();

    if (error) {
      console.error('DB Insert Error in server API route:', error);
      return NextResponse.json(
        { error: `DB 이미지 정보 등록 실패: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error('Unexpected error in images POST API:', err);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
