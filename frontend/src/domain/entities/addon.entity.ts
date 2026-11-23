export interface Addon {
  id: string;
  user_id: string;
  created_by_user_id: string;
  business_id: string;
  name: string;
  price: number;
  created_at: string;
}

export interface NewAddonInput {
  name: string;
  price: number;
}
