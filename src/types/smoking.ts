export type SmokingArea = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  last_updated_at: Date;
  source: 'public' | 'user';
  accuracy: 'high' | 'medium' | 'low';
  confirmation_count?: number;
  status: 'pending' | 'approved' | 'rejected';
  description?: string;
  address?: string;
  smoking_area_images?: {
    id: string;
    smoking_area_id: string;
    image_url_sd: string;
    image_url_hd: string;
    is_primary: boolean;
    created_at: string;
  }[];
};