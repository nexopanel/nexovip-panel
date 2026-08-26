import { api, ready, subscribe } from "@/lib/luffy/api";
import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Auth state backed by the LUFFY_PANEL-style session API.
 * Shape-compatible with the previous hook consumers:
 *   { isLoading, isAuthenticated, signIn, signOut }
 */
export function useAuth() {
  const [status, setStatus] = useState<"loading" | "authed" | "guest">(
    "loading",
  );
  const readyRef = useRef(false);

  useEffect(() => {
    let mounted = true;

    const evaluate = () => {
      if (!mounted || !readyRef.current) return;
      setStatus(api.me() ? "authed" : "guest");
    };

    void ready().then(() => {
      readyRef.current = true;
      evaluate();
    });

    const unsubscribe = subscribe(evaluate);
    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  const signIn = useCallback(async (password: string) => {
    await api.login(password);
    setStatus("authed");
  }, []);

  const signOut = useCallback(async () => {
    await api.logout();
    setStatus("guest");
  }, []);

  return {
    isLoading: status === "loading",
    isAuthenticated: status === "authed",
    signIn,
    signOut,
  };
}
