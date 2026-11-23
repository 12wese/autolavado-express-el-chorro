import type { WashStatus } from "@/domain/enums/wash-status.enum";

export interface WashJobStatusHistory {
  id: string;
  wash_job_id: string;
  user_id: string;
  old_status: WashStatus | null;
  new_status: WashStatus;
  changed_at: string;
}
