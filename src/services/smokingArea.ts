import { SmokingArea } from '@/types/smoking';

export async function fetchSmokingAreas(): Promise<SmokingArea[]> {
  const response = await fetch('/api/smoking-areas');
  
  if (!response.ok) {
    throw new Error('Failed to fetch smoking areas');
  }

  const data = await response.json();
  return data;
}

export async function updateSmokingAreaLocation(id: string, lat: number, lng: number, address?: string): Promise<SmokingArea> {
  const response = await fetch('/api/smoking-areas', {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ id, lat, lng, address }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to update smoking area location');
  }

  const data = await response.json();
  return data;
}