import { createAnthropic } from "@ai-sdk/anthropic";
import { streamText, stepCountIs, convertToModelMessages } from "ai";
import { allTools } from "@/lib/ai/tools";
import { SYSTEM_PROMPT } from "@/lib/ai/system-prompt";
import { loadCommsEnv } from "@/lib/env";
import { getConvexClient, isConvexMode } from "@/lib/convex-server";
import { api } from "@/lib/convex-api";

export async function POST(req: Request) {
  loadCommsEnv(true);

  const body = await req.json();
  const { messages } = body;

  const CREDITS_PER_MESSAGE = 1;
  const userEmail = body.userEmail as string | undefined;

  if (isConvexMode() && userEmail) {
    const convex = getConvexClient();
    if (convex) {
      const credits = await convex.query(api.users.getCredits, { email: userEmail });
      if (credits < CREDITS_PER_MESSAGE) {
        return Response.json(
          { error: "Insufficient credits. Purchase more to continue." },
          { status: 402 }
        );
      }
      await convex.mutation(api.users.deductCredits, { email: userEmail, amount: CREDITS_PER_MESSAGE });
    }
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  const oauthToken = process.env.CLAUDE_OAUTH_TOKEN;

  if (!apiKey && !oauthToken) {
    return Response.json(
      { error: "No API key configured. Go to /login to set up." },
      { status: 400 }
    );
  }

  const anthropic = apiKey
    ? createAnthropic({ apiKey })
    : createAnthropic({
        authToken: oauthToken,
        headers: { "anthropic-beta": "oauth-2025-04-20" },
      });

  const modelMessages = await convertToModelMessages(messages);

  const result = streamText({
    model: anthropic("claude-sonnet-4-20250514"),
    system: SYSTEM_PROMPT,
    messages: modelMessages,
    tools: allTools,
    stopWhen: stepCountIs(10),
  });

  return result.toUIMessageStreamResponse();
}
