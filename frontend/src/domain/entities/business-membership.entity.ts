import type { Business } from "@/domain/entities/business.entity";
import type { BusinessRole } from "@/domain/enums/business-role.enum";

export type BusinessMembershipStatus = "invited" | "active" | "suspended";

export interface BusinessMembership {
  id: string;
  business_id: string;
  user_id: string | null;
  invited_email: string | null;
  role: BusinessRole;
  status: BusinessMembershipStatus;
  invited_by_user_id: string | null;
  created_at: string;
}

export interface CurrentBusinessMembership extends BusinessMembership {
  business: Business;
  washer_id: string | null;
}
