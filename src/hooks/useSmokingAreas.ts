
import { useEffect, useState } from 'react';
import { fetchSmokingAreas } from '@/services/smokingArea';
import { SmokingArea } from '@/types/smoking';

export function useSmokingAreas() {
  const [data, setData] = useState<SmokingArea[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSmokingAreas()
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  return { data, loading };
}