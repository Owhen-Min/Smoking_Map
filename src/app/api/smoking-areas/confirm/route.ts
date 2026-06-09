import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// 누적 확인 횟수에 따른 정확도 승급 기준
const CONFIRM_MEDIUM_THRESHOLD = 2;
const CONFIRM_HIGH_THRESHOLD = 5;

const ACCURACY_RANK = { low: 0, medium: 1, high: 2 } as const;
type Accuracy = keyof typeof ACCURACY_RANK;

function getAccuracyByCount(count: number): Accuracy {
  if (count >= CONFIRM_HIGH_THRESHOLD) return 'high';
  if (count >= CONFIRM_MEDIUM_THRESHOLD) return 'medium';
  return 'low';
}

export async function POST(request: Request) {
  try {
    const { id } = await request.json();

    if (!id) {
      return NextResponse.json({ error: 'Missing required field (id)' }, { status: 400 });
    }

    // 1. 현재 확인 횟수 및 정확도 조회
    const { data: area, error: fetchError } = await supabase
      .from('smoking_areas')
      .select('id, accuracy, confirmation_count')
      .eq('id', id)
      .single();

    if (fetchError || !area) {
      return NextResponse.json({ error: '대상 흡연구역을 찾을 수 없습니다.' }, { status: 404 });
    }

    // 2. 확인 횟수 증가 및 정확도 산정 (기존 정확도보다 낮아지지 않도록 보장)
    const newCount = (area.confirmation_count ?? 0) + 1;
    const currentAccuracy = (area.accuracy ?? 'low') as Accuracy;
    const candidateAccuracy = getAccuracyByCount(newCount);
    const newAccuracy =
      ACCURACY_RANK[candidateAccuracy] > ACCURACY_RANK[currentAccuracy]
        ? candidateAccuracy
        : currentAccuracy;

    const { data, error } = await supabase
      .from('smoking_areas')
      .update({
        confirmation_count: newCount,
        accuracy: newAccuracy,
        last_updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error confirming smoking area:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error('Unexpected error in confirm POST:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
