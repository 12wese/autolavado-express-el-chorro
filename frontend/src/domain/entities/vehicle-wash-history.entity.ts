import type { WashStatus } from "@/domain/enums/wash-status.enum";

export interface VehicleWashHistory {
  id: string;
  license_plate: string;
  car_type: string;
  wash_type: string;
  status: WashStatus;
  created_at: string;
  price: number;
}
