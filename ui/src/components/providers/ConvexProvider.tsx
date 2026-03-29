"use client";

import { type ReactNode } from "react";

// Auth is now self-hosted — no Convex dependency for the provider
export function ConvexProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

export function isConvexEnabled() {
  return !!process.env.NEXT_PUBLIC_CONVEX_URL;
}
