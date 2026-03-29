import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { streamText, stepCountIs, convertToModelMessages } from "ai";
import { allTools } from "@/lib/ai/tools";
import { SYSTEM_PROMPT } from "@/lib/ai/system-prompt";
import { loadCommsEnv } from "@/lib/env";
import { requireAuth, getCurrentUser } from "@/lib/api-auth";
import { useMessage } from "@/lib/stores/auth-store";

export async function POST(req: Request) {
  const authError = await requireAuth();
  if (authError) return authError;
  loadCommsEnv(true);

  const body = await req.json();
  const { messages } = body;

  // Usage check in managed mode
  if (process.env.NEXT_PUBLIC_COMMS_MANAGED === "true") {
    const user = await getCurrentUser();
    if (user) {
      const result = useMessage(user.id);
      if (!result.allowed) {
        return Response.json(
          { error: "You've used all 3 free messages. Upgrade to Pro for 1,000 messages/month.", code: "LIMIT_REACHED" },
          { status: 402 }
        );
      }
    }
  }

  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;

  if (!apiKey) {
    return Response.json(
      { error: "No API key configured. Go to /login to set up." },
      { status: 400 }
    );
  }

  const google = createGoogleGenerativeAI({ apiKey });
  const modelId = (body.model as string) || "gemini-2.5-flash";

  const modelMessages = await convertToModelMessages(messages);

  const result = streamText({
    model: google(modelId),
    system: SYSTEM_PROMPT,
    messages: modelMessages,
    tools: allTools,
    stopWhen: stepCountIs(10),
  });

  return result.toUIMessageStreamResponse();
}
