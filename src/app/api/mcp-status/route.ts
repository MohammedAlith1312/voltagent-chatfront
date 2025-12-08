import { NextRequest } from "next/server";
import path from "node:path";

import { generateText, stepCountIs } from "ai"; // 👈 import stepCountIs
import {
  experimental_createMCPClient as createMCPClient,
} from "@ai-sdk/mcp";
import { Experimental_StdioMCPTransport } from "@ai-sdk/mcp/mcp-stdio";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";

export const runtime = "nodejs";

const MCP_SERVER_PATH = path.join(
  process.cwd(),
  "..",
  "..",
  "backend",
  "dist",
  "mcpserver",
  "index.js",
);

const openRouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
});

export async function POST(req: NextRequest) {
  const { message } = await req.json();

  const mcpClient = await createMCPClient({
    transport: new Experimental_StdioMCPTransport({
      command: "node",
      args: [MCP_SERVER_PATH],
    }),
  });

  try {
    const tools = await mcpClient.tools();

    const result = await generateText({
      model: openRouter("openai/gpt-4o-mini"),
      system:
        "You are a status assistant. Call the `status` tool and then answer in plain text including the status and time.",
      tools,
      // 👇 multi-step: let the model use the tool and THEN respond
      stopWhen: stepCountIs(2),
      messages: [
        {
          role: "user",
          content: [{ type: "text", text: message }],
        },
      ],
    });

    return Response.json({
      reply: result.text || "(no text from model)",
      toolCalls: result.toolCalls,
      steps: result.steps, // optional: useful for debugging
    });
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message ?? "MCP error" }),
      { status: 500 },
    );
  } finally {
    await mcpClient.close();
  }
}
