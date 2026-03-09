import { NextResponse } from "next/server";
import { getApprovals, resolveApproval } from "@/lib/stores/approvals";
import { addActivity } from "@/lib/stores/activity";
import { loadCommsEnv } from "@/lib/env";
import { getConvexClient, isConvexMode } from "@/lib/convex-server";
import { api } from "@/lib/convex-api";

// Load ~/.comms/.env on module init so RESEND_API_KEY is available
loadCommsEnv();

export async function GET(req: Request) {
  const url = new URL(req.url);
  const status = url.searchParams.get("status") as "pending" | "approved" | "rejected" | null;

  if (isConvexMode()) {
    const convex = getConvexClient()!;
    const approvals = await convex.query(api.approvals.list, {
      status: status ?? undefined,
    });
    return NextResponse.json({ approvals });
  }

  const items = getApprovals(status ?? undefined);
  return NextResponse.json({ approvals: items });
}

export async function POST(req: Request) {
  const body = await req.json();
  const { id, decision } = body as { id: string; decision: "approved" | "rejected" };

  if (!id || !decision) {
    return NextResponse.json({ error: "Missing id or decision" }, { status: 400 });
  }

  if (isConvexMode()) {
    const convex = getConvexClient()!;
    const result = await convex.mutation(api.approvals.resolve, {
      id: id as any,
      resolution: decision,
    });
    if (!result) {
      return NextResponse.json({ error: "Approval not found or already resolved" }, { status: 404 });
    }

    if (decision === "approved" && result.type === "send_email") {
      try {
        await sendEmailViaResend(result.data as Record<string, unknown>);
        await convex.mutation(api.activityLog.add, {
          type: "email_sent",
          summary: `Email sent to ${(result.data as any).to}`,
          metadata: result.data,
        });
      } catch (err) {
        console.error("Failed to send email via Resend:", err);
        return NextResponse.json({ approval: result, emailError: "Failed to send email." });
      }
    }

    await convex.mutation(api.activityLog.add, {
      type: "approval_resolved",
      summary: `${result.type} ${decision}`,
    });
    return NextResponse.json({ approval: result });
  }

  const result = resolveApproval(id, decision);
  if (!result) {
    return NextResponse.json({ error: "Approval not found or already resolved" }, { status: 404 });
  }

  if (decision === "approved" && result.type === "send_email") {
    try {
      await sendEmailViaResend(result.data);
      addActivity("email_sent", `Email sent to ${result.data.to}`, result.data);
    } catch (err) {
      console.error("Failed to send email via Resend:", err);
      return NextResponse.json({ approval: result, emailError: "Failed to send email. Check RESEND_API_KEY." });
    }
  }

  addActivity("approval_resolved", `${result.type} ${decision} (ID: ${result.id})`);
  return NextResponse.json({ approval: result });
}

async function sendEmailViaResend(data: Record<string, unknown>) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("RESEND_API_KEY not set. Run `comms init` to configure.");
  }

  const { Resend } = await import("resend");
  const resend = new Resend(apiKey);

  await resend.emails.send({
    from: process.env.COMMS_FROM_EMAIL ?? "Comms Client <onboarding@resend.dev>",
    to: String(data.to),
    subject: String(data.subject),
    text: String(data.body),
  });
}
