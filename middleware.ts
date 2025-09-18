import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  try {
    // Add CORS headers for API routes
    if (request.nextUrl.pathname.startsWith("/api/")) {
      const response = NextResponse.next();

      response.headers.set("Access-Control-Allow-Origin", "*");
      response.headers.set(
        "Access-Control-Allow-Methods",
        "GET, POST, PUT, DELETE, OPTIONS"
      );
      response.headers.set(
        "Access-Control-Allow-Headers",
        "Content-Type, Authorization"
      );

      return response;
    }

    return NextResponse.next();
  } catch (error) {
    console.error("Middleware error:", error);
    // Return a safe response to prevent crashes
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

export const config = {
  matcher: "/api/:path*",
};
