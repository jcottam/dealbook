import { afterEach, describe, expect, it } from "vitest";
import { isAiGatewayConfigured, transcribeGatewayModelId } from "@/lib/ai-gateway";

const env = process.env;

afterEach(() => {
  process.env = env;
});

describe("transcribeGatewayModelId", () => {
  it("defaults to openai/gpt-4o-transcribe", () => {
    delete process.env.TRANSCRIBE_MODEL;
    expect(transcribeGatewayModelId()).toBe("openai/gpt-4o-transcribe");
  });

  it("prefixes bare model names with openai/", () => {
    process.env.TRANSCRIBE_MODEL = "whisper-1";
    expect(transcribeGatewayModelId()).toBe("openai/whisper-1");
  });

  it("keeps provider-prefixed ids", () => {
    process.env.TRANSCRIBE_MODEL = "openai/gpt-4o-mini-transcribe";
    expect(transcribeGatewayModelId()).toBe("openai/gpt-4o-mini-transcribe");
  });
});

describe("isAiGatewayConfigured", () => {
  it("is false with no gateway credentials", () => {
    delete process.env.AI_GATEWAY_API_KEY;
    delete process.env.VERCEL_OIDC_TOKEN;
    expect(isAiGatewayConfigured()).toBe(false);
  });

  it("is true with AI_GATEWAY_API_KEY", () => {
    process.env.AI_GATEWAY_API_KEY = "gw_test";
    delete process.env.VERCEL_OIDC_TOKEN;
    expect(isAiGatewayConfigured()).toBe(true);
  });
});
