import { isAllowedClipUrl } from "@/lib/clip-url";
import { parseClipForm, parseClipJson } from "@/lib/clip-validate";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const contentType = req.headers.get("content-type") ?? "";

  if (contentType.includes("multipart/form-data")) {
    const form = await req.formData();
    const parsed = parseClipForm(form);
    if ("error" in parsed) {
      return Response.json({ error: parsed.error }, { status: 400 });
    }
    return Response.json({ error: "Clip export isn't available yet." }, { status: 501 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = parseClipJson(body);
  if ("error" in parsed) {
    return Response.json({ error: parsed.error }, { status: 400 });
  }

  if (!isAllowedClipUrl(parsed.url!)) {
    return Response.json({ error: "URL host is not allowlisted for clipping" }, { status: 403 });
  }

  return Response.json({ error: "Clip export isn't available yet." }, { status: 501 });
}
