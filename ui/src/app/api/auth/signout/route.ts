import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { deleteSession } from "@/lib/stores/auth-store";

export async function POST() {
  const cookieStore = await cookies();
  const token = cookieStore.get("comms-session")?.value;
  if (token) deleteSession(token);

  const res = NextResponse.json({ ok: true });
  res.cookies.set("comms-session", "", { path: "/", maxAge: 0 });
  return res;
}
