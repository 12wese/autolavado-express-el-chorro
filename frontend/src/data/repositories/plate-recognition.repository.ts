import { supabase } from "@/infrastructure/supabase/client";

export async function recognizePlateFromImage(imageBase64: string): Promise<unknown> {
  const { data, error } = await supabase.functions.invoke("recognize-plate", {
    body: { imageBase64 },
  });

  if (error) throw error;
  return data;
}
