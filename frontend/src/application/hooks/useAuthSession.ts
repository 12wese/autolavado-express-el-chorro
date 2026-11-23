import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { getSession, onAuthStateChange } from "@/data/repositories/auth.repository";

// Caso de uso: conocer la sesión autenticada actual y reaccionar a sus cambios.
export function useAuthSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    const {
      data: { subscription },
    } = onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setInitializing(false);
    });

    getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setInitializing(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  return { session, user, initializing };
}
