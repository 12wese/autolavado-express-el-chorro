export interface ServicePrice {
  id: string;
  user_id: string;
  created_by_user_id: string;
  business_id: string;
  car_type: string;
  wash_type: string;
  price: number;
  created_at: string;
  updated_at: string;
}

export interface SetServicePriceInput {
  car_type: string;
  wash_type: string;
  price: number;
}
