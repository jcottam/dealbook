import { NextResponse, type NextRequest } from "next/server";
import { isAccessPublicPath } from "@/lib/access-public-paths";
import { isCloudflareAccessAuthenticated } from "@/lib/cloudflare-access";

/** Production custom domain should sit behind Cloudflare Access; see docs/cloudflare-access.md */
export function middleware(request: NextRequest) {
  if (process.env.SKIP_CLOUDFLARE_ACCESS === "1") return NextResponse.next();
  if (process.env.VERCEL_ENV !== "production") return NextResponse.next();

  const { pathname } = request.nextUrl;
  if (isAccessPublicPath(pathname)) return NextResponse.next();
  if (isCloudflareAccessAuthenticated(request.headers)) return NextResponse.next();

  return new NextResponse("Authentication required", { status: 401 });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
