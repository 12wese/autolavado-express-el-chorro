import type { AuthChangeEvent, Session } from "@supabase/supabase-js";
import { supabase } from "@/infrastructure/supabase/client";

export function getSession() {
  return supabase.auth.getSession();
}

export function getCurrentUser() {
  return supabase.auth.getUser();
}

export function onAuthStateChange(callback: (event: AuthChangeEvent, session: Session | null) => void) {
  return supabase.auth.onAuthStateChange(callback);
}

export function signInWithPassword(email: string, password: string) {
  return supabase.auth.signInWithPassword({ email, password });
}

export function signUp(email: string, password: string, emailRedirectTo: string) {
  return supabase.auth.signUp({ email, password, options: { emailRedirectTo } });
}

export function signOut() {
  return supabase.auth.signOut();
}

export function resetPasswordForEmail(email: string, redirectTo: string) {
  return supabase.auth.resetPasswordForEmail(email, { redirectTo });
}

export function updatePassword(password: string) {
  return supabase.auth.updateUser({ password });
}
