import { supabase } from "@/infrastructure/supabase/client";
import type { Addon, NewAddonInput } from "@/domain/entities/addon.entity";

export async function fetchAllAddons(businessId: string): Promise<Addon[]> {
  const { data, error } = await supabase
    .from("addons")
    .select("*")
    .eq("business_id", businessId)
    .order("name", { ascending: true });

  if (error) throw error;
  return (data ?? []) as Addon[];
}

export async function createAddon(
  businessId: string,
  userId: string,
  input: NewAddonInput,
): Promise<Addon> {
  const { data, error } = await supabase
    .from("addons")
    .insert({
      business_id: businessId,
      created_by_user_id: userId,
      user_id: userId,
      ...input,
    })
    .select()
    .single();

  if (error) throw error;
  return data as Addon;
}

export async function deleteAddon(id: string): Promise<void> {
  const { error } = await supabase.from("addons").delete().eq("id", id);
  if (error) throw error;
}
