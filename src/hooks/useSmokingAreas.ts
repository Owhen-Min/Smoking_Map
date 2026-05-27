
import { useEffect, useState } from 'react';
import { fetchSmokingAreas } from '@/services/smokingArea';
import { SmokingArea } from '@/types/smoking';

export function useSmokingAreas() {
  const [data, setData] = useState<SmokingArea[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = () => {
    setLoading(true);
    return fetchSmokingAreas()
      .then(setData)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    refetch();
  }, []);

  return { data, loading, refetch };
}