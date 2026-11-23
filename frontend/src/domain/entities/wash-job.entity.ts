import type { WashStatus } from "@/domain/enums/wash-status.enum";

export interface WashJobAddonSnapshot {
  id: string;
  wash_job_id: string;
  addon_id: string | null;
  addon_name_snapshot: string;
  price_snapshot: number;
}

export interface WashJob {
  id: string;
  user_id: string;
  created_by_user_id: string;
  business_id: string;
  washer_id: string | null;
  car_type: string;
  wash_type: string;
  washer_name: string;
  license_plate: string;
  price: number;
  status: WashStatus;
  created_at: string;
  updated_at: string;
  addons: WashJobAddonSnapshot[];
}

export interface NewWashJobInput {
  washer_id: string | null;
  car_type: string;
  wash_type: string;
  license_plate: string;
  base_price: number;
  addon_ids: string[];
}
