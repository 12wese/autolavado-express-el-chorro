import { apiClient } from "@/infrastructure/api/apiClient";

export async function recognizePlateFromImage(imageBase64: string): Promise<unknown> {
  return apiClient.post<unknown>("/api/vision/recognize-plate", { imageBase64 });
}
