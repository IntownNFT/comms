import { NextResponse } from "next/server";
import { getAllSpaces, createSpace } from "@/lib/stores/spaces-store";
import { getConvexClient, isConvexMode } from "@/lib/convex-server";
import { api } from "@/lib/convex-api";

export async function GET() {
  if (isConvexMode()) {
    const convex = getConvexClient()!;
    const spaces = await convex.query(api.spaces.list, {});
    return NextResponse.json({ spaces });
  }
  const spaces = getAllSpaces();
  return NextResponse.json({ spaces });
}

export async function POST(req: Request) {
  const body = await req.json();

  if (isConvexMode()) {
    const convex = getConvexClient()!;
    const space = await convex.mutation(api.spaces.create, body);
    return NextResponse.json({ space });
  }

  const space = createSpace(body);
  return NextResponse.json({ space });
}
