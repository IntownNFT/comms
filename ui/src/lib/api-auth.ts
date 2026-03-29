import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { validateSession } from "@/lib/stores/auth-store";

/**
 * Returns null if the request is authorized, or a 401 Response if not.
 * In local/unmanaged mode, always passes through.
 */
export async function requireAuth(): Promise<NextResponse | null> {
  if (process.env.NEXT_PUBLIC_COMMS_MANAGED !== "true") return null;

  const cookieStore = await cookies();
  const token = cookieStore.get("comms-session")?.value;
  if (token && validateSession(token)) return null;

  return NextResponse.json(
    { error: "Authentication required" },
    { status: 401 }
  );
}

/**
 * Get current user from session cookie. Returns null if not authenticated.
 */
export async function getCurrentUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get("comms-session")?.value;
  if (!token) return null;
  return validateSession(token);
}

/**
 * Returns true if this is a managed deployment.
 */
export function isManaged(): boolean {
  return process.env.NEXT_PUBLIC_COMMS_MANAGED === "true";
}
