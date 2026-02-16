import { NextRequest, NextResponse } from "next/server";

const INTERNAL_TOOLS_ENABLED = process.env.NEXT_PUBLIC_ENABLE_INTERNAL_WORKSPACE === "1";

export function middleware(request: NextRequest) {
  if (INTERNAL_TOOLS_ENABLED) {
    return NextResponse.next();
  }

  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/professional/workspace")) {
    const url = request.nextUrl.clone();
    url.pathname = "/professional/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }

  if (pathname.startsWith("/client/workspace")) {
    const url = request.nextUrl.clone();
    url.pathname = "/client/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/professional/workspace/:path*", "/client/workspace/:path*"],
};
