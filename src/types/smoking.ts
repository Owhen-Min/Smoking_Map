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
    id: string;
    smoking_area_id: string;
    image_url_sd: string;
    image_url_hd: string;
    is_primary: boolean;
    like_count?: number;
    created_at: string;
  }[];
};