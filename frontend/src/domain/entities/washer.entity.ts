export interface Washer {
  id: string;
  user_id: string;
  created_by_user_id: string;
  business_id: string;
  membership_id: string | null;
  name: string;
  qr_token: string;
  active: boolean;
  created_at: string;
}

export interface NewWasherInput {
  name: string;
  email: string;
}
