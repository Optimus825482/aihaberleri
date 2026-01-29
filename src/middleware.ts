// Middleware disabled - all routes pass through without modification
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export default function middleware(request: NextRequest) {
  // Pass through all requests without any modifications
  return NextResponse.next();
}

// Matcher configuration - currently disabled (no routes matched)
export const config = {
  matcher: [],
};
