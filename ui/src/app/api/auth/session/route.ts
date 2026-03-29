import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { validateSession } from "@/lib/stores/auth-store";

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get("comms-session")?.value;
  const user = token ? validateSession(token) : null;

  if (!user) {
    return NextResponse.json({ user: null });
  }

  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      plan: user.plan,
    },
  });
}
