// Auth is handled client-side via localStorage (admin/viewer roles).
// No server-side proxy interception needed — pass all requests through.
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: [],
};
