export type SmokingArea = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  last_updated_at: Date;
  source: 'public' | 'user';
  accuracy: 'high' | 'medium' | 'low';
  status: 'pending' | 'approved' | 'rejected';
  description?: string;
  address?: string;
  smoking_area_images?: {
    image_url: string;
  }[];
};