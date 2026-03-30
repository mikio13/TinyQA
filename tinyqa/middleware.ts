import { updateSession } from "@/lib/supabase/proxy";
import { type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/api/runs/:path*",
    "/api/insights/:path*",
    "/api/live-preview/:path*",
    "/api/projects/:path*",
  ],
};
