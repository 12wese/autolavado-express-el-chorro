import type { Business } from "@/domain/entities/business.entity";
import type {
  BusinessMembership,
  CurrentBusinessMembership,
} from "@/domain/entities/business-membership.entity";
import { supabase } from "@/infrastructure/supabase/client";
import type { Database } from "@/infrastructure/supabase/types";

type BusinessRow = Database["public"]["Tables"]["businesses"]["Row"];
type MembershipRow = Database["public"]["Tables"]["business_memberships"]["Row"];

export async function fetchCurrentBusinessMemberships(
  userId: string,
): Promise<CurrentBusinessMembership[]> {
  const { data: membershipRows, error: membershipError } = await supabase
    .from("business_memberships")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "active")
    .order("created_at", { ascending: true });

  if (membershipError) throw membershipError;
  const memberships = (membershipRows ?? []) as MembershipRow[];
  if (memberships.length === 0) return [];

  const businessIds = [...new Set(memberships.map((membership) => membership.business_id))];
  const { data: businessRows, error: businessError } = await supabase
    .from("businesses")
    .select("*")
    .in("id", businessIds)
    .eq("status", "active");

  if (businessError) throw businessError;

  const { data: washerRows, error: washerError } = await supabase
    .from("washers")
    .select("id,membership_id,business_id")
    .in(
      "membership_id",
      memberships.map((membership) => membership.id),
    );

  if (washerError) throw washerError;

  const businessesById = new Map(
    ((businessRows ?? []) as BusinessRow[]).map((business) => [
      business.id,
      business as Business,
    ]),
  );
  const washersByMembershipId = new Map(
    (washerRows ?? [])
      .filter((washer) => washer.membership_id !== null)
      .map((washer) => [washer.membership_id as string, washer.id]),
  );

  return memberships.flatMap((membership) => {
    const business = businessesById.get(membership.business_id);
    if (!business) return [];
    return [{
      ...(membership as BusinessMembership),
      business,
      washer_id: washersByMembershipId.get(membership.id) ?? null,
    }];
  });
}

export async function acceptPendingBusinessMemberships(): Promise<number> {
  const { data, error } = await supabase.rpc("accept_pending_business_memberships");
  if (error) throw error;
  return data ?? 0;
}

export async function createBusiness(name: string): Promise<string> {
  const { data, error } = await supabase.rpc("create_business_for_current_user", {
    p_name: name.trim(),
  });
  if (error) throw error;
  return data;
}
