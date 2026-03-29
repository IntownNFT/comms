import { NextResponse } from "next/server";
import { createUser, createSession } from "@/lib/stores/auth-store";

export async function POST(req: Request) {
  const { email, password, name } = await req.json();

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password required" }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
  }

  try {
    const user = await createUser(email, password, name || email.split("@")[0]);
    const token = createSession(user.id);

    const res = NextResponse.json({ user: { id: user.id, email: user.email, name: user.name } });
    res.cookies.set("comms-session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 30 * 86400,
    });
    return res;
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Sign up failed";
    return NextResponse.json({ error: msg }, { status: 409 });
  }
}
