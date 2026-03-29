"use client";

import { useState, useEffect } from "react";

interface SessionData {
  user: { id: string; email: string; name: string; plan?: string } | null;
}

const cache: { data: SessionData | null; fetched: boolean } = { data: null, fetched: false };

export function useSession() {
  const [session, setSession] = useState<SessionData>(cache.data ?? { user: null });
  const [isPending, setIsPending] = useState(!cache.fetched);

  useEffect(() => {
    if (cache.fetched) {
      setSession(cache.data ?? { user: null });
      setIsPending(false);
      return;
    }
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then((data) => {
        cache.data = data;
        cache.fetched = true;
        setSession(data);
      })
      .catch(() => {
        cache.data = { user: null };
        cache.fetched = true;
        setSession({ user: null });
      })
      .finally(() => setIsPending(false));
  }, []);

  return { data: session, isPending, error: null };
}

export async function signOut() {
  cache.data = null;
  cache.fetched = false;
  await fetch("/api/auth/signout", { method: "POST" });
  window.location.href = "/login";
}

// Backwards-compat exports
export const authClient = {
  useSession,
  signIn: { email: async () => ({ error: null }) },
  signUp: { email: async () => ({ error: null }) },
  signOut,
};
