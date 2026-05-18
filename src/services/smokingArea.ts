import { SmokingArea } from '@/types/smoking';

export async function fetchSmokingAreas(): Promise<SmokingArea[]> {
  const response = await fetch('/api/smoking-areas');
  
  if (!response.ok) {
    throw new Error('Failed to fetch smoking areas');
  }

  const data = await response.json();
  return data;
}