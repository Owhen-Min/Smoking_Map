import { NextRequest, NextResponse } from "next/server";
import { ANONYMOUS_COOKIE, createAnonymousToken, verifyAnonymousToken } from "@/lib/anonymousIdentity";
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

async function mutate(request: NextRequest, action: 'create' | 'update') {
  const origin = request.headers.get('origin');
  if (origin && origin !== request.nextUrl.origin) {
    return NextResponse.json({ error: '허용되지 않은 요청입니다.' }, { status: 403 });
  }

  const serviceKey = process.env.SUPABASE_SECRET_KEY;
  const secret = process.env.ANONYMOUS_COOKIE_SECRET || serviceKey;
  if (!serviceKey || !secret) {
    return NextResponse.json({ error: '제보·수정 서비스 설정이 필요합니다.' }, { status: 503 });
  }

  const anonymousId = verifyAnonymousToken(request.cookies.get(ANONYMOUS_COOKIE)?.value, secret);
  if (!anonymousId) {
    // No DB write occurs until the browser sends the issued cookie back.
    const response = NextResponse.json(
      { error: '제보·수정을 위해 브라우저 쿠키를 허용한 뒤 다시 시도해 주세요.' },
      { status: 428, headers: { 'Cache-Control': 'no-store' } },
    );
    response.cookies.set(ANONYMOUS_COOKIE, createAnonymousToken(secret), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 365,
    });
    return response;
  }

  let payload: Record<string, unknown>;
  try {
    const body: unknown = await request.json();
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error('Invalid body');
    payload = body as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: '올바른 JSON 요청이 필요합니다.' }, { status: 400 });
  }
  const { lat, lng, name, id, address, description } = payload;
  if (typeof lat !== 'number' || !Number.isFinite(lat) || lat < -90 || lat > 90
    || typeof lng !== 'number' || !Number.isFinite(lng) || lng < -180 || lng > 180
    || (action === 'create' && (typeof name !== 'string' || !name.trim()
      || typeof address !== 'string' || !address.trim()))
    || (action === 'update' && (typeof id !== 'string' || !id.trim()))
    || (address !== undefined && typeof address !== 'string')
    || (description !== undefined && typeof description !== 'string')) {
    return NextResponse.json({ error: '필수 항목과 좌표를 확인해 주세요.' }, { status: 400 });
  }

  try {
    const server = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey);
    const { data, error } = await server.rpc('write_smoking_area_anonymous', {
      p_anonymous_id: anonymousId,
      p_action: action,
      p_payload: { id, name, lat, lng, address, description },
    });
    if (error) {
      if (error.code === 'P0001' && error.message === 'DAILY_WRITE_LIMIT') {
        return NextResponse.json(
          { error: '제보와 위치 수정은 하루 합산 5회까지 가능합니다. 한국 시간 자정 이후 다시 시도해 주세요.' },
          { status: 429 },
        );
      }
      if (error.code === 'P0002') {
        return NextResponse.json({ error: '수정할 흡연구역을 찾을 수 없습니다.' }, { status: 404 });
      }
      console.error('Anonymous smoking area mutation failed:', error);
      return NextResponse.json({ error: '저장에 실패했습니다. 잠시 후 다시 시도해 주세요.' }, { status: 500 });
    }
    return NextResponse.json(data, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('Unexpected smoking area mutation error:', error);
    return NextResponse.json({ error: '저장에 실패했습니다. 잠시 후 다시 시도해 주세요.' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  return mutate(request, 'update');
}

export async function POST(request: NextRequest) {
  return mutate(request, 'create');
}
