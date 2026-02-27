import { NextRequest } from "next/server";

export function isAgentApiAuthorized(request: NextRequest): boolean {
  const expectedApiKey = process.env.AGENT_API_KEY?.trim();
  if (!expectedApiKey) {
    throw new Error("Missing required environment variable: AGENT_API_KEY");
  }

  const providedApiKey = request.headers.get("x-api-key")?.trim();
  return providedApiKey === expectedApiKey;
}
