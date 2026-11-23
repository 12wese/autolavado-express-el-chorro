import { supabase } from "@/infrastructure/supabase/client";
import type { Washer } from "@/domain/entities/washer.entity";

export async function fetchAllWashers(businessId: string): Promise<Washer[]> {
  const { data, error } = await supabase
    .from("washers")
    .select("*")
    .eq("business_id", businessId)
    .order("name", { ascending: true });

  if (error) throw error;
  return (data ?? []) as Washer[];
}

export async function fetchWasherByToken(token: string): Promise<Washer | null> {
  const { data, error } = await supabase
    .from("washers")
    .select("*")
    .eq("qr_token", token)
    .maybeSingle();

  if (error) throw error;
  return data as Washer | null;
}

export async function createWasher(
  businessId: string,
  name: string,
  email: string,
): Promise<Washer> {
  const { data: washerId, error } = await supabase.rpc("invite_business_washer", {
    p_business_id: businessId,
    p_name: name.trim(),
    p_email: email.trim(),
  });
  if (error) throw error;

  const { data, error: fetchError } = await supabase
    .from("washers")
    .select("*")
    .eq("id", washerId)
    .single();

  if (fetchError) throw fetchError;
  return data as Washer;
}

export async function deleteWasher(id: string): Promise<void> {
  const { error } = await supabase.from("washers").delete().eq("id", id);
  if (error) throw error;
}
