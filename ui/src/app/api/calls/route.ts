import { NextResponse } from "next/server";
import { getCalls } from "@/lib/stores/calls-store";
import { createApproval } from "@/lib/stores/approvals";
import { getConvexClient, isConvexMode } from "@/lib/convex-server";
import { api } from "@/lib/convex-api";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const limit = Number(url.searchParams.get("limit") ?? 50);
  const direction = url.searchParams.get("direction") as "inbound" | "outbound" | null;

  if (isConvexMode()) {
    const convex = getConvexClient()!;
    const calls = await convex.query(api.calls.list, {
      limit,
      direction: direction ?? undefined,
    });
    return NextResponse.json({ calls });
  }

  const calls = getCalls({ limit, direction: direction ?? undefined });
  return NextResponse.json({ calls });
}

export async function POST(req: Request) {
  const body = await req.json();

  if (isConvexMode()) {
    const convex = getConvexClient()!;
    const approval = await convex.mutation(api.approvals.create, {
      type: "initiate_call",
      data: { phoneNumber: body.phoneNumber, contactName: body.contactName || "Unknown" },
    });
    return NextResponse.json({ approval, needsApproval: true });
  }

  const approval = createApproval("initiate_call", {
    phoneNumber: body.phoneNumber,
    contactName: body.contactName || "Unknown",
  });
  return NextResponse.json({ approval, needsApproval: true });
}
