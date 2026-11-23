export interface Business {
  id: string;
  name: string;
  created_by_user_id: string;
  legacy_owner_user_id: string | null;
  status: "active" | "suspended";
  created_at: string;
}
