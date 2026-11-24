import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

const Ctx = createContext<{ user: User | null; ready: boolean }>({ user: null, ready: false });

export function SessionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<{ user: User | null; ready: boolean }>({ user: null, ready: false });
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setState({ user: data.session?.user ?? null, ready: true }));
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setState({ user: s?.user ?? null, ready: true }));
    return () => data.subscription.unsubscribe();
  }, []);
  return <Ctx.Provider value={state}>{children}</Ctx.Provider>;
}
export const useSession = () => useContext(Ctx);
