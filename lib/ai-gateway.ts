/** True when the AI SDK can authenticate to Vercel AI Gateway (project API key or deployment OIDC). */
export function isAiGatewayConfigured(): boolean {
  return Boolean(process.env.AI_GATEWAY_API_KEY?.trim() || process.env.VERCEL_OIDC_TOKEN?.trim());
}

/** Gateway model id for `transcribe()` — defaults to OpenAI gpt-4o-transcribe via Gateway. */
export function transcribeGatewayModelId(): string {
  const raw = (process.env.TRANSCRIBE_MODEL || "openai/gpt-4o-transcribe").trim();
  if (raw.includes("/")) return raw;
  return `openai/${raw}`;
}
