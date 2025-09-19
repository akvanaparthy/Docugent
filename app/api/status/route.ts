import { NextRequest, NextResponse } from "next/server";
import { loadConfig, makeEndpoint } from "@/lib/config";

// Ensure this route is never cached and always evaluated on request
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(_request: NextRequest) {
  try {
    const cfg = loadConfig();
    const endpoint = (path: string) => makeEndpoint(cfg.lm.baseUrl, path);

    // Quick health check to LM Studio with cache-busting
    const response = await fetch(endpoint("/models"), {
      method: "GET",
      headers: {
        Authorization: `Bearer ${cfg.lm.apiKey}`,
        "Content-Type": "application/json",
        "Cache-Control": "no-cache",
        Pragma: "no-cache",
      },
      // Do not allow any intermediate caching
      cache: "no-store",
      signal: AbortSignal.timeout(3000), // 3 second timeout for faster detection
    });

    if (response.ok) {
      // Validate response contains a plausible models list
      let modelCount = 0;
      try {
        const data = await response.json();
        const list = Array.isArray(data && (data.data || data.models))
          ? data.data || data.models
          : Array.isArray(data)
          ? data
          : [];
        modelCount = list.length || 0;
      } catch {
        modelCount = 0;
      }

      if (modelCount > 0) {
        return NextResponse.json({
          status: "online",
          message: "LM Studio reachable and models listed",
          timestamp: new Date().toISOString(),
        });
      }

      return NextResponse.json({
        status: "offline",
        message: "LM Studio reachable but no models found",
        timestamp: new Date().toISOString(),
      });
    } else {
      return NextResponse.json({
        status: "offline",
        message: `LM Studio server returned ${response.status}`,
        timestamp: new Date().toISOString(),
      });
    }
  } catch (error) {
    console.error("LM Studio connectivity check failed:", error);
    return NextResponse.json({
      status: "offline",
      message: "LM Studio server is not reachable",
      timestamp: new Date().toISOString(),
    });
  }
}
