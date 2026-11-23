import { supabase } from "@/infrastructure/supabase/client";
import type { ServicePrice, SetServicePriceInput } from "@/domain/entities/service-price.entity";

export async function fetchAllServicePrices(businessId: string): Promise<ServicePrice[]> {
  const { data, error } = await supabase
    .from("service_prices")
    .select("*")
    .eq("business_id", businessId)
    .order("car_type", { ascending: true });

  if (error) throw error;
  return (data ?? []) as ServicePrice[];
}

export async function upsertServicePrice(
  businessId: string,
  userId: string,
  input: SetServicePriceInput
): Promise<ServicePrice> {
  const { data, error } = await supabase
    .from("service_prices")
    .upsert(
      {
        business_id: businessId,
        created_by_user_id: userId,
        user_id: userId,
        ...input,
      },
      { onConflict: "business_id,car_type,wash_type" }
    )
    .select()
    .single();

  if (error) throw error;
  return data as ServicePrice;
}
