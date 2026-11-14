import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { ANONYMOUS_COOKIE, createAnonymousToken, verifyAnonymousToken } from '@/lib/anonymousIdentity';
import { isRemovalReason } from '@/lib/removalRequest';

export async function POST(request: NextRequest) {
  const origin = request.headers.get('origin');
  if (origin && origin !== request.nextUrl.origin) {
    return NextResponse.json({ error: '허용되지 않은 요청입니다.' }, { status: 403 });
  }
  const key = process.env.SUPABASE_SECRET_KEY;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secret = process.env.ANONYMOUS_COOKIE_SECRET || key;
  if (!key || !secret || !url) {
    return NextResponse.json({ error: '제거 요청 서비스 설정이 필요합니다.' }, { status: 503 });
  }
  const anonymousId = verifyAnonymousToken(request.cookies.get(ANONYMOUS_COOKIE)?.value, secret);
  if (!anonymousId) {
    const response = NextResponse.json({ error: '쿠키를 허용한 뒤 다시 시도해 주세요.' }, { status: 428 });
    response.headers.set('Cache-Control', 'no-store');
    response.cookies.set(ANONYMOUS_COOKIE, createAnonymousToken(secret), {
      httpOnly: true, secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24 * 365,
    });
    return response;
  }
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: '올바른 JSON 요청이 필요합니다.' }, { status: 400 });
  }
  if (!body || typeof body.area_id !== 'string' || !body.area_id.trim()
    || !isRemovalReason(body.reason) || typeof body.details !== 'string'
    || body.details.length > 500 || (body.reason === 'other' && !body.details.trim())) {
    return NextResponse.json({ error: '제거 사유와 설명을 확인해 주세요. 설명은 최대 500자입니다.' }, { status: 400 });
  }
  try {
    const server = createClient(url, key);
    const { data, error } = await server.rpc('submit_smoking_area_removal', {
      p_anonymous_id: anonymousId, p_area_id: body.area_id,
      p_reason: body.reason, p_details: body.details.trim(),
    });
    if (error) {
      if (error.message === 'REMOVAL_DAILY_LIMIT') {
        return NextResponse.json({ error: '제거 요청은 한국 시간 기준 하루 5회까지 가능합니다.' }, { status: 429 });
      }
      if (error.code === 'P0002') {
        return NextResponse.json({ error: '이미 숨겨졌거나 존재하지 않는 흡연구역입니다.' }, { status: 404 });
      }
      console.error('Removal request failed:', error);
      return NextResponse.json({ error: '요청을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.' }, { status: 500 });
    }
    return NextResponse.json(data, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('Removal request failed:', error);
    return NextResponse.json({ error: '요청을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.' }, { status: 500 });
  }
}
